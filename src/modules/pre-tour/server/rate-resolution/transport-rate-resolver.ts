import { aliasedTable, and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import type {
  PreTourTransportChargeMethod,
  PreTourTransportRateCard,
  ResolveTransportRateRequest,
} from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";

class PreTourTransportRateResolutionError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

const supportedChargeMethodSchema = z.enum([
  "PER_TRANSFER",
  "PER_VEHICLE",
  "PER_PAX",
  "PER_HOUR",
  "PER_DAY",
  "PER_KM",
  "SLAB",
]);

const resolveTransportRateSchema = z.object({
  chargeMethod: supportedChargeMethodSchema,
  fromLocationId: z.string().trim().min(1),
  toLocationId: z.string().trim().min(1),
  serviceDate: z.string().trim().optional().nullable(),
  vehicleCategoryId: z.string().trim().min(1).optional().nullable(),
  vehicleTypeId: z.string().trim().min(1).optional().nullable(),
  pax: z.coerce.number().int().min(1).max(999).optional().nullable(),
});

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toNullableNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeServiceDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new PreTourTransportRateResolutionError(
      400,
      "VALIDATION_ERROR",
      "Service date must be a valid ISO date or datetime."
    );
  }
  return parsed;
}

function isNightService(serviceDate: Date | null) {
  if (!serviceDate) return false;
  const hours = serviceDate.getHours();
  return hours >= 22 || hours < 6;
}

type TransportEffectiveDateColumn =
  | typeof schema.transportPaxVehicleRate.effectiveFrom
  | typeof schema.transportPaxVehicleRate.effectiveTo
  | typeof schema.transportLocationRate.effectiveFrom
  | typeof schema.transportLocationRate.effectiveTo;

function applyDateRangeFilter(
  columnFrom: TransportEffectiveDateColumn,
  columnTo: TransportEffectiveDateColumn,
  serviceDate: Date | null
) {
  if (!serviceDate) return undefined;
  return and(
    or(isNull(columnFrom), lte(columnFrom, serviceDate)),
    or(isNull(columnTo), gte(columnTo, serviceDate))
  );
}

function validateVehicleBasis(
  transportRateBasis: "VEHICLE_CATEGORY" | "VEHICLE_TYPE",
  input: {
    vehicleCategoryId?: string | null;
    vehicleTypeId?: string | null;
  }
) {
  if (transportRateBasis === "VEHICLE_CATEGORY") {
    if (!input.vehicleCategoryId) {
      throw new PreTourTransportRateResolutionError(
        400,
        "VALIDATION_ERROR",
        "Vehicle category is required by the current company transport rate basis."
      );
    }
    return;
  }
  if (!input.vehicleTypeId) {
    throw new PreTourTransportRateResolutionError(
      400,
      "VALIDATION_ERROR",
      "Vehicle type is required by the current company transport rate basis."
    );
  }
}

export function toPreTourTransportRateResolutionErrorResponse(error: unknown) {
  if (error instanceof PreTourTransportRateResolutionError) {
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
    body: { message: "Failed to resolve transport master rates.", code: "INTERNAL_SERVER_ERROR" },
  };
}

async function getAccess(headers: Headers) {
  try {
    return await resolveAccess(headers, {
      requiredPrivilege: "SCREEN_PRE_TOURS",
    });
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new PreTourTransportRateResolutionError(error.status, error.code, error.message);
    }
    throw error;
  }
}

async function getTransportRateBasis(companyId: string) {
  const [companyRow] = await db
    .select({ transportRateBasis: schema.company.transportRateBasis })
    .from(schema.company)
    .where(eq(schema.company.id, companyId))
    .limit(1);
  return companyRow?.transportRateBasis === "VEHICLE_CATEGORY"
    ? "VEHICLE_CATEGORY"
    : "VEHICLE_TYPE";
}

function getLocationRatePricingModel(chargeMethod: PreTourTransportChargeMethod) {
  switch (chargeMethod) {
    case "PER_TRANSFER":
    case "PER_VEHICLE":
      return "FIXED";
    case "PER_KM":
      return "PER_KM";
    case "SLAB":
      return "SLAB";
    default:
      return null;
  }
}

