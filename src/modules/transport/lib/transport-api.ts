import { transportResourceSchema } from "@/modules/transport/shared/transport-schemas";
import type { TransportListPage } from "@/modules/transport/shared/transport-management-types";

export type TransportResource = ReturnType<typeof transportResourceSchema.parse>;
export type TransportCodeRecord = { id: string; code: string | null };

type TransportErrorShape = {
  message?: string;
  code?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  let payload: (T & TransportErrorShape) | null = null;
  try {
    payload = (await response.json()) as T & TransportErrorShape;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const code = payload?.code ? ` [${payload.code}]` : "";
    const message = payload?.message || response.statusText || "Transport request failed.";
    throw new Error(`${message}${code}`);
  }
  if (payload === null) {
    throw new Error("Transport API returned an empty or invalid response.");
  }
  return payload;
}

function ensureResource(resource: string) {
  return transportResourceSchema.parse(resource);
}

export async function listTransportRecords(
  resource: string,
  params?: { q?: string; ids?: string[]; page?: number; limit?: number; codesOnly?: boolean }
) {
  const validated = ensureResource(resource);
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.ids && params.ids.length > 0) search.set("ids", params.ids.join(","));
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.codesOnly) search.set("codesOnly", "true");
  const response = await fetch(`/api/transports/${validated}?${search.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<TransportListPage>(response);
}

export async function listAllTransportRecords(resource: string, params?: { q?: string; limit?: number }) {
  const pageSize = params?.limit ?? 500;
  let page = 1;
  let collected: Array<Record<string, unknown>> = [];

  while (true) {
    const payload = await listTransportRecords(resource, {
      q: params?.q,
      page,
      limit: pageSize,
    });
    collected = collected.concat(payload.rows);
    if (collected.length >= payload.total || payload.rows.length === 0) {
      return collected;
    }
    page += 1;
  }
}

export async function listAllTransportCodes(resource: string, params?: { q?: string; limit?: number }) {
  const pageSize = params?.limit ?? 100;
  let page = 1;
  let collected: TransportCodeRecord[] = [];

  while (true) {
    const payload = await listTransportRecords(resource, {
      q: params?.q,
      page,
      limit: pageSize,
      codesOnly: true,
    });
    collected = collected.concat(payload.rows as TransportCodeRecord[]);
    if (collected.length >= payload.total || payload.rows.length === 0) {
      return collected;
    }
    page += 1;
  }
}

export async function createTransportRecord(
  resource: string,
  payload: Record<string, unknown>
) {
  const validated = ensureResource(resource);
  const response = await fetch(`/api/transports/${validated}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function updateTransportRecord(
  resource: string,
  id: string,
  payload: Record<string, unknown>
) {
  const validated = ensureResource(resource);
  const response = await fetch(`/api/transports/${validated}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function deleteTransportRecord(resource: string, id: string) {
  const validated = ensureResource(resource);
  const response = await fetch(`/api/transports/${validated}/${id}`, {
    method: "DELETE",
  });
  return parseResponse<{ success: boolean }>(response);
}
