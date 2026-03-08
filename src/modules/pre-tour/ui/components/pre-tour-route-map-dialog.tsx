"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PreTourRouteMap } from "@/modules/pre-tour/ui/components/pre-tour-route-map";
import { formatDate } from "@/modules/pre-tour/ui/views/pre-tour-management/utils";

type PreTourRouteMapDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan: Record<string, unknown> | null;
  routePathLabel: string;
  routeMapLocations: Array<{ id: string; name: string; coordinates: [number, number] }>;
  useRoadRoute: boolean;
  onUseRoadRouteChange: (value: boolean) => void;
  routeMeta: { distanceKm: number | null; durationMin: number | null };
  onRouteMetaChange: (meta: { distanceKm: number | null; durationMin: number | null }) => void;
};

export function PreTourRouteMapDialog({
  open,
  onOpenChange,
  selectedPlan,
  routePathLabel,
  routeMapLocations,
  useRoadRoute,
  onUseRoadRouteChange,
  routeMeta,
  onRouteMetaChange,
}: PreTourRouteMapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Pre-Tour Route Map</DialogTitle>
          <DialogDescription>Visual route across all days based on start/end locations.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <p>
              Header: <span className="font-medium text-foreground">{String(selectedPlan?.code || "-")}</span>
            </p>
            <p>
              Date Range:{" "}
              <span className="font-medium text-foreground">
                {formatDate(selectedPlan?.startDate)} - {formatDate(selectedPlan?.endDate)}
              </span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Locations: <span className="font-medium text-foreground">{routePathLabel || "-"}</span>
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="inline-flex items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                checked={useRoadRoute}
                onChange={(event) => onUseRoadRouteChange(event.target.checked)}
              />
              Use real road route
            </label>
            <span className="text-muted-foreground">
              Distance:{" "}
              <span className="font-medium text-foreground">
                {routeMeta.distanceKm !== null ? `${routeMeta.distanceKm.toFixed(2)} km` : "-"}
              </span>
            </span>
            <span className="text-muted-foreground">
              Duration:{" "}
              <span className="font-medium text-foreground">
                {routeMeta.durationMin !== null ? `${routeMeta.durationMin.toFixed(1)} min` : "-"}
              </span>
            </span>
          </div>
          {routeMapLocations.length > 0 ? (
            <PreTourRouteMap
              locations={routeMapLocations}
              useRoadRoute={useRoadRoute}
              onRouteMetaChange={onRouteMetaChange}
            />
          ) : (
            <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
              No mapped coordinates found for selected locations.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

