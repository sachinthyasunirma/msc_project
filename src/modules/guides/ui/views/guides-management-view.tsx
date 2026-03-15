"use client";

import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import type { GuideResourceKey } from "@/modules/guides/shared/guides-management-config";
import type { GuidesManagementInitialData } from "@/modules/guides/shared/guides-management-types";
import { GuidesManagementSection } from "@/modules/guides/ui/components/guides-management-section";

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
