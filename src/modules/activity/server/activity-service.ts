import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import {
  activityListQuerySchema,
  activityResourceSchema,
  createActivityAvailabilitySchema,
  createActivityImageSchema,
  createActivityRateSchema,
  createActivitySchema,
  createActivitySupplementSchema,
  updateActivityAvailabilitySchema,
  updateActivityImageSchema,
  updateActivityRateSchema,
  updateActivitySchema,
  updateActivitySupplementSchema,
} from "@/modules/activity/shared/activity-schemas";

class ActivityError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

type ActivityResource = z.infer<typeof activityResourceSchema>;

function normalizeZodError(error: z.ZodError) {
  return error.issues[0]?.message || "Validation failed.";
}

function toDecimal(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return numeric.toFixed(2);
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value);
}

async function getAccess(headers: Headers) {
  try {
    return await resolveAccess(headers, {
      requiredPrivilege: "SCREEN_MASTER_ACTIVITIES",
    });
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new ActivityError(error.status, error.code, error.message);
    }
    throw error;
  }
}

async function ensureWritable(headers: Headers) {
  const access = await getAccess(headers);
  if (access.readOnly) {
    throw new ActivityError(
      403,
      "READ_ONLY_MODE",
      "You are in read-only mode. Contact a manager for edit access."
    );
  }
  const elevated = access.role === "ADMIN" || access.role === "MANAGER";
  if (!elevated && !access.canWriteMasterData) {
    throw new ActivityError(
      403,
      "PERMISSION_DENIED",
      "You do not have write access for Master Data."
    );
  }
  return access;
}

function parseResource(input: string): ActivityResource {
  const parsed = activityResourceSchema.safeParse(input);
  if (!parsed.success) {
    throw new ActivityError(404, "RESOURCE_NOT_FOUND", "Activity resource not found.");
  }
  return parsed.data;
}

async function ensureActivity(companyId: string, activityId: string) {
  const [record] = await db
    .select({ id: schema.activity.id })
    .from(schema.activity)
    .where(and(eq(schema.activity.id, activityId), eq(schema.activity.companyId, companyId)))
    .limit(1);
  if (!record) {
    throw new ActivityError(400, "ACTIVITY_NOT_FOUND", "Activity not found.");
  }
}

async function ensureTransportLocation(companyId: string, locationId: string) {
  const [record] = await db
    .select({ id: schema.transportLocation.id })
    .from(schema.transportLocation)
    .where(
      and(
        eq(schema.transportLocation.id, locationId),
        eq(schema.transportLocation.companyId, companyId)
      )
    )
    .limit(1);
  if (!record) {
    throw new ActivityError(400, "LOCATION_NOT_FOUND", "Transport location not found.");
  }
}

