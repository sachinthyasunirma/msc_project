"use client";

import { BedDouble, Hotel, ReceiptText } from "lucide-react";
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
import { PreTourItemRateCards } from "@/modules/pre-tour/ui/components/pre-tour-item-rate-cards";
import type {
  PreTourAccommodationAllocationState,
  PreTourAccommodationRateCard,
} from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";

type Option = { value: string; label: string };

type AccommodationAllocationTabProps = {
  value: PreTourAccommodationAllocationState;
  hotelOptions: Option[];
  roomTypeOptions: Option[];
  rateOptions: PreTourAccommodationRateCard[];
  selectedRateId: string;
  loadingRates: boolean;
  disabled?: boolean;
  onChange: (patch: Partial<PreTourAccommodationAllocationState>) => void;
  onSelectRate: (rateId: string) => void;
};

function SelectField({
  label,
  value,
  options,
  placeholder,
  disabled,
  onValueChange,
}: {
  label: string;
  value: string;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AccommodationAllocationTab({
  value,
  hotelOptions,
  roomTypeOptions,
  rateOptions,
  selectedRateId,
  loadingRates,
  disabled = false,
  onChange,
  onSelectRate,
}: AccommodationAllocationTabProps) {
  return (
    <div className="space-y-4">
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Hotel className="size-4" />
            Accommodation Service
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-3">
            <SelectField
              label="Hotel / contracted property"
              value={value.hotelId}
              options={hotelOptions}
              placeholder="Select hotel"
              disabled={disabled}
              onValueChange={(hotelId) => onChange({ hotelId, roomTypeId: "" })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Stay date</Label>
            <Input
              type="date"
              value={value.stayDate}
              onChange={(event) => onChange({ stayDate: event.target.value })}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              Use the actual check-in/service date for rate validity.
            </p>
          </div>
          <SelectField
            label="Room type"
            value={value.roomTypeId}
            options={roomTypeOptions}
            placeholder="Any room type"
            disabled={disabled || roomTypeOptions.length === 0}
            onValueChange={(roomTypeId) => onChange({ roomTypeId })}
          />
          <div className="grid gap-2">
            <Label>Meal / board basis</Label>
            <Input
              value={value.roomBasis}
              onChange={(event) => onChange({ roomBasis: event.target.value.toUpperCase() })}
              placeholder="BB / HB / FB / AI"
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BedDouble className="size-4" />
            Rooming & Stay Context
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2">
            <Label>Occupancy / rooming basis</Label>
            <Input
              value={value.occupancy}
              onChange={(event) => onChange({ occupancy: event.target.value })}
              placeholder="Double / Triple / Single use"
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label>Rooms</Label>
            <Input
              type="number"
              min="1"
              value={value.roomCount}
              onChange={(event) => onChange({ roomCount: event.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label>Nights</Label>
            <Input
              type="number"
              min="1"
              value={value.nights}
              onChange={(event) => onChange({ nights: event.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2 md:col-span-2 xl:col-span-4">
            <Label>Special requests / rooming notes</Label>
            <Textarea
              value={value.roomingContext}
              onChange={(event) => onChange({ roomingContext: event.target.value })}
              placeholder="Room split, honeymoon setup, connected rooms, meal exceptions, or supplier instructions."
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="size-4" />
            Applicable Contracted Rates
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            The system resolves matching room rates for the selected stay date, hotel, room type, and basis.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingRates ? <p className="text-xs text-muted-foreground">Resolving room rates...</p> : null}
          <PreTourItemRateCards
            rates={rateOptions}
            selectedRateId={selectedRateId}
            disabled={disabled}
            emptyMessage={
              value.hotelId && value.stayDate
                ? "No matching room rates were found for the selected accommodation context."
                : "Select hotel and stay date to view valid contracted room rates."
            }
            renderMeta={(rate) =>
              `${rate.roomTypeName}${rate.roomBasis ? ` • ${rate.roomBasis}` : ""}${
                rate.maxOccupancy ? ` • max ${rate.maxOccupancy} pax` : ""
              }`
            }
            onSelect={onSelectRate}
          />
        </CardContent>
      </Card>
    </div>
  );
}
