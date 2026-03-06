import { nanoid } from "nanoid";
import {
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { company } from "@/db/schemas/company";
import { user } from "@/db/schemas/user";

export const companyRole = pgTable(
  "company_role",
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
    isSystem: boolean("is_system").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("uq_company_role_company_code").on(table.companyId, table.code),
    index("idx_company_role_company").on(table.companyId),
  ]
);

export const companyRolePrivilege = pgTable(
  "company_role_privilege",
  {
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => companyRole.id, { onDelete: "cascade" }),
    privilegeCode: text("privilege_code").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "pk_company_role_privilege",
      columns: [table.roleId, table.privilegeCode],
    }),
    index("idx_company_role_privilege_company").on(table.companyId),
    index("idx_company_role_privilege_role").on(table.roleId),
  ]
);

export const userCompanyRole = pgTable(
  "user_company_role",
  {
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => companyRole.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "pk_user_company_role",
      columns: [table.userId, table.roleId],
    }),
    index("idx_user_company_role_company").on(table.companyId),
    index("idx_user_company_role_user").on(table.userId),
    index("idx_user_company_role_role").on(table.roleId),
  ]
);
