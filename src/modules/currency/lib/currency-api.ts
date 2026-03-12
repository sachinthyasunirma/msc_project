type ApiError = { message?: string };

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(payload.message || "Currency request failed.");
  }
  return payload;
}

export async function listCurrencyRecords(
  resource: string,
  params?: { q?: string; limit?: number; currencyId?: string }
) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.currencyId) search.set("currencyId", params.currencyId);
  const response = await fetch(`/api/currencies/${resource}?${search.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<Array<Record<string, unknown>>>(response);
}

export async function createCurrencyRecord(
  resource: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(`/api/currencies/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function updateCurrencyRecord(
  resource: string,
  id: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(`/api/currencies/${resource}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function deleteCurrencyRecord(resource: string, id: string) {
  const response = await fetch(`/api/currencies/${resource}/${id}`, {
    method: "DELETE",
  });
  return parseResponse<{ success: boolean }>(response);
}
