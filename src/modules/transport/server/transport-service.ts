import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  createTransportBaggageRateSchema,
  createTransportLocationExpenseSchema,
  createTransportLocationRateSchema,
  createTransportLocationSchema,
  createTransportPaxVehicleRateSchema,
  createTransportVehicleCategorySchema,
  createTransportVehicleTypeSchema,
  transportListQuerySchema,
  transportResourceSchema,
  updateTransportBaggageRateSchema,
  updateTransportLocationExpenseSchema,
  updateTransportLocationRateSchema,
  updateTransportLocationSchema,
  updateTransportPaxVehicleRateSchema,
  updateTransportVehicleCategorySchema,
  updateTransportVehicleTypeSchema,
} from "@/modules/transport/shared/transport-schemas";

class TransportError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

type TransportResource = z.infer<typeof transportResourceSchema>;

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
  const session = await auth.api.getSession({ headers });
  if (!session?.user) {
    throw new TransportError(401, "UNAUTHORIZED", "You are not authenticated.");
  }
  const user = session.user as {
    companyId?: string | null;
    role?: string | null;
    readOnly?: boolean;
    canWriteMasterData?: boolean;
  };
  if (!user.companyId) {
    throw new TransportError(403, "COMPANY_REQUIRED", "User is not linked to a company.");
  }
  return {
    companyId: user.companyId,
    role: user.role ?? "USER",
    readOnly: Boolean(user.readOnly),
    canWriteMasterData: Boolean(user.canWriteMasterData),
  };
}

async function ensureWritable(headers: Headers) {
  const access = await getAccess(headers);
  if (access.readOnly) {
    throw new TransportError(
      403,
      "READ_ONLY_MODE",
      "You are in read-only mode. Contact a manager for edit access."
    );
  }
  const elevated = access.role === "ADMIN" || access.role === "MANAGER";
  if (!elevated && !access.canWriteMasterData) {
    throw new TransportError(
      403,
      "PERMISSION_DENIED",
      "You do not have write access for Master Data."
    );
  }
  return access;
}

async function ensureLocationInCompany(companyId: string, id: string) {
  const [record] = await db
    .select({ id: schema.transportLocation.id })
    .from(schema.transportLocation)
    .where(
      and(
        eq(schema.transportLocation.id, id),
        eq(schema.transportLocation.companyId, companyId)
      )
    )
    .limit(1);
  if (!record) {
    throw new TransportError(400, "LOCATION_NOT_FOUND", "Location not found in this company.");
  }
}

async function ensureVehicleCategoryInCompany(companyId: string, id: string) {
  const [record] = await db
    .select({ id: schema.transportVehicleCategory.id })
    .from(schema.transportVehicleCategory)
    .where(
      and(
        eq(schema.transportVehicleCategory.id, id),
        eq(schema.transportVehicleCategory.companyId, companyId)
      )
    )
    .limit(1);
  if (!record) {
    throw new TransportError(
      400,
      "VEHICLE_CATEGORY_NOT_FOUND",
      "Vehicle category not found in this company."
    );
  }
}

async function ensureVehicleTypeInCompany(companyId: string, id: string) {
  const [record] = await db
    .select({ id: schema.transportVehicleType.id })
    .from(schema.transportVehicleType)
    .where(
      and(eq(schema.transportVehicleType.id, id), eq(schema.transportVehicleType.companyId, companyId))
    )
    .limit(1);
  if (!record) {
    throw new TransportError(
      400,
      "VEHICLE_TYPE_NOT_FOUND",
      "Vehicle type not found in this company."
    );
  }
}

function parseResource(input: string): TransportResource {
  const parsed = transportResourceSchema.safeParse(input);
  if (!parsed.success) {
    throw new TransportError(404, "RESOURCE_NOT_FOUND", "Transport resource not found.");
  }
  return parsed.data;
}

