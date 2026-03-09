"use client";

import type { BusinessNetworkResourceKey } from "@/modules/business-network/ui/views/business-network-management-view-impl";
import { BusinessNetworkManagementViewContent as BusinessNetworkManagementImpl } from "@/modules/business-network/ui/views/business-network-management-view-impl";

export function BusinessNetworkManagementSection({
  initialResource = "organizations",
  isReadOnly: _isReadOnly,
}: {
  initialResource?: BusinessNetworkResourceKey;
  isReadOnly: boolean;
}) {
  return <BusinessNetworkManagementImpl initialResource={initialResource} />;
}
