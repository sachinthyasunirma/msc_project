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
};

export function PreTourRouteMapDialogController({
  open,
  onOpenChange,
  selectedPlan,
  routePathLabel,
  routeMapLocations,
}: PreTourRouteMapDialogControllerProps) {
  const [useRoadRoute, setUseRoadRoute] = useState(true);
  const [routeMeta, setRouteMeta] = useState<{ distanceKm: number | null; durationMin: number | null }>({
    distanceKm: null,
    durationMin: null,
  });

  useEffect(() => {
    if (routeMapLocations.length > 0) return;
    setRouteMeta({ distanceKm: null, durationMin: null });
    if (open) onOpenChange(false);
  }, [onOpenChange, open, routeMapLocations.length]);

  return (
    <PreTourRouteMapDialog
      open={open}
      onOpenChange={onOpenChange}
      selectedPlan={selectedPlan}
      routePathLabel={routePathLabel}
      routeMapLocations={routeMapLocations}
      useRoadRoute={useRoadRoute}
      onUseRoadRouteChange={setUseRoadRoute}
      routeMeta={routeMeta}
      onRouteMetaChange={setRouteMeta}
    />
  );
}
