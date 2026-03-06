import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  company,
  companyRole,
  companyRolePrivilege,
  user,
  userCompanyRole,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  AppPlan,
  AppPrivilegeCode,
  clampPrivilegesToPlan,
  getDefaultRolePrivilegeCodes,
  getPrivilegesForPlan,
  isKnownPrivilegeCode,
} from "@/lib/security/privileges";

type LegacyRole = "ADMIN" | "MANAGER" | "USER";

export class AccessControlError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export type SecurityAccess = {
  userId: string;
  userName: string;
  companyId: string;
  role: LegacyRole;
  readOnly: boolean;
  canWriteMasterData: boolean;
  canWritePreTour: boolean;
  plan: AppPlan;
  subscriptionStatus: "PENDING" | "ACTIVE" | "TRIAL" | "EXPIRED" | "CANCELED";
  subscriptionEndsAt: Date | null;
  subscriptionLimited: boolean;
  privileges: AppPrivilegeCode[];
};

type ResolveAccessOptions = {
  requiredPrivilege?: AppPrivilegeCode;
};

const SYSTEM_ROLE_CODES: Record<LegacyRole, string> = {
  ADMIN: "SYS_ADMIN",
  MANAGER: "SYS_MANAGER",
  USER: "SYS_USER",
};
const ADMIN_PRIVILEGE_CACHE_TTL_MS = 15_000;
const ROLE_PRIVILEGE_CACHE_TTL_MS = 5_000;
const adminPrivilegeCache = new Map<
  string,
  { expiresAt: number; privileges: AppPrivilegeCode[] }
>();
const userPrivilegeCache = new Map<string, { expiresAt: number; privileges: string[] }>();

function normalizeLegacyRole(value: string | null | undefined): LegacyRole {
  if (value === "ADMIN" || value === "MANAGER") return value;
  return "USER";
}

function isSubscriptionActive(record: {
  subscriptionStatus: "PENDING" | "ACTIVE" | "TRIAL" | "EXPIRED" | "CANCELED";
  subscriptionEndsAt: Date | null;
}) {
  if (!(record.subscriptionStatus === "ACTIVE" || record.subscriptionStatus === "TRIAL")) {
    return false;
  }
  if (!record.subscriptionEndsAt) return true;
  return record.subscriptionEndsAt.getTime() >= Date.now();
}

async function getRolePrivileges(companyId: string, userId: string) {
  const cacheKey = `${companyId}:${userId}`;
  const cached = userPrivilegeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.privileges;

  const assignments = await db
    .select({ roleId: userCompanyRole.roleId })
    .from(userCompanyRole)
    .where(and(eq(userCompanyRole.companyId, companyId), eq(userCompanyRole.userId, userId)));

  if (assignments.length === 0) {
    userPrivilegeCache.set(cacheKey, { privileges: [], expiresAt: Date.now() + ROLE_PRIVILEGE_CACHE_TTL_MS });
    return [] as string[];
  }

  const privilegeRows = await db
    .select({ privilegeCode: companyRolePrivilege.privilegeCode })
    .from(companyRolePrivilege)
    .where(
      and(
        eq(companyRolePrivilege.companyId, companyId),
        inArray(
          companyRolePrivilege.roleId,
          assignments.map((row) => row.roleId)
        )
      )
    );

  const privileges = [...new Set(privilegeRows.map((row) => row.privilegeCode))];
  userPrivilegeCache.set(cacheKey, {
    privileges,
    expiresAt: Date.now() + ROLE_PRIVILEGE_CACHE_TTL_MS,
  });
  return privileges;
}

async function getCompanyAdminPrivilegeCeiling(companyId: string) {
  const cacheKey = companyId;
  const cached = adminPrivilegeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.privileges;
  }

  const [adminRole] = await db
    .select({ id: companyRole.id })
    .from(companyRole)
    .where(
      and(
        eq(companyRole.companyId, companyId),
        eq(companyRole.code, SYSTEM_ROLE_CODES.ADMIN),
        eq(companyRole.isActive, true)
      )
    )
    .limit(1);

  if (!adminRole) return null;

  const privilegeRows = await db
    .select({ privilegeCode: companyRolePrivilege.privilegeCode })
    .from(companyRolePrivilege)
    .where(
      and(
        eq(companyRolePrivilege.companyId, companyId),
        eq(companyRolePrivilege.roleId, adminRole.id)
      )
    );

  const privileges = [...new Set(privilegeRows.map((row) => row.privilegeCode))].filter(
    isKnownPrivilegeCode
  );
  adminPrivilegeCache.set(cacheKey, {
    privileges,
    expiresAt: Date.now() + ADMIN_PRIVILEGE_CACHE_TTL_MS,
  });
  return privileges;
}

