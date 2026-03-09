"use client";

import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import type { TechnicalVisitManagementInitialData } from "@/modules/technical-visit/shared/technical-visit-management-types";
import type { TechnicalVisitResourceKey } from "@/modules/technical-visit/shared/technical-visit-schemas";
import { TechnicalVisitManagementSection } from "@/modules/technical-visit/ui/components/technical-visit-management-section";

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
