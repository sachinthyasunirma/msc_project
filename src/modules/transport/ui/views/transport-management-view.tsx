"use client";

import { useTransportAccess } from "@/modules/transport/lib/use-transport-access";
import type { TransportResourceKey } from "@/modules/transport/shared/transport-management-types";
import { TransportManagementSection } from "@/modules/transport/ui/components/transport-management-section";

export type { TransportResourceKey } from "@/modules/transport/shared/transport-management-types";

export function TransportManagementView({
  initialResource = "locations",
}: {
  initialResource?: TransportResourceKey;
}) {
  const { isReadOnly } = useTransportAccess();

  return <TransportManagementSection initialResource={initialResource} isReadOnly={isReadOnly} />;
}