function computeLocationRateAmount(input: {
  chargeMethod: PreTourTransportChargeMethod;
  pricingModel: string;
  distanceKm: number | null;
  fixedRate: number;
  perKmRate: number;
  minCharge: number;
  nightSurcharge: number;
  slabs: Array<{ fromKm: number; toKm: number; rate: number }> | null;
  serviceDate: Date | null;
}) {
  const distanceKm = input.distanceKm ?? 0;
  let baseAmount = 0;
  let matchedTierLabel: string | null = null;

  if (input.chargeMethod === "PER_KM") {
    baseAmount = distanceKm > 0 ? distanceKm * input.perKmRate : input.perKmRate;
  } else if (input.chargeMethod === "SLAB") {
    const matchedSlab =
      input.slabs?.find((slab) => distanceKm >= slab.fromKm && distanceKm <= slab.toKm) ?? null;
    baseAmount = matchedSlab?.rate ?? 0;
    matchedTierLabel = matchedSlab ? `${matchedSlab.fromKm}-${matchedSlab.toKm} km` : null;
  } else {
    baseAmount = input.fixedRate;
  }

  baseAmount = Math.max(baseAmount, input.minCharge);
  if (isNightService(input.serviceDate)) {
    baseAmount += input.nightSurcharge;
  }

  return {
    baseAmount,
    matchedTierLabel,
  };
}

function computePaxRateAmount(input: {
  pricingModel: string;
  pax: number;
  perPaxRate: number;
  minCharge: number;
  tiers: Array<{ minPax: number; maxPax: number; rate: number }> | null;
}) {
  const matchedTier =
    input.pricingModel === "TIERED"
      ? input.tiers?.find((tier) => input.pax >= tier.minPax && input.pax <= tier.maxPax) ?? null
      : null;
  const perPaxRate = matchedTier?.rate ?? input.perPaxRate;
  const baseAmount = Math.max(perPaxRate * input.pax, input.minCharge);
  return {
    baseAmount,
    matchedTierLabel: matchedTier ? `${matchedTier.minPax}-${matchedTier.maxPax} pax` : null,
  };
}

