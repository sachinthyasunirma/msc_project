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

function validateRuleConsistency(rule: {
  requireHotel?: boolean;
  requireTransport?: boolean;
  allowWithoutHotel?: boolean;
  allowWithoutTransport?: boolean;
  minDays?: number | null;
  maxDays?: number | null;
  minNights?: number | null;
  maxNights?: number | null;
  restrictHotelStarMin?: number | null;
  restrictHotelStarMax?: number | null;
}) {
  if (rule.requireHotel && rule.allowWithoutHotel) {
    throw new TourCategoryError(
      400,
      "VALIDATION_ERROR",
      "allowWithoutHotel cannot be true when requireHotel is enabled."
    );
  }

  if (rule.requireTransport && rule.allowWithoutTransport) {
    throw new TourCategoryError(
      400,
      "VALIDATION_ERROR",
      "allowWithoutTransport cannot be true when requireTransport is enabled."
    );
  }

  if (
    rule.restrictHotelStarMin !== null &&
    rule.restrictHotelStarMin !== undefined &&
    rule.restrictHotelStarMax !== null &&
    rule.restrictHotelStarMax !== undefined &&
    rule.restrictHotelStarMin > rule.restrictHotelStarMax
  ) {
    throw new TourCategoryError(
      400,
      "VALIDATION_ERROR",
      "Hotel Star Min cannot be greater than Hotel Star Max."
    );
  }

  if (
    rule.minNights !== null &&
    rule.minNights !== undefined &&
    rule.maxNights !== null &&
    rule.maxNights !== undefined &&
    rule.minNights > rule.maxNights
  ) {
    throw new TourCategoryError(
      400,
      "VALIDATION_ERROR",
      "Min Nights cannot be greater than Max Nights."
    );
  }

  if (
    rule.minDays !== null &&
    rule.minDays !== undefined &&
    rule.maxDays !== null &&
    rule.maxDays !== undefined &&
    rule.minDays > rule.maxDays
  ) {
    throw new TourCategoryError(
      400,
      "VALIDATION_ERROR",
      "Min Days cannot be greater than Max Days."
    );
  }
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
  const cacheKey = masterDataListCacheKey("tour-category", companyId, resource, parsed.data);
  return getOrSetMasterDataCache(cacheKey, async () => {
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
  });
}

export async function createTourCategoryRecord(
  resourceInput: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);
  try {
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
      if (parsed.data.parentId) {
        const parent = await ensureCategory(companyId, parsed.data.parentId);
        if (parent.typeId !== parsed.data.typeId) {
          throw new TourCategoryError(
            400,
            "INVALID_PARENT_CATEGORY",
            "Parent category must belong to the same category type."
          );
        }
      }
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
      validateRuleConsistency(parsed.data);
      const [created] = await db
        .insert(schema.tourCategoryRule)
        .values({
          ...parsed.data,
          companyId,
          defaultMarkupPercent: toDecimal(parsed.data.defaultMarkupPercent),
        })
        .returning();
      return created;
    }
      default:
        throw new TourCategoryError(404, "RESOURCE_NOT_FOUND", "Tour category resource not found.");
    }
  } finally {
    await invalidateMasterDataCacheByPrefixes([masterDataCachePrefix("tour-category", companyId)]);
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
  try {
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
      const [current] = await db
        .select({
          id: schema.tourCategory.id,
          typeId: schema.tourCategory.typeId,
          parentId: schema.tourCategory.parentId,
        })
        .from(schema.tourCategory)
        .where(and(eq(schema.tourCategory.id, id), eq(schema.tourCategory.companyId, companyId)))
        .limit(1);
      if (!current) {
        throw new TourCategoryError(404, "RECORD_NOT_FOUND", "Tour category not found.");
      }

      const nextTypeId = parsed.data.typeId ?? current.typeId;
      const nextParentId =
        parsed.data.parentId === undefined ? current.parentId : parsed.data.parentId;

      if (parsed.data.typeId) await ensureType(companyId, parsed.data.typeId);
      if (nextParentId) {
        if (String(nextParentId) === id) {
          throw new TourCategoryError(
            400,
            "INVALID_PARENT_CATEGORY",
            "Category cannot be its own parent."
          );
        }
        const parent = await ensureCategory(companyId, String(nextParentId));
        if (parent.typeId !== nextTypeId) {
          throw new TourCategoryError(
            400,
            "INVALID_PARENT_CATEGORY",
            "Parent category must belong to the same category type."
          );
        }
      }

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
      const [current] = await db
        .select({
          categoryId: schema.tourCategoryRule.categoryId,
          requireHotel: schema.tourCategoryRule.requireHotel,
          requireTransport: schema.tourCategoryRule.requireTransport,
          allowWithoutHotel: schema.tourCategoryRule.allowWithoutHotel,
          allowWithoutTransport: schema.tourCategoryRule.allowWithoutTransport,
          minDays: schema.tourCategoryRule.minDays,
          maxDays: schema.tourCategoryRule.maxDays,
          minNights: schema.tourCategoryRule.minNights,
          maxNights: schema.tourCategoryRule.maxNights,
          restrictHotelStarMin: schema.tourCategoryRule.restrictHotelStarMin,
          restrictHotelStarMax: schema.tourCategoryRule.restrictHotelStarMax,
        })
        .from(schema.tourCategoryRule)
        .where(and(eq(schema.tourCategoryRule.id, id), eq(schema.tourCategoryRule.companyId, companyId)))
        .limit(1);
      if (!current) {
        throw new TourCategoryError(404, "RECORD_NOT_FOUND", "Tour category rule not found.");
      }

      if (parsed.data.categoryId) await ensureCategory(companyId, parsed.data.categoryId);
      validateRuleConsistency({
        requireHotel: parsed.data.requireHotel ?? current.requireHotel,
        requireTransport: parsed.data.requireTransport ?? current.requireTransport,
        allowWithoutHotel: parsed.data.allowWithoutHotel ?? current.allowWithoutHotel,
        allowWithoutTransport: parsed.data.allowWithoutTransport ?? current.allowWithoutTransport,
        minDays: parsed.data.minDays ?? current.minDays,
        maxDays: parsed.data.maxDays ?? current.maxDays,
        minNights: parsed.data.minNights ?? current.minNights,
        maxNights: parsed.data.maxNights ?? current.maxNights,
        restrictHotelStarMin: parsed.data.restrictHotelStarMin ?? current.restrictHotelStarMin,
        restrictHotelStarMax: parsed.data.restrictHotelStarMax ?? current.restrictHotelStarMax,
      });
      const [updated] = await db
        .update(schema.tourCategoryRule)
        .set({
          ...parsed.data,
          defaultMarkupPercent:
            parsed.data.defaultMarkupPercent !== undefined
              ? toDecimal(parsed.data.defaultMarkupPercent)
              : undefined,
          updatedAt: new Date(),
        })
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
  } finally {
    await invalidateMasterDataCacheByPrefixes([masterDataCachePrefix("tour-category", companyId)]);
  }
}

export async function deleteTourCategoryRecord(
  resourceInput: string,
  id: string,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);
  try {
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
  } finally {
    await invalidateMasterDataCacheByPrefixes([masterDataCachePrefix("tour-category", companyId)]);
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
