import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import type {
  PreTourAccommodationRateCard,
  ResolveAccommodationRateRequest,
} from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";

class PreTourRateResolutionError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

const resolveAccommodationRateSchema = z.object({
  hotelId: z.string().trim().min(1),
  travelDate: z.string().trim().min(1),
  roomTypeId: z.string().trim().min(1).optional().nullable(),
  roomBasis: z.string().trim().min(1).optional().nullable(),
});

function normalizeDateOnly(value: string) {
  const dateOnly = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    throw new PreTourRateResolutionError(
      400,
      "VALIDATION_ERROR",
      "Travel date must be a valid ISO date."
    );
  }
  return dateOnly;
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function toPreTourRateResolutionErrorResponse(error: unknown) {
  if (error instanceof PreTourRateResolutionError) {
    return {
      status: error.status,
      body: { message: error.message, code: error.code },
    };
  }
  if (error instanceof AccessControlError) {
    return {
      status: error.status,
      body: { message: error.message, code: error.code },
    };
  }
  return {
    status: 500,
    body: { message: "Failed to resolve pre-tour rate.", code: "INTERNAL_SERVER_ERROR" },
  };
}

export async function resolveAccommodationRates(
  payload: ResolveAccommodationRateRequest,
  headers: Headers
): Promise<PreTourAccommodationRateCard[]> {
  const parsed = resolveAccommodationRateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new PreTourRateResolutionError(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message || "Invalid accommodation rate request."
    );
  }

  const access = await resolveAccess(headers, {
    requiredPrivilege: "SCREEN_PRE_TOURS",
  });
  const travelDate = normalizeDateOnly(parsed.data.travelDate);
  const roomBasis = parsed.data.roomBasis?.trim().toUpperCase() || null;

  const rows = await db
    .select({
      hotelId: schema.hotel.id,
      hotelCode: schema.hotel.code,
      hotelName: schema.hotel.name,
      roomTypeId: schema.roomType.id,
      roomTypeCode: schema.roomType.code,
      roomTypeName: schema.roomType.name,
      maxOccupancy: schema.roomType.maxOccupancy,
      roomRateId: schema.roomRate.id,
      roomRateCode: schema.roomRate.code,
      roomBasis: schema.roomRate.roomBasis,
      roomRateHeaderId: schema.roomRateHeader.id,
      roomRateHeaderCode: schema.roomRateHeader.code,
      roomRateHeaderName: schema.roomRateHeader.name,
      seasonId: schema.roomRate.seasonId,
      currencyCode: schema.roomRate.currency,
      validFrom: schema.roomRate.validFrom,
      validTo: schema.roomRate.validTo,
      headerValidFrom: schema.roomRateHeader.validFrom,
      headerValidTo: schema.roomRateHeader.validTo,
      finalRatePerNight: schema.roomRate.finalRatePerNight,
    })
    .from(schema.roomRate)
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.roomRate.hotelId))
    .innerJoin(schema.roomType, eq(schema.roomType.id, schema.roomRate.roomTypeId))
    .leftJoin(
      schema.roomRateHeader,
      eq(schema.roomRateHeader.id, schema.roomRate.roomRateHeaderId)
    )
    .where(
      and(
        eq(schema.hotel.companyId, access.companyId),
        eq(schema.hotel.id, parsed.data.hotelId),
        eq(schema.hotel.isActive, true),
        eq(schema.roomType.isActive, true),
        eq(schema.roomRate.isActive, true),
        lte(schema.roomRate.validFrom, travelDate),
        gte(schema.roomRate.validTo, travelDate),
        parsed.data.roomTypeId ? eq(schema.roomType.id, parsed.data.roomTypeId) : undefined,
        roomBasis ? eq(schema.roomRate.roomBasis, roomBasis) : undefined,
        or(
          isNull(schema.roomRate.roomRateHeaderId),
          and(
            eq(schema.roomRateHeader.isActive, true),
            lte(schema.roomRateHeader.validFrom, travelDate),
            gte(schema.roomRateHeader.validTo, travelDate)
          )
        )
      )
    )
    .orderBy(
      asc(schema.roomType.name),
      asc(schema.roomRate.roomBasis),
      asc(schema.roomRate.validFrom)
    );

  return rows.map((row) => {
    const effectiveDate = row.headerValidFrom ?? row.validFrom ?? travelDate;
    const hotelLabel = `${row.hotelCode} - ${row.hotelName}`;
    const roomLabel = `${row.roomTypeCode} - ${row.roomTypeName}`;
    const sourceLabel = `${hotelLabel} • ${roomLabel}${row.roomBasis ? ` • ${row.roomBasis}` : ""}`;
    return {
      sourceRateId: row.roomRateId,
      sourceType: "MASTER_RATE",
      sourceLabel,
      serviceId: row.hotelId,
      serviceLabel: hotelLabel,
      hotelId: row.hotelId,
      hotelCode: row.hotelCode,
      hotelName: row.hotelName,
      roomTypeId: row.roomTypeId,
      roomTypeCode: row.roomTypeCode,
      roomTypeName: row.roomTypeName,
      roomBasis: row.roomBasis,
      maxOccupancy: row.maxOccupancy,
      roomRateHeaderId: row.roomRateHeaderId,
      roomRateHeaderCode: row.roomRateHeaderCode,
      roomRateHeaderName: row.roomRateHeaderName,
      seasonId: row.seasonId,
      currencyCode: row.currencyCode,
      effectiveDate,
      validFrom: row.validFrom,
      validTo: row.validTo,
      buyBaseAmount: toNumber(row.finalRatePerNight),
      buyTaxAmount: 0,
      buyTotalAmount: toNumber(row.finalRatePerNight),
      pricingDimensions: {
        hotelId: row.hotelId,
        roomTypeId: row.roomTypeId,
        roomBasis: row.roomBasis,
        roomRateHeaderId: row.roomRateHeaderId,
        seasonId: row.seasonId,
        maxOccupancy: row.maxOccupancy,
      },
      locked: true,
    };
  });
}
