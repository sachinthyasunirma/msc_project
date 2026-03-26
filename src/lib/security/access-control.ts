import { getCookieCache, getSessionCookie } from "better-auth/cookies";
import { constantTimeEqual, makeSignature } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import {
  company,
  companyRole,
  companyRolePrivilege,
  session,
  user,
  userCompanyRole,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { getAuthSecondaryStorage } from "@/lib/auth-secondary-storage";
import { profileServerOperation } from "@/lib/logging/perf";
import {
  AppPlan,
  AppPrivilegeCode,
  clampPrivilegesToPlan,
  getDefaultRolePrivilegeCodes,
  getPrivilegesForPlan,
  isKnownPrivilegeCode,
} from "@/lib/security/privileges";
import { appendRequestContext } from "@/lib/logging/context";
import { logger } from "@/lib/logging/logger";

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

function isDatabaseUnavailableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    message?: string;
    code?: string;
    cause?: { code?: string; message?: string };
    sourceError?: { code?: string; message?: string };
  };
  const message = String(candidate.message ?? "").toLowerCase();
  const directCode = String(candidate.code ?? "").toUpperCase();
  const causeCode = String(candidate.cause?.code ?? "").toUpperCase();
  const sourceCode = String(candidate.sourceError?.code ?? "").toUpperCase();
  const causeMessage = String(candidate.cause?.message ?? "").toLowerCase();
  const sourceMessage = String(candidate.sourceError?.message ?? "").toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("enotfound") ||
    message.includes("connection") ||
    causeMessage.includes("fetch failed") ||
    sourceMessage.includes("fetch failed") ||
    directCode === "ENOTFOUND" ||
    directCode === "UND_ERR_SOCKET" ||
    causeCode === "ENOTFOUND" ||
    causeCode === "UND_ERR_SOCKET" ||
    sourceCode === "ENOTFOUND" ||
    sourceCode === "UND_ERR_SOCKET"
  );
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

type SessionUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  companyId?: string | null;
};

type SessionPayload = {
  user?: SessionUser | null;
} | null;

type ResolvedAccessContext = {
  access: SecurityAccess;
  allowedByPlan: Set<AppPrivilegeCode>;
  allowedByCompany: Set<AppPrivilegeCode>;
};

const SYSTEM_ROLE_CODES: Record<LegacyRole, string> = {
  ADMIN: "SYS_ADMIN",
  MANAGER: "SYS_MANAGER",
  USER: "SYS_USER",
};
const ADMIN_PRIVILEGE_CACHE_TTL_MS = 15_000;
const ROLE_PRIVILEGE_CACHE_TTL_MS = 5_000;
const LEGACY_FLAG_SYNC_TTL_MS = 60_000;
const LEGACY_FLAG_SYNC_MAX_ENTRIES = 2_000;
const adminPrivilegeCache = new Map<
  string,
  { expiresAt: number; privileges: AppPrivilegeCode[] }
>();
const userPrivilegeCache = new Map<string, { expiresAt: number; privileges: string[] }>();
const legacyFlagSyncCache = new Map<string, number>();
const sessionCache = new WeakMap<Headers, Promise<SessionPayload>>();
const baseAccessCache = new WeakMap<Headers, Promise<ResolvedAccessContext>>();
const authSecret = process.env.BETTER_AUTH_SECRET?.trim() || "";

