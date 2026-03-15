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

export type AccommodationRateRestrictionFormState = {
  code: string;
  roomTypeId: string;
  stayFrom: string;
  stayTo: string;
  bookingFrom: string;
  bookingTo: string;
  minStay: string;
  maxStay: string;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  stopSell: boolean;
  releaseDays: string;
  notes: string;
};

type Option = { value: string; label: string };

type AccommodationRateRestrictionDialogProps = AccommodationDialogProps & {
  form: AccommodationRateRestrictionFormState;
  setForm: (
    value:
      | AccommodationRateRestrictionFormState
      | ((current: AccommodationRateRestrictionFormState) => AccommodationRateRestrictionFormState)
  ) => void;
  roomTypeOptions: Option[];
};

export function AccommodationRateRestrictionDialog({
  open,
  mode,
  saving,
  isReadOnly,
  form,
  setForm,
  roomTypeOptions,
  onOpenChange,
  onCancel,
  onSubmit,
}: AccommodationRateRestrictionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Rate Restriction" : "Edit Rate Restriction"}</DialogTitle>
          <DialogDescription>
            Control minimum stay, closed dates, stop-sell, and booking window rules for the selected rate plan.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Restriction code</Label>
            <Input
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Room type scope</Label>
            <Select
              value={form.roomTypeId || "__all__"}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, roomTypeId: value === "__all__" ? "" : value }))
              }
              disabled={saving || isReadOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="All room types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All room types</SelectItem>
                {roomTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Stay from</Label>
            <Input
              type="date"
              value={form.stayFrom}
              onChange={(event) => setForm((current) => ({ ...current, stayFrom: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Stay to</Label>
            <Input
              type="date"
              value={form.stayTo}
              onChange={(event) => setForm((current) => ({ ...current, stayTo: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Booking from</Label>
            <Input
              type="date"
              value={form.bookingFrom}
              onChange={(event) => setForm((current) => ({ ...current, bookingFrom: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Booking to</Label>
            <Input
              type="date"
              value={form.bookingTo}
              onChange={(event) => setForm((current) => ({ ...current, bookingTo: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Minimum stay</Label>
            <Input
              type="number"
              min="1"
              value={form.minStay}
              onChange={(event) => setForm((current) => ({ ...current, minStay: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Maximum stay</Label>
            <Input
              type="number"
              min="1"
              value={form.maxStay}
              onChange={(event) => setForm((current) => ({ ...current, maxStay: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Release days</Label>
            <Input
              type="number"
              min="0"
              value={form.releaseDays}
              onChange={(event) => setForm((current) => ({ ...current, releaseDays: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-4 md:grid-cols-3">
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={form.closedToArrival}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, closedToArrival: checked === true }))
              }
              disabled={saving || isReadOnly}
            />
            Closed to arrival
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={form.closedToDeparture}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, closedToDeparture: checked === true }))
              }
              disabled={saving || isReadOnly}
            />
            Closed to departure
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={form.stopSell}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, stopSell: checked === true }))}
              disabled={saving || isReadOnly}
            />
            Stop sell
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={saving || isReadOnly}>
            {saving ? "Saving..." : mode === "create" ? "Create Restriction" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
