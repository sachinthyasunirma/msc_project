import { transportResourceSchema } from "@/modules/transport/shared/transport-schemas";

export type TransportResource = ReturnType<typeof transportResourceSchema.parse>;

type TransportErrorShape = {
  message?: string;
  code?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & TransportErrorShape;
  if (!response.ok) {
    throw new Error(payload.message || "Transport request failed.");
  }
  return payload;
}

function ensureResource(resource: string) {
  return transportResourceSchema.parse(resource);
}

export async function listTransportRecords(
  resource: string,
  params?: { q?: string; limit?: number }
) {
  const validated = ensureResource(resource);
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.limit) search.set("limit", String(params.limit));
  const response = await fetch(`/api/transports/${validated}?${search.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<Array<Record<string, unknown>>>(response);
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

