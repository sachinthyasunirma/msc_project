import { and, desc, eq, gte, ilike, isNull, lte, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import type { AppPrivilegeCode } from "@/lib/security/privileges";
import {
  createPreTourCategorySchema,
  createPreTourDaySchema,
  createPreTourItemAddonSchema,
  createPreTourItemSchema,
  createPreTourSchema,
  createPreTourTechnicalVisitSchema,
  createPreTourTotalSchema,
  preTourListQuerySchema,
  preTourResourceSchema,
  updatePreTourCategorySchema,
  updatePreTourDaySchema,
  updatePreTourItemAddonSchema,
  updatePreTourItemSchema,
  updatePreTourSchema,
  updatePreTourTechnicalVisitSchema,
  updatePreTourTotalSchema,
} from "@/modules/pre-tour/shared/pre-tour-schemas";

class PreTourError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

type PreTourResource = z.infer<typeof preTourResourceSchema>;

function requiredPrivilegeForResource(resource: PreTourResource): AppPrivilegeCode {
  if (resource === "pre-tour-totals") return "PRE_TOUR_COSTING";
  return "SCREEN_PRE_TOURS";
}

function normalizeZodError(error: z.ZodError) {
  return error.issues[0]?.message || "Validation failed.";
}

function toDecimal(value: number | string | null | undefined, scale = 2) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return numeric.toFixed(scale);
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value);
}

function parseResource(input: string): PreTourResource {
  const parsed = preTourResourceSchema.safeParse(input);
  if (!parsed.success) {
    throw new PreTourError(404, "RESOURCE_NOT_FOUND", "Pre-tour resource not found.");
  }
  return parsed.data;
}

async function getAccess(headers: Headers, resource: PreTourResource) {
  try {
    const access = await resolveAccess(headers, {
      requiredPrivilege: requiredPrivilegeForResource(resource),
    });
    return {
      ...access,
      userId: access.userId,
      userName: access.userName,
      canWritePreTour: access.canWritePreTour,
    };
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new PreTourError(error.status, error.code, error.message);
    }
    throw error;
  }
}

async function ensureWritable(headers: Headers, resource: PreTourResource) {
  const access = await getAccess(headers, resource);
  if (access.readOnly) {
    throw new PreTourError(
      403,
      "READ_ONLY_MODE",
      "You are in read-only mode. Contact a manager for edit access."
    );
  }
  const elevated = access.role === "ADMIN" || access.role === "MANAGER";
  if (!elevated && !access.canWritePreTour) {
    throw new PreTourError(
      403,
      "PERMISSION_DENIED",
      "You do not have write access for Pre-Tour."
    );
  }
  return access;
}

async function ensurePlan(companyId: string, id: string) {
  const [record] = await db
    .select({ id: schema.preTourPlan.id })
    .from(schema.preTourPlan)
    .where(and(eq(schema.preTourPlan.id, id), eq(schema.preTourPlan.companyId, companyId)))
    .limit(1);

  if (!record) {
    throw new PreTourError(400, "PLAN_NOT_FOUND", "Pre-tour plan not found in this company.");
  }
}

async function ensureDay(companyId: string, id: string) {
  const [record] = await db
    .select({ id: schema.preTourPlanDay.id, planId: schema.preTourPlanDay.planId })
    .from(schema.preTourPlanDay)
    .where(and(eq(schema.preTourPlanDay.id, id), eq(schema.preTourPlanDay.companyId, companyId)))
    .limit(1);

  if (!record) {
    throw new PreTourError(400, "DAY_NOT_FOUND", "Pre-tour day not found in this company.");
  }

  return record;
}

async function ensureItem(companyId: string, id: string) {
  const [record] = await db
    .select({ id: schema.preTourPlanItem.id, planId: schema.preTourPlanItem.planId })
    .from(schema.preTourPlanItem)
    .where(and(eq(schema.preTourPlanItem.id, id), eq(schema.preTourPlanItem.companyId, companyId)))
    .limit(1);

  if (!record) {
    throw new PreTourError(400, "ITEM_NOT_FOUND", "Pre-tour item not found in this company.");
  }

  return record;
}

async function ensureTechnicalVisit(companyId: string, id: string) {
  const [record] = await db
    .select({ id: schema.technicalVisit.id })
    .from(schema.technicalVisit)
    .where(and(eq(schema.technicalVisit.id, id), eq(schema.technicalVisit.companyId, companyId)))
    .limit(1);

  if (!record) {
    throw new PreTourError(400, "TECHNICAL_VISIT_NOT_FOUND", "Technical visit not found in this company.");
  }
}

async function ensureTourCategoryType(companyId: string, id: string) {
  const [record] = await db
    .select({
      id: schema.tourCategoryType.id,
      allowMultiple: schema.tourCategoryType.allowMultiple,
    })
    .from(schema.tourCategoryType)
    .where(
      and(
        eq(schema.tourCategoryType.id, id),
        eq(schema.tourCategoryType.companyId, companyId),
        eq(schema.tourCategoryType.isActive, true)
      )
    )
    .limit(1);

  if (!record) {
    throw new PreTourError(
      400,
      "TOUR_CATEGORY_TYPE_NOT_FOUND",
      "Tour category type not found in this company."
    );
  }
  return record;
}

async function ensureTourCategory(companyId: string, id: string) {
  const [record] = await db
    .select({
      id: schema.tourCategory.id,
      typeId: schema.tourCategory.typeId,
    })
    .from(schema.tourCategory)
    .where(
      and(
        eq(schema.tourCategory.id, id),
        eq(schema.tourCategory.companyId, companyId),
        eq(schema.tourCategory.isActive, true)
      )
    )
    .limit(1);

  if (!record) {
    throw new PreTourError(
      400,
      "TOUR_CATEGORY_NOT_FOUND",
      "Tour category not found in this company."
    );
  }
  return record;
}

async function ensurePreTourCategoryTypeLimit(
  companyId: string,
  input: { planId: string; typeId: string; categoryId: string; currentRecordId?: string }
) {
  const type = await ensureTourCategoryType(companyId, input.typeId);
  const category = await ensureTourCategory(companyId, input.categoryId);
  if (String(category.typeId) !== String(input.typeId)) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      "Selected category does not belong to selected category type."
    );
  }

  if (!type.allowMultiple) {
    const [existing] = await db
      .select({ id: schema.preTourPlanCategory.id })
      .from(schema.preTourPlanCategory)
      .where(
        and(
          eq(schema.preTourPlanCategory.companyId, companyId),
          eq(schema.preTourPlanCategory.planId, input.planId),
          eq(schema.preTourPlanCategory.typeId, input.typeId),
          input.currentRecordId ? ne(schema.preTourPlanCategory.id, input.currentRecordId) : undefined
        )
      )
      .limit(1);

    if (existing && String(existing.id) !== String(input.currentRecordId ?? "")) {
      throw new PreTourError(
        400,
        "VALIDATION_ERROR",
        "This category type allows only one category per pre-tour plan."
      );
    }
  }
}

