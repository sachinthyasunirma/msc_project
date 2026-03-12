import { nanoid } from "nanoid";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { MediaEntityType } from "@/modules/media/shared/media-types";

const DEFAULT_UPLOAD_TTL_SECONDS = 60 * 5;
const DEFAULT_READ_TTL_SECONDS = 60 * 10;

let cachedS3Client: S3Client | null = null;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export function getMediaBucketName() {
  return requiredEnv("AWS_S3_MEDIA_BUCKET");
}

function getS3Client() {
  if (cachedS3Client) {
    return cachedS3Client;
  }

  cachedS3Client = new S3Client({
    region: requiredEnv("AWS_REGION"),
    credentials: {
      accessKeyId: requiredEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("AWS_SECRET_ACCESS_KEY"),
      sessionToken: process.env.AWS_SESSION_TOKEN,
    },
  });
  return cachedS3Client;
}

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildMediaStorageKey(input: {
  companyId: string;
  entityType: MediaEntityType;
  entityId: string;
  fileName: string;
}) {
  const safeFileName = sanitizeFileName(input.fileName) || "asset";
  return [
    "companies",
    input.companyId,
    "media",
    input.entityType.toLowerCase(),
    input.entityId,
    `${Date.now()}-${nanoid()}-${safeFileName}`,
  ].join("/");
}

export async function createMediaUploadUrl(input: {
  bucket: string;
  storageKey: string;
  mimeType: string;
}) {
  const command = new PutObjectCommand({
    Bucket: input.bucket,
    Key: input.storageKey,
    ContentType: input.mimeType,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn: DEFAULT_UPLOAD_TTL_SECONDS });
}

export async function createMediaReadUrl(input: {
  bucket: string;
  storageKey: string;
}) {
  const command = new GetObjectCommand({
    Bucket: input.bucket,
    Key: input.storageKey,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn: DEFAULT_READ_TTL_SECONDS });
}
