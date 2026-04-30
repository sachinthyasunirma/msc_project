import type { PreTourCategoryLookups } from "@/modules/pre-tour/shared/pre-tour-master-types";

type ApiError = {
  message?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(payload.message || "Failed to load pre-tour category lookups.");
  }
  return payload;
}

export async function listPreTourCategoryLookups(params?: { limit?: number }) {
  const search = new URLSearchParams();
  if (params?.limit) search.set("limit", String(params.limit));

  const response = await fetch(`/api/pre-tours/category-lookups?${search.toString()}`, {
    cache: "no-store",
  });

  return parseResponse<PreTourCategoryLookups>(response);
}
