import {
  boolean,
  decimal,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { company } from "@/db/schemas/company";
import { user } from "@/db/schemas/user";

export const businessOrganization = pgTable(
  "business_organization",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    type: text("type").notNull(),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    registrationNo: text("registration_no"),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    country: text("country"),
    city: text("city"),
    address: text("address"),
    baseCurrency: text("base_currency").notNull().default("LKR"),
    timezone: text("timezone").notNull().default("Asia/Colombo"),
    isActive: boolean("is_active").notNull().default(true),
    isVerified: boolean("is_verified").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_business_org_company").on(table.companyId),
    index("idx_business_org_type").on(table.type),
    index("idx_business_org_name").on(table.name),
    unique("uq_business_org_company_code").on(table.companyId, table.code),
  ]
);

export const businessOperatorProfile = pgTable(
  "business_operator_profile",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => businessOrganization.id, { onDelete: "cascade" }),
    operatorKind: text("operator_kind").notNull().default("DMC"),
    serviceRegions: jsonb("service_regions").$type<string[] | null>(),
    languages: jsonb("languages").$type<string[] | null>(),
    bookingMode: text("booking_mode").notNull().default("ON_REQUEST"),
    leadTimeHours: decimal("lead_time_hours", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    payoutMode: text("payout_mode").notNull().default("POST_TRAVEL"),
    payoutCycle: text("payout_cycle").notNull().default("MONTHLY"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_business_operator_profile_company").on(table.companyId),
    index("idx_business_operator_profile_org").on(table.organizationId),
    unique("uq_business_operator_profile_company_code").on(table.companyId, table.code),
    unique("uq_business_operator_profile_org").on(table.organizationId),
  ]
);

export const businessMarketProfile = pgTable(
  "business_market_profile",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => businessOrganization.id, { onDelete: "cascade" }),
    agencyType: text("agency_type").notNull().default("TRAVEL_AGENT"),
    licenseNo: text("license_no"),
    preferredCurrency: text("preferred_currency"),
    creditEnabled: boolean("credit_enabled").notNull().default(false),
    creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }),
    paymentTermDays: decimal("payment_term_days", { precision: 5, scale: 0 }),
    defaultMarkupPercent: decimal("default_markup_percent", {
      precision: 6,
      scale: 2,
    }).default("0"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_business_market_profile_company").on(table.companyId),
    index("idx_business_market_profile_org").on(table.organizationId),
    unique("uq_business_market_profile_company_code").on(table.companyId, table.code),
    unique("uq_business_market_profile_org").on(table.organizationId),
  ]
);

export const businessOrgMember = pgTable(
  "business_org_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => businessOrganization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_business_org_member_company").on(table.companyId),
    index("idx_business_org_member_org").on(table.organizationId),
    index("idx_business_org_member_user").on(table.userId),
    unique("uq_business_org_member_company_code").on(table.companyId, table.code),
    unique("uq_business_org_member_org_user").on(table.organizationId, table.userId),
  ]
);

export const businessOperatorMarketContract = pgTable(
  "business_operator_market_contract",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    operatorOrgId: text("operator_org_id")
      .notNull()
      .references(() => businessOrganization.id, { onDelete: "cascade" }),
    marketOrgId: text("market_org_id")
      .notNull()
      .references(() => businessOrganization.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("ACTIVE"),
    pricingMode: text("pricing_mode").notNull().default("MARKUP"),
    defaultMarkupPercent: decimal("default_markup_percent", {
      precision: 6,
      scale: 2,
    }).default("0"),
    defaultCommissionPercent: decimal("default_commission_percent", {
      precision: 6,
      scale: 2,
    }).default("0"),
    creditEnabled: boolean("credit_enabled").notNull().default(false),
    creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }),
    paymentTermDays: decimal("payment_term_days", { precision: 5, scale: 0 }),
    effectiveFrom: timestamp("effective_from"),
    effectiveTo: timestamp("effective_to"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_business_contract_company").on(table.companyId),
    index("idx_business_contract_operator").on(table.operatorOrgId),
    index("idx_business_contract_market").on(table.marketOrgId),
    index("idx_business_contract_status").on(table.status),
    unique("uq_business_contract_company_code").on(table.companyId, table.code),
    unique("uq_business_contract_operator_market").on(table.operatorOrgId, table.marketOrgId),
  ]
);
