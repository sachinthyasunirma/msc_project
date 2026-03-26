"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { Hotel } from "@/modules/accommodation/lib/accommodation-api";
import type { HotelFormState } from "@/modules/accommodation/lib/accommodation-view-helpers";
import type { HotelSystemLocationOption } from "@/modules/accommodation/lib/use-accommodation-hotel-list";
import type { AccommodationDialogProps } from "@/modules/accommodation/ui/components/dialogs/accommodation-dialog-types";

type AccommodationHotelDialogProps = AccommodationDialogProps & {
  row: Hotel | null;
  form: HotelFormState;
  setForm: (next: HotelFormState) => void;
  locationOptions: HotelSystemLocationOption[];
  loadingLocations: boolean;
};

export function AccommodationHotelDialog({
  open,
  mode,
  row,
  form,
  setForm,
  locationOptions,
  loadingLocations,
  saving,
  isReadOnly,
  onOpenChange,
  onCancel,
  onSubmit,
}: AccommodationHotelDialogProps) {
  const selectedLocation =
    locationOptions.find((location) => location.id === form.locationId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Hotel" : "Edit Hotel"}</DialogTitle>
          <DialogDescription>Hotel (accommodation) details.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>System Location</Label>
            <Select
              value={form.locationId || undefined}
              onValueChange={(value) => {
                const nextLocation = locationOptions.find((location) => location.id === value);
                if (!nextLocation) return;

                const shouldReplaceAddress =
                  form.address.trim().length === 0 ||
                  (selectedLocation !== null && form.address.trim() === selectedLocation.address.trim());

                setForm({
                  ...form,
                  locationId: nextLocation.id,
                  city: nextLocation.city || form.city,
                  country: nextLocation.country || form.country,
                  address: shouldReplaceAddress ? nextLocation.address || form.address : form.address,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingLocations ? "Loading system locations..." : "Select system location"}
                />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              City and country are pulled from the selected system location.
            </p>
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={form.city} readOnly className="bg-muted/40" />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input value={form.country} readOnly className="bg-muted/40" />
          </div>
          <div className="space-y-2">
            <Label>Star Rating</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={form.starRating}
              onChange={(e) => setForm({ ...form, starRating: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Contact Phone</Label>
            <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
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
