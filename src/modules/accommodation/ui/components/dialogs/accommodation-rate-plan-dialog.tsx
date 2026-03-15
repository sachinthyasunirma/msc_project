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
import { Textarea } from "@/components/ui/textarea";
import type { AccommodationDialogProps } from "@/modules/accommodation/ui/components/dialogs/accommodation-dialog-types";
import {
  HOTEL_BOARD_BASES,
  HOTEL_CONTRACT_STATUSES,
  HOTEL_RATE_PRICING_MODELS,
  HOTEL_RATE_TYPES,
} from "@/modules/accommodation/shared/accommodation-contracting-types";

export type AccommodationRatePlanFormState = {
  code: string;
  name: string;
  description: string;
  rateType: string;
  boardBasis: string;
  pricingModel: string;
  cancellationPolicyId: string;
  validFrom: string;
  validTo: string;
  bookingFrom: string;
  bookingTo: string;
  releaseDaysOverride: string;
  marketCode: string;
  guestNationalityScope: string;
  isRefundable: boolean;
  isCommissionable: boolean;
  isPackageOnly: boolean;
  priority: string;
  status: string;
  isActive: boolean;
};

type Option = { value: string; label: string };

type AccommodationRatePlanDialogProps = AccommodationDialogProps & {
  form: AccommodationRatePlanFormState;
  setForm: (
    value:
      | AccommodationRatePlanFormState
      | ((current: AccommodationRatePlanFormState) => AccommodationRatePlanFormState)
  ) => void;
  cancellationPolicyOptions: Option[];
};

export function AccommodationRatePlanDialog({
  open,
  mode,
  saving,
  isReadOnly,
  form,
  setForm,
  cancellationPolicyOptions,
  onOpenChange,
  onCancel,
  onSubmit,
}: AccommodationRatePlanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Rate Plan" : "Edit Rate Plan"}</DialogTitle>
          <DialogDescription>
            Define plan type, validity, booking window, commercial flags, and pricing behavior for this contract.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Rate plan code</Label>
            <Input
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              disabled={saving || isReadOnly}
              placeholder="BB-FIT"
            />
          </div>
          <div className="grid gap-2">
            <Label>Rate plan name</Label>
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              disabled={saving || isReadOnly}
              placeholder="Bed & Breakfast FIT"
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              disabled={saving || isReadOnly}
              placeholder="Commercial notes for this rate plan."
            />
          </div>
          <div className="grid gap-2">
            <Label>Rate type</Label>
            <Select
              value={form.rateType}
              onValueChange={(value) => setForm((current) => ({ ...current, rateType: value }))}
              disabled={saving || isReadOnly}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOTEL_RATE_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Board basis</Label>
            <Select
              value={form.boardBasis}
              onValueChange={(value) => setForm((current) => ({ ...current, boardBasis: value }))}
              disabled={saving || isReadOnly}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOTEL_BOARD_BASES.map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Pricing model</Label>
            <Select
              value={form.pricingModel}
              onValueChange={(value) => setForm((current) => ({ ...current, pricingModel: value }))}
              disabled={saving || isReadOnly}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOTEL_RATE_PRICING_MODELS.map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Cancellation policy</Label>
            <Select
              value={form.cancellationPolicyId || "__none__"}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  cancellationPolicyId: value === "__none__" ? "" : value,
                }))
              }
              disabled={saving || isReadOnly}
            >
              <SelectTrigger><SelectValue placeholder="Select cancellation policy" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No linked policy</SelectItem>
                {cancellationPolicyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Valid from</Label>
            <Input type="date" value={form.validFrom} onChange={(event) => setForm((current) => ({ ...current, validFrom: event.target.value }))} disabled={saving || isReadOnly} />
          </div>
          <div className="grid gap-2">
            <Label>Valid to</Label>
            <Input type="date" value={form.validTo} onChange={(event) => setForm((current) => ({ ...current, validTo: event.target.value }))} disabled={saving || isReadOnly} />
          </div>
          <div className="grid gap-2">
            <Label>Booking from</Label>
            <Input type="date" value={form.bookingFrom} onChange={(event) => setForm((current) => ({ ...current, bookingFrom: event.target.value }))} disabled={saving || isReadOnly} />
          </div>
          <div className="grid gap-2">
            <Label>Booking to</Label>
            <Input type="date" value={form.bookingTo} onChange={(event) => setForm((current) => ({ ...current, bookingTo: event.target.value }))} disabled={saving || isReadOnly} />
          </div>
          <div className="grid gap-2">
            <Label>Release days override</Label>
            <Input type="number" min="0" value={form.releaseDaysOverride} onChange={(event) => setForm((current) => ({ ...current, releaseDaysOverride: event.target.value }))} disabled={saving || isReadOnly} placeholder="Optional" />
          </div>
          <div className="grid gap-2">
            <Label>Market code</Label>
            <Input value={form.marketCode} onChange={(event) => setForm((current) => ({ ...current, marketCode: event.target.value }))} disabled={saving || isReadOnly} placeholder="FIT / GIT / WEB" />
          </div>
          <div className="grid gap-2">
            <Label>Guest nationality scope</Label>
            <Input value={form.guestNationalityScope} onChange={(event) => setForm((current) => ({ ...current, guestNationalityScope: event.target.value }))} disabled={saving || isReadOnly} placeholder="ALL or LK,IN,GB" />
          </div>
          <div className="grid gap-2">
            <Label>Priority</Label>
            <Input type="number" min="0" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} disabled={saving || isReadOnly} />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))} disabled={saving || isReadOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOTEL_CONTRACT_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 md:col-span-2 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-center gap-3">
              <Checkbox id="rate-plan-refundable" checked={form.isRefundable} onCheckedChange={(checked) => setForm((current) => ({ ...current, isRefundable: checked === true }))} disabled={saving || isReadOnly} />
              <Label htmlFor="rate-plan-refundable">Refundable</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="rate-plan-commissionable" checked={form.isCommissionable} onCheckedChange={(checked) => setForm((current) => ({ ...current, isCommissionable: checked === true }))} disabled={saving || isReadOnly} />
              <Label htmlFor="rate-plan-commissionable">Commissionable</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="rate-plan-package-only" checked={form.isPackageOnly} onCheckedChange={(checked) => setForm((current) => ({ ...current, isPackageOnly: checked === true }))} disabled={saving || isReadOnly} />
              <Label htmlFor="rate-plan-package-only">Package only</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="rate-plan-active" checked={form.isActive} onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked === true }))} disabled={saving || isReadOnly} />
              <Label htmlFor="rate-plan-active">Active</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={saving || isReadOnly}>
            {saving ? "Saving..." : mode === "create" ? "Create Rate Plan" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
