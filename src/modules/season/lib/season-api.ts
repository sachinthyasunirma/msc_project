"use client";

type ApiError = { message?: string };

async function readError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as ApiError;
    throw new Error(body.message || fallback);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(fallback);
  }
}

export type SeasonOption = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SeasonListFilters = {
  q?: string;
  cursor?: string | null;
  limit?: number;
  startDateFrom?: string;
  startDateTo?: string;
};

export type SeasonListResponse = {
  items: SeasonOption[];
  nextCursor: string | null;
  hasNext: boolean;
  limit: number;
};

export async function listSeasons(filters?: SeasonListFilters) {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.cursor) params.set("cursor", filters.cursor);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.startDateFrom) params.set("startDateFrom", filters.startDateFrom);
  if (filters?.startDateTo) params.set("startDateTo", filters.startDateTo);

  const query = params.toString();
  const response = await fetch(`/api/seasons${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });
  if (!response.ok) await readError(response, "Failed to load seasons.");
  return response.json() as Promise<SeasonListResponse>;
}

export async function createSeason(payload: unknown) {
  const response = await fetch("/api/seasons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to create season.");
  return response.json() as Promise<SeasonOption>;
}

export async function updateSeason(seasonId: string, payload: unknown) {
  const response = await fetch(`/api/seasons/${seasonId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await readError(response, "Failed to update season.");
  return response.json() as Promise<SeasonOption>;
}

export async function deleteSeason(seasonId: string) {
  const response = await fetch(`/api/seasons/${seasonId}`, {
    method: "DELETE",
  });
  if (!response.ok) await readError(response, "Failed to delete season.");
}
