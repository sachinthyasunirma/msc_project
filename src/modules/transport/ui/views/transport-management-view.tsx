"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/loading-state";
import { useTransportAccess } from "@/modules/transport/lib/use-transport-access";
import type { TransportResourceKey } from "@/modules/transport/shared/transport-management-types";
import type { TransportManagementInitialData } from "@/modules/transport/shared/transport-management-types";

const TransportManagementSection = dynamic(
  () =>
    import("@/modules/transport/ui/components/transport-management-section").then(
      (module) => module.TransportManagementSection
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading transport workspace"
        description="Preparing routes, rates, and fleet tools."
      />
    ),
  }
);

export type { TransportResourceKey } from "@/modules/transport/shared/transport-management-types";

export function TransportManagementView({
  initialResource = "locations",
  initialData = null,
}: {
  initialResource?: TransportResourceKey;
  initialData?: TransportManagementInitialData | null;
}) {
  const { isReadOnly } = useTransportAccess();

  return (
    <TransportManagementSection
      initialResource={initialResource}
      initialData={initialData}
      isReadOnly={isReadOnly}
    />
  );
}
