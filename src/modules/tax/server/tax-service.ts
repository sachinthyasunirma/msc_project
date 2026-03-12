import { and, desc, eq, ilike, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  getOrSetMasterDataCache,
  invalidateMasterDataCacheByPrefixes,
  masterDataCachePrefix,
  masterDataListCacheKey,
} from "@/lib/cache/master-data-cache";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import {
  createDocumentFxSnapshotSchema,
  createDocumentTaxLineSchema,
  createDocumentTaxSnapshotSchema,
  createTaxJurisdictionSchema,
  createTaxRateSchema,
  createTaxRuleSchema,
  createTaxRuleSetSchema,
  createTaxRuleTaxSchema,
  createTaxSchema,
  taxListQuerySchema,
  taxResourceSchema,
  updateDocumentFxSnapshotSchema,
  updateDocumentTaxLineSchema,
  updateDocumentTaxSnapshotSchema,
  updateTaxJurisdictionSchema,
  updateTaxRateSchema,
  updateTaxRuleSchema,
  updateTaxRuleSetSchema,
  updateTaxRuleTaxSchema,
  updateTaxSchema,
} from "@/modules/tax/shared/tax-schemas";

class TaxError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

type TaxResource = z.infer<typeof taxResourceSchema>;

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
  try {
    return await resolveAccess(headers, {
      requiredPrivilege: "SCREEN_MASTER_TAXES",
    });
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new TaxError(error.status, error.code, error.message);
    }
    throw error;
  }
}

async function ensureWritable(headers: Headers) {
  const access = await getAccess(headers);
  if (access.readOnly) {
    throw new TaxError(
      403,
      "READ_ONLY_MODE",
      "You are in read-only mode. Contact a manager for edit access."
    );
  }
  const elevated = access.role === "ADMIN" || access.role === "MANAGER";
  if (!elevated && !access.canWriteMasterData) {
    throw new TaxError(403, "PERMISSION_DENIED", "You do not have write access for Master Data.");
  }
  return access;
}

function parseResource(input: string): TaxResource {
  const parsed = taxResourceSchema.safeParse(input);
  if (!parsed.success) {
    throw new TaxError(404, "RESOURCE_NOT_FOUND", "Tax resource not found.");
  }
  return parsed.data;
}

async function ensureTax(companyId: string, id: string) {
  const [record] = await db
    .select({ id: schema.tax.id })
    .from(schema.tax)
    .where(and(eq(schema.tax.id, id), eq(schema.tax.companyId, companyId)))
    .limit(1);
  if (!record) throw new TaxError(400, "TAX_NOT_FOUND", "Tax not found in this company.");
}

async function ensureTaxJurisdiction(companyId: string, id: string) {
  const [record] = await db
    .select({ id: schema.taxJurisdiction.id })
    .from(schema.taxJurisdiction)
    .where(
      and(
        eq(schema.taxJurisdiction.id, id),
        eq(schema.taxJurisdiction.companyId, companyId)
      )
    )
    .limit(1);
  if (!record) {
    throw new TaxError(
      400,
      "JURISDICTION_NOT_FOUND",
      "Tax jurisdiction not found in this company."
    );
  }
}

async function ensureCurrency(companyId: string, id: string) {
  const [record] = await db
    .select({ id: schema.currency.id })
    .from(schema.currency)
    .where(and(eq(schema.currency.id, id), eq(schema.currency.companyId, companyId)))
    .limit(1);
  if (!record) {
    throw new TaxError(400, "CURRENCY_NOT_FOUND", "Currency not found in this company.");
  }
}

async function ensureRuleSet(companyId: string, id: string) {
  const [record] = await db
    .select({ id: schema.taxRuleSet.id })
    .from(schema.taxRuleSet)
    .where(and(eq(schema.taxRuleSet.id, id), eq(schema.taxRuleSet.companyId, companyId)))
    .limit(1);
  if (!record) {
    throw new TaxError(
      400,
      "RULE_SET_NOT_FOUND",
      "Tax rule set not found in this company."
    );
  }
}

