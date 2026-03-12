"use client";

import { CarFront, MapPinned } from "lucide-react";
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
import type { PreTourTransportAllocationState } from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";

type Option = { value: string; label: string };

type TransportAllocationTabProps = {
  value: PreTourTransportAllocationState;
  vehicleOptions: Option[];
  locationOptions: Option[];
  dayRouteSummary: string;
  disabled?: boolean;
  onChange: (patch: Partial<PreTourTransportAllocationState>) => void;
};

export function TransportAllocationTab({
  value,
  vehicleOptions,
  locationOptions,
  dayRouteSummary,
  disabled = false,
  onChange,
}: TransportAllocationTabProps) {
  return (
    <div className="space-y-4">
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CarFront className="size-4" />
            Transport Service
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Use the day route as the itinerary reference, then define the actual operational trip for this transport item.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-3">
            <div className="grid gap-2">
              <Label>Vehicle / transport service</Label>
              <Select
                value={value.vehicleTypeId}
                onValueChange={(vehicleTypeId) => onChange({ vehicleTypeId })}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select transport service" />
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
          </div>
          <div className="grid gap-2">
            <Label>Trip basis</Label>
            <Select
              value={value.tripMode}
              onValueChange={(tripMode) =>
                onChange({ tripMode: tripMode as PreTourTransportAllocationState["tripMode"] })
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRANSFER">Transfer</SelectItem>
                <SelectItem value="ROUNDTRIP">Roundtrip</SelectItem>
                <SelectItem value="CHARTER">Charter</SelectItem>
                <SelectItem value="DISPOSAL">Disposal / standby</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Rate basis</Label>
            <Input
              value={value.unitBasis}
              onChange={(event) => onChange({ unitBasis: event.target.value })}
              placeholder="Per transfer / per day / per vehicle"
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label>Pax</Label>
            <Input
              type="number"
              min="0"
              value={value.pax}
              onChange={(event) => onChange({ pax: event.target.value })}
              disabled={disabled}
            />
          </div>
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
    </div>
  );
}
