import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import {
  createTourCategoryRuleSchema,
  createTourCategorySchema,
  createTourCategoryTypeSchema,
  tourCategoryListQuerySchema,
  tourCategoryResourceSchema,
  updateTourCategoryRuleSchema,
  updateTourCategorySchema,
  updateTourCategoryTypeSchema,
} from "@/modules/tour-category/shared/tour-category-schemas";

class TourCategoryError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

type TourCategoryResource = z.infer<typeof tourCategoryResourceSchema>;

function normalizeZodError(error: z.ZodError) {
  return error.issues[0]?.message || "Validation failed.";
}

function toDecimal(value: number | string | null | undefined, scale = 2) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return numeric.toFixed(scale);
}

async function getAccess(headers: Headers) {
  try {
    return await resolveAccess(headers, {
      requiredPrivilege: "SCREEN_MASTER_TOUR_CATEGORIES",
    });
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new TourCategoryError(error.status, error.code, error.message);
    }
    throw error;
  }
}

async function ensureWritable(headers: Headers) {
  const access = await getAccess(headers);
  if (access.readOnly) {
    throw new TourCategoryError(
      403,
      "READ_ONLY_MODE",
      "You are in read-only mode. Contact a manager for edit access."
    );
  }
  const elevated = access.role === "ADMIN" || access.role === "MANAGER";
  if (!elevated && !access.canWriteMasterData) {
    throw new TourCategoryError(
      403,
      "PERMISSION_DENIED",
      "You do not have write access for Master Data."
    );
  }
  return access;
}

function parseResource(input: string): TourCategoryResource {
  const parsed = tourCategoryResourceSchema.safeParse(input);
  if (!parsed.success) {
    throw new TourCategoryError(404, "RESOURCE_NOT_FOUND", "Tour category resource not found.");
  }
  return parsed.data;
}

async function ensureType(companyId: string, typeId: string) {
  const [record] = await db
    .select({ id: schema.tourCategoryType.id })
    .from(schema.tourCategoryType)
    .where(
      and(
        eq(schema.tourCategoryType.id, typeId),
        eq(schema.tourCategoryType.companyId, companyId)
      )
    )
    .limit(1);
  if (!record) {
    throw new TourCategoryError(
      400,
      "TOUR_CATEGORY_TYPE_NOT_FOUND",
      "Tour category type not found in this company."
    );
  }
}

async function ensureCategory(companyId: string, categoryId: string) {
  const [record] = await db
    .select({
      id: schema.tourCategory.id,
      typeId: schema.tourCategory.typeId,
    })
    .from(schema.tourCategory)
    .where(
      and(
        eq(schema.tourCategory.id, categoryId),
        eq(schema.tourCategory.companyId, companyId)
      )
    )
    .limit(1);
  if (!record) {
    throw new TourCategoryError(
      400,
      "TOUR_CATEGORY_NOT_FOUND",
      "Tour category not found in this company."
    );
  }
  return record;
}

export async function listTourCategoryRecords(
  resourceInput: string,
  searchParams: URLSearchParams,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const parsed = tourCategoryListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new TourCategoryError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }
  const { companyId } = await getAccess(headers);
  const q = parsed.data.q ? `%${parsed.data.q}%` : null;
  const limit = parsed.data.limit;

  switch (resource) {
    case "tour-category-types":
      return db
        .select()
        .from(schema.tourCategoryType)
        .where(
          and(
            eq(schema.tourCategoryType.companyId, companyId),
            q
              ? or(
                  ilike(schema.tourCategoryType.code, q),
                  ilike(schema.tourCategoryType.name, q)
                )
              : undefined
          )
        )
        .orderBy(schema.tourCategoryType.sortOrder, desc(schema.tourCategoryType.createdAt))
        .limit(limit);

    case "tour-categories":
      return db
        .select()
        .from(schema.tourCategory)
        .where(
          and(
            eq(schema.tourCategory.companyId, companyId),
            parsed.data.typeId ? eq(schema.tourCategory.typeId, parsed.data.typeId) : undefined,
            q
              ? or(
                  ilike(schema.tourCategory.code, q),
                  ilike(schema.tourCategory.name, q)
                )
              : undefined
          )
        )
        .orderBy(schema.tourCategory.sortOrder, desc(schema.tourCategory.createdAt))
        .limit(limit);

    case "tour-category-rules":
      return db
        .select()
        .from(schema.tourCategoryRule)
        .where(
          and(
            eq(schema.tourCategoryRule.companyId, companyId),
            parsed.data.categoryId
              ? eq(schema.tourCategoryRule.categoryId, parsed.data.categoryId)
              : undefined,
            q ? ilike(schema.tourCategoryRule.code, q) : undefined
          )
        )
        .orderBy(desc(schema.tourCategoryRule.createdAt))
        .limit(limit);

    default:
      throw new TourCategoryError(404, "RESOURCE_NOT_FOUND", "Tour category resource not found.");
  }
}

