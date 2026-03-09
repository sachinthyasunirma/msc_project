"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CalendarDays, CopyPlus, Globe2, Settings2, Trash2, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PreTourRouteMap } from "@/modules/pre-tour/ui/components/pre-tour-route-map";
import type { DetailSheetState, Row } from "@/modules/pre-tour/shared/pre-tour-management-types";
import { formatCell, formatDate } from "@/modules/pre-tour/lib/pre-tour-management-utils";

type PreTourDetailSheetProps = {
  detailSheet: DetailSheetState;
  setDetailSheetOpen: (open: boolean) => void;
  onClose: () => void;
  isReadOnly: boolean;
  canViewRouteMap: boolean;
  lookups: Record<string, string>;
  selectedPlan: Row | null;
  detailPreTourRouteLoading: boolean;
  detailRouteLocationSequenceIds: string[];
  detailRoutePathLabel: string;
  detailRouteMapLocations: Array<{ id: string; name: string; coordinates: [number, number] }>;
  onCreateVersion: (row: Row) => void;
  onCopy: (row: Row) => void;
  onEditPreTour: (row: Row) => void;
  onDeletePreTour: (row: Row) => void;
  onAddAddonFromItem: (row: Row, dayId?: string) => void;
  onShareItem: (row: Row) => void;
  onEditItem: (row: Row, dayId?: string) => void;
  onDeleteItem: (row: Row) => void;
};