function extractVehicleTypeIdFromTransportItem(input: {
  serviceId?: string | null;
  pricingSnapshot?: unknown;
}) {
  if (input.serviceId && input.serviceId.trim().length > 0) {
    return input.serviceId.trim();
  }
  if (!input.pricingSnapshot || typeof input.pricingSnapshot !== "object") {
    return null;
  }
  const snapshot = input.pricingSnapshot as Record<string, unknown>;
  const vehicleTypeId = snapshot.vehicleTypeId;
  if (typeof vehicleTypeId === "string" && vehicleTypeId.trim().length > 0) {
    return vehicleTypeId.trim();
  }
  return null;
}

function resolveGuideSeatCount(pricingSnapshot: unknown) {
  if (!pricingSnapshot || typeof pricingSnapshot !== "object") return 0;
  const snapshot = pricingSnapshot as Record<string, unknown>;
  const flags = ["includeGuide", "hasGuide", "guideRequired"];
  for (const flag of flags) {
    if (snapshot[flag] === true) return 1;
  }
  const numeric = ["guideCount", "assignedGuideCount"];
  for (const key of numeric) {
    const value = snapshot[key];
    const n = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(n) && n > 0) return Math.trunc(n);
  }
  const assigned = snapshot.assignedGuideIds;
  if (Array.isArray(assigned) && assigned.length > 0) return 1;
  return 0;
}

async function validateTransportPaxCapacity(
  companyId: string,
  input: {
    itemType?: string | null;
    serviceId?: string | null;
    pax?: number | null;
    pricingSnapshot?: unknown;
  }
) {
  if (String(input.itemType || "").toUpperCase() !== "TRANSPORT") {
    return;
  }

  const vehicleTypeId = extractVehicleTypeIdFromTransportItem({
    serviceId: input.serviceId ?? null,
    pricingSnapshot: input.pricingSnapshot,
  });
  if (!vehicleTypeId) return;

  const [vehicleType] = await db
    .select({
      paxCapacity: schema.transportVehicleType.paxCapacity,
    })
    .from(schema.transportVehicleType)
    .where(
      and(
        eq(schema.transportVehicleType.id, vehicleTypeId),
        eq(schema.transportVehicleType.companyId, companyId),
        eq(schema.transportVehicleType.isActive, true)
      )
    )
    .limit(1);

  if (!vehicleType) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      "Selected transport vehicle type is invalid or inactive."
    );
  }

  const touristPax = Number(input.pax ?? 0);
  const safeTouristPax = Number.isFinite(touristPax) ? Math.max(0, touristPax) : 0;
  const driverSeats = 1;
  const guideSeats = resolveGuideSeatCount(input.pricingSnapshot);
  const occupiedSeats = safeTouristPax + driverSeats + guideSeats;

  if (occupiedSeats > Number(vehicleType.paxCapacity)) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      `Vehicle capacity exceeded. Tourists (${safeTouristPax}) + driver (${driverSeats}) + guide (${guideSeats}) cannot exceed vehicle pax capacity (${vehicleType.paxCapacity}).`
    );
  }
}

async function ensureOrganizationType(
  companyId: string,
  organizationId: string,
  allowedTypes: string[],
  errorCode: string
) {
  const [record] = await db
    .select({ id: schema.businessOrganization.id, type: schema.businessOrganization.type })
    .from(schema.businessOrganization)
    .where(
      and(
        eq(schema.businessOrganization.id, organizationId),
        eq(schema.businessOrganization.companyId, companyId)
      )
    )
    .limit(1);

  if (!record || !allowedTypes.includes(record.type)) {
    throw new PreTourError(
      400,
      errorCode,
      `Invalid organization selection for ${errorCode.replaceAll("_", " ").toLowerCase()}.`
    );
  }
}

async function resolvePreTourCurrencyContext(
  companyId: string,
  options: {
    planCurrencyCode: string;
    startDate: string;
    exchangeRateMode?: "AUTO" | "MANUAL";
    exchangeRate?: number;
    exchangeRateDate?: string | null;
  }
) {
  const normalizedPlanCurrencyCode = options.planCurrencyCode.trim().toUpperCase();
  const startDate = new Date(options.startDate);
  if (Number.isNaN(startDate.getTime())) {
    throw new PreTourError(400, "VALIDATION_ERROR", "Invalid pre-tour start date.");
  }

  const [companyRecord] = await db
    .select({ baseCurrencyCode: schema.company.baseCurrencyCode })
    .from(schema.company)
    .where(eq(schema.company.id, companyId))
    .limit(1);

  if (!companyRecord) {
    throw new PreTourError(400, "COMPANY_NOT_FOUND", "Company configuration not found.");
  }

  const baseCurrencyCode = String(companyRecord.baseCurrencyCode || "").trim().toUpperCase();

  const [planCurrency] = await db
    .select({ id: schema.currency.id })
    .from(schema.currency)
    .where(
      and(
        eq(schema.currency.companyId, companyId),
        eq(schema.currency.code, normalizedPlanCurrencyCode),
        eq(schema.currency.isActive, true)
      )
    )
    .limit(1);

  if (!planCurrency) {
    throw new PreTourError(
      400,
      "PLAN_CURRENCY_NOT_FOUND",
      "Pre-tour currency must exist as an active currency in company settings."
    );
  }

  if (!baseCurrencyCode) {
    throw new PreTourError(
      400,
      "COMPANY_BASE_CURRENCY_REQUIRED",
      "Company base currency is not configured."
    );
  }

  if (baseCurrencyCode === normalizedPlanCurrencyCode) {
    return {
      baseCurrencyCode,
      exchangeRateMode: "AUTO" as const,
      exchangeRate: 1,
      exchangeRateDate: startDate,
    };
  }

  const [baseCurrency] = await db
    .select({ id: schema.currency.id })
    .from(schema.currency)
    .where(
      and(
        eq(schema.currency.companyId, companyId),
        eq(schema.currency.code, baseCurrencyCode),
        eq(schema.currency.isActive, true)
      )
    )
    .limit(1);

  if (!baseCurrency) {
    throw new PreTourError(
      400,
      "COMPANY_BASE_CURRENCY_INVALID",
      "Company base currency does not exist in active currency master."
    );
  }

  const requestedMode = options.exchangeRateMode ?? "AUTO";
  if (requestedMode === "MANUAL") {
    const manualRate = Number(options.exchangeRate ?? 0);
    if (!Number.isFinite(manualRate) || manualRate < 0) {
      throw new PreTourError(
        400,
        "VALIDATION_ERROR",
        "Manual exchange rate must be a valid number greater than or equal to zero."
      );
    }
    const manualDate = options.exchangeRateDate ? new Date(options.exchangeRateDate) : startDate;
    return {
      baseCurrencyCode,
      exchangeRateMode: "MANUAL" as const,
      exchangeRate: manualRate,
      exchangeRateDate: Number.isNaN(manualDate.getTime()) ? startDate : manualDate,
    };
  }

  const [rate] = await db
    .select({
      rate: schema.exchangeRate.rate,
      asOf: schema.exchangeRate.asOf,
    })
    .from(schema.exchangeRate)
    .where(
      and(
        eq(schema.exchangeRate.companyId, companyId),
        eq(schema.exchangeRate.baseCurrencyId, baseCurrency.id),
        eq(schema.exchangeRate.quoteCurrencyId, planCurrency.id),
        eq(schema.exchangeRate.isActive, true),
        lte(schema.exchangeRate.asOf, startDate),
        or(isNull(schema.exchangeRate.effectiveTo), gte(schema.exchangeRate.effectiveTo, startDate))
      )
    )
    .orderBy(desc(schema.exchangeRate.asOf), desc(schema.exchangeRate.createdAt))
    .limit(1);

  const selectedRate = rate ? Number(rate.rate) : 0;
  return {
    baseCurrencyCode,
    exchangeRateMode: "AUTO" as const,
    exchangeRate: Number.isFinite(selectedRate) && selectedRate > 0 ? selectedRate : 0,
    exchangeRateDate: rate?.asOf ?? null,
  };
}

function validatePlanDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      "Plan end date must be greater than or equal to start date."
    );
  }
}

async function generatePreTourReferenceNo(companyId: string) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `PT-${y}${m}${d}-`;

  const rows = await db
    .select({ referenceNo: schema.preTourPlan.referenceNo })
    .from(schema.preTourPlan)
    .where(
      and(
        eq(schema.preTourPlan.companyId, companyId),
        ilike(schema.preTourPlan.referenceNo, `${prefix}%`)
      )
    )
    .limit(1000);

  let maxCounter = 0;
  for (const row of rows) {
    const value = String(row.referenceNo || "");
    if (!value.startsWith(prefix)) continue;
    const suffix = value.slice(prefix.length);
    const numeric = Number(suffix);
    if (Number.isFinite(numeric) && numeric > maxCounter) {
      maxCounter = numeric;
    }
  }

  const nextCounter = String(maxCounter + 1).padStart(3, "0");
  return `${prefix}${nextCounter}`;
}

async function generateUniquePreTourDayCode(companyId: string, requestedCode: string) {
  const normalizedBase = requestedCode.trim().toUpperCase().slice(0, 80);
  if (!normalizedBase) {
    throw new PreTourError(400, "VALIDATION_ERROR", "Day code is required.");
  }

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const suffix = attempt === 0 ? "" : `_${String(attempt + 1).padStart(2, "0")}`;
    const nextCode = `${normalizedBase}${suffix}`.slice(0, 80);

    const [existing] = await db
      .select({ id: schema.preTourPlanDay.id })
      .from(schema.preTourPlanDay)
      .where(
        and(
          eq(schema.preTourPlanDay.companyId, companyId),
          eq(schema.preTourPlanDay.code, nextCode)
        )
      )
      .limit(1);

    if (!existing) return nextCode;
  }

  throw new PreTourError(
    400,
    "VALIDATION_ERROR",
    "Unable to generate a unique day code. Please use a different code."
  );
}

async function cleanupExpiredPreTourBins(companyId: string) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - 30);

  const expired = await db
    .select({ id: schema.preTourPlanBin.id, planId: schema.preTourPlanBin.planId })
    .from(schema.preTourPlanBin)
    .where(
      and(
        eq(schema.preTourPlanBin.companyId, companyId),
        lte(schema.preTourPlanBin.deletedAt, threshold)
      )
    )
    .limit(1000);

  if (expired.length === 0) return 0;

  await db.transaction(async (tx) => {
    for (const row of expired) {
      await tx
        .delete(schema.preTourPlanBin)
        .where(
          and(
            eq(schema.preTourPlanBin.id, String(row.id)),
            eq(schema.preTourPlanBin.companyId, companyId)
          )
        );
      await tx
        .delete(schema.preTourPlan)
        .where(
          and(
            eq(schema.preTourPlan.id, String(row.planId)),
            eq(schema.preTourPlan.companyId, companyId)
          )
        );
    }
  });

  return expired.length;
}

export async function runPreTourBinCleanupForAllCompanies() {
  const companies = await db.select({ id: schema.company.id }).from(schema.company);
  let totalDeleted = 0;
  for (const row of companies) {
    totalDeleted += await cleanupExpiredPreTourBins(String(row.id));
  }
  return totalDeleted;
}