async function ensureRule(companyId: string, id: string) {
  const [record] = await db
    .select({ id: schema.taxRule.id })
    .from(schema.taxRule)
    .where(and(eq(schema.taxRule.id, id), eq(schema.taxRule.companyId, companyId)))
    .limit(1);
  if (!record) throw new TaxError(400, "RULE_NOT_FOUND", "Tax rule not found in this company.");
}

async function ensureTaxRuleTaxCodeUnique(companyId: string, code: string, excludeId?: string) {
  const [existing] = await db
    .select({ id: schema.taxRuleTax.id })
    .from(schema.taxRuleTax)
    .where(
      and(
        eq(schema.taxRuleTax.companyId, companyId),
        eq(schema.taxRuleTax.code, code),
        excludeId ? ne(schema.taxRuleTax.id, excludeId) : undefined
      )
    )
    .limit(1);

  if (existing) {
    throw new TaxError(
      409,
      "DUPLICATE_RECORD",
      "Tax rule tax code already exists in this company."
    );
  }
}

async function ensureTaxRuleTaxPairUnique(
  companyId: string,
  ruleId: string,
  taxId: string,
  excludeId?: string
) {
  const [existing] = await db
    .select({ id: schema.taxRuleTax.id })
    .from(schema.taxRuleTax)
    .where(
      and(
        eq(schema.taxRuleTax.companyId, companyId),
        eq(schema.taxRuleTax.ruleId, ruleId),
        eq(schema.taxRuleTax.taxId, taxId),
        excludeId ? ne(schema.taxRuleTax.id, excludeId) : undefined
      )
    )
    .limit(1);

  if (existing) {
    throw new TaxError(
      409,
      "DUPLICATE_RECORD",
      "This tax is already linked to the selected tax rule."
    );
  }
}

async function ensureSnapshot(companyId: string, id: string) {
  const [record] = await db
    .select({ id: schema.documentTaxSnapshot.id })
    .from(schema.documentTaxSnapshot)
    .where(
      and(
        eq(schema.documentTaxSnapshot.id, id),
        eq(schema.documentTaxSnapshot.companyId, companyId)
      )
    )
    .limit(1);
  if (!record) {
    throw new TaxError(
      400,
      "TAX_SNAPSHOT_NOT_FOUND",
      "Document tax snapshot not found in this company."
    );
  }
}

function validateTaxRatePayload(payload: {
  rateType?: "PERCENT" | "FIXED";
  ratePercent?: number | null;
  rateAmount?: number | null;
  currencyId?: string | null;
}) {
  if (payload.rateType === "PERCENT") {
    if (payload.ratePercent === null || payload.ratePercent === undefined) {
      throw new TaxError(
        400,
        "VALIDATION_ERROR",
        "Rate percent is required for PERCENT rate type."
      );
    }
  }

  if (payload.rateType === "FIXED") {
    if (payload.rateAmount === null || payload.rateAmount === undefined) {
      throw new TaxError(
        400,
        "VALIDATION_ERROR",
        "Rate amount is required for FIXED rate type."
      );
    }
    if (!payload.currencyId) {
      throw new TaxError(
        400,
        "VALIDATION_ERROR",
        "Currency is required for FIXED rate type."
      );
    }
  }
}

