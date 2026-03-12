"use client";

import { memo } from "react";
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
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import type { RoomRateFormState } from "@/modules/accommodation/lib/accommodation-view-helpers";
import type { RoomRate } from "@/modules/accommodation/lib/accommodation-api";
import type { AccommodationSelectOption } from "@/modules/accommodation/shared/accommodation-room-rates.types";
import type { AccommodationDialogProps } from "@/modules/accommodation/ui/components/dialogs/accommodation-dialog-types";

type AccommodationRoomRateDialogProps = AccommodationDialogProps & {
  row: RoomRate | null;
  form: RoomRateFormState;
  setForm: (next: RoomRateFormState) => void;
  roomRateHeaderOptions: AccommodationSelectOption[];
  roomTypeOptions: AccommodationSelectOption[];
  lookupLoading: boolean;
};

function AccommodationRoomRateDialogComponent({
  open,
  mode,
  row,
  form,
  setForm,
  roomRateHeaderOptions,
  roomTypeOptions,
  lookupLoading,
  saving,
  isReadOnly,
  onOpenChange,
  onCancel,
  onSubmit,
}: AccommodationRoomRateDialogProps) {
  const showLookupLoading =
    lookupLoading && (roomRateHeaderOptions.length === 0 || roomTypeOptions.length === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Room Rate" : "Edit Room Rate"}</DialogTitle>
        </DialogHeader>
        {showLookupLoading ? (
          <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading room rate lookups...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-2">
              <Label>Room Rate Header</Label>
              <Select value={form.roomRateHeaderId} onValueChange={(value) => setForm({ ...form, roomRateHeaderId: value })}>
                <SelectTrigger><SelectValue placeholder="Select header" /></SelectTrigger>
                <SelectContent>
                  {roomRateHeaderOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Room Type</Label>
              <Select value={form.roomTypeId} onValueChange={(value) => setForm({ ...form, roomTypeId: value })}>
                <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                <SelectContent>
                  {roomTypeOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
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
        )}
        <DialogFooter>
          <RecordAuditMeta row={row} className="mr-auto" />
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={showLookupLoading || saving || (isReadOnly && mode === "create")} onClick={onSubmit}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const AccommodationRoomRateDialog = memo(AccommodationRoomRateDialogComponent);