export async function listActivityRecords(
  resourceInput: string,
  searchParams: URLSearchParams,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const parsed = activityListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new ActivityError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }
  const { companyId } = await getAccess(headers);
  const q = parsed.data.q ? `%${parsed.data.q}%` : null;
  const limit = parsed.data.limit;
  const activityId = parsed.data.activityId;
  const parentActivityId = parsed.data.parentActivityId;

  switch (resource) {
    case "activities": {
      const clauses = [eq(schema.activity.companyId, companyId)];
      if (q) {
        const searchClause = or(ilike(schema.activity.code, q), ilike(schema.activity.name, q));
        if (searchClause) clauses.push(searchClause);
      }
      return db
        .select()
        .from(schema.activity)
        .where(and(...clauses))
        .orderBy(desc(schema.activity.createdAt))
        .limit(limit);
    }
    case "activity-images": {
      const clauses = [eq(schema.activityImage.companyId, companyId)];
      if (activityId) {
        clauses.push(eq(schema.activityImage.activityId, activityId));
      }
      if (q) {
        const searchClause = or(
          ilike(schema.activityImage.code, q),
          ilike(schema.activityImage.url, q),
          ilike(schema.activityImage.altText, q)
        );
        if (searchClause) clauses.push(searchClause);
      }
      return db
        .select()
        .from(schema.activityImage)
        .where(and(...clauses))
        .orderBy(desc(schema.activityImage.createdAt))
        .limit(limit);
    }
    case "activity-availability": {
      const clauses = [eq(schema.activityAvailability.companyId, companyId)];
      if (activityId) {
        clauses.push(eq(schema.activityAvailability.activityId, activityId));
      }
      if (q) {
        const searchClause = or(
          ilike(schema.activityAvailability.code, q),
          ilike(schema.activityAvailability.startTime, q),
          ilike(schema.activityAvailability.endTime, q)
        );
        if (searchClause) clauses.push(searchClause);
      }
      return db
        .select()
        .from(schema.activityAvailability)
        .where(and(...clauses))
        .orderBy(desc(schema.activityAvailability.createdAt))
        .limit(limit);
    }
    case "activity-rates": {
      const clauses = [eq(schema.activityRate.companyId, companyId)];
      if (activityId) {
        clauses.push(eq(schema.activityRate.activityId, activityId));
      }
      if (q) {
        const searchClause = or(
          ilike(schema.activityRate.code, q),
          ilike(schema.activityRate.label, q),
          ilike(schema.activityRate.pricingModel, q)
        );
        if (searchClause) clauses.push(searchClause);
      }
      return db
        .select()
        .from(schema.activityRate)
        .where(and(...clauses))
        .orderBy(desc(schema.activityRate.createdAt))
        .limit(limit);
    }
    case "activity-supplements": {
      const clauses = [eq(schema.activitySupplement.companyId, companyId)];
      if (parentActivityId) {
        clauses.push(eq(schema.activitySupplement.parentActivityId, parentActivityId));
      }
      return db
        .select()
        .from(schema.activitySupplement)
        .where(and(...clauses))
        .orderBy(desc(schema.activitySupplement.createdAt))
        .limit(limit);
    }
    default:
      throw new ActivityError(404, "RESOURCE_NOT_FOUND", "Activity resource not found.");
  }
}

