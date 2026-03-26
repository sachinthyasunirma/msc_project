"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/loading-state";
import type { CurrencyManagementInitialData } from "@/modules/currency/shared/currency-management-types";
import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import type { CurrencyResourceKey } from "@/modules/currency/ui/components/currency-management/currency-management-config";

const CurrencyManagementSection = dynamic(
  () =>
    import("@/modules/currency/ui/components/currency-management/currency-management-section").then(
      (module) => module.CurrencyManagementSection
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading currency workspace"
        description="Preparing currencies, FX providers, and rate tools."
      />
    ),
  }
);

export function CurrencyManagementView({
  initialResource = "currencies",
  managedCurrencyId = "",
  initialData = null,
}: {
  initialResource?: CurrencyResourceKey;
  managedCurrencyId?: string;
  initialData?: CurrencyManagementInitialData | null;
}) {
  const { isReadOnly } = useDashboardAccessState();

  return (
    <CurrencyManagementSection
      initialResource={initialResource}
      managedCurrencyId={managedCurrencyId}
      initialData={initialData}
      isReadOnly={isReadOnly}
    />
  );
}

export type { CurrencyResourceKey };