export function PreTourDetailSheet({
  detailSheet,
  setDetailSheetOpen,
  onClose,
  isReadOnly,
  canViewRouteMap,
  lookups,
  selectedPlan,
  detailPreTourRouteLoading,
  detailRouteLocationSequenceIds,
  detailRoutePathLabel,
  detailRouteMapLocations,
  onCreateVersion,
  onCopy,
  onEditPreTour,
  onDeletePreTour,
  onAddAddonFromItem,
  onShareItem,
  onEditItem,
  onDeleteItem,
}: PreTourDetailSheetProps) {
  const [drawerShowMap, setDrawerShowMap] = useState(false);
  const [drawerRouteMeta, setDrawerRouteMeta] = useState<{
    distanceKm: number | null;
    durationMin: number | null;
  }>({
    distanceKm: null,
    durationMin: null,
  });

  useEffect(() => {
    if (!detailSheet.open || detailRouteMapLocations.length === 0) {
      setDrawerShowMap(false);
      setDrawerRouteMeta({ distanceKm: null, durationMin: null });
    }
  }, [detailRouteMapLocations.length, detailSheet.open]);

  return (
    <Sheet open={detailSheet.open} onOpenChange={setDetailSheetOpen}>
      <SheetContent side="right" className="w-[96vw] sm:max-w-2xl lg:max-w-3xl">
        <SheetHeader className="border-b pb-3">
          <SheetTitle>{detailSheet.title}</SheetTitle>
          <SheetDescription>{detailSheet.description}</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 overflow-y-auto p-4">
          {detailSheet.row && detailSheet.kind === "pre-tour" ? (
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" className="h-8" asChild>
                <Link href={`/master-data/pre-tours/${String(detailSheet.row.id)}`}>
                  <Settings2 className="mr-1 size-4" />
                  Manage
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  onClose();
                  onCreateVersion(detailSheet.row as Row);
                }}
                disabled={isReadOnly}
              >
                + Version
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  onClose();
                  onCopy(detailSheet.row as Row);
                }}
                disabled={isReadOnly}
              >
                <CopyPlus className="mr-1 size-4" />
                Copy
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  onClose();
                  onEditPreTour(detailSheet.row as Row);
                }}
                disabled={isReadOnly}
              >
                <Settings2 className="mr-1 size-4" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  onClose();
                  onDeletePreTour(detailSheet.row as Row);
                }}
                disabled={isReadOnly}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ) : null}

          {detailSheet.row && detailSheet.kind === "pre-tour" ? (
            <div className="space-y-3">
              <div className="rounded-xl border bg-gradient-to-b from-muted/40 to-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Pre-Tour Reference</p>
                    <p className="text-base font-semibold text-foreground">{String(detailSheet.row.referenceNo || "-")}</p>
                    <p className="text-xs text-muted-foreground">{String(detailSheet.row.title || "-")}</p>
                    <p className="text-xs text-muted-foreground">
                      {String(detailSheet.row.planCode || "-")} • V{String(detailSheet.row.version || 1)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="font-medium">
                      {String(detailSheet.row.status || "-")}
                    </Badge>
                    <Badge variant="secondary">{`Nights ${String(detailSheet.row.totalNights ?? 0)}`}</Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md border bg-background/80 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Category</p>
                    <p className="truncate text-xs font-medium">{lookups[String(detailSheet.row.categoryId)] || "-"}</p>
                  </div>
                  <div className="rounded-md border bg-background/80 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Date Range</p>
                    <p className="truncate text-xs font-medium">
                      {`${formatDate(detailSheet.row.startDate)} - ${formatDate(detailSheet.row.endDate)}`}
                    </p>
                  </div>
                  <div className="rounded-md border bg-background/80 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Pax</p>
                    <p className="truncate text-xs font-medium">
                      {`${String(detailSheet.row.adults ?? 0)} / ${String(detailSheet.row.children ?? 0)} / ${String(
                        detailSheet.row.infants ?? 0
                      )}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Building2 className="size-3.5" />
                    Tour & Partners
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Title</span>
                      <span className="text-right">{formatCell(detailSheet.row.title, lookups)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Category</span>
                      <span className="text-right">{lookups[String(detailSheet.row.categoryId)] || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Operator</span>
                      <span className="text-right">{lookups[String(detailSheet.row.operatorOrgId)] || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Market</span>
                      <span className="text-right">{lookups[String(detailSheet.row.marketOrgId)] || "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    Schedule & Pax
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Start Date</span>
                      <span className="text-right">{formatDate(detailSheet.row.startDate)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">End Date</span>
                      <span className="text-right">{formatDate(detailSheet.row.endDate)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Total Nights</span>
                      <span className="text-right">{formatCell(detailSheet.row.totalNights, lookups)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="size-3.5" />
                        Adults / Children / Infants
                      </span>
                      <span className="text-right">
                        {`${String(detailSheet.row.adults ?? 0)} / ${String(detailSheet.row.children ?? 0)} / ${String(
                          detailSheet.row.infants ?? 0
                        )}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Wallet className="size-3.5" />
                    Commercial
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Currency</span>
                      <span className="text-right">{formatCell(detailSheet.row.currencyCode, lookups)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Price Mode</span>
                      <span className="text-right">{formatCell(detailSheet.row.priceMode, lookups)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Base Total</span>
                      <span className="text-right">{formatCell(detailSheet.row.baseTotal, lookups)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Tax Total</span>
                      <span className="text-right">{formatCell(detailSheet.row.taxTotal, lookups)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Grand Total</span>
                      <span className="text-right">{formatCell(detailSheet.row.grandTotal, lookups)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Globe2 className="size-3.5" />
                    Preferences & Notes
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Language</span>
                      <span className="text-right">{formatCell(detailSheet.row.preferredLanguage, lookups)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Room Preference</span>
                      <span className="text-right">{formatCell(detailSheet.row.roomPreference, lookups)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Meal Preference</span>
                      <span className="text-right">{formatCell(detailSheet.row.mealPreference, lookups)}</span>
                    </div>
                    <div className="rounded-md bg-muted/20 p-2 text-xs text-muted-foreground">
                      {String(detailSheet.row.notes || "No notes added.")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {detailSheet.row && detailSheet.kind === "day-item" ? (
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddAddonFromItem(detailSheet.row as Row, detailSheet.dayId)}
                disabled={isReadOnly}
              >
                + Addon
              </Button>
              <Button size="sm" variant="outline" onClick={() => onShareItem(detailSheet.row as Row)} disabled={isReadOnly}>
                <CopyPlus className="mr-1 size-4" />
                Share
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEditItem(detailSheet.row as Row, detailSheet.dayId)} disabled={isReadOnly}>
                <Settings2 className="mr-1 size-4" />
                Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDeleteItem(detailSheet.row as Row)} disabled={isReadOnly}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ) : null}

          {detailSheet.kind === "pre-tour" && canViewRouteMap ? (
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Locations: <span className="font-medium text-foreground">{detailRoutePathLabel || "-"}</span>
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDrawerShowMap(!drawerShowMap)}
                  disabled={detailPreTourRouteLoading || detailRouteLocationSequenceIds.length === 0}
                >
                  {drawerShowMap ? "Hide Map" : "Show Map"}
                </Button>
              </div>
            </div>
          ) : null}

          {canViewRouteMap &&
          (detailSheet.kind === "pre-tour" || detailSheet.kind === "day-item") &&
          drawerShowMap &&
          (detailPreTourRouteLoading || detailRouteLocationSequenceIds.length > 0) ? (
            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              {detailPreTourRouteLoading ? <p className="text-xs text-muted-foreground">Loading route details...</p> : null}
              {selectedPlan || detailSheet.kind === "pre-tour" ? (
                <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>
                    Header:{" "}
                    <span className="font-medium text-foreground">{String(selectedPlan?.code || detailSheet.row?.code || "-")}</span>
                  </p>
                  <p>
                    Date Range:{" "}
                    <span className="font-medium text-foreground">
                      {formatDate(selectedPlan?.startDate || detailSheet.row?.startDate)} -{" "}
                      {formatDate(selectedPlan?.endDate || detailSheet.row?.endDate)}
                    </span>
                  </p>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-muted-foreground">
                  Distance:{" "}
                  <span className="font-medium text-foreground">
                    {drawerRouteMeta.distanceKm !== null ? `${drawerRouteMeta.distanceKm.toFixed(2)} km` : "-"}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Duration:{" "}
                  <span className="font-medium text-foreground">
                    {drawerRouteMeta.durationMin !== null ? `${drawerRouteMeta.durationMin.toFixed(1)} min` : "-"}
                  </span>
                </span>
              </div>
              {detailRouteMapLocations.length > 0 ? (
                <PreTourRouteMap
                  locations={detailRouteMapLocations}
                  useRoadRoute={true}
                  onRouteMetaChange={setDrawerRouteMeta}
                />
              ) : (
                <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground">
                  No mapped coordinates found for selected tour locations.
                </div>
              )}
            </div>
          ) : null}

          {detailSheet.row && detailSheet.kind !== "pre-tour" ? (
            Object.entries(detailSheet.row).map(([key, value]) => (
              <div key={key} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{key}</span>
                <span className="max-w-[70%] text-right text-foreground">{formatCell(value, lookups)}</span>
              </div>
            ))
          ) : detailSheet.kind !== "pre-tour" ? (
            <p className="text-sm text-muted-foreground">No details to show.</p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
