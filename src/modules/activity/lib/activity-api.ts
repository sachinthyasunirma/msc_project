type ApiError = { message?: string };

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
