import { and, desc, eq, gte, ilike, isNull, lte, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import type { AppPrivilegeCode } from "@/lib/security/privileges";
import {
  createPreTourCategorySchema,
  createPreTourDaySchema,
  createPreTourGuideAllocationSchema,
  createPreTourItemAddonSchema,
  createPreTourItemSchema,
  createPreTourSchema,
  createPreTourTechnicalVisitSchema,
  createPreTourTotalSchema,
  preTourListQuerySchema,
  preTourResourceSchema,
  updatePreTourCategorySchema,
  updatePreTourDaySchema,
  updatePreTourGuideAllocationSchema,
  updatePreTourItemAddonSchema,
  updatePreTourItemSchema,
  updatePreTourSchema,
  updatePreTourTechnicalVisitSchema,
  updatePreTourTotalSchema,
} from "@/modules/pre-tour/shared/pre-tour-schemas";
import type { PreTourDayInitializationResult } from "@/modules/pre-tour/shared/pre-tour-day-initialization-types";

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

async function ensureGuideAllocation(companyId: string, id: string) {
  const [record] = await db
    .select({
      id: schema.preTourPlanGuideAllocation.id,
      planId: schema.preTourPlanGuideAllocation.planId,
      coverageMode: schema.preTourPlanGuideAllocation.coverageMode,
      startDayId: schema.preTourPlanGuideAllocation.startDayId,
      endDayId: schema.preTourPlanGuideAllocation.endDayId,
    })
    .from(schema.preTourPlanGuideAllocation)
    .where(
      and(
        eq(schema.preTourPlanGuideAllocation.id, id),
        eq(schema.preTourPlanGuideAllocation.companyId, companyId)
      )
    )
    .limit(1);

  if (!record) {
    throw new PreTourError(400, "GUIDE_ALLOCATION_NOT_FOUND", "Pre-tour guide allocation not found in this company.");
  }

  return record;
}

async function ensureGuideCoverageRange(
  companyId: string,
  input: { planId: string; coverageMode: string; startDayId?: string | null; endDayId?: string | null }
) {
  if (String(input.coverageMode).toUpperCase() !== "DAY_RANGE") return;
  if (!input.startDayId || !input.endDayId) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      "Start day and end day are required for a guide day-range allocation."
    );
  }

  const startDay = await ensureDay(companyId, input.startDayId);
  const endDay = await ensureDay(companyId, input.endDayId);
  if (String(startDay.planId) !== input.planId || String(endDay.planId) !== input.planId) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      "Guide coverage days must belong to the selected pre-tour plan."
    );
  }

  const [startBounds] = await db
    .select({ dayNumber: schema.preTourPlanDay.dayNumber })
    .from(schema.preTourPlanDay)
    .where(eq(schema.preTourPlanDay.id, input.startDayId))
    .limit(1);

  const [endBounds] = await db
    .select({ dayNumber: schema.preTourPlanDay.dayNumber })
    .from(schema.preTourPlanDay)
    .where(eq(schema.preTourPlanDay.id, input.endDayId))
    .limit(1);

  if (!startBounds || !endBounds) return;
  if (Number(startBounds.dayNumber) > Number(endBounds.dayNumber)) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      "Guide coverage start day cannot be after the end day."
    );
  }
}

async function ensureUniqueDayNumber(
  companyId: string,
  input: { planId: string; dayNumber: number; excludeDayId?: string }
) {
  const [existing] = await db
    .select({ id: schema.preTourPlanDay.id })
    .from(schema.preTourPlanDay)
    .where(
      and(
        eq(schema.preTourPlanDay.companyId, companyId),
        eq(schema.preTourPlanDay.planId, input.planId),
        eq(schema.preTourPlanDay.dayNumber, input.dayNumber),
        input.excludeDayId ? ne(schema.preTourPlanDay.id, input.excludeDayId) : undefined
      )
    )
    .limit(1);

  if (existing) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      `Day number ${input.dayNumber} already exists for this pre-tour plan.`
    );
  }
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

async function ensureTourCategoryRule(companyId: string, categoryId: string) {
  const [record] = await db
    .select({
      id: schema.tourCategoryRule.id,
      categoryId: schema.tourCategoryRule.categoryId,
      requireHotel: schema.tourCategoryRule.requireHotel,
      requireTransport: schema.tourCategoryRule.requireTransport,
      requireItinerary: schema.tourCategoryRule.requireItinerary,
      requireActivity: schema.tourCategoryRule.requireActivity,
      requireCeremony: schema.tourCategoryRule.requireCeremony,
      allowMultipleHotels: schema.tourCategoryRule.allowMultipleHotels,
      allowWithoutHotel: schema.tourCategoryRule.allowWithoutHotel,
      allowWithoutTransport: schema.tourCategoryRule.allowWithoutTransport,
      minNights: schema.tourCategoryRule.minNights,
      maxNights: schema.tourCategoryRule.maxNights,
      minDays: schema.tourCategoryRule.minDays,
      maxDays: schema.tourCategoryRule.maxDays,
    })
    .from(schema.tourCategoryRule)
    .where(
      and(
        eq(schema.tourCategoryRule.companyId, companyId),
        eq(schema.tourCategoryRule.categoryId, categoryId),
        eq(schema.tourCategoryRule.isActive, true)
      )
    )
    .limit(1);

  if (!record) {
    throw new PreTourError(
      400,
      "TOUR_CATEGORY_RULE_NOT_FOUND",
      "Selected tour category does not have an active category rule."
    );
  }
  return record;
}

function isStrictPreTourStatus(status: unknown) {
  const normalized = String(status || "").toUpperCase();
  return (
    normalized === "APPROVED" ||
    normalized === "BOOKED" ||
    normalized === "IN_PROGRESS" ||
    normalized === "COMPLETED"
  );
}

