"use client";

import type { MediaEntityType, MediaAssetRecord } from "@/modules/media/shared/media-types";

type ApiError = {
  message?: string;
  code?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  let payload: (T & ApiError) | null = null;
  try {
    payload = (await response.json()) as T & ApiError;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || "Media request failed.");
  }

  if (payload === null) {
    throw new Error("Media API returned an empty or invalid response.");
  }

  return payload;
}

export async function listMediaAssets(params: {
  entityType: MediaEntityType;
  entityId: string;
  includeInactive?: boolean;
}) {
  const search = new URLSearchParams({
    entityType: params.entityType,
    entityId: params.entityId,
  });
  if (params.includeInactive) {
    search.set("includeInactive", "true");
  }
  const response = await fetch(`/api/media/assets?${search.toString()}`, { cache: "no-store" });
  return parseResponse<MediaAssetRecord[]>(response);
}

export async function createMediaUploadSession(payload: {
  entityType: MediaEntityType;
  entityId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}) {
  const response = await fetch("/api/media/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<{
    uploadUrl: string;
    storageKey: string;
    bucket: string;
    expiresInSeconds: number;
    allowedMimeTypes: string[];
    maxFileSizeBytes: number;
    maxFilesPerEntity: number;
  }>(response);
}

export async function uploadFileToPresignedUrl(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Failed to upload file to storage.");
  }
}

export async function createMediaAsset(payload: Record<string, unknown>) {
  const response = await fetch("/api/media/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<MediaAssetRecord>(response);
}

export async function updateMediaAsset(assetId: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/media/assets/${assetId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<MediaAssetRecord>(response);
}

export async function deactivateMediaAsset(assetId: string) {
  const response = await fetch(`/api/media/assets/${assetId}`, {
    method: "DELETE",
  });
  return parseResponse<MediaAssetRecord>(response);
}
