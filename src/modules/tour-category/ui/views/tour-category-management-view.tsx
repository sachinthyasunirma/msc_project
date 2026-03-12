"use client";

import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import type { TourCategoryManagementInitialData } from "@/modules/tour-category/shared/tour-category-management-types";
import type { TourCategoryResourceKey } from "@/modules/tour-category/shared/tour-category-schemas";
import { TourCategoryManagementSection } from "@/modules/tour-category/ui/components/tour-category-management-section";

export function TourCategoryManagementView({
  initialResource = "tour-category-types",
  initialData = null,
}: {
  initialResource?: TourCategoryResourceKey;
  initialData?: TourCategoryManagementInitialData | null;
}) {
  const { isReadOnly } = useDashboardAccessState();

  return (
    <TourCategoryManagementSection
      initialResource={initialResource}
      initialData={initialData}
      isReadOnly={isReadOnly}
    />
  );
}
