import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { company } from "@/db/schemas/company";
import { user } from "@/db/schemas/user";

export const mediaAsset = pgTable(
  "media_asset",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    storageKey: text("storage_key").notNull(),
    originalFileName: text("original_file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    altText: text("alt_text"),
    caption: text("caption"),
    isPrimary: boolean("is_primary").notNull().default(false),
    sourceType: text("source_type").notNull().default("OWNED"),
    copyrightOwner: text("copyright_owner"),
    creatorName: text("creator_name"),
    sourceUrl: text("source_url"),
    licenseCode: text("license_code"),
    licenseUrl: text("license_url"),
    attributionText: text("attribution_text"),
    commercialUseAllowed: boolean("commercial_use_allowed"),
    derivativesAllowed: boolean("derivatives_allowed"),
    reviewStatus: text("review_status").notNull().default("PENDING"),
    reviewNotes: text("review_notes"),
    useInItinerary: boolean("use_in_itinerary").notNull().default(false),
    eligibleForItineraryHero: boolean("eligible_for_itinerary_hero").notNull().default(false),
    eligibleForItineraryGallery: boolean("eligible_for_itinerary_gallery").notNull().default(false),
    itineraryPriority: integer("itinerary_priority").notNull().default(0),
    safeForCustomerShare: boolean("safe_for_customer_share").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    reviewedBy: text("reviewed_by").references(() => user.id, { onDelete: "set null" }),
    removedBy: text("removed_by").references(() => user.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at"),
    removedAt: timestamp("removed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_media_asset_storage_key").on(table.storageKey),
    index("idx_media_asset_company").on(table.companyId),
    index("idx_media_asset_entity").on(table.entityType, table.entityId),
    index("idx_media_asset_primary").on(table.entityType, table.entityId, table.isPrimary),
    index("idx_media_asset_review").on(table.reviewStatus),
    index("idx_media_asset_itinerary_eligibility").on(
      table.entityType,
      table.entityId,
      table.useInItinerary,
      table.eligibleForItineraryHero,
      table.eligibleForItineraryGallery,
      table.itineraryPriority
    ),
  ]
);
