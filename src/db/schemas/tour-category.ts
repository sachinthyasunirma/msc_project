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

export const tourCategoryType = pgTable(
  "tour_category_type",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    allowMultiple: boolean("allow_multiple").notNull().default(true),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_tour_category_type_company_code").on(table.companyId, table.code),
    index("idx_tour_category_type_company").on(table.companyId),
  ]
);

export const tourCategory = pgTable(
  "tour_category",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    typeId: text("type_id")
      .notNull()
      .references(() => tourCategoryType.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    parentId: text("parent_id"),
    icon: text("icon"),
    color: text("color"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_tour_category_company_code").on(table.companyId, table.code),
    index("idx_tour_category_company").on(table.companyId),
    index("idx_tour_category_type").on(table.typeId),
  ]
);

export const tourCategoryRule = pgTable(
  "tour_category_rule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => tourCategory.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    defaultMarkupPercent: decimal("default_markup_percent", {
      precision: 6,
      scale: 2,
    }),
    restrictHotelStarMin: integer("restrict_hotel_star_min"),
    restrictHotelStarMax: integer("restrict_hotel_star_max"),
    requireCertifiedGuide: boolean("require_certified_guide").notNull().default(false),
    requireHotel: boolean("require_hotel").notNull().default(false),
    requireTransport: boolean("require_transport").notNull().default(false),
    requireItinerary: boolean("require_itinerary").notNull().default(false),
    requireActivity: boolean("require_activity").notNull().default(false),
    requireCeremony: boolean("require_ceremony").notNull().default(false),
    allowMultipleHotels: boolean("allow_multiple_hotels").notNull().default(false),
    allowWithoutHotel: boolean("allow_without_hotel").notNull().default(true),
    allowWithoutTransport: boolean("allow_without_transport").notNull().default(true),
    minNights: integer("min_nights"),
    maxNights: integer("max_nights"),
    minDays: integer("min_days"),
    maxDays: integer("max_days"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_tour_category_rule_company_code").on(table.companyId, table.code),
    unique("uq_tour_category_rule_category").on(table.categoryId),
    index("idx_tour_category_rule_company").on(table.companyId),
    index("idx_tour_category_rule_category").on(table.categoryId),
  ]
);
