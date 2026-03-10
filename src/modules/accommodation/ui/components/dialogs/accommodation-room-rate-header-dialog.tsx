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
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import type { RoomRateHeader } from "@/modules/accommodation/lib/accommodation-api";
import type { RoomRateHeaderFormState } from "@/modules/accommodation/lib/accommodation-view-helpers";
import type { AccommodationSelectOption } from "@/modules/accommodation/shared/accommodation-room-rates.types";
import type { AccommodationDialogProps } from "@/modules/accommodation/ui/components/dialogs/accommodation-dialog-types";
import type { SeasonOption } from "@/modules/season/lib/season-api";

type AccommodationRoomRateHeaderDialogProps = AccommodationDialogProps & {
  row: RoomRateHeader | null;
  form: RoomRateHeaderFormState;
  setForm: (next: RoomRateHeaderFormState) => void;
  seasons: SeasonOption[];
  currencyOptions: AccommodationSelectOption[];
  lookupLoading: boolean;
};

export function AccommodationRoomRateHeaderDialog({
  open,
  mode,
  row,
  form,
  setForm,
  seasons,
  currencyOptions,
  lookupLoading,
  saving,
  isReadOnly,
  onOpenChange,
  onCancel,
  onSubmit,
}: AccommodationRoomRateHeaderDialogProps) {
  const showCurrencyLoading = lookupLoading && currencyOptions.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Room Rate Header" : "Edit Room Rate Header"}</DialogTitle>
        </DialogHeader>
        {showCurrencyLoading ? (
          <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading currencies...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Header Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Season (Optional)</Label>
              <Select
                value={form.seasonId || "__none__"}
                onValueChange={(value) => setForm({ ...form, seasonId: value === "__none__" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Season</SelectItem>
                  {seasons.map((season) => <SelectItem key={season.id} value={season.id}>{season.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(value) => setForm({ ...form, currency: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valid From</Label>
              <Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Valid To</Label>
              <Input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3 md:col-span-2">
              <Label>Active</Label>
              <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
            </div>
          </div>
        )}
        <DialogFooter>
          <RecordAuditMeta row={row} className="mr-auto" />
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={showCurrencyLoading || saving || (isReadOnly && mode === "create")} onClick={onSubmit}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
