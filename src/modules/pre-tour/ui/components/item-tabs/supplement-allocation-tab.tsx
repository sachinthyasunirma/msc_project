"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PreTourSupplementAllocationState } from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";

type SupplementAllocationTabProps = {
  itemType: "SUPPLEMENT" | "MISC";
  value: PreTourSupplementAllocationState;
  disabled?: boolean;
  onItemTypeChange: (itemType: "SUPPLEMENT" | "MISC") => void;
  onChange: (patch: Partial<PreTourSupplementAllocationState>) => void;
};

export function SupplementAllocationTab({
  itemType,
  value,
  disabled = false,
  onItemTypeChange,
  onChange,
}: SupplementAllocationTabProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Record as</span>
        <Select value={itemType} onValueChange={(next) => onItemTypeChange(next as "SUPPLEMENT" | "MISC")} disabled={disabled}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SUPPLEMENT">Supplement</SelectItem>
            <SelectItem value="MISC">Miscellaneous</SelectItem>
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-2 text-sm md:col-span-2">
        <span className="font-medium">Service / charge name</span>
        <Input
          value={value.serviceLabel}
          onChange={(event) => onChange({ serviceLabel: event.target.value })}
          placeholder="Visa fees / porterage / early check-in"
          disabled={disabled}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Unit basis</span>
        <Input
          value={value.unitBasis}
          onChange={(event) => onChange({ unitBasis: event.target.value })}
          placeholder="Per pax / per room / flat"
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
