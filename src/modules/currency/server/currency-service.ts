import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  createCurrencySchema,
  createExchangeRateSchema,
  createFxProviderSchema,
  createMoneySettingSchema,
  currencyListQuerySchema,
  currencyResourceSchema,
  updateCurrencySchema,
  updateExchangeRateSchema,
  updateFxProviderSchema,
  updateMoneySettingSchema,
} from "@/modules/currency/shared/currency-schemas";

class CurrencyError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

type CurrencyResource = z.infer<typeof currencyResourceSchema>;

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

async function getAccess(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) {
    throw new CurrencyError(401, "UNAUTHORIZED", "You are not authenticated.");
  }
  const user = session.user as { companyId?: string | null; readOnly?: boolean };
  if (!user.companyId) {
    throw new CurrencyError(403, "COMPANY_REQUIRED", "User is not linked to a company.");
  }
  return { companyId: user.companyId, readOnly: Boolean(user.readOnly) };
}

async function ensureWritable(headers: Headers) {
  const access = await getAccess(headers);
  if (access.readOnly) {
    throw new CurrencyError(
      403,
      "READ_ONLY_MODE",
      "You are in read-only mode. Contact a manager for edit access."
    );
  }
  return access;
}

function parseResource(input: string): CurrencyResource {
  const parsed = currencyResourceSchema.safeParse(input);
  if (!parsed.success) {
    throw new CurrencyError(404, "RESOURCE_NOT_FOUND", "Currency resource not found.");
  }
  return parsed.data;
}

async function ensureCurrency(companyId: string, currencyId: string) {
  const [record] = await db
    .select({ id: schema.currency.id })
    .from(schema.currency)
    .where(and(eq(schema.currency.id, currencyId), eq(schema.currency.companyId, companyId)))
    .limit(1);
  if (!record) {
    throw new CurrencyError(400, "CURRENCY_NOT_FOUND", "Currency not found in this company.");
  }
}

async function ensureFxProvider(companyId: string, providerId: string) {
  const [record] = await db
    .select({ id: schema.fxProvider.id })
    .from(schema.fxProvider)
    .where(and(eq(schema.fxProvider.id, providerId), eq(schema.fxProvider.companyId, companyId)))
    .limit(1);
  if (!record) {
    throw new CurrencyError(400, "PROVIDER_NOT_FOUND", "FX provider not found in this company.");
  }
}

