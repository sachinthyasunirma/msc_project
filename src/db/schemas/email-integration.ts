import { boolean, index, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { company } from "@/db/schemas/company";
import { user } from "@/db/schemas/user";

export const companyEmailAccount = pgTable(
  "company_email_account",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    displayName: text("display_name").notNull(),
    emailAddress: text("email_address").notNull(),
    username: text("username").notNull(),
    passwordEncrypted: text("password_encrypted").notNull(),
    host: text("host").notNull(),
    port: integer("port").notNull().default(993),
    secure: boolean("secure").notNull().default(true),
    mailbox: text("mailbox").notNull().default("INBOX"),
    isActive: boolean("is_active").notNull().default(true),
    isAvailableForPreTourAI: boolean("is_available_for_pre_tour_ai").notNull().default(true),
    isDefaultForPreTourAI: boolean("is_default_for_pre_tour_ai").notNull().default(false),
    lastConnectionStatus: text("last_connection_status").notNull().default("NEVER_TESTED"),
    lastConnectionError: text("last_connection_error"),
    lastConnectedAt: timestamp("last_connected_at"),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdByName: text("created_by_name"),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, { onDelete: "set null" }),
    updatedByName: text("updated_by_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_company_email_account_company_code").on(table.companyId, table.code),
    unique("uq_company_email_account_company_email").on(table.companyId, table.emailAddress),
    index("idx_company_email_account_company").on(table.companyId),
    index("idx_company_email_account_company_active").on(table.companyId, table.isActive),
    index("idx_company_email_account_company_ai").on(
      table.companyId,
      table.isAvailableForPreTourAI,
      table.isDefaultForPreTourAI
    ),
  ]
);

export const companyEmailIntakeProfile = pgTable(
  "company_email_intake_profile",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    accountCode: text("account_code").notNull(),
    accountDisplayName: text("account_display_name").notNull(),
    accountEmailAddress: text("account_email_address").notNull(),
    emailAddresses: text("email_addresses").array().notNull(),
    keywords: text("keywords").array().notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdByName: text("created_by_name"),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, { onDelete: "set null" }),
    updatedByName: text("updated_by_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_company_email_intake_profile_company_account").on(table.companyId, table.accountId),
    index("idx_company_email_intake_profile_company").on(table.companyId),
    index("idx_company_email_intake_profile_company_active").on(table.companyId, table.isActive),
  ]
);
