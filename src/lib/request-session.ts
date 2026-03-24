import { getCookieCache, getSessionCookie } from "better-auth/cookies";
import { constantTimeEqual, makeSignature } from "better-auth/crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { getAuthSecondaryStorage } from "@/lib/auth-secondary-storage";
import { session, user } from "@/db/schema";

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

const authSecret = process.env.BETTER_AUTH_SECRET?.trim() || "";
const requestSessionCache = new WeakMap<Headers, Promise<SessionPayload>>();

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

async function resolveRequestSession(headers: Headers): Promise<SessionPayload> {
  const normalizedHeaders = await buildNormalizedAuthHeaders(headers);

  try {
    const primarySession = normalizeSessionPayload(
      await auth.api.getSession({ headers: normalizedHeaders })
    );
    if (primarySession?.user?.id) {
      return primarySession;
    }
  } catch {
    // Fall through to cookie/db-based recovery.
  }

  const cookieCacheSession = await resolveSessionFromCookieCache(normalizedHeaders);
  if (cookieCacheSession?.user?.id) {
    return cookieCacheSession;
  }

  const secondaryStorageSession = await resolveSessionFromSecondaryStorage(normalizedHeaders);
  if (secondaryStorageSession?.user?.id) {
    return secondaryStorageSession;
  }

  return resolveSessionFromDatabase(normalizedHeaders);
}

export function getRequestSession(headers: Headers) {
  const cached = requestSessionCache.get(headers);
  if (cached) {
    return cached;
  }

  const sessionPromise = resolveRequestSession(headers);
  requestSessionCache.set(headers, sessionPromise);
  return sessionPromise;
}