export async function listTaxRecords(
  resourceInput: string,
  searchParams: URLSearchParams,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const parsed = taxListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const { companyId } = await getAccess(headers);
  const q = parsed.data.q ? `%${parsed.data.q}%` : null;
  const limit = parsed.data.limit;
  const taxId = parsed.data.taxId;
  const cacheKey = masterDataListCacheKey("tax", companyId, resource, parsed.data);

  return getOrSetMasterDataCache(cacheKey, async () => {
    switch (resource) {
      case "tax-jurisdictions":
        return db
          .select()
          .from(schema.taxJurisdiction)
          .where(
            and(
              eq(schema.taxJurisdiction.companyId, companyId),
              q
                ? or(
                    ilike(schema.taxJurisdiction.code, q),
                    ilike(schema.taxJurisdiction.name, q),
                    ilike(schema.taxJurisdiction.countryCode, q)
                  )
                : undefined
            )
          )
          .orderBy(desc(schema.taxJurisdiction.createdAt))
          .limit(limit);

      case "taxes":
        return db
          .select()
          .from(schema.tax)
          .where(
            and(
              eq(schema.tax.companyId, companyId),
              taxId ? eq(schema.tax.id, taxId) : undefined,
              q ? or(ilike(schema.tax.code, q), ilike(schema.tax.name, q)) : undefined
            )
          )
          .orderBy(desc(schema.tax.createdAt))
          .limit(limit);

      case "tax-rates":
        return db
          .select()
          .from(schema.taxRate)
          .where(
            and(
              eq(schema.taxRate.companyId, companyId),
              taxId ? eq(schema.taxRate.taxId, taxId) : undefined,
              q
                ? or(
                    ilike(schema.taxRate.code, q),
                    ilike(schema.taxRate.rateType, q),
                    ilike(schema.taxRate.taxId, q)
                  )
                : undefined
            )
          )
          .orderBy(desc(schema.taxRate.effectiveFrom), desc(schema.taxRate.createdAt))
          .limit(limit);

      case "tax-rule-sets":
        return db
          .select()
          .from(schema.taxRuleSet)
          .where(
            and(
              eq(schema.taxRuleSet.companyId, companyId),
              q
                ? or(ilike(schema.taxRuleSet.code, q), ilike(schema.taxRuleSet.name, q))
                : undefined
            )
          )
          .orderBy(desc(schema.taxRuleSet.createdAt))
          .limit(limit);

      case "tax-rules":
        return db
          .select()
          .from(schema.taxRule)
          .where(
            and(
              eq(schema.taxRule.companyId, companyId),
              q
                ? or(
                    ilike(schema.taxRule.code, q),
                    ilike(schema.taxRule.name, q),
                    ilike(schema.taxRule.serviceType, q)
                  )
                : undefined
            )
          )
          .orderBy(desc(schema.taxRule.effectiveFrom), desc(schema.taxRule.createdAt))
          .limit(limit);

      case "tax-rule-taxes":
        return db
          .select()
          .from(schema.taxRuleTax)
          .where(
            and(
              eq(schema.taxRuleTax.companyId, companyId),
              taxId ? eq(schema.taxRuleTax.taxId, taxId) : undefined,
              q
                ? or(
                    ilike(schema.taxRuleTax.code, q),
                    ilike(schema.taxRuleTax.applyOn, q),
                    ilike(schema.taxRuleTax.ruleId, q)
                  )
                : undefined
            )
          )
          .orderBy(desc(schema.taxRuleTax.createdAt))
          .limit(limit);

      case "document-fx-snapshots":
        return db
          .select()
          .from(schema.documentFxSnapshot)
          .where(
            and(
              eq(schema.documentFxSnapshot.companyId, companyId),
              q
                ? or(
                    ilike(schema.documentFxSnapshot.code, q),
                    ilike(schema.documentFxSnapshot.documentType, q),
                    ilike(schema.documentFxSnapshot.documentId, q)
                  )
                : undefined
            )
          )
          .orderBy(
            desc(schema.documentFxSnapshot.asOf),
            desc(schema.documentFxSnapshot.createdAt)
          )
          .limit(limit);

      case "document-tax-snapshots":
        return db
          .select()
          .from(schema.documentTaxSnapshot)
          .where(
            and(
              eq(schema.documentTaxSnapshot.companyId, companyId),
              q
                ? or(
                    ilike(schema.documentTaxSnapshot.code, q),
                    ilike(schema.documentTaxSnapshot.documentType, q),
                    ilike(schema.documentTaxSnapshot.documentId, q)
                  )
                : undefined
            )
          )
          .orderBy(desc(schema.documentTaxSnapshot.createdAt))
          .limit(limit);

      case "document-tax-lines":
        return db
          .select()
          .from(schema.documentTaxLine)
          .where(
            and(
              eq(schema.documentTaxLine.companyId, companyId),
              q
                ? or(
                    ilike(schema.documentTaxLine.code, q),
                    ilike(schema.documentTaxLine.taxCode, q),
                    ilike(schema.documentTaxLine.taxName, q)
                  )
                : undefined
            )
          )
          .orderBy(desc(schema.documentTaxLine.createdAt))
          .limit(limit);

      default:
        throw new TaxError(404, "RESOURCE_NOT_FOUND", "Tax resource not found.");
    }
  });
}

