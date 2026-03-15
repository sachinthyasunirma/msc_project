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
  HOTEL_PENALTY_BASES,
  HOTEL_PENALTY_TYPES,
} from "@/modules/accommodation/shared/accommodation-contracting-types";

export type AccommodationCancellationPolicyRuleFormState = {
  code: string;
  fromDaysBefore: string;
  toDaysBefore: string;
  penaltyType: string;
  penaltyValue: string;
  basis: string;
  appliesOnNoShow: boolean;
  appliesAfterCheckIn: boolean;
};

type Props = AccommodationDialogProps & {
  form: AccommodationCancellationPolicyRuleFormState;
  setForm: (
    value:
      | AccommodationCancellationPolicyRuleFormState
      | ((current: AccommodationCancellationPolicyRuleFormState) => AccommodationCancellationPolicyRuleFormState)
  ) => void;
};

export function AccommodationCancellationPolicyRuleDialog({
  open,
  mode,
  saving,
  isReadOnly,
  form,
  setForm,
  onOpenChange,
  onCancel,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Cancellation Rule" : "Edit Cancellation Rule"}</DialogTitle>
          <DialogDescription>
            Define the penalty window and charge basis for this cancellation policy. Use a range such as 30 to 15 days before check-in.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Rule code</Label>
            <Input
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Penalty type</Label>
            <Select
              value={form.penaltyType}
              onValueChange={(value) => setForm((current) => ({ ...current, penaltyType: value }))}
              disabled={saving || isReadOnly}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOTEL_PENALTY_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>From days before check-in</Label>
            <Input
              type="number"
              min="0"
              value={form.fromDaysBefore}
              onChange={(event) => setForm((current) => ({ ...current, fromDaysBefore: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>To days before check-in</Label>
            <Input
              type="number"
              min="0"
              value={form.toDaysBefore}
              onChange={(event) => setForm((current) => ({ ...current, toDaysBefore: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Penalty value</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.penaltyValue}
              onChange={(event) => setForm((current) => ({ ...current, penaltyValue: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Basis</Label>
            <Select
              value={form.basis || "__none__"}
              onValueChange={(value) => setForm((current) => ({ ...current, basis: value === "__none__" ? "" : value }))}
              disabled={saving || isReadOnly}
            >
              <SelectTrigger><SelectValue placeholder="No basis" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No basis</SelectItem>
                {HOTEL_PENALTY_BASES.map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-4 md:grid-cols-2">
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={form.appliesOnNoShow}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, appliesOnNoShow: checked === true }))}
              disabled={saving || isReadOnly}
            />
            Applies on no-show
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={form.appliesAfterCheckIn}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, appliesAfterCheckIn: checked === true }))}
              disabled={saving || isReadOnly}
            />
            Applies after check-in
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={onSubmit} disabled={saving || isReadOnly}>
            {saving ? "Saving..." : mode === "create" ? "Create Rule" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