export async function createActivityRecord(
  resourceInput: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "activities": {
      const parsed = createActivitySchema.safeParse(payload);
      if (!parsed.success) {
        throw new ActivityError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureTransportLocation(companyId, parsed.data.locationId);
      const [created] = await db
        .insert(schema.activity)
        .values({ ...parsed.data, companyId })
        .returning();
      return created;
    }
    case "activity-images": {
      const parsed = createActivityImageSchema.safeParse(payload);
      if (!parsed.success) {
        throw new ActivityError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureActivity(companyId, parsed.data.activityId);
      if (parsed.data.isCover) {
        await db
          .update(schema.activityImage)
          .set({ isCover: false })
          .where(eq(schema.activityImage.activityId, parsed.data.activityId));
      }
      const [created] = await db
        .insert(schema.activityImage)
        .values({ ...parsed.data, companyId })
        .returning();
      return created;
    }
    case "activity-availability": {
      const parsed = createActivityAvailabilitySchema.safeParse(payload);
      if (!parsed.success) {
        throw new ActivityError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureActivity(companyId, parsed.data.activityId);
      const [created] = await db
        .insert(schema.activityAvailability)
        .values({
          ...parsed.data,
          companyId,
          effectiveFrom: toDate(parsed.data.effectiveFrom),
          effectiveTo: toDate(parsed.data.effectiveTo),
        })
        .returning();
      return created;
    }
    case "activity-rates": {
      const parsed = createActivityRateSchema.safeParse(payload);
      if (!parsed.success) {
        throw new ActivityError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureActivity(companyId, parsed.data.activityId);
      const [created] = await db
        .insert(schema.activityRate)
        .values({
          ...parsed.data,
          companyId,
          fixedRate: toDecimal(parsed.data.fixedRate),
          perPaxRate: toDecimal(parsed.data.perPaxRate),
          perHourRate: toDecimal(parsed.data.perHourRate),
          perUnitRate: toDecimal(parsed.data.perUnitRate),
          minCharge: toDecimal(parsed.data.minCharge) ?? "0.00",
          effectiveFrom: toDate(parsed.data.effectiveFrom),
          effectiveTo: toDate(parsed.data.effectiveTo),
        })
        .returning();
      return created;
    }
    case "activity-supplements": {
      const parsed = createActivitySupplementSchema.safeParse(payload);
      if (!parsed.success) {
        throw new ActivityError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.parentActivityId === parsed.data.supplementActivityId) {
        throw new ActivityError(
          400,
          "INVALID_SUPPLEMENT",
          "Parent and supplement activity cannot be the same."
        );
      }
      await ensureActivity(companyId, parsed.data.parentActivityId);
      await ensureActivity(companyId, parsed.data.supplementActivityId);
      const [created] = await db
        .insert(schema.activitySupplement)
        .values({ ...parsed.data, companyId })
        .returning();
      return created;
    }
    default:
      throw new ActivityError(404, "RESOURCE_NOT_FOUND", "Activity resource not found.");
  }
}

export async function updateActivityRecord(
  resourceInput: string,
  id: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "activities": {
      const parsed = updateActivitySchema.safeParse(payload);
      if (!parsed.success) {
        throw new ActivityError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.locationId) await ensureTransportLocation(companyId, parsed.data.locationId);
      const [updated] = await db
        .update(schema.activity)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(schema.activity.id, id), eq(schema.activity.companyId, companyId)))
        .returning();
      if (!updated) throw new ActivityError(404, "RECORD_NOT_FOUND", "Activity not found.");
      return updated;
    }
    case "activity-images": {
      const parsed = updateActivityImageSchema.safeParse(payload);
      if (!parsed.success) {
        throw new ActivityError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      const [current] = await db
        .select({ activityId: schema.activityImage.activityId })
        .from(schema.activityImage)
        .where(and(eq(schema.activityImage.id, id), eq(schema.activityImage.companyId, companyId)))
        .limit(1);
      if (!current) throw new ActivityError(404, "RECORD_NOT_FOUND", "Activity image not found.");
      const nextActivityId = parsed.data.activityId ?? current.activityId;
      if (parsed.data.activityId) await ensureActivity(companyId, parsed.data.activityId);
      if (parsed.data.isCover) {
        await db
          .update(schema.activityImage)
          .set({ isCover: false })
          .where(eq(schema.activityImage.activityId, nextActivityId));
      }
      const [updated] = await db
        .update(schema.activityImage)
        .set(parsed.data)
        .where(and(eq(schema.activityImage.id, id), eq(schema.activityImage.companyId, companyId)))
        .returning();
      if (!updated) throw new ActivityError(404, "RECORD_NOT_FOUND", "Activity image not found.");
      return updated;
    }
    case "activity-availability": {
      const parsed = updateActivityAvailabilitySchema.safeParse(payload);
      if (!parsed.success) {
        throw new ActivityError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.activityId) await ensureActivity(companyId, parsed.data.activityId);
      const [updated] = await db
        .update(schema.activityAvailability)
        .set({
          ...parsed.data,
          effectiveFrom:
            parsed.data.effectiveFrom !== undefined ? toDate(parsed.data.effectiveFrom) : undefined,
          effectiveTo:
            parsed.data.effectiveTo !== undefined ? toDate(parsed.data.effectiveTo) : undefined,
        })
        .where(
          and(
            eq(schema.activityAvailability.id, id),
            eq(schema.activityAvailability.companyId, companyId)
          )
        )
        .returning();
      if (!updated) throw new ActivityError(404, "RECORD_NOT_FOUND", "Availability not found.");
      return updated;
    }
    case "activity-rates": {
      const parsed = updateActivityRateSchema.safeParse(payload);
      if (!parsed.success) {
        throw new ActivityError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.activityId) await ensureActivity(companyId, parsed.data.activityId);
      const [updated] = await db
        .update(schema.activityRate)
        .set({
          ...parsed.data,
          fixedRate:
            parsed.data.fixedRate !== undefined ? toDecimal(parsed.data.fixedRate) : undefined,
          perPaxRate:
            parsed.data.perPaxRate !== undefined ? toDecimal(parsed.data.perPaxRate) : undefined,
          perHourRate:
            parsed.data.perHourRate !== undefined ? toDecimal(parsed.data.perHourRate) : undefined,
          perUnitRate:
            parsed.data.perUnitRate !== undefined ? toDecimal(parsed.data.perUnitRate) : undefined,
          minCharge:
            parsed.data.minCharge !== undefined
              ? toDecimal(parsed.data.minCharge) ?? undefined
              : undefined,
          effectiveFrom:
            parsed.data.effectiveFrom !== undefined ? toDate(parsed.data.effectiveFrom) : undefined,
          effectiveTo:
            parsed.data.effectiveTo !== undefined ? toDate(parsed.data.effectiveTo) : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.activityRate.id, id), eq(schema.activityRate.companyId, companyId)))
        .returning();
      if (!updated) throw new ActivityError(404, "RECORD_NOT_FOUND", "Activity rate not found.");
      return updated;
    }
    case "activity-supplements": {
      const parsed = updateActivitySupplementSchema.safeParse(payload);
      if (!parsed.success) {
        throw new ActivityError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.parentActivityId) await ensureActivity(companyId, parsed.data.parentActivityId);
      if (parsed.data.supplementActivityId) {
        await ensureActivity(companyId, parsed.data.supplementActivityId);
      }
      if (
        parsed.data.parentActivityId &&
        parsed.data.supplementActivityId &&
        parsed.data.parentActivityId === parsed.data.supplementActivityId
      ) {
        throw new ActivityError(
          400,
          "INVALID_SUPPLEMENT",
          "Parent and supplement activity cannot be the same."
        );
      }
      const [updated] = await db
        .update(schema.activitySupplement)
        .set(parsed.data)
        .where(
          and(eq(schema.activitySupplement.id, id), eq(schema.activitySupplement.companyId, companyId))
        )
        .returning();
      if (!updated) throw new ActivityError(404, "RECORD_NOT_FOUND", "Activity supplement not found.");
      return updated;
    }
    default:
      throw new ActivityError(404, "RESOURCE_NOT_FOUND", "Activity resource not found.");
  }
}

