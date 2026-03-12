"use client";

import { TransportResourceTab } from "@/modules/transport/ui/components/transport-manage/transport-resource-tab";
import type { TransportResourceKey } from "@/modules/transport/shared/transport-management-types";

type Props = Omit<React.ComponentProps<typeof TransportResourceTab>, "resource">;

export function LocationsTab(props: Props) {
  return <TransportResourceTab resource={"locations" satisfies TransportResourceKey} {...props} />;
}
