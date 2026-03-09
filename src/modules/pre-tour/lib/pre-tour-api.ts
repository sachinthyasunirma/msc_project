type ApiError = { message?: string };

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(payload.message || "Pre-tour request failed.");
  }
  return payload;
}

export async function listPreTourRecords(
  resource: string,
  params?: {
    q?: string;
    limit?: number;
    planId?: string;
    dayId?: string;
    itemId?: string;
    visitId?: string;
  }
) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.limit) {
    search.set("limit", String(Math.min(Math.max(params.limit, 1), 500)));
  }
  if (params?.planId) search.set("planId", params.planId);
  if (params?.dayId) search.set("dayId", params.dayId);
  if (params?.itemId) search.set("itemId", params.itemId);
  if (params?.visitId) search.set("visitId", params.visitId);
  const response = await fetch(`/api/pre-tours/${resource}?${search.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<Array<Record<string, unknown>>>(response);
}

export async function createPreTourRecord(resource: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/pre-tours/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function createPreTourVersion(sourcePlanId: string) {
  const response = await fetch("/api/pre-tours/clone-version", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourcePlanId }),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function updatePreTourRecord(
  resource: string,
  id: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(`/api/pre-tours/${resource}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function deletePreTourRecord(resource: string, id: string) {
  const response = await fetch(`/api/pre-tours/${resource}/${id}`, {
    method: "DELETE",
  });
  return parseResponse<{ success: boolean }>(response);
}