export async function deleteActivityRecord(
  resourceInput: string,
  id: string,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "activities": {
      const [deleted] = await db
        .delete(schema.activity)
        .where(and(eq(schema.activity.id, id), eq(schema.activity.companyId, companyId)))
        .returning({ id: schema.activity.id });
      if (!deleted) throw new ActivityError(404, "RECORD_NOT_FOUND", "Activity not found.");
      return;
    }
    case "activity-images": {
      const [deleted] = await db
        .delete(schema.activityImage)
        .where(and(eq(schema.activityImage.id, id), eq(schema.activityImage.companyId, companyId)))
        .returning({ id: schema.activityImage.id });
      if (!deleted) throw new ActivityError(404, "RECORD_NOT_FOUND", "Activity image not found.");
      return;
    }
    case "activity-availability": {
      const [deleted] = await db
        .delete(schema.activityAvailability)
        .where(
          and(
            eq(schema.activityAvailability.id, id),
            eq(schema.activityAvailability.companyId, companyId)
          )
        )
        .returning({ id: schema.activityAvailability.id });
      if (!deleted) throw new ActivityError(404, "RECORD_NOT_FOUND", "Availability not found.");
      return;
    }
    case "activity-rates": {
      const [deleted] = await db
        .delete(schema.activityRate)
        .where(and(eq(schema.activityRate.id, id), eq(schema.activityRate.companyId, companyId)))
        .returning({ id: schema.activityRate.id });
      if (!deleted) throw new ActivityError(404, "RECORD_NOT_FOUND", "Activity rate not found.");
      return;
    }
    case "activity-supplements": {
      const [deleted] = await db
        .delete(schema.activitySupplement)
        .where(
          and(eq(schema.activitySupplement.id, id), eq(schema.activitySupplement.companyId, companyId))
        )
        .returning({ id: schema.activitySupplement.id });
      if (!deleted) throw new ActivityError(404, "RECORD_NOT_FOUND", "Supplement not found.");
      return;
    }
    default:
      throw new ActivityError(404, "RESOURCE_NOT_FOUND", "Activity resource not found.");
  }
}

export function toActivityErrorResponse(error: unknown) {
  if (error instanceof ActivityError) {
    return { status: error.status, body: { code: error.code, message: error.message } };
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      (message.includes("relation") && message.includes("does not exist")) ||
      (message.includes("column") && message.includes("does not exist"))
    ) {
      return {
        status: 500,
        body: {
          code: "DB_SCHEMA_MISMATCH",
          message:
            "Database schema is not up to date. Please run the latest Drizzle migration/db push.",
        },
      };
    }
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
