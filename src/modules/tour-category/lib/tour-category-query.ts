import type { TourCategoryResourceKey } from "@/modules/tour-category/shared/tour-category-schemas";

type TourCategoryRecordsInput = {
  resource: TourCategoryResourceKey;
  q?: string;
  limit?: number;
};

export const tourCategoryKeys = {
  all: ["tour-category-management"] as const,
  lookups: () => [...tourCategoryKeys.all, "lookups"] as const,
  recordsRoot: () => [...tourCategoryKeys.all, "records"] as const,
  records: (input: TourCategoryRecordsInput) =>
    [
      ...tourCategoryKeys.recordsRoot(),
      {
        resource: input.resource,
        q: input.q ?? "",
        limit: input.limit ?? 500,
      },
    ] as const,
};

export function buildTourCategoryRecordsParams(input: TourCategoryRecordsInput) {
  return {
    q: input.q,
    limit: input.limit ?? 500,
  };
}