function normalizeLegacyRole(value: string | null | undefined): LegacyRole {
  if (value === "ADMIN" || value === "MANAGER") return value;
  return "USER";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function normalizeSessionPayload(payload: unknown): SessionPayload {
  const record = asRecord(payload);
  const userRecord = asRecord(record?.user);
  const id = asString(userRecord?.id);
  if (!id) return null;

  return {
    user: {
      id,
      name: asString(userRecord?.name),
      email: asString(userRecord?.email),
      image: asString(userRecord?.image),
      companyId: asString(userRecord?.companyId),
    },
  };
}

function isValidSessionExpiry(value: unknown) {
  if (!value) return true;
  const expiresAt = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() > Date.now();
}

function readAuthCookieSignals(headers: Headers) {
  const cookieHeader = headers.get("cookie") || "";
  return {
    hasCookieHeader: cookieHeader.length > 0,
    hasSessionTokenCookie: cookieHeader.includes("better-auth.session_token"),
    hasSecureSessionTokenCookie: cookieHeader.includes("__Secure-better-auth.session_token"),
    hasSessionDataCookie: cookieHeader.includes("better-auth.session_data"),
    hasSecureSessionDataCookie: cookieHeader.includes("__Secure-better-auth.session_data"),
    host: headers.get("host"),
    origin: headers.get("origin"),
    referer: headers.get("referer"),
    userAgent: headers.get("user-agent"),
  };
}

async function buildNormalizedAuthHeaders(inputHeaders: Headers) {
  const normalizedHeaders = new Headers(inputHeaders);
  if (normalizedHeaders.get("cookie")) {
    return normalizedHeaders;
  }

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");
    if (cookieHeader) {
      normalizedHeaders.set("cookie", cookieHeader);
    }
  } catch {
    // Request cookies are only available inside a Next request context.
  }

  return normalizedHeaders;
}

async function resolveSessionFromCookieCache(headers: Headers): Promise<SessionPayload> {
  if (!authSecret) return null;

  try {
    const payload = await getCookieCache(headers, {
      secret: authSecret,
      strategy: "jwe",
    });
    const payloadRecord = asRecord(payload);
    const sessionRecord = asRecord(payloadRecord?.session);
    if (!payload || !isValidSessionExpiry(sessionRecord?.expiresAt)) {
      return null;
    }
    return normalizeSessionPayload(payload);
  } catch {
    return null;
  }
}

async function verifySignedSessionToken(headers: Headers) {
  if (!authSecret) return null;

  const rawSignedCookie = getSessionCookie(headers);
  if (!rawSignedCookie) return null;

  let signedCookie: string;
  try {
    signedCookie = decodeURIComponent(rawSignedCookie);
  } catch {
    signedCookie = rawSignedCookie;
  }

  if (!signedCookie) return null;

  const separatorIndex = signedCookie.lastIndexOf(".");
  if (separatorIndex <= 0) return null;

  const token = signedCookie.slice(0, separatorIndex);
  const signature = signedCookie.slice(separatorIndex + 1);
  if (!token || !signature) return null;

  const expectedSignature = await makeSignature(token, authSecret);
  return constantTimeEqual(signature, expectedSignature) ? token : null;
}

async function resolveSessionFromDatabase(headers: Headers): Promise<SessionPayload> {
  const sessionToken = await verifySignedSessionToken(headers);
  if (!sessionToken) return null;

  const [record] = await db
    .select({
      expiresAt: session.expiresAt,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
      userCompanyId: user.companyId,
      userIsActive: user.isActive,
    })
    .from(session)
    .innerJoin(user, eq(user.id, session.userId))
    .where(eq(session.token, sessionToken))
    .limit(1);

  if (!record?.userId || !record.userIsActive || !isValidSessionExpiry(record.expiresAt)) {
    return null;
  }

  return {
    user: {
      id: record.userId,
      name: record.userName,
      email: record.userEmail,
      image: record.userImage,
      companyId: record.userCompanyId,
    },
  };
}

async function resolveSessionFromSecondaryStorage(headers: Headers): Promise<SessionPayload> {
  const sessionToken = await verifySignedSessionToken(headers);
  if (!sessionToken) return null;

  try {
    const raw = await getAuthSecondaryStorage().get(sessionToken);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      session?: { expiresAt?: string | Date | null } | null;
      user?: SessionUser | null;
    };

    if (!parsed?.user?.id || !isValidSessionExpiry(parsed.session?.expiresAt)) {
      return null;
    }

    return {
      user: {
        id: parsed.user.id,
        name: parsed.user.name ?? null,
        email: parsed.user.email ?? null,
        image: parsed.user.image ?? null,
        companyId: parsed.user.companyId ?? null,
      },
    };
  } catch {
    return null;
  }
}

