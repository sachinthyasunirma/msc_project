import type { TourCategoryResourceKey } from "@/modules/tour-category/shared/tour-category-schemas";

export type TourCategoryManagementInitialData = {
  resource: TourCategoryResourceKey;
  records: Array<Record<string, unknown>>;
  types: Array<Record<string, unknown>>;
  categories: Array<Record<string, unknown>>;
};
