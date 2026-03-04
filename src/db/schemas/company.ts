import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

export const company = pgTable("company", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  code: text("code").notNull().unique(),
  joinSecretCode: text("join_secret_code").unique(),
  managerPrivilegeCode: text("manager_privilege_code"),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  baseCurrencyCode: text("base_currency_code").notNull().default("USD"),
  transportRateBasis: text("transport_rate_basis")
    .notNull()
    .default("VEHICLE_TYPE"),
  helpEnabled: boolean("help_enabled").notNull().default(true),
  country: text("country"),
  isActive: boolean("is_active").notNull().default(true),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});
