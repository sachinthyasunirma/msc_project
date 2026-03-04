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
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_tour_category_rule_company_code").on(table.companyId, table.code),
    index("idx_tour_category_rule_company").on(table.companyId),
    index("idx_tour_category_rule_category").on(table.categoryId),
  ]
);