function deriveLegacyPrivileges(accessUser: {
  role: LegacyRole;
  canWriteMasterData: boolean;
  canWritePreTour: boolean;
  readOnly: boolean;
}): AppPrivilegeCode[] {
  const base = getDefaultRolePrivilegeCodes(accessUser.role);
  const extra: AppPrivilegeCode[] = [];

  if (!accessUser.readOnly && accessUser.canWriteMasterData) {
    extra.push("MASTER_DATA_WRITE");
  }
  if (!accessUser.readOnly && accessUser.canWritePreTour) {
    extra.push("PRE_TOUR_WRITE");
  }

  return [...new Set([...base, ...extra])];
}

export async function ensureCompanyDefaultRoles(companyId: string) {
  const existing = await db
    .select({ id: companyRole.id, code: companyRole.code })
    .from(companyRole)
    .where(eq(companyRole.companyId, companyId));

  const existingByCode = new Map(existing.map((row) => [row.code, row.id]));

  for (const role of ["ADMIN", "MANAGER", "USER"] as const) {
    const code = SYSTEM_ROLE_CODES[role];
    if (existingByCode.has(code)) continue;

    const [created] = await db
      .insert(companyRole)
      .values({
        companyId,
        code,
        name: role,
        description: `${role} system role`,
        isSystem: true,
        isActive: true,
      })
      .returning({ id: companyRole.id });

    const defaultPrivileges = getDefaultRolePrivilegeCodes(role);
    if (defaultPrivileges.length > 0) {
      await db.insert(companyRolePrivilege).values(
        defaultPrivileges.map((privilegeCode) => ({
          companyId,
          roleId: created.id,
          privilegeCode,
        }))
      );
    }
  }
}

export async function assignSystemRoleToUser(
  companyId: string,
  userId: string,
  role: LegacyRole
) {
  await ensureCompanyDefaultRoles(companyId);
  const [targetRole] = await db
    .select({ id: companyRole.id })
    .from(companyRole)
    .where(
      and(
        eq(companyRole.companyId, companyId),
        eq(companyRole.code, SYSTEM_ROLE_CODES[role]),
        eq(companyRole.isActive, true)
      )
    )
    .limit(1);

  if (!targetRole) return;

  await db
    .delete(userCompanyRole)
    .where(and(eq(userCompanyRole.companyId, companyId), eq(userCompanyRole.userId, userId)));

  await db.insert(userCompanyRole).values({
    companyId,
    userId,
    roleId: targetRole.id,
  });
}

