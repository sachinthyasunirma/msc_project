import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  company,
  companyRole,
  companyRolePrivilege,
  user,
  userCompanyRole,
} from "@/db/schema";
import {
  AccessControlError,
  ensureCompanyDefaultRoles,
  resolveAccess,
} from "@/lib/security/access-control";
import { getPlanUserLimit, PRIVILEGE_DEFINITIONS } from "@/lib/security/privileges";

export async function GET(request: Request) {
  try {
    const access = await resolveAccess(request.headers, {
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
        subscriptionStartsAt: company.subscriptionStartsAt,
        subscriptionEndsAt: company.subscriptionEndsAt,
      })
      .from(company)
      .where(eq(company.id, access.companyId))
      .limit(1);

    if (!companyRecord) {
      return NextResponse.json(
        { code: "COMPANY_NOT_FOUND", message: "Company not found." },
        { status: 404 }
      );
    }

    const users = await db
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
      .orderBy(user.createdAt);

    const roles = await db
      .select({
        id: companyRole.id,
        code: companyRole.code,
        name: companyRole.name,
        description: companyRole.description,
        isSystem: companyRole.isSystem,
        isActive: companyRole.isActive,
      })
      .from(companyRole)
      .where(eq(companyRole.companyId, access.companyId));

    const assignments = await db
      .select({
        userId: userCompanyRole.userId,
        roleId: userCompanyRole.roleId,
      })
      .from(userCompanyRole)
      .where(eq(userCompanyRole.companyId, access.companyId));

    const rolePrivileges = await db
      .select({
        roleId: companyRolePrivilege.roleId,
        privilegeCode: companyRolePrivilege.privilegeCode,
      })
      .from(companyRolePrivilege)
      .where(eq(companyRolePrivilege.companyId, access.companyId));

    return NextResponse.json({
      company: companyRecord,
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
      legacyRoles: ["ADMIN", "MANAGER", "USER"] as const,
    });
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to load company users." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await resolveAccess(request.headers, {
      requiredPrivilege: "COMPANY_USERS_MANAGE",
    });
    if (access.role !== "ADMIN") {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Only admin users can delete users." },
        { status: 403 }
      );
    }
    const payload = await request.json().catch(() => ({}));
    const userId = String(payload?.userId ?? "");
    if (!userId) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "userId is required." },
        { status: 400 }
      );
    }
    if (userId === access.userId) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "You cannot remove yourself from the company." },
        { status: 403 }
      );
    }

    const [targetUser] = await db
      .select({ id: user.id, role: user.role })
      .from(user)
      .where(and(eq(user.companyId, access.companyId), eq(user.id, userId)))
      .limit(1);
    if (!targetUser) {
      return NextResponse.json(
        { code: "USER_NOT_FOUND", message: "User not found in your company." },
        { status: 404 }
      );
    }
    if (targetUser.role === "ADMIN") {
      const activeAdmins = await db
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.companyId, access.companyId), eq(user.role, "ADMIN"), eq(user.isActive, true)));
      if (activeAdmins.length <= 1) {
        return NextResponse.json(
          {
            code: "FORBIDDEN",
            message: "Cannot delete the last active admin user.",
          },
          { status: 403 }
        );
      }
    }

    await db
      .delete(userCompanyRole)
      .where(and(eq(userCompanyRole.companyId, access.companyId), eq(userCompanyRole.userId, userId)));

    const [updated] = await db
      .update(user)
      .set({
        companyId: null,
        role: "USER",
        readOnly: true,
        canWriteMasterData: false,
        canWritePreTour: false,
        updatedAt: new Date(),
      })
      .where(and(eq(user.companyId, access.companyId), eq(user.id, userId)))
      .returning({ id: user.id });
    if (!updated) {
      return NextResponse.json(
        { code: "USER_NOT_FOUND", message: "User not found in your company." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to remove user from company." },
      { status: 500 }
    );
  }
}
