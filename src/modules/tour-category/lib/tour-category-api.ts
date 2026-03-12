import {
  tourCategoryResourceSchema,
  type TourCategoryResourceKey,
} from "@/modules/tour-category/shared/tour-category-schemas";

async function parseResponse(response: Response) {
  const body = (await response.json()) as
    | { code?: string; message?: string }
    | Array<Record<string, unknown>>
    | Record<string, unknown>;
  if (!response.ok) {
    throw new Error((body as { message?: string }).message || "Request failed.");
  }
  return body;
}

export async function listTourCategoryRecords(
  resource: TourCategoryResourceKey,
  params?: { q?: string; limit?: number; typeId?: string; categoryId?: string }
) {
  tourCategoryResourceSchema.parse(resource);
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.typeId) search.set("typeId", params.typeId);
  if (params?.categoryId) search.set("categoryId", params.categoryId);
  const response = await fetch(`/api/tour-categories/${resource}?${search.toString()}`, {
    cache: "no-store",
  });
  return (await parseResponse(response)) as Array<Record<string, unknown>>;
}

export async function createTourCategoryRecord(
  resource: TourCategoryResourceKey,
  payload: Record<string, unknown>
) {
  tourCategoryResourceSchema.parse(resource);
  const response = await fetch(`/api/tour-categories/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await parseResponse(response)) as Record<string, unknown>;
}

export async function updateTourCategoryRecord(
  resource: TourCategoryResourceKey,
  id: string,
  payload: Record<string, unknown>
) {
  tourCategoryResourceSchema.parse(resource);
  const response = await fetch(`/api/tour-categories/${resource}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await parseResponse(response)) as Record<string, unknown>;
}

export async function deleteTourCategoryRecord(resource: TourCategoryResourceKey, id: string) {
  tourCategoryResourceSchema.parse(resource);
  const response = await fetch(`/api/tour-categories/${resource}/${id}`, {
    method: "DELETE",
  });
  await parseResponse(response);
}
