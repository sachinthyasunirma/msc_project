"use client";

import { Ticket, Users } from "lucide-react";
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
    <div className="space-y-4">
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Ticket className="size-4" />
            Activity Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-3">
            <div className="grid gap-2">
              <Label>Activity / excursion</Label>
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
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Service start</Label>
            <Input
              type="datetime-local"
              value={value.scheduledAt}
              onChange={(event) => onChange({ scheduledAt: event.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label>Service end</Label>
            <Input
              type="datetime-local"
              value={value.endAt}
              onChange={(event) => onChange({ endAt: event.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label>Unit basis</Label>
            <Input
              value={value.unitBasis}
              onChange={(event) => onChange({ unitBasis: event.target.value })}
              placeholder="Per pax / per jeep / per group"
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            Passenger Basis
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2">
            <Label>Pax slab</Label>
            <Input
              value={value.paxSlab}
              onChange={(event) => onChange({ paxSlab: event.target.value })}
              placeholder="1-2 / 3-6 / 7-12"
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label>Age basis</Label>
            <Input
              value={value.ageBand}
              onChange={(event) => onChange({ ageBand: event.target.value })}
              placeholder="Adult / Child / Mixed"
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label>Quantity / units</Label>
            <Input
              type="number"
              min="1"
              value={value.quantity}
              onChange={(event) => onChange({ quantity: event.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2 md:col-span-2 xl:col-span-4">
            <Label>Slot / supplier notes</Label>
            <Textarea
              value={value.slotNotes}
              onChange={(event) => onChange({ slotNotes: event.target.value })}
              placeholder="Meeting point, pickup slot, voucher note, or special operating instruction."
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
