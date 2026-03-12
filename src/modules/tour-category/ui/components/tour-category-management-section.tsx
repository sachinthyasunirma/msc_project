"use client";

import type { TourCategoryManagementInitialData } from "@/modules/tour-category/shared/tour-category-management-types";
import type { TourCategoryResourceKey } from "@/modules/tour-category/shared/tour-category-schemas";
import { TourCategoryManagementView as TourCategoryManagementImpl } from "@/modules/tour-category/ui/views/tour-category-management-view-impl";

export function TourCategoryManagementSection({
  initialResource = "tour-category-types",
  initialData = null,
  isReadOnly,
}: {
  initialResource?: TourCategoryResourceKey;
  initialData?: TourCategoryManagementInitialData | null;
  isReadOnly: boolean;
}) {
  void isReadOnly;
  return <TourCategoryManagementImpl initialResource={initialResource} initialData={initialData} />;
}
