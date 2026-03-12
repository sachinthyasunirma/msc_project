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

export type AccommodationInventoryDayFormState = {
  code: string;
  roomTypeId: string;
  date: string;
  physicalInventory: string;
  contractedAllotment: string;
  soldRooms: string;
  blockedRooms: string;
  freeSale: boolean;
  stopSell: boolean;
  releaseDaysOverride: string;
  isClosed: boolean;
  notes: string;
};

type Option = { value: string; label: string };

type Props = AccommodationDialogProps & {
  form: AccommodationInventoryDayFormState;
  setForm: (
    value:
      | AccommodationInventoryDayFormState
      | ((current: AccommodationInventoryDayFormState) => AccommodationInventoryDayFormState)
  ) => void;
  roomTypeOptions: Option[];
};

export function AccommodationInventoryDayDialog({
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
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Inventory Day" : "Edit Inventory Day"}</DialogTitle>
          <DialogDescription>
            Maintain physical stock, allotment, sold rooms, and stop-sell state for a room type and date.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Inventory code</Label>
            <Input
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Room type</Label>
            <Select
              value={form.roomTypeId}
              onValueChange={(value) => setForm((current) => ({ ...current, roomTypeId: value }))}
              disabled={saving || isReadOnly}
            >
              <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
              <SelectContent>
                {roomTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Physical inventory</Label>
            <Input
              type="number"
              min="0"
              value={form.physicalInventory}
              onChange={(event) => setForm((current) => ({ ...current, physicalInventory: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Contracted allotment</Label>
            <Input
              type="number"
              min="0"
              value={form.contractedAllotment}
              onChange={(event) => setForm((current) => ({ ...current, contractedAllotment: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Sold rooms</Label>
            <Input
              type="number"
              min="0"
              value={form.soldRooms}
              onChange={(event) => setForm((current) => ({ ...current, soldRooms: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Blocked rooms</Label>
            <Input
              type="number"
              min="0"
              value={form.blockedRooms}
              onChange={(event) => setForm((current) => ({ ...current, blockedRooms: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Release override days</Label>
            <Input
              type="number"
              min="0"
              value={form.releaseDaysOverride}
              onChange={(event) => setForm((current) => ({ ...current, releaseDaysOverride: event.target.value }))}
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
              checked={form.freeSale}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, freeSale: checked === true }))}
              disabled={saving || isReadOnly}
            />
            Free sale
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={form.stopSell}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, stopSell: checked === true }))}
              disabled={saving || isReadOnly}
            />
            Stop sell
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={form.isClosed}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, isClosed: checked === true }))}
              disabled={saving || isReadOnly}
            />
            Closed
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={onSubmit} disabled={saving || isReadOnly}>
            {saving ? "Saving..." : mode === "create" ? "Create Inventory Day" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
