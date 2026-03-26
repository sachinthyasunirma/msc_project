"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/loading-state";
import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import type { TechnicalVisitManagementInitialData } from "@/modules/technical-visit/shared/technical-visit-management-types";
import type { TechnicalVisitResourceKey } from "@/modules/technical-visit/shared/technical-visit-schemas";

const TechnicalVisitManagementSection = dynamic(
  () =>
    import("@/modules/technical-visit/ui/components/technical-visit-management-section").then(
      (module) => module.TechnicalVisitManagementSection
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading visit workspace"
        description="Preparing field visits, checklists, and follow-up actions."
      />
    ),
  }
);

export function TechnicalVisitManagementView({
  initialResource = "technical-visits",
  initialData = null,
}: {
  initialResource?: TechnicalVisitResourceKey;
  initialData?: TechnicalVisitManagementInitialData | null;
}) {
  const { isReadOnly } = useDashboardAccessState();

  return (
    <TechnicalVisitManagementSection
      initialResource={initialResource}
      initialData={initialData}
      isReadOnly={isReadOnly}
    />
  );
}