export async function listCurrencyRecords(
  resourceInput: string,
  searchParams: URLSearchParams,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const parsed = currencyListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new CurrencyError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const { companyId } = await getAccess(headers);
  const q = parsed.data.q ? `%${parsed.data.q}%` : null;
  const limit = parsed.data.limit;
  const currencyId = parsed.data.currencyId;

  switch (resource) {
    case "currencies":
      return db
        .select()
        .from(schema.currency)
        .where(
          and(
            eq(schema.currency.companyId, companyId),
            q ? or(ilike(schema.currency.code, q), ilike(schema.currency.name, q)) : undefined
          )
        )
        .orderBy(desc(schema.currency.createdAt))
        .limit(limit);
    case "fx-providers":
      return db
        .select()
        .from(schema.fxProvider)
        .where(
          and(
            eq(schema.fxProvider.companyId, companyId),
            q ? or(ilike(schema.fxProvider.code, q), ilike(schema.fxProvider.name, q)) : undefined
          )
        )
        .orderBy(desc(schema.fxProvider.createdAt))
        .limit(limit);
    case "exchange-rates":
      return db
        .select()
        .from(schema.exchangeRate)
        .where(
          and(
            eq(schema.exchangeRate.companyId, companyId),
            currencyId
              ? or(
                  eq(schema.exchangeRate.baseCurrencyId, currencyId),
                  eq(schema.exchangeRate.quoteCurrencyId, currencyId)
                )
              : undefined,
            q
              ? or(
                  ilike(schema.exchangeRate.code, q),
                  ilike(schema.exchangeRate.rateType, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.exchangeRate.asOf), desc(schema.exchangeRate.createdAt))
        .limit(limit);
    case "money-settings":
      return db
        .select()
        .from(schema.moneySetting)
        .where(
          and(
            eq(schema.moneySetting.companyId, companyId),
            q
              ? or(
                  ilike(schema.moneySetting.code, q),
                  ilike(schema.moneySetting.priceMode, q),
                  ilike(schema.moneySetting.fxRateSource, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.moneySetting.createdAt))
        .limit(limit);
    default:
      throw new CurrencyError(404, "RESOURCE_NOT_FOUND", "Currency resource not found.");
  }
}

export async function createCurrencyRecord(
  resourceInput: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "currencies": {
      const parsed = createCurrencySchema.safeParse(payload);
      if (!parsed.success) {
        throw new CurrencyError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      const [created] = await db
        .insert(schema.currency)
        .values({ ...parsed.data, companyId })
        .returning();
      return created;
    }
    case "fx-providers": {
      const parsed = createFxProviderSchema.safeParse(payload);
      if (!parsed.success) {
        throw new CurrencyError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      const [created] = await db
        .insert(schema.fxProvider)
        .values({ ...parsed.data, companyId })
        .returning();
      return created;
    }
    case "exchange-rates": {
      const parsed = createExchangeRateSchema.safeParse(payload);
      if (!parsed.success) {
        throw new CurrencyError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.baseCurrencyId === parsed.data.quoteCurrencyId) {
        throw new CurrencyError(
          400,
          "INVALID_PAIR",
          "Base currency and quote currency must be different."
        );
      }
      await ensureCurrency(companyId, parsed.data.baseCurrencyId);
      await ensureCurrency(companyId, parsed.data.quoteCurrencyId);
      if (parsed.data.providerId) {
        await ensureFxProvider(companyId, parsed.data.providerId);
      }
      const [created] = await db
        .insert(schema.exchangeRate)
        .values({
          ...parsed.data,
          companyId,
          rate: toDecimal(parsed.data.rate, 8) ?? "0.00000000",
          asOf: toDate(parsed.data.asOf)!,
        })
        .returning();
      return created;
    }
    case "money-settings": {
      const parsed = createMoneySettingSchema.safeParse(payload);
      if (!parsed.success) {
        throw new CurrencyError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureCurrency(companyId, parsed.data.baseCurrencyId);
      const [created] = await db
        .insert(schema.moneySetting)
        .values({ ...parsed.data, companyId })
        .returning();
      return created;
    }
    default:
      throw new CurrencyError(404, "RESOURCE_NOT_FOUND", "Currency resource not found.");
  }
}

export async function updateCurrencyRecord(
  resourceInput: string,
  id: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "currencies": {
      const parsed = updateCurrencySchema.safeParse(payload);
      if (!parsed.success) {
        throw new CurrencyError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      const [updated] = await db
        .update(schema.currency)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(schema.currency.id, id), eq(schema.currency.companyId, companyId)))
        .returning();
      if (!updated) throw new CurrencyError(404, "RECORD_NOT_FOUND", "Currency not found.");
      return updated;
    }
    case "fx-providers": {
      const parsed = updateFxProviderSchema.safeParse(payload);
      if (!parsed.success) {
        throw new CurrencyError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      const [updated] = await db
        .update(schema.fxProvider)
        .set(parsed.data)
        .where(and(eq(schema.fxProvider.id, id), eq(schema.fxProvider.companyId, companyId)))
        .returning();
      if (!updated) throw new CurrencyError(404, "RECORD_NOT_FOUND", "FX provider not found.");
      return updated;
    }
    case "exchange-rates": {
      const parsed = updateExchangeRateSchema.safeParse(payload);
      if (!parsed.success) {
        throw new CurrencyError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      const [current] = await db
        .select({
          baseCurrencyId: schema.exchangeRate.baseCurrencyId,
          quoteCurrencyId: schema.exchangeRate.quoteCurrencyId,
        })
        .from(schema.exchangeRate)
        .where(and(eq(schema.exchangeRate.id, id), eq(schema.exchangeRate.companyId, companyId)))
        .limit(1);
      if (!current) throw new CurrencyError(404, "RECORD_NOT_FOUND", "Exchange rate not found.");

      const nextBase = parsed.data.baseCurrencyId ?? current.baseCurrencyId;
      const nextQuote = parsed.data.quoteCurrencyId ?? current.quoteCurrencyId;
      if (nextBase === nextQuote) {
        throw new CurrencyError(
          400,
          "INVALID_PAIR",
          "Base currency and quote currency must be different."
        );
      }

      if (parsed.data.baseCurrencyId) await ensureCurrency(companyId, parsed.data.baseCurrencyId);
      if (parsed.data.quoteCurrencyId) await ensureCurrency(companyId, parsed.data.quoteCurrencyId);
      if (parsed.data.providerId) await ensureFxProvider(companyId, parsed.data.providerId);

      const [updated] = await db
        .update(schema.exchangeRate)
        .set({
          ...parsed.data,
          rate:
            parsed.data.rate !== undefined
              ? toDecimal(parsed.data.rate, 8) ?? undefined
              : undefined,
          asOf:
            parsed.data.asOf !== undefined
              ? toDate(parsed.data.asOf) ?? undefined
              : undefined,
        })
        .where(and(eq(schema.exchangeRate.id, id), eq(schema.exchangeRate.companyId, companyId)))
        .returning();
      if (!updated) throw new CurrencyError(404, "RECORD_NOT_FOUND", "Exchange rate not found.");
      return updated;
    }
    case "money-settings": {
      const parsed = updateMoneySettingSchema.safeParse(payload);
      if (!parsed.success) {
        throw new CurrencyError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.baseCurrencyId) {
        await ensureCurrency(companyId, parsed.data.baseCurrencyId);
      }
      const [updated] = await db
        .update(schema.moneySetting)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(schema.moneySetting.id, id), eq(schema.moneySetting.companyId, companyId)))
        .returning();
      if (!updated) throw new CurrencyError(404, "RECORD_NOT_FOUND", "Money setting not found.");
      return updated;
    }
    default:
      throw new CurrencyError(404, "RESOURCE_NOT_FOUND", "Currency resource not found.");
  }
}

export async function deleteCurrencyRecord(
  resourceInput: string,
  id: string,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "currencies": {
      const [deleted] = await db
        .delete(schema.currency)
        .where(and(eq(schema.currency.id, id), eq(schema.currency.companyId, companyId)))
        .returning({ id: schema.currency.id });
      if (!deleted) throw new CurrencyError(404, "RECORD_NOT_FOUND", "Currency not found.");
      return;
    }
    case "fx-providers": {
      const [deleted] = await db
        .delete(schema.fxProvider)
        .where(and(eq(schema.fxProvider.id, id), eq(schema.fxProvider.companyId, companyId)))
        .returning({ id: schema.fxProvider.id });
      if (!deleted) throw new CurrencyError(404, "RECORD_NOT_FOUND", "FX provider not found.");
      return;
    }
    case "exchange-rates": {
      const [deleted] = await db
        .delete(schema.exchangeRate)
        .where(and(eq(schema.exchangeRate.id, id), eq(schema.exchangeRate.companyId, companyId)))
        .returning({ id: schema.exchangeRate.id });
      if (!deleted) throw new CurrencyError(404, "RECORD_NOT_FOUND", "Exchange rate not found.");
      return;
    }
    case "money-settings": {
      const [deleted] = await db
        .delete(schema.moneySetting)
        .where(and(eq(schema.moneySetting.id, id), eq(schema.moneySetting.companyId, companyId)))
        .returning({ id: schema.moneySetting.id });
      if (!deleted) throw new CurrencyError(404, "RECORD_NOT_FOUND", "Money setting not found.");
      return;
    }
    default:
      throw new CurrencyError(404, "RESOURCE_NOT_FOUND", "Currency resource not found.");
  }
}

export function toCurrencyErrorResponse(error: unknown) {
  if (error instanceof CurrencyError) {
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
