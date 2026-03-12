"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import type { PreTourRouteMapLocation, PreTourRouteMeta } from "./pre-tour-route-map";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
});

type Props = {
  locations: PreTourRouteMapLocation[];
  useRoadRoute?: boolean;
  onRouteMetaChange?: (meta: PreTourRouteMeta) => void;
};

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(bounds, { padding: [28, 28] });
  }, [bounds, map]);

  return null;
}

function haversineDistanceKm(a: [number, number], b: [number, number]) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(b[1] - a[1]);
  const dLon = toRadians(b[0] - a[0]);
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

export function PreTourRouteMapLeaflet({
  locations,
  useRoadRoute = true,
  onRouteMetaChange,
}: Props) {
  const markerPoints = useMemo(
    () =>
      locations.map((location) => ({
        ...location,
        latLng: [location.coordinates[1], location.coordinates[0]] as LatLngExpression,
      })),
    [locations]
  );

  const [routePath, setRoutePath] = useState<LatLngExpression[]>(
    markerPoints.map((point) => point.latLng)
  );

  useEffect(() => {
    setRoutePath(markerPoints.map((point) => point.latLng));
  }, [markerPoints]);

  useEffect(() => {
    if (!useRoadRoute || markerPoints.length < 2) {
      setRoutePath(markerPoints.map((point) => point.latLng));
      if (onRouteMetaChange) {
        let distanceKm = 0;
        for (let index = 1; index < markerPoints.length; index += 1) {
          distanceKm += haversineDistanceKm(
            markerPoints[index - 1].coordinates,
            markerPoints[index].coordinates
          );
        }
        onRouteMetaChange({
          distanceKm: markerPoints.length > 1 ? Number(distanceKm.toFixed(2)) : 0,
          durationMin: null,
        });
      }
      return;
    }

    const controller = new AbortController();
    const coordinatePath = markerPoints
      .map((point) => `${point.coordinates[0]},${point.coordinates[1]}`)
      .join(";");

    const fetchRoute = async () => {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coordinatePath}?overview=full&geometries=geojson`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`OSRM route fetch failed: ${response.status}`);
        }

        const data = (await response.json()) as {
          routes?: Array<{
            geometry?: { coordinates?: Array<[number, number]> };
            distance?: number;
            duration?: number;
          }>;
        };

        const route = data.routes?.[0];
        const routeCoordinates = route?.geometry?.coordinates ?? [];
        if (routeCoordinates.length === 0) {
          throw new Error("No route points returned.");
        }

        setRoutePath(routeCoordinates.map(([lon, lat]) => [lat, lon]));
        onRouteMetaChange?.({
          distanceKm: route?.distance ? Number((route.distance / 1000).toFixed(2)) : null,
          durationMin: route?.duration ? Number((route.duration / 60).toFixed(1)) : null,
        });
      } catch {
        setRoutePath(markerPoints.map((point) => point.latLng));
        onRouteMetaChange?.({
          distanceKm: null,
          durationMin: null,
        });
      }
    };

    void fetchRoute();

    return () => {
      controller.abort();
    };
  }, [markerPoints, onRouteMetaChange, useRoadRoute]);

  const bounds = useMemo(
    () => markerPoints.map((point) => point.latLng) as LatLngBoundsExpression,
    [markerPoints]
  );

  return (
    <div className="h-[52vh] min-h-[260px] max-h-[680px] overflow-hidden rounded-md border sm:h-[58vh] lg:h-[64vh]">
      <MapContainer center={markerPoints[0].latLng} zoom={8} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds bounds={bounds} />
        {markerPoints.map((point, index) => (
          <Marker key={point.id} position={point.latLng}>
            <Tooltip direction="top" offset={[0, -12]} opacity={1} permanent>
              {index + 1}. {point.name}
            </Tooltip>
          </Marker>
        ))}
        {routePath.length > 1 ? (
          <Polyline positions={routePath} pathOptions={{ color: "#0f766e", weight: 5, opacity: 0.8 }} />
        ) : null}
      </MapContainer>
    </div>
  );
}