export async function resolveTransportRates(
  payload: ResolveTransportRateRequest,
  headers: Headers
): Promise<PreTourTransportRateCard[]> {
  const parsed = resolveTransportRateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new PreTourTransportRateResolutionError(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message || "Invalid transport rate request."
    );
  }

  const access = await getAccess(headers);
  const transportRateBasis = await getTransportRateBasis(access.companyId);
  const toLocationAlias = aliasedTable(schema.transportLocation, "transport_location_to");
  validateVehicleBasis(transportRateBasis, parsed.data);
  const serviceDate = normalizeServiceDate(parsed.data.serviceDate);

  if (parsed.data.chargeMethod === "PER_DAY" || parsed.data.chargeMethod === "PER_HOUR") {
    return [];
  }

  if (parsed.data.chargeMethod === "PER_PAX") {
    const pax = parsed.data.pax ?? 1;
    const rows = await db
      .select({
        id: schema.transportPaxVehicleRate.id,
        code: schema.transportPaxVehicleRate.code,
        currency: schema.transportPaxVehicleRate.currency,
        pricingModel: schema.transportPaxVehicleRate.pricingModel,
        perPaxRate: schema.transportPaxVehicleRate.perPaxRate,
        tiers: schema.transportPaxVehicleRate.tiers,
        minCharge: schema.transportPaxVehicleRate.minCharge,
        effectiveFrom: schema.transportPaxVehicleRate.effectiveFrom,
        effectiveTo: schema.transportPaxVehicleRate.effectiveTo,
        fromLocationId: schema.transportPaxVehicleRate.fromLocationId,
        toLocationId: schema.transportPaxVehicleRate.toLocationId,
        vehicleCategoryId: schema.transportPaxVehicleRate.vehicleCategoryId,
        vehicleTypeId: schema.transportPaxVehicleRate.vehicleTypeId,
        fromLocationCode: schema.transportLocation.code,
        fromLocationName: schema.transportLocation.name,
        toLocationCode: toLocationAlias.code,
        toLocationName: toLocationAlias.name,
        vehicleCategoryCode: schema.transportVehicleCategory.code,
        vehicleCategoryName: schema.transportVehicleCategory.name,
        vehicleTypeCode: schema.transportVehicleType.code,
        vehicleTypeName: schema.transportVehicleType.name,
      })
      .from(schema.transportPaxVehicleRate)
      .innerJoin(
        schema.transportLocation,
        eq(schema.transportPaxVehicleRate.fromLocationId, schema.transportLocation.id)
      )
      .innerJoin(
        toLocationAlias,
        eq(schema.transportPaxVehicleRate.toLocationId, toLocationAlias.id)
      )
      .leftJoin(
        schema.transportVehicleCategory,
        eq(schema.transportPaxVehicleRate.vehicleCategoryId, schema.transportVehicleCategory.id)
      )
      .leftJoin(
        schema.transportVehicleType,
        eq(schema.transportPaxVehicleRate.vehicleTypeId, schema.transportVehicleType.id)
      )
      .where(
        and(
          eq(schema.transportPaxVehicleRate.companyId, access.companyId),
          eq(schema.transportPaxVehicleRate.isActive, true),
          eq(schema.transportPaxVehicleRate.fromLocationId, parsed.data.fromLocationId),
          eq(schema.transportPaxVehicleRate.toLocationId, parsed.data.toLocationId),
          transportRateBasis === "VEHICLE_CATEGORY"
            ? eq(
                schema.transportPaxVehicleRate.vehicleCategoryId,
                parsed.data.vehicleCategoryId ?? ""
              )
            : eq(schema.transportPaxVehicleRate.vehicleTypeId, parsed.data.vehicleTypeId ?? ""),
          applyDateRangeFilter(
            schema.transportPaxVehicleRate.effectiveFrom,
            schema.transportPaxVehicleRate.effectiveTo,
            serviceDate
          )
        )
      );

    return rows.map((row) => {
      const { baseAmount, matchedTierLabel } = computePaxRateAmount({
        pricingModel: String(row.pricingModel || "PER_PAX"),
        pax,
        perPaxRate: toNumber(row.perPaxRate),
        minCharge: toNumber(row.minCharge),
        tiers:
          (row.tiers as Array<{ minPax: number; maxPax: number; rate: number }> | null) ?? null,
      });
      const fromLabel = `${row.fromLocationCode} - ${row.fromLocationName}`;
      const toLabel = `${row.toLocationCode} - ${row.toLocationName}`;
      const vehicleLabel =
        transportRateBasis === "VEHICLE_CATEGORY"
          ? row.vehicleCategoryCode && row.vehicleCategoryName
            ? `${row.vehicleCategoryCode} - ${row.vehicleCategoryName}`
            : "Vehicle Category"
          : row.vehicleTypeCode && row.vehicleTypeName
            ? `${row.vehicleTypeCode} - ${row.vehicleTypeName}`
            : "Vehicle Type";
      return {
        sourceRateId: String(row.id),
        sourceType: "MASTER_RATE",
        sourceLabel: `${fromLabel} -> ${toLabel} • ${vehicleLabel} • ${String(row.pricingModel || "PER_PAX")}`,
        serviceId:
          transportRateBasis === "VEHICLE_TYPE"
            ? String(row.vehicleTypeId || "")
            : String(row.vehicleCategoryId || ""),
        serviceLabel: vehicleLabel,
        currencyCode: String(row.currency || "LKR"),
        effectiveDate: serviceDate?.toISOString() ?? row.effectiveFrom?.toISOString() ?? new Date().toISOString(),
        validFrom: row.effectiveFrom?.toISOString() ?? null,
        validTo: row.effectiveTo?.toISOString() ?? null,
        buyBaseAmount: baseAmount,
        buyTaxAmount: 0,
        buyTotalAmount: baseAmount,
        pricingDimensions: {
          chargeMethod: parsed.data.chargeMethod,
          pricingModel: row.pricingModel,
          fromLocationId: row.fromLocationId,
          toLocationId: row.toLocationId,
          vehicleCategoryId: row.vehicleCategoryId,
          vehicleTypeId: row.vehicleTypeId,
          pax,
          matchedTierLabel,
          minCharge: toNumber(row.minCharge),
        },
        locked: true,
        chargeMethod: parsed.data.chargeMethod,
        rateBasis: transportRateBasis,
        pricingModel: String(row.pricingModel || "PER_PAX"),
        fromLocationId: String(row.fromLocationId),
        fromLocationLabel: fromLabel,
        toLocationId: String(row.toLocationId),
        toLocationLabel: toLabel,
        vehicleCategoryId: row.vehicleCategoryId ? String(row.vehicleCategoryId) : null,
        vehicleCategoryLabel:
          row.vehicleCategoryCode && row.vehicleCategoryName
            ? `${row.vehicleCategoryCode} - ${row.vehicleCategoryName}`
            : null,
        vehicleTypeId: row.vehicleTypeId ? String(row.vehicleTypeId) : null,
        vehicleTypeLabel:
          row.vehicleTypeCode && row.vehicleTypeName
            ? `${row.vehicleTypeCode} - ${row.vehicleTypeName}`
            : null,
        distanceKm: null,
        durationMin: null,
        minCharge: toNumber(row.minCharge),
        nightSurcharge: 0,
        matchedTierLabel,
      } satisfies PreTourTransportRateCard;
    });
  }

  const pricingModel = getLocationRatePricingModel(parsed.data.chargeMethod);
  if (!pricingModel) return [];

  const rows = await db
    .select({
      id: schema.transportLocationRate.id,
      code: schema.transportLocationRate.code,
      currency: schema.transportLocationRate.currency,
      pricingModel: schema.transportLocationRate.pricingModel,
      fixedRate: schema.transportLocationRate.fixedRate,
      perKmRate: schema.transportLocationRate.perKmRate,
      slabs: schema.transportLocationRate.slabs,
      minCharge: schema.transportLocationRate.minCharge,
      nightSurcharge: schema.transportLocationRate.nightSurcharge,
      effectiveFrom: schema.transportLocationRate.effectiveFrom,
      effectiveTo: schema.transportLocationRate.effectiveTo,
      distanceKm: schema.transportLocationRate.distanceKm,
      durationMin: schema.transportLocationRate.durationMin,
      fromLocationId: schema.transportLocationRate.fromLocationId,
      toLocationId: schema.transportLocationRate.toLocationId,
      vehicleCategoryId: schema.transportLocationRate.vehicleCategoryId,
      vehicleTypeId: schema.transportLocationRate.vehicleTypeId,
      fromLocationCode: schema.transportLocation.code,
      fromLocationName: schema.transportLocation.name,
      toLocationCode: toLocationAlias.code,
      toLocationName: toLocationAlias.name,
      vehicleCategoryCode: schema.transportVehicleCategory.code,
      vehicleCategoryName: schema.transportVehicleCategory.name,
      vehicleTypeCode: schema.transportVehicleType.code,
      vehicleTypeName: schema.transportVehicleType.name,
    })
    .from(schema.transportLocationRate)
    .innerJoin(
      schema.transportLocation,
      eq(schema.transportLocationRate.fromLocationId, schema.transportLocation.id)
    )
    .innerJoin(
      toLocationAlias,
      eq(schema.transportLocationRate.toLocationId, toLocationAlias.id)
    )
    .leftJoin(
      schema.transportVehicleCategory,
      eq(schema.transportLocationRate.vehicleCategoryId, schema.transportVehicleCategory.id)
    )
    .leftJoin(
      schema.transportVehicleType,
      eq(schema.transportLocationRate.vehicleTypeId, schema.transportVehicleType.id)
    )
    .where(
      and(
        eq(schema.transportLocationRate.companyId, access.companyId),
        eq(schema.transportLocationRate.isActive, true),
        eq(schema.transportLocationRate.fromLocationId, parsed.data.fromLocationId),
        eq(schema.transportLocationRate.toLocationId, parsed.data.toLocationId),
        eq(schema.transportLocationRate.pricingModel, pricingModel),
        transportRateBasis === "VEHICLE_CATEGORY"
          ? eq(
              schema.transportLocationRate.vehicleCategoryId,
              parsed.data.vehicleCategoryId ?? ""
            )
          : eq(schema.transportLocationRate.vehicleTypeId, parsed.data.vehicleTypeId ?? ""),
        applyDateRangeFilter(
          schema.transportLocationRate.effectiveFrom,
          schema.transportLocationRate.effectiveTo,
          serviceDate
        )
      )
    );

  return rows.map((row) => {
    const fromLabel = `${row.fromLocationCode} - ${row.fromLocationName}`;
    const toLabel = `${row.toLocationCode} - ${row.toLocationName}`;
    const vehicleLabel =
      transportRateBasis === "VEHICLE_CATEGORY"
        ? row.vehicleCategoryCode && row.vehicleCategoryName
          ? `${row.vehicleCategoryCode} - ${row.vehicleCategoryName}`
          : "Vehicle Category"
        : row.vehicleTypeCode && row.vehicleTypeName
          ? `${row.vehicleTypeCode} - ${row.vehicleTypeName}`
          : "Vehicle Type";
    const { baseAmount, matchedTierLabel } = computeLocationRateAmount({
      chargeMethod: parsed.data.chargeMethod,
      pricingModel,
      distanceKm: toNullableNumber(row.distanceKm),
      fixedRate: toNumber(row.fixedRate),
      perKmRate: toNumber(row.perKmRate),
      minCharge: toNumber(row.minCharge),
      nightSurcharge: toNumber(row.nightSurcharge),
      slabs:
        (row.slabs as Array<{ fromKm: number; toKm: number; rate: number }> | null) ?? null,
      serviceDate,
    });

    return {
      sourceRateId: String(row.id),
      sourceType: "MASTER_RATE",
      sourceLabel: `${fromLabel} -> ${toLabel} • ${vehicleLabel} • ${parsed.data.chargeMethod}`,
      serviceId:
        transportRateBasis === "VEHICLE_TYPE"
          ? String(row.vehicleTypeId || "")
          : String(row.vehicleCategoryId || ""),
      serviceLabel: vehicleLabel,
      currencyCode: String(row.currency || "LKR"),
      effectiveDate: serviceDate?.toISOString() ?? row.effectiveFrom?.toISOString() ?? new Date().toISOString(),
      validFrom: row.effectiveFrom?.toISOString() ?? null,
      validTo: row.effectiveTo?.toISOString() ?? null,
      buyBaseAmount: baseAmount,
      buyTaxAmount: 0,
      buyTotalAmount: baseAmount,
      pricingDimensions: {
        chargeMethod: parsed.data.chargeMethod,
        pricingModel,
        fromLocationId: row.fromLocationId,
        toLocationId: row.toLocationId,
        vehicleCategoryId: row.vehicleCategoryId,
        vehicleTypeId: row.vehicleTypeId,
        distanceKm: toNullableNumber(row.distanceKm),
        durationMin: row.durationMin ?? null,
        minCharge: toNumber(row.minCharge),
        nightSurcharge: toNumber(row.nightSurcharge),
        matchedTierLabel,
      },
      locked: true,
      chargeMethod: parsed.data.chargeMethod,
      rateBasis: transportRateBasis,
      pricingModel,
      fromLocationId: String(row.fromLocationId),
      fromLocationLabel: fromLabel,
      toLocationId: String(row.toLocationId),
      toLocationLabel: toLabel,
      vehicleCategoryId: row.vehicleCategoryId ? String(row.vehicleCategoryId) : null,
      vehicleCategoryLabel:
        row.vehicleCategoryCode && row.vehicleCategoryName
          ? `${row.vehicleCategoryCode} - ${row.vehicleCategoryName}`
          : null,
      vehicleTypeId: row.vehicleTypeId ? String(row.vehicleTypeId) : null,
      vehicleTypeLabel:
        row.vehicleTypeCode && row.vehicleTypeName
          ? `${row.vehicleTypeCode} - ${row.vehicleTypeName}`
          : null,
      distanceKm: toNullableNumber(row.distanceKm),
      durationMin: row.durationMin ?? null,
      minCharge: toNumber(row.minCharge),
      nightSurcharge: toNumber(row.nightSurcharge),
      matchedTierLabel,
    } satisfies PreTourTransportRateCard;
  });
}
