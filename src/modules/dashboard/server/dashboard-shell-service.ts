import { eq } from "drizzle-orm";
import { db } from "@/db";
import { company } from "@/db/schema";
import {
  AccessControlError,
  getCachedSession,
  resolveAccess,
} from "@/lib/security/access-control";
import type {
  DashboardAccess,
  DashboardCompany,
  DashboardShellData,
  DashboardViewer,
} from "@/modules/dashboard/shared/dashboard-shell-types";
import type { TransportRateBasis } from "@/modules/dashboard/shared/company-configuration-types";

function isCompanyConfigured(record: {
  code: string | null;
  joinSecretCode: string | null;
  name: string | null;
  email: string | null;
}) {
  return Boolean(record.code && record.joinSecretCode && record.name && record.email);
}

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function createViewer(
  user: { id: string; name?: string | null; email?: string | null; image?: string | null },
  access: DashboardAccess | null
): DashboardViewer {
  return {
    id: String(user.id),
    name: String(user.name ?? user.email ?? "User"),
    email: String(user.email ?? ""),
    image: user.image ?? null,
    role: access?.role ?? null,
    readOnly: access?.readOnly ?? false,
    canWriteMasterData: access?.canWriteMasterData ?? false,
    canWritePreTour: access?.canWritePreTour ?? false,
  };
}

export async function loadDashboardShellData(
  requestHeaders: Headers
): Promise<DashboardShellData> {
  const session = await getCachedSession(requestHeaders);
  const sessionUser = session?.user as
    | {
        id?: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
        companyId?: string | null;
      }
    | undefined;

  if (!sessionUser?.id) {
    return {
      viewer: null,
      company: null,
      access: null,
      needsSetup: false,
      accessErrorCode: null,
      accessErrorMessage: null,
    };
  }

  const viewerUser = {
    id: String(sessionUser.id),
    name: sessionUser.name,
    email: sessionUser.email,
    image: sessionUser.image,
  };

  let companyData: DashboardCompany | null = null;
  let accessData: DashboardAccess | null = null;
  let accessErrorCode: string | null = null;
  let accessErrorMessage: string | null = null;

  const companyId = sessionUser.companyId?.trim() || null;
  if (companyId) {
    const [record] = await db
      .select({
        id: company.id,
        code: company.code,
        joinSecretCode: company.joinSecretCode,
        managerPrivilegeCode: company.managerPrivilegeCode,
        name: company.name,
        email: company.email,
        baseCurrencyCode: company.baseCurrencyCode,
        transportRateBasis: company.transportRateBasis,
        helpEnabled: company.helpEnabled,
        subscriptionPlan: company.subscriptionPlan,
        subscriptionStatus: company.subscriptionStatus,
        subscriptionStartsAt: company.subscriptionStartsAt,
        subscriptionEndsAt: company.subscriptionEndsAt,
        country: company.country,
        image: company.image,
      })
      .from(company)
      .where(eq(company.id, companyId))
      .limit(1);

    if (record) {
      companyData = {
        id: record.id,
        code: record.code ?? "",
        joinSecretCode: record.joinSecretCode ?? null,
        managerPrivilegeCode: record.managerPrivilegeCode ?? null,
        name: record.name ?? "",
        email: record.email ?? "",
        baseCurrencyCode: record.baseCurrencyCode ?? "USD",
        transportRateBasis:
          (record.transportRateBasis as TransportRateBasis | null) ?? "VEHICLE_TYPE",
        helpEnabled: record.helpEnabled ?? true,
        subscriptionPlan: record.subscriptionPlan ?? null,
        subscriptionStatus: record.subscriptionStatus,
        subscriptionStartsAt: toIsoString(record.subscriptionStartsAt),
        subscriptionEndsAt: toIsoString(record.subscriptionEndsAt),
        country: record.country ?? null,
        image: record.image ?? null,
      };
    }

    try {
      const access = await resolveAccess(requestHeaders);
      accessData = {
        companyId: access.companyId,
        role: access.role,
        readOnly: access.readOnly,
        canWriteMasterData: access.canWriteMasterData,
        canWritePreTour: access.canWritePreTour,
        plan: access.plan,
        subscriptionStatus: access.subscriptionStatus,
        subscriptionEndsAt: toIsoString(access.subscriptionEndsAt),
        subscriptionLimited: access.subscriptionLimited,
        privileges: access.privileges,
      };
    } catch (error) {
      if (error instanceof AccessControlError) {
        accessErrorCode = error.code;
        accessErrorMessage = error.message;
      } else {
        throw error;
      }
    }
  }

  const needsSetup =
    !companyId ||
    !companyData ||
    !isCompanyConfigured({
      code: companyData.code,
      joinSecretCode: companyData.joinSecretCode,
      name: companyData.name,
      email: companyData.email,
    });

  return {
    viewer: createViewer(viewerUser, accessData),
    company: companyData,
    access: accessData,
    needsSetup,
    accessErrorCode,
    accessErrorMessage,
  };
}
