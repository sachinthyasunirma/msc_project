"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RecordAuditMeta } from "@/components/ui/record-audit-meta";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Availability, RoomType } from "@/modules/accommodation/lib/accommodation-api";
import type { AvailabilityFormState } from "@/modules/accommodation/lib/accommodation-view-helpers";
import type { AccommodationDialogProps } from "@/modules/accommodation/ui/components/dialogs/accommodation-dialog-types";

type AccommodationAvailabilityDialogProps = AccommodationDialogProps & {
  row: Availability | null;
  form: AvailabilityFormState;
  setForm: (next: AvailabilityFormState) => void;
  roomTypes: RoomType[];
};

export function AccommodationAvailabilityDialog({
  open,
  mode,
  row,
  form,
  setForm,
  roomTypes,
  saving,
  isReadOnly,
  onOpenChange,
  onCancel,
  onSubmit,
}: AccommodationAvailabilityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Availability" : "Edit Availability"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </div>
          <div className="space-y-2">
            <Label>Room Type</Label>
            <Select value={form.roomTypeId} onValueChange={(value) => setForm({ ...form, roomTypeId: value })}>
              <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
              <SelectContent>{roomTypes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Available Rooms</Label>
            <Input
              type="number"
              min={0}
              value={form.availableRooms}
              onChange={(e) => setForm({ ...form, availableRooms: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Booked Rooms</Label>
            <Input
              type="number"
              min={0}
              value={form.bookedRooms}
              onChange={(e) => setForm({ ...form, bookedRooms: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Block Reason</Label>
            <Input value={form.blockReason} onChange={(e) => setForm({ ...form, blockReason: e.target.value })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 md:col-span-2">
            <Label>Blocked</Label>
            <Switch checked={form.isBlocked} onCheckedChange={(checked) => setForm({ ...form, isBlocked: checked })} />
          </div>
        </div>
        <DialogFooter>
          <RecordAuditMeta row={row} className="mr-auto" />
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={saving || (isReadOnly && mode === "create")} onClick={onSubmit}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
