"use client";

import { Input } from "@/components/ui/input";
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
    <label className="grid gap-2 text-sm">
      <span className="font-medium">{label}</span>
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
    </label>
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <SelectField
          label="Hotel"
          value={value.hotelId}
          options={hotelOptions}
          placeholder="Select hotel"
          disabled={disabled}
          onValueChange={(hotelId) => onChange({ hotelId, roomTypeId: "" })}
        />
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Stay date</span>
          <Input
            type="date"
            value={value.stayDate}
            onChange={(event) => onChange({ stayDate: event.target.value })}
            disabled={disabled}
          />
        </label>
        <SelectField
          label="Room type"
          value={value.roomTypeId}
          options={roomTypeOptions}
          placeholder="Any room type"
          disabled={disabled || roomTypeOptions.length === 0}
          onValueChange={(roomTypeId) => onChange({ roomTypeId })}
        />
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Room basis</span>
          <Input
            value={value.roomBasis}
            onChange={(event) => onChange({ roomBasis: event.target.value.toUpperCase() })}
            placeholder="HB / BB / AI"
            disabled={disabled}
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Occupancy</span>
          <Input
            value={value.occupancy}
            onChange={(event) => onChange({ occupancy: event.target.value })}
            placeholder="Double / Triple"
            disabled={disabled}
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Room count</span>
          <Input
            type="number"
            min="1"
            value={value.roomCount}
            onChange={(event) => onChange({ roomCount: event.target.value })}
            disabled={disabled}
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Nights</span>
          <Input
            type="number"
            min="1"
            value={value.nights}
            onChange={(event) => onChange({ nights: event.target.value })}
            disabled={disabled}
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm">
        <span className="font-medium">Rooming context</span>
        <Textarea
          value={value.roomingContext}
          onChange={(event) => onChange({ roomingContext: event.target.value })}
          placeholder="Share rooming notes, split, meal preferences, or special instructions."
          disabled={disabled}
        />
      </label>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Applicable room rates</p>
            <p className="text-xs text-muted-foreground">
              Matching rates are resolved against the selected stay date.
            </p>
          </div>
          {loadingRates ? <p className="text-xs text-muted-foreground">Resolving rates...</p> : null}
        </div>
        <PreTourItemRateCards
          rates={rateOptions}
          selectedRateId={selectedRateId}
          disabled={disabled}
          emptyMessage={
            value.hotelId && value.stayDate
              ? "No matching room rates were found for the selected date and room filters."
              : "Select the hotel and stay date to resolve room rates."
          }
          renderMeta={(rate) =>
            `${rate.roomTypeName}${rate.roomBasis ? ` • ${rate.roomBasis}` : ""}${
              rate.maxOccupancy ? ` • max ${rate.maxOccupancy} pax` : ""
            }`
          }
          onSelect={onSelectRate}
        />
      </div>
    </div>
  );
}
