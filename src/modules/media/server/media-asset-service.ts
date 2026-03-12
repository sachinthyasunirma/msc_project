import { and, asc, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import {
  createMediaAssetSchema,
  mediaListQuerySchema,
  mediaUploadRequestSchema,
  updateMediaAssetSchema,
} from "@/modules/media/shared/media-schemas";
import {
  CREATIVE_COMMONS_LICENSES,
  type MediaEntityType,
} from "@/modules/media/shared/media-types";
import {
  buildMediaStorageKey,
  createMediaReadUrl,
  createMediaUploadUrl,
  getMediaBucketName,
} from "@/modules/media/server/media-s3";

class MediaError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

type AccessResult = Awaited<ReturnType<typeof resolveAccess>>;

const MEDIA_UPLOAD_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
const MEDIA_UPLOAD_MAX_BYTES = 1024 * 1024;
const MEDIA_MAX_ASSETS_PER_ENTITY = 5;

function normalizeZodError(error: z.ZodError) {
  return error.issues[0]?.message || "Validation failed.";
}

async function resolveMediaAccess(headers: Headers, entityType: MediaEntityType): Promise<AccessResult> {
  const privilege =
    entityType === "ACTIVITY"
      ? "SCREEN_MASTER_ACTIVITIES"
      : entityType === "TRANSPORT_LOCATION"
        ? "SCREEN_MASTER_TRANSPORTS"
        : "SCREEN_MASTER_ACCOMMODATIONS";

  try {
    return await resolveAccess(headers, {
      requiredPrivilege: privilege,
    });
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new MediaError(error.status, error.code, error.message);
    }
    throw error;
  }
}

function ensureWritable(access: AccessResult) {
  if (access.readOnly) {
    throw new MediaError(
      403,
      "READ_ONLY_MODE",
      "You are in read-only mode. Contact a manager for edit access."
    );
  }
  if (access.role !== "ADMIN" && access.role !== "MANAGER" && !access.canWriteMasterData) {
    throw new MediaError(403, "PERMISSION_DENIED", "You do not have write access for Master Data.");
  }
}

async function ensureEntity(companyId: string, entityType: MediaEntityType, entityId: string) {
  if (entityType === "ACTIVITY") {
    const [record] = await db
      .select({ id: schema.activity.id })
      .from(schema.activity)
      .where(and(eq(schema.activity.id, entityId), eq(schema.activity.companyId, companyId)))
      .limit(1);
    if (!record) {
      throw new MediaError(404, "ENTITY_NOT_FOUND", "Activity not found.");
    }
    return;
  }

  if (entityType === "ACCOMMODATION_HOTEL") {
    const [record] = await db
      .select({ id: schema.hotel.id })
      .from(schema.hotel)
      .where(and(eq(schema.hotel.id, entityId), eq(schema.hotel.companyId, companyId)))
      .limit(1);
    if (!record) {
      throw new MediaError(404, "ENTITY_NOT_FOUND", "Hotel not found.");
    }
    return;
  }

  const [record] = await db
    .select({ id: schema.transportLocation.id })
    .from(schema.transportLocation)
    .where(
      and(
        eq(schema.transportLocation.id, entityId),
        eq(schema.transportLocation.companyId, companyId)
      )
    )
    .limit(1);
  if (!record) {
    throw new MediaError(404, "ENTITY_NOT_FOUND", "Transport location not found.");
  }
}

async function getActiveMediaCount(companyId: string, entityType: MediaEntityType, entityId: string) {
  const [existing] = await db
    .select({ count: count() })
    .from(schema.mediaAsset)
    .where(
      and(
        eq(schema.mediaAsset.companyId, companyId),
        eq(schema.mediaAsset.entityType, entityType),
        eq(schema.mediaAsset.entityId, entityId),
        eq(schema.mediaAsset.isActive, true)
      )
    );

  return existing?.count ?? 0;
}

function deriveRightsMetadata<T extends {
  sourceType?: string | null;
  licenseCode?: string | null;
  commercialUseAllowed?: boolean | null;
  derivativesAllowed?: boolean | null;
  licenseUrl?: string | null;
}>(payload: T): T {
  if (payload.sourceType !== "CREATIVE_COMMONS" || !payload.licenseCode) {
    return payload;
  }

  const license = CREATIVE_COMMONS_LICENSES[payload.licenseCode as keyof typeof CREATIVE_COMMONS_LICENSES];
  if (!license) {
    return payload;
  }

  return {
    ...payload,
    commercialUseAllowed: license.commercialUseAllowed,
    derivativesAllowed: license.derivativesAllowed,
    licenseUrl: license.url,
  };
}

