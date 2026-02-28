import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { company } from "@/db/schemas/company";
import { currency } from "@/db/schemas/currency";
import { transportLocation } from "@/db/schemas/transport";

export const guide = pgTable(
  "guide",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    guideType: text("guide_type").notNull().default("INDIVIDUAL"),
    fullName: text("full_name").notNull(),
    displayName: text("display_name"),
    gender: text("gender"),
    dob: timestamp("dob"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    countryCode: text("country_code"),
    city: text("city"),
    emergencyContact: jsonb("emergency_contact").$type<
      { name: string; phone: string; relation?: string } | null
    >(),
    bio: text("bio"),
    yearsExperience: integer("years_experience").notNull().default(0),
    rating: decimal("rating", { precision: 3, scale: 2 }),
    baseCurrencyId: text("base_currency_id").references(() => currency.id, {
      onDelete: "set null",
    }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_guide_company_code").on(table.companyId, table.code),
    index("idx_guide_company").on(table.companyId),
    index("idx_guide_name").on(table.fullName),
    index("idx_guide_email").on(table.email),
    index("idx_guide_active").on(table.isActive),
  ]
);

export const guideLanguageMaster = pgTable(
  "guide_language_master",
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
    unique("uq_guide_language_master_company_code").on(table.companyId, table.code),
    index("idx_guide_language_master_company").on(table.companyId),
  ]
);

export const guideLanguage = pgTable(
  "guide_language",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    guideId: text("guide_id")
      .notNull()
      .references(() => guide.id, { onDelete: "cascade" }),
    languageId: text("language_id")
      .notNull()
      .references(() => guideLanguageMaster.id, { onDelete: "restrict" }),
    proficiency: text("proficiency").notNull().default("BASIC"),
  },
  (table) => [
    unique("uq_guide_language_company_code").on(table.companyId, table.code),
    unique("uq_guide_language_guide_language").on(table.guideId, table.languageId),
    index("idx_guide_language_company").on(table.companyId),
    index("idx_guide_language_guide").on(table.guideId),
  ]
);

export const guideCoverageArea = pgTable(
  "guide_coverage_area",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    guideId: text("guide_id")
      .notNull()
      .references(() => guide.id, { onDelete: "cascade" }),
    locationId: text("location_id")
      .notNull()
      .references(() => transportLocation.id, { onDelete: "restrict" }),
    coverageType: text("coverage_type").notNull().default("REGION"),
  },
  (table) => [
    unique("uq_guide_coverage_area_company_code").on(table.companyId, table.code),
    unique("uq_guide_coverage_area_guide_location_type").on(
      table.guideId,
      table.locationId,
      table.coverageType
    ),
    index("idx_guide_coverage_area_company").on(table.companyId),
  ]
);

export const guideLicense = pgTable(
  "guide_license",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    guideId: text("guide_id")
      .notNull()
      .references(() => guide.id, { onDelete: "cascade" }),
    licenseType: text("license_type").notNull(),
    licenseNumber: text("license_number").notNull(),
    issuedBy: text("issued_by"),
    issuedAt: timestamp("issued_at"),
    expiresAt: timestamp("expires_at"),
    isVerified: boolean("is_verified").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_guide_license_company_code").on(table.companyId, table.code),
    index("idx_guide_license_company").on(table.companyId),
    index("idx_guide_license_guide").on(table.guideId),
  ]
);

export const guideCertification = pgTable(
  "guide_certification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    guideId: text("guide_id")
      .notNull()
      .references(() => guide.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    provider: text("provider"),
    issuedAt: timestamp("issued_at"),
    expiresAt: timestamp("expires_at"),
    certificateNo: text("certificate_no"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_guide_certification_company_code").on(table.companyId, table.code),
    index("idx_guide_certification_company").on(table.companyId),
    index("idx_guide_certification_guide").on(table.guideId),
  ]
);

export const guideDocument = pgTable(
  "guide_document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    guideId: text("guide_id")
      .notNull()
      .references(() => guide.id, { onDelete: "cascade" }),
    docType: text("doc_type").notNull(),
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_guide_document_company_code").on(table.companyId, table.code),
    index("idx_guide_document_company").on(table.companyId),
    index("idx_guide_document_guide").on(table.guideId),
  ]
);