export async function resolveAccess(
  headers: Headers,
  options: ResolveAccessOptions = {}
): Promise<SecurityAccess> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) {
    throw new AccessControlError(401, "UNAUTHORIZED", "You are not authenticated.");
  }

  const [currentUser] = await db
    .select({
      id: user.id,
      name: user.name,
      companyId: user.companyId,
      role: user.role,
      readOnly: user.readOnly,
      canWriteMasterData: user.canWriteMasterData,
      canWritePreTour: user.canWritePreTour,
      isActive: user.isActive,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!currentUser) {
    throw new AccessControlError(401, "UNAUTHORIZED", "Authenticated user not found.");
  }
  if (!currentUser.isActive) {
    throw new AccessControlError(403, "FORBIDDEN", "Your account is inactive.");
  }
  if (!currentUser.companyId) {
    throw new AccessControlError(403, "COMPANY_REQUIRED", "User is not linked to a company.");
  }

  const [currentCompany] = await db
    .select({
      id: company.id,
      isActive: company.isActive,
      subscriptionPlan: company.subscriptionPlan,
      subscriptionStatus: company.subscriptionStatus,
      subscriptionStartsAt: company.subscriptionStartsAt,
      subscriptionEndsAt: company.subscriptionEndsAt,
    })
    .from(company)
    .where(eq(company.id, currentUser.companyId))
    .limit(1);

  if (!currentCompany) {
    throw new AccessControlError(404, "COMPANY_NOT_FOUND", "Company not found.");
  }
  if (!currentCompany.isActive) {
    throw new AccessControlError(403, "COMPANY_INACTIVE", "Company is inactive.");
  }
  const legacyRole = normalizeLegacyRole(currentUser.role);
  const elevated = legacyRole === "ADMIN" || legacyRole === "MANAGER";
  const subscriptionLimited = !isSubscriptionActive(currentCompany);
  const canActivateSubscription =
    options.requiredPrivilege === "SUBSCRIPTION_MANAGE" && legacyRole === "ADMIN";
  if (subscriptionLimited && legacyRole === "ADMIN" && !canActivateSubscription) {
    throw new AccessControlError(
      403,
      "SUBSCRIPTION_REQUIRED",
      "Subscription is required to continue. Open Plans & Billing to activate a plan."
    );
  }
  const storedReadOnly = Boolean(currentUser.readOnly);
  const storedCanWriteMasterData = Boolean(currentUser.canWriteMasterData);
  const storedCanWritePreTour = Boolean(currentUser.canWritePreTour);

  // Keep legacy flags consistent so existing UI and feature checks stay reliable.
  if (elevated && (storedReadOnly || !storedCanWriteMasterData || !storedCanWritePreTour)) {
    await db
      .update(user)
      .set({
        readOnly: false,
        canWriteMasterData: true,
        canWritePreTour: true,
        updatedAt: new Date(),
      })
      .where(eq(user.id, currentUser.id));
  }

  if (
    subscriptionLimited &&
    !elevated &&
    (!storedReadOnly || storedCanWriteMasterData || storedCanWritePreTour)
  ) {
    await db
      .update(user)
      .set({
        readOnly: true,
        canWriteMasterData: false,
        canWritePreTour: false,
        updatedAt: new Date(),
      })
      .where(eq(user.id, currentUser.id));
  }

  const effectiveReadOnly = subscriptionLimited ? true : elevated ? false : storedReadOnly;
  const plan = currentCompany.subscriptionPlan ?? "STARTER";
  const allowedByPlan = new Set(getPrivilegesForPlan(plan));
  const adminCeiling = await getCompanyAdminPrivilegeCeiling(currentCompany.id);
  const allowedByCompany = new Set(
    adminCeiling
      ? clampPrivilegesToPlan(plan, adminCeiling)
      : getPrivilegesForPlan(plan)
  );
  const assignedPrivileges = await getRolePrivileges(currentCompany.id, currentUser.id);

  const baselinePrivileges = deriveLegacyPrivileges({
    role: legacyRole,
    readOnly: effectiveReadOnly,
    canWriteMasterData: storedCanWriteMasterData || elevated,
    canWritePreTour: storedCanWritePreTour || elevated,
  });

  const rawPrivileges = [
    ...new Set([
      ...baselinePrivileges,
      ...assignedPrivileges.filter(isKnownPrivilegeCode),
    ]),
  ];

  const privileges = clampPrivilegesToPlan(plan, rawPrivileges).filter((code) =>
    allowedByCompany.has(code)
  );
  const privilegeSet = new Set(privileges);
  const canWriteMasterData =
    !subscriptionLimited &&
    !effectiveReadOnly &&
    (storedCanWriteMasterData || elevated || privilegeSet.has("MASTER_DATA_WRITE"));
  const canWritePreTour =
    !subscriptionLimited &&
    !effectiveReadOnly &&
    (storedCanWritePreTour || elevated || privilegeSet.has("PRE_TOUR_WRITE"));

  if (options.requiredPrivilege && !allowedByPlan.has(options.requiredPrivilege)) {
    throw new AccessControlError(
      403,
      "PLAN_RESTRICTED",
      "Your current subscription plan does not include this feature."
    );
  }
  if (options.requiredPrivilege && !allowedByCompany.has(options.requiredPrivilege)) {
    throw new AccessControlError(
      403,
      "PERMISSION_DENIED",
      "Your company admin role configuration does not allow this feature."
    );
  }
  if (options.requiredPrivilege && !privilegeSet.has(options.requiredPrivilege)) {
    throw new AccessControlError(
      403,
      "PERMISSION_DENIED",
      "You do not have access to this feature."
    );
  }

  return {
    userId: currentUser.id,
    userName: currentUser.name,
    companyId: currentCompany.id,
    role: legacyRole,
    readOnly: effectiveReadOnly,
    canWriteMasterData,
    canWritePreTour,
    plan,
    subscriptionStatus: currentCompany.subscriptionStatus,
    subscriptionEndsAt: currentCompany.subscriptionEndsAt,
    subscriptionLimited,
    privileges,
  };
}
