"use client";

import { TransportResourceTab } from "@/modules/transport/ui/components/transport-manage/transport-resource-tab";
import type { TransportResourceKey } from "@/modules/transport/shared/transport-management-types";

type Props = Omit<React.ComponentProps<typeof TransportResourceTab>, "resource">;

export function PaxVehicleRatesTab(props: Props) {
  return <TransportResourceTab resource={"pax-vehicle-rates" satisfies TransportResourceKey} {...props} />;
}
