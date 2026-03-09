"use client";

import type { TechnicalVisitResourceKey } from "@/modules/technical-visit/shared/technical-visit-schemas";
import { TechnicalVisitManagementView as TechnicalVisitManagementImpl } from "@/modules/technical-visit/ui/views/technical-visit-management-view-impl";

export function TechnicalVisitManagementSection({
  initialResource = "technical-visits",
  isReadOnly: _isReadOnly,
}: {
  initialResource?: TechnicalVisitResourceKey;
  isReadOnly: boolean;
}) {
  return <TechnicalVisitManagementImpl initialResource={initialResource} />;
}