function toPlainRecord<T extends Record<string, unknown>>(record: T): T {
  const next = { ...record };
  for (const [key, value] of Object.entries(next)) {
    if (value instanceof Date) {
      next[key as keyof T] = value.toISOString() as T[keyof T];
    }
  }
  return next;
}

export async function listMediaAssets(searchParams: URLSearchParams, headers: Headers) {
  const parsed = mediaListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new MediaError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const access = await resolveMediaAccess(headers, parsed.data.entityType);
  await ensureEntity(access.companyId, parsed.data.entityType, parsed.data.entityId);

  const clauses = [
    eq(schema.mediaAsset.companyId, access.companyId),
    eq(schema.mediaAsset.entityType, parsed.data.entityType),
    eq(schema.mediaAsset.entityId, parsed.data.entityId),
  ];
  if (!parsed.data.includeInactive) {
    clauses.push(eq(schema.mediaAsset.isActive, true));
  }

  const rows = await db
    .select()
    .from(schema.mediaAsset)
    .where(and(...clauses))
    .orderBy(asc(schema.mediaAsset.isPrimary), asc(schema.mediaAsset.createdAt));

  return rows.map((row) => toPlainRecord(row));
}

export async function createMediaUploadSession(payload: unknown, headers: Headers) {
  const parsed = mediaUploadRequestSchema.safeParse(payload);
  if (!parsed.success) {
    throw new MediaError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  if (!MEDIA_UPLOAD_ALLOWED_MIME_TYPES.includes(parsed.data.mimeType as (typeof MEDIA_UPLOAD_ALLOWED_MIME_TYPES)[number])) {
    throw new MediaError(400, "INVALID_FILE_TYPE", "Only JPG, PNG, and WEBP images are allowed.");
  }

  if (parsed.data.fileSize > MEDIA_UPLOAD_MAX_BYTES) {
    throw new MediaError(400, "FILE_TOO_LARGE", "Image file must be 1MB or smaller.");
  }

  const access = await resolveMediaAccess(headers, parsed.data.entityType);
  ensureWritable(access);
  await ensureEntity(access.companyId, parsed.data.entityType, parsed.data.entityId);
  const activeMediaCount = await getActiveMediaCount(
    access.companyId,
    parsed.data.entityType,
    parsed.data.entityId
  );
  if (activeMediaCount >= MEDIA_MAX_ASSETS_PER_ENTITY) {
    throw new MediaError(
      400,
      "MEDIA_LIMIT_REACHED",
      `Only ${MEDIA_MAX_ASSETS_PER_ENTITY} active images are allowed for a single record.`
    );
  }

  const storageKey = buildMediaStorageKey({
    companyId: access.companyId,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
    fileName: parsed.data.fileName,
  });
  const uploadUrl = await createMediaUploadUrl({
    bucket: getMediaBucketName(),
    storageKey,
    mimeType: parsed.data.mimeType,
  });

  return {
    uploadUrl,
    storageKey,
    bucket: getMediaBucketName(),
    expiresInSeconds: 300,
    allowedMimeTypes: [...MEDIA_UPLOAD_ALLOWED_MIME_TYPES],
    maxFileSizeBytes: MEDIA_UPLOAD_MAX_BYTES,
    maxFilesPerEntity: MEDIA_MAX_ASSETS_PER_ENTITY,
  };
}

export async function createMediaAsset(payload: unknown, headers: Headers) {
  const parsed = createMediaAssetSchema.safeParse(payload);
  if (!parsed.success) {
    throw new MediaError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const access = await resolveMediaAccess(headers, parsed.data.entityType);
  ensureWritable(access);
  await ensureEntity(access.companyId, parsed.data.entityType, parsed.data.entityId);
  if (
    (await getActiveMediaCount(access.companyId, parsed.data.entityType, parsed.data.entityId)) >=
    MEDIA_MAX_ASSETS_PER_ENTITY
  ) {
    throw new MediaError(
      400,
      "MEDIA_LIMIT_REACHED",
      `Only ${MEDIA_MAX_ASSETS_PER_ENTITY} active images are allowed for a single record.`
    );
  }

  const nextPayload = deriveRightsMetadata(parsed.data);
  if (nextPayload.isPrimary) {
    await db
      .update(schema.mediaAsset)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.mediaAsset.companyId, access.companyId),
          eq(schema.mediaAsset.entityType, nextPayload.entityType),
          eq(schema.mediaAsset.entityId, nextPayload.entityId),
          eq(schema.mediaAsset.isActive, true)
        )
      );
  }

  const [created] = await db
    .insert(schema.mediaAsset)
    .values({
      ...nextPayload,
      companyId: access.companyId,
      createdBy: access.userId,
    })
    .returning();

  return toPlainRecord(created);
}

