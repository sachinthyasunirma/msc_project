"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RecordAuditMeta } from "@/components/ui/record-audit-meta";
import { Switch } from "@/components/ui/switch";
import type { RoomType } from "@/modules/accommodation/lib/accommodation-api";
import type { RoomTypeFormState } from "@/modules/accommodation/lib/accommodation-view-helpers";
import type { AccommodationDialogProps } from "@/modules/accommodation/ui/components/dialogs/accommodation-dialog-types";

type AccommodationRoomTypeDialogProps = AccommodationDialogProps & {
  row: RoomType | null;
  form: RoomTypeFormState;
  setForm: (next: RoomTypeFormState) => void;
};

export function AccommodationRoomTypeDialog({
  open,
  mode,
  row,
  form,
  setForm,
  saving,
  isReadOnly,
  onOpenChange,
  onCancel,
  onSubmit,
}: AccommodationRoomTypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Room Type" : "Edit Room Type"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Bed Type</Label>
            <Input value={form.bedType} onChange={(e) => setForm({ ...form, bedType: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Max Occupancy</Label>
            <Input
              type="number"
              min={1}
              value={form.maxOccupancy}
              onChange={(e) => setForm({ ...form, maxOccupancy: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Size</Label>
            <Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Total Rooms</Label>
            <Input
              type="number"
              min={1}
              value={form.totalRooms}
              onChange={(e) => setForm({ ...form, totalRooms: Number(e.target.value) })}
            />
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
          <div className="space-y-2 md:col-span-2">
            <Label>Amenities (comma separated)</Label>
            <Input value={form.amenitiesRaw} onChange={(e) => setForm({ ...form, amenitiesRaw: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 md:col-span-2">
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