async function resolveSession(headers: Headers): Promise<SessionPayload> {
  const normalizedHeaders = await buildNormalizedAuthHeaders(headers);

  try {
    const primarySession = normalizeSessionPayload(await auth.api.getSession({ headers: normalizedHeaders }));
    if (primarySession?.user?.id) {
      return primarySession;
    }
  } catch (error) {
    logger.warn("auth_session_primary_resolution_failed", {
      eventType: "error",
      feature: "access-control",
      errorMessage: error instanceof Error ? error.message : "Failed to resolve session.",
    });
  }

  const cookieCacheSession = await resolveSessionFromCookieCache(normalizedHeaders);
  if (cookieCacheSession?.user?.id) {
    logger.info("auth_session_fallback_used", {
      eventType: "operational",
      feature: "access-control",
      strategy: "cookie-cache",
    });
    return cookieCacheSession;
  }

  const secondaryStorageSession = await resolveSessionFromSecondaryStorage(normalizedHeaders);
  if (secondaryStorageSession?.user?.id) {
    logger.info("auth_session_fallback_used", {
      eventType: "operational",
      feature: "access-control",
      strategy: "secondary-storage",
    });
    return secondaryStorageSession;
  }

  const databaseSession = await resolveSessionFromDatabase(normalizedHeaders);
  if (databaseSession?.user?.id) {
    logger.info("auth_session_fallback_used", {
      eventType: "operational",
      feature: "access-control",
      strategy: "database",
    });
    return databaseSession;
  }

  return null;
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

  const privilegeRows = await db
    .select({ privilegeCode: companyRolePrivilege.privilegeCode })
    .from(userCompanyRole)
    .innerJoin(
      companyRolePrivilege,
      and(
        eq(companyRolePrivilege.companyId, userCompanyRole.companyId),
        eq(companyRolePrivilege.roleId, userCompanyRole.roleId)
      )
    )
    .where(and(eq(userCompanyRole.companyId, companyId), eq(userCompanyRole.userId, userId)));

  if (privilegeRows.length === 0) {
    userPrivilegeCache.set(cacheKey, { privileges: [], expiresAt: Date.now() + ROLE_PRIVILEGE_CACHE_TTL_MS });
    return [] as string[];
  }

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

  const privilegeRows = await db
    .select({ privilegeCode: companyRolePrivilege.privilegeCode })
    .from(companyRolePrivilege)
    .innerJoin(
      companyRole,
      and(
        eq(companyRole.id, companyRolePrivilege.roleId),
        eq(companyRole.companyId, companyRolePrivilege.companyId)
      )
    )
    .where(
      and(
        eq(companyRole.companyId, companyId),
        eq(companyRole.code, SYSTEM_ROLE_CODES.ADMIN),
        eq(companyRole.isActive, true)
      )
    );

  if (privilegeRows.length === 0) return null;

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

function pruneLegacyFlagSyncCache(now = Date.now()) {
  if (legacyFlagSyncCache.size <= LEGACY_FLAG_SYNC_MAX_ENTRIES) return;

  for (const [key, expiresAt] of legacyFlagSyncCache) {
    if (expiresAt <= now || legacyFlagSyncCache.size > LEGACY_FLAG_SYNC_MAX_ENTRIES) {
      legacyFlagSyncCache.delete(key);
    }
    if (legacyFlagSyncCache.size <= LEGACY_FLAG_SYNC_MAX_ENTRIES) {
      break;
    }
  }
}

function scheduleLegacyFlagSync(
  userId: string,
  nextFlags: {
    readOnly: boolean;
    canWriteMasterData: boolean;
    canWritePreTour: boolean;
  }
) {
  const syncKey = `${userId}:${Number(nextFlags.readOnly)}:${Number(nextFlags.canWriteMasterData)}:${Number(
    nextFlags.canWritePreTour
  )}`;
  const now = Date.now();
  const throttledUntil = legacyFlagSyncCache.get(syncKey) ?? 0;
  if (throttledUntil > now) return;

  legacyFlagSyncCache.set(syncKey, now + LEGACY_FLAG_SYNC_TTL_MS);
  pruneLegacyFlagSyncCache(now);

  void db
    .update(user)
    .set({
      readOnly: nextFlags.readOnly,
      canWriteMasterData: nextFlags.canWriteMasterData,
      canWritePreTour: nextFlags.canWritePreTour,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))
    .catch((error) => {
      legacyFlagSyncCache.delete(syncKey);
      logger.warn("legacy_user_flag_sync_failed", {
        eventType: "error",
        feature: "access-control",
        userId,
        errorMessage: error instanceof Error ? error.message : "Legacy user flag sync failed",
      });
    });
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

export function getCachedSession(headers: Headers) {
  const cached = sessionCache.get(headers);
  if (cached) {
    return cached;
  }

  const sessionPromise = resolveSession(headers);
  sessionCache.set(headers, sessionPromise);
  return sessionPromise;
}

function assertRequiredPrivilege(
  context: ResolvedAccessContext,
  requiredPrivilege?: AppPrivilegeCode
) {
  if (!requiredPrivilege) return;

  if (!context.allowedByPlan.has(requiredPrivilege)) {
    throw new AccessControlError(
      403,
      "PLAN_RESTRICTED",
      "Your current subscription plan does not include this feature."
    );
  }
  if (!context.allowedByCompany.has(requiredPrivilege)) {
    throw new AccessControlError(
      403,
      "PERMISSION_DENIED",
      "Your company admin role configuration does not allow this feature."
    );
  }
  if (!context.access.privileges.includes(requiredPrivilege)) {
    throw new AccessControlError(
      403,
      "PERMISSION_DENIED",
      "You do not have access to this feature."
    );
  }
}

async function loadBaseAccess(headers: Headers): Promise<ResolvedAccessContext> {
  return profileServerOperation(
    {
      feature: "access-control",
      operation: "load_base_access",
      warnThresholdMs: 150,
      getMetadata: (result) => ({
        role: result.access.role,
        subscriptionLimited: result.access.subscriptionLimited,
        privilegeCount: result.access.privileges.length,
      }),
    },
    async () => {
      const session = await getCachedSession(headers);
      if (!session?.user?.id) {
        logger.warn("auth_session_missing", {
          eventType: "error",
          feature: "access-control",
          ...readAuthCookieSignals(await buildNormalizedAuthHeaders(headers)),
        });
        throw new AccessControlError(401, "UNAUTHORIZED", "You are not authenticated.");
      }

      const [currentRecord] = await db
        .select({
          id: user.id,
          name: user.name,
          companyId: user.companyId,
          role: user.role,
          readOnly: user.readOnly,
          canWriteMasterData: user.canWriteMasterData,
          canWritePreTour: user.canWritePreTour,
          isActive: user.isActive,
          companyRecordId: company.id,
          companyIsActive: company.isActive,
          companySubscriptionPlan: company.subscriptionPlan,
          companySubscriptionStatus: company.subscriptionStatus,
          companySubscriptionStartsAt: company.subscriptionStartsAt,
          companySubscriptionEndsAt: company.subscriptionEndsAt,
        })
        .from(user)
        .leftJoin(company, eq(company.id, user.companyId))
        .where(eq(user.id, session.user.id))
        .limit(1);

      if (!currentRecord) {
        throw new AccessControlError(401, "UNAUTHORIZED", "Authenticated user not found.");
      }
      if (!currentRecord.isActive) {
        throw new AccessControlError(403, "FORBIDDEN", "Your account is inactive.");
      }
      if (!currentRecord.companyId) {
        throw new AccessControlError(403, "COMPANY_REQUIRED", "User is not linked to a company.");
      }
      if (!currentRecord.companyRecordId) {
        throw new AccessControlError(404, "COMPANY_NOT_FOUND", "Company not found.");
      }
      if (!currentRecord.companyIsActive) {
        throw new AccessControlError(403, "COMPANY_INACTIVE", "Company is inactive.");
      }

      const legacyRole = normalizeLegacyRole(currentRecord.role);
      const elevated = legacyRole === "ADMIN" || legacyRole === "MANAGER";
      const subscriptionStatus = currentRecord.companySubscriptionStatus ?? "PENDING";
      const subscriptionLimited = !isSubscriptionActive({
        subscriptionStatus,
        subscriptionEndsAt: currentRecord.companySubscriptionEndsAt,
      });
      const storedReadOnly = Boolean(currentRecord.readOnly);
      const storedCanWriteMasterData = Boolean(currentRecord.canWriteMasterData);
      const storedCanWritePreTour = Boolean(currentRecord.canWritePreTour);

      // Keep legacy flags consistent for older readers, but do not block protected requests on writes.
      if (elevated && (storedReadOnly || !storedCanWriteMasterData || !storedCanWritePreTour)) {
        scheduleLegacyFlagSync(currentRecord.id, {
          readOnly: false,
          canWriteMasterData: true,
          canWritePreTour: true,
        });
      }

      if (
        subscriptionLimited &&
        !elevated &&
        (!storedReadOnly || storedCanWriteMasterData || storedCanWritePreTour)
      ) {
        scheduleLegacyFlagSync(currentRecord.id, {
          readOnly: true,
          canWriteMasterData: false,
          canWritePreTour: false,
        });
      }

      const effectiveReadOnly = subscriptionLimited ? true : elevated ? false : storedReadOnly;
      const plan = currentRecord.companySubscriptionPlan ?? "STARTER";
      const allowedByPlan = new Set(getPrivilegesForPlan(plan));
      const adminCeiling = await getCompanyAdminPrivilegeCeiling(currentRecord.companyRecordId);
      const allowedByCompany = new Set(
        adminCeiling ? clampPrivilegesToPlan(plan, adminCeiling) : getPrivilegesForPlan(plan)
      );
      const assignedPrivileges = await getRolePrivileges(currentRecord.companyRecordId, currentRecord.id);

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

      appendRequestContext({
        tenantId: currentRecord.companyRecordId,
        organizationId: currentRecord.companyRecordId,
        companyId: currentRecord.companyRecordId,
        userId: currentRecord.id,
      });

      return {
        access: {
          userId: currentRecord.id,
          userName: currentRecord.name,
          companyId: currentRecord.companyRecordId,
          role: legacyRole,
          readOnly: effectiveReadOnly,
          canWriteMasterData,
          canWritePreTour,
          plan,
          subscriptionStatus,
          subscriptionEndsAt: currentRecord.companySubscriptionEndsAt,
          subscriptionLimited,
          privileges,
        },
        allowedByPlan,
        allowedByCompany,
      };
    }
  );
}

export async function resolveAccess(
  headers: Headers,
  options: ResolveAccessOptions = {}
): Promise<SecurityAccess> {
  try {
    let contextPromise = baseAccessCache.get(headers);
    if (!contextPromise) {
      contextPromise = loadBaseAccess(headers);
      baseAccessCache.set(headers, contextPromise);
    }

    const context = await contextPromise;
    const canActivateSubscription =
      options.requiredPrivilege === "SUBSCRIPTION_MANAGE" && context.access.role === "ADMIN";
    if (
      context.access.subscriptionLimited &&
      context.access.role === "ADMIN" &&
      !canActivateSubscription
    ) {
      throw new AccessControlError(
        403,
        "SUBSCRIPTION_REQUIRED",
        "Subscription is required to continue. Open Plans & Billing to activate a plan."
      );
    }
    assertRequiredPrivilege(context, options.requiredPrivilege);
    return context.access;
  } catch (error) {
    if (error instanceof AccessControlError) {
      logger.warn("access_control_denied", {
        eventType: "error",
        feature: "access-control",
        errorCode: error.code,
        status: error.status,
        errorMessage: error.message,
      });
      throw error;
    }
    if (isDatabaseUnavailableError(error)) {
      logger.error("access_control_database_unavailable", {
        eventType: "error",
        feature: "access-control",
        errorMessage: error instanceof Error ? error.message : "Database unavailable",
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw new AccessControlError(
        503,
        "DATABASE_UNAVAILABLE",
        "Database connection is unavailable. Check DATABASE_URL/network and try again."
      );
    }
    logger.error("access_control_unexpected_error", {
      eventType: "error",
      feature: "access-control",
      errorMessage: error instanceof Error ? error.message : "Unexpected access-control error",
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
