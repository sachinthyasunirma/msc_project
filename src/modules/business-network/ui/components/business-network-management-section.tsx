"use client";

import type { BusinessNetworkResourceKey } from "@/modules/business-network/shared/business-network-management-config";
import type { BusinessNetworkManagementInitialData } from "@/modules/business-network/shared/business-network-management-types";
import { BusinessNetworkManagementViewContent as BusinessNetworkManagementImpl } from "@/modules/business-network/ui/views/business-network-management-view-impl";

export function BusinessNetworkManagementSection({
  initialResource = "organizations",
  initialData = null,
  isReadOnly,
}: {
  initialResource?: BusinessNetworkResourceKey;
  initialData?: BusinessNetworkManagementInitialData | null;
  isReadOnly: boolean;
}) {
  return (
    <BusinessNetworkManagementImpl
      initialResource={initialResource}
      initialData={initialData}
      isReadOnly={isReadOnly}
    />
  );
}
