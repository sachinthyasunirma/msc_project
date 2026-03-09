"use client";

import type { TechnicalVisitManagementInitialData } from "@/modules/technical-visit/shared/technical-visit-management-types";
import type { TechnicalVisitResourceKey } from "@/modules/technical-visit/shared/technical-visit-schemas";
import { TechnicalVisitManagementView as TechnicalVisitManagementImpl } from "@/modules/technical-visit/ui/views/technical-visit-management-view-impl";

export function TechnicalVisitManagementSection({
  initialResource = "technical-visits",
  initialData = null,
}: {
  initialResource?: TechnicalVisitResourceKey;
  initialData?: TechnicalVisitManagementInitialData | null;
  isReadOnly: boolean;
}) {
  return <TechnicalVisitManagementImpl initialResource={initialResource} initialData={initialData} />;
}