export async function createTaxRecord(
  resourceInput: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);
  try {
    switch (resource) {
      case "tax-jurisdictions": {
        const parsed = createTaxJurisdictionSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }
        const [created] = await db
          .insert(schema.taxJurisdiction)
          .values({ ...parsed.data, companyId })
          .returning();
        return created;
      }

      case "taxes": {
        const parsed = createTaxSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }
        const [created] = await db
          .insert(schema.tax)
          .values({ ...parsed.data, companyId })
          .returning();
        return created;
      }

      case "tax-rates": {
        const parsed = createTaxRateSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }

        validateTaxRatePayload(parsed.data);
        await ensureTax(companyId, parsed.data.taxId);
        await ensureTaxJurisdiction(companyId, parsed.data.jurisdictionId);
        if (parsed.data.currencyId) await ensureCurrency(companyId, parsed.data.currencyId);

        const [created] = await db
          .insert(schema.taxRate)
          .values({
            ...parsed.data,
            companyId,
            ratePercent: toDecimal(parsed.data.ratePercent, 4),
            rateAmount: toDecimal(parsed.data.rateAmount, 2),
            effectiveFrom: toDate(parsed.data.effectiveFrom)!,
            effectiveTo: toDate(parsed.data.effectiveTo),
          })
          .returning();
        return created;
      }

      case "tax-rule-sets": {
        const parsed = createTaxRuleSetSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }
        const [created] = await db
          .insert(schema.taxRuleSet)
          .values({ ...parsed.data, companyId })
          .returning();
        return created;
      }

      case "tax-rules": {
        const parsed = createTaxRuleSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }
        await ensureTaxJurisdiction(companyId, parsed.data.jurisdictionId);
        if (parsed.data.ruleSetId) await ensureRuleSet(companyId, parsed.data.ruleSetId);

        const [created] = await db
          .insert(schema.taxRule)
          .values({
            ...parsed.data,
            companyId,
            effectiveFrom: toDate(parsed.data.effectiveFrom)!,
            effectiveTo: toDate(parsed.data.effectiveTo),
          })
          .returning();
        return created;
      }

      case "tax-rule-taxes": {
        const parsed = createTaxRuleTaxSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }
        await ensureRule(companyId, parsed.data.ruleId);
        await ensureTax(companyId, parsed.data.taxId);
        await ensureTaxRuleTaxCodeUnique(companyId, parsed.data.code);
        await ensureTaxRuleTaxPairUnique(companyId, parsed.data.ruleId, parsed.data.taxId);

        const [created] = await db
          .insert(schema.taxRuleTax)
          .values({ ...parsed.data, companyId })
          .returning();
        return created;
      }

      case "document-fx-snapshots": {
        const parsed = createDocumentFxSnapshotSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }
        await ensureCurrency(companyId, parsed.data.baseCurrencyId);
        await ensureCurrency(companyId, parsed.data.quoteCurrencyId);
        const [created] = await db
          .insert(schema.documentFxSnapshot)
          .values({
            ...parsed.data,
            companyId,
            rate: toDecimal(parsed.data.rate, 8) ?? "0.00000000",
            asOf: toDate(parsed.data.asOf)!,
          })
          .returning();
        return created;
      }

      case "document-tax-snapshots": {
        const parsed = createDocumentTaxSnapshotSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }
        const [created] = await db
          .insert(schema.documentTaxSnapshot)
          .values({
            ...parsed.data,
            companyId,
            taxableAmount: toDecimal(parsed.data.taxableAmount, 2) ?? "0.00",
            taxAmount: toDecimal(parsed.data.taxAmount, 2) ?? "0.00",
            totalAmount: toDecimal(parsed.data.totalAmount, 2) ?? "0.00",
          })
          .returning();
        return created;
      }

      case "document-tax-lines": {
        const parsed = createDocumentTaxLineSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }
        await ensureSnapshot(companyId, parsed.data.snapshotId);
        const [created] = await db
          .insert(schema.documentTaxLine)
          .values({
            ...parsed.data,
            companyId,
            ratePercent: toDecimal(parsed.data.ratePercent, 4),
            rateAmount: toDecimal(parsed.data.rateAmount, 2),
            taxBase: toDecimal(parsed.data.taxBase, 2) ?? "0.00",
            taxAmount: toDecimal(parsed.data.taxAmount, 2) ?? "0.00",
          })
          .returning();
        return created;
      }

      default:
        throw new TaxError(404, "RESOURCE_NOT_FOUND", "Tax resource not found.");
    }
  } finally {
    await invalidateMasterDataCacheByPrefixes([masterDataCachePrefix("tax", companyId)]);
  }
}

