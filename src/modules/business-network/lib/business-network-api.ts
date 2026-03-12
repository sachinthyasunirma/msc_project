type ApiError = { message?: string };

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(payload.message || "Business network request failed.");
  }
  return payload;
}

export async function listBusinessNetworkRecords(
  resource: string,
  params?: {
    q?: string;
    limit?: number;
    organizationId?: string;
    operatorOrgId?: string;
    marketOrgId?: string;
  }
) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.organizationId) search.set("organizationId", params.organizationId);
  if (params?.operatorOrgId) search.set("operatorOrgId", params.operatorOrgId);
  if (params?.marketOrgId) search.set("marketOrgId", params.marketOrgId);

  const response = await fetch(`/api/business-networks/${resource}?${search.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<Array<Record<string, unknown>>>(response);
}

export async function createBusinessNetworkRecord(
  resource: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(`/api/business-networks/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function updateBusinessNetworkRecord(
  resource: string,
  id: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(`/api/business-networks/${resource}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function deleteBusinessNetworkRecord(resource: string, id: string) {
  const response = await fetch(`/api/business-networks/${resource}/${id}`, {
    method: "DELETE",
  });
  return parseResponse<{ success: boolean }>(response);
}
