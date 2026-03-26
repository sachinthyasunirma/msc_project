import type { PaginatedRecordsResponse } from "@/lib/types/paginated-records";

type ApiError = { message?: string };
export type CurrencyCodeRecord = { id: string; code: string | null };

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

export async function listCurrencyRecordPage(
  resource: string,
  params?: {
    q?: string;
    page?: number;
    limit?: number;
    currencyId?: string;
    codesOnly?: boolean;
  }
) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.currencyId) search.set("currencyId", params.currencyId);
  if (params?.codesOnly) search.set("codesOnly", "true");
  const response = await fetch(`/api/currencies/${resource}?${search.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<PaginatedRecordsResponse>(response);
}

export async function listAllCurrencyRecords(
  resource: string,
  params?: { q?: string; currencyId?: string; limit?: number }
) {
  const pageSize = Math.min(params?.limit ?? 100, 100);
  let page = 1;
  let rows: Array<Record<string, unknown>> = [];

  while (true) {
    const payload = await listCurrencyRecordPage(resource, {
      q: params?.q,
      page,
      limit: pageSize,
      currencyId: params?.currencyId,
    });
    rows = rows.concat(payload.rows);
    if (rows.length >= payload.total || payload.rows.length === 0) {
      return rows;
    }
    page += 1;
  }
}

export async function listAllCurrencyCodes(
  resource: string,
  params?: { q?: string; currencyId?: string; limit?: number }
) {
  const pageSize = Math.min(params?.limit ?? 100, 100);
  let page = 1;
  let rows: CurrencyCodeRecord[] = [];

  while (true) {
    const payload = await listCurrencyRecordPage(resource, {
      q: params?.q,
      page,
      limit: pageSize,
      currencyId: params?.currencyId,
      codesOnly: true,
    });
    rows = rows.concat(payload.rows as CurrencyCodeRecord[]);
    if (rows.length >= payload.total || payload.rows.length === 0) {
      return rows;
    }
    page += 1;
  }
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