export const guideWeeklyAvailability = pgTable(
  "guide_weekly_availability",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    guideId: text("guide_id")
      .notNull()
      .references(() => guide.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    startTime: text("start_time"),
    endTime: text("end_time"),
    isAvailable: boolean("is_available").notNull().default(true),
  },
  (table) => [
    unique("uq_guide_weekly_availability_company_code").on(table.companyId, table.code),
    unique("uq_guide_weekly_availability_guide_weekday").on(table.guideId, table.weekday),
    index("idx_guide_weekly_availability_company").on(table.companyId),
  ]
);

export const guideBlackoutDate = pgTable(
  "guide_blackout_date",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    guideId: text("guide_id")
      .notNull()
      .references(() => guide.id, { onDelete: "cascade" }),
    startAt: timestamp("start_at").notNull(),
    endAt: timestamp("end_at").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_guide_blackout_date_company_code").on(table.companyId, table.code),
    index("idx_guide_blackout_date_company").on(table.companyId),
    index("idx_guide_blackout_date_guide").on(table.guideId),
    index("idx_guide_blackout_date_range").on(table.startAt, table.endAt),
  ]
);

export const guideRate = pgTable(
  "guide_rate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    guideId: text("guide_id")
      .notNull()
      .references(() => guide.id, { onDelete: "cascade" }),
    locationId: text("location_id").references(() => transportLocation.id, {
      onDelete: "set null",
    }),
    rateName: text("rate_name").notNull(),
    pricingModel: text("pricing_model").notNull(),
    currencyId: text("currency_id")
      .notNull()
      .references(() => currency.id, { onDelete: "restrict" }),
    fixedRate: decimal("fixed_rate", { precision: 12, scale: 2 }),
    perHourRate: decimal("per_hour_rate", { precision: 12, scale: 2 }),
    perPaxRate: decimal("per_pax_rate", { precision: 12, scale: 2 }),
    paxTiers: jsonb("pax_tiers").$type<Array<{ min: number; max: number; rate: number }> | null>(),
    minCharge: decimal("min_charge", { precision: 12, scale: 2 }).notNull().default("0"),
    overtimeAfterHours: decimal("overtime_after_hours", { precision: 5, scale: 2 }),
    overtimePerHourRate: decimal("overtime_per_hour_rate", { precision: 12, scale: 2 }),
    nightAllowance: decimal("night_allowance", { precision: 12, scale: 2 }),
    perDiem: decimal("per_diem", { precision: 12, scale: 2 }),
    effectiveFrom: timestamp("effective_from").notNull(),
    effectiveTo: timestamp("effective_to"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_guide_rate_company_code").on(table.companyId, table.code),
    index("idx_guide_rate_company").on(table.companyId),
    index("idx_guide_rate_guide").on(table.guideId),
    index("idx_guide_rate_location").on(table.locationId),
    index("idx_guide_rate_effective").on(table.effectiveFrom, table.effectiveTo),
  ]
);

export const guideAssignment = pgTable(
  "guide_assignment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    bookingId: text("booking_id").notNull(),
    guideId: text("guide_id")
      .notNull()
      .references(() => guide.id, { onDelete: "restrict" }),
    serviceType: text("service_type").notNull().default("DAY"),
    serviceId: text("service_id"),
    startAt: timestamp("start_at").notNull(),
    endAt: timestamp("end_at").notNull(),
    status: text("status").notNull().default("ASSIGNED"),
    currencyCode: text("currency_code").notNull(),
    baseAmount: decimal("base_amount", { precision: 12, scale: 2 }).notNull(),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    rateSnapshot: jsonb("rate_snapshot").$type<Record<string, unknown> | null>(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_guide_assignment_company_code").on(table.companyId, table.code),
    index("idx_guide_assignment_company").on(table.companyId),
    index("idx_guide_assignment_booking").on(table.bookingId),
    index("idx_guide_assignment_guide").on(table.guideId),
    index("idx_guide_assignment_range").on(table.startAt, table.endAt),
  ]
);
