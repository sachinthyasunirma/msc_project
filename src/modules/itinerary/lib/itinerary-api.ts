"use client";

import type { ItineraryCreateInput } from "@/modules/itinerary/shared/itinerary-schemas";
import type {
  ItineraryExportRecord,
  ItineraryLauncherPayload,
  ItineraryPreviewPayload,
  ItineraryShareRecord,
  ItineraryStructuredDraft,
} from "@/modules/itinerary/shared/itinerary-types";

type ApiError = {
  code?: string;
  message?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  let payload: (T & ApiError) | null = null;

  try {
    payload = (await response.json()) as T & ApiError;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || "Itinerary request failed.");
  }

  if (payload === null) {
    throw new Error("Itinerary API returned an empty response.");
  }

  return payload;
}

export async function getItineraryLauncher(planId: string) {
  const response = await fetch(`/api/pre-tours/${planId}/itineraries`, {
    cache: "no-store",
  });
  return parseResponse<ItineraryLauncherPayload>(response);
}

export async function createItineraryDraft(planId: string, payload: ItineraryCreateInput) {
  const response = await fetch(`/api/pre-tours/${planId}/itineraries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<{
    itinerary: {
      id: string;
      code: string;
      title: string;
      templateKey: string;
      outputMode: string;
    };
    version: {
      id: string;
      versionNumber: number;
      createdAt: string;
    };
  }>(response);
}

export async function createItineraryExportHook(itineraryId: string, payload: { format: "PDF" | "DOCX" }) {
  const response = await fetch(`/api/itineraries/${itineraryId}/exports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<{ export: ItineraryExportRecord }>(response);
}

export async function createItineraryShareLink(
  itineraryId: string,
  payload: { surface: "WEB" | "DOCUMENT"; expiresInDays?: number | null }
) {
  const response = await fetch(`/api/itineraries/${itineraryId}/shares`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<{ share: ItineraryShareRecord }>(response);
}

export async function revokeItineraryShareLink(itineraryId: string, shareId: string) {
  const response = await fetch(`/api/itineraries/${itineraryId}/shares/${shareId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ revoke: true }),
  });

  return parseResponse<{ share: ItineraryShareRecord }>(response);
}

export async function updateItineraryDraftVersion(
  itineraryId: string,
  payload: { expectedVersionId?: string; draft: ItineraryStructuredDraft }
) {
  const response = await fetch(`/api/itineraries/${itineraryId}/draft`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<{
    itinerary: ItineraryPreviewPayload["itinerary"];
    currentVersion: {
      id: string;
      versionNumber: number;
      createdAt: string;
      draft: ItineraryStructuredDraft;
    };
  }>(response);
}
