import { z } from "zod";
import {
  CREATIVE_COMMONS_LICENSES,
  MEDIA_ENTITY_TYPES,
  MEDIA_REVIEW_STATUSES,
  MEDIA_SOURCE_TYPES,
} from "@/modules/media/shared/media-types";

export const mediaEntityTypeSchema = z.enum(MEDIA_ENTITY_TYPES);
export const mediaSourceTypeSchema = z.enum(MEDIA_SOURCE_TYPES);
export const mediaReviewStatusSchema = z.enum(MEDIA_REVIEW_STATUSES);
export const mediaCreativeCommonsLicenseSchema = z.enum(
  Object.keys(CREATIVE_COMMONS_LICENSES) as [keyof typeof CREATIVE_COMMONS_LICENSES, ...Array<keyof typeof CREATIVE_COMMONS_LICENSES>]
);

export const mediaListQuerySchema = z.object({
  entityType: mediaEntityTypeSchema,
  entityId: z.string().trim().min(1),
  includeInactive: z.coerce.boolean().optional().default(false),
});

export const mediaUploadRequestSchema = z.object({
  entityType: mediaEntityTypeSchema,
  entityId: z.string().trim().min(1),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  fileSize: z.coerce.number().int().positive().max(1024 * 1024),
});

const mediaBaseMetadataSchema = z.object({
  entityType: mediaEntityTypeSchema,
  entityId: z.string().trim().min(1),
  storageKey: z.string().trim().min(1).max(500),
  originalFileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  fileSize: z.coerce.number().int().positive().max(1024 * 1024),
  altText: z.string().trim().max(255).optional().nullable(),
  caption: z.string().trim().max(1000).optional().nullable(),
  isPrimary: z.boolean().default(false),
  sourceType: mediaSourceTypeSchema.default("OWNED"),
  copyrightOwner: z.string().trim().max(255).optional().nullable(),
  creatorName: z.string().trim().max(255).optional().nullable(),
  sourceUrl: z.string().url().max(2048).optional().nullable(),
  licenseCode: z.string().trim().max(120).optional().nullable(),
  licenseUrl: z.string().url().max(2048).optional().nullable(),
  attributionText: z.string().trim().max(1000).optional().nullable(),
  commercialUseAllowed: z.boolean().optional().nullable(),
  derivativesAllowed: z.boolean().optional().nullable(),
  reviewStatus: mediaReviewStatusSchema.default("PENDING"),
  reviewNotes: z.string().trim().max(1000).optional().nullable(),
  isActive: z.boolean().default(true),
});

function applyCreativeCommonsRules(
  value: {
    sourceType?: string | null;
    creatorName?: string | null;
    sourceUrl?: string | null;
    licenseCode?: string | null;
    attributionText?: string | null;
  },
  ctx: z.RefinementCtx
) {
  if (value.sourceType === "CREATIVE_COMMONS") {
    if (!value.creatorName) {
      ctx.addIssue({ code: "custom", message: "Creator name is required for Creative Commons media." });
    }
    if (!value.sourceUrl) {
      ctx.addIssue({ code: "custom", message: "Source URL is required for Creative Commons media." });
    }
    if (!value.licenseCode) {
      ctx.addIssue({ code: "custom", message: "License code is required for Creative Commons media." });
    }
    if (!value.attributionText) {
      ctx.addIssue({ code: "custom", message: "Attribution text is required for Creative Commons media." });
    }
  }
}

export const createMediaAssetSchema = mediaBaseMetadataSchema.superRefine(applyCreativeCommonsRules);

export const updateMediaAssetSchema = mediaBaseMetadataSchema
  .omit({
    entityType: true,
    entityId: true,
    storageKey: true,
    originalFileName: true,
    mimeType: true,
    fileSize: true,
  })
  .partial()
  .superRefine(applyCreativeCommonsRules)
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one media field is required.",
  });
