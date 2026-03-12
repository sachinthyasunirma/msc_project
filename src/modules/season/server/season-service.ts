import { and, desc, eq, ilike, lt, or, sql, SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  getOrSetMasterDataCache,
  invalidateMasterDataCacheByPrefixes,
  masterDataCachePrefix,
  masterDataListCacheKey,
} from "@/lib/cache/master-data-cache";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import {
  createSeasonSchema,
  cursorSchema,
  seasonListQuerySchema,
  updateSeasonSchema,
} from "@/modules/season/shared/season-schemas";

class SeasonError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

function normalizeZodError(error: z.ZodError) {
  return error.issues[0]?.message || "Validation failed.";
}

function parseCursor(cursor?: string) {
  if (!cursor) return null;
  try {
    const decoded = cursorSchema.parse(
      JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    );
    return {
      createdAt: new Date(decoded.createdAt),
      id: decoded.id,
    };
  } catch {
    throw new SeasonError(400, "INVALID_CURSOR", "Invalid pagination cursor.");
  }
}

function buildCursor(row: { createdAt: Date; id: string }) {
  return Buffer.from(
    JSON.stringify({
      createdAt: row.createdAt.toISOString(),
      id: row.id,
    }),
    "utf8"
  ).toString("base64url");
}

async function getCompanyId(requestHeaders: Headers) {
  try {
    const access = await resolveAccess(requestHeaders, {
      requiredPrivilege: "SCREEN_MASTER_SEASONS",
    });
    return access.companyId;
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new SeasonError(error.status, error.code, error.message);
    }
    throw error;
  }
}

async function ensureWritable(requestHeaders: Headers) {
  let access: Awaited<ReturnType<typeof resolveAccess>>;
  try {
    access = await resolveAccess(requestHeaders, {
      requiredPrivilege: "SCREEN_MASTER_SEASONS",
    });
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new SeasonError(error.status, error.code, error.message);
    }
    throw error;
  }
  if (access.readOnly) {
    throw new SeasonError(
      403,
      "READ_ONLY_MODE",
      "You are in read-only mode. Contact a manager for edit access."
    );
  }
  const elevated = access.role === "ADMIN" || access.role === "MANAGER";
  if (!elevated && !access.canWriteMasterData) {
    throw new SeasonError(
      403,
      "PERMISSION_DENIED",
      "You do not have write access for Master Data."
    );
  }
}

export async function listSeasons(searchParams: URLSearchParams, headers: Headers) {
  const parsed = seasonListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new SeasonError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const query = parsed.data;
  const companyId = await getCompanyId(headers);
  const cursor = parseCursor(query.cursor);
  const clauses: SQL[] = [eq(schema.season.companyId, companyId)];

  if (query.q) {
    const term = `%${query.q}%`;
    clauses.push(or(ilike(schema.season.name, term), ilike(schema.season.description, term))!);
  }
  if (query.startDateFrom) {
    clauses.push(sql`${schema.season.startDate} >= ${query.startDateFrom}`);
  }
  if (query.startDateTo) {
    clauses.push(sql`${schema.season.startDate} <= ${query.startDateTo}`);
  }
  if (cursor) {
    clauses.push(
      or(
        lt(schema.season.createdAt, cursor.createdAt),
        and(eq(schema.season.createdAt, cursor.createdAt), lt(schema.season.id, cursor.id))
      )!
    );
  }

  const cacheKey = masterDataListCacheKey("season", companyId, "seasons", query);
  return getOrSetMasterDataCache(cacheKey, async () => {
    const rows = await db
      .select({
        id: schema.season.id,
        code: schema.season.code,
        name: schema.season.name,
        description: schema.season.description,
        startDate: schema.season.startDate,
        endDate: schema.season.endDate,
        createdAt: schema.season.createdAt,
        updatedAt: schema.season.updatedAt,
      })
      .from(schema.season)
      .where(and(...clauses))
      .orderBy(desc(schema.season.createdAt), desc(schema.season.id))
      .limit(query.limit + 1);

    const hasNext = rows.length > query.limit;
    const items = hasNext ? rows.slice(0, query.limit) : rows;
    const last = items[items.length - 1];

    return {
      items,
      nextCursor: hasNext && last ? buildCursor(last) : null,
      hasNext,
      limit: query.limit,
    };
  });
}

export async function createSeason(payload: unknown, headers: Headers) {
  await ensureWritable(headers);
  const parsed = createSeasonSchema.safeParse(payload);
  if (!parsed.success) {
    throw new SeasonError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const companyId = await getCompanyId(headers);
  try {
    const [created] = await db
      .insert(schema.season)
      .values({
        ...parsed.data,
        companyId,
      })
      .returning();

    return created;
  } finally {
    await invalidateMasterDataCacheByPrefixes([masterDataCachePrefix("season", companyId)]);
  }
}

export async function updateSeason(seasonId: string, payload: unknown, headers: Headers) {
  await ensureWritable(headers);
  const parsed = updateSeasonSchema.safeParse(payload);
  if (!parsed.success) {
    throw new SeasonError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const companyId = await getCompanyId(headers);
  try {
    const [updated] = await db
      .update(schema.season)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.season.id, seasonId), eq(schema.season.companyId, companyId)))
      .returning();

    if (!updated) {
      throw new SeasonError(404, "SEASON_NOT_FOUND", "Season not found.");
    }

    return updated;
  } finally {
    await invalidateMasterDataCacheByPrefixes([masterDataCachePrefix("season", companyId)]);
  }
}

export async function deleteSeason(seasonId: string, headers: Headers) {
  await ensureWritable(headers);
  const companyId = await getCompanyId(headers);
  try {
    const [deleted] = await db
      .delete(schema.season)
      .where(and(eq(schema.season.id, seasonId), eq(schema.season.companyId, companyId)))
      .returning({ id: schema.season.id });

    if (!deleted) {
      throw new SeasonError(404, "SEASON_NOT_FOUND", "Season not found.");
    }
  } finally {
    await invalidateMasterDataCacheByPrefixes([masterDataCachePrefix("season", companyId)]);
  }
}

export function toSeasonErrorResponse(error: unknown) {
  if (error instanceof SeasonError) {
    return {
      status: error.status,
      body: { code: error.code, message: error.message },
    };
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("duplicate key")) {
      return {
        status: 409,
        body: {
          code: "DUPLICATE_RECORD",
          message: "Record already exists for given unique fields.",
        },
      };
    }
    if (message.includes("violates foreign key")) {
      return {
        status: 400,
        body: {
          code: "FOREIGN_KEY_ERROR",
          message: "Invalid relation provided.",
        },
      };
    }
  }

  return {
    status: 500,
    body: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong. Please try again.",
    },
  };
}
