"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RecordAuditMeta } from "@/components/ui/record-audit-meta";
import { Switch } from "@/components/ui/switch";
import type { HotelImage } from "@/modules/accommodation/lib/accommodation-api";
import type { ImageFormState } from "@/modules/accommodation/lib/accommodation-view-helpers";
import type { AccommodationDialogProps } from "@/modules/accommodation/ui/components/dialogs/accommodation-dialog-types";

type AccommodationImageDialogProps = AccommodationDialogProps & {
  row: HotelImage | null;
  form: ImageFormState;
  setForm: (next: ImageFormState) => void;
};

export function AccommodationImageDialog({
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
}: AccommodationImageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Image" : "Edit Image"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </div>
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Caption</Label>
            <Input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Order</Label>
            <Input type="number" min={0} value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label>Primary Image</Label>
            <Switch checked={form.isPrimary} onCheckedChange={(checked) => setForm({ ...form, isPrimary: checked })} />
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
