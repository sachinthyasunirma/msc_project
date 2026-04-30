"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { Switch } from "@/components/ui/switch";
import { PreTourRouteMap } from "@/modules/pre-tour/ui/components/pre-tour-route-map";
import { formatDate } from "@/modules/pre-tour/lib/pre-tour-management-utils";

type PreTourRouteMapDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan: Record<string, unknown> | null;
  routePathLabel: string;
  routeMapLocations: Array<{ id: string; name: string; coordinates: [number, number] }>;
  routeDataLoading: boolean;
  routeTransportLoaded: boolean;
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
  routeDataLoading,
  routeTransportLoaded,
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
          <div className="grid gap-2 rounded-md border bg-muted/20 p-3 text-xs sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <div>
                <p className="font-medium text-foreground">Road Routing</p>
                <p className="text-[11px] text-muted-foreground">
                  Toggle real-road routing or direct straight-line path.
                </p>
              </div>
              <Switch
                checked={useRoadRoute}
                onCheckedChange={onUseRoadRouteChange}
                disabled={routeDataLoading || !routeTransportLoaded || routeMapLocations.length === 0}
              />
            </div>
            <div className="text-muted-foreground">
              Distance:{" "}
              <span className="font-medium text-foreground">
                {routeMeta.distanceKm !== null ? `${routeMeta.distanceKm.toFixed(2)} km` : "-"}
              </span>
            </div>
            <div className="text-muted-foreground">
              Duration:{" "}
              <span className="font-medium text-foreground">
                {routeMeta.durationMin !== null ? `${routeMeta.durationMin.toFixed(1)} min` : "-"}
              </span>
            </div>
          </div>
          {routeDataLoading || !routeTransportLoaded ? (
            <div className="flex h-[52vh] min-h-[260px] max-h-[680px] items-center justify-center rounded-md border bg-muted/20 px-4 sm:h-[58vh] lg:h-[64vh]">
              <LoadingState
                compact
                title="Loading route map"
                description="Fetching transport stops and preparing the map preview."
              />
            </div>
          ) : routeMapLocations.length > 0 ? (
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
