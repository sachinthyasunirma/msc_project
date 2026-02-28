import {
  boolean,
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { company } from "@/db/schemas/company";
import { currency } from "@/db/schemas/currency";

export const taxJurisdiction = pgTable(
  "tax_jurisdiction",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    countryCode: text("country_code").notNull(),
    region: text("region"),
    city: text("city"),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_tax_jurisdiction_company_code").on(table.companyId, table.code),
    index("idx_tax_jurisdiction_company").on(table.companyId),
    index("idx_tax_jurisdiction_country").on(table.countryCode),
  ]
);

export const tax = pgTable(
  "tax",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    taxType: text("tax_type").notNull(),
    scope: text("scope").notNull().default("OUTPUT"),
    isRecoverable: boolean("is_recoverable").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_tax_company_code").on(table.companyId, table.code),
    index("idx_tax_company").on(table.companyId),
    index("idx_tax_type").on(table.taxType),
    index("idx_tax_scope").on(table.scope),
  ]
);

export const taxRate = pgTable(
  "tax_rate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    taxId: text("tax_id")
      .notNull()
      .references(() => tax.id, { onDelete: "restrict" }),
    jurisdictionId: text("jurisdiction_id")
      .notNull()
      .references(() => taxJurisdiction.id, { onDelete: "restrict" }),
    rateType: text("rate_type").notNull().default("PERCENT"),
    ratePercent: decimal("rate_percent", { precision: 7, scale: 4 }),
    rateAmount: decimal("rate_amount", { precision: 12, scale: 2 }),
    currencyId: text("currency_id").references(() => currency.id, { onDelete: "restrict" }),
    effectiveFrom: timestamp("effective_from").notNull(),
    effectiveTo: timestamp("effective_to"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_tax_rate_company_code").on(table.companyId, table.code),
    unique("uq_tax_rate_tax_jur_effective").on(table.taxId, table.jurisdictionId, table.effectiveFrom),
    index("idx_tax_rate_company").on(table.companyId),
    index("idx_tax_rate_tax").on(table.taxId),
    index("idx_tax_rate_jurisdiction").on(table.jurisdictionId),
    index("idx_tax_rate_effective").on(table.effectiveFrom, table.effectiveTo),
  ]
);

export const taxRuleSet = pgTable(
  "tax_rule_set",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_tax_rule_set_company_code").on(table.companyId, table.code),
    index("idx_tax_rule_set_company").on(table.companyId),
  ]
);

export const taxRule = pgTable(
  "tax_rule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    ruleSetId: text("rule_set_id").references(() => taxRuleSet.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    jurisdictionId: text("jurisdiction_id")
      .notNull()
      .references(() => taxJurisdiction.id, { onDelete: "restrict" }),
    serviceType: text("service_type").notNull(),
    customerType: text("customer_type").notNull().default("B2C"),
    travelerResidency: text("traveler_residency").notNull().default("ANY"),
    taxInclusion: text("tax_inclusion").notNull().default("INHERIT"),
    effectiveFrom: timestamp("effective_from").notNull(),
    effectiveTo: timestamp("effective_to"),
    priority: integer("priority").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_tax_rule_company_code").on(table.companyId, table.code),
    index("idx_tax_rule_company").on(table.companyId),
    index("idx_tax_rule_match").on(
      table.jurisdictionId,
      table.serviceType,
      table.customerType,
      table.travelerResidency,
      table.effectiveFrom,
      table.effectiveTo
    ),
    index("idx_tax_rule_effective").on(table.effectiveFrom, table.effectiveTo),
  ]
);

export const taxRuleTax = pgTable(
  "tax_rule_tax",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    ruleId: text("rule_id")
      .notNull()
      .references(() => taxRule.id, { onDelete: "cascade" }),
    taxId: text("tax_id")
      .notNull()
      .references(() => tax.id, { onDelete: "restrict" }),
    priority: integer("priority").notNull().default(1),
    applyOn: text("apply_on").notNull().default("BASE"),
    isInclusive: boolean("is_inclusive").notNull().default(false),
    roundingMode: text("rounding_mode").notNull().default("HALF_UP"),
    roundingScale: integer("rounding_scale").notNull().default(2),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_tax_rule_tax_company_code").on(table.companyId, table.code),
    unique("uq_tax_rule_tax_rule_tax").on(table.ruleId, table.taxId),
    index("idx_tax_rule_tax_company").on(table.companyId),
    index("idx_tax_rule_tax_rule").on(table.ruleId),
  ]
);

export const documentFxSnapshot = pgTable(
  "document_fx_snapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    documentType: text("document_type").notNull(),
    documentId: text("document_id").notNull(),
    baseCurrencyId: text("base_currency_id")
      .notNull()
      .references(() => currency.id, { onDelete: "restrict" }),
    quoteCurrencyId: text("quote_currency_id")
      .notNull()
      .references(() => currency.id, { onDelete: "restrict" }),
    rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
    asOf: timestamp("as_of").notNull(),
    providerCode: text("provider_code"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_document_fx_snapshot_company_code").on(table.companyId, table.code),
    index("idx_document_fx_snapshot_company").on(table.companyId),
    index("idx_document_fx_snapshot_doc").on(table.documentType, table.documentId),
  ]
);

export const documentTaxSnapshot = pgTable(
  "document_tax_snapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    documentType: text("document_type").notNull(),
    documentId: text("document_id").notNull(),
    jurisdictionCode: text("jurisdiction_code").notNull(),
    priceMode: text("price_mode").notNull(),
    currencyCode: text("currency_code").notNull(),
    taxableAmount: decimal("taxable_amount", { precision: 12, scale: 2 }).notNull(),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull(),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_document_tax_snapshot_company_code").on(table.companyId, table.code),
    index("idx_document_tax_snapshot_company").on(table.companyId),
    index("idx_document_tax_snapshot_doc").on(table.documentType, table.documentId),
  ]
);

export const documentTaxLine = pgTable(
  "document_tax_line",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    snapshotId: text("snapshot_id")
      .notNull()
      .references(() => documentTaxSnapshot.id, { onDelete: "cascade" }),
    taxCode: text("tax_code").notNull(),
    taxName: text("tax_name").notNull(),
    rateType: text("rate_type").notNull(),
    ratePercent: decimal("rate_percent", { precision: 7, scale: 4 }),
    rateAmount: decimal("rate_amount", { precision: 12, scale: 2 }),
    applyOn: text("apply_on").notNull(),
    priority: integer("priority").notNull(),
    taxBase: decimal("tax_base", { precision: 12, scale: 2 }).notNull(),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_document_tax_line_company_code").on(table.companyId, table.code),
    index("idx_document_tax_line_company").on(table.companyId),
    index("idx_document_tax_line_snapshot").on(table.snapshotId),
  ]
);
