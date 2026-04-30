import { boolean, index, integer, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { company } from "@/db/schemas/company";
import { preTourPlan } from "@/db/schemas/pre-tour";
import { user } from "@/db/schemas/user";
import type {
  ItineraryExportFormat,
  ItineraryExportStatus,
  ItineraryGenerationOptions,
  ItineraryOutputMode,
  ItineraryShareSurface,
  ItinerarySourceSnapshot,
  ItineraryStatus,
  ItineraryStructuredDraft,
} from "@/modules/itinerary/shared/itinerary-types";

export const itinerary = pgTable(
  "itinerary",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => preTourPlan.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    status: text("status").$type<ItineraryStatus>().notNull().default("DRAFT"),
    templateKey: text("template_key").notNull(),
    outputMode: text("output_mode").$type<ItineraryOutputMode>().notNull().default("BOTH"),
    currentVersionNumber: integer("current_version_number").notNull().default(1),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdByName: text("created_by_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_itinerary_company_code").on(table.companyId, table.code),
    index("idx_itinerary_company").on(table.companyId),
    index("idx_itinerary_plan").on(table.planId),
    index("idx_itinerary_status").on(table.status),
    index("idx_itinerary_plan_updated").on(table.planId, table.updatedAt),
  ]
);

export const itineraryVersion = pgTable(
  "itinerary_version",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    itineraryId: text("itinerary_id")
      .notNull()
      .references(() => itinerary.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").$type<ItineraryStatus>().notNull().default("DRAFT"),
    generationOptions: jsonb("generation_options").$type<ItineraryGenerationOptions | null>(),
    sourceSnapshot: jsonb("source_snapshot").$type<ItinerarySourceSnapshot | null>(),
    structuredDraft: jsonb("structured_draft").$type<ItineraryStructuredDraft | null>(),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdByName: text("created_by_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_itinerary_version_itinerary_number").on(table.itineraryId, table.versionNumber),
    index("idx_itinerary_version_company").on(table.companyId),
    index("idx_itinerary_version_itinerary").on(table.itineraryId),
    index("idx_itinerary_version_itinerary_created").on(table.itineraryId, table.createdAt),
  ]
);

export const itineraryExport = pgTable(
  "itinerary_export",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    itineraryId: text("itinerary_id")
      .notNull()
      .references(() => itinerary.id, { onDelete: "cascade" }),
    itineraryVersionId: text("itinerary_version_id")
      .notNull()
      .references(() => itineraryVersion.id, { onDelete: "cascade" }),
    format: text("format").$type<ItineraryExportFormat>().notNull(),
    status: text("status").$type<ItineraryExportStatus>().notNull().default("PREPARED"),
    fileName: text("file_name").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown> | null>(),
    requestedByUserId: text("requested_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    requestedByName: text("requested_by_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_itinerary_export_company").on(table.companyId),
    index("idx_itinerary_export_itinerary").on(table.itineraryId),
    index("idx_itinerary_export_version").on(table.itineraryVersionId),
    index("idx_itinerary_export_created").on(table.itineraryId, table.createdAt),
  ]
);

export const itineraryShare = pgTable(
  "itinerary_share",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    itineraryId: text("itinerary_id")
      .notNull()
      .references(() => itinerary.id, { onDelete: "cascade" }),
    itineraryVersionId: text("itinerary_version_id")
      .notNull()
      .references(() => itineraryVersion.id, { onDelete: "cascade" }),
    surface: text("surface").$type<ItineraryShareSurface>().notNull().default("WEB"),
    tokenHash: text("token_hash").notNull(),
    tokenHint: text("token_hint").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    revokedByUserId: text("revoked_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    lastAccessedAt: timestamp("last_accessed_at"),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdByName: text("created_by_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_itinerary_share_token_hash").on(table.tokenHash),
    index("idx_itinerary_share_company").on(table.companyId),
    index("idx_itinerary_share_itinerary").on(table.itineraryId),
    index("idx_itinerary_share_version").on(table.itineraryVersionId),
    index("idx_itinerary_share_active").on(table.itineraryId, table.isActive, table.createdAt),
  ]
);
