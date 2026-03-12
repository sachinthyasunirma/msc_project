"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PreTourGuideAllocationState } from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";

type Option = { value: string; label: string };

type GuideAllocationTabProps = {
  value: PreTourGuideAllocationState;
  guideOptions: Option[];
  disabled?: boolean;
  onChange: (patch: Partial<PreTourGuideAllocationState>) => void;
};

export function GuideAllocationTab({
  value,
  guideOptions,
  disabled = false,
  onChange,
}: GuideAllocationTabProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <label className="grid gap-2 text-sm md:col-span-2">
        <span className="font-medium">Guide service</span>
        <Select value={value.guideId} onValueChange={(guideId) => onChange({ guideId })} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Select guide" />
          </SelectTrigger>
          <SelectContent>
            {guideOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Language</span>
        <Input
          value={value.language}
          onChange={(event) => onChange({ language: event.target.value })}
          placeholder="English / German / French"
          disabled={disabled}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Unit basis</span>
        <Input
          value={value.unitBasis}
          onChange={(event) => onChange({ unitBasis: event.target.value })}
          placeholder="Full day / half day / transfer"
          disabled={disabled}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Pax slab</span>
        <Input
          value={value.paxSlab}
          onChange={(event) => onChange({ paxSlab: event.target.value })}
          placeholder="1-6 / 7-12"
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