export async function listTransportRecords(
  resourceInput: string,
  searchParams: URLSearchParams,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const parsed = transportListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new TransportError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }
  const { companyId } = await getAccess(headers);
  const query = parsed.data;
  const term = query.q ? `%${query.q}%` : null;

  switch (resource) {
    case "locations":
      return db
        .select()
        .from(schema.transportLocation)
        .where(
          and(
            eq(schema.transportLocation.companyId, companyId),
            term
              ? or(
                  ilike(schema.transportLocation.code, term),
                  ilike(schema.transportLocation.name, term),
                  ilike(schema.transportLocation.country, term),
                  ilike(schema.transportLocation.region, term)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.transportLocation.createdAt))
        .limit(query.limit);
    case "vehicle-categories":
      return db
        .select()
        .from(schema.transportVehicleCategory)
        .where(
          and(
            eq(schema.transportVehicleCategory.companyId, companyId),
            term
              ? or(
                  ilike(schema.transportVehicleCategory.code, term),
                  ilike(schema.transportVehicleCategory.name, term)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.transportVehicleCategory.sortOrder), desc(schema.transportVehicleCategory.createdAt))
        .limit(query.limit);
    case "vehicle-types":
      return db
        .select()
        .from(schema.transportVehicleType)
        .where(
          and(
            eq(schema.transportVehicleType.companyId, companyId),
            term
              ? or(
                  ilike(schema.transportVehicleType.code, term),
                  ilike(schema.transportVehicleType.name, term)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.transportVehicleType.createdAt))
        .limit(query.limit);
    case "location-rates":
      return db
        .select()
        .from(schema.transportLocationRate)
        .where(
          and(
            eq(schema.transportLocationRate.companyId, companyId),
            term
              ? or(
                  ilike(schema.transportLocationRate.code, term),
                  ilike(schema.transportLocationRate.currency, term),
                  ilike(schema.transportLocationRate.pricingModel, term)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.transportLocationRate.createdAt))
        .limit(query.limit);
    case "location-expenses":
      return db
        .select()
        .from(schema.transportLocationExpense)
        .where(
          and(
            eq(schema.transportLocationExpense.companyId, companyId),
            term
              ? or(
                  ilike(schema.transportLocationExpense.code, term),
                  ilike(schema.transportLocationExpense.name, term),
                  ilike(schema.transportLocationExpense.expenseType, term)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.transportLocationExpense.createdAt))
        .limit(query.limit);
    case "pax-vehicle-rates":
      return db
        .select()
        .from(schema.transportPaxVehicleRate)
        .where(
          and(
            eq(schema.transportPaxVehicleRate.companyId, companyId),
            term
              ? or(
                  ilike(schema.transportPaxVehicleRate.code, term),
                  ilike(schema.transportPaxVehicleRate.currency, term),
                  ilike(schema.transportPaxVehicleRate.pricingModel, term)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.transportPaxVehicleRate.createdAt))
        .limit(query.limit);
    case "baggage-rates":
      return db
        .select()
        .from(schema.transportBaggageRate)
        .where(
          and(
            eq(schema.transportBaggageRate.companyId, companyId),
            term
              ? or(
                  ilike(schema.transportBaggageRate.code, term),
                  ilike(schema.transportBaggageRate.currency, term),
                  ilike(schema.transportBaggageRate.pricingModel, term),
                  ilike(schema.transportBaggageRate.unit, term)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.transportBaggageRate.createdAt))
        .limit(query.limit);
    default:
      throw new TransportError(404, "RESOURCE_NOT_FOUND", "Transport resource not found.");
  }
}

export async function createTransportRecord(
  resourceInput: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "locations": {
      const parsed = createTransportLocationSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TransportError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      const [created] = await db
        .insert(schema.transportLocation)
        .values({ ...parsed.data, companyId })
        .returning();
      return created;
    }
    case "vehicle-categories": {
      const parsed = createTransportVehicleCategorySchema.safeParse(payload);
      if (!parsed.success) {
        throw new TransportError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      const [created] = await db
        .insert(schema.transportVehicleCategory)
        .values({ ...parsed.data, companyId })
        .returning();
      return created;
    }
    case "vehicle-types": {
      const parsed = createTransportVehicleTypeSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TransportError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureVehicleCategoryInCompany(companyId, parsed.data.categoryId);
      const [created] = await db
        .insert(schema.transportVehicleType)
        .values({ ...parsed.data, companyId })
        .returning();
      return created;
    }
    case "location-rates": {
      const parsed = createTransportLocationRateSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TransportError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureLocationInCompany(companyId, parsed.data.fromLocationId);
      await ensureLocationInCompany(companyId, parsed.data.toLocationId);
      if (parsed.data.vehicleCategoryId) {
        await ensureVehicleCategoryInCompany(companyId, parsed.data.vehicleCategoryId);
      }
      if (parsed.data.vehicleTypeId) {
        await ensureVehicleTypeInCompany(companyId, parsed.data.vehicleTypeId);
      }
      const [created] = await db
        .insert(schema.transportLocationRate)
        .values({
          ...parsed.data,
          companyId,
          distanceKm: toDecimal(parsed.data.distanceKm),
          fixedRate: toDecimal(parsed.data.fixedRate),
          perKmRate: toDecimal(parsed.data.perKmRate),
          minCharge: toDecimal(parsed.data.minCharge) ?? "0.00",
          nightSurcharge: toDecimal(parsed.data.nightSurcharge) ?? "0.00",
          effectiveFrom: toDate(parsed.data.effectiveFrom),
          effectiveTo: toDate(parsed.data.effectiveTo),
        })
        .returning();
      return created;
    }
    case "location-expenses": {
      const parsed = createTransportLocationExpenseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TransportError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureLocationInCompany(companyId, parsed.data.locationId);
      if (parsed.data.vehicleCategoryId) {
        await ensureVehicleCategoryInCompany(companyId, parsed.data.vehicleCategoryId);
      }
      if (parsed.data.vehicleTypeId) {
        await ensureVehicleTypeInCompany(companyId, parsed.data.vehicleTypeId);
      }
      const [created] = await db
        .insert(schema.transportLocationExpense)
        .values({
          ...parsed.data,
          companyId,
          amount: toDecimal(parsed.data.amount) ?? "0.00",
          effectiveFrom: toDate(parsed.data.effectiveFrom),
          effectiveTo: toDate(parsed.data.effectiveTo),
        })
        .returning();
      return created;
    }
    case "pax-vehicle-rates": {
      const parsed = createTransportPaxVehicleRateSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TransportError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureLocationInCompany(companyId, parsed.data.fromLocationId);
      await ensureLocationInCompany(companyId, parsed.data.toLocationId);
      if (parsed.data.vehicleCategoryId) {
        await ensureVehicleCategoryInCompany(companyId, parsed.data.vehicleCategoryId);
      }
      if (parsed.data.vehicleTypeId) {
        await ensureVehicleTypeInCompany(companyId, parsed.data.vehicleTypeId);
      }
      const [created] = await db
        .insert(schema.transportPaxVehicleRate)
        .values({
          ...parsed.data,
          companyId,
          perPaxRate: toDecimal(parsed.data.perPaxRate),
          minCharge: toDecimal(parsed.data.minCharge) ?? "0.00",
          effectiveFrom: toDate(parsed.data.effectiveFrom),
          effectiveTo: toDate(parsed.data.effectiveTo),
        })
        .returning();
      return created;
    }
    case "baggage-rates": {
      const parsed = createTransportBaggageRateSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TransportError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureLocationInCompany(companyId, parsed.data.fromLocationId);
      await ensureLocationInCompany(companyId, parsed.data.toLocationId);
      if (parsed.data.vehicleCategoryId) {
        await ensureVehicleCategoryInCompany(companyId, parsed.data.vehicleCategoryId);
      }
      if (parsed.data.vehicleTypeId) {
        await ensureVehicleTypeInCompany(companyId, parsed.data.vehicleTypeId);
      }
      const [created] = await db
        .insert(schema.transportBaggageRate)
        .values({
          ...parsed.data,
          companyId,
          perUnitRate: toDecimal(parsed.data.perUnitRate),
          fixedRate: toDecimal(parsed.data.fixedRate),
          minCharge: toDecimal(parsed.data.minCharge) ?? "0.00",
          effectiveFrom: toDate(parsed.data.effectiveFrom),
          effectiveTo: toDate(parsed.data.effectiveTo),
        })
        .returning();
      return created;
    }
    default:
      throw new TransportError(404, "RESOURCE_NOT_FOUND", "Transport resource not found.");
  }
}

export async function updateTransportRecord(
  resourceInput: string,
  id: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "locations": {
      const parsed = updateTransportLocationSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TransportError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      const [updated] = await db
        .update(schema.transportLocation)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(schema.transportLocation.id, id), eq(schema.transportLocation.companyId, companyId)))
        .returning();
      if (!updated) throw new TransportError(404, "RECORD_NOT_FOUND", "Location not found.");
      return updated;
    }
    case "vehicle-categories": {
      const parsed = updateTransportVehicleCategorySchema.safeParse(payload);
      if (!parsed.success) {
        throw new TransportError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      const [updated] = await db
        .update(schema.transportVehicleCategory)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(
          and(
            eq(schema.transportVehicleCategory.id, id),
            eq(schema.transportVehicleCategory.companyId, companyId)
          )
        )
        .returning();
      if (!updated) {
        throw new TransportError(404, "RECORD_NOT_FOUND", "Vehicle category not found.");
      }
      return updated;
    }
    case "vehicle-types": {
      const parsed = updateTransportVehicleTypeSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TransportError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.categoryId) {
        await ensureVehicleCategoryInCompany(companyId, parsed.data.categoryId);
      }
      const [updated] = await db
        .update(schema.transportVehicleType)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(
          and(eq(schema.transportVehicleType.id, id), eq(schema.transportVehicleType.companyId, companyId))
        )
        .returning();
      if (!updated) throw new TransportError(404, "RECORD_NOT_FOUND", "Vehicle type not found.");
      return updated;
    }
    case "location-rates": {
      const parsed = updateTransportLocationRateSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TransportError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.fromLocationId) {
        await ensureLocationInCompany(companyId, parsed.data.fromLocationId);
      }
      if (parsed.data.toLocationId) {
        await ensureLocationInCompany(companyId, parsed.data.toLocationId);
      }
      if (parsed.data.vehicleCategoryId) {
        await ensureVehicleCategoryInCompany(companyId, parsed.data.vehicleCategoryId);
      }
      if (parsed.data.vehicleTypeId) {
        await ensureVehicleTypeInCompany(companyId, parsed.data.vehicleTypeId);
      }
      const [updated] = await db
        .update(schema.transportLocationRate)
        .set({
          ...parsed.data,
          distanceKm: toDecimal(parsed.data.distanceKm),
          fixedRate: toDecimal(parsed.data.fixedRate),
          perKmRate: toDecimal(parsed.data.perKmRate),
          minCharge:
            parsed.data.minCharge !== undefined
              ? toDecimal(parsed.data.minCharge) ?? undefined
              : undefined,
          nightSurcharge:
            parsed.data.nightSurcharge !== undefined
              ? toDecimal(parsed.data.nightSurcharge) ?? undefined
              : undefined,
          effectiveFrom:
            parsed.data.effectiveFrom !== undefined ? toDate(parsed.data.effectiveFrom) : undefined,
          effectiveTo:
            parsed.data.effectiveTo !== undefined ? toDate(parsed.data.effectiveTo) : undefined,
          updatedAt: new Date(),
        })
        .where(
          and(eq(schema.transportLocationRate.id, id), eq(schema.transportLocationRate.companyId, companyId))
        )
        .returning();
      if (!updated) throw new TransportError(404, "RECORD_NOT_FOUND", "Location rate not found.");
      return updated;
    }
    case "location-expenses": {
      const parsed = updateTransportLocationExpenseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TransportError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.locationId) {
        await ensureLocationInCompany(companyId, parsed.data.locationId);
      }
      if (parsed.data.vehicleCategoryId) {
        await ensureVehicleCategoryInCompany(companyId, parsed.data.vehicleCategoryId);
      }
      if (parsed.data.vehicleTypeId) {
        await ensureVehicleTypeInCompany(companyId, parsed.data.vehicleTypeId);
      }
      const [updated] = await db
        .update(schema.transportLocationExpense)
        .set({
          ...parsed.data,
          amount:
            parsed.data.amount !== undefined ? toDecimal(parsed.data.amount) ?? undefined : undefined,
          effectiveFrom:
            parsed.data.effectiveFrom !== undefined ? toDate(parsed.data.effectiveFrom) : undefined,
          effectiveTo:
            parsed.data.effectiveTo !== undefined ? toDate(parsed.data.effectiveTo) : undefined,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.transportLocationExpense.id, id),
            eq(schema.transportLocationExpense.companyId, companyId)
          )
        )
        .returning();
      if (!updated) {
        throw new TransportError(404, "RECORD_NOT_FOUND", "Location expense not found.");
      }
      return updated;
    }
    case "pax-vehicle-rates": {
      const parsed = updateTransportPaxVehicleRateSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TransportError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.fromLocationId) {
        await ensureLocationInCompany(companyId, parsed.data.fromLocationId);
      }
      if (parsed.data.toLocationId) {
        await ensureLocationInCompany(companyId, parsed.data.toLocationId);
      }
      if (parsed.data.vehicleCategoryId) {
        await ensureVehicleCategoryInCompany(companyId, parsed.data.vehicleCategoryId);
      }
      if (parsed.data.vehicleTypeId) {
        await ensureVehicleTypeInCompany(companyId, parsed.data.vehicleTypeId);
      }
      const [updated] = await db
        .update(schema.transportPaxVehicleRate)
        .set({
          ...parsed.data,
          perPaxRate:
            parsed.data.perPaxRate !== undefined ? toDecimal(parsed.data.perPaxRate) : undefined,
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
        .where(
          and(
            eq(schema.transportPaxVehicleRate.id, id),
            eq(schema.transportPaxVehicleRate.companyId, companyId)
          )
        )
        .returning();
      if (!updated) {
        throw new TransportError(404, "RECORD_NOT_FOUND", "Pax vehicle rate not found.");
      }
      return updated;
    }
    case "baggage-rates": {
      const parsed = updateTransportBaggageRateSchema.safeParse(payload);
      if (!parsed.success) {
        throw new TransportError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.fromLocationId) {
        await ensureLocationInCompany(companyId, parsed.data.fromLocationId);
      }
      if (parsed.data.toLocationId) {
        await ensureLocationInCompany(companyId, parsed.data.toLocationId);
      }
      if (parsed.data.vehicleCategoryId) {
        await ensureVehicleCategoryInCompany(companyId, parsed.data.vehicleCategoryId);
      }
      if (parsed.data.vehicleTypeId) {
        await ensureVehicleTypeInCompany(companyId, parsed.data.vehicleTypeId);
      }
      const [updated] = await db
        .update(schema.transportBaggageRate)
        .set({
          ...parsed.data,
          perUnitRate:
            parsed.data.perUnitRate !== undefined ? toDecimal(parsed.data.perUnitRate) : undefined,
          fixedRate:
            parsed.data.fixedRate !== undefined ? toDecimal(parsed.data.fixedRate) : undefined,
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
        .where(
          and(
            eq(schema.transportBaggageRate.id, id),
            eq(schema.transportBaggageRate.companyId, companyId)
          )
        )
        .returning();
      if (!updated) throw new TransportError(404, "RECORD_NOT_FOUND", "Baggage rate not found.");
      return updated;
    }
    default:
      throw new TransportError(404, "RESOURCE_NOT_FOUND", "Transport resource not found.");
  }
}

export async function deleteTransportRecord(resourceInput: string, id: string, headers: Headers) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "locations": {
      const [deleted] = await db
        .delete(schema.transportLocation)
        .where(and(eq(schema.transportLocation.id, id), eq(schema.transportLocation.companyId, companyId)))
        .returning({ id: schema.transportLocation.id });
      if (!deleted) throw new TransportError(404, "RECORD_NOT_FOUND", "Location not found.");
      return;
    }
    case "vehicle-categories": {
      const [deleted] = await db
        .delete(schema.transportVehicleCategory)
        .where(
          and(
            eq(schema.transportVehicleCategory.id, id),
            eq(schema.transportVehicleCategory.companyId, companyId)
          )
        )
        .returning({ id: schema.transportVehicleCategory.id });
      if (!deleted) {
        throw new TransportError(404, "RECORD_NOT_FOUND", "Vehicle category not found.");
      }
      return;
    }
    case "vehicle-types": {
      const [deleted] = await db
        .delete(schema.transportVehicleType)
        .where(
          and(eq(schema.transportVehicleType.id, id), eq(schema.transportVehicleType.companyId, companyId))
        )
        .returning({ id: schema.transportVehicleType.id });
      if (!deleted) throw new TransportError(404, "RECORD_NOT_FOUND", "Vehicle type not found.");
      return;
    }
    case "location-rates": {
      const [deleted] = await db
        .delete(schema.transportLocationRate)
        .where(
          and(eq(schema.transportLocationRate.id, id), eq(schema.transportLocationRate.companyId, companyId))
        )
        .returning({ id: schema.transportLocationRate.id });
      if (!deleted) throw new TransportError(404, "RECORD_NOT_FOUND", "Location rate not found.");
      return;
    }
    case "location-expenses": {
      const [deleted] = await db
        .delete(schema.transportLocationExpense)
        .where(
          and(
            eq(schema.transportLocationExpense.id, id),
            eq(schema.transportLocationExpense.companyId, companyId)
          )
        )
        .returning({ id: schema.transportLocationExpense.id });
      if (!deleted) {
        throw new TransportError(404, "RECORD_NOT_FOUND", "Location expense not found.");
      }
      return;
    }
    case "pax-vehicle-rates": {
      const [deleted] = await db
        .delete(schema.transportPaxVehicleRate)
        .where(
          and(
            eq(schema.transportPaxVehicleRate.id, id),
            eq(schema.transportPaxVehicleRate.companyId, companyId)
          )
        )
        .returning({ id: schema.transportPaxVehicleRate.id });
      if (!deleted) {
        throw new TransportError(404, "RECORD_NOT_FOUND", "Pax vehicle rate not found.");
      }
      return;
    }
    case "baggage-rates": {
      const [deleted] = await db
        .delete(schema.transportBaggageRate)
        .where(
          and(
            eq(schema.transportBaggageRate.id, id),
            eq(schema.transportBaggageRate.companyId, companyId)
          )
        )
        .returning({ id: schema.transportBaggageRate.id });
      if (!deleted) throw new TransportError(404, "RECORD_NOT_FOUND", "Baggage rate not found.");
      return;
    }
    default:
      throw new TransportError(404, "RESOURCE_NOT_FOUND", "Transport resource not found.");
  }
}

export function toTransportErrorResponse(error: unknown) {
  if (error instanceof TransportError) {
    return {
      status: error.status,
      body: { code: error.code, message: error.message },
    };
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
