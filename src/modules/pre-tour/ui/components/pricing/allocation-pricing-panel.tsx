"use client";

import { LockKeyhole, Wallet } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { PreTourItemAllocationFormState, PreTourRateCard } from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";

type AllocationPricingPanelProps = {
  form: PreTourItemAllocationFormState;
  currencyCode: string;
  sourceRate: PreTourRateCard | null;
  buyFieldsLocked: boolean;
  isReadOnly: boolean;
  canOverrideContractRates: boolean;
  onChange: (patch: Partial<PreTourItemAllocationFormState>) => void;
};

export function AllocationPricingPanel({
  form,
  currencyCode,
  sourceRate,
  buyFieldsLocked,
  isReadOnly,
  canOverrideContractRates,
  onChange,
}: AllocationPricingPanelProps) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="size-4" />
          Buying & Commercial Pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/20 px-3 py-2">
          <p className="text-xs font-medium text-foreground">Source buying</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {sourceRate
              ? `Using ${sourceRate.sourceLabel}. Contracted buy values stay locked unless an authorized override is applied.`
              : "No contracted rate selected. Enter the operational buy cost manually for this allocation."}
          </p>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Currency context</Label>
            <Input value={currencyCode} disabled />
          </div>
          <div className="grid gap-2">
            <Label>Buy base amount</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.buyBaseAmount}
              onChange={(event) => onChange({ buyBaseAmount: event.target.value })}
              disabled={isReadOnly || buyFieldsLocked}
            />
          </div>
          <div className="grid gap-2">
            <Label>Buy tax / levy</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.buyTaxAmount}
              onChange={(event) => onChange({ buyTaxAmount: event.target.value })}
              disabled={isReadOnly || buyFieldsLocked}
            />
          </div>
        </div>

        {sourceRate?.locked ? (
          <div className="space-y-3 rounded-lg border border-dashed p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <LockKeyhole className="size-4" />
                  Contracted rate control
                </p>
                <p className="text-xs text-muted-foreground">
                  Override only when supplier confirmation differs from the resolved contract or master rate.
                </p>
              </div>
              <Switch
                checked={form.overrideSourceRate}
                onCheckedChange={(checked) => onChange({ overrideSourceRate: checked, overrideReason: checked ? form.overrideReason : "" })}
                disabled={isReadOnly || !canOverrideContractRates}
              />
            </div>
            {!canOverrideContractRates ? (
              <p className="text-xs text-muted-foreground">
                Override requires admin access or costing permission.
              </p>
            ) : null}
            {form.overrideSourceRate ? (
              <div className="grid gap-2">
                <Label>Override reason</Label>
                <Textarea
                  value={form.overrideReason}
                  onChange={(event) => onChange({ overrideReason: event.target.value })}
                  placeholder="Explain why the contracted buy price is being replaced."
                  disabled={isReadOnly}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-lg border bg-muted/20 px-3 py-2">
          <p className="text-xs font-medium text-foreground">Commercial selling</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Markup is applied on top of the buy cost to produce the commercial sell amount saved in the pricing snapshot.
          </p>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Markup mode</Label>
            <Select
              value={form.markupMode}
              onValueChange={(markupMode) =>
                onChange({ markupMode: markupMode as PreTourItemAllocationFormState["markupMode"] })
              }
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No markup</SelectItem>
                <SelectItem value="PERCENT">Percent</SelectItem>
                <SelectItem value="FIXED">Fixed amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Markup value</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.markupValue}
              onChange={(event) => onChange({ markupValue: event.target.value })}
              disabled={isReadOnly || form.markupMode === "NONE"}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
