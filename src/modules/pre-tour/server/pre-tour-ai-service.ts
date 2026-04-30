import { and, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { createStructuredOpenAIResponse, getConfiguredOpenAIModel } from "@/lib/openai/responses";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import { listHotels } from "@/modules/accommodation/server/accommodation-service";
import { listActivityRecords } from "@/modules/activity/server/activity-service";
import { listBusinessNetworkRecords } from "@/modules/business-network/server/business-network-service";
import { listCurrencyRecords } from "@/modules/currency/server/currency-service";
import { listGuideRecords } from "@/modules/guides/server/guides-service";
import {
  addDays,
  sanitizeCodePart,
  toNightCount,
} from "@/modules/pre-tour/lib/pre-tour-management-utils";
import { buildPreTourPricingSnapshot } from "@/modules/pre-tour/lib/pricing/pricing-snapshot-builder";
import { listPreTourCategoryLookups } from "@/modules/pre-tour/server/pre-tour-category-lookup-service";
import { resolveAccommodationRates } from "@/modules/pre-tour/server/rate-resolution/accommodation-rate-resolver";
import { resolveTransportRates } from "@/modules/pre-tour/server/rate-resolution/transport-rate-resolver";
import { generatePreTourCosting } from "@/modules/pre-tour/server/pre-tour-service";
import {
  type PreTourAIDraft,
  type PreTourAIDraftValidation,
  type PreTourAIMode,
  type PreTourAIRunDetail,
  type PreTourAIRunSummary,
  type PreTourAIRequest,
  preTourAIApplyRequestSchema,
  preTourAIApplyResponseSchema,
  preTourAIDraftSchema,
  preTourAIDraftValidationSchema,
  preTourAIGenerateResponseSchema,
  preTourAIRunDetailSchema,
  preTourAIRunListQuerySchema,
  preTourAIRunListResponseSchema,
  preTourAIRunReviewRequestSchema,
  preTourAIRequestSchema,
} from "@/modules/pre-tour/shared/pre-tour-ai-schemas";
import type {
  PreTourAccommodationRateCard,
  PreTourPricingSnapshot,
  PreTourRateCard,
  PreTourTransportChargeMethod,
  PreTourTransportRateCard,
} from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";
import { listSeasons } from "@/modules/season/server/season-service";
import { listTechnicalVisitRecords } from "@/modules/technical-visit/server/technical-visit-service";
import { listTransportRecords } from "@/modules/transport/server/transport-service";

class PreTourAIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

type MasterRow = Record<string, unknown>;

type PreTourAIMasterContext = {
  companyId: string;
  userId: string | null;
  userName: string | null;
  request: PreTourAIRequest;
  category: MasterRow;
  categoryRule: MasterRow | null;
  operator: MasterRow;
  market: MasterRow;
  currency: MasterRow;
  baseCurrencyCode: string;
  exchangeRateMode: "AUTO" | "MANUAL";
  exchangeRate: number;
  exchangeRateDate: Date | null;
  overlappingSeasons: MasterRow[];
  locations: MasterRow[];
  activities: MasterRow[];
  hotels: MasterRow[];
  guides: MasterRow[];
  technicalVisits: MasterRow[];
  categories: MasterRow[];
  categoryTypes: MasterRow[];
  currencies: MasterRow[];
};

type PreTourAISourcePlanOutline = {
  plan: {
    id: string;
    planCode: string;
    referenceNo: string;
    title: string;
    status: string;
    version: number;
    startDate: string;
    endDate: string;
    adults: number;
    children: number;
    infants: number;
    preferredLanguage: string | null;
    roomPreference: string | null;
    mealPreference: string | null;
    notes: string | null;
  };
  additionalCategories: Array<{
    categoryCode: string;
    categoryName: string;
    notes: string | null;
  }>;
  guideAllocations: Array<{
    title: string;
    serviceCode: string | null;
    coverageMode: string;
    startDayNumber: number | null;
    endDayNumber: number | null;
    language: string | null;
    guideBasis: string | null;
    pax: number | null;
    units: number | null;
    notes: string | null;
  }>;
  technicalVisits: Array<{
    technicalVisitCode: string;
    dayNumber: number | null;
    notes: string | null;
  }>;
  days: Array<{
    dayNumber: number;
    date: string;
    title: string | null;
    notes: string | null;
    startLocationCode: string | null;
    endLocationCode: string | null;
    items: Array<{
      itemType: string;
      title: string | null;
      description: string | null;
      serviceCode: string | null;
      startAt: string | null;
      endAt: string | null;
      pax: number | null;
      units: number | null;
      nights: number | null;
      fromLocationCode: string | null;
      toLocationCode: string | null;
      locationCode: string | null;
      notes: string | null;
    }>;
  }>;
};

type PreTourAIRunIssueCounts = {
  blocking: number;
  medium: number;
  low: number;
};

type MasterCursorPage = {
  items: Array<Record<string, unknown>>;
  nextCursor: string | null;
  hasNext: boolean;
  limit: number;
};

type MasterOffsetPage = {
  rows: Array<Record<string, unknown>>;
  total: number;
  page: number;
  limit: number;
};

type PromptProfile = "standard" | "tight";

const PROMPT_PROFILE_LIMITS: Record<
  PromptProfile,
  {
    promptChars: number;
    locations: number;
    activities: number;
    hotels: number;
    guides: number;
    technicalVisits: number;
    categories: number;
    dayItems: number;
    textChars: number;
    noteChars: number;
  }
> = {
  standard: {
    promptChars: 4200,
    locations: 24,
    activities: 24,
    hotels: 16,
    guides: 10,
    technicalVisits: 8,
    categories: 8,
    dayItems: 8,
    textChars: 72,
    noteChars: 140,
  },
  tight: {
    promptChars: 2800,
    locations: 14,
    activities: 14,
    hotels: 10,
    guides: 8,
    technicalVisits: 6,
    categories: 6,
    dayItems: 6,
    textChars: 56,
    noteChars: 100,
  },
};

function normalizeZodError(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Validation failed.";
  return issue.message || "Validation failed.";
}

function optionalMaster<T>(loader: () => Promise<T>, fallback: T) {
  return loader().catch((error) => {
    const message = error instanceof Error ? error.message : String(error ?? "");
    const normalized = message.toLowerCase();
    const restricted =
      normalized.includes("plan does not include") ||
      normalized.includes("permission denied") ||
      normalized.includes("do not have access");
    if (restricted) return fallback;
    throw error;
  });
}

function toPlainRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const next: Record<string, unknown> = { ...row };
    for (const [key, value] of Object.entries(next)) {
      if (value instanceof Date) next[key] = value.toISOString();
    }
    return next;
  });
}

function textOf(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function normalizedCode(value: unknown) {
  return textOf(value).toUpperCase();
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function scoreByTerms(value: string, terms: string[]) {
  const haystack = value.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (haystack === term) score += 8;
    else if (haystack.startsWith(term)) score += 5;
    else if (haystack.includes(term)) score += 2;
  }
  return score;
}

function pickRelevantRows(
  rows: MasterRow[],
  terms: string[],
  fields: string[],
  limit: number
) {
  if (rows.length <= limit) return rows;
  const scored = rows
    .map((row, index) => {
      const haystack = fields.map((field) => textOf(row[field])).join(" | ");
      return {
        row,
        index,
        score: scoreByTerms(haystack, terms),
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.index - right.index;
    });

  const matching = scored.filter((entry) => entry.score > 0).slice(0, limit);
  if (matching.length >= Math.max(10, Math.floor(limit / 2))) {
    return matching.map((entry) => entry.row);
  }

  return scored.slice(0, limit).map((entry) => entry.row);
}

function mergeUniqueRows(groups: MasterRow[][], limit: number) {
  const merged: MasterRow[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const row of group) {
      const key = String(row.id ?? row.code ?? "").trim();
      const fallbackKey = key || JSON.stringify(row);
      if (seen.has(fallbackKey)) continue;
      seen.add(fallbackKey);
      merged.push(row);
      if (merged.length >= limit) {
        return merged;
      }
    }
  }

  return merged;
}

function compactDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "00000000";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function fitScopedCodeBody(parts: string[], maxLength: number) {
  if (maxLength <= 0 || parts.length === 0) return "";

  const working = [...parts];
  const joinWorking = () => working.filter(Boolean).join("_");
  let joined = joinWorking();

  while (joined.length > maxLength) {
    let longestIndex = -1;
    let longestLength = 0;

    for (const [index, part] of working.entries()) {
      if (part.length > longestLength) {
        longestLength = part.length;
        longestIndex = index;
      }
    }

    if (longestIndex < 0 || longestLength === 0) break;
    working[longestIndex] = working[longestIndex].slice(0, -1);
    joined = joinWorking();
  }

  return joined;
}

function buildScopedCode(prefix: string, parts: Array<string | null | undefined>) {
  const normalizedPrefix = sanitizeCodePart(prefix) || "AI";
  const normalizedParts = parts
    .map((part) => sanitizeCodePart(String(part ?? "")))
    .filter(Boolean);
  const random = nanoid(6).toUpperCase();
  const maxBodyLength = Math.max(
    0,
    80 - normalizedPrefix.length - random.length - 2
  );
  const body = fitScopedCodeBody(normalizedParts, maxBodyLength);
  return body ? `${normalizedPrefix}_${body}_${random}` : `${normalizedPrefix}_${random}`;
}

function overlapDateRanges(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string
) {
  const startA = new Date(leftStart);
  const endA = new Date(leftEnd);
  const startB = new Date(rightStart);
  const endB = new Date(rightEnd);
  if (
    Number.isNaN(startA.getTime()) ||
    Number.isNaN(endA.getTime()) ||
    Number.isNaN(startB.getTime()) ||
    Number.isNaN(endB.getTime())
  ) {
    return false;
  }
  return startA <= endB && startB <= endA;
}

function validateTravelWindow(request: PreTourAIRequest, categoryRule: MasterRow | null) {
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new PreTourAIError(400, "VALIDATION_ERROR", "Start date and end date must be valid.");
  }
  if (start > end) {
    throw new PreTourAIError(
      400,
      "VALIDATION_ERROR",
      "Plan end date must be greater than or equal to start date."
    );
  }

  if (!categoryRule) return;
  const totalNights = toNightCount(request.startDate, request.endDate);
  const totalDays = totalNights + 1;

  if (
    categoryRule.minNights !== null &&
    categoryRule.minNights !== undefined &&
    totalNights < Number(categoryRule.minNights)
  ) {
    throw new PreTourAIError(
      400,
      "VALIDATION_ERROR",
      `Total nights must be at least ${categoryRule.minNights} for the selected category.`
    );
  }
  if (
    categoryRule.maxNights !== null &&
    categoryRule.maxNights !== undefined &&
    totalNights > Number(categoryRule.maxNights)
  ) {
    throw new PreTourAIError(
      400,
      "VALIDATION_ERROR",
      `Total nights cannot exceed ${categoryRule.maxNights} for the selected category.`
    );
  }
  if (
    categoryRule.minDays !== null &&
    categoryRule.minDays !== undefined &&
    totalDays < Number(categoryRule.minDays)
  ) {
    throw new PreTourAIError(
      400,
      "VALIDATION_ERROR",
      `Total days must be at least ${categoryRule.minDays} for the selected category.`
    );
  }
  if (
    categoryRule.maxDays !== null &&
    categoryRule.maxDays !== undefined &&
    totalDays > Number(categoryRule.maxDays)
  ) {
    throw new PreTourAIError(
      400,
      "VALIDATION_ERROR",
      `Total days cannot exceed ${categoryRule.maxDays} for the selected category.`
    );
  }
}

function buildNotes(summary: string, notes: string | null | undefined) {
  const blocks = [
    summary ? `AI Summary: ${summary}` : null,
    notes ? `AI Notes:\n${notes}` : null,
    "Source: AI Pre-Tour Planner",
  ].filter(Boolean);
  return blocks.join("\n\n").slice(0, 2000);
}

function buildMapByCode(rows: MasterRow[]) {
  return new Map(
    rows
      .map((row) => [normalizedCode(row.code), row] as const)
      .filter(([code]) => code.length > 0)
  );
}

function buildMapById(rows: MasterRow[]) {
  return new Map(
    rows
      .map((row) => [String(row.id ?? "").trim(), row] as const)
      .filter(([id]) => id.length > 0)
  );
}

function enrichHotelRowsWithLocations(hotels: MasterRow[], locations: MasterRow[]) {
  const locationById = buildMapById(locations);

  return hotels.map((hotel) => {
    const linkedLocation = locationById.get(String(hotel.locationId ?? "").trim()) ?? null;
    const linkedLocationCode = textOf(linkedLocation?.code);
    const linkedLocationName = textOf(linkedLocation?.name);
    const linkedLocationRegion = textOf(linkedLocation?.region);
    const linkedLocationCountry = textOf(linkedLocation?.country);
    const linkedLocationAddress = textOf(linkedLocation?.address);

    return {
      ...hotel,
      city: textOf(hotel.city) || linkedLocationRegion || linkedLocationName || null,
      country: textOf(hotel.country) || linkedLocationCountry || null,
      address: textOf(hotel.address) || linkedLocationAddress || null,
      locationCode: linkedLocationCode || null,
      locationName: linkedLocationName || null,
      locationRegion: linkedLocationRegion || null,
      locationCountry: linkedLocationCountry || null,
      locationAddress: linkedLocationAddress || null,
    } satisfies MasterRow;
  });
}

async function loadAllTransportLocations(headers: Headers) {
  const limit = 500;
  const rows: MasterRow[] = [];

  for (let page = 1; page <= 1000; page += 1) {
    const response = (await listTransportRecords(
      "locations",
      new URLSearchParams({
        page: String(page),
        limit: String(limit),
      }),
      headers
    )) as MasterOffsetPage;
    const pageRows = (response.rows ?? []) as MasterRow[];
    rows.push(...pageRows);

    const total = Number(response.total ?? rows.length);
    if (pageRows.length === 0 || rows.length >= total || pageRows.length < limit) {
      break;
    }
  }

  return rows;
}

async function loadAllHotels(headers: Headers) {
  const limit = 100;
  const items: MasterRow[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < 1000; page += 1) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);

    const response = (await listHotels(params, headers)) as MasterCursorPage;
    const pageItems = (response.items ?? []) as MasterRow[];
    items.push(...pageItems);

    if (!response.hasNext || !response.nextCursor || pageItems.length === 0) {
      break;
    }
    if (response.nextCursor === cursor) {
      break;
    }

    cursor = response.nextCursor;
  }

  return items;
}

function toIsoStringOrNull(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function summarizeValidationIssues(
  validation: PreTourAIDraftValidation
): PreTourAIRunIssueCounts {
  return validation.issues.reduce<PreTourAIRunIssueCounts>(
    (counts, issue) => {
      if (issue.severity === "high") counts.blocking += 1;
      else if (issue.severity === "medium") counts.medium += 1;
      else counts.low += 1;
      return counts;
    },
    { blocking: 0, medium: 0, low: 0 }
  );
}

function requireRevisionSource(request: PreTourAIRequest) {
  if (request.mode !== "REVISE") return;
  if (request.sourcePlanId) return;
  throw new PreTourAIError(
    400,
    "VALIDATION_ERROR",
    "Revision mode requires a source pre-tour plan."
  );
}

function normalizeJsonSchema(schemaObject: Record<string, unknown>): Record<string, unknown> {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (key === "$schema" || key === "default") continue;
      next[key] = visit(entry);
    }

    const properties =
      next.properties && typeof next.properties === "object" && !Array.isArray(next.properties)
        ? (next.properties as Record<string, unknown>)
        : null;
    if (next.type === "object" && properties) {
      // OpenAI strict json_schema expects every object property to appear in `required`.
      // Optional Zod fields that are also nullable already allow `null`, so we keep the
      // property schema and simply require the key to be present.
      next.required = Object.keys(properties);
    }

    return next;
  };
  return visit(schemaObject) as Record<string, unknown>;
}

function optimizeDraftJsonSchemaForModel(schemaObject: Record<string, unknown>): Record<string, unknown> {
  const applyStringLimit = (propertyName: string, current: number) => {
    switch (propertyName) {
      case "summary":
        return Math.min(current, 600);
      case "title":
        return Math.min(current, 140);
      case "description":
      case "notes":
        return Math.min(current, 600);
      case "rationale":
        return Math.min(current, 160);
      case "reason":
        return Math.min(current, 180);
      case "message":
        return Math.min(current, 240);
      default:
        return current;
    }
  };

  const applyArrayLimit = (propertyName: string, current: number) => {
    switch (propertyName) {
      case "additionalCategories":
        return Math.min(current, 8);
      case "guideAllocations":
      case "technicalVisits":
        return Math.min(current, 12);
      case "assumptions":
      case "unresolvedQuestions":
        return Math.min(current, 8);
      case "warnings":
        return Math.min(current, 12);
      default:
        return current;
    }
  };

  const visit = (value: unknown, propertyName?: string): unknown => {
    if (Array.isArray(value)) return value.map((entry) => visit(entry, propertyName));
    if (!value || typeof value !== "object") return value;

    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (key === "properties" && entry && typeof entry === "object" && !Array.isArray(entry)) {
        next[key] = Object.fromEntries(
          Object.entries(entry as Record<string, unknown>).map(([childName, childValue]) => [
            childName,
            visit(childValue, childName),
          ])
        );
        continue;
      }

      if (key === "items") {
        next[key] = visit(entry, propertyName);
        continue;
      }

      next[key] = visit(entry, propertyName);
    }

    if (propertyName && typeof next.maxLength === "number") {
      next.maxLength = applyStringLimit(propertyName, next.maxLength);
    }
    if (propertyName && typeof next.maxItems === "number") {
      next.maxItems = applyArrayLimit(propertyName, next.maxItems);
    }

    return next;
  };

  return visit(schemaObject) as Record<string, unknown>;
}

async function ensureReadAccess(headers: Headers) {
  try {
    return await resolveAccess(headers, {
      requiredPrivilege: "SCREEN_PRE_TOURS",
    });
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new PreTourAIError(error.status, error.code, error.message);
    }
    throw error;
  }
}

async function ensureWriteAccess(headers: Headers) {
  const access = await ensureReadAccess(headers);
  if (access.readOnly) {
    throw new PreTourAIError(
      403,
      "READ_ONLY_MODE",
      "You are in read-only mode. Contact a manager for edit access."
    );
  }
  const elevated = access.role === "ADMIN" || access.role === "MANAGER";
  if (!elevated && !access.canWritePreTour) {
    throw new PreTourAIError(
      403,
      "PERMISSION_DENIED",
      "You do not have write access for Pre-Tour."
    );
  }
  return access;
}

async function ensureAdminAccess(headers: Headers) {
  const access = await ensureReadAccess(headers);
  if (access.role !== "ADMIN") {
    throw new PreTourAIError(
      403,
      "PERMISSION_DENIED",
      "Only Admin can access the AI evaluation dashboard."
    );
  }
  return access;
}