export async function updateMediaAsset(assetId: string, payload: unknown, headers: Headers) {
  const [current] = await db
    .select()
    .from(schema.mediaAsset)
    .where(eq(schema.mediaAsset.id, assetId))
    .limit(1);

  if (!current) {
    throw new MediaError(404, "ASSET_NOT_FOUND", "Media asset not found.");
  }

  const access = await resolveMediaAccess(headers, current.entityType as MediaEntityType);
  ensureWritable(access);
  if (current.companyId !== access.companyId) {
    throw new MediaError(404, "ASSET_NOT_FOUND", "Media asset not found.");
  }

  const parsed = updateMediaAssetSchema.safeParse(payload);
  if (!parsed.success) {
    throw new MediaError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const nextPayload = deriveRightsMetadata(parsed.data);
  if (nextPayload.isPrimary) {
    await db
      .update(schema.mediaAsset)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.mediaAsset.companyId, access.companyId),
          eq(schema.mediaAsset.entityType, current.entityType),
          eq(schema.mediaAsset.entityId, current.entityId),
          eq(schema.mediaAsset.isActive, true)
        )
      );
  }

  const [updated] = await db
    .update(schema.mediaAsset)
    .set({
      ...nextPayload,
      reviewedBy:
        nextPayload.reviewStatus && nextPayload.reviewStatus !== current.reviewStatus
          ? access.userId
          : current.reviewedBy,
      reviewedAt:
        nextPayload.reviewStatus && nextPayload.reviewStatus !== current.reviewStatus
          ? new Date()
          : current.reviewedAt,
      updatedAt: new Date(),
    })
    .where(
      and(eq(schema.mediaAsset.id, assetId), eq(schema.mediaAsset.companyId, access.companyId))
    )
    .returning();

  if (!updated) {
    throw new MediaError(404, "ASSET_NOT_FOUND", "Media asset not found.");
  }

  return toPlainRecord(updated);
}

export async function deactivateMediaAsset(assetId: string, headers: Headers) {
  const [current] = await db
    .select()
    .from(schema.mediaAsset)
    .where(eq(schema.mediaAsset.id, assetId))
    .limit(1);

  if (!current) {
    throw new MediaError(404, "ASSET_NOT_FOUND", "Media asset not found.");
  }

  const access = await resolveMediaAccess(headers, current.entityType as MediaEntityType);
  ensureWritable(access);
  if (current.companyId !== access.companyId) {
    throw new MediaError(404, "ASSET_NOT_FOUND", "Media asset not found.");
  }

  const [updated] = await db
    .update(schema.mediaAsset)
    .set({
      isActive: false,
      isPrimary: false,
      removedAt: new Date(),
      removedBy: access.userId,
      updatedAt: new Date(),
    })
    .where(
      and(eq(schema.mediaAsset.id, assetId), eq(schema.mediaAsset.companyId, access.companyId))
    )
    .returning();

  if (!updated) {
    throw new MediaError(404, "ASSET_NOT_FOUND", "Media asset not found.");
  }

  return toPlainRecord(updated);
}

export async function getMediaAssetReadUrl(assetId: string, headers: Headers) {
  const [current] = await db
    .select()
    .from(schema.mediaAsset)
    .where(and(eq(schema.mediaAsset.id, assetId), eq(schema.mediaAsset.isActive, true)))
    .limit(1);

  if (!current) {
    throw new MediaError(404, "ASSET_NOT_FOUND", "Media asset not found.");
  }

  const access = await resolveMediaAccess(headers, current.entityType as MediaEntityType);
  if (current.companyId !== access.companyId) {
    throw new MediaError(404, "ASSET_NOT_FOUND", "Media asset not found.");
  }

  const readUrl = await createMediaReadUrl({
    bucket: getMediaBucketName(),
    storageKey: current.storageKey,
  });

  return {
    readUrl,
    contentType: current.mimeType,
  };
}

export function toMediaErrorResponse(error: unknown) {
  if (error instanceof MediaError) {
    return {
      status: error.status,
      body: {
        message: error.message,
        code: error.code,
      },
    };
  }

  return {
    status: 500,
    body: {
      message: error instanceof Error ? error.message : "Media request failed.",
      code: "INTERNAL_ERROR",
    },
  };
}