export async function updateTaxRecord(
  resourceInput: string,
  id: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);
  try {
    switch (resource) {
      case "tax-jurisdictions": {
        const parsed = updateTaxJurisdictionSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }
        const [updated] = await db
          .update(schema.taxJurisdiction)
          .set(parsed.data)
          .where(
            and(eq(schema.taxJurisdiction.id, id), eq(schema.taxJurisdiction.companyId, companyId))
          )
          .returning();
        if (!updated) throw new TaxError(404, "RECORD_NOT_FOUND", "Tax jurisdiction not found.");
        return updated;
      }

      case "taxes": {
        const parsed = updateTaxSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }
        const [updated] = await db
          .update(schema.tax)
          .set({ ...parsed.data, updatedAt: new Date() })
          .where(and(eq(schema.tax.id, id), eq(schema.tax.companyId, companyId)))
          .returning();
        if (!updated) throw new TaxError(404, "RECORD_NOT_FOUND", "Tax not found.");
        return updated;
      }

      case "tax-rates": {
        const parsed = updateTaxRateSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }

        if (parsed.data.taxId) await ensureTax(companyId, parsed.data.taxId);
        if (parsed.data.jurisdictionId) {
          await ensureTaxJurisdiction(companyId, parsed.data.jurisdictionId);
        }
        if (parsed.data.currencyId) await ensureCurrency(companyId, parsed.data.currencyId);

        if (parsed.data.rateType) {
          validateTaxRatePayload({
            rateType: parsed.data.rateType,
            ratePercent: parsed.data.ratePercent,
            rateAmount: parsed.data.rateAmount,
            currencyId: parsed.data.currencyId,
          });
        }

        const [updated] = await db
          .update(schema.taxRate)
          .set({
            ...parsed.data,
            ratePercent:
              parsed.data.ratePercent !== undefined
                ? toDecimal(parsed.data.ratePercent, 4)
                : undefined,
            rateAmount:
              parsed.data.rateAmount !== undefined
                ? toDecimal(parsed.data.rateAmount, 2)
                : undefined,
            effectiveFrom:
              parsed.data.effectiveFrom !== undefined
                ? toDate(parsed.data.effectiveFrom) ?? undefined
                : undefined,
            effectiveTo:
              parsed.data.effectiveTo !== undefined
                ? toDate(parsed.data.effectiveTo) ?? undefined
                : undefined,
          })
          .where(and(eq(schema.taxRate.id, id), eq(schema.taxRate.companyId, companyId)))
          .returning();
        if (!updated) throw new TaxError(404, "RECORD_NOT_FOUND", "Tax rate not found.");
        return updated;
      }

      case "tax-rule-sets": {
        const parsed = updateTaxRuleSetSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }
        const [updated] = await db
          .update(schema.taxRuleSet)
          .set(parsed.data)
          .where(and(eq(schema.taxRuleSet.id, id), eq(schema.taxRuleSet.companyId, companyId)))
          .returning();
        if (!updated) throw new TaxError(404, "RECORD_NOT_FOUND", "Tax rule set not found.");
        return updated;
      }

      case "tax-rules": {
        const parsed = updateTaxRuleSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }
        if (parsed.data.jurisdictionId) {
          await ensureTaxJurisdiction(companyId, parsed.data.jurisdictionId);
        }
        if (parsed.data.ruleSetId) await ensureRuleSet(companyId, parsed.data.ruleSetId);

        const [updated] = await db
          .update(schema.taxRule)
          .set({
            ...parsed.data,
            effectiveFrom:
              parsed.data.effectiveFrom !== undefined
                ? toDate(parsed.data.effectiveFrom) ?? undefined
                : undefined,
            effectiveTo:
              parsed.data.effectiveTo !== undefined
                ? toDate(parsed.data.effectiveTo) ?? undefined
                : undefined,
          })
          .where(and(eq(schema.taxRule.id, id), eq(schema.taxRule.companyId, companyId)))
          .returning();
        if (!updated) throw new TaxError(404, "RECORD_NOT_FOUND", "Tax rule not found.");
        return updated;
      }

      case "tax-rule-taxes": {
        const parsed = updateTaxRuleTaxSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }
        const [current] = await db
          .select({
            id: schema.taxRuleTax.id,
            ruleId: schema.taxRuleTax.ruleId,
            taxId: schema.taxRuleTax.taxId,
            code: schema.taxRuleTax.code,
          })
          .from(schema.taxRuleTax)
          .where(and(eq(schema.taxRuleTax.id, id), eq(schema.taxRuleTax.companyId, companyId)))
          .limit(1);
        if (!current) throw new TaxError(404, "RECORD_NOT_FOUND", "Tax rule tax not found.");

        if (parsed.data.ruleId) await ensureRule(companyId, parsed.data.ruleId);
        if (parsed.data.taxId) await ensureTax(companyId, parsed.data.taxId);
        if (parsed.data.code !== undefined) {
          await ensureTaxRuleTaxCodeUnique(companyId, parsed.data.code, id);
        }
        const nextRuleId = parsed.data.ruleId ?? current.ruleId;
        const nextTaxId = parsed.data.taxId ?? current.taxId;
        await ensureTaxRuleTaxPairUnique(companyId, nextRuleId, nextTaxId, id);
        const [updated] = await db
          .update(schema.taxRuleTax)
          .set(parsed.data)
          .where(and(eq(schema.taxRuleTax.id, id), eq(schema.taxRuleTax.companyId, companyId)))
          .returning();
        if (!updated) throw new TaxError(404, "RECORD_NOT_FOUND", "Tax rule tax not found.");
        return updated;
      }

      case "document-fx-snapshots": {
        const parsed = updateDocumentFxSnapshotSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }
        if (parsed.data.baseCurrencyId) await ensureCurrency(companyId, parsed.data.baseCurrencyId);
        if (parsed.data.quoteCurrencyId) {
          await ensureCurrency(companyId, parsed.data.quoteCurrencyId);
        }
        const [updated] = await db
          .update(schema.documentFxSnapshot)
          .set({
            ...parsed.data,
            rate:
              parsed.data.rate !== undefined ? Number(parsed.data.rate).toFixed(8) : undefined,
            asOf:
              parsed.data.asOf !== undefined ? toDate(parsed.data.asOf) ?? undefined : undefined,
          })
          .where(
            and(
              eq(schema.documentFxSnapshot.id, id),
              eq(schema.documentFxSnapshot.companyId, companyId)
            )
          )
          .returning();
        if (!updated) throw new TaxError(404, "RECORD_NOT_FOUND", "Document FX snapshot not found.");
        return updated;
      }

      case "document-tax-snapshots": {
        const parsed = updateDocumentTaxSnapshotSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }
        const [updated] = await db
          .update(schema.documentTaxSnapshot)
          .set({
            ...parsed.data,
            taxableAmount:
              parsed.data.taxableAmount !== undefined
                ? Number(parsed.data.taxableAmount).toFixed(2)
                : undefined,
            taxAmount:
              parsed.data.taxAmount !== undefined
                ? Number(parsed.data.taxAmount).toFixed(2)
                : undefined,
            totalAmount:
              parsed.data.totalAmount !== undefined
                ? Number(parsed.data.totalAmount).toFixed(2)
                : undefined,
          })
          .where(
            and(
              eq(schema.documentTaxSnapshot.id, id),
              eq(schema.documentTaxSnapshot.companyId, companyId)
            )
          )
          .returning();
        if (!updated) {
          throw new TaxError(404, "RECORD_NOT_FOUND", "Document tax snapshot not found.");
        }
        return updated;
      }

      case "document-tax-lines": {
        const parsed = updateDocumentTaxLineSchema.safeParse(payload);
        if (!parsed.success) {
          throw new TaxError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
        }
        if (parsed.data.snapshotId) await ensureSnapshot(companyId, parsed.data.snapshotId);

        const [updated] = await db
          .update(schema.documentTaxLine)
          .set({
            ...parsed.data,
            ratePercent:
              parsed.data.ratePercent !== undefined
                ? toDecimal(parsed.data.ratePercent, 4)
                : undefined,
            rateAmount:
              parsed.data.rateAmount !== undefined
                ? toDecimal(parsed.data.rateAmount, 2)
                : undefined,
            taxBase:
              parsed.data.taxBase !== undefined
                ? Number(parsed.data.taxBase).toFixed(2)
                : undefined,
            taxAmount:
              parsed.data.taxAmount !== undefined
                ? Number(parsed.data.taxAmount).toFixed(2)
                : undefined,
          })
          .where(
            and(eq(schema.documentTaxLine.id, id), eq(schema.documentTaxLine.companyId, companyId))
          )
          .returning();
        if (!updated) throw new TaxError(404, "RECORD_NOT_FOUND", "Document tax line not found.");
        return updated;
      }

      default:
        throw new TaxError(404, "RESOURCE_NOT_FOUND", "Tax resource not found.");
    }
  } finally {
    await invalidateMasterDataCacheByPrefixes([masterDataCachePrefix("tax", companyId)]);
  }
}

