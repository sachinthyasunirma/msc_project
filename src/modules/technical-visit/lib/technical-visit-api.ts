import {
  technicalVisitResourceSchema,
  type TechnicalVisitResourceKey,
} from "@/modules/technical-visit/shared/technical-visit-schemas";

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(body.message || "Technical visit request failed.");
  }
  return body;
}

export async function listTechnicalVisitRecords(
  resource: TechnicalVisitResourceKey,
  params?: { q?: string; limit?: number; visitId?: string; visitType?: string }
) {
  technicalVisitResourceSchema.parse(resource);
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.visitId) search.set("visitId", params.visitId);
  if (params?.visitType) search.set("visitType", params.visitType);

  const response = await fetch(`/api/technical-visits/${resource}?${search.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<Array<Record<string, unknown>>>(response);
}

export async function createTechnicalVisitRecord(
  resource: TechnicalVisitResourceKey,
  payload: Record<string, unknown>
) {
  technicalVisitResourceSchema.parse(resource);
  const response = await fetch(`/api/technical-visits/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function updateTechnicalVisitRecord(
  resource: TechnicalVisitResourceKey,
  id: string,
  payload: Record<string, unknown>
) {
  technicalVisitResourceSchema.parse(resource);
  const response = await fetch(`/api/technical-visits/${resource}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Record<string, unknown>>(response);
}

export async function deleteTechnicalVisitRecord(resource: TechnicalVisitResourceKey, id: string) {
  technicalVisitResourceSchema.parse(resource);
  const response = await fetch(`/api/technical-visits/${resource}/${id}`, {
    method: "DELETE",
  });
  return parseResponse<{ success: boolean }>(response);
}