async function resolveCurrencyContext(
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
    throw new PreTourAIError(400, "VALIDATION_ERROR", "Invalid pre-tour start date.");
  }

  const [companyRecord] = await db
    .select({ baseCurrencyCode: schema.company.baseCurrencyCode })
    .from(schema.company)
    .where(eq(schema.company.id, companyId))
    .limit(1);

  if (!companyRecord) {
    throw new PreTourAIError(400, "COMPANY_NOT_FOUND", "Company configuration not found.");
  }

  const baseCurrencyCode = String(companyRecord.baseCurrencyCode || "").trim().toUpperCase();
  if (!baseCurrencyCode) {
    throw new PreTourAIError(
      400,
      "COMPANY_BASE_CURRENCY_REQUIRED",
      "Company base currency is not configured."
    );
  }

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
    throw new PreTourAIError(
      400,
      "PLAN_CURRENCY_NOT_FOUND",
      "Pre-tour currency must exist as an active currency in company settings."
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
    throw new PreTourAIError(
      400,
      "COMPANY_BASE_CURRENCY_INVALID",
      "Company base currency does not exist in active currency master."
    );
  }

  const requestedMode = options.exchangeRateMode ?? "AUTO";
  if (requestedMode === "MANUAL") {
    const manualRate = Number(options.exchangeRate ?? 0);
    if (!Number.isFinite(manualRate) || manualRate < 0) {
      throw new PreTourAIError(
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

async function loadMasterContext(
  request: PreTourAIRequest,
  requestHeaders: Headers,
  writeIntent = false
): Promise<PreTourAIMasterContext> {
  const access = writeIntent
    ? await ensureWriteAccess(requestHeaders)
    : await ensureReadAccess(requestHeaders);
  const companyId = access.companyId;

  // Keep this aligned with the master-data services' validated max page size.
  const queryParams = new URLSearchParams({ limit: "100" });
  const seasonParams = new URLSearchParams({ limit: "100" });

  const [
    locationRows,
    activitiesResponse,
    guidesResponse,
    currenciesResponse,
    organizationsResponse,
    operatorMarketContractsResponse,
    categoryLookups,
    technicalVisitsResponse,
    hotelRows,
    seasonsResponse,
    currencyContext,
  ] = await Promise.all([
    loadAllTransportLocations(requestHeaders),
    listActivityRecords("activities", queryParams, requestHeaders),
    listGuideRecords("guides", queryParams, requestHeaders),
    optionalMaster(() => listCurrencyRecords("currencies", queryParams, requestHeaders), [] as MasterRow[]),
    optionalMaster(
      () => listBusinessNetworkRecords("organizations", queryParams, requestHeaders),
      [] as MasterRow[]
    ),
    optionalMaster(
      () => listBusinessNetworkRecords("operator-market-contracts", queryParams, requestHeaders),
      [] as MasterRow[]
    ),
    listPreTourCategoryLookups({ limit: 500 }, requestHeaders),
    listTechnicalVisitRecords("technical-visits", queryParams, requestHeaders),
    loadAllHotels(requestHeaders),
    optionalMaster(() => listSeasons(seasonParams, requestHeaders), {
      items: [],
      nextCursor: null,
      hasNext: false,
      limit: 100,
    }),
    resolveCurrencyContext(companyId, {
      planCurrencyCode: request.currencyCode,
      startDate: request.startDate,
      exchangeRateMode: request.exchangeRateMode,
      exchangeRate: request.exchangeRate,
      exchangeRateDate: request.exchangeRateDate ?? null,
    }),
  ]);

  if (request.operatorOrgId === request.marketOrgId) {
    throw new PreTourAIError(
      400,
      "VALIDATION_ERROR",
      "Operator and market organizations must be different."
    );
  }

  const organizations = toPlainRows(organizationsResponse as MasterRow[]);
  const categories = toPlainRows(categoryLookups.tourCategories as MasterRow[]);
  const categoryRules = toPlainRows(categoryLookups.tourCategoryRules as MasterRow[]);
  const categoryTypes = toPlainRows(categoryLookups.tourCategoryTypes as MasterRow[]);
  const currencies = toPlainRows(currenciesResponse as MasterRow[]);
  const locations = toPlainRows(locationRows);
  const hotels = enrichHotelRowsWithLocations(
    toPlainRows(hotelRows),
    locations
  );

  const category = categories.find((row) => String(row.id) === request.categoryId);
  if (!category || !Boolean(category.isActive ?? true)) {
    throw new PreTourAIError(
      400,
      "TOUR_CATEGORY_NOT_FOUND",
      "Selected tour category was not found or is inactive."
    );
  }

  const categoryRule =
    categoryRules.find(
      (row) =>
        String(row.categoryId) === String(category.id) && Boolean(row.isActive ?? true)
    ) ?? null;
  if (!categoryRule) {
    throw new PreTourAIError(
      400,
      "TOUR_CATEGORY_RULE_NOT_FOUND",
      "Selected tour category does not have an active category rule."
    );
  }
  validateTravelWindow(request, categoryRule);

  const operator = organizations.find((row) => String(row.id) === request.operatorOrgId);
  if (!operator || !["OPERATOR", "SUPPLIER"].includes(String(operator.type || ""))) {
    throw new PreTourAIError(
      400,
      "INVALID_OPERATOR_ORGANIZATION",
      "Selected operator organization is invalid."
    );
  }

  const market = organizations.find((row) => String(row.id) === request.marketOrgId);
  if (!market || !["MARKET", "MARKETING"].includes(String(market.type || ""))) {
    throw new PreTourAIError(
      400,
      "INVALID_MARKET_ORGANIZATION",
      "Selected market organization is invalid."
    );
  }

  const contracts = toPlainRows(operatorMarketContractsResponse as MasterRow[]);
  const activeContracts = contracts.filter(
    (row) =>
      String(row.marketOrgId) === request.marketOrgId &&
      Boolean(row.isActive ?? true) &&
      String(row.status || "ACTIVE") === "ACTIVE"
  );
  if (
    activeContracts.length > 0 &&
    !activeContracts.some((row) => String(row.operatorOrgId) === request.operatorOrgId)
  ) {
    throw new PreTourAIError(
      400,
      "INVALID_OPERATOR_MARKET_MAPPING",
      "Selected operator is not mapped to the selected market."
    );
  }

  const currency = currencies.find(
    (row) =>
      normalizedCode(row.code) === normalizedCode(request.currencyCode) &&
      Boolean(row.isActive ?? true)
  );
  if (!currency) {
    throw new PreTourAIError(
      400,
      "PLAN_CURRENCY_NOT_FOUND",
      "Selected currency was not found in active company currencies."
    );
  }

  const seasons = toPlainRows((seasonsResponse.items ?? []) as MasterRow[]);
  const overlappingSeasons = seasons.filter((row) =>
    overlapDateRanges(
      request.startDate,
      request.endDate,
      `${textOf(row.startDate)}T00:00:00.000Z`,
      `${textOf(row.endDate)}T00:00:00.000Z`
    )
  );

  return {
    companyId,
    userId: access.userId,
    userName: access.userName,
    request,
    category,
    categoryRule,
    operator,
    market,
    currency,
    baseCurrencyCode: currencyContext.baseCurrencyCode,
    exchangeRateMode: currencyContext.exchangeRateMode,
    exchangeRate: currencyContext.exchangeRate,
    exchangeRateDate: currencyContext.exchangeRateDate,
    overlappingSeasons,
    locations,
    activities: toPlainRows(activitiesResponse as MasterRow[]),
    hotels,
    guides: toPlainRows(guidesResponse as MasterRow[]),
    technicalVisits: toPlainRows(technicalVisitsResponse as MasterRow[]),
    categories,
    categoryTypes,
    currencies,
  };
}

async function loadSourcePlanOutline(
  sourcePlanId: string,
  context: PreTourAIMasterContext
): Promise<PreTourAISourcePlanOutline> {
  const [plan] = await db
    .select({
      id: schema.preTourPlan.id,
      planCode: schema.preTourPlan.planCode,
      referenceNo: schema.preTourPlan.referenceNo,
      title: schema.preTourPlan.title,
      status: schema.preTourPlan.status,
      version: schema.preTourPlan.version,
      startDate: schema.preTourPlan.startDate,
      endDate: schema.preTourPlan.endDate,
      adults: schema.preTourPlan.adults,
      children: schema.preTourPlan.children,
      infants: schema.preTourPlan.infants,
      preferredLanguage: schema.preTourPlan.preferredLanguage,
      roomPreference: schema.preTourPlan.roomPreference,
      mealPreference: schema.preTourPlan.mealPreference,
      notes: schema.preTourPlan.notes,
    })
    .from(schema.preTourPlan)
    .where(
      and(
        eq(schema.preTourPlan.id, sourcePlanId),
        eq(schema.preTourPlan.companyId, context.companyId),
        isNull(schema.preTourPlan.deletedAt)
      )
    )
    .limit(1);

  if (!plan) {
    throw new PreTourAIError(404, "SOURCE_PLAN_NOT_FOUND", "Source pre-tour plan was not found.");
  }

  const days = await db
    .select({
      id: schema.preTourPlanDay.id,
      dayNumber: schema.preTourPlanDay.dayNumber,
      date: schema.preTourPlanDay.date,
      title: schema.preTourPlanDay.title,
      notes: schema.preTourPlanDay.notes,
      startLocationId: schema.preTourPlanDay.startLocationId,
      endLocationId: schema.preTourPlanDay.endLocationId,
    })
    .from(schema.preTourPlanDay)
    .where(
      and(
        eq(schema.preTourPlanDay.companyId, context.companyId),
        eq(schema.preTourPlanDay.planId, sourcePlanId),
        eq(schema.preTourPlanDay.isActive, true)
      )
    )
    .orderBy(schema.preTourPlanDay.dayNumber, schema.preTourPlanDay.createdAt);

  const dayIds = days.map((day) => String(day.id));

  const [items, guideAllocations, categories, technicalVisits] = await Promise.all([
    dayIds.length > 0
      ? db
          .select({
            dayId: schema.preTourPlanItem.dayId,
            itemType: schema.preTourPlanItem.itemType,
            title: schema.preTourPlanItem.title,
            description: schema.preTourPlanItem.description,
            serviceId: schema.preTourPlanItem.serviceId,
            startAt: schema.preTourPlanItem.startAt,
            endAt: schema.preTourPlanItem.endAt,
            pax: schema.preTourPlanItem.pax,
            units: schema.preTourPlanItem.units,
            nights: schema.preTourPlanItem.nights,
            fromLocationId: schema.preTourPlanItem.fromLocationId,
            toLocationId: schema.preTourPlanItem.toLocationId,
            locationId: schema.preTourPlanItem.locationId,
            notes: schema.preTourPlanItem.notes,
            sortOrder: schema.preTourPlanItem.sortOrder,
            createdAt: schema.preTourPlanItem.createdAt,
          })
          .from(schema.preTourPlanItem)
          .where(
            and(
              eq(schema.preTourPlanItem.companyId, context.companyId),
              eq(schema.preTourPlanItem.planId, sourcePlanId),
              eq(schema.preTourPlanItem.isActive, true),
              inArray(schema.preTourPlanItem.dayId, dayIds)
            )
          )
          .orderBy(
            schema.preTourPlanItem.dayId,
            schema.preTourPlanItem.sortOrder,
            schema.preTourPlanItem.createdAt
          )
      : Promise.resolve([]),
    db
      .select({
        serviceId: schema.preTourPlanGuideAllocation.serviceId,
        coverageMode: schema.preTourPlanGuideAllocation.coverageMode,
        startDayId: schema.preTourPlanGuideAllocation.startDayId,
        endDayId: schema.preTourPlanGuideAllocation.endDayId,
        language: schema.preTourPlanGuideAllocation.language,
        guideBasis: schema.preTourPlanGuideAllocation.guideBasis,
        pax: schema.preTourPlanGuideAllocation.pax,
        units: schema.preTourPlanGuideAllocation.units,
        title: schema.preTourPlanGuideAllocation.title,
        notes: schema.preTourPlanGuideAllocation.notes,
        createdAt: schema.preTourPlanGuideAllocation.createdAt,
      })
      .from(schema.preTourPlanGuideAllocation)
      .where(
        and(
          eq(schema.preTourPlanGuideAllocation.companyId, context.companyId),
          eq(schema.preTourPlanGuideAllocation.planId, sourcePlanId),
          eq(schema.preTourPlanGuideAllocation.isActive, true)
        )
      )
      .orderBy(desc(schema.preTourPlanGuideAllocation.createdAt)),
    db
      .select({
        categoryId: schema.preTourPlanCategory.categoryId,
        notes: schema.preTourPlanCategory.notes,
        createdAt: schema.preTourPlanCategory.createdAt,
      })
      .from(schema.preTourPlanCategory)
      .where(
        and(
          eq(schema.preTourPlanCategory.companyId, context.companyId),
          eq(schema.preTourPlanCategory.planId, sourcePlanId),
          eq(schema.preTourPlanCategory.isActive, true)
        )
      )
      .orderBy(schema.preTourPlanCategory.createdAt),
    db
      .select({
        technicalVisitId: schema.preTourPlanTechnicalVisit.technicalVisitId,
        dayId: schema.preTourPlanTechnicalVisit.dayId,
        notes: schema.preTourPlanTechnicalVisit.notes,
        createdAt: schema.preTourPlanTechnicalVisit.createdAt,
      })
      .from(schema.preTourPlanTechnicalVisit)
      .where(
        and(
          eq(schema.preTourPlanTechnicalVisit.companyId, context.companyId),
          eq(schema.preTourPlanTechnicalVisit.planId, sourcePlanId),
          eq(schema.preTourPlanTechnicalVisit.isActive, true)
        )
      )
      .orderBy(schema.preTourPlanTechnicalVisit.createdAt),
  ]);

  const dayById = new Map(days.map((day) => [String(day.id), day] as const));
  const itemsByDayId = new Map<string, Array<(typeof items)[number]>>();
  for (const item of items) {
    const key = String(item.dayId);
    itemsByDayId.set(key, [...(itemsByDayId.get(key) ?? []), item]);
  }

  const locationById = buildMapById(context.locations);
  const activityById = buildMapById(context.activities);
  const hotelById = buildMapById(context.hotels);
  const guideById = buildMapById(context.guides);
  const categoryById = buildMapById(context.categories);
  const technicalVisitById = buildMapById(context.technicalVisits);

  const resolveServiceCode = (itemType: string, serviceId: string | null) => {
    if (!serviceId) return null;
    const normalizedType = String(itemType || "").toUpperCase();
    if (normalizedType === "ACTIVITY") {
      return textOf(activityById.get(String(serviceId))?.code) || null;
    }
    if (normalizedType === "ACCOMMODATION") {
      return textOf(hotelById.get(String(serviceId))?.code) || null;
    }
    if (normalizedType === "GUIDE") {
      return textOf(guideById.get(String(serviceId))?.code) || null;
    }
    return null;
  };

  return {
    plan: {
      id: String(plan.id),
      planCode: String(plan.planCode),
      referenceNo: String(plan.referenceNo),
      title: String(plan.title),
      status: String(plan.status),
      version: Number(plan.version ?? 1),
      startDate: plan.startDate.toISOString(),
      endDate: plan.endDate.toISOString(),
      adults: Number(plan.adults ?? 0),
      children: Number(plan.children ?? 0),
      infants: Number(plan.infants ?? 0),
      preferredLanguage: textOf(plan.preferredLanguage) || null,
      roomPreference: textOf(plan.roomPreference) || null,
      mealPreference: textOf(plan.mealPreference) || null,
      notes: textOf(plan.notes) || null,
    },
    additionalCategories: categories
      .map((entry) => {
        const category = categoryById.get(String(entry.categoryId));
        if (!category) return null;
        return {
          categoryCode: textOf(category.code),
          categoryName: textOf(category.name),
          notes: textOf(entry.notes) || null,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    guideAllocations: guideAllocations.map((allocation) => ({
      title: textOf(allocation.title),
      serviceCode: textOf(guideById.get(String(allocation.serviceId ?? ""))?.code) || null,
      coverageMode: textOf(allocation.coverageMode),
      startDayNumber: allocation.startDayId
        ? Number(dayById.get(String(allocation.startDayId))?.dayNumber ?? 0) || null
        : null,
      endDayNumber: allocation.endDayId
        ? Number(dayById.get(String(allocation.endDayId))?.dayNumber ?? 0) || null
        : null,
      language: textOf(allocation.language) || null,
      guideBasis: textOf(allocation.guideBasis) || null,
      pax: allocation.pax ?? null,
      units: allocation.units !== null && allocation.units !== undefined ? Number(allocation.units) : null,
      notes: textOf(allocation.notes) || null,
    })),
    technicalVisits: technicalVisits
      .map((visit) => {
        const technicalVisit = technicalVisitById.get(String(visit.technicalVisitId));
        if (!technicalVisit) return null;
        return {
          technicalVisitCode: textOf(technicalVisit.code),
          dayNumber: visit.dayId
            ? Number(dayById.get(String(visit.dayId))?.dayNumber ?? 0) || null
            : null,
          notes: textOf(visit.notes) || null,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    days: days.map((day) => ({
      dayNumber: Number(day.dayNumber),
      date: day.date.toISOString(),
      title: textOf(day.title) || null,
      notes: textOf(day.notes) || null,
      startLocationCode: textOf(locationById.get(String(day.startLocationId ?? ""))?.code) || null,
      endLocationCode: textOf(locationById.get(String(day.endLocationId ?? ""))?.code) || null,
      items: (itemsByDayId.get(String(day.id)) ?? []).map((item) => ({
        itemType: textOf(item.itemType),
        title: textOf(item.title) || null,
        description: textOf(item.description) || null,
        serviceCode: resolveServiceCode(textOf(item.itemType), item.serviceId ? String(item.serviceId) : null),
        startAt: toIsoStringOrNull(item.startAt),
        endAt: toIsoStringOrNull(item.endAt),
        pax: item.pax ?? null,
        units: item.units !== null && item.units !== undefined ? Number(item.units) : null,
        nights: item.nights ?? null,
        fromLocationCode: textOf(locationById.get(String(item.fromLocationId ?? ""))?.code) || null,
        toLocationCode: textOf(locationById.get(String(item.toLocationId ?? ""))?.code) || null,
        locationCode: textOf(locationById.get(String(item.locationId ?? ""))?.code) || null,
        notes: textOf(item.notes) || null,
      })),
    })),
  };
}

async function loadSourcePlanVersionSeed(companyId: string, sourcePlanId: string) {
  const [plan] = await db
    .select({
      id: schema.preTourPlan.id,
      planCode: schema.preTourPlan.planCode,
      referenceNo: schema.preTourPlan.referenceNo,
      version: schema.preTourPlan.version,
      title: schema.preTourPlan.title,
    })
    .from(schema.preTourPlan)
    .where(
      and(
        eq(schema.preTourPlan.id, sourcePlanId),
        eq(schema.preTourPlan.companyId, companyId),
        isNull(schema.preTourPlan.deletedAt)
      )
    )
    .limit(1);

  if (!plan) {
    throw new PreTourAIError(404, "SOURCE_PLAN_NOT_FOUND", "Source pre-tour plan was not found.");
  }

  const [latestVersion] = await db
    .select({ version: schema.preTourPlan.version })
    .from(schema.preTourPlan)
    .where(
      and(
        eq(schema.preTourPlan.companyId, companyId),
        eq(schema.preTourPlan.referenceNo, String(plan.referenceNo))
      )
    )
    .orderBy(desc(schema.preTourPlan.version))
    .limit(1);

  return {
    ...plan,
    nextVersion: Math.max(Number(latestVersion?.version ?? 0), Number(plan.version ?? 0)) + 1,
  };
}

function serializeRows(rows: MasterRow[], formatter: (row: MasterRow) => string) {
  return rows.map((row) => `- ${formatter(row)}`).join("\n");
}

function clipText(value: unknown, maxLength: number) {
  const normalized = textOf(value).replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(maxLength - 3, 1)).trimEnd()}...`;
}

function compactPromptText(value: string, maxChars: number) {
  const normalized = value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(maxChars - 24, 1)).trimEnd()}\n...[brief truncated]`;
}

function joinPromptParts(parts: Array<string | null | undefined>, separator = " | ") {
  return parts
    .map((part) => textOf(part))
    .filter((part) => part.length > 0)
    .join(separator);
}

function summarizeCategoryRuleForPrompt(rule: MasterRow | null) {
  if (!rule) return null;

  const required = [
    Boolean(rule.requireHotel) && "hotel",
    Boolean(rule.requireTransport) && "transport",
    Boolean(rule.requireItinerary) && "itinerary",
    Boolean(rule.requireActivity) && "activity",
    Boolean(rule.requireCeremony) && "ceremony",
  ].filter(Boolean) as string[];

  const flexibility = [
    Boolean(rule.allowMultipleHotels) ? "multi-hotel" : "single-hotel",
    Boolean(rule.allowWithoutHotel) ? "hotel optional" : null,
    Boolean(rule.allowWithoutTransport) ? "transport optional" : null,
  ];

  const ranges = [
    rule.minDays !== null && rule.minDays !== undefined ? `minDays=${rule.minDays}` : null,
    rule.maxDays !== null && rule.maxDays !== undefined ? `maxDays=${rule.maxDays}` : null,
    rule.minNights !== null && rule.minNights !== undefined ? `minNights=${rule.minNights}` : null,
    rule.maxNights !== null && rule.maxNights !== undefined ? `maxNights=${rule.maxNights}` : null,
  ];

  return joinPromptParts(
    [
      required.length ? `required=${required.join("/")}` : "required=none",
      joinPromptParts(flexibility, ", "),
      joinPromptParts(ranges, ", "),
    ],
    " | "
  );
}

function summarizeSeasonOverlapForPrompt(seasons: MasterRow[]) {
  if (!seasons.length) return "none";
  const listed = seasons.slice(0, 3).map((row) =>
    joinPromptParts(
      [
        textOf(row.code || row.name),
        textOf(row.startDate) && textOf(row.endDate)
          ? `${textOf(row.startDate)} to ${textOf(row.endDate)}`
          : null,
      ],
      " "
    )
  );
  const moreCount = seasons.length - listed.length;
  return moreCount > 0 ? `${listed.join(", ")} (+${moreCount} more)` : listed.join(", ");
}

function summarizeInputSourceForPrompt(context: PreTourAIMasterContext) {
  if (!context.request.emailContext) {
    return context.request.sourceType === "PROMPT" ? "manual prompt" : context.request.sourceType;
  }

  return joinPromptParts(
    [
      context.request.sourceType,
      textOf(context.request.emailContext.accountEmail),
      context.request.emailContext.fromEmail
        ? `from=${textOf(context.request.emailContext.fromEmail)}`
        : null,
      context.request.emailContext.subject
        ? `subject=${clipText(context.request.emailContext.subject, 72)}`
        : null,
      context.request.emailContext.receivedAt
        ? `received=${context.request.emailContext.receivedAt.slice(0, 10)}`
        : null,
    ]
  );
}

function summarizeSourceItemForPrompt(
  item: PreTourAISourcePlanOutline["days"][number]["items"][number],
  profile: PromptProfile
) {
  const limits = PROMPT_PROFILE_LIMITS[profile];
  const primaryLabel = clipText(item.serviceCode || item.title || item.locationCode || "", limits.textChars);
  const movement = joinPromptParts([item.fromLocationCode, item.toLocationCode], "->");
  const location = item.locationCode ? `@${item.locationCode}` : null;
  const duration = item.nights ? `${item.nights}n` : null;

  return joinPromptParts(
    [
      item.itemType,
      primaryLabel ? `(${primaryLabel})` : null,
      movement,
      location,
      duration,
    ],
    " "
  );
}

function buildSourcePlanPromptBlock(
  sourcePlanOutline: PreTourAISourcePlanOutline,
  profile: PromptProfile
) {
  const limits = PROMPT_PROFILE_LIMITS[profile];
  const lines: string[] = [];

  lines.push(
    `Current pre-tour baseline: ${joinPromptParts([
      `${sourcePlanOutline.plan.planCode} v${sourcePlanOutline.plan.version}`,
      clipText(sourcePlanOutline.plan.title, limits.textChars),
      `${sourcePlanOutline.plan.startDate.slice(0, 10)} to ${sourcePlanOutline.plan.endDate.slice(0, 10)}`,
    ])}`
  );

  if (sourcePlanOutline.plan.notes) {
    lines.push(`Baseline notes: ${clipText(sourcePlanOutline.plan.notes, limits.noteChars)}`);
  }

  if (sourcePlanOutline.additionalCategories.length) {
    lines.push(
      `Current categories: ${sourcePlanOutline.additionalCategories
        .slice(0, limits.categories)
        .map((entry) => entry.categoryCode)
        .join(", ")}`
    );
  }

  if (sourcePlanOutline.guideAllocations.length) {
    lines.push(
      `Guide coverage: ${sourcePlanOutline.guideAllocations
        .slice(0, 4)
        .map((entry) =>
          joinPromptParts(
            [
              entry.serviceCode || clipText(entry.title, limits.textChars),
              entry.coverageMode,
              entry.startDayNumber ? `start=${entry.startDayNumber}` : null,
              entry.endDayNumber ? `end=${entry.endDayNumber}` : null,
            ],
            " "
          )
        )
        .join("; ")}`
    );
  }

  if (sourcePlanOutline.technicalVisits.length) {
    lines.push(
      `Technical visits: ${sourcePlanOutline.technicalVisits
        .slice(0, 6)
        .map((entry) =>
          joinPromptParts(
            [entry.technicalVisitCode, entry.dayNumber ? `day=${entry.dayNumber}` : null],
            " "
          )
        )
        .join(", ")}`
    );
  }

  lines.push("Current day flow:");
  for (const day of sourcePlanOutline.days) {
    const itemSummary = day.items
      .slice(0, limits.dayItems)
      .map((item) => summarizeSourceItemForPrompt(item, profile))
      .filter((entry) => entry.length > 0)
      .join("; ");
    const extraItems = day.items.length - Math.min(day.items.length, limits.dayItems);
    const route = joinPromptParts([day.startLocationCode, day.endLocationCode], "->");
    const dayLine = joinPromptParts(
      [
        `D${day.dayNumber}`,
        day.date.slice(0, 10),
        clipText(day.title || "", limits.textChars),
        route,
        itemSummary,
        extraItems > 0 ? `+${extraItems} more` : null,
      ]
    );
    lines.push(`- ${dayLine}`);
  }

  return lines;
}

function buildPromptSection(title: string, rows: MasterRow[], formatter: (row: MasterRow) => string) {
  if (!rows.length) {
    return [`${title}: none`];
  }
  return [`${title}:`, serializeRows(rows, formatter)];
}

function buildGenerationPrompts(
  context: PreTourAIMasterContext,
  sourcePlanOutline: PreTourAISourcePlanOutline | null = null,
  profile: PromptProfile = "standard"
) {
  const limits = PROMPT_PROFILE_LIMITS[profile];
  const terms = tokenize(
    [
      context.request.prompt,
      textOf(context.category.name),
      textOf(context.operator.name),
      textOf(context.market.name),
      context.request.preferredLanguage ?? "",
      context.request.mealPreference ?? "",
    ].join(" ")
  );

  const relevantLocations = pickRelevantRows(
    context.locations.filter((row) => Boolean(row.isActive ?? true)),
    terms,
    ["code", "name", "country", "region", "address", "tags", "notes"],
    limits.locations
  );
  const relevantActivities = pickRelevantRows(
    context.activities.filter((row) => Boolean(row.isActive ?? true)),
    terms,
    ["code", "name", "type", "location", "locationRole", "shortDescription", "description"],
    limits.activities
  );
  const hotelFields = [
    "code",
    "name",
    "city",
    "country",
    "address",
    "description",
    "locationCode",
    "locationName",
    "locationRegion",
    "locationCountry",
    "locationAddress",
  ];
  const relevantLocationTerms = [
    ...new Set(
      relevantLocations.flatMap((row) =>
        tokenize(
          joinPromptParts(
            [
              textOf(row.code),
              textOf(row.name),
              textOf(row.region),
              textOf(row.country),
              textOf(row.address),
            ],
            " "
          )
        )
      )
    ),
  ];
  const activeHotels = context.hotels.filter((row) => Boolean(row.isActive ?? true));
  const relevantHotels = mergeUniqueRows([
    pickRelevantRows(
      activeHotels,
      relevantLocationTerms,
      hotelFields,
      limits.hotels
    ),
    pickRelevantRows(
      activeHotels,
      terms,
      hotelFields,
      limits.hotels
    ),
  ], limits.hotels);
  const relevantGuides = pickRelevantRows(
    context.guides.filter((row) => Boolean(row.isActive ?? true)),
    terms,
    ["code", "displayName", "fullName", "city", "country", "bio"],
    limits.guides
  );
  const relevantTechnicalVisits = pickRelevantRows(
    context.technicalVisits.filter((row) => Boolean(row.isActive ?? true)),
    terms,
    ["code", "name", "title", "location", "description", "notes"],
    limits.technicalVisits
  );
  const activeAdditionalCategories = context.categories.filter(
    (row) => Boolean(row.isActive ?? true) && String(row.id) !== String(context.category.id)
  );
  const sameTypeAdditionalCategories = activeAdditionalCategories.filter(
    (row) =>
      !context.category.typeId || String(row.typeId ?? "") === String(context.category.typeId)
  );
  const relevantCategories = pickRelevantRows(
    sameTypeAdditionalCategories.length > 0
      ? sameTypeAdditionalCategories
      : activeAdditionalCategories,
    terms,
    ["code", "name"],
    limits.categories
  );

  const totalNights = toNightCount(context.request.startDate, context.request.endDate);
  const totalDays = totalNights + 1;
  const categoryRule = context.categoryRule;
  const isRevision = context.request.mode === "REVISE" && sourcePlanOutline;
  const normalizedBrief = compactPromptText(context.request.prompt, limits.promptChars);

  const systemPrompt = [
    "You are a senior travel-product planning engine for a tourism SaaS Pre-Tour module.",
    "Generate a quotation-stage pre-tour draft using only the supplied master data.",
    "Never invent master codes. If there is no reliable match, return null for that code and add a warning.",
    "Return exactly one day object per calendar day in the requested date range.",
    "Prefer realistic travel flow, logical routing, and source-of-truth master-data selections.",
    "Do not fabricate prices, taxes, or FX data. This draft is for structure and service selection only.",
    "Keep wording concise, operationally useful, and ready for review by sales and operations.",
    "For ACCOMMODATION items, select hotel codes whose linked master location matches the overnight destination whenever possible.",
    context.request.sourceType === "PROMPT"
      ? "The traveler brief was entered manually."
      : "The traveler brief may have been derived from an email intake step. Treat the prompt as the normalized request, but respect any email-source metadata provided in the header context.",
    isRevision
      ? "This request is a revision of an existing pre-tour. Improve or restructure the current plan only where the prompt, date window, or master-data fit requires it."
      : "This request is for a brand-new pre-tour draft.",
  ].join("\n");

  const headerLines = [
    "Selected header context:",
    `- Market: ${joinPromptParts([textOf(context.market.code), textOf(context.market.name)])}`,
    `- Operator: ${joinPromptParts([textOf(context.operator.code), textOf(context.operator.name)])}`,
    `- Primary category: ${joinPromptParts([textOf(context.category.code), textOf(context.category.name)])}`,
    `- Travel window: ${context.request.startDate.slice(0, 10)} to ${context.request.endDate.slice(0, 10)} (${totalDays} days / ${totalNights} nights)`,
    `- Pax: adults=${context.request.adults}, children=${context.request.children}, infants=${context.request.infants}`,
    `- Preferences: ${joinPromptParts([
      `currency=${textOf(context.currency.code)}`,
      `priceMode=${context.request.priceMode}`,
      context.request.preferredLanguage ? `language=${context.request.preferredLanguage}` : null,
      context.request.roomPreference ? `room=${context.request.roomPreference}` : null,
      context.request.mealPreference ? `meal=${context.request.mealPreference}` : null,
    ])}`,
    `- Input source: ${summarizeInputSourceForPrompt(context)}`,
    `- Category rules: ${summarizeCategoryRuleForPrompt(categoryRule) || "none"}`,
    `- Season overlap: ${summarizeSeasonOverlapForPrompt(context.overlappingSeasons)}`,
  ];

  const userPrompt = [
    ...headerLines,
    "",
    isRevision ? "Revision brief:" : "Traveler request:",
    normalizedBrief,
    ...(sourcePlanOutline
      ? [
          "",
          ...buildSourcePlanPromptBlock(sourcePlanOutline, profile),
          "",
          "Revision rules:",
          "1. Treat the current pre-tour as the baseline, not as immutable truth.",
          "2. Keep confirmed logistics where they still make sense, but improve routing, sequencing, and service fit when the brief requires it.",
          "3. If the requested travel window differs from the source plan, align every day to the new requested dates and lengths.",
          "4. Do not copy invalid or missing master-data references forward. Resolve them using the supplied master lists or set them to null with warnings.",
        ]
      : []),
    "",
    ...buildPromptSection("Allowed additional categories", relevantCategories, (row) => {
      const type = context.categoryTypes.find((entry) => String(entry.id) === String(row.typeId));
      return joinPromptParts([
        textOf(row.code),
        textOf(row.name),
        type ? `type=${textOf(type.code ?? type.name ?? "")}` : null,
      ]);
    }),
    "",
    ...buildPromptSection("Locations", relevantLocations, (row) =>
      joinPromptParts([
        textOf(row.code),
        clipText(row.name, limits.textChars),
        textOf(row.region),
        textOf(row.country),
      ])
    ),
    "",
    ...buildPromptSection("Hotels", relevantHotels, (row) =>
      joinPromptParts([
        textOf(row.code),
        clipText(row.name, limits.textChars),
        row.locationCode || row.locationName
          ? `location=${joinPromptParts([
              textOf(row.locationCode),
              clipText(row.locationName, limits.textChars),
              textOf(row.locationRegion),
            ], " ")}`
          : null,
        textOf(row.city),
        textOf(row.country),
        textOf(row.starRating) ? `star=${textOf(row.starRating)}` : null,
      ])
    ),
    "",
    ...buildPromptSection("Activities", relevantActivities, (row) =>
      joinPromptParts([
        textOf(row.code),
        clipText(row.name, limits.textChars),
        textOf(row.type) ? `type=${textOf(row.type)}` : null,
        textOf(row.location) ? `location=${clipText(row.location, limits.textChars)}` : null,
        textOf(row.durationMin) ? `durationMin=${textOf(row.durationMin)}` : null,
      ])
    ),
    "",
    ...buildPromptSection("Guides", relevantGuides, (row) =>
      joinPromptParts([
        textOf(row.code),
        clipText(row.displayName || row.fullName, limits.textChars),
        textOf(row.city),
        textOf(row.country),
      ])
    ),
    "",
    ...buildPromptSection("Technical visits", relevantTechnicalVisits, (row) =>
      joinPromptParts([
        textOf(row.code),
        clipText(row.title || row.name, limits.textChars),
        textOf(row.location),
      ])
    ),
    "",
    "Output rules:",
    "1. Use the supplied market/operator/category as fixed header values.",
    "2. Ensure every day has a clear title, dayNumber, date, and sensible item set.",
    "3. Use TRANSPORT items for route movement. Use ACTIVITY, ACCOMMODATION, GUIDE, CEREMONY, SUPPLEMENT, or MISC as appropriate.",
    "4. ACCOMMODATION, ACTIVITY, GUIDE, and TECHNICAL_VISIT codes should be from the lists above when used. Accommodation must prefer hotels tied to the matching overnight location.",
    "5. If a good match is uncertain, set the code to null and add a warning or unresolved question.",
    "6. Keep the plan summary concise, keep notes sparse, and keep each rationale short and operational.",
    "7. Limit assumptions, unresolved questions, and warnings to material review items only.",
    "8. Keep the draft realistic and commercially reviewable.",
  ].join("\n");

  return { systemPrompt, userPrompt };
}

type AccommodationLocationPriority = {
  code: string;
  weight: number;
};

function buildAccommodationLocationPriorities(
  day: PreTourAIDraft["days"][number],
  itemIndex: number
) {
  const weighted = new Map<string, number>();
  const push = (code: string | null | undefined, weight: number) => {
    const normalized = normalizedCode(code);
    if (!normalized) return;
    const current = weighted.get(normalized) ?? 0;
    if (weight > current) weighted.set(normalized, weight);
  };

  const item = day.items[itemIndex];
  push(item.locationCode, 700);
  push(day.endLocationCode, 520);

  for (let index = itemIndex - 1; index >= 0; index -= 1) {
    const candidate = day.items[index];
    if (candidate.itemType === "TRANSPORT" && candidate.toLocationCode) {
      push(candidate.toLocationCode, Math.max(420, 500 - (itemIndex - index) * 25));
      break;
    }
  }

  for (let index = itemIndex - 1; index >= 0; index -= 1) {
    const candidate = day.items[index];
    if (candidate.locationCode) {
      push(candidate.locationCode, Math.max(260, 340 - (itemIndex - index) * 20));
      break;
    }
  }

  push(day.startLocationCode, 220);

  return [...weighted.entries()]
    .map(([code, weight]) => ({ code, weight }))
    .sort((left, right) => right.weight - left.weight);
}

function findHotelsForLocationCode(
  locationCode: string,
  locationByCode: Map<string, MasterRow>,
  activeHotels: MasterRow[]
) {
  const normalizedLocationCode = normalizedCode(locationCode);
  if (!normalizedLocationCode) return [];

  const directMatches = activeHotels.filter(
    (hotel) => normalizedCode(hotel.locationCode) === normalizedLocationCode
  );
  if (directMatches.length > 0) return directMatches;

  const location = locationByCode.get(normalizedLocationCode);
  if (!location) return [];

  const locationName = normalizedCode(location.name);
  const locationRegion = normalizedCode(location.region);
  const locationCountry = normalizedCode(location.country);

  return activeHotels.filter((hotel) => {
    const hotelRegionCandidates = [
      normalizedCode(hotel.locationName),
      normalizedCode(hotel.locationRegion),
      normalizedCode(hotel.city),
    ].filter(Boolean);
    const regionMatch =
      (locationName.length > 0 && hotelRegionCandidates.includes(locationName)) ||
      (locationRegion.length > 0 && hotelRegionCandidates.includes(locationRegion));
    const hotelCountryCandidates = [
      normalizedCode(hotel.locationCountry),
      normalizedCode(hotel.country),
    ].filter(Boolean);
    const countryMatch =
      locationCountry.length === 0 || hotelCountryCandidates.includes(locationCountry);
    return regionMatch && countryMatch;
  });
}

function scoreAccommodationHotelCandidate(input: {
  hotel: MasterRow;
  item: PreTourAIDraft["days"][number]["items"][number];
  locationPriorities: AccommodationLocationPriority[];
  locationByCode: Map<string, MasterRow>;
}) {
  const textTerms = tokenize(
    joinPromptParts(
      [
        input.item.serviceCode,
        input.item.title,
        input.item.description,
        input.item.notes,
        input.item.rationale,
      ],
      " "
    )
  );
  const hotelText = joinPromptParts(
    [
      textOf(input.hotel.code),
      textOf(input.hotel.name),
      textOf(input.hotel.description),
      textOf(input.hotel.locationCode),
      textOf(input.hotel.locationName),
      textOf(input.hotel.locationRegion),
      textOf(input.hotel.locationCountry),
      textOf(input.hotel.city),
      textOf(input.hotel.country),
      textOf(input.hotel.address),
    ],
    " "
  );

  let score = scoreByTerms(hotelText, textTerms);

  for (const priority of input.locationPriorities) {
    const hotelLocationCode = normalizedCode(input.hotel.locationCode);
    if (hotelLocationCode && hotelLocationCode === priority.code) {
      score += priority.weight + 240;
      continue;
    }

    const location = input.locationByCode.get(priority.code);
    if (!location) continue;

    const locationName = normalizedCode(location.name);
    const locationRegion = normalizedCode(location.region);
    const locationCountry = normalizedCode(location.country);
    const hotelRegionCandidates = [
      normalizedCode(input.hotel.locationName),
      normalizedCode(input.hotel.locationRegion),
      normalizedCode(input.hotel.city),
    ].filter(Boolean);
    const hotelCountryCandidates = [
      normalizedCode(input.hotel.locationCountry),
      normalizedCode(input.hotel.country),
    ].filter(Boolean);
    const regionMatch =
      (locationName.length > 0 && hotelRegionCandidates.includes(locationName)) ||
      (locationRegion.length > 0 && hotelRegionCandidates.includes(locationRegion));
    const countryMatch =
      locationCountry.length === 0 || hotelCountryCandidates.includes(locationCountry);
    if (regionMatch && countryMatch) {
      score += priority.weight + 120;
    }
  }

  return score;
}

function reconcileDraftAccommodationHotels(
  draft: PreTourAIDraft,
  context: PreTourAIMasterContext
): PreTourAIDraft {
  const activeHotels = context.hotels.filter((row) => Boolean(row.isActive ?? true));
  if (activeHotels.length === 0) return draft;

  const hotelByCode = buildMapByCode(activeHotels);
  const locationByCode = buildMapByCode(context.locations);
  const hotelFields = [
    "code",
    "name",
    "description",
    "locationCode",
    "locationName",
    "locationRegion",
    "locationCountry",
    "city",
    "country",
    "address",
  ];

  let resolvedCount = 0;
  const nextDays = draft.days.map((day) => ({
    ...day,
    items: day.items.map((item, itemIndex) => {
      if (item.itemType !== "ACCOMMODATION") {
        return item;
      }

      const currentHotel =
        item.serviceCode ? hotelByCode.get(normalizedCode(item.serviceCode)) ?? null : null;
      const locationPriorities = buildAccommodationLocationPriorities(day, itemIndex);

      if (currentHotel && locationPriorities.length === 0) {
        return item;
      }

      const locationCandidates = mergeUniqueRows(
        locationPriorities.map((priority) =>
          findHotelsForLocationCode(priority.code, locationByCode, activeHotels)
        ),
        activeHotels.length
      );

      const textTerms = tokenize(
        joinPromptParts(
          [item.serviceCode, item.title, item.description, item.notes, item.rationale],
          " "
        )
      );
      const textCandidates =
        textTerms.length > 0
          ? pickRelevantRows(activeHotels, textTerms, hotelFields, Math.min(activeHotels.length, 24))
          : [];

      const candidatePool = mergeUniqueRows(
        [
          currentHotel ? [currentHotel] : [],
          locationCandidates,
          textCandidates,
        ],
        Math.min(activeHotels.length, 60)
      );

      let selectedHotel = currentHotel;
      let selectedScore = currentHotel
        ? scoreAccommodationHotelCandidate({
            hotel: currentHotel,
            item,
            locationPriorities,
            locationByCode,
          }) + 40
        : Number.NEGATIVE_INFINITY;

      for (const hotel of candidatePool) {
        const score =
          scoreAccommodationHotelCandidate({
            hotel,
            item,
            locationPriorities,
            locationByCode,
          }) + (currentHotel && String(hotel.id) === String(currentHotel.id) ? 40 : 0);
        if (score > selectedScore) {
          selectedHotel = hotel;
          selectedScore = score;
        }
      }

      if (!selectedHotel) {
        return item;
      }

      const resolvedServiceCode = textOf(selectedHotel.code) || textOf(item.serviceCode);
      const resolvedLocationCode =
        textOf(item.locationCode) ||
        textOf(selectedHotel.locationCode) ||
        locationPriorities[0]?.code ||
        null;

      const serviceCodeChanged =
        normalizedCode(resolvedServiceCode) !== normalizedCode(item.serviceCode);
      const locationCodeChanged =
        normalizedCode(resolvedLocationCode) !== normalizedCode(item.locationCode);

      if (!serviceCodeChanged && !locationCodeChanged) {
        return item;
      }

      resolvedCount += 1;
      return {
        ...item,
        serviceCode: resolvedServiceCode || item.serviceCode,
        locationCode: resolvedLocationCode || item.locationCode,
      };
    }),
  }));

  if (resolvedCount === 0) {
    return draft;
  }

  const warnings =
    draft.warnings.length < 30
      ? [
          ...draft.warnings,
          {
            severity: "low" as const,
            code: "ACCOMMODATION_AUTO_MATCHED",
            message: `Resolved ${resolvedCount} accommodation item(s) using hotel location mapping.`,
          },
        ]
      : draft.warnings;

  return {
    ...draft,
    days: nextDays,
    warnings,
  };
}

export function buildPreTourAIDraftValidation(
  draft: PreTourAIDraft,
  context: PreTourAIMasterContext
): PreTourAIDraftValidation {
  const issues: PreTourAIDraftValidation["issues"] = [];
  const locationByCode = buildMapByCode(context.locations);
  const activityByCode = buildMapByCode(context.activities);
  const hotelByCode = buildMapByCode(context.hotels);
  const guideByCode = buildMapByCode(context.guides);
  const categoryByCode = buildMapByCode(context.categories);
  const technicalVisitByCode = buildMapByCode(context.technicalVisits);
  const categoryTypeById = new Map(
    context.categoryTypes.map((row) => [String(row.id), row] as const)
  );

  let resolvedReferenceCount = 0;
  let unresolvedReferenceCount = 0;
  const referenceCounter = (resolved: boolean) => {
    if (resolved) resolvedReferenceCount += 1;
    else unresolvedReferenceCount += 1;
  };

  const requestedDayCount = toNightCount(context.request.startDate, context.request.endDate) + 1;
  let dayIntegrityPassed = true;
  if (draft.days.length !== requestedDayCount) {
    dayIntegrityPassed = false;
    issues.push({
      severity: "high",
      scope: "DAY",
      path: "days",
      message: `Draft contains ${draft.days.length} days but the selected date range requires ${requestedDayCount} days.`,
    });
  }

  const accommodationCount = { value: 0 };
  const transportCount = { value: 0 };
  const activityCount = { value: 0 };
  const ceremonyCount = { value: 0 };

  draft.days.forEach((day, index) => {
    const expectedDayNumber = index + 1;
    const expectedDate = addDays(context.request.startDate, index).toISOString().slice(0, 10);

    if (day.dayNumber !== expectedDayNumber) {
      dayIntegrityPassed = false;
      issues.push({
        severity: "high",
        scope: "DAY",
        path: `days.${index}.dayNumber`,
        message: `Expected day number ${expectedDayNumber} but received ${day.dayNumber}.`,
      });
    }

    if (day.date.slice(0, 10) !== expectedDate) {
      issues.push({
        severity: "medium",
        scope: "DAY",
        path: `days.${index}.date`,
        message: `Day ${day.dayNumber} date does not match the selected range. Expected ${expectedDate}.`,
      });
    }

    for (const [fieldName, code] of [
      ["startLocationCode", day.startLocationCode],
      ["endLocationCode", day.endLocationCode],
    ] as const) {
      if (!code) continue;
      const resolved = locationByCode.has(normalizedCode(code));
      referenceCounter(resolved);
      if (!resolved) {
        issues.push({
          severity: "medium",
          scope: "DAY",
          path: `days.${index}.${fieldName}`,
          message: `Location code ${code} was not found in master data.`,
        });
      }
    }

    day.items.forEach((item, itemIndex) => {
      const path = `days.${index}.items.${itemIndex}`;
      const itemType = item.itemType;
      if (itemType === "ACCOMMODATION") accommodationCount.value += 1;
      if (itemType === "TRANSPORT") transportCount.value += 1;
      if (itemType === "ACTIVITY") activityCount.value += 1;
      if (itemType === "CEREMONY") ceremonyCount.value += 1;

      if (itemType === "TRANSPORT") {
        for (const [fieldName, code] of [
          ["fromLocationCode", item.fromLocationCode],
          ["toLocationCode", item.toLocationCode],
        ] as const) {
          if (!code) {
            issues.push({
              severity: "high",
              scope: "ITEM",
              path: `${path}.${fieldName}`,
              message: "Transport items must include both from and to location codes.",
            });
            unresolvedReferenceCount += 1;
            continue;
          }
          const resolved = locationByCode.has(normalizedCode(code));
          referenceCounter(resolved);
          if (!resolved) {
            issues.push({
              severity: "high",
              scope: "ITEM",
              path: `${path}.${fieldName}`,
              message: `Transport location code ${code} was not found in master data.`,
            });
          }
        }
      }

      if (item.locationCode) {
        const resolved = locationByCode.has(normalizedCode(item.locationCode));
        referenceCounter(resolved);
        if (!resolved) {
          issues.push({
            severity: "medium",
            scope: "ITEM",
            path: `${path}.locationCode`,
            message: `Location code ${item.locationCode} was not found in master data.`,
          });
        }
      }

      const requiredServiceCode = ["ACTIVITY", "ACCOMMODATION", "GUIDE"].includes(itemType);
      if (requiredServiceCode && !item.serviceCode) {
        issues.push({
          severity: "high",
          scope: "ITEM",
          path: `${path}.serviceCode`,
          message: `${itemType} items must use a master-data service code.`,
        });
        unresolvedReferenceCount += 1;
      } else if (item.serviceCode) {
        const code = normalizedCode(item.serviceCode);
        const resolved =
          itemType === "ACTIVITY"
            ? activityByCode.has(code)
            : itemType === "ACCOMMODATION"
              ? hotelByCode.has(code)
              : itemType === "GUIDE"
                ? guideByCode.has(code)
                : true;
        referenceCounter(resolved);
        if (!resolved) {
          issues.push({
            severity: requiredServiceCode ? "high" : "medium",
            scope: "ITEM",
            path: `${path}.serviceCode`,
            message: `${itemType} service code ${item.serviceCode} was not found in master data.`,
          });
        }
      }
    });
  });

  draft.additionalCategories.forEach((entry, index) => {
    const category = categoryByCode.get(normalizedCode(entry.categoryCode));
    referenceCounter(Boolean(category));
    if (!category) {
      issues.push({
        severity: "high",
        scope: "CATEGORY",
        path: `additionalCategories.${index}.categoryCode`,
        message: `Tour category code ${entry.categoryCode} was not found in master data.`,
      });
    }
  });

  const categoriesByType = new Map<string, string[]>();
  draft.additionalCategories.forEach((entry) => {
    const category = categoryByCode.get(normalizedCode(entry.categoryCode));
    if (!category) return;
    const typeId = String(category.typeId || "");
    categoriesByType.set(typeId, [...(categoriesByType.get(typeId) ?? []), String(category.id)]);
  });
  for (const [typeId, categoryIds] of categoriesByType) {
    const type = categoryTypeById.get(typeId);
    if (!type || Boolean(type.allowMultiple)) continue;
    if (categoryIds.length > 1) {
      issues.push({
        severity: "high",
        scope: "CATEGORY",
        path: "additionalCategories",
        message: `Category type ${textOf(type.name || type.code)} allows only one selection.`,
      });
    }
  }

  draft.guideAllocations.forEach((allocation, index) => {
    const path = `guideAllocations.${index}`;
    if (allocation.serviceCode) {
      const resolved = guideByCode.has(normalizedCode(allocation.serviceCode));
      referenceCounter(resolved);
      if (!resolved) {
        issues.push({
          severity: "high",
          scope: "GUIDE",
          path: `${path}.serviceCode`,
          message: `Guide code ${allocation.serviceCode} was not found in master data.`,
        });
      }
    }

    if (allocation.coverageMode === "DAY_RANGE") {
      if (!allocation.startDayNumber || !allocation.endDayNumber) {
        issues.push({
          severity: "high",
          scope: "GUIDE",
          path,
          message: "Guide day-range allocations require both start and end day numbers.",
        });
      } else if (allocation.startDayNumber > allocation.endDayNumber) {
        issues.push({
          severity: "high",
          scope: "GUIDE",
          path,
          message: "Guide allocation start day cannot be after the end day.",
        });
      }
    }
  });

  draft.technicalVisits.forEach((visit, index) => {
    const resolved = technicalVisitByCode.has(normalizedCode(visit.technicalVisitCode));
    referenceCounter(resolved);
    if (!resolved) {
      issues.push({
        severity: "high",
        scope: "TECHNICAL_VISIT",
        path: `technicalVisits.${index}.technicalVisitCode`,
        message: `Technical visit code ${visit.technicalVisitCode} was not found in master data.`,
      });
    }
  });

  const rule = context.categoryRule;
  if (rule) {
    const allowMultipleHotels = Boolean(rule.allowMultipleHotels);
    const mustHaveHotel = Boolean(rule.requireHotel) || !Boolean(rule.allowWithoutHotel);
    const mustHaveTransport =
      Boolean(rule.requireTransport) || !Boolean(rule.allowWithoutTransport);

    if (!allowMultipleHotels && accommodationCount.value > 1) {
      issues.push({
        severity: "high",
        scope: "GENERAL",
        path: "days",
        message: "Selected category allows only one accommodation item for the full pre-tour.",
      });
    }
    if (mustHaveHotel && accommodationCount.value === 0) {
      issues.push({
        severity: "high",
        scope: "GENERAL",
        path: "days",
        message: "Selected category requires at least one accommodation item.",
      });
    }
    if (mustHaveTransport && transportCount.value === 0) {
      issues.push({
        severity: "high",
        scope: "GENERAL",
        path: "days",
        message: "Selected category requires at least one transport item.",
      });
    }
    if (Boolean(rule.requireActivity) && activityCount.value === 0) {
      issues.push({
        severity: "high",
        scope: "GENERAL",
        path: "days",
        message: "Selected category requires at least one activity item.",
      });
    }
    if (Boolean(rule.requireCeremony) && ceremonyCount.value === 0) {
      issues.push({
        severity: "high",
        scope: "GENERAL",
        path: "days",
        message: "Selected category requires at least one ceremony item.",
      });
    }
  }

  if (context.overlappingSeasons.length === 0) {
    issues.push({
      severity: "low",
      scope: "SEASON",
      path: "header",
      message: "No active season overlaps the selected travel dates. Review seasonal assumptions.",
    });
  }

  for (const warning of draft.warnings) {
    issues.push({
      severity: warning.severity,
      scope: "GENERAL",
      path: "warnings",
      message: warning.message,
    });
  }

  const canApply = !issues.some((issue) => issue.severity === "high");
  const totalReferences = resolvedReferenceCount + unresolvedReferenceCount;
  const masterCoveragePercent =
    totalReferences === 0 ? 100 : Math.round((resolvedReferenceCount / totalReferences) * 100);

  const overallAccuracy =
    !canApply || masterCoveragePercent < 60
      ? "low"
      : issues.some((issue) => issue.severity === "medium") || masterCoveragePercent < 90
        ? "medium"
        : "high";

  return {
    canApply,
    overallAccuracy,
    masterCoveragePercent,
    resolvedReferenceCount,
    unresolvedReferenceCount,
    dayIntegrityPassed,
    overlappingSeasons: context.overlappingSeasons.map((row) => textOf(row.code || row.name)),
    issues,
  };
}

function buildDraftJsonSchema() {
  const rawSchema = z.toJSONSchema(preTourAIDraftSchema);
  return optimizeDraftJsonSchemaForModel(
    normalizeJsonSchema(rawSchema as Record<string, unknown>)
  );
}

function resolveGenerationMaxOutputTokens(request: PreTourAIRequest) {
  const totalDays = toNightCount(request.startDate, request.endDate) + 1;
  return Math.min(5200, Math.max(2600, 1700 + totalDays * 300));
}

function resolveRetryGenerationMaxOutputTokens(request: PreTourAIRequest) {
  const totalDays = toNightCount(request.startDate, request.endDate) + 1;
  const baseTokens = resolveGenerationMaxOutputTokens(request);
  const expandedTokens =
    2600 + totalDays * 420 + (request.mode === "REVISE" ? 700 : 0);
  return Math.min(9000, Math.max(baseTokens + 1800, expandedTokens));
}

function shouldRetryWithCompactPrompt(error: unknown) {
  const message = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  return (
    message.includes("max_output_tokens") ||
    message.includes("maximum token") ||
    message.includes("too many tokens") ||
    message.includes("context length") ||
    message.includes("context_length") ||
    message.includes("incomplete structured response")
  );
}

async function recordGeneratedAIRun(options: {
  context: PreTourAIMasterContext;
  request: PreTourAIRequest;
  draft: PreTourAIDraft;
  validation: PreTourAIDraftValidation;
  model: string;
}) {
  const { context, request, draft, validation, model } = options;
  const issueCounts = summarizeValidationIssues(validation);
  const [created] = await db
    .insert(schema.preTourAiRun)
    .values({
      companyId: context.companyId,
      code: buildScopedCode("PTAIRUN", [request.mode, compactDate(request.startDate)]),
      mode: request.mode,
      sourcePlanId: request.mode === "REVISE" ? request.sourcePlanId ?? null : null,
      resultingPlanId: null,
      prompt: request.prompt,
      travelStartDate: new Date(request.startDate),
      travelEndDate: new Date(request.endDate),
      model,
      requestSnapshot: request as Record<string, unknown>,
      draftSnapshot: draft as Record<string, unknown>,
      validationSnapshot: validation as Record<string, unknown>,
      draftTitle: draft.plan.title,
      draftDayCount: draft.days.length,
      overallAccuracy: validation.overallAccuracy,
      masterCoveragePercent: Math.round(validation.masterCoveragePercent),
      resolvedReferenceCount: validation.resolvedReferenceCount,
      unresolvedReferenceCount: validation.unresolvedReferenceCount,
      blockingIssueCount: issueCounts.blocking,
      mediumIssueCount: issueCounts.medium,
      lowIssueCount: issueCounts.low,
      canApply: validation.canApply,
      reviewStatus: "PENDING",
      reviewScore: null,
      reviewNotes: null,
      createdByUserId: context.userId,
      createdByName: context.userName,
    })
    .returning({ id: schema.preTourAiRun.id });

  return String(created.id);
}

async function attachAppliedPlanToAIRun(options: {
  runId: string;
  companyId: string;
  userId: string | null;
  userName: string | null;
  planId: string;
}) {
  const { runId, companyId, userId, userName, planId } = options;
  const appliedAt = new Date();
  const [updated] = await db
    .update(schema.preTourAiRun)
    .set({
      resultingPlanId: planId,
      appliedAt,
      appliedByUserId: userId,
      appliedByName: userName,
      updatedAt: appliedAt,
    })
    .where(and(eq(schema.preTourAiRun.id, runId), eq(schema.preTourAiRun.companyId, companyId)))
    .returning({ id: schema.preTourAiRun.id });

  if (!updated) {
    throw new PreTourAIError(404, "AI_RUN_NOT_FOUND", "AI run record was not found.");
  }
}

async function ensureAIRunApplied(options: {
  runId?: string | null;
  context: PreTourAIMasterContext;
  request: PreTourAIRequest;
  draft: PreTourAIDraft;
  validation: PreTourAIDraftValidation;
  planId: string;
}) {
  const { runId, context, request, draft, validation, planId } = options;
  if (runId) {
    await attachAppliedPlanToAIRun({
      runId,
      companyId: context.companyId,
      userId: context.userId,
      userName: context.userName,
      planId,
    });
    return runId;
  }

  const issueCounts = summarizeValidationIssues(validation);
  const appliedAt = new Date();
  const [created] = await db
    .insert(schema.preTourAiRun)
    .values({
      companyId: context.companyId,
      code: buildScopedCode("PTAIRUN", [request.mode, "APPLY", compactDate(request.startDate)]),
      mode: request.mode,
      sourcePlanId: request.mode === "REVISE" ? request.sourcePlanId ?? null : null,
      resultingPlanId: planId,
      prompt: request.prompt,
      travelStartDate: new Date(request.startDate),
      travelEndDate: new Date(request.endDate),
      model: "unknown",
      requestSnapshot: request as Record<string, unknown>,
      draftSnapshot: draft as Record<string, unknown>,
      validationSnapshot: validation as Record<string, unknown>,
      draftTitle: draft.plan.title,
      draftDayCount: draft.days.length,
      overallAccuracy: validation.overallAccuracy,
      masterCoveragePercent: Math.round(validation.masterCoveragePercent),
      resolvedReferenceCount: validation.resolvedReferenceCount,
      unresolvedReferenceCount: validation.unresolvedReferenceCount,
      blockingIssueCount: issueCounts.blocking,
      mediumIssueCount: issueCounts.medium,
      lowIssueCount: issueCounts.low,
      canApply: validation.canApply,
      reviewStatus: "PENDING",
      reviewScore: null,
      reviewNotes: null,
      createdByUserId: context.userId,
      createdByName: context.userName,
      appliedAt,
      appliedByUserId: context.userId,
      appliedByName: context.userName,
      updatedAt: appliedAt,
    })
    .returning({ id: schema.preTourAiRun.id });

  return String(created.id);
}

async function loadPlanLookup(companyId: string, planIds: string[]) {
  if (planIds.length === 0) return new Map<string, { planCode: string; title: string }>();

  const rows = await db
    .select({
      id: schema.preTourPlan.id,
      planCode: schema.preTourPlan.planCode,
      title: schema.preTourPlan.title,
    })
    .from(schema.preTourPlan)
    .where(
      and(
        eq(schema.preTourPlan.companyId, companyId),
        inArray(schema.preTourPlan.id, planIds)
      )
    );

  return new Map(
    rows.map((row) => [
      String(row.id),
      { planCode: String(row.planCode), title: String(row.title) },
    ])
  );
}

function buildAIRunWhereClause(
  companyId: string,
  query: z.infer<typeof preTourAIRunListQuerySchema>
) {
  const q = query.q ? `%${query.q}%` : null;
  return and(
    eq(schema.preTourAiRun.companyId, companyId),
    q
      ? or(
          ilike(schema.preTourAiRun.code, q),
          ilike(schema.preTourAiRun.prompt, q),
          ilike(schema.preTourAiRun.draftTitle, q)
        )
      : undefined,
    query.mode === "ALL" ? undefined : eq(schema.preTourAiRun.mode, query.mode),
    query.accuracy === "ALL"
      ? undefined
      : eq(schema.preTourAiRun.overallAccuracy, query.accuracy),
    query.canApply === "ALL"
      ? undefined
      : eq(schema.preTourAiRun.canApply, query.canApply === "yes"),
    query.applied === "ALL"
      ? undefined
      : query.applied === "yes"
        ? isNotNull(schema.preTourAiRun.appliedAt)
        : isNull(schema.preTourAiRun.appliedAt),
    query.reviewStatus === "ALL"
      ? undefined
      : eq(schema.preTourAiRun.reviewStatus, query.reviewStatus)
  );
}

function toAIRunSummary(
  row: typeof schema.preTourAiRun.$inferSelect,
  planLookup: Map<string, { planCode: string; title: string }>
): PreTourAIRunSummary {
  const sourcePlan = row.sourcePlanId ? planLookup.get(String(row.sourcePlanId)) : null;
  const resultingPlan = row.resultingPlanId ? planLookup.get(String(row.resultingPlanId)) : null;

  return {
    id: String(row.id),
    code: String(row.code),
    mode: String(row.mode).toUpperCase() as PreTourAIMode,
    model: String(row.model),
    prompt: String(row.prompt),
    travelStartDate: row.travelStartDate.toISOString(),
    travelEndDate: row.travelEndDate.toISOString(),
    sourcePlanId: row.sourcePlanId ? String(row.sourcePlanId) : null,
    sourcePlanCode: sourcePlan?.planCode ?? null,
    sourcePlanTitle: sourcePlan?.title ?? null,
    resultingPlanId: row.resultingPlanId ? String(row.resultingPlanId) : null,
    resultingPlanCode: resultingPlan?.planCode ?? null,
    resultingPlanTitle: resultingPlan?.title ?? null,
    draftTitle: String(row.draftTitle),
    draftDayCount: Number(row.draftDayCount ?? 0),
    canApply: Boolean(row.canApply),
    overallAccuracy: String(row.overallAccuracy).toLowerCase() as "high" | "medium" | "low",
    masterCoveragePercent: Number(row.masterCoveragePercent ?? 0),
    resolvedReferenceCount: Number(row.resolvedReferenceCount ?? 0),
    unresolvedReferenceCount: Number(row.unresolvedReferenceCount ?? 0),
    blockingIssueCount: Number(row.blockingIssueCount ?? 0),
    mediumIssueCount: Number(row.mediumIssueCount ?? 0),
    lowIssueCount: Number(row.lowIssueCount ?? 0),
    reviewStatus: String(row.reviewStatus).toUpperCase() as PreTourAIRunSummary["reviewStatus"],
    reviewScore: row.reviewScore === null || row.reviewScore === undefined ? null : Number(row.reviewScore),
    reviewNotes: textOf(row.reviewNotes) || null,
    createdAt: row.createdAt.toISOString(),
    createdByName: textOf(row.createdByName) || null,
    appliedAt: toIsoStringOrNull(row.appliedAt),
    appliedByName: textOf(row.appliedByName) || null,
    reviewedAt: toIsoStringOrNull(row.reviewedAt),
    reviewedByName: textOf(row.reviewedByName) || null,
  };
}

async function fetchPreTourAIRunDetail(
  companyId: string,
  runId: string
): Promise<PreTourAIRunDetail> {
  const [row] = await db
    .select()
    .from(schema.preTourAiRun)
    .where(and(eq(schema.preTourAiRun.id, runId), eq(schema.preTourAiRun.companyId, companyId)))
    .limit(1);

  if (!row) {
    throw new PreTourAIError(404, "AI_RUN_NOT_FOUND", "AI run record was not found.");
  }

  const planLookup = await loadPlanLookup(
    companyId,
    [row.sourcePlanId, row.resultingPlanId]
      .filter((value): value is string => Boolean(value))
      .map((value) => String(value))
  );
  const summary = toAIRunSummary(row, planLookup);

  return preTourAIRunDetailSchema.parse({
    ...summary,
    requestSnapshot: preTourAIRequestSchema.parse(row.requestSnapshot),
    draftSnapshot: preTourAIDraftSchema.parse(row.draftSnapshot),
    validationSnapshot: preTourAIDraftValidationSchema.parse(row.validationSnapshot),
  });
}

export async function listPreTourAIRuns(searchParams: URLSearchParams, headers: Headers) {
  const access = await ensureAdminAccess(headers);
  const parsed = preTourAIRunListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new PreTourAIError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const whereClause = buildAIRunWhereClause(access.companyId, parsed.data);
  const [rows, totalRows, summaryRow] = await Promise.all([
    db
      .select()
      .from(schema.preTourAiRun)
      .where(whereClause)
      .orderBy(desc(schema.preTourAiRun.createdAt), desc(schema.preTourAiRun.id))
      .limit(parsed.data.limit)
      .offset(parsed.data.offset),
    db
      .select({ count: count() })
      .from(schema.preTourAiRun)
      .where(whereClause),
    db
      .select({
        totalRuns: count(),
        applicableRuns:
          sql<number>`coalesce(sum(case when ${schema.preTourAiRun.canApply} then 1 else 0 end), 0)`,
        appliedRuns:
          sql<number>`coalesce(sum(case when ${schema.preTourAiRun.appliedAt} is not null then 1 else 0 end), 0)`,
        revisedRuns:
          sql<number>`coalesce(sum(case when ${schema.preTourAiRun.mode} = 'REVISE' then 1 else 0 end), 0)`,
        avgCoveragePercent:
          sql<number>`coalesce(round(avg(${schema.preTourAiRun.masterCoveragePercent})::numeric, 1), 0)`,
        avgReviewScore:
          sql<number>`coalesce(round(avg(${schema.preTourAiRun.reviewScore})::numeric, 2), 0)`,
      })
      .from(schema.preTourAiRun)
      .where(whereClause),
  ]);

  const planLookup = await loadPlanLookup(
    access.companyId,
    rows
      .flatMap((row) => [row.sourcePlanId, row.resultingPlanId])
      .filter((value): value is string => Boolean(value))
      .map((value) => String(value))
  );

  return preTourAIRunListResponseSchema.parse({
    items: rows.map((row) => toAIRunSummary(row, planLookup)),
    total: Number(totalRows[0]?.count ?? 0),
    limit: parsed.data.limit,
    offset: parsed.data.offset,
    summary: {
      totalRuns: Number(summaryRow[0]?.totalRuns ?? 0),
      applicableRuns: Number(summaryRow[0]?.applicableRuns ?? 0),
      appliedRuns: Number(summaryRow[0]?.appliedRuns ?? 0),
      revisedRuns: Number(summaryRow[0]?.revisedRuns ?? 0),
      avgCoveragePercent: Number(summaryRow[0]?.avgCoveragePercent ?? 0),
      avgReviewScore: Number(summaryRow[0]?.avgReviewScore ?? 0),
    },
  });
}

export async function getPreTourAIRun(runId: string, headers: Headers) {
  const access = await ensureAdminAccess(headers);
  return fetchPreTourAIRunDetail(access.companyId, runId);
}

export async function reviewPreTourAIRun(
  runId: string,
  payload: unknown,
  headers: Headers
) {
  const access = await ensureAdminAccess(headers);
  const parsed = preTourAIRunReviewRequestSchema.safeParse(payload);
  if (!parsed.success) {
    throw new PreTourAIError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const reviewedAt = new Date();
  const [updated] = await db
    .update(schema.preTourAiRun)
    .set({
      reviewStatus: parsed.data.reviewStatus,
      reviewScore: parsed.data.reviewScore ?? null,
      reviewNotes: parsed.data.reviewNotes ?? null,
      reviewedAt,
      reviewedByUserId: access.userId,
      reviewedByName: access.userName,
      updatedAt: reviewedAt,
    })
    .where(and(eq(schema.preTourAiRun.id, runId), eq(schema.preTourAiRun.companyId, access.companyId)))
    .returning({ id: schema.preTourAiRun.id });

  if (!updated) {
    throw new PreTourAIError(404, "AI_RUN_NOT_FOUND", "AI run record was not found.");
  }

  return fetchPreTourAIRunDetail(access.companyId, runId);
}

export async function generatePreTourAIDraft(payload: unknown, headers: Headers) {
  const parsed = preTourAIRequestSchema.safeParse(payload);
  if (!parsed.success) {
    throw new PreTourAIError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  requireRevisionSource(parsed.data);
  const context = await loadMasterContext(parsed.data, headers);
  const sourcePlanOutline =
    parsed.data.mode === "REVISE" && parsed.data.sourcePlanId
      ? await loadSourcePlanOutline(parsed.data.sourcePlanId, context)
      : null;
  const schema = buildDraftJsonSchema();
  const generationAttempt = async (options: {
    profile: PromptProfile;
    reasoningEffort: "low" | "medium" | "high";
    maxOutputTokens: number;
  }) => {
    const { systemPrompt, userPrompt } = buildGenerationPrompts(
      context,
      sourcePlanOutline,
      options.profile
    );
    return createStructuredOpenAIResponse({
      model: getConfiguredOpenAIModel(),
      schemaName: "pre_tour_ai_draft",
      schema,
      systemPrompt,
      userPrompt,
      reasoningEffort: options.reasoningEffort,
      maxOutputTokens: options.maxOutputTokens,
      safetyIdentifier: `${context.companyId}:${context.userId ?? "anonymous"}`,
    });
  };

  const attempts = [
    {
      profile: "standard" as const,
      reasoningEffort: "medium" as const,
      maxOutputTokens: resolveGenerationMaxOutputTokens(parsed.data),
    },
    {
      profile: "tight" as const,
      reasoningEffort: "low" as const,
      maxOutputTokens: resolveRetryGenerationMaxOutputTokens(parsed.data),
    },
    {
      profile: "tight" as const,
      reasoningEffort: "low" as const,
      maxOutputTokens: 10000,
    },
  ];

  let response;
  let lastError: unknown = null;
  for (const [index, attempt] of attempts.entries()) {
    try {
      response = await generationAttempt(attempt);
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      const canRetry = shouldRetryWithCompactPrompt(error) && index < attempts.length - 1;
      if (!canRetry) {
        throw error;
      }
    }
  }

  if (!response) {
    throw lastError instanceof Error
      ? lastError
      : new Error("AI draft generation did not return a response.");
  }

  let draft: PreTourAIDraft;
  try {
    draft = preTourAIDraftSchema.parse(JSON.parse(response.text));
  } catch (error) {
    throw new PreTourAIError(
      502,
      "INVALID_MODEL_OUTPUT",
      error instanceof Error ? error.message : "AI draft could not be parsed."
    );
  }

  draft = reconcileDraftAccommodationHotels(draft, context);
  const validation = buildPreTourAIDraftValidation(draft, context);
  const runId = await recordGeneratedAIRun({
    context,
    request: parsed.data,
    draft,
    validation,
    model: response.model,
  });
  return preTourAIGenerateResponseSchema.parse({
    runId,
    model: response.model,
    generatedAt: new Date().toISOString(),
    draft,
    validation,
  });
}

function resolveDayDate(request: PreTourAIRequest, dayNumber: number) {
  return addDays(request.startDate, Math.max(dayNumber - 1, 0));
}

type AIVehicleTypeRow = {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  paxCapacity: number;
  categoryCode: string;
  categoryName: string;
};

type AIActivityRateRow = {
  id: string;
  activityId: string;
  code: string;
  label: string | null;
  currencyCode: string;
  pricingModel: string;
  fixedRate: string | null;
  perPaxRate: string | null;
  perHourRate: string | null;
  perUnitRate: string | null;
  paxTiers: Array<{ min: number; max: number; rate: number }> | null;
  minCharge: string | null;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
};

type AccommodationOccupancyCost = {
  base: number;
  tax: number;
  total: number;
};

type AccommodationMixState = {
  base: number;
  tax: number;
  total: number;
  single: number;
  double: number;
  triple: number;
};

type AccommodationCardProfile = {
  card: PreTourAccommodationRateCard;
  signature: string;
  roomMatchScore: number;
  occupancy: {
    single: AccommodationOccupancyCost | null;
    double: AccommodationOccupancyCost | null;
    triple: AccommodationOccupancyCost | null;
  };
  singleSupplementTotal: number;
};

type AIPricedLine = {
  serviceId: string | null;
  rateId: string | null;
  currencyCode: string;
  baseAmount: string;
  taxAmount: string;
  totalAmount: string;
  pricingSnapshot: PreTourPricingSnapshot;
};

type AIPricingRuntime = {
  planCurrencyCode: string;
  planPriceMode: "EXCLUSIVE" | "INCLUSIVE";
  transportRateBasis: "VEHICLE_CATEGORY" | "VEHICLE_TYPE";
  vehicleTypes: AIVehicleTypeRow[];
  vehicleTypesByCode: Map<string, AIVehicleTypeRow>;
  vehicleTypesByCategoryCode: Map<string, AIVehicleTypeRow[]>;
  activityRatesByActivityId: Map<string, AIActivityRateRow[]>;
  convertToPlanCurrency: (
    amount: number,
    sourceCurrencyCode: string,
    effectiveAt: string | null | undefined
  ) => Promise<number | null>;
  getAccommodationRates: (input: {
    hotelId: string;
    travelDate: string;
  }) => Promise<PreTourAccommodationRateCard[]>;
  getTransportRates: (input: {
    chargeMethod: PreTourTransportChargeMethod;
    fromLocationId: string;
    toLocationId: string;
    serviceDate: string | null;
    vehicleCategoryId?: string | null;
    vehicleTypeId?: string | null;
    pax: number;
  }) => Promise<PreTourTransportRateCard[]>;
};

function toFiniteNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toMoneyString(value: number) {
  return roundMoney(value).toFixed(2);
}

function toNullableText(value: unknown) {
  const normalized = textOf(value);
  return normalized || null;
}

function normalizeDateOnly(value: string | Date | null | undefined) {
  if (!value) return null;
  const raw = value instanceof Date ? value.toISOString() : String(value).trim();
  const dateOnly = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : null;
}

function toMidnightIso(value: string | Date | null | undefined) {
  const dateOnly = normalizeDateOnly(value);
  return dateOnly ? `${dateOnly}T00:00:00.000Z` : null;
}

function addDaysToDateOnly(value: string, offset: number) {
  const seed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(seed.getTime())) return value;
  seed.setUTCDate(seed.getUTCDate() + offset);
  return seed.toISOString().slice(0, 10);
}

function normalizeAiItemType(value: string) {
  return value === "CEREMONY" ? "ACTIVITY" : value;
}

function resolveDefaultTravellerPax(
  request: PreTourAIRequest,
  itemPax: number | null | undefined
) {
  if (itemPax && Number.isFinite(itemPax) && itemPax > 0) {
    return Math.trunc(itemPax);
  }
  return Math.max(1, request.adults + request.children + request.infants);
}

function resolveDefaultAccommodationGuests(
  request: PreTourAIRequest,
  itemPax: number | null | undefined
) {
  if (itemPax && Number.isFinite(itemPax) && itemPax > 0) {
    return Math.trunc(itemPax);
  }
  return Math.max(1, request.adults + request.children);
}

function buildGuideCoverageDaySet(draft: PreTourAIDraft) {
  const coveredDays = new Set<number>();
  draft.guideAllocations.forEach((allocation) => {
    if (allocation.coverageMode === "FULL_TOUR") {
      draft.days.forEach((day) => coveredDays.add(day.dayNumber));
      return;
    }
    const start = allocation.startDayNumber ?? allocation.endDayNumber;
    const end = allocation.endDayNumber ?? allocation.startDayNumber;
    if (!start || !end) return;
    for (let dayNumber = start; dayNumber <= end; dayNumber += 1) {
      coveredDays.add(dayNumber);
    }
  });
  draft.days.forEach((day) => {
    if (day.items.some((item) => item.itemType === "GUIDE")) {
      coveredDays.add(day.dayNumber);
    }
  });
  return coveredDays;
}

function buildTransportChargeMethodPriority(item: PreTourAIDraft["days"][number]["items"][number]) {
  const text = [item.title, item.description, item.notes, item.rationale]
    .filter(Boolean)
    .map((value) => textOf(value))
    .join(" ")
    .toUpperCase();

  if (
    text.includes("DISPOSAL") ||
    text.includes("CHARTER") ||
    text.includes("FULL DAY") ||
    text.includes("AT DISPOSAL")
  ) {
    return ["PER_DAY", "PER_HOUR", "PER_VEHICLE", "PER_TRANSFER", "PER_KM", "SLAB", "PER_PAX"] satisfies PreTourTransportChargeMethod[];
  }
  if (
    text.includes("SHARED") ||
    text.includes("PER PAX") ||
    text.includes("PER PERSON") ||
    text.includes("SEAT IN COACH")
  ) {
    return ["PER_PAX", "PER_TRANSFER", "PER_VEHICLE", "PER_KM", "SLAB", "PER_HOUR", "PER_DAY"] satisfies PreTourTransportChargeMethod[];
  }
  if (
    text.includes("AIRPORT") ||
    text.includes("TRANSFER") ||
    text.includes("PICKUP") ||
    text.includes("DROP")
  ) {
    return ["PER_TRANSFER", "PER_VEHICLE", "PER_KM", "SLAB", "PER_PAX", "PER_HOUR", "PER_DAY"] satisfies PreTourTransportChargeMethod[];
  }
  return ["PER_VEHICLE", "PER_TRANSFER", "PER_KM", "SLAB", "PER_PAX", "PER_HOUR", "PER_DAY"] satisfies PreTourTransportChargeMethod[];
}

function buildRoomPreferenceTerms(
  item: PreTourAIDraft["days"][number]["items"][number]
) {
  const terms = tokenize(
    [
      item.title,
      item.description,
      ...(item.rooms ?? []).map((room) => room.roomType),
    ]
      .filter(Boolean)
      .map((value) => textOf(value))
      .join(" ")
  );
  return [...new Set(terms)];
}

function deriveGuestCountFromRoomRow(room: {
  roomType: string;
  adults?: number | null;
  children?: number | null;
}) {
  const explicitAdults = Number(room.adults ?? 0);
  const explicitChildren = Number(room.children ?? 0);
  const explicitGuests = explicitAdults + explicitChildren;
  if (explicitGuests > 0) return explicitGuests;

  const label = textOf(room.roomType).toUpperCase();
  if (label.includes("SINGLE")) return 1;
  if (label.includes("TRIPLE")) return 3;
  if (label.includes("QUAD") || label.includes("FAMILY")) return 4;
  if (label.includes("DOUBLE") || label.includes("TWIN")) return 2;
  return null;
}

function chooseBetterAccommodationMix(
  current: AccommodationMixState | null,
  candidate: AccommodationMixState
) {
  if (!current) return candidate;
  if (candidate.total < current.total - 0.0001) return candidate;
  if (Math.abs(candidate.total - current.total) <= 0.0001) {
    if (candidate.single < current.single) return candidate;
    if (candidate.single === current.single && candidate.double > current.double) return candidate;
  }
  return current;
}

function buildAccommodationMixState(
  previous: AccommodationMixState,
  occupancy: 1 | 2 | 3,
  cost: AccommodationOccupancyCost
): AccommodationMixState {
  return {
    base: roundMoney(previous.base + cost.base),
    tax: roundMoney(previous.tax + cost.tax),
    total: roundMoney(previous.total + cost.total),
    single: previous.single + (occupancy === 1 ? 1 : 0),
    double: previous.double + (occupancy === 2 ? 1 : 0),
    triple: previous.triple + (occupancy === 3 ? 1 : 0),
  };
}

function computeAccommodationMix(
  totalGuests: number,
  occupancy: {
    single: AccommodationOccupancyCost | null;
    double: AccommodationOccupancyCost | null;
    triple: AccommodationOccupancyCost | null;
  },
  exactRoomCount?: number | null
) {
  const normalizedGuests = Math.max(0, Math.trunc(totalGuests));
  if (normalizedGuests === 0) {
    return {
      base: 0,
      tax: 0,
      total: 0,
      single: 0,
      double: 0,
      triple: 0,
    } satisfies AccommodationMixState;
  }

  const available = ([
    [1, occupancy.single],
    [2, occupancy.double],
    [3, occupancy.triple],
  ] as const).filter((entry): entry is [1 | 2 | 3, AccommodationOccupancyCost] => Boolean(entry[1]));

  if (available.length === 0) {
    return null;
  }

  if (exactRoomCount && exactRoomCount > 0) {
    const dp = Array.from({ length: normalizedGuests + 1 }, () =>
      Array.from({ length: exactRoomCount + 1 }, () => null as AccommodationMixState | null)
    );
    dp[0][0] = { base: 0, tax: 0, total: 0, single: 0, double: 0, triple: 0 };

    for (let guests = 0; guests <= normalizedGuests; guests += 1) {
      for (let roomCount = 0; roomCount < exactRoomCount; roomCount += 1) {
        const current = dp[guests][roomCount];
        if (!current) continue;
        available.forEach(([size, cost]) => {
          const nextGuests = guests + size;
          if (nextGuests > normalizedGuests) return;
          const next = buildAccommodationMixState(current, size, cost);
          dp[nextGuests][roomCount + 1] = chooseBetterAccommodationMix(
            dp[nextGuests][roomCount + 1],
            next
          );
        });
      }
    }

    const exact = dp[normalizedGuests][exactRoomCount];
    if (exact) return exact;
  }

  const dp = Array.from({ length: normalizedGuests + 1 }, () => null as AccommodationMixState | null);
  dp[0] = { base: 0, tax: 0, total: 0, single: 0, double: 0, triple: 0 };

  for (let guests = 0; guests <= normalizedGuests; guests += 1) {
    const current = dp[guests];
    if (!current) continue;
    available.forEach(([size, cost]) => {
      const nextGuests = guests + size;
      if (nextGuests > normalizedGuests) return;
      const next = buildAccommodationMixState(current, size, cost);
      dp[nextGuests] = chooseBetterAccommodationMix(dp[nextGuests], next);
    });
  }

  return dp[normalizedGuests];
}

function computeExplicitAccommodationMix(
  rooms: Array<{
    roomType: string;
    count: number;
    adults?: number | null;
    children?: number | null;
  }>,
  occupancy: {
    single: AccommodationOccupancyCost | null;
    double: AccommodationOccupancyCost | null;
    triple: AccommodationOccupancyCost | null;
  }
) {
  if (rooms.length === 0) return null;
  let state: AccommodationMixState = {
    base: 0,
    tax: 0,
    total: 0,
    single: 0,
    double: 0,
    triple: 0,
  };

  for (const room of rooms) {
    const occupancySize = deriveGuestCountFromRoomRow(room);
    const roomCount = Math.max(1, Math.trunc(room.count));
    if (occupancySize !== 1 && occupancySize !== 2 && occupancySize !== 3) {
      return null;
    }
    const occupancyCost =
      occupancySize === 1
        ? occupancy.single
        : occupancySize === 2
          ? occupancy.double
          : occupancy.triple;
    if (!occupancyCost) {
      return null;
    }
    for (let index = 0; index < roomCount; index += 1) {
      state = buildAccommodationMixState(state, occupancySize, occupancyCost);
    }
  }

  return state;
}

function buildAccommodationSignature(card: PreTourAccommodationRateCard) {
  return [
    card.roomTypeId,
    normalizedCode(card.roomBasis),
    card.roomRateHeaderId ?? "",
  ].join("|");
}

function scoreAccommodationCard(
  card: PreTourAccommodationRateCard,
  preferredRoomBasis: string | null,
  roomTerms: string[]
) {
  let score = 0;
  if (preferredRoomBasis) {
    score += normalizedCode(card.roomBasis) === preferredRoomBasis ? 40 : -5;
  }
  if (roomTerms.length > 0) {
    score += scoreByTerms(
      `${card.roomTypeCode} ${card.roomTypeName}`.toLowerCase(),
      roomTerms
    );
  }
  return score;
}

function buildEmptyPricingSnapshot(
  currencyCode: string,
  priceMode: "EXCLUSIVE" | "INCLUSIVE",
  dimensions: Record<string, unknown>
) {
  return buildPreTourPricingSnapshot({
    sourceRate: null,
    currencyCode,
    buyBaseAmount: 0,
    buyTaxAmount: 0,
    buyTotalAmount: 0,
    markupMode: "NONE",
    markupValue: 0,
    sellBaseAmount: 0,
    sellTaxAmount: 0,
    sellTotalAmount: 0,
    priceMode,
    overrideApplied: false,
    overrideReason: null,
    dimensions,
  });
}

async function createAIPricingRuntime(input: {
  context: PreTourAIMasterContext;
  draft: PreTourAIDraft;
  headers: Headers;
  activityByCode: Map<string, MasterRow>;
}) : Promise<AIPricingRuntime> {
  const planCurrencyCode = normalizedCode(input.context.request.currencyCode);
  const planPriceMode =
    input.context.request.priceMode === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE";

  const [companyRow, vehicleTypeRows, activityRateRows] = await Promise.all([
    db
      .select({ transportRateBasis: schema.company.transportRateBasis })
      .from(schema.company)
      .where(eq(schema.company.id, input.context.companyId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        id: schema.transportVehicleType.id,
        categoryId: schema.transportVehicleType.categoryId,
        code: schema.transportVehicleType.code,
        name: schema.transportVehicleType.name,
        paxCapacity: schema.transportVehicleType.paxCapacity,
        categoryCode: schema.transportVehicleCategory.code,
        categoryName: schema.transportVehicleCategory.name,
      })
      .from(schema.transportVehicleType)
      .innerJoin(
        schema.transportVehicleCategory,
        eq(schema.transportVehicleType.categoryId, schema.transportVehicleCategory.id)
      )
      .where(
        and(
          eq(schema.transportVehicleType.companyId, input.context.companyId),
          eq(schema.transportVehicleType.isActive, true),
          eq(schema.transportVehicleCategory.isActive, true)
        )
      ),
    (async () => {
      const activityIds = [
        ...new Set(
          input.draft.days
            .flatMap((day) => day.items)
            .filter((item) => ["ACTIVITY", "CEREMONY"].includes(item.itemType))
            .map((item) => input.activityByCode.get(normalizedCode(item.serviceCode))?.id)
            .filter((value): value is string => Boolean(value))
        ),
      ];
      if (activityIds.length === 0) return [] as AIActivityRateRow[];

      const rows = await db
        .select({
          id: schema.activityRate.id,
          activityId: schema.activityRate.activityId,
          code: schema.activityRate.code,
          label: schema.activityRate.label,
          currencyCode: schema.activityRate.currency,
          pricingModel: schema.activityRate.pricingModel,
          fixedRate: schema.activityRate.fixedRate,
          perPaxRate: schema.activityRate.perPaxRate,
          perHourRate: schema.activityRate.perHourRate,
          perUnitRate: schema.activityRate.perUnitRate,
          paxTiers: schema.activityRate.paxTiers,
          minCharge: schema.activityRate.minCharge,
          effectiveFrom: schema.activityRate.effectiveFrom,
          effectiveTo: schema.activityRate.effectiveTo,
        })
        .from(schema.activityRate)
        .where(
          and(
            eq(schema.activityRate.companyId, input.context.companyId),
            eq(schema.activityRate.isActive, true),
            inArray(schema.activityRate.activityId, activityIds)
          )
        );

      return rows.map((row) => ({
        id: String(row.id),
        activityId: String(row.activityId),
        code: String(row.code),
        label: row.label ? String(row.label) : null,
        currencyCode: normalizedCode(row.currencyCode),
        pricingModel: String(row.pricingModel || "FIXED"),
        fixedRate: row.fixedRate ? String(row.fixedRate) : null,
        perPaxRate: row.perPaxRate ? String(row.perPaxRate) : null,
        perHourRate: row.perHourRate ? String(row.perHourRate) : null,
        perUnitRate: row.perUnitRate ? String(row.perUnitRate) : null,
        paxTiers:
          (row.paxTiers as Array<{ min: number; max: number; rate: number }> | null) ?? null,
        minCharge: row.minCharge ? String(row.minCharge) : null,
        effectiveFrom: row.effectiveFrom,
        effectiveTo: row.effectiveTo,
      }));
    })(),
  ]);

  const transportRateBasis =
    companyRow?.transportRateBasis === "VEHICLE_CATEGORY"
      ? "VEHICLE_CATEGORY"
      : "VEHICLE_TYPE";

  const vehicleTypes = vehicleTypeRows.map((row) => ({
    id: String(row.id),
    categoryId: String(row.categoryId),
    code: String(row.code),
    name: String(row.name),
    paxCapacity: Number(row.paxCapacity ?? 0),
    categoryCode: String(row.categoryCode),
    categoryName: String(row.categoryName),
  }));

  const vehicleTypesByCode = new Map(
    vehicleTypes.map((row) => [normalizedCode(row.code), row] as const)
  );
  const vehicleTypesByCategoryCode = new Map<string, AIVehicleTypeRow[]>();
  vehicleTypes.forEach((row) => {
    const key = normalizedCode(row.categoryCode);
    const current = vehicleTypesByCategoryCode.get(key) ?? [];
    current.push(row);
    vehicleTypesByCategoryCode.set(key, current);
  });
  vehicleTypesByCategoryCode.forEach((rows) =>
    rows.sort((left, right) => left.paxCapacity - right.paxCapacity || left.code.localeCompare(right.code))
  );

  const activityRatesByActivityId = new Map<string, AIActivityRateRow[]>();
  activityRateRows.forEach((row) => {
    const current = activityRatesByActivityId.get(row.activityId) ?? [];
    current.push(row);
    activityRatesByActivityId.set(row.activityId, current);
  });

  const currencyIdByCode = new Map(
    input.context.currencies
      .map((row) => [normalizedCode(row.code), String(row.id)] as const)
      .filter(([code, id]) => code.length > 0 && id.length > 0)
  );

  const exchangeRateCache = new Map<string, Promise<number | null>>();
  const accommodationRateCache = new Map<string, Promise<PreTourAccommodationRateCard[]>>();
  const transportRateCache = new Map<string, Promise<PreTourTransportRateCard[]>>();

  const fetchLatestExchangeRate = async (
    baseCurrencyId: string,
    quoteCurrencyId: string,
    effectiveAt: Date
  ) => {
    const [row] = await db
      .select({ rate: schema.exchangeRate.rate })
      .from(schema.exchangeRate)
      .where(
        and(
          eq(schema.exchangeRate.companyId, input.context.companyId),
          eq(schema.exchangeRate.baseCurrencyId, baseCurrencyId),
          eq(schema.exchangeRate.quoteCurrencyId, quoteCurrencyId),
          eq(schema.exchangeRate.isActive, true),
          lte(schema.exchangeRate.asOf, effectiveAt),
          or(isNull(schema.exchangeRate.effectiveTo), gte(schema.exchangeRate.effectiveTo, effectiveAt))
        )
      )
      .orderBy(desc(schema.exchangeRate.asOf), desc(schema.exchangeRate.createdAt))
      .limit(1);
    return row ? toFiniteNumber(row.rate) : null;
  };

  const resolveFxRate = async (
    sourceCurrencyCode: string,
    targetCurrencyCode: string,
    effectiveAt: string | null | undefined
  ): Promise<number | null> => {
    const source = normalizedCode(sourceCurrencyCode);
    const target = normalizedCode(targetCurrencyCode);
    if (!source || !target) return null;
    if (source === target) return 1;

    const effectiveDate = effectiveAt ? new Date(effectiveAt) : new Date(input.context.request.startDate);
    const safeEffectiveDate = Number.isNaN(effectiveDate.getTime())
      ? new Date(input.context.request.startDate)
      : effectiveDate;
    const cacheKey = `${source}->${target}@${normalizeDateOnly(safeEffectiveDate) ?? "n/a"}`;
    if (exchangeRateCache.has(cacheKey)) {
      return exchangeRateCache.get(cacheKey)!;
    }

    const promise = (async (): Promise<number | null> => {
      if (
        source === normalizedCode(input.context.baseCurrencyCode) &&
        target === planCurrencyCode &&
        input.context.exchangeRate > 0
      ) {
        return input.context.exchangeRate;
      }

      const sourceCurrencyId = currencyIdByCode.get(source);
      const targetCurrencyId = currencyIdByCode.get(target);
      if (!sourceCurrencyId || !targetCurrencyId) return null;

      const direct = await fetchLatestExchangeRate(sourceCurrencyId, targetCurrencyId, safeEffectiveDate);
      if (direct && direct > 0) {
        return direct;
      }

      const inverse = await fetchLatestExchangeRate(targetCurrencyId, sourceCurrencyId, safeEffectiveDate);
      if (inverse && inverse > 0) {
        return 1 / inverse;
      }

      const baseCurrencyCode = normalizedCode(input.context.baseCurrencyCode);
      if (source !== baseCurrencyCode && target !== baseCurrencyCode) {
        const toBase = await resolveFxRate(source, baseCurrencyCode, effectiveAt);
        const baseToTarget = await resolveFxRate(baseCurrencyCode, target, effectiveAt);
        if (toBase && baseToTarget) {
          return toBase * baseToTarget;
        }
      }

      return null;
    })();

    exchangeRateCache.set(cacheKey, promise);
    return promise;
  };

  return {
    planCurrencyCode,
    planPriceMode,
    transportRateBasis,
    vehicleTypes,
    vehicleTypesByCode,
    vehicleTypesByCategoryCode,
    activityRatesByActivityId,
    convertToPlanCurrency: async (amount, sourceCurrencyCode, effectiveAt) => {
      const numericAmount = roundMoney(amount);
      if (numericAmount === 0) return 0;
      const rate = await resolveFxRate(sourceCurrencyCode, planCurrencyCode, effectiveAt);
      if (rate === null) return null;
      return roundMoney(numericAmount * rate);
    },
    getAccommodationRates: async ({ hotelId, travelDate }) => {
      const cacheKey = `${hotelId}|${travelDate}`;
      if (!accommodationRateCache.has(cacheKey)) {
        accommodationRateCache.set(
          cacheKey,
          resolveAccommodationRates(
            {
              hotelId,
              travelDate: `${travelDate}T00:00:00.000Z`,
              roomBasis: null,
              roomTypeId: null,
            },
            input.headers
          )
        );
      }
      return accommodationRateCache.get(cacheKey)!;
    },
    getTransportRates: async ({
      chargeMethod,
      fromLocationId,
      toLocationId,
      serviceDate,
      vehicleCategoryId,
      vehicleTypeId,
      pax,
    }) => {
      const cacheKey = [
        chargeMethod,
        fromLocationId,
        toLocationId,
        serviceDate || "",
        vehicleCategoryId || "",
        vehicleTypeId || "",
        String(pax),
      ].join("|");
      if (!transportRateCache.has(cacheKey)) {
        transportRateCache.set(
          cacheKey,
          resolveTransportRates(
            {
              chargeMethod,
              fromLocationId,
              toLocationId,
              serviceDate,
              vehicleCategoryId: vehicleCategoryId ?? null,
              vehicleTypeId: vehicleTypeId ?? null,
              pax,
            },
            input.headers
          )
        );
      }
      return transportRateCache.get(cacheKey)!;
    },
  };
}

async function resolveAIAccommodationPricing(input: {
  runtime: AIPricingRuntime;
  context: PreTourAIMasterContext;
  draft: PreTourAIDraft;
  item: PreTourAIDraft["days"][number]["items"][number];
  day: PreTourAIDraft["days"][number];
  hotelId: string | null;
}) : Promise<AIPricedLine | null> {
  if (!input.hotelId) return null;

  const stayDate = normalizeDateOnly(input.item.startAt || input.day.date || input.context.request.startDate);
  const nights = Math.max(1, Math.trunc(input.item.nights ?? 1));
  if (!stayDate) return null;

  const preferredRoomBasis =
    normalizedCode(
      input.draft.plan.mealPreference ??
        input.context.request.mealPreference ??
        null
    ) || null;
  const roomTerms = buildRoomPreferenceTerms(input.item);
  const explicitRooms =
    input.item.rooms?.map((room) => ({
      roomType: room.roomType,
      count: Math.max(1, Math.trunc(room.count)),
      adults: room.adults ?? null,
      children: room.children ?? null,
    })) ?? [];
  const explicitRoomCount =
    explicitRooms.length > 0
      ? explicitRooms.reduce((sum, room) => sum + room.count, 0)
      : null;
  const explicitGuestTotal = explicitRooms.reduce((sum, room) => {
    const guestCount = deriveGuestCountFromRoomRow(room);
    return guestCount ? sum + guestCount * room.count : sum;
  }, 0);
  const actualGuestCount =
    explicitGuestTotal > 0
      ? explicitGuestTotal
      : resolveDefaultAccommodationGuests(input.context.request, input.item.pax);

  const nightlyProfiles = await Promise.all(
    Array.from({ length: nights }, async (_, nightIndex) => {
      const travelDate = addDaysToDateOnly(stayDate, nightIndex);
      const rates = await input.runtime.getAccommodationRates({
        hotelId: input.hotelId!,
        travelDate,
      });

      const profiles = await Promise.all(
        rates.map(async (card) => {
          const occupancyPayload =
            card.pricingDimensions &&
            typeof card.pricingDimensions === "object" &&
            !Array.isArray(card.pricingDimensions)
              ? ((card.pricingDimensions as Record<string, unknown>).occupancyPricing as
                  | Record<string, unknown>
                  | undefined)
              : undefined;

          const single = occupancyPayload?.single as Record<string, unknown> | undefined;
          const double = occupancyPayload?.double as Record<string, unknown> | undefined;
          const triple = occupancyPayload?.triple as Record<string, unknown> | undefined;

          const convertCost = async (payload: Record<string, unknown> | undefined) => {
            if (!payload) return null;
            const [base, tax, total] = await Promise.all([
              input.runtime.convertToPlanCurrency(
                toFiniteNumber(payload.baseAmount),
                card.currencyCode,
                card.effectiveDate
              ),
              input.runtime.convertToPlanCurrency(
                toFiniteNumber(payload.taxAmount),
                card.currencyCode,
                card.effectiveDate
              ),
              input.runtime.convertToPlanCurrency(
                toFiniteNumber(payload.totalAmount),
                card.currencyCode,
                card.effectiveDate
              ),
            ]);
            if (base === null || tax === null || total === null) return null;
            return { base, tax, total } satisfies AccommodationOccupancyCost;
          };

          const [singleCost, doubleCost, tripleCost, singleSupplementTotal] = await Promise.all([
            convertCost(single),
            convertCost(double),
            convertCost(triple),
            (async () => {
              const converted = await input.runtime.convertToPlanCurrency(
                toFiniteNumber((card.pricingDimensions as Record<string, unknown>)?.singleSupplementRate),
                card.currencyCode,
                card.effectiveDate
              );
              return converted ?? 0;
            })(),
          ]);

          if (!singleCost && !doubleCost && !tripleCost) {
            return null;
          }

          return {
            card,
            signature: buildAccommodationSignature(card),
            roomMatchScore: scoreAccommodationCard(card, preferredRoomBasis, roomTerms),
            occupancy: {
              single: singleCost,
              double: doubleCost,
              triple: tripleCost,
            },
            singleSupplementTotal,
          } satisfies AccommodationCardProfile;
        })
      );

      return profiles.filter((profile): profile is AccommodationCardProfile => Boolean(profile));
    })
  );

  if (nightlyProfiles.some((profiles) => profiles.length === 0)) {
    return null;
  }

  const evaluateNightlyProfile = (profile: AccommodationCardProfile) => {
    const actualMix =
      explicitRooms.length > 0
        ? computeExplicitAccommodationMix(explicitRooms, profile.occupancy)
        : computeAccommodationMix(actualGuestCount, profile.occupancy, explicitRoomCount);
    if (!actualMix) return null;

    return {
      actual: actualMix,
      scenario1: computeAccommodationMix(1, profile.occupancy),
      scenario2: computeAccommodationMix(2, profile.occupancy),
      scenario3: computeAccommodationMix(3, profile.occupancy),
    };
  };

  const compareCandidate = (
    left: { score: number; total: number } | null,
    right: { score: number; total: number }
  ) => {
    if (!left) return right;
    if (right.score !== left.score) {
      return right.score > left.score ? right : left;
    }
    return right.total < left.total ? right : left;
  };

  const commonSignatures = nightlyProfiles.reduce<Set<string> | null>((current, profiles) => {
    const next = new Set(profiles.map((profile) => profile.signature));
    if (!current) return next;
    return new Set([...current].filter((signature) => next.has(signature)));
  }, null);

  let bestConsistent:
    | {
        score: number;
        total: number;
        sourceCard: PreTourAccommodationRateCard;
        rateId: string | null;
        actual: AccommodationMixState;
        scenario1: AccommodationMixState;
        scenario2: AccommodationMixState;
        scenario3: AccommodationMixState;
        singleSupplementTotal: number;
        nightlyBreakdown: Array<{ date: string; signature: string; roomType: string; ratePlan: string | null }>;
      }
    | null = null;

  for (const signature of commonSignatures ?? []) {
    let totalScore = 0;
    let totalSingleSupplement = 0;
    let actual: AccommodationMixState = { base: 0, tax: 0, total: 0, single: 0, double: 0, triple: 0 };
    let scenario1: AccommodationMixState = { base: 0, tax: 0, total: 0, single: 0, double: 0, triple: 0 };
    let scenario2: AccommodationMixState = { base: 0, tax: 0, total: 0, single: 0, double: 0, triple: 0 };
    let scenario3: AccommodationMixState = { base: 0, tax: 0, total: 0, single: 0, double: 0, triple: 0 };
    const nightlyBreakdown: Array<{ date: string; signature: string; roomType: string; ratePlan: string | null }> = [];
    let sourceCard: PreTourAccommodationRateCard | null = null;
    let valid = true;

    for (const [index, profiles] of nightlyProfiles.entries()) {
      if (!valid) break;
      const profile = profiles.find((entry) => entry.signature === signature) ?? null;
      if (!profile) {
        valid = false;
        break;
      }
      const evaluation = evaluateNightlyProfile(profile);
      if (!evaluation || !evaluation.scenario1 || !evaluation.scenario2 || !evaluation.scenario3) {
        valid = false;
        break;
      }
      sourceCard ??= profile.card;
      totalScore += profile.roomMatchScore;
      totalSingleSupplement = roundMoney(totalSingleSupplement + profile.singleSupplementTotal);
      actual = {
        base: roundMoney(actual.base + evaluation.actual.base),
        tax: roundMoney(actual.tax + evaluation.actual.tax),
        total: roundMoney(actual.total + evaluation.actual.total),
        single: actual.single + evaluation.actual.single,
        double: actual.double + evaluation.actual.double,
        triple: actual.triple + evaluation.actual.triple,
      };
      scenario1 = {
        base: roundMoney(scenario1.base + evaluation.scenario1.base),
        tax: roundMoney(scenario1.tax + evaluation.scenario1.tax),
        total: roundMoney(scenario1.total + evaluation.scenario1.total),
        single: scenario1.single + evaluation.scenario1.single,
        double: scenario1.double + evaluation.scenario1.double,
        triple: scenario1.triple + evaluation.scenario1.triple,
      };
      scenario2 = {
        base: roundMoney(scenario2.base + evaluation.scenario2.base),
        tax: roundMoney(scenario2.tax + evaluation.scenario2.tax),
        total: roundMoney(scenario2.total + evaluation.scenario2.total),
        single: scenario2.single + evaluation.scenario2.single,
        double: scenario2.double + evaluation.scenario2.double,
        triple: scenario2.triple + evaluation.scenario2.triple,
      };
      scenario3 = {
        base: roundMoney(scenario3.base + evaluation.scenario3.base),
        tax: roundMoney(scenario3.tax + evaluation.scenario3.tax),
        total: roundMoney(scenario3.total + evaluation.scenario3.total),
        single: scenario3.single + evaluation.scenario3.single,
        double: scenario3.double + evaluation.scenario3.double,
        triple: scenario3.triple + evaluation.scenario3.triple,
      };
      nightlyBreakdown.push({
        date: addDaysToDateOnly(stayDate, index),
        signature,
        roomType: `${profile.card.roomTypeCode} - ${profile.card.roomTypeName}`,
        ratePlan: profile.card.roomRateHeaderName,
      });
    }

    const consistentSourceCard = sourceCard;
    if (!valid || !consistentSourceCard) continue;
    const candidate = {
      score: totalScore,
      total: actual.total,
      sourceCard: consistentSourceCard,
      rateId: consistentSourceCard.sourceRateId || null,
      actual,
      scenario1,
      scenario2,
      scenario3,
      singleSupplementTotal: totalSingleSupplement,
      nightlyBreakdown,
    };
    bestConsistent = compareCandidate(
      bestConsistent ? { score: bestConsistent.score, total: bestConsistent.total } : null,
      { score: candidate.score, total: candidate.total }
    ) === candidate
      ? candidate
      : bestConsistent;
  }

  let bestVariable:
    | {
        score: number;
        total: number;
        sourceCard: PreTourAccommodationRateCard;
        rateId: string | null;
        actual: AccommodationMixState;
        scenario1: AccommodationMixState;
        scenario2: AccommodationMixState;
        scenario3: AccommodationMixState;
        singleSupplementTotal: number;
        nightlyBreakdown: Array<{ date: string; signature: string; roomType: string; ratePlan: string | null }>;
      }
    | null = null;

  {
    let totalScore = 0;
    let totalSingleSupplement = 0;
    let actual: AccommodationMixState = { base: 0, tax: 0, total: 0, single: 0, double: 0, triple: 0 };
    let scenario1: AccommodationMixState = { base: 0, tax: 0, total: 0, single: 0, double: 0, triple: 0 };
    let scenario2: AccommodationMixState = { base: 0, tax: 0, total: 0, single: 0, double: 0, triple: 0 };
    let scenario3: AccommodationMixState = { base: 0, tax: 0, total: 0, single: 0, double: 0, triple: 0 };
    const nightlyBreakdown: Array<{ date: string; signature: string; roomType: string; ratePlan: string | null }> = [];
    let sourceCard: PreTourAccommodationRateCard | null = null;
    let valid = true;

    for (const [nightIndex, profiles] of nightlyProfiles.entries()) {
      if (!valid) break;
      let selected:
        | {
            profile: AccommodationCardProfile;
            evaluation: {
              actual: AccommodationMixState;
              scenario1: AccommodationMixState;
              scenario2: AccommodationMixState;
              scenario3: AccommodationMixState;
            };
          }
        | null = null;

      for (const profile of profiles) {
        const evaluation = evaluateNightlyProfile(profile);
        if (!evaluation || !evaluation.scenario1 || !evaluation.scenario2 || !evaluation.scenario3) {
          continue;
        }
        const candidateEvaluation = {
          actual: evaluation.actual,
          scenario1: evaluation.scenario1,
          scenario2: evaluation.scenario2,
          scenario3: evaluation.scenario3,
        };
        if (
          !selected ||
          profile.roomMatchScore > selected.profile.roomMatchScore ||
          (profile.roomMatchScore === selected.profile.roomMatchScore &&
            evaluation.actual.total < selected.evaluation.actual.total)
        ) {
          selected = { profile, evaluation: candidateEvaluation };
        }
      }

      const selectedProfile = selected;
      if (!selectedProfile) {
        valid = false;
        break;
      }

      sourceCard ??= selectedProfile.profile.card;
      totalScore += selectedProfile.profile.roomMatchScore;
      totalSingleSupplement = roundMoney(
        totalSingleSupplement + selectedProfile.profile.singleSupplementTotal
      );
      actual = {
        base: roundMoney(actual.base + selectedProfile.evaluation.actual.base),
        tax: roundMoney(actual.tax + selectedProfile.evaluation.actual.tax),
        total: roundMoney(actual.total + selectedProfile.evaluation.actual.total),
        single: actual.single + selectedProfile.evaluation.actual.single,
        double: actual.double + selectedProfile.evaluation.actual.double,
        triple: actual.triple + selectedProfile.evaluation.actual.triple,
      };
      scenario1 = {
        base: roundMoney(scenario1.base + selectedProfile.evaluation.scenario1.base),
        tax: roundMoney(scenario1.tax + selectedProfile.evaluation.scenario1.tax),
        total: roundMoney(scenario1.total + selectedProfile.evaluation.scenario1.total),
        single: scenario1.single + selectedProfile.evaluation.scenario1.single,
        double: scenario1.double + selectedProfile.evaluation.scenario1.double,
        triple: scenario1.triple + selectedProfile.evaluation.scenario1.triple,
      };
      scenario2 = {
        base: roundMoney(scenario2.base + selectedProfile.evaluation.scenario2.base),
        tax: roundMoney(scenario2.tax + selectedProfile.evaluation.scenario2.tax),
        total: roundMoney(scenario2.total + selectedProfile.evaluation.scenario2.total),
        single: scenario2.single + selectedProfile.evaluation.scenario2.single,
        double: scenario2.double + selectedProfile.evaluation.scenario2.double,
        triple: scenario2.triple + selectedProfile.evaluation.scenario2.triple,
      };
      scenario3 = {
        base: roundMoney(scenario3.base + selectedProfile.evaluation.scenario3.base),
        tax: roundMoney(scenario3.tax + selectedProfile.evaluation.scenario3.tax),
        total: roundMoney(scenario3.total + selectedProfile.evaluation.scenario3.total),
        single: scenario3.single + selectedProfile.evaluation.scenario3.single,
        double: scenario3.double + selectedProfile.evaluation.scenario3.double,
        triple: scenario3.triple + selectedProfile.evaluation.scenario3.triple,
      };
      nightlyBreakdown.push({
        date: addDaysToDateOnly(stayDate, nightIndex),
        signature: selectedProfile.profile.signature,
        roomType: `${selectedProfile.profile.card.roomTypeCode} - ${selectedProfile.profile.card.roomTypeName}`,
        ratePlan: selectedProfile.profile.card.roomRateHeaderName,
      });
    }

    const variableSourceCard = sourceCard;
    if (valid && variableSourceCard) {
      bestVariable = {
        score: totalScore,
        total: actual.total,
        sourceCard: variableSourceCard,
        rateId: variableSourceCard.sourceRateId || null,
        actual,
        scenario1,
        scenario2,
        scenario3,
        singleSupplementTotal: totalSingleSupplement,
        nightlyBreakdown,
      };
    }
  }

  const winner =
    bestConsistent && bestVariable
      ? bestConsistent.score > bestVariable.score
        ? bestConsistent
        : bestConsistent.score === bestVariable.score && bestConsistent.total <= bestVariable.total * 1.1
          ? bestConsistent
          : bestVariable
      : bestConsistent ?? bestVariable;

  if (!winner) {
    return null;
  }

  const sourceRate: PreTourRateCard = {
    ...winner.sourceCard,
    serviceId: input.hotelId,
    serviceLabel: `${winner.sourceCard.hotelCode} - ${winner.sourceCard.hotelName}`,
  };

  const dimensions = {
    hotelId: input.hotelId,
    stayDate,
    roomTypeId: winner.sourceCard.roomTypeId,
    roomBasis: winner.sourceCard.roomBasis || preferredRoomBasis,
    occupancy: explicitRooms.length > 0 ? "MIXED" : actualGuestCount <= 1 ? "SINGLE" : actualGuestCount === 2 ? "DOUBLE" : "MIXED",
    roomCount: explicitRoomCount ?? (winner.actual.single + winner.actual.double + winner.actual.triple),
    nights,
    roomingContext: explicitRooms.length > 0 ? "AI_EXPLICIT_ROOM_MIX" : "AI_AUTO_ROOM_MIX",
    selectedRateSignature: buildAccommodationSignature(winner.sourceCard),
    nightlyBreakdown: winner.nightlyBreakdown,
    occupancyPricing: {
      single: {
        baseAmount: winner.scenario1.base,
        taxAmount: winner.scenario1.tax,
        totalAmount: winner.scenario1.total,
      },
      double: {
        baseAmount: winner.scenario2.base,
        taxAmount: winner.scenario2.tax,
        totalAmount: winner.scenario2.total,
      },
      triple: {
        baseAmount: winner.scenario3.base,
        taxAmount: winner.scenario3.tax,
        totalAmount: winner.scenario3.total,
      },
    },
    singleSupplementRate: winner.singleSupplementTotal,
    aiResolutionStatus: "RESOLVED",
  };

  return {
    serviceId: input.hotelId,
    rateId: winner.rateId,
    currencyCode: input.runtime.planCurrencyCode,
    baseAmount: toMoneyString(winner.actual.base),
    taxAmount: toMoneyString(winner.actual.tax),
    totalAmount: toMoneyString(winner.actual.total),
    pricingSnapshot: buildPreTourPricingSnapshot({
      sourceRate,
      currencyCode: input.runtime.planCurrencyCode,
      buyBaseAmount: winner.actual.base,
      buyTaxAmount: winner.actual.tax,
      buyTotalAmount: winner.actual.total,
      markupMode: "NONE",
      markupValue: 0,
      sellBaseAmount: winner.actual.base,
      sellTaxAmount: winner.actual.tax,
      sellTotalAmount: winner.actual.total,
      priceMode: input.runtime.planPriceMode,
      overrideApplied: false,
      overrideReason: null,
      dimensions,
    }),
  };
}

async function resolveAITransportPricing(input: {
  runtime: AIPricingRuntime;
  context: PreTourAIMasterContext;
  item: PreTourAIDraft["days"][number]["items"][number];
  day: PreTourAIDraft["days"][number];
  dayHasGuide: boolean;
  fromLocationId: string | null;
  toLocationId: string | null;
}) : Promise<AIPricedLine | null> {
  if (!input.fromLocationId || !input.toLocationId) return null;

  const touristPax = resolveDefaultTravellerPax(input.context.request, input.item.pax);
  const requiredSeats = touristPax + (input.dayHasGuide ? 1 : 0);
  const quantity = Math.max(1, Math.trunc(input.item.units ?? 1));
  const serviceDate = toIsoStringOrNull(input.item.startAt || input.day.date) ?? input.context.request.startDate;
  const preferredCode = normalizedCode(input.item.serviceCode);
  const rankingTerms = tokenize(
    [input.item.title, input.item.description, input.item.notes, input.item.rationale]
      .filter(Boolean)
      .map((value) => textOf(value))
      .join(" ")
  );

  const rankedVehicleTypes = input.runtime.vehicleTypes
    .map((vehicleType) => {
      let score = 0;
      if (preferredCode && normalizedCode(vehicleType.code) === preferredCode) {
        score += 500;
      } else if (preferredCode && normalizedCode(vehicleType.categoryCode) === preferredCode) {
        score += 250;
      }
      score += scoreByTerms(
        `${vehicleType.code} ${vehicleType.name} ${vehicleType.categoryCode} ${vehicleType.categoryName}`.toLowerCase(),
        rankingTerms
      );
      if (vehicleType.paxCapacity >= requiredSeats) {
        score += Math.max(0, 120 - (vehicleType.paxCapacity - requiredSeats));
      } else {
        score -= 1000 + (requiredSeats - vehicleType.paxCapacity);
      }
      return { vehicleType, score };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.vehicleType.paxCapacity - right.vehicleType.paxCapacity;
    });

  const chargeMethodPriority = buildTransportChargeMethodPriority(input.item);
  for (const { vehicleType } of rankedVehicleTypes.slice(0, Math.min(rankedVehicleTypes.length, 12))) {
    for (const chargeMethod of chargeMethodPriority) {
      const options = await input.runtime.getTransportRates({
        chargeMethod,
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        serviceDate,
        vehicleCategoryId:
          input.runtime.transportRateBasis === "VEHICLE_CATEGORY" ? vehicleType.categoryId : null,
        vehicleTypeId:
          input.runtime.transportRateBasis === "VEHICLE_TYPE" ? vehicleType.id : null,
        pax: touristPax,
      });
      if (options.length === 0) continue;

      const [firstRate, ...otherRates] = options;
      let selectedRate = firstRate;
      otherRates.forEach((current) => {
        if (current.buyTotalAmount < selectedRate.buyTotalAmount) {
          selectedRate = current;
        }
      });

      const [baseAmount, taxAmount, totalAmount] = await Promise.all([
        input.runtime.convertToPlanCurrency(
          selectedRate.buyBaseAmount * quantity,
          selectedRate.currencyCode,
          selectedRate.effectiveDate
        ),
        input.runtime.convertToPlanCurrency(
          selectedRate.buyTaxAmount * quantity,
          selectedRate.currencyCode,
          selectedRate.effectiveDate
        ),
        input.runtime.convertToPlanCurrency(
          selectedRate.buyTotalAmount * quantity,
          selectedRate.currencyCode,
          selectedRate.effectiveDate
        ),
      ]);

      if (baseAmount === null || taxAmount === null || totalAmount === null) {
        continue;
      }

      const sourceRate: PreTourRateCard = {
        ...selectedRate,
        serviceId: vehicleType.id,
        serviceLabel: `${vehicleType.code} - ${vehicleType.name}`,
      };

      const dimensions = {
        ...selectedRate.pricingDimensions,
        vehicleCategoryId: vehicleType.categoryId,
        vehicleCategoryCode: vehicleType.categoryCode,
        vehicleCategoryName: vehicleType.categoryName,
        vehicleTypeId: vehicleType.id,
        vehicleTypeCode: vehicleType.code,
        vehicleTypeName: vehicleType.name,
        chargeMethod,
        tripMode: "TRANSFER",
        startAt: toIsoStringOrNull(input.item.startAt || input.day.date),
        endAt: toIsoStringOrNull(input.item.endAt),
        unitBasis: chargeMethod,
        routeLabel: `${input.fromLocationId} -> ${input.toLocationId}`,
        quantity,
        pax: touristPax,
        routeNotes: textOf(input.item.description || input.item.notes),
        requiredSeats,
        aiResolutionStatus: "RESOLVED",
      };

      return {
        serviceId: vehicleType.id,
        rateId: selectedRate.sourceRateId,
        currencyCode: input.runtime.planCurrencyCode,
        baseAmount: toMoneyString(baseAmount),
        taxAmount: toMoneyString(taxAmount),
        totalAmount: toMoneyString(totalAmount),
        pricingSnapshot: buildPreTourPricingSnapshot({
          sourceRate,
          currencyCode: input.runtime.planCurrencyCode,
          buyBaseAmount: baseAmount,
          buyTaxAmount: taxAmount,
          buyTotalAmount: totalAmount,
          markupMode: "NONE",
          markupValue: 0,
          sellBaseAmount: baseAmount,
          sellTaxAmount: taxAmount,
          sellTotalAmount: totalAmount,
          priceMode: input.runtime.planPriceMode,
          overrideApplied: false,
          overrideReason: null,
          dimensions,
        }),
      };
    }
  }

  return null;
}

async function resolveAIActivityPricing(input: {
  runtime: AIPricingRuntime;
  context: PreTourAIMasterContext;
  activityById: Map<string, MasterRow>;
  item: PreTourAIDraft["days"][number]["items"][number];
  day: PreTourAIDraft["days"][number];
  activityId: string | null;
}) : Promise<AIPricedLine | null> {
  if (!input.activityId) return null;

  const serviceDate = new Date(input.item.startAt || input.day.date || input.context.request.startDate);
  if (Number.isNaN(serviceDate.getTime())) return null;

  const activityRow = input.activityById.get(input.activityId);
  const rates = input.runtime.activityRatesByActivityId.get(input.activityId) ?? [];
  if (rates.length === 0) return null;

  const pax = resolveDefaultTravellerPax(input.context.request, input.item.pax);
  const quantity = Math.max(1, Math.trunc(input.item.units ?? 1));
  const durationMinutes = (() => {
    const explicitEnd = input.item.endAt ? new Date(input.item.endAt) : null;
    if (explicitEnd && !Number.isNaN(explicitEnd.getTime())) {
      const diff = Math.round((explicitEnd.getTime() - serviceDate.getTime()) / 60000);
      if (diff > 0) return diff;
    }
    const configured = toFiniteNumber(activityRow?.durationMin);
    return configured > 0 ? configured : 60;
  })();
  const rankingTerms = tokenize(
    [input.item.title, input.item.description, input.item.notes, input.item.rationale]
      .filter(Boolean)
      .map((value) => textOf(value))
      .join(" ")
  );

  let best:
    | {
        rate: AIActivityRateRow;
        baseAmount: number;
        taxAmount: number;
        totalAmount: number;
        unitBasis: string;
        paxSlab: string | null;
        score: number;
      }
    | null = null;

  for (const rate of rates) {
    const startsBefore =
      !rate.effectiveFrom || rate.effectiveFrom.getTime() <= serviceDate.getTime();
    const endsAfter =
      !rate.effectiveTo || rate.effectiveTo.getTime() >= serviceDate.getTime();
    if (!startsBefore || !endsAfter) continue;

    const minCharge = toFiniteNumber(rate.minCharge);
    const pricingModel = String(rate.pricingModel || "FIXED").toUpperCase();
    let rawBaseAmount = 0;
    let unitBasis = "PER_GROUP";
    let paxSlab: string | null = null;

    if (pricingModel === "PER_PAX") {
      rawBaseAmount = toFiniteNumber(rate.perPaxRate) * pax * quantity;
      unitBasis = "PER_PAX";
    } else if (pricingModel === "TIERED_PAX") {
      const matchedTier =
        rate.paxTiers?.find((tier) => pax >= tier.min && pax <= tier.max) ?? null;
      if (!matchedTier) continue;
      rawBaseAmount = toFiniteNumber(matchedTier.rate) * pax * quantity;
      unitBasis = "TIERED_PAX";
      paxSlab = `${matchedTier.min}-${matchedTier.max} pax`;
    } else if (pricingModel === "PER_HOUR") {
      rawBaseAmount = toFiniteNumber(rate.perHourRate) * (durationMinutes / 60) * quantity;
      unitBasis = "PER_HOUR";
    } else if (pricingModel === "PER_UNIT") {
      rawBaseAmount = toFiniteNumber(rate.perUnitRate) * quantity;
      unitBasis = "PER_UNIT";
    } else {
      rawBaseAmount = toFiniteNumber(rate.fixedRate) * quantity;
      unitBasis = "PER_GROUP";
    }

    const baseAmount = roundMoney(Math.max(rawBaseAmount, minCharge));
    const score =
      scoreByTerms(
        `${rate.code} ${textOf(rate.label)}`.toLowerCase(),
        rankingTerms
      ) +
      (rate.effectiveFrom ? 1 : 0);

    const candidate = {
      rate,
      baseAmount,
      taxAmount: 0,
      totalAmount: baseAmount,
      unitBasis,
      paxSlab,
      score,
    };

    if (
      !best ||
      candidate.score > best.score ||
      (candidate.score === best.score && candidate.totalAmount < best.totalAmount)
    ) {
      best = candidate;
    }
  }

  const selectedBest = best;
  if (!selectedBest) return null;

  const [baseAmount, taxAmount, totalAmount] = await Promise.all([
    input.runtime.convertToPlanCurrency(
      selectedBest.baseAmount,
      selectedBest.rate.currencyCode,
      serviceDate.toISOString()
    ),
    input.runtime.convertToPlanCurrency(
      selectedBest.taxAmount,
      selectedBest.rate.currencyCode,
      serviceDate.toISOString()
    ),
    input.runtime.convertToPlanCurrency(
      selectedBest.totalAmount,
      selectedBest.rate.currencyCode,
      serviceDate.toISOString()
    ),
  ]);
  if (baseAmount === null || taxAmount === null || totalAmount === null) {
    return null;
  }

  const activityLabel = activityRow
    ? `${textOf(activityRow.code)} - ${textOf(activityRow.name)}`
    : textOf(input.item.title);
  const sourceRate: PreTourRateCard = {
    sourceRateId: selectedBest.rate.id,
    sourceType: "MASTER_RATE",
    sourceLabel: `${activityLabel}${selectedBest.rate.label ? ` • ${selectedBest.rate.label}` : ""} • ${selectedBest.rate.pricingModel}`,
    serviceId: input.activityId,
    serviceLabel: activityLabel,
    currencyCode: selectedBest.rate.currencyCode,
    effectiveDate: serviceDate.toISOString(),
    validFrom: selectedBest.rate.effectiveFrom?.toISOString() ?? null,
    validTo: selectedBest.rate.effectiveTo?.toISOString() ?? null,
    buyBaseAmount: selectedBest.baseAmount,
    buyTaxAmount: 0,
    buyTotalAmount: selectedBest.baseAmount,
    pricingDimensions: {},
    locked: true,
  };

  return {
    serviceId: input.activityId,
    rateId: selectedBest.rate.id,
    currencyCode: input.runtime.planCurrencyCode,
    baseAmount: toMoneyString(baseAmount),
    taxAmount: toMoneyString(taxAmount),
    totalAmount: toMoneyString(totalAmount),
    pricingSnapshot: buildPreTourPricingSnapshot({
      sourceRate,
      currencyCode: input.runtime.planCurrencyCode,
      buyBaseAmount: baseAmount,
      buyTaxAmount: taxAmount,
      buyTotalAmount: totalAmount,
      markupMode: "NONE",
      markupValue: 0,
      sellBaseAmount: baseAmount,
      sellTaxAmount: taxAmount,
      sellTotalAmount: totalAmount,
      priceMode: input.runtime.planPriceMode,
      overrideApplied: false,
      overrideReason: null,
      dimensions: {
        activityId: input.activityId,
        scheduledAt: toIsoStringOrNull(input.item.startAt || input.day.date),
        endAt: toIsoStringOrNull(input.item.endAt),
        unitBasis: selectedBest.unitBasis,
        paxSlab: selectedBest.paxSlab,
        ageBand: null,
        quantity,
        durationMin: durationMinutes,
        slotNotes: textOf(input.item.description || input.item.notes),
        aiResolutionStatus: "RESOLVED",
      },
    }),
  };
}

async function resolveAIDraftItemPricing(input: {
  runtime: AIPricingRuntime;
  context: PreTourAIMasterContext;
  draft: PreTourAIDraft;
  activityById: Map<string, MasterRow>;
  item: PreTourAIDraft["days"][number]["items"][number];
  day: PreTourAIDraft["days"][number];
  dayHasGuide: boolean;
  hotelId: string | null;
  activityId: string | null;
  fromLocationId: string | null;
  toLocationId: string | null;
}) : Promise<AIPricedLine | null> {
  const normalizedItemType = normalizeAiItemType(input.item.itemType);
  if (normalizedItemType === "ACCOMMODATION") {
    return resolveAIAccommodationPricing({
      runtime: input.runtime,
      context: input.context,
      draft: input.draft,
      item: input.item,
      day: input.day,
      hotelId: input.hotelId,
    });
  }
  if (normalizedItemType === "TRANSPORT") {
    return resolveAITransportPricing({
      runtime: input.runtime,
      context: input.context,
      item: input.item,
      day: input.day,
      dayHasGuide: input.dayHasGuide,
      fromLocationId: input.fromLocationId,
      toLocationId: input.toLocationId,
    });
  }
  if (normalizedItemType === "ACTIVITY") {
    return resolveAIActivityPricing({
      runtime: input.runtime,
      context: input.context,
      activityById: input.activityById,
      item: input.item,
      day: input.day,
      activityId: input.activityId,
    });
  }
  return null;
}

function buildAIUnresolvedPricing(input: {
  runtime: AIPricingRuntime;
  context: PreTourAIMasterContext;
  draft: PreTourAIDraft;
  item: PreTourAIDraft["days"][number]["items"][number];
  day: PreTourAIDraft["days"][number];
  normalizedItemType: string;
  serviceId: string | null;
  hotelId: string | null;
  activityId: string | null;
  fromLocationId: string | null;
  toLocationId: string | null;
  locationId: string | null;
  reason: string;
}) : AIPricedLine {
  const explicitRooms =
    input.item.rooms?.map((room) => ({
      roomType: room.roomType,
      count: Math.max(1, Math.trunc(room.count)),
      adults: room.adults ?? null,
      children: room.children ?? null,
    })) ?? [];
  const explicitRoomCount =
    explicitRooms.length > 0
      ? explicitRooms.reduce((sum, room) => sum + room.count, 0)
      : null;

  const baseDimensions = {
    aiResolutionStatus: "UNRESOLVED",
    aiResolutionReason: input.reason,
    aiItemType: input.item.itemType,
    sourceServiceCode: toNullableText(input.item.serviceCode),
    rationale: toNullableText(input.item.rationale),
  } satisfies Record<string, unknown>;

  const dimensions =
    input.normalizedItemType === "ACCOMMODATION"
      ? {
          ...baseDimensions,
          hotelId: input.hotelId,
          stayDate:
            normalizeDateOnly(input.item.startAt || input.day.date || input.context.request.startDate) ??
            normalizeDateOnly(input.context.request.startDate),
          roomTypeId: null,
          roomBasis:
            toNullableText(input.draft.plan.mealPreference) ??
            toNullableText(input.context.request.mealPreference),
          occupancy: explicitRooms.length > 0 ? "MIXED" : null,
          roomCount: explicitRoomCount ?? Math.max(1, Math.trunc(input.item.units ?? 1)),
          nights: Math.max(1, Math.trunc(input.item.nights ?? 1)),
          roomingContext: explicitRooms.length > 0 ? "AI_EXPLICIT_ROOM_MIX" : "AI_AUTO_ROOM_MIX",
        }
      : input.normalizedItemType === "TRANSPORT"
        ? {
            ...baseDimensions,
            vehicleCategoryId: null,
            vehicleTypeId: null,
            chargeMethod: buildTransportChargeMethodPriority(input.item)[0] ?? "PER_VEHICLE",
            tripMode: "TRANSFER",
            fromLocationId: input.fromLocationId,
            toLocationId: input.toLocationId,
            startAt: toIsoStringOrNull(input.item.startAt || input.day.date),
            endAt: toIsoStringOrNull(input.item.endAt),
            unitBasis: null,
            routeLabel: null,
            pax: resolveDefaultTravellerPax(input.context.request, input.item.pax),
            quantity: Math.max(1, Math.trunc(input.item.units ?? 1)),
            routeNotes: toNullableText(input.item.description || input.item.notes),
          }
        : input.normalizedItemType === "ACTIVITY"
          ? {
              ...baseDimensions,
              activityId: input.activityId,
              scheduledAt: toIsoStringOrNull(input.item.startAt || input.day.date),
              endAt: toIsoStringOrNull(input.item.endAt),
              unitBasis: null,
              paxSlab: null,
              ageBand: null,
              quantity: Math.max(1, Math.trunc(input.item.units ?? 1)),
              durationMin: null,
              slotNotes: toNullableText(input.item.description || input.item.notes),
            }
          : {
              ...baseDimensions,
              locationId: input.locationId,
            };

  return {
    serviceId: input.serviceId,
    rateId: null,
    currencyCode: input.runtime.planCurrencyCode,
    baseAmount: "0.00",
    taxAmount: "0.00",
    totalAmount: "0.00",
    pricingSnapshot: buildEmptyPricingSnapshot(
      input.runtime.planCurrencyCode,
      input.runtime.planPriceMode,
      dimensions
    ),
  };
}

export async function applyPreTourAIDraft(payload: unknown, headers: Headers) {
  const parsed = preTourAIApplyRequestSchema.safeParse(payload);
  if (!parsed.success) {
    throw new PreTourAIError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  requireRevisionSource(parsed.data.request);
  const context = await loadMasterContext(parsed.data.request, headers, true);
  const draft = reconcileDraftAccommodationHotels(parsed.data.draft, context);
  const validation = buildPreTourAIDraftValidation(draft, context);
  if (!validation.canApply) {
    const topIssue =
      validation.issues.find((issue) => issue.severity === "high") ??
      validation.issues[0];
    throw new PreTourAIError(
      400,
      "AI_DRAFT_NOT_APPLICABLE",
      topIssue?.message || "AI draft contains unresolved high-severity issues."
    );
  }

  const locationByCode = buildMapByCode(context.locations);
  const activityByCode = buildMapByCode(context.activities);
  const hotelByCode = buildMapByCode(context.hotels);
  const guideByCode = buildMapByCode(context.guides);
  const categoryByCode = buildMapByCode(context.categories);
  const technicalVisitByCode = buildMapByCode(context.technicalVisits);
  const activityById = buildMapById(context.activities);

  const request = parsed.data.request;
  const guideCoverageDaySet = buildGuideCoverageDaySet(draft);
  const pricingRuntime = await createAIPricingRuntime({
    context,
    draft,
    headers,
    activityByCode,
  });
  const revisionSeed =
    request.mode === "REVISE" && request.sourcePlanId
      ? await loadSourcePlanVersionSeed(context.companyId, request.sourcePlanId)
      : null;
  const planTitle = textOf(draft.plan.title) || "AI Pre-Tour Draft";
  const planCode = revisionSeed
    ? buildScopedCode("PT", [revisionSeed.referenceNo, `V${revisionSeed.nextVersion}`, compactDate(request.startDate)])
    : buildScopedCode("PT", [planTitle, compactDate(request.startDate)]);
  const referenceNo = revisionSeed
    ? String(revisionSeed.referenceNo)
    : buildScopedCode("PT", [compactDate(request.startDate)]);
  const selectedRoomPreference = draft.plan.roomPreference ?? request.roomPreference ?? null;
  const selectedMealPreference = draft.plan.mealPreference ?? request.mealPreference ?? null;
  const selectedLanguage = draft.plan.preferredLanguage ?? request.preferredLanguage ?? null;
  const planNotes = revisionSeed
    ? `${buildNotes(draft.plan.summary, draft.plan.notes)}\n\nAI Revision Source: ${revisionSeed.planCode} | ${revisionSeed.title}`.slice(
        0,
        2000
      )
    : buildNotes(draft.plan.summary, draft.plan.notes);

  let created:
    | {
        id: string;
        planCode: string;
        title: string;
      }
    | null = null;

  try {
    const planValues: typeof schema.preTourPlan.$inferInsert = {
      companyId: context.companyId,
      code: planCode,
      planCode,
      referenceNo,
      categoryId: request.categoryId,
      operatorOrgId: request.operatorOrgId,
      marketOrgId: request.marketOrgId,
      title: planTitle,
      status: "DRAFT",
      startDate: new Date(request.startDate),
      endDate: new Date(request.endDate),
      totalNights: toNightCount(request.startDate, request.endDate),
      adults: request.adults,
      children: request.children,
      infants: request.infants,
      preferredLanguage: selectedLanguage,
      roomPreference: selectedRoomPreference,
      mealPreference: selectedMealPreference,
      notes: planNotes,
      currencyCode: normalizedCode(request.currencyCode),
      baseCurrencyCode: context.baseCurrencyCode,
      exchangeRateMode: context.exchangeRateMode,
      exchangeRate: context.exchangeRate.toFixed(8),
      exchangeRateDate: context.exchangeRateDate,
      priceMode: request.priceMode,
      baseTotal: "0.00",
      taxTotal: "0.00",
      grandTotal: "0.00",
      version: revisionSeed?.nextVersion ?? 1,
      isLocked: false,
      isActive: true,
      updatedByUserId: context.userId,
      updatedByName: context.userName,
    };

    [created] = await db
      .insert(schema.preTourPlan)
      .values(planValues)
      .returning({
        id: schema.preTourPlan.id,
        planCode: schema.preTourPlan.planCode,
        title: schema.preTourPlan.title,
      });

    const dayIdByNumber = new Map<number, string>();
    for (const day of draft.days) {
      const startLocationId = day.startLocationCode
        ? String(locationByCode.get(normalizedCode(day.startLocationCode))?.id ?? "")
        : "";
      const endLocationId = day.endLocationCode
        ? String(locationByCode.get(normalizedCode(day.endLocationCode))?.id ?? "")
        : "";
      const dayValues: typeof schema.preTourPlanDay.$inferInsert = {
        companyId: context.companyId,
        code: buildScopedCode("PTDAY", [created.planCode, String(day.dayNumber)]),
        planId: created.id,
        dayNumber: day.dayNumber,
        date: resolveDayDate(request, day.dayNumber),
        title: day.title,
        notes: day.notes,
        startLocationId: startLocationId || null,
        endLocationId: endLocationId || null,
        isActive: true,
      };

      const [createdDay] = await db
        .insert(schema.preTourPlanDay)
        .values(dayValues)
        .returning({ id: schema.preTourPlanDay.id });
      dayIdByNumber.set(day.dayNumber, String(createdDay.id));
    }

    for (const day of draft.days) {
      const dayId = dayIdByNumber.get(day.dayNumber);
      if (!dayId) continue;
      const dayHasGuide = guideCoverageDaySet.has(day.dayNumber);
      const preparedItems = await Promise.all(
        day.items.map(async (item, itemIndex) => {
          const normalizedItemType = normalizeAiItemType(item.itemType);
          const serviceCode = normalizedCode(item.serviceCode);
          const activityRow =
            normalizedItemType === "ACTIVITY" && serviceCode
              ? activityByCode.get(serviceCode) ?? null
              : null;
          const hotelRow =
            normalizedItemType === "ACCOMMODATION" && serviceCode
              ? hotelByCode.get(serviceCode) ?? null
              : null;
          const guideRow =
            item.itemType === "GUIDE" && serviceCode ? guideByCode.get(serviceCode) ?? null : null;
          const fromLocationId = item.fromLocationCode
            ? toNullableText(locationByCode.get(normalizedCode(item.fromLocationCode))?.id)
            : null;
          const toLocationId = item.toLocationCode
            ? toNullableText(locationByCode.get(normalizedCode(item.toLocationCode))?.id)
            : null;
          const explicitLocationId = item.locationCode
            ? toNullableText(locationByCode.get(normalizedCode(item.locationCode))?.id)
            : null;
          const resolvedLocationId =
            explicitLocationId ??
            (normalizedItemType === "ACTIVITY"
              ? toNullableText(activityRow?.locationId)
              : null);
          const resolvedServiceId =
            normalizedItemType === "ACTIVITY"
              ? toNullableText(activityRow?.id)
              : normalizedItemType === "ACCOMMODATION"
                ? toNullableText(hotelRow?.id)
                : item.itemType === "GUIDE"
                  ? toNullableText(guideRow?.id)
                  : null;

          const resolvedPricing = await resolveAIDraftItemPricing({
            runtime: pricingRuntime,
            context,
            draft,
            activityById,
            item,
            day,
            dayHasGuide,
            hotelId: normalizedItemType === "ACCOMMODATION" ? toNullableText(hotelRow?.id) : null,
            activityId: normalizedItemType === "ACTIVITY" ? toNullableText(activityRow?.id) : null,
            fromLocationId,
            toLocationId,
          });

          const pricing =
            resolvedPricing ??
            buildAIUnresolvedPricing({
              runtime: pricingRuntime,
              context,
              draft,
              item,
              day,
              normalizedItemType,
              serviceId: resolvedServiceId,
              hotelId: normalizedItemType === "ACCOMMODATION" ? toNullableText(hotelRow?.id) : null,
              activityId: normalizedItemType === "ACTIVITY" ? toNullableText(activityRow?.id) : null,
              fromLocationId,
              toLocationId,
              locationId: resolvedLocationId,
              reason:
                normalizedItemType === "TRANSPORT"
                  ? "No active transport rate matched the route, pax count, and selected vehicle basis."
                  : normalizedItemType === "ACCOMMODATION"
                    ? "No active hotel contract rate matched the stay dates and rooming configuration."
                    : normalizedItemType === "ACTIVITY"
                      ? "No active activity rate matched the scheduled date and pricing model."
                      : item.itemType === "GUIDE"
                        ? "Guide pricing is not auto-resolved by the AI apply flow yet."
                        : "AI pricing auto-resolution is not available for this item type.",
            });

          const computedStartAt =
            normalizedItemType === "ACCOMMODATION"
              ? toMidnightIso(item.startAt || day.date || request.startDate)
              : toIsoStringOrNull(item.startAt) ??
                (normalizedItemType === "ACTIVITY" || normalizedItemType === "TRANSPORT"
                  ? toMidnightIso(day.date)
                  : null);

          return {
            itemIndex,
            item,
            normalizedItemType,
            serviceId: pricing.serviceId ?? resolvedServiceId,
            fromLocationId,
            toLocationId,
            locationId: resolvedLocationId,
            startAt: computedStartAt,
            endAt: toIsoStringOrNull(item.endAt),
            pricing,
          };
        })
      );

      for (const prepared of preparedItems) {
        const { itemIndex, item, serviceId, fromLocationId, toLocationId, locationId, startAt, endAt, pricing } = prepared;
        const itemValues: typeof schema.preTourPlanItem.$inferInsert = {
          companyId: context.companyId,
          code: buildScopedCode("PTITEM", [
            created.planCode,
            String(day.dayNumber),
            item.itemType,
            String(itemIndex + 1),
          ]),
          planId: created.id,
          dayId,
          itemType: item.itemType,
          serviceId: serviceId ? String(serviceId) : null,
          startAt: startAt ? new Date(startAt) : null,
          endAt: endAt ? new Date(endAt) : null,
          sortOrder: itemIndex + 1,
          pax: item.pax ?? null,
          units: item.units !== null && item.units !== undefined ? String(item.units) : null,
          nights: item.nights ?? null,
          rooms:
            item.rooms?.map((room) => ({
              roomType: room.roomType,
              count: room.count,
              ...(room.adults !== null && room.adults !== undefined ? { adults: room.adults } : {}),
              ...(room.children !== null && room.children !== undefined
                ? { children: room.children }
                : {}),
            })) ?? null,
          fromLocationId,
          toLocationId,
          locationId,
          rateId: pricing.rateId,
          currencyCode: pricing.currencyCode,
          priceMode: request.priceMode,
          baseAmount: pricing.baseAmount,
          taxAmount: pricing.taxAmount,
          totalAmount: pricing.totalAmount,
          pricingSnapshot: pricing.pricingSnapshot as unknown as Record<string, unknown>,
          title: item.title,
          description: item.description,
          notes: item.notes,
          status: "PLANNED",
          isActive: true,
        };
        await db.insert(schema.preTourPlanItem).values(itemValues);
      }
    }

    for (const [index, allocation] of draft.guideAllocations.entries()) {
      const serviceId = allocation.serviceCode
        ? guideByCode.get(normalizedCode(allocation.serviceCode))?.id
        : null;
      const startDayId = allocation.startDayNumber
        ? dayIdByNumber.get(allocation.startDayNumber) ?? null
        : null;
      const endDayId = allocation.endDayNumber
        ? dayIdByNumber.get(allocation.endDayNumber) ?? null
        : null;
      const guideValues: typeof schema.preTourPlanGuideAllocation.$inferInsert = {
        companyId: context.companyId,
        code: buildScopedCode("PTGUIDE", [created.planCode, String(index + 1)]),
        planId: created.id,
        serviceId: serviceId ? String(serviceId) : null,
        coverageMode: allocation.coverageMode,
        startDayId,
        endDayId,
        language: allocation.language,
        guideBasis: allocation.guideBasis,
        pax: allocation.pax ?? null,
        units: allocation.units !== null && allocation.units !== undefined ? String(allocation.units) : null,
        rateId: null,
        currencyCode: normalizedCode(request.currencyCode),
        priceMode: request.priceMode,
        baseAmount: "0.00",
        taxAmount: "0.00",
        totalAmount: "0.00",
        pricingSnapshot: buildEmptyPricingSnapshot(
          pricingRuntime.planCurrencyCode,
          pricingRuntime.planPriceMode,
          {
            aiResolutionStatus: "UNRESOLVED",
            aiResolutionReason: "Guide pricing is not auto-resolved by the AI apply flow yet.",
            guideId: serviceId ? String(serviceId) : null,
            language: allocation.language,
            unitBasis: allocation.guideBasis,
            paxSlab: null,
            quantity:
              allocation.units !== null && allocation.units !== undefined ? allocation.units : null,
            sourceServiceCode: toNullableText(allocation.serviceCode),
            rationale: toNullableText(allocation.rationale),
          }
        ),
        title: allocation.title,
        notes: allocation.notes,
        status: "PLANNED",
        isActive: true,
      };
      await db.insert(schema.preTourPlanGuideAllocation).values(guideValues);
    }

    for (const entry of draft.additionalCategories) {
      const category = categoryByCode.get(normalizedCode(entry.categoryCode));
      if (!category) continue;
      const categoryValues: typeof schema.preTourPlanCategory.$inferInsert = {
        companyId: context.companyId,
        code: buildScopedCode("PTCAT", [created.planCode, entry.categoryCode]),
        planId: created.id,
        typeId: String(category.typeId),
        categoryId: String(category.id),
        notes: entry.reason,
        isActive: true,
      };
      await db.insert(schema.preTourPlanCategory).values(categoryValues);
    }

    for (const [index, visit] of draft.technicalVisits.entries()) {
      const technicalVisit = technicalVisitByCode.get(normalizedCode(visit.technicalVisitCode));
      if (!technicalVisit) continue;
      const technicalVisitValues: typeof schema.preTourPlanTechnicalVisit.$inferInsert = {
        companyId: context.companyId,
        code: buildScopedCode("PTTV", [created.planCode, String(index + 1)]),
        planId: created.id,
        dayId: visit.dayNumber ? dayIdByNumber.get(visit.dayNumber) ?? null : null,
        technicalVisitId: String(technicalVisit.id),
        notes: visit.notes,
        isActive: true,
      };
      await db.insert(schema.preTourPlanTechnicalVisit).values(technicalVisitValues);
    }
  } catch (error) {
    if (created?.id) {
      try {
        await db
          .delete(schema.preTourPlan)
          .where(
            and(
              eq(schema.preTourPlan.id, created.id),
              eq(schema.preTourPlan.companyId, context.companyId)
            )
          );
      } catch {
        // Best-effort cleanup only; preserve the original error for the caller.
      }
    }
    throw error;
  }

  if (!created) {
    throw new PreTourAIError(
      500,
      "AI_DRAFT_APPLY_FAILED",
      "AI draft could not be saved as a pre-tour plan."
    );
  }

  if (parsed.data.generateCosting) {
    await generatePreTourCosting({ planId: created.id }, headers);
  }

  const runId = await ensureAIRunApplied({
    runId: parsed.data.runId ?? null,
    context,
    request,
    draft,
    validation,
    planId: String(created.id),
  });

  return preTourAIApplyResponseSchema.parse({
    planId: String(created.id),
    planCode: String(created.planCode),
    title: String(created.title),
    runId,
  });
}

export function toPreTourAIErrorResponse(error: unknown) {
  if (error instanceof PreTourAIError) {
    return {
      status: error.status,
      body: { code: error.code, message: error.message },
    };
  }

  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    "code" in error &&
    typeof (error as { status?: unknown }).status === "number" &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const normalized = error as {
      status: number;
      code: string;
      message?: string;
    };
    return {
      status: normalized.status,
      body: {
        code: normalized.code,
        message: normalized.message || "AI pre-tour request failed.",
      },
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      body: { code: "INTERNAL_ERROR", message: error.message || "AI pre-tour request failed." },
    };
  }

  return {
    status: 500,
    body: { code: "INTERNAL_ERROR", message: "AI pre-tour request failed." },
  };
}
