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
import type { RoomRate, RoomRateHeader, RoomType } from "@/modules/accommodation/lib/accommodation-api";
import type { RoomRateFormState } from "@/modules/accommodation/lib/accommodation-view-helpers";
import type { AccommodationDialogProps } from "@/modules/accommodation/ui/components/dialogs/accommodation-dialog-types";

type AccommodationRoomRateDialogProps = AccommodationDialogProps & {
  row: RoomRate | null;
  form: RoomRateFormState;
  setForm: (next: RoomRateFormState) => void;
  roomRateHeaders: RoomRateHeader[];
  roomTypes: RoomType[];
};

export function AccommodationRoomRateDialog({
  open,
  mode,
  row,
  form,
  setForm,
  roomRateHeaders,
  roomTypes,
  saving,
  isReadOnly,
  onOpenChange,
  onCancel,
  onSubmit,
}: AccommodationRoomRateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Room Rate" : "Edit Room Rate"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </div>
          <div className="space-y-2">
            <Label>Room Rate Header</Label>
            <Select value={form.roomRateHeaderId} onValueChange={(value) => setForm({ ...form, roomRateHeaderId: value })}>
              <SelectTrigger><SelectValue placeholder="Select header" /></SelectTrigger>
              <SelectContent>{roomRateHeaders.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Room Type</Label>
            <Select value={form.roomTypeId} onValueChange={(value) => setForm({ ...form, roomTypeId: value })}>
              <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
              <SelectContent>{roomTypes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Room Category</Label>
            <Input value={form.roomCategory} onChange={(e) => setForm({ ...form, roomCategory: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Room Basis</Label>
            <Input value={form.roomBasis} onChange={(e) => setForm({ ...form, roomBasis: e.target.value.toUpperCase() })} />
          </div>
          <div className="space-y-2">
            <Label>Base Rate</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.baseRatePerNight}
              onChange={(e) => setForm({ ...form, baseRatePerNight: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label>Active</Label>
            <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
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
