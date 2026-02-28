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

export const currency = pgTable(
  "currency",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    symbol: text("symbol"),
    numericCode: text("numeric_code"),
    minorUnit: integer("minor_unit").notNull().default(2),
    roundingMode: text("rounding_mode").notNull().default("HALF_UP"),
    roundingScale: integer("rounding_scale").notNull().default(2),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_currency_company").on(table.companyId),
    index("idx_currency_active").on(table.isActive),
    unique("uq_currency_company_code").on(table.companyId, table.code),
  ]
);

export const fxProvider = pgTable(
  "fx_provider",
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
    index("idx_fx_provider_company").on(table.companyId),
    unique("uq_fx_provider_company_code").on(table.companyId, table.code),
  ]
);

export const exchangeRate = pgTable(
  "exchange_rate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    providerId: text("provider_id").references(() => fxProvider.id, {
      onDelete: "set null",
    }),
    baseCurrencyId: text("base_currency_id")
      .notNull()
      .references(() => currency.id, { onDelete: "restrict" }),
    quoteCurrencyId: text("quote_currency_id")
      .notNull()
      .references(() => currency.id, { onDelete: "restrict" }),
    rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
    asOf: timestamp("as_of").notNull(),
    rateType: text("rate_type").notNull().default("MID"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_exchange_rate_company").on(table.companyId),
    index("idx_exchange_rate_pair").on(table.baseCurrencyId, table.quoteCurrencyId),
    index("idx_exchange_rate_asof").on(table.asOf),
    unique("uq_exchange_rate_company_code").on(table.companyId, table.code),
  ]
);

export const moneySetting = pgTable(
  "money_setting",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    baseCurrencyId: text("base_currency_id")
      .notNull()
      .references(() => currency.id, { onDelete: "restrict" }),
    priceMode: text("price_mode").notNull().default("EXCLUSIVE"),
    fxRateSource: text("fx_rate_source").notNull().default("LATEST"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_money_setting_company").on(table.companyId),
    unique("uq_money_setting_company_code").on(table.companyId, table.code),
  ]
);
