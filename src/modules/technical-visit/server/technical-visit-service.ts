import { and, desc, eq, ilike, or } from "drizzle-orm";
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
  createTechnicalVisitActionSchema,
  createTechnicalVisitChecklistSchema,
  createTechnicalVisitMediaSchema,
  createTechnicalVisitSchema,
  technicalVisitListQuerySchema,
  technicalVisitResourceSchema,
  updateTechnicalVisitActionSchema,
  updateTechnicalVisitChecklistSchema,
  updateTechnicalVisitMediaSchema,
  updateTechnicalVisitSchema,
} from "@/modules/technical-visit/shared/technical-visit-schemas";

class TechnicalVisitError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

type TechnicalVisitResource = z.infer<typeof technicalVisitResourceSchema>;

function normalizeZodError(error: z.ZodError) {
  return error.issues[0]?.message || "Validation failed.";
}

function parseResource(input: string): TechnicalVisitResource {
  const parsed = technicalVisitResourceSchema.safeParse(input);
  if (!parsed.success) {
    throw new TechnicalVisitError(404, "RESOURCE_NOT_FOUND", "Technical visit resource not found.");
  }
  return parsed.data;
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value);
}

async function getAccess(headers: Headers) {
  try {
    return await resolveAccess(headers, {
      requiredPrivilege: "SCREEN_TECHNICAL_VISITS",
    });
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new TechnicalVisitError(error.status, error.code, error.message);
    }
    throw error;
  }
}

async function ensureWritable(headers: Headers) {
  const access = await getAccess(headers);
  if (access.readOnly) {
    throw new TechnicalVisitError(
      403,
      "READ_ONLY_MODE",
      "You are in read-only mode. Contact a manager for edit access."
    );
  }
  const elevated = access.role === "ADMIN" || access.role === "MANAGER";
  if (!elevated && !access.canWriteMasterData) {
    throw new TechnicalVisitError(
      403,
      "PERMISSION_DENIED",
      "You do not have write access for Master Data."
    );
  }
  return access;
}

async function ensureVisit(companyId: string, visitId: string) {
  const [record] = await db
    .select({ id: schema.technicalVisit.id })
    .from(schema.technicalVisit)
    .where(and(eq(schema.technicalVisit.id, visitId), eq(schema.technicalVisit.companyId, companyId)))
    .limit(1);

  if (!record) {
    throw new TechnicalVisitError(400, "VISIT_NOT_FOUND", "Technical visit not found.");
  }
}

async function ensureUserInCompany(companyId: string, userId: string) {
  const [record] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(and(eq(schema.user.id, userId), eq(schema.user.companyId, companyId)))
    .limit(1);

  if (!record) {
    throw new TechnicalVisitError(400, "USER_NOT_FOUND", "User not found in this company.");
  }
}