export async function listPreTourRecords(
  resourceInput: string,
  searchParams: URLSearchParams,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const parsed = preTourListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const { companyId } = await getAccess(headers, resource);
  const q = parsed.data.q ? `%${parsed.data.q}%` : null;
  const limit = parsed.data.limit;
  const planId = parsed.data.planId;
  const dayId = parsed.data.dayId;
  const itemId = parsed.data.itemId;
  const visitId = parsed.data.visitId;

  switch (resource) {
    case "pre-tours":
      return db
        .select()
        .from(schema.preTourPlan)
        .where(
          and(
            eq(schema.preTourPlan.companyId, companyId),
            isNull(schema.preTourPlan.deletedAt),
            q
                ? or(
                    ilike(schema.preTourPlan.code, q),
                    ilike(schema.preTourPlan.referenceNo, q),
                    ilike(schema.preTourPlan.planCode, q),
                    ilike(schema.preTourPlan.title, q),
                  ilike(schema.preTourPlan.status, q),
                  ilike(schema.preTourPlan.currencyCode, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.preTourPlan.createdAt))
        .limit(limit);

    case "pre-tour-bins":
      await cleanupExpiredPreTourBins(companyId);
      return db
        .select()
        .from(schema.preTourPlanBin)
        .where(
          and(
            eq(schema.preTourPlanBin.companyId, companyId),
            q
              ? or(
                  ilike(schema.preTourPlanBin.code, q),
                  ilike(schema.preTourPlanBin.referenceNo, q),
                  ilike(schema.preTourPlanBin.planCode, q),
                  ilike(schema.preTourPlanBin.title, q),
                  ilike(schema.preTourPlanBin.deletedByName, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.preTourPlanBin.deletedAt))
        .limit(limit);

    case "pre-tour-days":
      return db
        .select()
        .from(schema.preTourPlanDay)
        .where(
          and(
            eq(schema.preTourPlanDay.companyId, companyId),
            planId ? eq(schema.preTourPlanDay.planId, planId) : undefined,
            q
              ? or(
                  ilike(schema.preTourPlanDay.code, q),
                  ilike(schema.preTourPlanDay.title, q)
                )
              : undefined
          )
        )
        .orderBy(schema.preTourPlanDay.dayNumber)
        .limit(limit);

    case "pre-tour-items":
      return db
        .select()
        .from(schema.preTourPlanItem)
        .where(
          and(
            eq(schema.preTourPlanItem.companyId, companyId),
            planId ? eq(schema.preTourPlanItem.planId, planId) : undefined,
            dayId ? eq(schema.preTourPlanItem.dayId, dayId) : undefined,
            q
              ? or(
                  ilike(schema.preTourPlanItem.code, q),
                  ilike(schema.preTourPlanItem.itemType, q),
                  ilike(schema.preTourPlanItem.status, q),
                  ilike(schema.preTourPlanItem.title, q)
                )
              : undefined
          )
        )
        .orderBy(schema.preTourPlanItem.sortOrder, desc(schema.preTourPlanItem.createdAt))
        .limit(limit);

    case "pre-tour-item-addons":
      return db
        .select()
        .from(schema.preTourPlanItemAddon)
        .where(
          and(
            eq(schema.preTourPlanItemAddon.companyId, companyId),
            planId ? eq(schema.preTourPlanItemAddon.planId, planId) : undefined,
            itemId ? eq(schema.preTourPlanItemAddon.planItemId, itemId) : undefined,
            q
              ? or(
                  ilike(schema.preTourPlanItemAddon.code, q),
                  ilike(schema.preTourPlanItemAddon.addonType, q),
                  ilike(schema.preTourPlanItemAddon.title, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.preTourPlanItemAddon.createdAt))
        .limit(limit);

    case "pre-tour-totals":
      return db
        .select()
        .from(schema.preTourPlanTotal)
        .where(
          and(
            eq(schema.preTourPlanTotal.companyId, companyId),
            planId ? eq(schema.preTourPlanTotal.planId, planId) : undefined,
            q
              ? or(
                  ilike(schema.preTourPlanTotal.code, q),
                  ilike(schema.preTourPlanTotal.currencyCode, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.preTourPlanTotal.createdAt))
        .limit(limit);

    case "pre-tour-categories":
      return db
        .select()
        .from(schema.preTourPlanCategory)
        .where(
          and(
            eq(schema.preTourPlanCategory.companyId, companyId),
            planId ? eq(schema.preTourPlanCategory.planId, planId) : undefined,
            q
              ? or(
                  ilike(schema.preTourPlanCategory.code, q),
                  ilike(schema.preTourPlanCategory.notes, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.preTourPlanCategory.createdAt))
        .limit(limit);

    case "pre-tour-technical-visits":
      return db
        .select()
        .from(schema.preTourPlanTechnicalVisit)
        .where(
          and(
            eq(schema.preTourPlanTechnicalVisit.companyId, companyId),
            planId ? eq(schema.preTourPlanTechnicalVisit.planId, planId) : undefined,
            dayId ? eq(schema.preTourPlanTechnicalVisit.dayId, dayId) : undefined,
            visitId ? eq(schema.preTourPlanTechnicalVisit.technicalVisitId, visitId) : undefined,
            q
              ? or(
                  ilike(schema.preTourPlanTechnicalVisit.code, q),
                  ilike(schema.preTourPlanTechnicalVisit.notes, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.preTourPlanTechnicalVisit.createdAt))
        .limit(limit);

    default:
      throw new PreTourError(404, "RESOURCE_NOT_FOUND", "Pre-tour resource not found.");
  }
}

export async function createPreTourRecord(
  resourceInput: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId, userId, userName } = await ensureWritable(headers, resource);

  switch (resource) {
    case "pre-tours": {
      const parsed = createPreTourSchema.safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      validatePlanDateRange(parsed.data.startDate, parsed.data.endDate);
      const currencyContext = await resolvePreTourCurrencyContext(companyId, {
        planCurrencyCode: parsed.data.currencyCode,
        startDate: parsed.data.startDate,
        exchangeRateMode: parsed.data.exchangeRateMode,
        exchangeRate: parsed.data.exchangeRate,
        exchangeRateDate: parsed.data.exchangeRateDate ?? null,
      });
      if (parsed.data.operatorOrgId === parsed.data.marketOrgId) {
        throw new PreTourError(
          400,
          "VALIDATION_ERROR",
          "Operator and market organizations must be different."
        );
      }
      await ensureOrganizationType(
        companyId,
        parsed.data.operatorOrgId,
        ["OPERATOR", "SUPPLIER"],
        "INVALID_OPERATOR_ORGANIZATION"
      );
      await ensureOrganizationType(
        companyId,
        parsed.data.marketOrgId,
        ["MARKET"],
        "INVALID_MARKET_ORGANIZATION"
      );

      const referenceNo = parsed.data.referenceNo?.trim()
        ? parsed.data.referenceNo.trim().toUpperCase()
        : await generatePreTourReferenceNo(companyId);

      const [created] = await db
        .insert(schema.preTourPlan)
        .values({
          ...parsed.data,
          companyId,
          updatedByUserId: userId,
          updatedByName: userName,
          referenceNo,
          startDate: toDate(parsed.data.startDate)!,
          endDate: toDate(parsed.data.endDate)!,
          baseCurrencyCode: currencyContext.baseCurrencyCode,
          exchangeRateMode: currencyContext.exchangeRateMode,
          exchangeRate: toDecimal(currencyContext.exchangeRate, 8) ?? "0",
          exchangeRateDate: currencyContext.exchangeRateDate,
          baseTotal: toDecimal(parsed.data.baseTotal),
          taxTotal: toDecimal(parsed.data.taxTotal),
          grandTotal: toDecimal(parsed.data.grandTotal),
        } as any)
        .returning();

      return created;
    }

    case "pre-tour-days": {
      const parsed = createPreTourDaySchema.safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      await ensurePlan(companyId, parsed.data.planId);
      const uniqueCode = await generateUniquePreTourDayCode(companyId, parsed.data.code);

      const [created] = await db
        .insert(schema.preTourPlanDay)
        .values({
          ...parsed.data,
          code: uniqueCode,
          companyId,
          date: toDate(parsed.data.date)!,
        } as any)
        .returning();

      return created;
    }

    case "pre-tour-items": {
      const parsed = createPreTourItemSchema.safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      await ensurePlan(companyId, parsed.data.planId);
      const day = await ensureDay(companyId, parsed.data.dayId);
      if (day.planId !== parsed.data.planId) {
        throw new PreTourError(
          400,
          "VALIDATION_ERROR",
          "Selected day does not belong to the selected pre-tour plan."
        );
      }
      await validateTransportPaxCapacity(companyId, {
        itemType: parsed.data.itemType,
        serviceId: parsed.data.serviceId ?? null,
        pax: parsed.data.pax ?? null,
        pricingSnapshot: parsed.data.pricingSnapshot ?? null,
      });

      const [created] = await db
        .insert(schema.preTourPlanItem)
        .values({
          ...parsed.data,
          companyId,
          startAt: toDate(parsed.data.startAt),
          endAt: toDate(parsed.data.endAt),
          units: toDecimal(parsed.data.units),
          baseAmount: toDecimal(parsed.data.baseAmount),
          taxAmount: toDecimal(parsed.data.taxAmount),
          totalAmount: toDecimal(parsed.data.totalAmount),
        } as any)
        .returning();

      return created;
    }

    case "pre-tour-item-addons": {
      const parsed = createPreTourItemAddonSchema.safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      await ensurePlan(companyId, parsed.data.planId);
      const item = await ensureItem(companyId, parsed.data.planItemId);
      if (item.planId !== parsed.data.planId) {
        throw new PreTourError(
          400,
          "VALIDATION_ERROR",
          "Selected plan item does not belong to the selected pre-tour plan."
        );
      }

      const [created] = await db
        .insert(schema.preTourPlanItemAddon)
        .values({
          ...parsed.data,
          companyId,
          qty: toDecimal(parsed.data.qty),
          baseAmount: toDecimal(parsed.data.baseAmount),
          taxAmount: toDecimal(parsed.data.taxAmount),
          totalAmount: toDecimal(parsed.data.totalAmount),
        } as any)
        .returning();

      return created;
    }

    case "pre-tour-totals": {
      const parsed = createPreTourTotalSchema.safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      await ensurePlan(companyId, parsed.data.planId);

      const [created] = await db
        .insert(schema.preTourPlanTotal)
        .values({
          ...parsed.data,
          companyId,
          baseTotal: toDecimal(parsed.data.baseTotal),
          taxTotal: toDecimal(parsed.data.taxTotal),
          grandTotal: toDecimal(parsed.data.grandTotal),
        } as any)
        .returning();

      return created;
    }

    case "pre-tour-categories": {
      const parsed = createPreTourCategorySchema.safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      await ensurePlan(companyId, parsed.data.planId);
      await ensurePreTourCategoryTypeLimit(companyId, {
        planId: parsed.data.planId,
        typeId: parsed.data.typeId,
        categoryId: parsed.data.categoryId,
      });

      const [created] = await db
        .insert(schema.preTourPlanCategory)
        .values({
          ...parsed.data,
          companyId,
        } as any)
        .returning();

      return created;
    }

    case "pre-tour-technical-visits": {
      const parsed = createPreTourTechnicalVisitSchema.safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensurePlan(companyId, parsed.data.planId);
      if (parsed.data.dayId) {
        const day = await ensureDay(companyId, parsed.data.dayId);
        if (String(day.planId) !== String(parsed.data.planId)) {
          throw new PreTourError(
            400,
            "VALIDATION_ERROR",
            "Selected day does not belong to selected pre-tour plan."
          );
        }
      }
      await ensureTechnicalVisit(companyId, parsed.data.technicalVisitId);

      const [created] = await db
        .insert(schema.preTourPlanTechnicalVisit)
        .values({
          ...parsed.data,
          companyId,
        } as any)
        .returning();
      return created;
    }

    default:
      throw new PreTourError(404, "RESOURCE_NOT_FOUND", "Pre-tour resource not found.");
  }
}

export async function updatePreTourRecord(
  resourceInput: string,
  id: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId, userId, userName, role } = await ensureWritable(headers, resource);

  switch (resource) {
    case "pre-tours": {
      const parsed = updatePreTourSchema.safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      const [current] = await db
        .select({
          operatorOrgId: schema.preTourPlan.operatorOrgId,
          marketOrgId: schema.preTourPlan.marketOrgId,
          startDate: schema.preTourPlan.startDate,
          endDate: schema.preTourPlan.endDate,
          currencyCode: schema.preTourPlan.currencyCode,
          exchangeRateMode: schema.preTourPlan.exchangeRateMode,
          exchangeRate: schema.preTourPlan.exchangeRate,
          exchangeRateDate: schema.preTourPlan.exchangeRateDate,
        })
        .from(schema.preTourPlan)
        .where(and(eq(schema.preTourPlan.id, id), eq(schema.preTourPlan.companyId, companyId)))
        .limit(1);

      if (!current) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour plan not found.");
      }

      const nextOperatorOrgId = parsed.data.operatorOrgId ?? current.operatorOrgId;
      const nextMarketOrgId = parsed.data.marketOrgId ?? current.marketOrgId;
      const nextStartDateRaw =
        parsed.data.startDate ??
        (current.startDate instanceof Date
          ? current.startDate.toISOString()
          : String(current.startDate || ""));
      const nextEndDateRaw =
        parsed.data.endDate ??
        (current.endDate instanceof Date
          ? current.endDate.toISOString()
          : String(current.endDate || ""));
      const nextCurrencyCode = parsed.data.currencyCode ?? String(current.currencyCode || "");
      const nextExchangeRateMode =
        (parsed.data.exchangeRateMode ??
          (String(current.exchangeRateMode || "AUTO") as "AUTO" | "MANUAL")) || "AUTO";
      const nextExchangeRate =
        parsed.data.exchangeRate !== undefined
          ? parsed.data.exchangeRate
          : Number(current.exchangeRate ?? 0);
      const nextExchangeRateDateRaw =
        parsed.data.exchangeRateDate !== undefined
          ? parsed.data.exchangeRateDate
          : current.exchangeRateDate instanceof Date
            ? current.exchangeRateDate.toISOString()
            : null;

      validatePlanDateRange(nextStartDateRaw, nextEndDateRaw);
      const currencyContext = await resolvePreTourCurrencyContext(companyId, {
        planCurrencyCode: nextCurrencyCode,
        startDate: nextStartDateRaw,
        exchangeRateMode: nextExchangeRateMode,
        exchangeRate: nextExchangeRate,
        exchangeRateDate: nextExchangeRateDateRaw,
      });

      if (!nextOperatorOrgId || !nextMarketOrgId) {
        throw new PreTourError(
          400,
          "VALIDATION_ERROR",
          "Operator and market are required for pre-tour plans."
        );
      }
      if (nextOperatorOrgId === nextMarketOrgId) {
        throw new PreTourError(
          400,
          "VALIDATION_ERROR",
          "Operator and market organizations must be different."
        );
      }

      if (parsed.data.operatorOrgId) {
        await ensureOrganizationType(
          companyId,
          parsed.data.operatorOrgId,
          ["OPERATOR", "SUPPLIER"],
          "INVALID_OPERATOR_ORGANIZATION"
        );
      }
      if (parsed.data.marketOrgId) {
        await ensureOrganizationType(
          companyId,
          parsed.data.marketOrgId,
          ["MARKET"],
          "INVALID_MARKET_ORGANIZATION"
        );
      }

      const [updated] = await db
        .update(schema.preTourPlan)
        .set({
          ...parsed.data,
          updatedByUserId: userId,
          updatedByName: userName,
          startDate: parsed.data.startDate ? toDate(parsed.data.startDate) : undefined,
          endDate: parsed.data.endDate ? toDate(parsed.data.endDate) : undefined,
          baseCurrencyCode: currencyContext.baseCurrencyCode,
          exchangeRateMode: currencyContext.exchangeRateMode,
          exchangeRate: toDecimal(currencyContext.exchangeRate, 8) ?? "0",
          exchangeRateDate: currencyContext.exchangeRateDate,
          baseTotal:
            parsed.data.baseTotal !== undefined ? toDecimal(parsed.data.baseTotal) : undefined,
          taxTotal: parsed.data.taxTotal !== undefined ? toDecimal(parsed.data.taxTotal) : undefined,
          grandTotal:
            parsed.data.grandTotal !== undefined ? toDecimal(parsed.data.grandTotal) : undefined,
          updatedAt: new Date(),
        } as any)
        .where(and(eq(schema.preTourPlan.id, id), eq(schema.preTourPlan.companyId, companyId)))
        .returning();

      if (!updated) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour plan not found.");
      }

      return updated;
    }

    case "pre-tour-days": {
      const parsed = updatePreTourDaySchema.safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      if (parsed.data.planId) {
        await ensurePlan(companyId, parsed.data.planId);
      }

      const [updated] = await db
        .update(schema.preTourPlanDay)
        .set({
          ...parsed.data,
          date: parsed.data.date ? toDate(parsed.data.date) : undefined,
          updatedAt: new Date(),
        } as any)
        .where(and(eq(schema.preTourPlanDay.id, id), eq(schema.preTourPlanDay.companyId, companyId)))
        .returning();

      if (!updated) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour day not found.");
      }

      return updated;
    }

    case "pre-tour-items": {
      const parsed = updatePreTourItemSchema.safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      if (parsed.data.planId) {
        await ensurePlan(companyId, parsed.data.planId);
      }

      if (parsed.data.dayId) {
        await ensureDay(companyId, parsed.data.dayId);
      }

      const [current] = await db
        .select({
          itemType: schema.preTourPlanItem.itemType,
          serviceId: schema.preTourPlanItem.serviceId,
          pax: schema.preTourPlanItem.pax,
          pricingSnapshot: schema.preTourPlanItem.pricingSnapshot,
        })
        .from(schema.preTourPlanItem)
        .where(and(eq(schema.preTourPlanItem.id, id), eq(schema.preTourPlanItem.companyId, companyId)))
        .limit(1);
      if (!current) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour item not found.");
      }

      await validateTransportPaxCapacity(companyId, {
        itemType: (parsed.data.itemType ?? current.itemType) as string,
        serviceId: (parsed.data.serviceId ?? current.serviceId) as string | null,
        pax:
          parsed.data.pax !== undefined
            ? (parsed.data.pax ?? null)
            : (typeof current.pax === "number" ? current.pax : Number(current.pax ?? 0)),
        pricingSnapshot: parsed.data.pricingSnapshot ?? current.pricingSnapshot ?? null,
      });

      const [updated] = await db
        .update(schema.preTourPlanItem)
        .set({
          ...parsed.data,
          startAt: parsed.data.startAt !== undefined ? toDate(parsed.data.startAt) : undefined,
          endAt: parsed.data.endAt !== undefined ? toDate(parsed.data.endAt) : undefined,
          units: parsed.data.units !== undefined ? toDecimal(parsed.data.units) : undefined,
          baseAmount:
            parsed.data.baseAmount !== undefined ? toDecimal(parsed.data.baseAmount) : undefined,
          taxAmount: parsed.data.taxAmount !== undefined ? toDecimal(parsed.data.taxAmount) : undefined,
          totalAmount:
            parsed.data.totalAmount !== undefined ? toDecimal(parsed.data.totalAmount) : undefined,
          updatedAt: new Date(),
        } as any)
        .where(and(eq(schema.preTourPlanItem.id, id), eq(schema.preTourPlanItem.companyId, companyId)))
        .returning();

      if (!updated) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour item not found.");
      }

      return updated;
    }

    case "pre-tour-item-addons": {
      const parsed = updatePreTourItemAddonSchema.safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      if (parsed.data.planId) {
        await ensurePlan(companyId, parsed.data.planId);
      }

      if (parsed.data.planItemId) {
        await ensureItem(companyId, parsed.data.planItemId);
      }

      const [updated] = await db
        .update(schema.preTourPlanItemAddon)
        .set({
          ...parsed.data,
          qty: parsed.data.qty !== undefined ? toDecimal(parsed.data.qty) : undefined,
          baseAmount:
            parsed.data.baseAmount !== undefined ? toDecimal(parsed.data.baseAmount) : undefined,
          taxAmount: parsed.data.taxAmount !== undefined ? toDecimal(parsed.data.taxAmount) : undefined,
          totalAmount:
            parsed.data.totalAmount !== undefined ? toDecimal(parsed.data.totalAmount) : undefined,
          updatedAt: new Date(),
        } as any)
        .where(
          and(
            eq(schema.preTourPlanItemAddon.id, id),
            eq(schema.preTourPlanItemAddon.companyId, companyId)
          )
        )
        .returning();

      if (!updated) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour addon not found.");
      }

      return updated;
    }

    case "pre-tour-totals": {
      const parsed = updatePreTourTotalSchema.safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      if (parsed.data.planId) {
        await ensurePlan(companyId, parsed.data.planId);
      }

      const [updated] = await db
        .update(schema.preTourPlanTotal)
        .set({
          ...parsed.data,
          baseTotal:
            parsed.data.baseTotal !== undefined ? toDecimal(parsed.data.baseTotal) : undefined,
          taxTotal: parsed.data.taxTotal !== undefined ? toDecimal(parsed.data.taxTotal) : undefined,
          grandTotal:
            parsed.data.grandTotal !== undefined ? toDecimal(parsed.data.grandTotal) : undefined,
          updatedAt: new Date(),
        } as any)
        .where(and(eq(schema.preTourPlanTotal.id, id), eq(schema.preTourPlanTotal.companyId, companyId)))
        .returning();

      if (!updated) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour total not found.");
      }

      return updated;
    }

    case "pre-tour-categories": {
      const parsed = updatePreTourCategorySchema.safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      const [current] = await db
        .select({
          planId: schema.preTourPlanCategory.planId,
          typeId: schema.preTourPlanCategory.typeId,
          categoryId: schema.preTourPlanCategory.categoryId,
        })
        .from(schema.preTourPlanCategory)
        .where(
          and(
            eq(schema.preTourPlanCategory.id, id),
            eq(schema.preTourPlanCategory.companyId, companyId)
          )
        )
        .limit(1);
      if (!current) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour category not found.");
      }

      const nextPlanId = parsed.data.planId ?? current.planId;
      const nextTypeId = parsed.data.typeId ?? current.typeId;
      const nextCategoryId = parsed.data.categoryId ?? current.categoryId;

      if (parsed.data.planId) await ensurePlan(companyId, parsed.data.planId);
      await ensurePreTourCategoryTypeLimit(companyId, {
        planId: String(nextPlanId),
        typeId: String(nextTypeId),
        categoryId: String(nextCategoryId),
        currentRecordId: id,
      });

      const [updated] = await db
        .update(schema.preTourPlanCategory)
        .set({
          ...parsed.data,
          updatedAt: new Date(),
        } as any)
        .where(
          and(
            eq(schema.preTourPlanCategory.id, id),
            eq(schema.preTourPlanCategory.companyId, companyId)
          )
        )
        .returning();

      if (!updated) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour category not found.");
      }
      return updated;
    }

    case "pre-tour-technical-visits": {
      const parsed = updatePreTourTechnicalVisitSchema.safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      const [current] = await db
        .select({
          planId: schema.preTourPlanTechnicalVisit.planId,
          dayId: schema.preTourPlanTechnicalVisit.dayId,
          technicalVisitId: schema.preTourPlanTechnicalVisit.technicalVisitId,
        })
        .from(schema.preTourPlanTechnicalVisit)
        .where(
          and(
            eq(schema.preTourPlanTechnicalVisit.id, id),
            eq(schema.preTourPlanTechnicalVisit.companyId, companyId)
          )
        )
        .limit(1);

      if (!current) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour technical visit not found.");
      }

      const nextPlanId = parsed.data.planId ?? current.planId;
      const nextDayId = parsed.data.dayId === null ? null : (parsed.data.dayId ?? current.dayId);
      const nextTechnicalVisitId = parsed.data.technicalVisitId ?? current.technicalVisitId;

      if (parsed.data.planId) await ensurePlan(companyId, parsed.data.planId);
      if (nextDayId) {
        const day = await ensureDay(companyId, String(nextDayId));
        if (String(day.planId) !== String(nextPlanId)) {
          throw new PreTourError(
            400,
            "VALIDATION_ERROR",
            "Selected day does not belong to selected pre-tour plan."
          );
        }
      }
      await ensureTechnicalVisit(companyId, String(nextTechnicalVisitId));

      const [updated] = await db
        .update(schema.preTourPlanTechnicalVisit)
        .set({
          ...parsed.data,
          updatedAt: new Date(),
        } as any)
        .where(
          and(
            eq(schema.preTourPlanTechnicalVisit.id, id),
            eq(schema.preTourPlanTechnicalVisit.companyId, companyId)
          )
        )
        .returning();
      if (!updated) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour technical visit not found.");
      }
      return updated;
    }

    case "pre-tour-bins": {
      if (role !== "ADMIN") {
        throw new PreTourError(
          403,
          "PERMISSION_DENIED",
          "Only Admin can restore records from bin."
        );
      }
      const parsed = z
        .object({ action: z.enum(["RESTORE"]) })
        .safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      const [binRecord] = await db
        .select()
        .from(schema.preTourPlanBin)
        .where(and(eq(schema.preTourPlanBin.id, id), eq(schema.preTourPlanBin.companyId, companyId)))
        .limit(1);
      if (!binRecord) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour bin record not found.");
      }

      const [restored] = await db.transaction(async (tx) => {
        const [updatedPlan] = await tx
          .update(schema.preTourPlan)
          .set({
            deletedAt: null,
            deletedByUserId: null,
            deletedByName: null,
            isActive: true,
            updatedByUserId: userId,
            updatedByName: userName,
            updatedAt: new Date(),
          } as any)
          .where(
            and(
              eq(schema.preTourPlan.id, String(binRecord.planId)),
              eq(schema.preTourPlan.companyId, companyId)
            )
          )
          .returning();

        await tx
          .delete(schema.preTourPlanBin)
          .where(and(eq(schema.preTourPlanBin.id, id), eq(schema.preTourPlanBin.companyId, companyId)));

        return [updatedPlan];
      });

      if (!restored) {
        throw new PreTourError(404, "NOT_FOUND", "Original pre-tour plan not found.");
      }
      return restored;
    }

    default:
      throw new PreTourError(404, "RESOURCE_NOT_FOUND", "Pre-tour resource not found.");
  }
}

