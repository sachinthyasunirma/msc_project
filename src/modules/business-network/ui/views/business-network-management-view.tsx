"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/loading-state";
import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import type { BusinessNetworkResourceKey } from "@/modules/business-network/shared/business-network-management-config";
import type { BusinessNetworkManagementInitialData } from "@/modules/business-network/shared/business-network-management-types";

const BusinessNetworkManagementSection = dynamic(
  () =>
    import("@/modules/business-network/ui/components/business-network-management-section").then(
      (module) => module.BusinessNetworkManagementSection
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading network workspace"
        description="Preparing organizations, profiles, and contracts."
      />
    ),
  }
);

export function BusinessNetworkManagementView({
  initialResource = "organizations",
  initialData = null,
}: {
  initialResource?: BusinessNetworkResourceKey;
  initialData?: BusinessNetworkManagementInitialData | null;
} = {}) {
  const { isReadOnly } = useDashboardAccessState();

  return (
    <BusinessNetworkManagementSection
      initialResource={initialResource}
      initialData={initialData}
      isReadOnly={isReadOnly}
    />
  );
}

export type { BusinessNetworkResourceKey };
