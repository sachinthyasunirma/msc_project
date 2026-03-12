"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/loading-state";

export type PreTourRouteMapLocation = {
  id: string;
  name: string;
  coordinates: [number, number];
};

export type PreTourRouteMeta = {
  distanceKm: number | null;
  durationMin: number | null;
};

const PreTourRouteMapLeaflet = dynamic(
  () =>
    import("./pre-tour-route-map-leaflet").then((module) => ({
      default: module.PreTourRouteMapLeaflet,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[52vh] min-h-[260px] max-h-[680px] items-center justify-center rounded-md border bg-muted/20 px-4 sm:h-[58vh] lg:h-[64vh]">
        <LoadingState
          compact
          title="Drawing the tour map"
          description="Loading route geometry and travel markers."
        />
      </div>
    ),
  }
);

type Props = {
  locations: PreTourRouteMapLocation[];
  useRoadRoute?: boolean;
  onRouteMetaChange?: (meta: PreTourRouteMeta) => void;
};

export function PreTourRouteMap({
  locations,
  useRoadRoute = true,
  onRouteMetaChange,
}: Props) {
  if (locations.length === 0) {
    return (
      <div className="flex h-[52vh] min-h-[260px] max-h-[680px] items-center justify-center rounded-md border bg-muted/20 text-sm text-muted-foreground sm:h-[58vh] lg:h-[64vh]">
        No valid locations with coordinates to display.
      </div>
    );
  }

  return (
    <PreTourRouteMapLeaflet
      locations={locations}
      useRoadRoute={useRoadRoute}
      onRouteMetaChange={onRouteMetaChange}
    />
  );
}
