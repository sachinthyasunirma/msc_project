"use client";

import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import type { TaxManagementInitialData } from "@/modules/tax/shared/tax-management-types";
import type { TaxResourceKey } from "@/modules/tax/ui/components/tax-management/tax-management-config";
import { TaxManagementSection } from "@/modules/tax/ui/components/tax-management/tax-management-section";

export function TaxManagementView({
  initialResource = "taxes",
  managedTaxId = "",
  initialData = null,
}: {
  initialResource?: TaxResourceKey;
  managedTaxId?: string;
  initialData?: TaxManagementInitialData | null;
}) {
  const { isReadOnly } = useDashboardAccessState();

  return (
    <TaxManagementSection
      initialResource={initialResource}
      managedTaxId={managedTaxId}
      initialData={initialData}
      isReadOnly={isReadOnly}
    />
  );
}

export type { TaxResourceKey };
