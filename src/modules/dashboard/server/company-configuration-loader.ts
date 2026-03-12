import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  company,
  companyRole,
  companyRolePrivilege,
  user,
  userCompanyRole,
} from "@/db/schema";
import {
  ensureCompanyDefaultRoles,
  resolveAccess,
} from "@/lib/security/access-control";
import {
  getPlanUserLimit,
  PRIVILEGE_DEFINITIONS,
} from "@/lib/security/privileges";
import { listCurrencyRecords } from "@/modules/currency/server/currency-service";
import type {
  CompanyConfigurationInitialData,
  CompanyUsersResponse,
  CurrencyOption,
} from "@/modules/dashboard/shared/company-configuration-types";

function toPlainCompanyUsersResponse(payload: Omit<CompanyUsersResponse, "users"> & {
  users: Array<Omit<CompanyUsersResponse["users"][number], "createdAt"> & { createdAt: Date }>;
}): CompanyUsersResponse {
  return {
    ...payload,
    users: payload.users.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function loadCompanyConfigurationInitialData(): Promise<CompanyConfigurationInitialData | null> {
  try {
    const requestHeaders = await headers();
    const access = await resolveAccess(requestHeaders, {
      requiredPrivilege: "SCREEN_CONFIGURATION_COMPANY",
    });

    await ensureCompanyDefaultRoles(access.companyId);

    const [companyRecord] = await db
      .select({
        id: company.id,
        code: company.code,
        name: company.name,
        email: company.email,
        baseCurrencyCode: company.baseCurrencyCode,
        transportRateBasis: company.transportRateBasis,
        helpEnabled: company.helpEnabled,
        joinSecretCode: company.joinSecretCode,
        managerPrivilegeCode: company.managerPrivilegeCode,
        subscriptionPlan: company.subscriptionPlan,
        subscriptionStatus: company.subscriptionStatus,
      })
      .from(company)
      .where(eq(company.id, access.companyId))
      .limit(1);

    if (!companyRecord) {
      return null;
    }

    const [users, roles, assignments, rolePrivileges, currencies] = await Promise.all([
      db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          readOnly: user.readOnly,
          canWriteMasterData: user.canWriteMasterData,
          canWritePreTour: user.canWritePreTour,
          isActive: user.isActive,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(eq(user.companyId, access.companyId))
        .orderBy(user.createdAt),
      db
        .select({
          id: companyRole.id,
          code: companyRole.code,
          name: companyRole.name,
          description: companyRole.description,
          isSystem: companyRole.isSystem,
          isActive: companyRole.isActive,
        })
        .from(companyRole)
        .where(eq(companyRole.companyId, access.companyId)),
      db
        .select({
          userId: userCompanyRole.userId,
          roleId: userCompanyRole.roleId,
        })
        .from(userCompanyRole)
        .where(eq(userCompanyRole.companyId, access.companyId)),
      db
        .select({
          roleId: companyRolePrivilege.roleId,
          privilegeCode: companyRolePrivilege.privilegeCode,
        })
        .from(companyRolePrivilege)
        .where(eq(companyRolePrivilege.companyId, access.companyId)),
      listCurrencyRecords("currencies", new URLSearchParams({ limit: "500" }), requestHeaders),
    ]);

    const payload = toPlainCompanyUsersResponse({
      company: {
        id: companyRecord.id,
        code: companyRecord.code ?? "",
        name: companyRecord.name ?? "",
        email: companyRecord.email ?? "",
        baseCurrencyCode: companyRecord.baseCurrencyCode ?? "USD",
        transportRateBasis: companyRecord.transportRateBasis ?? "VEHICLE_TYPE",
        helpEnabled: companyRecord.helpEnabled ?? true,
        joinSecretCode: companyRecord.joinSecretCode ?? null,
        managerPrivilegeCode: companyRecord.managerPrivilegeCode ?? null,
        subscriptionPlan: companyRecord.subscriptionPlan ?? null,
        subscriptionStatus: companyRecord.subscriptionStatus,
      },
      userCount: users.length,
      userLimit: getPlanUserLimit(companyRecord.subscriptionPlan),
      currentUserId: access.userId,
      currentUserRole: access.role,
      currentUserReadOnly: access.readOnly,
      currentUserPrivileges: access.privileges,
      users,
      customRoles: roles,
      userRoleAssignments: assignments,
      rolePrivileges,
      availablePrivileges: PRIVILEGE_DEFINITIONS,
    });

    const currencyOptions: CurrencyOption[] = currencies
      .map((row) => ({
        code: String(row.code ?? ""),
        name: String(row.name ?? ""),
      }))
      .filter((row) => row.code);

    return {
      payload,
      currencyOptions,
    };
  } catch {
    return null;
  }
}
