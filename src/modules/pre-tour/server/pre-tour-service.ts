import { and, desc, eq, gte, ilike, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  createPreTourDaySchema,
  createPreTourItemAddonSchema,
  createPreTourItemSchema,
  createPreTourSchema,
  createPreTourTotalSchema,
  preTourListQuerySchema,
  preTourResourceSchema,
  updatePreTourDaySchema,
  updatePreTourItemAddonSchema,
  updatePreTourItemSchema,
  updatePreTourSchema,
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

async function getAccess(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) {
    throw new PreTourError(401, "UNAUTHORIZED", "You are not authenticated.");
  }

  const user = session.user as {
    companyId?: string | null;
    role?: string | null;
    readOnly?: boolean;
    canWritePreTour?: boolean;
  };
  if (!user.companyId) {
    throw new PreTourError(403, "COMPANY_REQUIRED", "User is not linked to a company.");
  }

  return {
    companyId: user.companyId,
    role: user.role ?? "USER",
    readOnly: Boolean(user.readOnly),
    canWritePreTour: Boolean(user.canWritePreTour),
  };
}

async function ensureWritable(headers: Headers) {
  const access = await getAccess(headers);
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

  const { companyId } = await getAccess(headers);
  const q = parsed.data.q ? `%${parsed.data.q}%` : null;
  const limit = parsed.data.limit;
  const planId = parsed.data.planId;
  const dayId = parsed.data.dayId;
  const itemId = parsed.data.itemId;

  switch (resource) {
    case "pre-tours":
      return db
        .select()
        .from(schema.preTourPlan)
        .where(
          and(
            eq(schema.preTourPlan.companyId, companyId),
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
  const { companyId } = await ensureWritable(headers);

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

      const [created] = await db
        .insert(schema.preTourPlanDay)
        .values({
          ...parsed.data,
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
  const { companyId } = await ensureWritable(headers);

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
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "pre-tours": {
      const [deleted] = await db
        .delete(schema.preTourPlan)
        .where(and(eq(schema.preTourPlan.id, id), eq(schema.preTourPlan.companyId, companyId)))
        .returning({ id: schema.preTourPlan.id });
      if (!deleted) throw new PreTourError(404, "NOT_FOUND", "Pre-tour plan not found.");
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
    default:
      throw new PreTourError(404, "RESOURCE_NOT_FOUND", "Pre-tour resource not found.");
  }
}

export function toPreTourErrorResponse(error: unknown) {
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
