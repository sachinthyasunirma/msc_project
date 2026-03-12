"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AccommodationDialogProps } from "@/modules/accommodation/ui/components/dialogs/accommodation-dialog-types";
import {
  HOTEL_FEE_CHARGE_BASES,
  HOTEL_FEE_TYPES,
} from "@/modules/accommodation/shared/accommodation-contracting-types";

export type AccommodationFeeRuleFormState = {
  code: string;
  name: string;
  feeType: string;
  chargeBasis: string;
  amount: string;
  currencyCode: string;
  isMandatory: boolean;
  validFrom: string;
  validTo: string;
  remarks: string;
  isActive: boolean;
};

type AccommodationFeeRuleDialogProps = AccommodationDialogProps & {
  form: AccommodationFeeRuleFormState;
  setForm: (
    value:
      | AccommodationFeeRuleFormState
      | ((current: AccommodationFeeRuleFormState) => AccommodationFeeRuleFormState)
  ) => void;
};

export function AccommodationFeeRuleDialog({
  open,
  mode,
  saving,
  isReadOnly,
  form,
  setForm,
  onOpenChange,
  onCancel,
  onSubmit,
}: AccommodationFeeRuleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Fee Rule" : "Edit Fee Rule"}</DialogTitle>
          <DialogDescription>
            Maintain mandatory and optional contract charges such as taxes, levies, gala dinners, and supplements.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Fee code</Label>
            <Input
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Fee name</Label>
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Fee type</Label>
            <Select
              value={form.feeType}
              onValueChange={(value) => setForm((current) => ({ ...current, feeType: value }))}
              disabled={saving || isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOTEL_FEE_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Charge basis</Label>
            <Select
              value={form.chargeBasis}
              onValueChange={(value) => setForm((current) => ({ ...current, chargeBasis: value }))}
              disabled={saving || isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOTEL_FEE_CHARGE_BASES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Amount</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Currency</Label>
            <Input
              value={form.currencyCode}
              onChange={(event) =>
                setForm((current) => ({ ...current, currencyCode: event.target.value.toUpperCase().slice(0, 3) }))
              }
              disabled={saving || isReadOnly}
              maxLength={3}
            />
          </div>
          <div className="grid gap-2">
            <Label>Valid from</Label>
            <Input
              type="date"
              value={form.validFrom}
              onChange={(event) => setForm((current) => ({ ...current, validFrom: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Valid to</Label>
            <Input
              type="date"
              value={form.validTo}
              onChange={(event) => setForm((current) => ({ ...current, validTo: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Remarks</Label>
            <Input
              value={form.remarks}
              onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-4 md:grid-cols-2">
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={form.isMandatory}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, isMandatory: checked === true }))}
              disabled={saving || isReadOnly}
            />
            Mandatory fee
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked === true }))}
              disabled={saving || isReadOnly}
            />
            Active
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={saving || isReadOnly}>
            {saving ? "Saving..." : mode === "create" ? "Create Fee Rule" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
