"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PreTourTransportAllocationState } from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";

type Option = { value: string; label: string };

type TransportAllocationTabProps = {
  value: PreTourTransportAllocationState;
  vehicleOptions: Option[];
  disabled?: boolean;
  onChange: (patch: Partial<PreTourTransportAllocationState>) => void;
};

export function TransportAllocationTab({
  value,
  vehicleOptions,
  disabled = false,
  onChange,
}: TransportAllocationTabProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <label className="grid gap-2 text-sm md:col-span-2">
        <span className="font-medium">Transport service</span>
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
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Unit basis</span>
        <Input
          value={value.unitBasis}
          onChange={(event) => onChange({ unitBasis: event.target.value })}
          placeholder="Per transfer / per day / per vehicle"
          disabled={disabled}
        />
      </label>
      <label className="grid gap-2 text-sm md:col-span-2">
        <span className="font-medium">Route context</span>
        <Input
          value={value.routeLabel}
          onChange={(event) => onChange({ routeLabel: event.target.value })}
          placeholder="Airport to Kandy / Sigiriya to Trinco"
          disabled={disabled}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Pax</span>
        <Input
          type="number"
          min="0"
          value={value.pax}
          onChange={(event) => onChange({ pax: event.target.value })}
          disabled={disabled}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Quantity</span>
        <Input
          type="number"
          min="1"
          value={value.quantity}
          onChange={(event) => onChange({ quantity: event.target.value })}
          disabled={disabled}
        />
      </label>
    </div>
  );
}
