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
import { businessOrganization } from "@/db/schemas/business-network";
import { company } from "@/db/schemas/company";

export const preTourPlan = pgTable(
  "pre_tour_plan",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    customerId: text("customer_id"),
    agentId: text("agent_id"),
    leadId: text("lead_id"),
    operatorOrgId: text("operator_org_id").references(() => businessOrganization.id, {
      onDelete: "set null",
    }),
    marketOrgId: text("market_org_id").references(() => businessOrganization.id, {
      onDelete: "set null",
    }),
    referenceNo: text("reference_no").notNull(),
    planCode: text("plan_code").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("DRAFT"),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    totalNights: integer("total_nights").notNull(),
    adults: integer("adults").notNull().default(1),
    children: integer("children").notNull().default(0),
    infants: integer("infants").notNull().default(0),
    preferredLanguage: text("preferred_language"),
    roomPreference: text("room_preference"),
    mealPreference: text("meal_preference"),
    notes: text("notes"),
    currencyCode: text("currency_code").notNull(),
    baseCurrencyCode: text("base_currency_code").notNull().default("USD"),
    exchangeRateMode: text("exchange_rate_mode").notNull().default("AUTO"),
    exchangeRate: decimal("exchange_rate", { precision: 18, scale: 8 })
      .notNull()
      .default("0"),
    exchangeRateDate: timestamp("exchange_rate_date"),
    priceMode: text("price_mode").notNull().default("EXCLUSIVE"),
    pricingPolicy: jsonb("pricing_policy").$type<{
      mode?: "NONE" | "PERCENT" | "FIXED";
      value?: number;
      applyTo?: Array<
        "ACTIVITY" | "TRANSPORT" | "ACCOMMODATION" | "GUIDE" | "MISC" | "SUPPLEMENT"
      >;
    } | null>(),
    baseTotal: decimal("base_total", { precision: 14, scale: 2 }).notNull().default("0"),
    taxTotal: decimal("tax_total", { precision: 14, scale: 2 }).notNull().default("0"),
    grandTotal: decimal("grand_total", { precision: 14, scale: 2 }).notNull().default("0"),
    version: integer("version").notNull().default(1),
    isLocked: boolean("is_locked").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_pre_tour_plan_company_code").on(table.companyId, table.code),
    unique("uq_pre_tour_plan_company_plan_code").on(table.companyId, table.planCode),
    unique("uq_pre_tour_plan_company_reference_version").on(
      table.companyId,
      table.referenceNo,
      table.version
    ),
    index("idx_pre_tour_plan_company").on(table.companyId),
    index("idx_pre_tour_plan_reference_no").on(table.referenceNo),
    index("idx_pre_tour_plan_operator_org").on(table.operatorOrgId),
    index("idx_pre_tour_plan_market_org").on(table.marketOrgId),
    index("idx_pre_tour_plan_status").on(table.status),
    index("idx_pre_tour_plan_date_range").on(table.startDate, table.endDate),
  ]
);

export const preTourPlanDay = pgTable(
  "pre_tour_plan_day",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    planId: text("plan_id")
      .notNull()
      .references(() => preTourPlan.id, { onDelete: "cascade" }),
    dayNumber: integer("day_number").notNull(),
    date: timestamp("date").notNull(),
    title: text("title"),
    notes: text("notes"),
    startLocationId: text("start_location_id"),
    endLocationId: text("end_location_id"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_pre_tour_plan_day_company_code").on(table.companyId, table.code),
    unique("uq_pre_tour_plan_day_plan_day_number").on(table.planId, table.dayNumber),
    index("idx_pre_tour_plan_day_company").on(table.companyId),
    index("idx_pre_tour_plan_day_plan").on(table.planId),
    index("idx_pre_tour_plan_day_date").on(table.date),
  ]
);

