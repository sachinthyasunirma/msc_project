"use client";

import type { CurrencyManagementInitialData } from "@/modules/currency/shared/currency-management-types";
import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import type { CurrencyResourceKey } from "@/modules/currency/ui/components/currency-management/currency-management-config";
import { CurrencyManagementSection } from "@/modules/currency/ui/components/currency-management/currency-management-section";

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