export async function deletePreTourRecord(
  resourceInput: string,
  id: string,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const access = await ensureWritable(headers, resource);
  const { companyId, userId, userName } = access;

  switch (resource) {
    case "pre-tours": {
      const [current] = await db
        .select()
        .from(schema.preTourPlan)
        .where(
          and(
            eq(schema.preTourPlan.id, id),
            eq(schema.preTourPlan.companyId, companyId),
            isNull(schema.preTourPlan.deletedAt)
          )
        )
        .limit(1);
      if (!current) throw new PreTourError(404, "NOT_FOUND", "Pre-tour plan not found.");

      const deletedAt = new Date();

      await db.transaction(async (tx) => {
        await tx
          .update(schema.preTourPlan)
          .set({
            isActive: false,
            deletedAt,
            deletedByUserId: userId,
            deletedByName: userName,
            updatedByUserId: userId,
            updatedByName: userName,
            updatedAt: deletedAt,
          } as any)
          .where(and(eq(schema.preTourPlan.id, id), eq(schema.preTourPlan.companyId, companyId)));

        await tx.insert(schema.preTourPlanBin).values({
          companyId,
          planId: id,
          programCode: "PRE_TOUR",
          code: String(current.code),
          referenceNo: String(current.referenceNo),
          planCode: String(current.planCode),
          title: String(current.title),
          deletedByUserId: userId,
          deletedByName: userName,
          deletedAt,
          snapshot: current as Record<string, unknown>,
        } as any).onConflictDoNothing({ target: [schema.preTourPlanBin.planId] });
      });
      return;
    }
    case "pre-tour-bins": {
      if (access.role !== "ADMIN") {
        throw new PreTourError(
          403,
          "PERMISSION_DENIED",
          "Only Admin can permanently delete records from bin."
        );
      }

      const [binRecord] = await db
        .select({ id: schema.preTourPlanBin.id, planId: schema.preTourPlanBin.planId })
        .from(schema.preTourPlanBin)
        .where(and(eq(schema.preTourPlanBin.id, id), eq(schema.preTourPlanBin.companyId, companyId)))
        .limit(1);
      if (!binRecord) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour bin record not found.");
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(schema.preTourPlanBin)
          .where(and(eq(schema.preTourPlanBin.id, id), eq(schema.preTourPlanBin.companyId, companyId)));
        await tx
          .delete(schema.preTourPlan)
          .where(
            and(
              eq(schema.preTourPlan.id, String(binRecord.planId)),
              eq(schema.preTourPlan.companyId, companyId)
            )
          );
      });
      return;
    }
    case "pre-tour-days": {
      const [deleted] = await db
        .delete(schema.preTourPlanDay)
        .where(and(eq(schema.preTourPlanDay.id, id), eq(schema.preTourPlanDay.companyId, companyId)))
        .returning({ id: schema.preTourPlanDay.id });
      if (!deleted) throw new PreTourError(404, "NOT_FOUND", "Pre-tour day not found.");
      return;
    }
    case "pre-tour-items": {
      const [deleted] = await db
        .delete(schema.preTourPlanItem)
        .where(and(eq(schema.preTourPlanItem.id, id), eq(schema.preTourPlanItem.companyId, companyId)))
        .returning({ id: schema.preTourPlanItem.id });
      if (!deleted) throw new PreTourError(404, "NOT_FOUND", "Pre-tour item not found.");
      return;
    }
    case "pre-tour-item-addons": {
      const [deleted] = await db
        .delete(schema.preTourPlanItemAddon)
        .where(
          and(
            eq(schema.preTourPlanItemAddon.id, id),
            eq(schema.preTourPlanItemAddon.companyId, companyId)
          )
        )
        .returning({ id: schema.preTourPlanItemAddon.id });
      if (!deleted) throw new PreTourError(404, "NOT_FOUND", "Pre-tour addon not found.");
      return;
    }
    case "pre-tour-totals": {
      const [deleted] = await db
        .delete(schema.preTourPlanTotal)
        .where(and(eq(schema.preTourPlanTotal.id, id), eq(schema.preTourPlanTotal.companyId, companyId)))
        .returning({ id: schema.preTourPlanTotal.id });
      if (!deleted) throw new PreTourError(404, "NOT_FOUND", "Pre-tour total not found.");
      return;
    }
    case "pre-tour-categories": {
      const [deleted] = await db
        .delete(schema.preTourPlanCategory)
        .where(
          and(
            eq(schema.preTourPlanCategory.id, id),
            eq(schema.preTourPlanCategory.companyId, companyId)
          )
        )
        .returning({ id: schema.preTourPlanCategory.id });
      if (!deleted) throw new PreTourError(404, "NOT_FOUND", "Pre-tour category not found.");
      return;
    }
    case "pre-tour-technical-visits": {
      const [deleted] = await db
        .delete(schema.preTourPlanTechnicalVisit)
        .where(
          and(
            eq(schema.preTourPlanTechnicalVisit.id, id),
            eq(schema.preTourPlanTechnicalVisit.companyId, companyId)
          )
        )
        .returning({ id: schema.preTourPlanTechnicalVisit.id });
      if (!deleted) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour technical visit not found.");
      }
      return;
    }
    default:
      throw new PreTourError(404, "RESOURCE_NOT_FOUND", "Pre-tour resource not found.");
  }
}

export function toPreTourErrorResponse(error: unknown) {
  if (error && typeof error === "object") {
    const dbError = error as { code?: string; constraint?: string; detail?: string };
    if (dbError.code === "23505") {
      if (dbError.constraint === "uq_pre_tour_plan_day_company_code") {
        return {
          status: 400,
          body: {
            code: "VALIDATION_ERROR",
            message: "Day code already exists in this company. Please use a unique code.",
          },
        };
      }
      return {
        status: 400,
        body: {
          code: "VALIDATION_ERROR",
          message: dbError.detail || "Duplicate record found. Please use unique values.",
        },
      };
    }
  }

  if (error instanceof PreTourError) {
    return {
      status: error.status,
      body: {
        code: error.code,
        message: error.message,
      },
    };
  }

  if (error instanceof z.ZodError) {
    return {
      status: 400,
      body: {
        code: "VALIDATION_ERROR",
        message: normalizeZodError(error),
      },
    };
  }

  console.error("[pre-tour-service] unexpected error", error);
  return {
    status: 500,
    body: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong. Please try again.",
    },
  };
}
