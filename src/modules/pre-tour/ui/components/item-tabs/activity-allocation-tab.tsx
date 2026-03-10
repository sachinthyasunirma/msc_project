"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PreTourActivityAllocationState } from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";

type Option = { value: string; label: string };

type ActivityAllocationTabProps = {
  value: PreTourActivityAllocationState;
  activityOptions: Option[];
  disabled?: boolean;
  onChange: (patch: Partial<PreTourActivityAllocationState>) => void;
};

export function ActivityAllocationTab({
  value,
  activityOptions,
  disabled = false,
  onChange,
}: ActivityAllocationTabProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <label className="grid gap-2 text-sm md:col-span-2">
        <span className="font-medium">Activity</span>
        <Select value={value.activityId} onValueChange={(activityId) => onChange({ activityId })} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Select activity" />
          </SelectTrigger>
          <SelectContent>
            {activityOptions.map((option) => (
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
          placeholder="Per pax / per group / per boat"
          disabled={disabled}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Pax slab</span>
        <Input
          value={value.paxSlab}
          onChange={(event) => onChange({ paxSlab: event.target.value })}
          placeholder="1-2 / 3-6 / 7-12"
          disabled={disabled}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Age band</span>
        <Input
          value={value.ageBand}
          onChange={(event) => onChange({ ageBand: event.target.value })}
          placeholder="Adult / Child / Mixed"
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
