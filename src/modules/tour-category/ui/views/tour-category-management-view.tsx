"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/loading-state";
import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import type { TourCategoryManagementInitialData } from "@/modules/tour-category/shared/tour-category-management-types";
import type { TourCategoryResourceKey } from "@/modules/tour-category/shared/tour-category-schemas";

const TourCategoryManagementSection = dynamic(
  () =>
    import("@/modules/tour-category/ui/components/tour-category-management-section").then(
      (module) => module.TourCategoryManagementSection
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading category workspace"
        description="Preparing category types, groups, and rule controls."
      />
    ),
  }
);

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
