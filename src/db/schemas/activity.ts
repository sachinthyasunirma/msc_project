import {
  boolean,
  index,
  integer,
  jsonb,
  decimal,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { company } from "@/db/schemas/company";
import { transportLocation } from "@/db/schemas/transport";

export const activityType = pgTable(
  "activity_type",
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
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_activity_type_company_code").on(table.companyId, table.code),
    index("idx_activity_type_company").on(table.companyId),
    index("idx_activity_type_name").on(table.name),
  ]
);

export const activity = pgTable(
  "activity",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    locationId: text("location_id")
      .notNull()
      .references(() => transportLocation.id, { onDelete: "restrict" }),
    locationRole: text("location_role").notNull().default("ACTIVITY_LOCATION"),
    code: text("code").notNull(),
    name: text("name").notNull(),
    shortDescription: text("short_description"),
    description: text("description"),
    durationMin: integer("duration_min"),
    minPax: integer("min_pax").notNull().default(1),
    maxPax: integer("max_pax"),
    minAge: integer("min_age"),
    maxAge: integer("max_age"),
    inclusions: jsonb("inclusions").$type<string[] | null>(),
    exclusions: jsonb("exclusions").$type<string[] | null>(),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_activity_company_code").on(table.companyId, table.code),
    index("idx_activity_company").on(table.companyId),
    index("idx_activity_type").on(table.type),
    index("idx_activity_location").on(table.locationId),
    index("idx_activity_name").on(table.name),
  ]
);

export const activityLocation = pgTable(
  "activity_location",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    activityId: text("activity_id")
      .notNull()
      .references(() => activity.id, { onDelete: "cascade" }),
    locationId: text("location_id")
      .notNull()
      .references(() => transportLocation.id, { onDelete: "restrict" }),
    role: text("role").notNull().default("ACTIVITY_LOCATION"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_activity_location_company_code").on(table.companyId, table.code),
    unique("uq_activity_location_activity_location_role").on(
      table.activityId,
      table.locationId,
      table.role
    ),
    index("idx_activity_location_company").on(table.companyId),
    index("idx_activity_location_activity").on(table.activityId),
    index("idx_activity_location_location").on(table.locationId),
  ]
);

export const activityImage = pgTable(
  "activity_image",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    activityId: text("activity_id")
      .notNull()
      .references(() => activity.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: text("alt_text"),
    isCover: boolean("is_cover").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_activity_image_company_code").on(table.companyId, table.code),
    index("idx_activity_image_company").on(table.companyId),
    index("idx_activity_image_activity").on(table.activityId),
  ]
);

export const activityAvailability = pgTable(
  "activity_availability",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    activityId: text("activity_id")
      .notNull()
      .references(() => activity.id, { onDelete: "cascade" }),
    effectiveFrom: timestamp("effective_from"),
    effectiveTo: timestamp("effective_to"),
    weekdays: jsonb("weekdays").$type<number[] | null>(),
    startTime: text("start_time"),
    endTime: text("end_time"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_activity_availability_company_code").on(table.companyId, table.code),
    index("idx_activity_availability_company").on(table.companyId),
    index("idx_activity_availability_activity").on(table.activityId),
    index("idx_activity_availability_effective").on(table.effectiveFrom, table.effectiveTo),
  ]
);

export const activityRate = pgTable(
  "activity_rate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    activityId: text("activity_id")
      .notNull()
      .references(() => activity.id, { onDelete: "cascade" }),
    label: text("label"),
    currency: text("currency").notNull().default("LKR"),
    pricingModel: text("pricing_model").notNull().default("FIXED"),
    fixedRate: decimal("fixed_rate", { precision: 12, scale: 2 }),
    perPaxRate: decimal("per_pax_rate", { precision: 12, scale: 2 }),
    perHourRate: decimal("per_hour_rate", { precision: 12, scale: 2 }),
    perUnitRate: decimal("per_unit_rate", { precision: 12, scale: 2 }),
    paxTiers: jsonb("pax_tiers").$type<Array<{ min: number; max: number; rate: number }> | null>(),
    minCharge: decimal("min_charge", { precision: 12, scale: 2 }).notNull().default("0"),
    effectiveFrom: timestamp("effective_from"),
    effectiveTo: timestamp("effective_to"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_activity_rate_company_code").on(table.companyId, table.code),
    index("idx_activity_rate_company").on(table.companyId),
    index("idx_activity_rate_activity").on(table.activityId),
    index("idx_activity_rate_model").on(table.pricingModel),
    index("idx_activity_rate_effective").on(table.effectiveFrom, table.effectiveTo),
  ]
);

export const activitySupplement = pgTable(
  "activity_supplement",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    parentActivityId: text("parent_activity_id")
      .notNull()
      .references(() => activity.id, { onDelete: "cascade" }),
    supplementActivityId: text("supplement_activity_id")
      .notNull()
      .references(() => activity.id, { onDelete: "restrict" }),
    isRequired: boolean("is_required").notNull().default(false),
    minQty: integer("min_qty").notNull().default(0),
    maxQty: integer("max_qty"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_activity_supplement_company_code").on(table.companyId, table.code),
    unique("uq_activity_supplement_parent_supplement").on(
      table.parentActivityId,
      table.supplementActivityId
    ),
    index("idx_activity_supplement_company").on(table.companyId),
    index("idx_activity_supplement_parent").on(table.parentActivityId),
  ]
);