export async function deleteTaxRecord(resourceInput: string, id: string, headers: Headers) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);
  try {
    switch (resource) {
      case "tax-jurisdictions": {
        const [deleted] = await db
          .delete(schema.taxJurisdiction)
          .where(
            and(eq(schema.taxJurisdiction.id, id), eq(schema.taxJurisdiction.companyId, companyId))
          )
          .returning({ id: schema.taxJurisdiction.id });
        if (!deleted) throw new TaxError(404, "RECORD_NOT_FOUND", "Tax jurisdiction not found.");
        return;
      }
      case "taxes": {
        const [deleted] = await db
          .delete(schema.tax)
          .where(and(eq(schema.tax.id, id), eq(schema.tax.companyId, companyId)))
          .returning({ id: schema.tax.id });
        if (!deleted) throw new TaxError(404, "RECORD_NOT_FOUND", "Tax not found.");
        return;
      }
      case "tax-rates": {
        const [deleted] = await db
          .delete(schema.taxRate)
          .where(and(eq(schema.taxRate.id, id), eq(schema.taxRate.companyId, companyId)))
          .returning({ id: schema.taxRate.id });
        if (!deleted) throw new TaxError(404, "RECORD_NOT_FOUND", "Tax rate not found.");
        return;
      }
      case "tax-rule-sets": {
        const [deleted] = await db
          .delete(schema.taxRuleSet)
          .where(and(eq(schema.taxRuleSet.id, id), eq(schema.taxRuleSet.companyId, companyId)))
          .returning({ id: schema.taxRuleSet.id });
        if (!deleted) throw new TaxError(404, "RECORD_NOT_FOUND", "Tax rule set not found.");
        return;
      }
      case "tax-rules": {
        const [deleted] = await db
          .delete(schema.taxRule)
          .where(and(eq(schema.taxRule.id, id), eq(schema.taxRule.companyId, companyId)))
          .returning({ id: schema.taxRule.id });
        if (!deleted) throw new TaxError(404, "RECORD_NOT_FOUND", "Tax rule not found.");
        return;
      }
      case "tax-rule-taxes": {
        const [deleted] = await db
          .delete(schema.taxRuleTax)
          .where(and(eq(schema.taxRuleTax.id, id), eq(schema.taxRuleTax.companyId, companyId)))
          .returning({ id: schema.taxRuleTax.id });
        if (!deleted) throw new TaxError(404, "RECORD_NOT_FOUND", "Tax rule tax not found.");
        return;
      }
      case "document-fx-snapshots": {
        const [deleted] = await db
          .delete(schema.documentFxSnapshot)
          .where(
            and(
              eq(schema.documentFxSnapshot.id, id),
              eq(schema.documentFxSnapshot.companyId, companyId)
            )
          )
          .returning({ id: schema.documentFxSnapshot.id });
        if (!deleted) {
          throw new TaxError(404, "RECORD_NOT_FOUND", "Document FX snapshot not found.");
        }
        return;
      }
      case "document-tax-snapshots": {
        const [deleted] = await db
          .delete(schema.documentTaxSnapshot)
          .where(
            and(
              eq(schema.documentTaxSnapshot.id, id),
              eq(schema.documentTaxSnapshot.companyId, companyId)
            )
          )
          .returning({ id: schema.documentTaxSnapshot.id });
        if (!deleted) {
          throw new TaxError(404, "RECORD_NOT_FOUND", "Document tax snapshot not found.");
        }
        return;
      }
      case "document-tax-lines": {
        const [deleted] = await db
          .delete(schema.documentTaxLine)
          .where(
            and(eq(schema.documentTaxLine.id, id), eq(schema.documentTaxLine.companyId, companyId))
          )
          .returning({ id: schema.documentTaxLine.id });
        if (!deleted) throw new TaxError(404, "RECORD_NOT_FOUND", "Document tax line not found.");
        return;
      }
      default:
        throw new TaxError(404, "RESOURCE_NOT_FOUND", "Tax resource not found.");
    }
  } finally {
    await invalidateMasterDataCacheByPrefixes([masterDataCachePrefix("tax", companyId)]);
  }
}

export function toTaxErrorResponse(error: unknown) {
  if (error instanceof TaxError) {
    return { status: error.status, body: { code: error.code, message: error.message } };
  }

  if (error && typeof error === "object") {
    const dbError = error as { code?: string; constraint?: string; detail?: string };
    if (dbError.code === "23505") {
      return {
        status: 409,
        body: {
          code: "DUPLICATE_RECORD",
          message: "Record already exists for given unique fields.",
        },
      };
    }
    if (dbError.code === "23503") {
      return {
        status: 400,
        body: {
          code: "FOREIGN_KEY_ERROR",
          message: "Invalid relation provided.",
        },
      };
    }
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
