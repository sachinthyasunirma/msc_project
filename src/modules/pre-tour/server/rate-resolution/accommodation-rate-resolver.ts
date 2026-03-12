import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import {
  resolveHotelContractRates,
  toAccommodationContractingErrorResponse,
} from "@/modules/accommodation/server/accommodation-contracting-service";
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
  const contracting = toAccommodationContractingErrorResponse(error);
  if (contracting.status !== 500) {
    return contracting;
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

  const [hotel] = await accessCompanyHotel(parsed.data.hotelId, access.companyId);
  if (!hotel) {
    throw new PreTourRateResolutionError(404, "HOTEL_NOT_FOUND", "Hotel not found.");
  }
  const rows = await resolveHotelContractRates(
    {
      hotelId: parsed.data.hotelId,
      stayDate: travelDate,
      roomTypeId: parsed.data.roomTypeId ?? null,
      boardBasis: roomBasis,
      adults: 2,
      children: 0,
    },
    headers
  );

  return rows.map((row) => {
    const hotelLabel = `${hotel.code} - ${hotel.name}`;
    const roomLabel = `${row.roomTypeCode} - ${row.roomTypeName}`;
    const sourceLabel = `${hotelLabel} • ${roomLabel}${row.boardBasis ? ` • ${row.boardBasis}` : ""}`;
    return {
      sourceRateId: row.roomRateId,
      sourceType: "CONTRACT_RATE",
      sourceLabel,
      serviceId: parsed.data.hotelId,
      serviceLabel: hotelLabel,
      hotelId: parsed.data.hotelId,
      hotelCode: hotel.code,
      hotelName: hotel.name,
      roomTypeId: row.roomTypeId,
      roomTypeCode: row.roomTypeCode,
      roomTypeName: row.roomTypeName,
      roomBasis: row.boardBasis,
      maxOccupancy: row.occupancy.maxAdults + row.occupancy.maxChildren,
      roomRateHeaderId: row.ratePlanId,
      roomRateHeaderCode: row.ratePlanCode,
      roomRateHeaderName: row.ratePlanName,
      seasonId: null,
      currencyCode: row.currencyCode,
      effectiveDate: row.stayDate,
      validFrom: row.stayDate,
      validTo: row.stayDate,
      buyBaseAmount: toNumber(row.buyBaseAmount),
      buyTaxAmount: toNumber(row.buyTaxAmount),
      buyTotalAmount: toNumber(row.buyTotalAmount),
      pricingDimensions: {
        hotelId: parsed.data.hotelId,
        contractId: row.contractId,
        contractCode: row.contractCode,
        roomTypeId: row.roomTypeId,
        roomBasis: row.boardBasis,
        roomRateHeaderId: row.ratePlanId,
        roomRateHeaderCode: row.ratePlanCode,
        roomRateHeaderName: row.ratePlanName,
        pricingModel: "PER_ROOM_PER_NIGHT",
        adults: row.occupancy.adults,
        children: row.occupancy.children,
        maxOccupancy: row.occupancy.maxAdults + row.occupancy.maxChildren,
        applicableFees: row.applicableFees,
        applicableRestrictions: row.applicableRestrictions,
        singleSupplementRate: row.singleSupplementRate,
      },
      locked: true,
    };
  });
}

async function accessCompanyHotel(hotelId: string, companyId: string) {
  return db
    .select({
      id: schema.hotel.id,
      code: schema.hotel.code,
      name: schema.hotel.name,
    })
    .from(schema.hotel)
    .where(and(eq(schema.hotel.id, hotelId), eq(schema.hotel.companyId, companyId)))
    .limit(1);
}
