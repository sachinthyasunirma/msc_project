import type { PaginatedRecordsResponse } from "@/lib/types/paginated-records";

type ApiError = { message?: string };
export type GuideCodeRecord = { id: string; code: string | null };

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(payload.message || "Guide request failed.");
  }
  return payload;
}

export async function listGuideRecords(
  resource: string,
  params?: { q?: string; limit?: number; guideId?: string }
) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.guideId) search.set("guideId", params.guideId);
  const response = await fetch(`/api/guides/${resource}?${search.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<Array<Record<string, unknown>>>(response);
}

export async function listGuideRecordPage(
  resource: string,
  params?: { q?: string; page?: number; limit?: number; guideId?: string; codesOnly?: boolean }
) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.guideId) search.set("guideId", params.guideId);
  if (params?.codesOnly) search.set("codesOnly", "true");
  const response = await fetch(`/api/guides/${resource}?${search.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<PaginatedRecordsResponse>(response);
}

export async function listAllGuideRecords(
  resource: string,
  params?: { q?: string; guideId?: string; limit?: number }
) {
  const pageSize = Math.min(params?.limit ?? 100, 100);
  let page = 1;
  let rows: Array<Record<string, unknown>> = [];

  while (true) {
    const payload = await listGuideRecordPage(resource, {
      q: params?.q,
      page,
      limit: pageSize,
      guideId: params?.guideId,
    });
    rows = rows.concat(payload.rows);
    if (rows.length >= payload.total || payload.rows.length === 0) {
      return rows;
    }
    page += 1;
  }
}

export async function listAllGuideCodes(
  resource: string,
  params?: { q?: string; guideId?: string; limit?: number }
) {
  const pageSize = Math.min(params?.limit ?? 100, 100);
  let page = 1;
  let rows: GuideCodeRecord[] = [];

  while (true) {
    const payload = await listGuideRecordPage(resource, {
      q: params?.q,
      page,
      limit: pageSize,
      guideId: params?.guideId,
      codesOnly: true,
    });
    rows = rows.concat(payload.rows as GuideCodeRecord[]);
    if (rows.length >= payload.total || payload.rows.length === 0) {
      return rows;
    }
    page += 1;
  }
}

export async function createGuideRecord(resource: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/guides/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function updateGuideRecord(
  resource: string,
  id: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(`/api/guides/${resource}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function deleteGuideRecord(resource: string, id: string) {
  const response = await fetch(`/api/guides/${resource}/${id}`, {
    method: "DELETE",
  });
  return parseResponse<{ success: boolean }>(response);
}