export async function listTechnicalVisitRecords(
  resourceInput: string,
  searchParams: URLSearchParams,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const parsed = technicalVisitListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new TechnicalVisitError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const { companyId } = await getAccess(headers);
  const q = parsed.data.q ? `%${parsed.data.q}%` : null;
  const limit = parsed.data.limit;
  const cacheKey = masterDataListCacheKey("technical-visit", companyId, resource, parsed.data);
  return getOrSetMasterDataCache(cacheKey, async () => {
    switch (resource) {
    case "technical-visits":
      return db
        .select()
        .from(schema.technicalVisit)
        .where(
          and(
            eq(schema.technicalVisit.companyId, companyId),
            parsed.data.visitType ? eq(schema.technicalVisit.visitType, parsed.data.visitType) : undefined,
            q
              ? or(
                  ilike(schema.technicalVisit.code, q),
                  ilike(schema.technicalVisit.visitType, q),
                  ilike(schema.technicalVisit.status, q),
                  ilike(schema.technicalVisit.summary, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.technicalVisit.visitDate), desc(schema.technicalVisit.createdAt))
        .limit(limit);

    case "technical-visit-checklists":
      return db
        .select()
        .from(schema.technicalVisitChecklist)
        .where(
          and(
            eq(schema.technicalVisitChecklist.companyId, companyId),
            parsed.data.visitId ? eq(schema.technicalVisitChecklist.visitId, parsed.data.visitId) : undefined,
            q
              ? or(
                  ilike(schema.technicalVisitChecklist.code, q),
                  ilike(schema.technicalVisitChecklist.category, q),
                  ilike(schema.technicalVisitChecklist.item, q)
                )
              : undefined
          )
        )
        .orderBy(schema.technicalVisitChecklist.sortOrder, desc(schema.technicalVisitChecklist.createdAt))
        .limit(limit);

    case "technical-visit-media":
      return db
        .select()
        .from(schema.technicalVisitMedia)
        .where(
          and(
            eq(schema.technicalVisitMedia.companyId, companyId),
            parsed.data.visitId ? eq(schema.technicalVisitMedia.visitId, parsed.data.visitId) : undefined,
            q
              ? or(
                  ilike(schema.technicalVisitMedia.code, q),
                  ilike(schema.technicalVisitMedia.fileUrl, q),
                  ilike(schema.technicalVisitMedia.caption, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.technicalVisitMedia.createdAt))
        .limit(limit);

    case "technical-visit-actions":
      return db
        .select()
        .from(schema.technicalVisitAction)
        .where(
          and(
            eq(schema.technicalVisitAction.companyId, companyId),
            parsed.data.visitId ? eq(schema.technicalVisitAction.visitId, parsed.data.visitId) : undefined,
            q
              ? or(
                  ilike(schema.technicalVisitAction.code, q),
                  ilike(schema.technicalVisitAction.action, q),
                  ilike(schema.technicalVisitAction.status, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.technicalVisitAction.createdAt))
        .limit(limit);

      default:
        throw new TechnicalVisitError(
          404,
          "RESOURCE_NOT_FOUND",
          "Technical visit resource not found."
        );
    }
  });
}

export async function createTechnicalVisitRecord(
  resourceInput: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);
  try {
    switch (resource) {
    case "technical-visits": {
      const parsed = createTechnicalVisitSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TechnicalVisitError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureUserInCompany(companyId, parsed.data.visitedByUserId);
      const [created] = await db
        .insert(schema.technicalVisit)
        .values({
          ...parsed.data,
          companyId,
          visitDate: toDate(parsed.data.visitDate)!,
          nextVisitDate: toDate(parsed.data.nextVisitDate),
        } as any)
        .returning();
      return created;
    }

    case "technical-visit-checklists": {
      const parsed = createTechnicalVisitChecklistSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TechnicalVisitError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureVisit(companyId, parsed.data.visitId);
      const [created] = await db
        .insert(schema.technicalVisitChecklist)
        .values({ ...parsed.data, companyId } as any)
        .returning();
      return created;
    }

    case "technical-visit-media": {
      const parsed = createTechnicalVisitMediaSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TechnicalVisitError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureVisit(companyId, parsed.data.visitId);
      const [created] = await db
        .insert(schema.technicalVisitMedia)
        .values({ ...parsed.data, companyId } as any)
        .returning();
      return created;
    }

    case "technical-visit-actions": {
      const parsed = createTechnicalVisitActionSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TechnicalVisitError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureVisit(companyId, parsed.data.visitId);
      if (parsed.data.assignedToUserId) {
        await ensureUserInCompany(companyId, parsed.data.assignedToUserId);
      }
      const [created] = await db
        .insert(schema.technicalVisitAction)
        .values({
          ...parsed.data,
          companyId,
          dueDate: toDate(parsed.data.dueDate),
        } as any)
        .returning();
      return created;
    }

      default:
        throw new TechnicalVisitError(
          404,
          "RESOURCE_NOT_FOUND",
          "Technical visit resource not found."
        );
    }
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("technical-visit", companyId),
    ]);
  }
}

export async function updateTechnicalVisitRecord(
  resourceInput: string,
  id: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);
  try {
    switch (resource) {
    case "technical-visits": {
      const parsed = updateTechnicalVisitSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TechnicalVisitError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.visitedByUserId) {
        await ensureUserInCompany(companyId, parsed.data.visitedByUserId);
      }
      const [updated] = await db
        .update(schema.technicalVisit)
        .set({
          ...parsed.data,
          visitDate: parsed.data.visitDate ? toDate(parsed.data.visitDate) : undefined,
          nextVisitDate:
            parsed.data.nextVisitDate !== undefined ? toDate(parsed.data.nextVisitDate) : undefined,
          updatedAt: new Date(),
        } as any)
        .where(and(eq(schema.technicalVisit.id, id), eq(schema.technicalVisit.companyId, companyId)))
        .returning();
      if (!updated) {
        throw new TechnicalVisitError(404, "NOT_FOUND", "Technical visit not found.");
      }
      return updated;
    }

    case "technical-visit-checklists": {
      const parsed = updateTechnicalVisitChecklistSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TechnicalVisitError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.visitId) await ensureVisit(companyId, parsed.data.visitId);

      const [updated] = await db
        .update(schema.technicalVisitChecklist)
        .set({ ...parsed.data, updatedAt: new Date() } as any)
        .where(
          and(
            eq(schema.technicalVisitChecklist.id, id),
            eq(schema.technicalVisitChecklist.companyId, companyId)
          )
        )
        .returning();
      if (!updated) {
        throw new TechnicalVisitError(404, "NOT_FOUND", "Technical visit checklist not found.");
      }
      return updated;
    }

    case "technical-visit-media": {
      const parsed = updateTechnicalVisitMediaSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TechnicalVisitError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.visitId) await ensureVisit(companyId, parsed.data.visitId);

      const [updated] = await db
        .update(schema.technicalVisitMedia)
        .set({ ...parsed.data, updatedAt: new Date() } as any)
        .where(
          and(
            eq(schema.technicalVisitMedia.id, id),
            eq(schema.technicalVisitMedia.companyId, companyId)
          )
        )
        .returning();
      if (!updated) {
        throw new TechnicalVisitError(404, "NOT_FOUND", "Technical visit media not found.");
      }
      return updated;
    }

    case "technical-visit-actions": {
      const parsed = updateTechnicalVisitActionSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TechnicalVisitError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.visitId) await ensureVisit(companyId, parsed.data.visitId);
      if (parsed.data.assignedToUserId) {
        await ensureUserInCompany(companyId, parsed.data.assignedToUserId);
      }

      const [updated] = await db
        .update(schema.technicalVisitAction)
        .set({
          ...parsed.data,
          dueDate: parsed.data.dueDate !== undefined ? toDate(parsed.data.dueDate) : undefined,
          updatedAt: new Date(),
        } as any)
        .where(
          and(
            eq(schema.technicalVisitAction.id, id),
            eq(schema.technicalVisitAction.companyId, companyId)
          )
        )
        .returning();
      if (!updated) {
        throw new TechnicalVisitError(404, "NOT_FOUND", "Technical visit action not found.");
      }
      return updated;
    }

      default:
        throw new TechnicalVisitError(
          404,
          "RESOURCE_NOT_FOUND",
          "Technical visit resource not found."
        );
    }
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("technical-visit", companyId),
    ]);
  }
}