function validateHeaderAgainstTourCategoryRule(input: {
  totalNights: number;
  startDate: string;
  endDate: string;
  rule: Awaited<ReturnType<typeof ensureTourCategoryRule>>;
}) {
  const { totalNights, startDate, endDate, rule } = input;
  const totalDaysFromNights = totalNights + 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dayDiffRaw = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const totalDays = Number.isFinite(dayDiffRaw) && dayDiffRaw > 0 ? dayDiffRaw : totalDaysFromNights;

  if (rule.minNights !== null && totalNights < Number(rule.minNights)) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      `Total nights must be at least ${rule.minNights} for selected category.`
    );
  }
  if (rule.maxNights !== null && totalNights > Number(rule.maxNights)) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      `Total nights cannot exceed ${rule.maxNights} for selected category.`
    );
  }
  if (rule.minDays !== null && totalDays < Number(rule.minDays)) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      `Total days must be at least ${rule.minDays} for selected category.`
    );
  }
  if (rule.maxDays !== null && totalDays > Number(rule.maxDays)) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      `Total days cannot exceed ${rule.maxDays} for selected category.`
    );
  }
}

async function validatePlanStructureAgainstCategoryRule(input: {
  companyId: string;
  planId: string;
  rule: Awaited<ReturnType<typeof ensureTourCategoryRule>>;
  requireComplete: boolean;
}) {
  const { companyId, planId, rule, requireComplete } = input;
  const days = await db
    .select({ id: schema.preTourPlanDay.id })
    .from(schema.preTourPlanDay)
    .where(
      and(
        eq(schema.preTourPlanDay.companyId, companyId),
        eq(schema.preTourPlanDay.planId, planId)
      )
    );
  const dayCount = days.length;

  const items = await db
    .select({ itemType: schema.preTourPlanItem.itemType })
    .from(schema.preTourPlanItem)
    .where(
      and(
        eq(schema.preTourPlanItem.companyId, companyId),
        eq(schema.preTourPlanItem.planId, planId)
      )
    );

  const itemCounts = new Map<string, number>();
  items.forEach((row) => {
    const key = String(row.itemType || "").toUpperCase();
    itemCounts.set(key, (itemCounts.get(key) ?? 0) + 1);
  });

  const accommodationCount = itemCounts.get("ACCOMMODATION") ?? 0;
  const transportCount = itemCounts.get("TRANSPORT") ?? 0;
  const activityCount = itemCounts.get("ACTIVITY") ?? 0;
  const ceremonyCount = itemCounts.get("CEREMONY") ?? 0;

  const mustHaveHotel = Boolean(rule.requireHotel) || !Boolean(rule.allowWithoutHotel);
  const mustHaveTransport = Boolean(rule.requireTransport) || !Boolean(rule.allowWithoutTransport);

  if (rule.maxDays !== null && dayCount > Number(rule.maxDays)) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      `This category allows a maximum of ${rule.maxDays} day records.`
    );
  }

  if (!rule.allowMultipleHotels && accommodationCount > 1) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      "This category allows only one accommodation item for the full pre-tour."
    );
  }

  if (!requireComplete) return;

  if (rule.requireItinerary && dayCount === 0) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      "Selected category requires itinerary/day records before this status."
    );
  }
  if (rule.minDays !== null && dayCount < Number(rule.minDays)) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      `Selected category requires at least ${rule.minDays} day records before this status.`
    );
  }
  if (mustHaveHotel && accommodationCount === 0) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      "Selected category requires at least one accommodation item."
    );
  }
  if (mustHaveTransport && transportCount === 0) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      "Selected category requires at least one transport item."
    );
  }
  if (rule.requireActivity && activityCount === 0) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      "Selected category requires at least one activity item."
    );
  }
  if (rule.requireCeremony && ceremonyCount === 0) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      "Selected category requires at least one ceremony item."
    );
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