export const preTourPlanItem = pgTable(
  "pre_tour_plan_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    planId: text("plan_id")
      .notNull()
      .references(() => preTourPlan.id, { onDelete: "cascade" }),
    dayId: text("day_id")
      .notNull()
      .references(() => preTourPlanDay.id, { onDelete: "cascade" }),
    itemType: text("item_type").notNull(),
    serviceId: text("service_id"),
    startAt: timestamp("start_at"),
    endAt: timestamp("end_at"),
    sortOrder: integer("sort_order").notNull().default(0),
    pax: integer("pax"),
    units: decimal("units", { precision: 10, scale: 2 }),
    nights: integer("nights"),
    rooms: jsonb("rooms").$type<
      Array<{ roomType: string; count: number; adults?: number; children?: number }> | null
    >(),
    fromLocationId: text("from_location_id"),
    toLocationId: text("to_location_id"),
    locationId: text("location_id"),
    rateId: text("rate_id"),
    currencyCode: text("currency_code").notNull(),
    priceMode: text("price_mode").notNull().default("EXCLUSIVE"),
    baseAmount: decimal("base_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    pricingSnapshot: jsonb("pricing_snapshot").$type<{
      rateLabel?: string;
      calcModel?: string;
      inputs?: Record<string, unknown>;
      taxLines?: Array<{ taxCode: string; rateType: string; rate: number; amount: number }>;
      fx?: { base: string; quote: string; rate: number; asOf: string };
      supplier?: { supplierId?: string; name?: string };
    } | null>(),
    title: text("title"),
    description: text("description"),
    notes: text("notes"),
    status: text("status").notNull().default("PLANNED"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_pre_tour_plan_item_company_code").on(table.companyId, table.code),
    index("idx_pre_tour_plan_item_company").on(table.companyId),
    index("idx_pre_tour_plan_item_plan").on(table.planId),
    index("idx_pre_tour_plan_item_day").on(table.dayId),
    index("idx_pre_tour_plan_item_type").on(table.itemType),
    index("idx_pre_tour_plan_item_day_order").on(table.dayId, table.sortOrder),
  ]
);

export const preTourPlanItemAddon = pgTable(
  "pre_tour_plan_item_addon",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    planId: text("plan_id")
      .notNull()
      .references(() => preTourPlan.id, { onDelete: "cascade" }),
    planItemId: text("plan_item_id")
      .notNull()
      .references(() => preTourPlanItem.id, { onDelete: "cascade" }),
    addonType: text("addon_type").notNull(),
    addonServiceId: text("addon_service_id"),
    title: text("title").notNull(),
    qty: decimal("qty", { precision: 10, scale: 2 }).notNull().default("1"),
    currencyCode: text("currency_code").notNull(),
    baseAmount: decimal("base_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    snapshot: jsonb("snapshot").$type<Record<string, unknown> | null>(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_pre_tour_plan_item_addon_company_code").on(table.companyId, table.code),
    index("idx_pre_tour_plan_item_addon_company").on(table.companyId),
    index("idx_pre_tour_plan_item_addon_plan").on(table.planId),
    index("idx_pre_tour_plan_item_addon_item").on(table.planItemId),
  ]
);

export const preTourPlanTotal = pgTable(
  "pre_tour_plan_total",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    planId: text("plan_id")
      .notNull()
      .references(() => preTourPlan.id, { onDelete: "cascade" }),
    currencyCode: text("currency_code").notNull(),
    totalsByType: jsonb("totals_by_type").$type<{
      TRANSPORT?: { base: number; tax: number; total: number };
      ACTIVITY?: { base: number; tax: number; total: number };
      ACCOMMODATION?: { base: number; tax: number; total: number };
      GUIDE?: { base: number; tax: number; total: number };
      SUPPLEMENT?: { base: number; tax: number; total: number };
      MISC?: { base: number; tax: number; total: number };
    } | null>(),
    baseTotal: decimal("base_total", { precision: 14, scale: 2 }).notNull(),
    taxTotal: decimal("tax_total", { precision: 14, scale: 2 }).notNull(),
    grandTotal: decimal("grand_total", { precision: 14, scale: 2 }).notNull(),
    snapshot: jsonb("snapshot").$type<{
      taxContext?: unknown;
      fxContext?: unknown;
      generatedAt?: string;
    } | null>(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_pre_tour_plan_total_company_code").on(table.companyId, table.code),
    unique("uq_pre_tour_plan_total_plan").on(table.planId),
    index("idx_pre_tour_plan_total_company").on(table.companyId),
    index("idx_pre_tour_plan_total_plan").on(table.planId),
  ]
);
