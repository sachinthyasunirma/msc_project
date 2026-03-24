"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/loading-state";
import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import type { TaxManagementInitialData } from "@/modules/tax/shared/tax-management-types";
import type { TaxResourceKey } from "@/modules/tax/ui/components/tax-management/tax-management-config";

const TaxManagementSection = dynamic(
  () =>
    import("@/modules/tax/ui/components/tax-management/tax-management-section").then(
      (module) => module.TaxManagementSection
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading tax workspace"
        description="Preparing tax rules, jurisdictions, and snapshot tools."
      />
    ),
  }
);

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