export async function deleteTechnicalVisitRecord(
  resourceInput: string,
  id: string,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);
  try {
    switch (resource) {
    case "technical-visits": {
      const [deleted] = await db
        .delete(schema.technicalVisit)
        .where(and(eq(schema.technicalVisit.id, id), eq(schema.technicalVisit.companyId, companyId)))
        .returning({ id: schema.technicalVisit.id });
      if (!deleted) {
        throw new TechnicalVisitError(404, "NOT_FOUND", "Technical visit not found.");
      }
      return;
    }
    case "technical-visit-checklists": {
      const [deleted] = await db
        .delete(schema.technicalVisitChecklist)
        .where(
          and(
            eq(schema.technicalVisitChecklist.id, id),
            eq(schema.technicalVisitChecklist.companyId, companyId)
          )
        )
        .returning({ id: schema.technicalVisitChecklist.id });
      if (!deleted) {
        throw new TechnicalVisitError(404, "NOT_FOUND", "Technical visit checklist not found.");
      }
      return;
    }
    case "technical-visit-media": {
      const [deleted] = await db
        .delete(schema.technicalVisitMedia)
        .where(
          and(eq(schema.technicalVisitMedia.id, id), eq(schema.technicalVisitMedia.companyId, companyId))
        )
        .returning({ id: schema.technicalVisitMedia.id });
      if (!deleted) {
        throw new TechnicalVisitError(404, "NOT_FOUND", "Technical visit media not found.");
      }
      return;
    }
    case "technical-visit-actions": {
      const [deleted] = await db
        .delete(schema.technicalVisitAction)
        .where(
          and(
            eq(schema.technicalVisitAction.id, id),
            eq(schema.technicalVisitAction.companyId, companyId)
          )
        )
        .returning({ id: schema.technicalVisitAction.id });
      if (!deleted) {
        throw new TechnicalVisitError(404, "NOT_FOUND", "Technical visit action not found.");
      }
      return;
    }
      default:
        throw new TechnicalVisitError(
          404,
          "RESOURCE_NOT_FOUND",
          "Technical visit resource not found."
        );
    }
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("technical-visit", companyId),
    ]);
  }
}

export function toTechnicalVisitErrorResponse(error: unknown) {
  if (error instanceof TechnicalVisitError) {
    return {
      status: error.status,
      body: { code: error.code, message: error.message },
    };
  }

  if (error instanceof Error) {
    const text = error.message.toLowerCase();
    if (text.includes("duplicate key")) {
      return {
        status: 409,
        body: {
          code: "DUPLICATE_RECORD",
          message: "Record already exists for given unique fields.",
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
