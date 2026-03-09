"use client";

import { authClient } from "@/lib/auth-client";
import { BusinessNetworkManagementSection } from "@/modules/business-network/ui/components/business-network-management-section";
export { BusinessNetworkManagementViewContent } from "@/modules/business-network/ui/views/business-network-management-view-impl";

export type { BusinessNetworkResourceKey } from "@/modules/business-network/ui/views/business-network-management-view-impl";

export function BusinessNetworkManagementView() {
  const { data: session } = authClient.useSession();
  const accessUser = session?.user as
    | { readOnly?: boolean; role?: string | null; canWriteMasterData?: boolean }
    | undefined;
  const canWrite =
    Boolean(accessUser) &&
    !Boolean(accessUser?.readOnly) &&
    (accessUser?.role === "ADMIN" ||
      accessUser?.role === "MANAGER" ||
      Boolean(accessUser?.canWriteMasterData));
  const isReadOnly = !canWrite;

  return <BusinessNetworkManagementSection initialResource="organizations" isReadOnly={isReadOnly} />;
}
