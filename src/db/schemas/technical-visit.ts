import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { company } from "@/db/schemas/company";
import { user } from "@/db/schemas/user";

export const technicalVisit = pgTable(
  "technical_visit",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    visitType: text("visit_type").notNull(),
    referenceId: text("reference_id").notNull(),
    visitDate: timestamp("visit_date").notNull(),
    visitedByUserId: text("visited_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    overallRating: integer("overall_rating"),
    status: text("status").notNull().default("COMPLETED"),
    summary: text("summary"),
    followUpRequired: boolean("follow_up_required").notNull().default(false),
    nextVisitDate: timestamp("next_visit_date"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_technical_visit_company_code").on(table.companyId, table.code),
    index("idx_technical_visit_company").on(table.companyId),
    index("idx_technical_visit_type").on(table.visitType),
    index("idx_technical_visit_reference").on(table.referenceId),
    index("idx_technical_visit_date").on(table.visitDate),
    index("idx_technical_visit_status").on(table.status),
  ]
);

export const technicalVisitChecklist = pgTable(
  "technical_visit_checklist",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    visitId: text("visit_id")
      .notNull()
      .references(() => technicalVisit.id, { onDelete: "cascade" }),
    category: text("category"),
    item: text("item").notNull(),
    rating: integer("rating"),
    remarks: text("remarks"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_technical_visit_checklist_company_code").on(table.companyId, table.code),
    index("idx_technical_visit_checklist_company").on(table.companyId),
    index("idx_technical_visit_checklist_visit").on(table.visitId),
  ]
);

export const technicalVisitMedia = pgTable(
  "technical_visit_media",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    visitId: text("visit_id")
      .notNull()
      .references(() => technicalVisit.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    caption: text("caption"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_technical_visit_media_company_code").on(table.companyId, table.code),
    index("idx_technical_visit_media_company").on(table.companyId),
    index("idx_technical_visit_media_visit").on(table.visitId),
  ]
);

export const technicalVisitAction = pgTable(
  "technical_visit_action",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    visitId: text("visit_id")
      .notNull()
      .references(() => technicalVisit.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    assignedToUserId: text("assigned_to_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    dueDate: timestamp("due_date"),
    status: text("status").notNull().default("OPEN"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_technical_visit_action_company_code").on(table.companyId, table.code),
    index("idx_technical_visit_action_company").on(table.companyId),
    index("idx_technical_visit_action_visit").on(table.visitId),
    index("idx_technical_visit_action_status").on(table.status),
  ]
);
