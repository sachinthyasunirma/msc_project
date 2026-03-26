"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/loading-state";
import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import type { GuideResourceKey } from "@/modules/guides/shared/guides-management-config";
import type { GuidesManagementInitialData } from "@/modules/guides/shared/guides-management-types";

const GuidesManagementSection = dynamic(
  () =>
    import("@/modules/guides/ui/components/guides-management-section").then(
      (module) => module.GuidesManagementSection
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading guide workspace"
        description="Preparing guide profiles, rates, and assignments."
      />
    ),
  }
);

export function GuidesManagementView({
  initialResource = "guides",
  managedGuideId = "",
  initialData = null,
}: {
  initialResource?: GuideResourceKey;
  managedGuideId?: string;
  initialData?: GuidesManagementInitialData | null;
}) {
  const { isReadOnly } = useDashboardAccessState();

  return (
    <GuidesManagementSection
      initialResource={initialResource}
      managedGuideId={managedGuideId}
      initialData={initialData}
      isReadOnly={isReadOnly}
    />
  );
}

export type { GuideResourceKey };
