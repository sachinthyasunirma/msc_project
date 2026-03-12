"use client";

import type { BusinessNetworkManagementInitialData } from "@/modules/business-network/shared/business-network-management-types";
import type { BusinessNetworkResourceKey } from "@/modules/business-network/ui/views/business-network-management-view-impl";
import { BusinessNetworkManagementViewContent as BusinessNetworkManagementImpl } from "@/modules/business-network/ui/views/business-network-management-view-impl";

export function BusinessNetworkManagementSection({
  initialResource = "organizations",
  initialData = null,
}: {
  initialResource?: BusinessNetworkResourceKey;
  initialData?: BusinessNetworkManagementInitialData | null;
  isReadOnly: boolean;
}) {
  return (
    <BusinessNetworkManagementImpl initialResource={initialResource} initialData={initialData} />
  );
}
