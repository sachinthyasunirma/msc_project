"use client";

import { MapPinned, ReceiptText, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  PreTourTransportAllocationState,
  PreTourTransportRateCard,
} from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";
import { PreTourItemRateCards } from "@/modules/pre-tour/ui/components/pre-tour-item-rate-cards";

type Option = { value: string; label: string };

type TransportAllocationTabProps = {
  value: PreTourTransportAllocationState;
  locationOptions: Option[];
  vehicleCategoryOptions: Option[];
  vehicleTypeOptions: Option[];
  transportRateBasis: "VEHICLE_CATEGORY" | "VEHICLE_TYPE";
  dayRouteSummary: string;
  rateOptions: PreTourTransportRateCard[];
  selectedRateId: string;
  loadingRates: boolean;
  disabled?: boolean;
  onChange: (patch: Partial<PreTourTransportAllocationState>) => void;
  onSelectRate: (rateId: string) => void;
};

const CHARGE_METHOD_OPTIONS: Array<{
  value: PreTourTransportAllocationState["chargeMethod"];
  label: string;
}> = [
  { value: "PER_TRANSFER", label: "Per Transfer" },
  { value: "PER_VEHICLE", label: "Per Vehicle" },
  { value: "PER_PAX", label: "Per Pax" },
  { value: "PER_HOUR", label: "Per Hour" },
  { value: "PER_DAY", label: "Per Day" },
  { value: "PER_KM", label: "Per Km" },
  { value: "SLAB", label: "Slab" },
];

export function TransportAllocationTab({
  value,
  locationOptions,
  vehicleCategoryOptions,
  vehicleTypeOptions,
  transportRateBasis,
  dayRouteSummary,
  rateOptions,
  selectedRateId,
  loadingRates,
  disabled = false,
  onChange,
  onSelectRate,
}: TransportAllocationTabProps) {
  const requiresPax = value.chargeMethod === "PER_PAX";
  const vehicleLabel =
    transportRateBasis === "VEHICLE_CATEGORY" ? "Vehicle category" : "Vehicle type";
  const vehiclePlaceholder =
    transportRateBasis === "VEHICLE_CATEGORY"
      ? "Select vehicle category"
      : "Select vehicle type";
  const vehicleOptions =
    transportRateBasis === "VEHICLE_CATEGORY" ? vehicleCategoryOptions : vehicleTypeOptions;

  return (
    <div className="space-y-4">
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="size-4" />
            Transport Pricing Context
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Select the quotation charge method first. Matching transport master rates are resolved from the route and vehicle basis.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2">
            <Label>Charge method</Label>
            <Select
              value={value.chargeMethod}
              onValueChange={(chargeMethod) =>
                onChange({
                  chargeMethod: chargeMethod as PreTourTransportAllocationState["chargeMethod"],
                })
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select charge method" />
              </SelectTrigger>
              <SelectContent>
                {CHARGE_METHOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{vehicleLabel}</Label>
            <Select
              value={
                transportRateBasis === "VEHICLE_CATEGORY"
                  ? value.vehicleCategoryId
                  : value.vehicleTypeId
              }
              onValueChange={(nextValue) =>
                onChange(
                  transportRateBasis === "VEHICLE_CATEGORY"
                    ? { vehicleCategoryId: nextValue, vehicleTypeId: "" }
                    : { vehicleTypeId: nextValue, vehicleCategoryId: "" }
                )
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={vehiclePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {vehicleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Commercial note</Label>
            <Input
              value={value.unitBasis}
              onChange={(event) => onChange({ unitBasis: event.target.value })}
              placeholder="Billing note or routing remark"
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label>Vehicles / trips</Label>
            <Input
              type="number"
              min="1"
              value={value.quantity}
              onChange={(event) => onChange({ quantity: event.target.value })}
              disabled={disabled}
            />
          </div>
          {requiresPax ? (
            <div className="grid gap-2">
              <Label>Quoted pax</Label>
              <Input
                type="number"
                min="1"
                value={value.pax}
                onChange={(event) => onChange({ pax: event.target.value })}
                disabled={disabled}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPinned className="size-4" />
            Trip Route Context
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground md:col-span-2 xl:col-span-4">
            Day route reference: <span className="font-medium text-foreground">{dayRouteSummary}</span>
          </div>
          <div className="grid gap-2">
            <Label>Start point</Label>
            <Select
              value={value.fromLocationId}
              onValueChange={(fromLocationId) => onChange({ fromLocationId })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select start point" />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>End point</Label>
            <Select
              value={value.toLocationId}
              onValueChange={(toLocationId) => onChange({ toLocationId })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select end point" />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Pickup / start time</Label>
            <Input
              type="datetime-local"
              value={value.startAt}
              onChange={(event) => onChange({ startAt: event.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label>Drop / end time</Label>
            <Input
              type="datetime-local"
              value={value.endAt}
              onChange={(event) => onChange({ endAt: event.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Operational route label</Label>
            <Input
              value={value.routeLabel}
              onChange={(event) => onChange({ routeLabel: event.target.value })}
              placeholder="Airport to Kandy / Colombo city transfer"
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2 md:col-span-2 xl:col-span-4">
            <Label>Driver / dispatch notes</Label>
            <Textarea
              value={value.routeNotes}
              onChange={(event) => onChange({ routeNotes: event.target.value })}
              placeholder="Pickup signage, luggage requirement, route deviation, standby timing, or dispatch note."
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="size-4" />
            Applicable Transport Master Fees
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Matching route fees are resolved from transport master data based on the selected charge method and vehicle basis.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingRates ? <p className="text-xs text-muted-foreground">Resolving transport master fees...</p> : null}
          <PreTourItemRateCards
            rates={rateOptions}
            selectedRateId={selectedRateId}
            disabled={disabled}
            emptyMessage={
              value.fromLocationId && value.toLocationId
                ? "No matching transport master rates were found for the selected route and charge method. You can still price this allocation manually."
                : "Select route, charge method, and vehicle basis to view matching transport master fees."
            }
            renderMeta={(rate) =>
              [
                rate.vehicleTypeLabel || rate.vehicleCategoryLabel,
                rate.distanceKm !== null ? `${rate.distanceKm} km` : null,
                rate.durationMin !== null ? `${rate.durationMin} min` : null,
                rate.matchedTierLabel,
              ]
                .filter(Boolean)
                .join(" • ")
            }
            onSelect={onSelectRate}
          />
        </CardContent>
      </Card>
    </div>
  );
}
