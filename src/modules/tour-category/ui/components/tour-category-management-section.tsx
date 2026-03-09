"use client";

import type { TourCategoryResourceKey } from "@/modules/tour-category/shared/tour-category-schemas";
import { TourCategoryManagementView as TourCategoryManagementImpl } from "@/modules/tour-category/ui/views/tour-category-management-view-impl";

export function TourCategoryManagementSection({
  initialResource = "tour-category-types",
  isReadOnly: _isReadOnly,
}: {
  initialResource?: TourCategoryResourceKey;
  isReadOnly: boolean;
}) {
  return <TourCategoryManagementImpl initialResource={initialResource} />;
}
