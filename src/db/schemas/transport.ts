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

export const transportLocation = pgTable(
  "transport_location",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    country: text("country"),
    region: text("region"),
    address: text("address"),
    geo: jsonb("geo").$type<{ type: "Point"; coordinates: [number, number] } | null>(),
    tags: jsonb("tags").$type<string[] | null>(),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_transport_location_company").on(table.companyId),
    index("idx_transport_location_name").on(table.name),
    unique("uq_transport_location_company_code").on(table.companyId, table.code),
  ]
);

export const transportVehicleCategory = pgTable(
  "transport_vehicle_category",
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
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_transport_vehicle_category_company").on(table.companyId),
    unique("uq_transport_vehicle_category_company_code").on(table.companyId, table.code),
  ]
);

export const transportVehicleType = pgTable(
  "transport_vehicle_type",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => transportVehicleCategory.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    paxCapacity: integer("pax_capacity").notNull(),
    baggageCapacity: integer("baggage_capacity").notNull().default(0),
    features: jsonb("features").$type<string[] | null>(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_transport_vehicle_type_company").on(table.companyId),
    index("idx_transport_vehicle_type_category").on(table.categoryId),
    unique("uq_transport_vehicle_type_company_code").on(table.companyId, table.code),
    unique("uq_transport_vehicle_type_category_name").on(table.categoryId, table.name),
  ]
);

export const transportLocationRate = pgTable(
  "transport_location_rate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    fromLocationId: text("from_location_id")
      .notNull()
      .references(() => transportLocation.id, { onDelete: "restrict" }),
    toLocationId: text("to_location_id")
      .notNull()
      .references(() => transportLocation.id, { onDelete: "restrict" }),
    vehicleCategoryId: text("vehicle_category_id").references(
      () => transportVehicleCategory.id,
      { onDelete: "set null" }
    ),
    vehicleTypeId: text("vehicle_type_id").references(() => transportVehicleType.id, {
      onDelete: "set null",
    }),
    distanceKm: decimal("distance_km", { precision: 10, scale: 2 }),
    durationMin: integer("duration_min"),
    currency: text("currency").notNull().default("LKR"),
    pricingModel: text("pricing_model").notNull().default("FIXED"),
    fixedRate: decimal("fixed_rate", { precision: 12, scale: 2 }),
    perKmRate: decimal("per_km_rate", { precision: 12, scale: 2 }),
    slabs: jsonb("slabs").$type<Array<{ fromKm: number; toKm: number; rate: number }> | null>(),
    minCharge: decimal("min_charge", { precision: 12, scale: 2 }).notNull().default("0"),
    nightSurcharge: decimal("night_surcharge", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    effectiveFrom: timestamp("effective_from"),
    effectiveTo: timestamp("effective_to"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_transport_location_rate_company").on(table.companyId),
    index("idx_transport_location_rate_from").on(table.fromLocationId),
    index("idx_transport_location_rate_to").on(table.toLocationId),
    index("idx_transport_location_rate_category").on(table.vehicleCategoryId),
    index("idx_transport_location_rate_type").on(table.vehicleTypeId),
    unique("uq_transport_location_rate_company_code").on(table.companyId, table.code),
  ]
);

export const transportLocationExpense = pgTable(
  "transport_location_expense",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    locationId: text("location_id")
      .notNull()
      .references(() => transportLocation.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    expenseType: text("expense_type").notNull().default("FIXED"),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("LKR"),
    vehicleCategoryId: text("vehicle_category_id").references(
      () => transportVehicleCategory.id,
      { onDelete: "set null" }
    ),
    vehicleTypeId: text("vehicle_type_id").references(() => transportVehicleType.id, {
      onDelete: "set null",
    }),
    effectiveFrom: timestamp("effective_from"),
    effectiveTo: timestamp("effective_to"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_transport_location_expense_company").on(table.companyId),
    index("idx_transport_location_expense_location").on(table.locationId),
    unique("uq_transport_location_expense_company_code").on(table.companyId, table.code),
  ]
);

export const transportPaxVehicleRate = pgTable(
  "transport_pax_vehicle_rate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    fromLocationId: text("from_location_id")
      .notNull()
      .references(() => transportLocation.id, { onDelete: "restrict" }),
    toLocationId: text("to_location_id")
      .notNull()
      .references(() => transportLocation.id, { onDelete: "restrict" }),
    vehicleCategoryId: text("vehicle_category_id").references(
      () => transportVehicleCategory.id,
      { onDelete: "set null" }
    ),
    vehicleTypeId: text("vehicle_type_id").references(() => transportVehicleType.id, {
      onDelete: "set null",
    }),
    currency: text("currency").notNull().default("LKR"),
    pricingModel: text("pricing_model").notNull().default("PER_PAX"),
    perPaxRate: decimal("per_pax_rate", { precision: 12, scale: 2 }),
    tiers: jsonb("tiers").$type<Array<{ minPax: number; maxPax: number; rate: number }> | null>(),
    minCharge: decimal("min_charge", { precision: 12, scale: 2 }).notNull().default("0"),
    effectiveFrom: timestamp("effective_from"),
    effectiveTo: timestamp("effective_to"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_transport_pax_rate_company").on(table.companyId),
    index("idx_transport_pax_rate_from").on(table.fromLocationId),
    index("idx_transport_pax_rate_to").on(table.toLocationId),
    unique("uq_transport_pax_rate_company_code").on(table.companyId, table.code),
  ]
);

export const transportBaggageRate = pgTable(
  "transport_baggage_rate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    fromLocationId: text("from_location_id")
      .notNull()
      .references(() => transportLocation.id, { onDelete: "restrict" }),
    toLocationId: text("to_location_id")
      .notNull()
      .references(() => transportLocation.id, { onDelete: "restrict" }),
    vehicleCategoryId: text("vehicle_category_id").references(
      () => transportVehicleCategory.id,
      { onDelete: "set null" }
    ),
    vehicleTypeId: text("vehicle_type_id").references(() => transportVehicleType.id, {
      onDelete: "set null",
    }),
    currency: text("currency").notNull().default("LKR"),
    unit: text("unit").notNull().default("BAG"),
    pricingModel: text("pricing_model").notNull().default("PER_UNIT"),
    perUnitRate: decimal("per_unit_rate", { precision: 12, scale: 2 }),
    fixedRate: decimal("fixed_rate", { precision: 12, scale: 2 }),
    tiers: jsonb("tiers").$type<Array<{ minQty: number; maxQty: number; rate: number }> | null>(),
    minCharge: decimal("min_charge", { precision: 12, scale: 2 }).notNull().default("0"),
    effectiveFrom: timestamp("effective_from"),
    effectiveTo: timestamp("effective_to"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_transport_baggage_rate_company").on(table.companyId),
    index("idx_transport_baggage_rate_from").on(table.fromLocationId),
    index("idx_transport_baggage_rate_to").on(table.toLocationId),
    unique("uq_transport_baggage_rate_company_code").on(table.companyId, table.code),
  ]
);

