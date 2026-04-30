"use client";

import { useEffect, useState } from "react";
import type { Row } from "@/modules/pre-tour/shared/pre-tour-management-types";
import { PreTourRouteMapDialog } from "@/modules/pre-tour/ui/components/pre-tour-route-map-dialog";

type PreTourRouteMapDialogControllerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan: Row | null;
  routePathLabel: string;
  routeMapLocations: Array<{ id: string; name: string; coordinates: [number, number] }>;
  routeDataLoading: boolean;
  routeTransportLoaded: boolean;
};

export function PreTourRouteMapDialogController({
  open,
  onOpenChange,
  selectedPlan,
  routePathLabel,
  routeMapLocations,
  routeDataLoading,
  routeTransportLoaded,
}: PreTourRouteMapDialogControllerProps) {
  const [useRoadRoute, setUseRoadRoute] = useState(true);
  const [routeMeta, setRouteMeta] = useState<{ distanceKm: number | null; durationMin: number | null }>({
    distanceKm: null,
    durationMin: null,
  });

  useEffect(() => {
    if (!open) {
      setUseRoadRoute(true);
      setRouteMeta({ distanceKm: null, durationMin: null });
      return;
    }

    if (routeMapLocations.length === 0) {
      setRouteMeta({ distanceKm: null, durationMin: null });
    }
  }, [open, routeMapLocations.length]);

  return (
    <PreTourRouteMapDialog
      open={open}
      onOpenChange={onOpenChange}
      selectedPlan={selectedPlan}
      routePathLabel={routePathLabel}
      routeMapLocations={routeMapLocations}
      routeDataLoading={routeDataLoading}
      routeTransportLoaded={routeTransportLoaded}
      useRoadRoute={useRoadRoute}
      onUseRoadRouteChange={setUseRoadRoute}
      routeMeta={routeMeta}
      onRouteMetaChange={setRouteMeta}
    />
  );
}
