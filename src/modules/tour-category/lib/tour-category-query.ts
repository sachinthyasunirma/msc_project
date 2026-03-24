import type { TourCategoryResourceKey } from "@/modules/tour-category/shared/tour-category-schemas";

type TourCategoryRecordsInput = {
  resource: TourCategoryResourceKey;
  q?: string;
  page?: number;
  limit?: number;
};

export const tourCategoryKeys = {
  all: ["tour-category-management"] as const,
  lookups: () => [...tourCategoryKeys.all, "lookups"] as const,
  recordsRoot: () => [...tourCategoryKeys.all, "records"] as const,
  recordsByResource: (resource: TourCategoryResourceKey) =>
    [...tourCategoryKeys.recordsRoot(), resource] as const,
  records: (input: TourCategoryRecordsInput) =>
    [
      ...tourCategoryKeys.recordsByResource(input.resource),
      {
        q: input.q ?? "",
        page: input.page ?? 1,
        limit: input.limit ?? 25,
      },
    ] as const,
};

export function buildTourCategoryRecordsParams(input: TourCategoryRecordsInput) {
  return {
    q: input.q,
    page: input.page ?? 1,
    limit: input.limit ?? 25,
  };
}
