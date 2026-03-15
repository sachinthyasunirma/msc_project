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

export type AccommodationContractRoomRateFormState = {
  code: string;
  roomTypeId: string;
  validFrom: string;
  validTo: string;
  baseOccupancyAdults: string;
  maxAdults: string;
  maxChildren: string;
  singleUseRate: string;
  doubleRate: string;
  tripleRate: string;
  quadRate: string;
  extraAdultRate: string;
  childWithBedRate: string;
  childNoBedRate: string;
  infantRate: string;
  singleSupplementRate: string;
  currencyCode: string;
  taxMode: string;
  isActive: boolean;
};

type Option = { value: string; label: string };

type AccommodationContractRoomRateDialogProps = AccommodationDialogProps & {
  form: AccommodationContractRoomRateFormState;
  setForm: (
    value:
      | AccommodationContractRoomRateFormState
      | ((current: AccommodationContractRoomRateFormState) => AccommodationContractRoomRateFormState)
  ) => void;
  roomTypeOptions: Option[];
};

const taxModes = ["EXCLUSIVE", "INCLUSIVE"];

export function AccommodationContractRoomRateDialog({
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
}: AccommodationContractRoomRateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Occupancy Room Rate" : "Edit Occupancy Room Rate"}</DialogTitle>
          <DialogDescription>
            Maintain the contracted buy-side room price matrix by room type, validity, occupancy, and tax mode.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2">
            <Label>Rate code</Label>
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
              <SelectTrigger>
                <SelectValue placeholder="Select room type" />
              </SelectTrigger>
              <SelectContent>
                {roomTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Currency</Label>
            <Input
              value={form.currencyCode}
              onChange={(event) =>
                setForm((current) => ({ ...current, currencyCode: event.target.value.toUpperCase().slice(0, 3) }))
              }
              disabled={saving || isReadOnly}
              maxLength={3}
            />
          </div>
          <div className="grid gap-2">
            <Label>Tax mode</Label>
            <Select
              value={form.taxMode}
              onValueChange={(value) => setForm((current) => ({ ...current, taxMode: value }))}
              disabled={saving || isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taxModes.map((modeValue) => (
                  <SelectItem key={modeValue} value={modeValue}>
                    {modeValue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Valid from</Label>
            <Input
              type="date"
              value={form.validFrom}
              onChange={(event) => setForm((current) => ({ ...current, validFrom: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Valid to</Label>
            <Input
              type="date"
              value={form.validTo}
              onChange={(event) => setForm((current) => ({ ...current, validTo: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Base occupancy adults</Label>
            <Input
              type="number"
              min="1"
              value={form.baseOccupancyAdults}
              onChange={(event) =>
                setForm((current) => ({ ...current, baseOccupancyAdults: event.target.value }))
              }
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Max adults</Label>
            <Input
              type="number"
              min="1"
              value={form.maxAdults}
              onChange={(event) => setForm((current) => ({ ...current, maxAdults: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>

          <div className="grid gap-2">
            <Label>Max children</Label>
            <Input
              type="number"
              min="0"
              value={form.maxChildren}
              onChange={(event) => setForm((current) => ({ ...current, maxChildren: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Single use</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.singleUseRate}
              onChange={(event) => setForm((current) => ({ ...current, singleUseRate: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Double</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.doubleRate}
              onChange={(event) => setForm((current) => ({ ...current, doubleRate: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Triple</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.tripleRate}
              onChange={(event) => setForm((current) => ({ ...current, tripleRate: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>

          <div className="grid gap-2">
            <Label>Quad</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.quadRate}
              onChange={(event) => setForm((current) => ({ ...current, quadRate: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Extra adult</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.extraAdultRate}
              onChange={(event) =>
                setForm((current) => ({ ...current, extraAdultRate: event.target.value }))
              }
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Child with bed</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.childWithBedRate}
              onChange={(event) =>
                setForm((current) => ({ ...current, childWithBedRate: event.target.value }))
              }
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Child no bed</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.childNoBedRate}
              onChange={(event) =>
                setForm((current) => ({ ...current, childNoBedRate: event.target.value }))
              }
              disabled={saving || isReadOnly}
            />
          </div>

          <div className="grid gap-2">
            <Label>Infant</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.infantRate}
              onChange={(event) => setForm((current) => ({ ...current, infantRate: event.target.value }))}
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Single supplement</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.singleSupplementRate}
              onChange={(event) =>
                setForm((current) => ({ ...current, singleSupplementRate: event.target.value }))
              }
              disabled={saving || isReadOnly}
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Checkbox
              id="contract-room-rate-active"
              checked={form.isActive}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, isActive: checked === true }))
              }
              disabled={saving || isReadOnly}
            />
            <Label htmlFor="contract-room-rate-active">Active</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={saving || isReadOnly}>
            {saving ? "Saving..." : mode === "create" ? "Create Room Rate" : "Save Room Rate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
