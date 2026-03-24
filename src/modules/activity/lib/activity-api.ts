import type { PaginatedRecordsResponse } from "@/lib/types/paginated-records";

type ApiError = { message?: string };
export type ActivityCodeRecord = { id: string; code: string | null };

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(payload.message || "Activity request failed.");
  }
  return payload;
}

export async function listActivityRecords(
  resource: string,
  params?: { q?: string; limit?: number; activityId?: string; parentActivityId?: string }
) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.activityId) search.set("activityId", params.activityId);
  if (params?.parentActivityId) search.set("parentActivityId", params.parentActivityId);
  const response = await fetch(`/api/activities/${resource}?${search.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<Array<Record<string, unknown>>>(response);
}

export async function listActivityRecordPage(
  resource: string,
  params?: {
    q?: string;
    page?: number;
    limit?: number;
    activityId?: string;
    parentActivityId?: string;
    codesOnly?: boolean;
  }
) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.activityId) search.set("activityId", params.activityId);
  if (params?.parentActivityId) search.set("parentActivityId", params.parentActivityId);
  if (params?.codesOnly) search.set("codesOnly", "true");
  const response = await fetch(`/api/activities/${resource}?${search.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<PaginatedRecordsResponse>(response);
}

export async function listAllActivityRecords(
  resource: string,
  params?: { q?: string; activityId?: string; parentActivityId?: string; limit?: number }
) {
  const pageSize = Math.min(params?.limit ?? 100, 100);
  let page = 1;
  let rows: Array<Record<string, unknown>> = [];

  while (true) {
    const payload = await listActivityRecordPage(resource, {
      q: params?.q,
      page,
      limit: pageSize,
      activityId: params?.activityId,
      parentActivityId: params?.parentActivityId,
    });
    rows = rows.concat(payload.rows);
    if (rows.length >= payload.total || payload.rows.length === 0) {
      return rows;
    }
    page += 1;
  }
}

export async function listAllActivityCodes(
  resource: string,
  params?: { q?: string; activityId?: string; parentActivityId?: string; limit?: number }
) {
  const pageSize = Math.min(params?.limit ?? 100, 100);
  let page = 1;
  let rows: ActivityCodeRecord[] = [];

  while (true) {
    const payload = await listActivityRecordPage(resource, {
      q: params?.q,
      page,
      limit: pageSize,
      activityId: params?.activityId,
      parentActivityId: params?.parentActivityId,
      codesOnly: true,
    });
    rows = rows.concat(payload.rows as ActivityCodeRecord[]);
    if (rows.length >= payload.total || payload.rows.length === 0) {
      return rows;
    }
    page += 1;
  }
}

export async function createActivityRecord(
  resource: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(`/api/activities/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function updateActivityRecord(
  resource: string,
  id: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(`/api/activities/${resource}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function deleteActivityRecord(resource: string, id: string) {
  const response = await fetch(`/api/activities/${resource}/${id}`, {
    method: "DELETE",
  });
  return parseResponse<{ success: boolean }>(response);
}
