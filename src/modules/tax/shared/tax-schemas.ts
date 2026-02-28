import { z } from "zod";

export const taxResourceSchema = z.enum([
  "tax-jurisdictions",
  "taxes",
  "tax-rates",
  "tax-rule-sets",
  "tax-rules",
  "tax-rule-taxes",
  "document-fx-snapshots",
  "document-tax-snapshots",
  "document-tax-lines",
]);

export const taxListQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  taxId: z.string().trim().min(1).optional(),
});

const baseCodeSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(80),
});

export const createTaxJurisdictionSchema = baseCodeSchema.extend({
  countryCode: z.string().trim().toUpperCase().min(2).max(2),
  region: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  name: z.string().trim().min(2).max(160),
  isActive: z.boolean().default(true),
});

export const updateTaxJurisdictionSchema = createTaxJurisdictionSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one tax jurisdiction field is required.",
  });

export const createTaxSchema = baseCodeSchema.extend({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).optional().nullable(),
  taxType: z
    .enum(["VAT", "LEVY", "SERVICE_CHARGE", "CITY_TAX", "WITHHOLDING", "OTHER"])
    .default("VAT"),
  scope: z.enum(["OUTPUT", "INPUT", "WITHHOLDING"]).default("OUTPUT"),
  isRecoverable: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateTaxSchema = createTaxSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one tax field is required.",
  }
);

export const createTaxRateSchema = baseCodeSchema.extend({
  taxId: z.string().min(1),
  jurisdictionId: z.string().min(1),
  rateType: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  ratePercent: z.coerce.number().min(0).max(999.9999).optional().nullable(),
  rateAmount: z.coerce.number().min(0).max(999999999).optional().nullable(),
  currencyId: z.string().min(1).optional().nullable(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateTaxRateSchema = createTaxRateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one tax rate field is required.",
  }
);

export const createTaxRuleSetSchema = baseCodeSchema.extend({
  name: z.string().trim().min(2).max(160),
  isActive: z.boolean().default(true),
});

export const updateTaxRuleSetSchema = createTaxRuleSetSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one tax rule set field is required.",
  }
);

export const createTaxRuleSchema = baseCodeSchema.extend({
  ruleSetId: z.string().min(1).optional().nullable(),
  name: z.string().trim().min(2).max(200),
  jurisdictionId: z.string().min(1),
  serviceType: z
    .enum(["TRANSPORT", "ACTIVITY", "HOTEL", "PACKAGE", "MISC", "SUPPLEMENT"])
    .default("MISC"),
  customerType: z.enum(["B2C", "B2B"]).default("B2C"),
  travelerResidency: z.enum(["LOCAL", "FOREIGNER", "ANY"]).default("ANY"),
  taxInclusion: z.enum(["INHERIT", "INCLUSIVE", "EXCLUSIVE"]).default("INHERIT"),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional().nullable(),
  priority: z.coerce.number().int().min(1).max(999).default(1),
  isActive: z.boolean().default(true),
});

export const updateTaxRuleSchema = createTaxRuleSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one tax rule field is required.",
  }
);

export const createTaxRuleTaxSchema = baseCodeSchema.extend({
  ruleId: z.string().min(1),
  taxId: z.string().min(1),
  priority: z.coerce.number().int().min(1).max(999).default(1),
  applyOn: z.enum(["BASE", "BASE_PLUS_PREVIOUS_TAXES"]).default("BASE"),
  isInclusive: z.boolean().default(false),
  roundingMode: z
    .enum(["HALF_UP", "HALF_DOWN", "UP", "DOWN", "BANKERS"])
    .default("HALF_UP"),
  roundingScale: z.coerce.number().int().min(0).max(8).default(2),
  isActive: z.boolean().default(true),
});

export const updateTaxRuleTaxSchema = createTaxRuleTaxSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one tax rule tax field is required.",
  }
);

export const createDocumentFxSnapshotSchema = baseCodeSchema.extend({
  documentType: z.enum(["QUOTATION", "BOOKING", "INVOICE"]),
  documentId: z.string().min(1),
  baseCurrencyId: z.string().min(1),
  quoteCurrencyId: z.string().min(1),
  rate: z.coerce.number().gt(0).max(999999999),
  asOf: z.string().datetime(),
  providerCode: z.string().trim().max(80).optional().nullable(),
});

export const updateDocumentFxSnapshotSchema = createDocumentFxSnapshotSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one FX snapshot field is required.",
  });

export const createDocumentTaxSnapshotSchema = baseCodeSchema.extend({
  documentType: z.enum(["QUOTATION", "BOOKING", "INVOICE"]),
  documentId: z.string().min(1),
  jurisdictionCode: z.string().trim().toUpperCase().min(1).max(80),
  priceMode: z.enum(["INCLUSIVE", "EXCLUSIVE"]),
  currencyCode: z.string().trim().toUpperCase().min(1).max(10),
  taxableAmount: z.coerce.number().min(0).max(999999999),
  taxAmount: z.coerce.number().min(0).max(999999999),
  totalAmount: z.coerce.number().min(0).max(999999999),
});

export const updateDocumentTaxSnapshotSchema = createDocumentTaxSnapshotSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one tax snapshot field is required.",
  });

export const createDocumentTaxLineSchema = baseCodeSchema.extend({
  snapshotId: z.string().min(1),
  taxCode: z.string().trim().toUpperCase().min(1).max(80),
  taxName: z.string().trim().min(2).max(200),
  rateType: z.enum(["PERCENT", "FIXED"]),
  ratePercent: z.coerce.number().min(0).max(999.9999).optional().nullable(),
  rateAmount: z.coerce.number().min(0).max(999999999).optional().nullable(),
  applyOn: z.enum(["BASE", "BASE_PLUS_PREVIOUS_TAXES"]),
  priority: z.coerce.number().int().min(1).max(999),
  taxBase: z.coerce.number().min(0).max(999999999),
  taxAmount: z.coerce.number().min(0).max(999999999),
});

export const updateDocumentTaxLineSchema = createDocumentTaxLineSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one tax line field is required.",
  }
);
