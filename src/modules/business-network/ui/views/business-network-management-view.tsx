"use client";

import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import type { BusinessNetworkManagementInitialData } from "@/modules/business-network/shared/business-network-management-types";
import { BusinessNetworkManagementSection } from "@/modules/business-network/ui/components/business-network-management-section";
export { BusinessNetworkManagementViewContent } from "@/modules/business-network/ui/views/business-network-management-view-impl";

export type { BusinessNetworkResourceKey } from "@/modules/business-network/shared/business-network-management-config";

export function BusinessNetworkManagementView({
  initialData = null,
}: {
  initialData?: BusinessNetworkManagementInitialData | null;
} = {}) {
  const { isReadOnly } = useDashboardAccessState();

  return (
    <BusinessNetworkManagementSection
      initialResource="organizations"
      initialData={initialData}
      isReadOnly={isReadOnly}
    />
  );
}