async function ensureOperatorMarketCompatibility(
  companyId: string,
  operatorOrgId: string,
  marketOrgId: string
) {
  const contracts = await db
    .select({
      operatorOrgId: schema.businessOperatorMarketContract.operatorOrgId,
    })
    .from(schema.businessOperatorMarketContract)
    .where(
      and(
        eq(schema.businessOperatorMarketContract.companyId, companyId),
        eq(schema.businessOperatorMarketContract.marketOrgId, marketOrgId),
        eq(schema.businessOperatorMarketContract.isActive, true),
        eq(schema.businessOperatorMarketContract.status, "ACTIVE")
      )
    );

  // Allow onboarding flows where contracts are not configured yet.
  if (contracts.length === 0) return;

  const isMapped = contracts.some((row) => row.operatorOrgId === operatorOrgId);
  if (!isMapped) {
    throw new PreTourError(
      400,
      "INVALID_OPERATOR_MARKET_MAPPING",
      "Selected operator is not mapped to the selected market."
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

const clonePreTourVersionSchema = z.object({
  sourcePlanId: z.string().trim().min(1),
});

function normalizeCloneCode(value: string) {
  return value.trim().toUpperCase().slice(0, 80);
}

function buildCloneCode(prefix: string, suffix: string) {
  return normalizeCloneCode(`${prefix}_${suffix}`);
}

type PreTourPlanInsert = typeof schema.preTourPlan.$inferInsert;
type PreTourPlanDayInsert = typeof schema.preTourPlanDay.$inferInsert;
type PreTourPlanItemInsert = typeof schema.preTourPlanItem.$inferInsert;
type PreTourPlanGuideAllocationInsert = typeof schema.preTourPlanGuideAllocation.$inferInsert;
type PreTourPlanItemAddonInsert = typeof schema.preTourPlanItemAddon.$inferInsert;
type PreTourPlanTotalInsert = typeof schema.preTourPlanTotal.$inferInsert;
type PreTourPlanCategoryInsert = typeof schema.preTourPlanCategory.$inferInsert;
type PreTourPlanTechnicalVisitInsert = typeof schema.preTourPlanTechnicalVisit.$inferInsert;

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

const initializePreTourDaysSchema = z.object({
  planId: z.string().trim().min(1),
});

export async function initializePreTourDays(
  payload: unknown,
  headers: Headers
): Promise<PreTourDayInitializationResult> {
  const parsed = initializePreTourDaysSchema.safeParse(payload);
  if (!parsed.success) {
    throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const access = await ensureWritable(headers, "pre-tour-days");
  const companyId = access.companyId;

  const [plan] = await db
    .select({
      id: schema.preTourPlan.id,
      startDate: schema.preTourPlan.startDate,
      endDate: schema.preTourPlan.endDate,
      planCode: schema.preTourPlan.planCode,
      code: schema.preTourPlan.code,
    })
    .from(schema.preTourPlan)
    .where(
      and(
        eq(schema.preTourPlan.id, parsed.data.planId),
        eq(schema.preTourPlan.companyId, companyId)
      )
    )
    .limit(1);

  if (!plan) {
    throw new PreTourError(404, "NOT_FOUND", "Pre-tour plan not found.");
  }

  const expectedDayCount = toDayCount(
    plan.startDate instanceof Date ? plan.startDate.toISOString() : String(plan.startDate ?? ""),
    plan.endDate instanceof Date ? plan.endDate.toISOString() : String(plan.endDate ?? "")
  );
  if (expectedDayCount <= 0) {
    throw new PreTourError(400, "VALIDATION_ERROR", "Invalid plan date range. Update pre-tour header dates first.");
  }

  const existingDays = await db
    .select()
    .from(schema.preTourPlanDay)
    .where(
      and(
        eq(schema.preTourPlanDay.companyId, companyId),
        eq(schema.preTourPlanDay.planId, parsed.data.planId)
      )
    );

  const existingDayNumbers = new Set(
    existingDays
      .map((day) => Number(day.dayNumber))
      .filter((value) => Number.isFinite(value))
  );
  const createdDayNumbers: number[] = [];
  const baseCode = String(plan.planCode || plan.code || "PRE_TOUR")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const planStartDate = plan.startDate instanceof Date ? plan.startDate : new Date(String(plan.startDate));

  await db.transaction(async (tx) => {
    for (let dayNumber = 1; dayNumber <= expectedDayCount; dayNumber += 1) {
      if (existingDayNumbers.has(dayNumber)) continue;
      createdDayNumbers.push(dayNumber);
      await tx
        .insert(schema.preTourPlanDay)
        .values({
          companyId,
          planId: parsed.data.planId,
          code: `${baseCode}_DAY_${String(dayNumber).padStart(2, "0")}`.slice(0, 80),
          dayNumber,
          date: addDays(planStartDate.toISOString(), dayNumber - 1),
          title: `Day ${dayNumber}`,
          isActive: true,
        } as any)
        .onConflictDoNothing({
          target: [schema.preTourPlanDay.planId, schema.preTourPlanDay.dayNumber],
        });
    }
  });

  const days = await db
    .select()
    .from(schema.preTourPlanDay)
    .where(
      and(
        eq(schema.preTourPlanDay.companyId, companyId),
        eq(schema.preTourPlanDay.planId, parsed.data.planId)
      )
    )
    .orderBy(schema.preTourPlanDay.dayNumber);

  return {
    planId: parsed.data.planId,
    expectedDayCount,
    existingDayCount: existingDays.length,
    createdCount: createdDayNumbers.length,
    createdDayNumbers,
    days,
  };
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

    case "pre-tour-guide-allocations":
      return db
        .select()
        .from(schema.preTourPlanGuideAllocation)
        .where(
          and(
            eq(schema.preTourPlanGuideAllocation.companyId, companyId),
            planId ? eq(schema.preTourPlanGuideAllocation.planId, planId) : undefined,
            q
              ? or(
                  ilike(schema.preTourPlanGuideAllocation.code, q),
                  ilike(schema.preTourPlanGuideAllocation.coverageMode, q),
                  ilike(schema.preTourPlanGuideAllocation.language, q),
                  ilike(schema.preTourPlanGuideAllocation.guideBasis, q),
                  ilike(schema.preTourPlanGuideAllocation.title, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.preTourPlanGuideAllocation.createdAt))
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
      const normalizedPlanCode = parsed.data.planCode.trim().toUpperCase();

      validatePlanDateRange(parsed.data.startDate, parsed.data.endDate);
      await ensureTourCategory(companyId, parsed.data.categoryId);
      const categoryRule = await ensureTourCategoryRule(companyId, parsed.data.categoryId);
      validateHeaderAgainstTourCategoryRule({
        totalNights: parsed.data.totalNights,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        rule: categoryRule,
      });
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
        ["MARKET", "MARKETING"],
        "INVALID_MARKET_ORGANIZATION"
      );
      await ensureOperatorMarketCompatibility(
        companyId,
        parsed.data.operatorOrgId,
        parsed.data.marketOrgId
      );

      const referenceNo = parsed.data.referenceNo?.trim()
        ? parsed.data.referenceNo.trim().toUpperCase()
        : await generatePreTourReferenceNo(companyId);

      const [created] = await db
        .insert(schema.preTourPlan)
        .values({
          ...parsed.data,
          code: normalizedPlanCode,
          planCode: normalizedPlanCode,
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
      await ensureUniqueDayNumber(companyId, {
        planId: parsed.data.planId,
        dayNumber: parsed.data.dayNumber,
      });
      const [plan] = await db
        .select({
          categoryId: schema.preTourPlan.categoryId,
          status: schema.preTourPlan.status,
        })
        .from(schema.preTourPlan)
        .where(
          and(
            eq(schema.preTourPlan.id, parsed.data.planId),
            eq(schema.preTourPlan.companyId, companyId)
          )
        )
        .limit(1);
      if (!plan) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour plan not found.");
      }
      const categoryRule = await ensureTourCategoryRule(companyId, String(plan.categoryId));
      if (categoryRule.maxDays !== null) {
        const dayRows = await db
          .select({ id: schema.preTourPlanDay.id })
          .from(schema.preTourPlanDay)
          .where(
            and(
              eq(schema.preTourPlanDay.companyId, companyId),
              eq(schema.preTourPlanDay.planId, parsed.data.planId)
            )
          );
        if (dayRows.length + 1 > Number(categoryRule.maxDays)) {
          throw new PreTourError(
            400,
            "VALIDATION_ERROR",
            `This category allows a maximum of ${categoryRule.maxDays} day records.`
          );
        }
      }
      await validatePlanStructureAgainstCategoryRule({
        companyId,
        planId: parsed.data.planId,
        rule: categoryRule,
        requireComplete: false,
      });
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
      const [plan] = await db
        .select({
          categoryId: schema.preTourPlan.categoryId,
          status: schema.preTourPlan.status,
        })
        .from(schema.preTourPlan)
        .where(
          and(
            eq(schema.preTourPlan.id, parsed.data.planId),
            eq(schema.preTourPlan.companyId, companyId)
          )
        )
        .limit(1);
      if (!plan) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour plan not found.");
      }
      const categoryRule = await ensureTourCategoryRule(companyId, String(plan.categoryId));
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
      if (
        String(parsed.data.itemType || "").toUpperCase() === "ACCOMMODATION" &&
        !categoryRule.allowMultipleHotels
      ) {
        const existingAccommodation = await db
          .select({ id: schema.preTourPlanItem.id })
          .from(schema.preTourPlanItem)
          .where(
            and(
              eq(schema.preTourPlanItem.companyId, companyId),
              eq(schema.preTourPlanItem.planId, parsed.data.planId),
              eq(schema.preTourPlanItem.itemType, "ACCOMMODATION")
            )
          )
          .limit(1);
        if (existingAccommodation.length > 0) {
          throw new PreTourError(
            400,
            "VALIDATION_ERROR",
            "This category allows only one accommodation item for the full pre-tour."
          );
        }
      }

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

      await validatePlanStructureAgainstCategoryRule({
        companyId,
        planId: parsed.data.planId,
        rule: categoryRule,
        requireComplete: isStrictPreTourStatus(plan.status),
      });

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

    case "pre-tour-guide-allocations": {
      const parsed = createPreTourGuideAllocationSchema.safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      await ensurePlan(companyId, parsed.data.planId);
      await ensureGuideCoverageRange(companyId, {
        planId: parsed.data.planId,
        coverageMode: parsed.data.coverageMode,
        startDayId: parsed.data.startDayId ?? null,
        endDayId: parsed.data.endDayId ?? null,
      });

      const [created] = await db
        .insert(schema.preTourPlanGuideAllocation)
        .values({
          ...parsed.data,
          companyId,
          units: toDecimal(parsed.data.units),
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

export async function createPreTourVersionFromPlan(payload: unknown, headers: Headers) {
  const parsed = clonePreTourVersionSchema.safeParse(payload);
  if (!parsed.success) {
    throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const access = await ensureWritable(headers, "pre-tours");
  const { companyId, userId, userName } = access;

  const [sourcePlan] = await db
    .select()
    .from(schema.preTourPlan)
    .where(
      and(
        eq(schema.preTourPlan.id, parsed.data.sourcePlanId),
        eq(schema.preTourPlan.companyId, companyId),
        isNull(schema.preTourPlan.deletedAt)
      )
    )
    .limit(1);

  if (!sourcePlan) {
    throw new PreTourError(404, "PLAN_NOT_FOUND", "Source pre-tour plan not found.");
  }

  if (!sourcePlan.categoryId || !sourcePlan.operatorOrgId || !sourcePlan.marketOrgId) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      "Source pre-tour must have Category, Operator and Market before creating a version."
    );
  }

  const sourceReferenceNo = String(
    sourcePlan.referenceNo || sourcePlan.planCode || sourcePlan.code || ""
  )
    .trim()
    .toUpperCase();
  if (!sourceReferenceNo) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      "Source pre-tour reference number is missing."
    );
  }

  const sourcePlanCode = normalizeCloneCode(
    String(sourcePlan.planCode || sourcePlan.code || "PRE_TOUR")
  );
  if (!sourcePlanCode) {
    throw new PreTourError(400, "VALIDATION_ERROR", "Source pre-tour code is invalid.");
  }

  const [latestVersion] = await db
    .select({ version: schema.preTourPlan.version })
    .from(schema.preTourPlan)
    .where(
      and(
        eq(schema.preTourPlan.companyId, companyId),
        eq(schema.preTourPlan.referenceNo, sourceReferenceNo),
        isNull(schema.preTourPlan.deletedAt)
      )
    )
    .orderBy(desc(schema.preTourPlan.version), desc(schema.preTourPlan.createdAt))
    .limit(1);

  const nextVersion = Number(latestVersion?.version ?? sourcePlan.version ?? 1) + 1;
  const codePrefix = normalizeCloneCode(`${sourcePlanCode}_V${nextVersion}`);

  validatePlanDateRange(
    sourcePlan.startDate.toISOString(),
    sourcePlan.endDate.toISOString()
  );
  await ensureTourCategory(companyId, sourcePlan.categoryId);
  const categoryRule = await ensureTourCategoryRule(companyId, sourcePlan.categoryId);
  validateHeaderAgainstTourCategoryRule({
    totalNights: Number(sourcePlan.totalNights ?? 0),
    startDate: sourcePlan.startDate.toISOString(),
    endDate: sourcePlan.endDate.toISOString(),
    rule: categoryRule,
  });
  if (sourcePlan.operatorOrgId === sourcePlan.marketOrgId) {
    throw new PreTourError(
      400,
      "VALIDATION_ERROR",
      "Operator and market organizations must be different."
    );
  }
  await ensureOrganizationType(
    companyId,
    sourcePlan.operatorOrgId,
    ["OPERATOR", "SUPPLIER"],
    "INVALID_OPERATOR_ORGANIZATION"
  );
  await ensureOrganizationType(
    companyId,
    sourcePlan.marketOrgId,
    ["MARKET", "MARKETING"],
    "INVALID_MARKET_ORGANIZATION"
  );
  await ensureOperatorMarketCompatibility(
    companyId,
    sourcePlan.operatorOrgId,
    sourcePlan.marketOrgId
  );
  const currencyContext = await resolvePreTourCurrencyContext(companyId, {
    planCurrencyCode: sourcePlan.currencyCode,
    startDate: sourcePlan.startDate.toISOString(),
    exchangeRateMode:
      sourcePlan.exchangeRateMode === "MANUAL" ? "MANUAL" : "AUTO",
    exchangeRate: Number(sourcePlan.exchangeRate ?? 0),
    exchangeRateDate: sourcePlan.exchangeRateDate?.toISOString() ?? null,
  });

  const canCloneTotals =
    access.role === "ADMIN" ||
    access.role === "MANAGER" ||
    access.privileges.includes("PRE_TOUR_COSTING");

  return db.transaction(async (tx) => {
    const [createdPlan] = await tx
      .insert(schema.preTourPlan)
      .values({
        companyId,
        code: codePrefix,
        customerId: sourcePlan.customerId,
        agentId: sourcePlan.agentId,
        leadId: sourcePlan.leadId,
        operatorOrgId: sourcePlan.operatorOrgId,
        marketOrgId: sourcePlan.marketOrgId,
        categoryId: sourcePlan.categoryId,
        referenceNo: sourceReferenceNo,
        planCode: codePrefix,
        title: String(sourcePlan.title || "Pre-Tour"),
        status: "DRAFT",
        startDate: sourcePlan.startDate,
        endDate: sourcePlan.endDate,
        totalNights: sourcePlan.totalNights,
        adults: sourcePlan.adults,
        children: sourcePlan.children,
        infants: sourcePlan.infants,
        preferredLanguage: sourcePlan.preferredLanguage,
        roomPreference: sourcePlan.roomPreference,
        mealPreference: sourcePlan.mealPreference,
        notes: sourcePlan.notes,
        currencyCode: sourcePlan.currencyCode,
        baseCurrencyCode: currencyContext.baseCurrencyCode,
        exchangeRateMode: currencyContext.exchangeRateMode,
        exchangeRate: toDecimal(currencyContext.exchangeRate, 8) ?? "0",
        exchangeRateDate: currencyContext.exchangeRateDate,
        priceMode: sourcePlan.priceMode,
        pricingPolicy: sourcePlan.pricingPolicy,
        baseTotal: toDecimal(sourcePlan.baseTotal),
        taxTotal: toDecimal(sourcePlan.taxTotal),
        grandTotal: toDecimal(sourcePlan.grandTotal),
        version: nextVersion,
        isLocked: false,
        isActive: Boolean(sourcePlan.isActive ?? true),
        updatedByUserId: userId,
        updatedByName: userName,
        deletedAt: null,
        deletedByUserId: null,
        deletedByName: null,
      } satisfies PreTourPlanInsert)
      .returning();

    const sourceDays = await tx
      .select()
      .from(schema.preTourPlanDay)
      .where(
        and(
          eq(schema.preTourPlanDay.companyId, companyId),
          eq(schema.preTourPlanDay.planId, sourcePlan.id)
        )
      )
      .orderBy(schema.preTourPlanDay.dayNumber, schema.preTourPlanDay.createdAt);

    const dayIdMap = new Map<string, string>();
    for (const sourceDay of sourceDays) {
      const [createdDay] = await tx
        .insert(schema.preTourPlanDay)
        .values({
          companyId,
          code: buildCloneCode(
            codePrefix,
            `DAY_${String(sourceDay.dayNumber).padStart(2, "0")}`
          ),
          planId: createdPlan.id,
          dayNumber: sourceDay.dayNumber,
          date: sourceDay.date,
          title: sourceDay.title,
          notes: sourceDay.notes,
          startLocationId: sourceDay.startLocationId,
          endLocationId: sourceDay.endLocationId,
          isActive: Boolean(sourceDay.isActive ?? true),
        } satisfies PreTourPlanDayInsert)
        .returning({ id: schema.preTourPlanDay.id });
      dayIdMap.set(sourceDay.id, createdDay.id);
    }

    const sourceItems = await tx
      .select()
      .from(schema.preTourPlanItem)
      .where(
        and(
          eq(schema.preTourPlanItem.companyId, companyId),
          eq(schema.preTourPlanItem.planId, sourcePlan.id)
        )
      )
      .orderBy(
        schema.preTourPlanItem.dayId,
        schema.preTourPlanItem.sortOrder,
        schema.preTourPlanItem.createdAt
      );

    const itemIdMap = new Map<string, string>();
    for (const sourceItem of sourceItems) {
      const mappedDayId = dayIdMap.get(sourceItem.dayId);
      if (!mappedDayId) continue;
      const [createdItem] = await tx
        .insert(schema.preTourPlanItem)
        .values({
          companyId,
          code: buildCloneCode(codePrefix, `ITEM_${sourceItem.id.slice(-6)}`),
          planId: createdPlan.id,
          dayId: mappedDayId,
          itemType: sourceItem.itemType,
          serviceId: sourceItem.serviceId,
          startAt: sourceItem.startAt,
          endAt: sourceItem.endAt,
          sortOrder: sourceItem.sortOrder,
          pax: sourceItem.pax,
          units: sourceItem.units,
          nights: sourceItem.nights,
          rooms: sourceItem.rooms,
          fromLocationId: sourceItem.fromLocationId,
          toLocationId: sourceItem.toLocationId,
          locationId: sourceItem.locationId,
          rateId: sourceItem.rateId,
          currencyCode: sourceItem.currencyCode,
          priceMode: sourceItem.priceMode,
          baseAmount: sourceItem.baseAmount,
          taxAmount: sourceItem.taxAmount,
          totalAmount: sourceItem.totalAmount,
          pricingSnapshot: sourceItem.pricingSnapshot,
          title: sourceItem.title,
          description: sourceItem.description,
          notes: sourceItem.notes,
          status: sourceItem.status,
          isActive: Boolean(sourceItem.isActive ?? true),
        } satisfies PreTourPlanItemInsert)
        .returning({ id: schema.preTourPlanItem.id });
      itemIdMap.set(sourceItem.id, createdItem.id);
    }

    const sourceGuideAllocations = await tx
      .select()
      .from(schema.preTourPlanGuideAllocation)
      .where(
        and(
          eq(schema.preTourPlanGuideAllocation.companyId, companyId),
          eq(schema.preTourPlanGuideAllocation.planId, sourcePlan.id)
        )
      )
      .orderBy(schema.preTourPlanGuideAllocation.createdAt);

    for (const sourceGuideAllocation of sourceGuideAllocations) {
      await tx.insert(schema.preTourPlanGuideAllocation).values({
        companyId,
        code: buildCloneCode(codePrefix, `GUIDE_${sourceGuideAllocation.id.slice(-6)}`),
        planId: createdPlan.id,
        serviceId: sourceGuideAllocation.serviceId,
        coverageMode: sourceGuideAllocation.coverageMode,
        startDayId: sourceGuideAllocation.startDayId
          ? (dayIdMap.get(sourceGuideAllocation.startDayId) ?? null)
          : null,
        endDayId: sourceGuideAllocation.endDayId
          ? (dayIdMap.get(sourceGuideAllocation.endDayId) ?? null)
          : null,
        language: sourceGuideAllocation.language,
        guideBasis: sourceGuideAllocation.guideBasis,
        pax: sourceGuideAllocation.pax,
        units: sourceGuideAllocation.units,
        rateId: sourceGuideAllocation.rateId,
        currencyCode: sourceGuideAllocation.currencyCode,
        priceMode: sourceGuideAllocation.priceMode,
        baseAmount: sourceGuideAllocation.baseAmount,
        taxAmount: sourceGuideAllocation.taxAmount,
        totalAmount: sourceGuideAllocation.totalAmount,
        pricingSnapshot: sourceGuideAllocation.pricingSnapshot,
        title: sourceGuideAllocation.title,
        notes: sourceGuideAllocation.notes,
        status: sourceGuideAllocation.status,
        isActive: Boolean(sourceGuideAllocation.isActive ?? true),
      } satisfies PreTourPlanGuideAllocationInsert);
    }

    const sourceAddons = await tx
      .select()
      .from(schema.preTourPlanItemAddon)
      .where(
        and(
          eq(schema.preTourPlanItemAddon.companyId, companyId),
          eq(schema.preTourPlanItemAddon.planId, sourcePlan.id)
        )
      )
      .orderBy(schema.preTourPlanItemAddon.createdAt);

    for (const sourceAddon of sourceAddons) {
      const mappedItemId = itemIdMap.get(sourceAddon.planItemId);
      if (!mappedItemId) continue;
      await tx.insert(schema.preTourPlanItemAddon).values({
        companyId,
        code: buildCloneCode(codePrefix, `ADDON_${sourceAddon.id.slice(-6)}`),
        planId: createdPlan.id,
        planItemId: mappedItemId,
        addonType: sourceAddon.addonType,
        addonServiceId: sourceAddon.addonServiceId,
        title: sourceAddon.title,
        qty: sourceAddon.qty,
        currencyCode: sourceAddon.currencyCode,
        baseAmount: sourceAddon.baseAmount,
        taxAmount: sourceAddon.taxAmount,
        totalAmount: sourceAddon.totalAmount,
        snapshot: sourceAddon.snapshot,
        isActive: Boolean(sourceAddon.isActive ?? true),
      } satisfies PreTourPlanItemAddonInsert);
    }

    if (canCloneTotals) {
      const sourceTotals = await tx
        .select()
        .from(schema.preTourPlanTotal)
        .where(
          and(
            eq(schema.preTourPlanTotal.companyId, companyId),
            eq(schema.preTourPlanTotal.planId, sourcePlan.id)
          )
        )
        .limit(1);

      for (const sourceTotal of sourceTotals) {
        await tx.insert(schema.preTourPlanTotal).values({
          companyId,
          code: buildCloneCode(codePrefix, "TOTAL"),
          planId: createdPlan.id,
          currencyCode: sourceTotal.currencyCode,
          totalsByType: sourceTotal.totalsByType,
          baseTotal: sourceTotal.baseTotal,
          taxTotal: sourceTotal.taxTotal,
          grandTotal: sourceTotal.grandTotal,
          snapshot: sourceTotal.snapshot,
          isActive: Boolean(sourceTotal.isActive ?? true),
        } satisfies PreTourPlanTotalInsert);
      }
    }

    const sourceCategories = await tx
      .select()
      .from(schema.preTourPlanCategory)
      .where(
        and(
          eq(schema.preTourPlanCategory.companyId, companyId),
          eq(schema.preTourPlanCategory.planId, sourcePlan.id)
        )
      )
      .orderBy(schema.preTourPlanCategory.createdAt);

    for (const sourceCategory of sourceCategories) {
      await tx.insert(schema.preTourPlanCategory).values({
        companyId,
        code: buildCloneCode(codePrefix, `CAT_${sourceCategory.id.slice(-6)}`),
        planId: createdPlan.id,
        typeId: sourceCategory.typeId,
        categoryId: sourceCategory.categoryId,
        notes: sourceCategory.notes,
        isActive: Boolean(sourceCategory.isActive ?? true),
      } satisfies PreTourPlanCategoryInsert);
    }

    const sourceTechnicalVisits = await tx
      .select()
      .from(schema.preTourPlanTechnicalVisit)
      .where(
        and(
          eq(schema.preTourPlanTechnicalVisit.companyId, companyId),
          eq(schema.preTourPlanTechnicalVisit.planId, sourcePlan.id)
        )
      )
      .orderBy(schema.preTourPlanTechnicalVisit.createdAt);

    for (const sourceTechnicalVisit of sourceTechnicalVisits) {
      await tx.insert(schema.preTourPlanTechnicalVisit).values({
        companyId,
        code: buildCloneCode(codePrefix, `TV_${sourceTechnicalVisit.id.slice(-6)}`),
        planId: createdPlan.id,
        dayId: sourceTechnicalVisit.dayId
          ? (dayIdMap.get(sourceTechnicalVisit.dayId) ?? null)
          : null,
        technicalVisitId: sourceTechnicalVisit.technicalVisitId,
        notes: sourceTechnicalVisit.notes,
        isActive: Boolean(sourceTechnicalVisit.isActive ?? true),
      } satisfies PreTourPlanTechnicalVisitInsert);
    }

    return createdPlan;
  });
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
          categoryId: schema.preTourPlan.categoryId,
          status: schema.preTourPlan.status,
          totalNights: schema.preTourPlan.totalNights,
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
      const nextCategoryId = parsed.data.categoryId ?? current.categoryId;
      const nextStatus = parsed.data.status ?? String(current.status || "DRAFT");
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
      const nextTotalNights =
        parsed.data.totalNights !== undefined
          ? parsed.data.totalNights
          : Number(current.totalNights ?? 0);

      validatePlanDateRange(nextStartDateRaw, nextEndDateRaw);
      await ensureTourCategory(companyId, nextCategoryId);
      const categoryRule = await ensureTourCategoryRule(companyId, nextCategoryId);
      validateHeaderAgainstTourCategoryRule({
        totalNights: Number(nextTotalNights),
        startDate: nextStartDateRaw,
        endDate: nextEndDateRaw,
        rule: categoryRule,
      });
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
          ["MARKET", "MARKETING"],
          "INVALID_MARKET_ORGANIZATION"
        );
      }
      await ensureOperatorMarketCompatibility(companyId, nextOperatorOrgId, nextMarketOrgId);
      await validatePlanStructureAgainstCategoryRule({
        companyId,
        planId: id,
        rule: categoryRule,
        requireComplete: isStrictPreTourStatus(nextStatus),
      });

      const [updated] = await db
        .update(schema.preTourPlan)
        .set({
          ...parsed.data,
          ...(parsed.data.planCode
            ? {
                code: parsed.data.planCode.trim().toUpperCase(),
                planCode: parsed.data.planCode.trim().toUpperCase(),
              }
            : {}),
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

      const [currentDay] = await db
        .select({
          id: schema.preTourPlanDay.id,
          planId: schema.preTourPlanDay.planId,
          dayNumber: schema.preTourPlanDay.dayNumber,
        })
        .from(schema.preTourPlanDay)
        .where(and(eq(schema.preTourPlanDay.id, id), eq(schema.preTourPlanDay.companyId, companyId)))
        .limit(1);

      if (!currentDay) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour day not found.");
      }

      const nextPlanId = String(parsed.data.planId ?? currentDay.planId);
      const nextDayNumber = Number(parsed.data.dayNumber ?? currentDay.dayNumber);

      if (parsed.data.planId) {
        await ensurePlan(companyId, parsed.data.planId);
      }
      await ensureUniqueDayNumber(companyId, {
        planId: nextPlanId,
        dayNumber: nextDayNumber,
        excludeDayId: id,
      });

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
          planId: schema.preTourPlanItem.planId,
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
      const nextPlanId = String(parsed.data.planId ?? current.planId);
      const [plan] = await db
        .select({
          categoryId: schema.preTourPlan.categoryId,
          status: schema.preTourPlan.status,
        })
        .from(schema.preTourPlan)
        .where(and(eq(schema.preTourPlan.id, nextPlanId), eq(schema.preTourPlan.companyId, companyId)))
        .limit(1);
      if (!plan) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour plan not found.");
      }
      const categoryRule = await ensureTourCategoryRule(companyId, String(plan.categoryId));
      const nextItemType = String(parsed.data.itemType ?? current.itemType).toUpperCase();
      if (nextItemType === "ACCOMMODATION" && !categoryRule.allowMultipleHotels) {
        const existingAccommodation = await db
          .select({ id: schema.preTourPlanItem.id })
          .from(schema.preTourPlanItem)
          .where(
            and(
              eq(schema.preTourPlanItem.companyId, companyId),
              eq(schema.preTourPlanItem.planId, nextPlanId),
              eq(schema.preTourPlanItem.itemType, "ACCOMMODATION"),
              ne(schema.preTourPlanItem.id, id)
            )
          )
          .limit(1);
        if (existingAccommodation.length > 0) {
          throw new PreTourError(
            400,
            "VALIDATION_ERROR",
            "This category allows only one accommodation item for the full pre-tour."
          );
        }
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

      await validatePlanStructureAgainstCategoryRule({
        companyId,
        planId: nextPlanId,
        rule: categoryRule,
        requireComplete: isStrictPreTourStatus(plan.status),
      });

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

    case "pre-tour-guide-allocations": {
      const parsed = updatePreTourGuideAllocationSchema.safeParse(payload);
      if (!parsed.success) {
        throw new PreTourError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      if (parsed.data.planId) {
        await ensurePlan(companyId, parsed.data.planId);
      }

      const current = await ensureGuideAllocation(companyId, id);
      const nextPlanId = String(parsed.data.planId ?? current.planId);
      await ensureGuideCoverageRange(companyId, {
        planId: nextPlanId,
        coverageMode: String(parsed.data.coverageMode ?? current.coverageMode ?? "FULL_TOUR"),
        startDayId: parsed.data.startDayId ?? current.startDayId ?? null,
        endDayId: parsed.data.endDayId ?? current.endDayId ?? null,
      });

      const [updated] = await db
        .update(schema.preTourPlanGuideAllocation)
        .set({
          ...parsed.data,
          units: parsed.data.units !== undefined ? toDecimal(parsed.data.units) : undefined,
          baseAmount:
            parsed.data.baseAmount !== undefined ? toDecimal(parsed.data.baseAmount) : undefined,
          taxAmount: parsed.data.taxAmount !== undefined ? toDecimal(parsed.data.taxAmount) : undefined,
          totalAmount:
            parsed.data.totalAmount !== undefined ? toDecimal(parsed.data.totalAmount) : undefined,
          updatedAt: new Date(),
        } as any)
        .where(
          and(
            eq(schema.preTourPlanGuideAllocation.id, id),
            eq(schema.preTourPlanGuideAllocation.companyId, companyId)
          )
        )
        .returning();

      if (!updated) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour guide allocation not found.");
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
      const [currentDay] = await db
        .select({ planId: schema.preTourPlanDay.planId })
        .from(schema.preTourPlanDay)
        .where(and(eq(schema.preTourPlanDay.id, id), eq(schema.preTourPlanDay.companyId, companyId)))
        .limit(1);
      if (!currentDay) throw new PreTourError(404, "NOT_FOUND", "Pre-tour day not found.");

      const [plan] = await db
        .select({
          categoryId: schema.preTourPlan.categoryId,
          status: schema.preTourPlan.status,
        })
        .from(schema.preTourPlan)
        .where(
          and(
            eq(schema.preTourPlan.id, String(currentDay.planId)),
            eq(schema.preTourPlan.companyId, companyId)
          )
        )
        .limit(1);
      if (!plan) throw new PreTourError(404, "NOT_FOUND", "Pre-tour plan not found.");

      const categoryRule = await ensureTourCategoryRule(companyId, String(plan.categoryId));
      if (isStrictPreTourStatus(plan.status)) {
        const dayRows = await db
          .select({ id: schema.preTourPlanDay.id })
          .from(schema.preTourPlanDay)
          .where(
            and(
              eq(schema.preTourPlanDay.companyId, companyId),
              eq(schema.preTourPlanDay.planId, String(currentDay.planId))
            )
          );
        const remainingDays = Math.max(0, dayRows.length - 1);
        if (categoryRule.requireItinerary && remainingDays === 0) {
          throw new PreTourError(
            400,
            "VALIDATION_ERROR",
            "Selected category requires itinerary/day records. You cannot remove the last day."
          );
        }
        if (categoryRule.minDays !== null && remainingDays < Number(categoryRule.minDays)) {
          throw new PreTourError(
            400,
            "VALIDATION_ERROR",
            `Selected category requires at least ${categoryRule.minDays} day records.`
          );
        }
      }

      const [deleted] = await db
        .delete(schema.preTourPlanDay)
        .where(and(eq(schema.preTourPlanDay.id, id), eq(schema.preTourPlanDay.companyId, companyId)))
        .returning({ id: schema.preTourPlanDay.id });
      if (!deleted) throw new PreTourError(404, "NOT_FOUND", "Pre-tour day not found.");
      return;
    }
    case "pre-tour-items": {
      const [currentItem] = await db
        .select({
          planId: schema.preTourPlanItem.planId,
          itemType: schema.preTourPlanItem.itemType,
        })
        .from(schema.preTourPlanItem)
        .where(and(eq(schema.preTourPlanItem.id, id), eq(schema.preTourPlanItem.companyId, companyId)))
        .limit(1);
      if (!currentItem) throw new PreTourError(404, "NOT_FOUND", "Pre-tour item not found.");

      const [plan] = await db
        .select({
          categoryId: schema.preTourPlan.categoryId,
          status: schema.preTourPlan.status,
        })
        .from(schema.preTourPlan)
        .where(
          and(
            eq(schema.preTourPlan.id, String(currentItem.planId)),
            eq(schema.preTourPlan.companyId, companyId)
          )
        )
        .limit(1);
      if (!plan) throw new PreTourError(404, "NOT_FOUND", "Pre-tour plan not found.");

      if (isStrictPreTourStatus(plan.status)) {
        const categoryRule = await ensureTourCategoryRule(companyId, String(plan.categoryId));
        const items = await db
          .select({ itemType: schema.preTourPlanItem.itemType })
          .from(schema.preTourPlanItem)
          .where(
            and(
              eq(schema.preTourPlanItem.companyId, companyId),
              eq(schema.preTourPlanItem.planId, String(currentItem.planId))
            )
          );
        const countByType = new Map<string, number>();
        items.forEach((row) => {
          const key = String(row.itemType || "").toUpperCase();
          countByType.set(key, (countByType.get(key) ?? 0) + 1);
        });

        const deletingType = String(currentItem.itemType || "").toUpperCase();
        countByType.set(deletingType, Math.max(0, (countByType.get(deletingType) ?? 0) - 1));

        const mustHaveHotel = Boolean(categoryRule.requireHotel) || !Boolean(categoryRule.allowWithoutHotel);
        const mustHaveTransport =
          Boolean(categoryRule.requireTransport) || !Boolean(categoryRule.allowWithoutTransport);

        if (mustHaveHotel && (countByType.get("ACCOMMODATION") ?? 0) === 0) {
          throw new PreTourError(
            400,
            "VALIDATION_ERROR",
            "Selected category requires at least one accommodation item."
          );
        }
        if (mustHaveTransport && (countByType.get("TRANSPORT") ?? 0) === 0) {
          throw new PreTourError(
            400,
            "VALIDATION_ERROR",
            "Selected category requires at least one transport item."
          );
        }
        if (categoryRule.requireActivity && (countByType.get("ACTIVITY") ?? 0) === 0) {
          throw new PreTourError(
            400,
            "VALIDATION_ERROR",
            "Selected category requires at least one activity item."
          );
        }
        if (categoryRule.requireCeremony && (countByType.get("CEREMONY") ?? 0) === 0) {
          throw new PreTourError(
            400,
            "VALIDATION_ERROR",
            "Selected category requires at least one ceremony item."
          );
        }
      }

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
    case "pre-tour-guide-allocations": {
      const [deleted] = await db
        .delete(schema.preTourPlanGuideAllocation)
        .where(
          and(
            eq(schema.preTourPlanGuideAllocation.id, id),
            eq(schema.preTourPlanGuideAllocation.companyId, companyId)
          )
        )
        .returning({ id: schema.preTourPlanGuideAllocation.id });
      if (!deleted) {
        throw new PreTourError(404, "NOT_FOUND", "Pre-tour guide allocation not found.");
      }
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
    const dbError = error as {
      code?: string;
      constraint?: string;
      detail?: string;
      message?: string;
    };
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
      if (dbError.constraint === "uq_pre_tour_plan_day_plan_day_number") {
        return {
          status: 400,
          body: {
            code: "VALIDATION_ERROR",
            message: "Day number already exists for this pre-tour plan. Please use a different day.",
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

    if (dbError.code === "42703") {
      const message = String(dbError.message ?? "").toLowerCase();
      if (message.includes("category_id")) {
        return {
          status: 500,
          body: {
            code: "SCHEMA_MIGRATION_REQUIRED",
            message:
              "Database migration is required: run scripts/add-pre-tour-category-id.sql to add pre_tour_plan.category_id.",
          },
        };
      }
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