export async function createTourCategoryRecord(
  resourceInput: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "tour-category-types": {
      const parsed = createTourCategoryTypeSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TourCategoryError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      const [created] = await db
        .insert(schema.tourCategoryType)
        .values({ ...parsed.data, companyId })
        .returning();
      return created;
    }
    case "tour-categories": {
      const parsed = createTourCategorySchema.safeParse(payload);
      if (!parsed.success) {
        throw new TourCategoryError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureType(companyId, parsed.data.typeId);
      if (parsed.data.parentId) await ensureCategory(companyId, parsed.data.parentId);
      const [created] = await db
        .insert(schema.tourCategory)
        .values({ ...parsed.data, companyId })
        .returning();
      return created;
    }
    case "tour-category-rules": {
      const parsed = createTourCategoryRuleSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TourCategoryError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureCategory(companyId, parsed.data.categoryId);
      const [created] = await db
        .insert(schema.tourCategoryRule)
        .values({
          ...parsed.data,
          companyId,
          defaultMarkupPercent: toDecimal(parsed.data.defaultMarkupPercent),
        } as any)
        .returning();
      return created;
    }
    default:
      throw new TourCategoryError(404, "RESOURCE_NOT_FOUND", "Tour category resource not found.");
  }
}

export async function updateTourCategoryRecord(
  resourceInput: string,
  id: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "tour-category-types": {
      const parsed = updateTourCategoryTypeSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TourCategoryError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      const [updated] = await db
        .update(schema.tourCategoryType)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(schema.tourCategoryType.id, id), eq(schema.tourCategoryType.companyId, companyId)))
        .returning();
      if (!updated) {
        throw new TourCategoryError(404, "RECORD_NOT_FOUND", "Tour category type not found.");
      }
      return updated;
    }
    case "tour-categories": {
      const parsed = updateTourCategorySchema.safeParse(payload);
      if (!parsed.success) {
        throw new TourCategoryError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.typeId) await ensureType(companyId, parsed.data.typeId);
      if (parsed.data.parentId) await ensureCategory(companyId, parsed.data.parentId);
      const [updated] = await db
        .update(schema.tourCategory)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(schema.tourCategory.id, id), eq(schema.tourCategory.companyId, companyId)))
        .returning();
      if (!updated) {
        throw new TourCategoryError(404, "RECORD_NOT_FOUND", "Tour category not found.");
      }
      return updated;
    }
    case "tour-category-rules": {
      const parsed = updateTourCategoryRuleSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TourCategoryError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.categoryId) await ensureCategory(companyId, parsed.data.categoryId);
      const [updated] = await db
        .update(schema.tourCategoryRule)
        .set({
          ...parsed.data,
          defaultMarkupPercent:
            parsed.data.defaultMarkupPercent !== undefined
              ? toDecimal(parsed.data.defaultMarkupPercent)
              : undefined,
          updatedAt: new Date(),
        } as any)
        .where(and(eq(schema.tourCategoryRule.id, id), eq(schema.tourCategoryRule.companyId, companyId)))
        .returning();
      if (!updated) {
        throw new TourCategoryError(404, "RECORD_NOT_FOUND", "Tour category rule not found.");
      }
      return updated;
    }
    default:
      throw new TourCategoryError(404, "RESOURCE_NOT_FOUND", "Tour category resource not found.");
  }
}

export async function deleteTourCategoryRecord(
  resourceInput: string,
  id: string,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "tour-category-types": {
      const [deleted] = await db
        .delete(schema.tourCategoryType)
        .where(and(eq(schema.tourCategoryType.id, id), eq(schema.tourCategoryType.companyId, companyId)))
        .returning({ id: schema.tourCategoryType.id });
      if (!deleted) {
        throw new TourCategoryError(404, "RECORD_NOT_FOUND", "Tour category type not found.");
      }
      return;
    }
    case "tour-categories": {
      const [deleted] = await db
        .delete(schema.tourCategory)
        .where(and(eq(schema.tourCategory.id, id), eq(schema.tourCategory.companyId, companyId)))
        .returning({ id: schema.tourCategory.id });
      if (!deleted) {
        throw new TourCategoryError(404, "RECORD_NOT_FOUND", "Tour category not found.");
      }
      return;
    }
    case "tour-category-rules": {
      const [deleted] = await db
        .delete(schema.tourCategoryRule)
        .where(and(eq(schema.tourCategoryRule.id, id), eq(schema.tourCategoryRule.companyId, companyId)))
        .returning({ id: schema.tourCategoryRule.id });
      if (!deleted) {
        throw new TourCategoryError(404, "RECORD_NOT_FOUND", "Tour category rule not found.");
      }
      return;
    }
    default:
      throw new TourCategoryError(404, "RESOURCE_NOT_FOUND", "Tour category resource not found.");
  }
}

export function toTourCategoryErrorResponse(error: unknown) {
  if (error instanceof TourCategoryError) {
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
