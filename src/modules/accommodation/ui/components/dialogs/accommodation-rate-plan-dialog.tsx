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

export type AccommodationRatePlanFormState = {
  code: string;
  name: string;
  boardBasis: string;
  pricingModel: string;
  cancellationPolicyId: string;
  validFrom: string;
  validTo: string;
  releaseDaysOverride: string;
  marketCode: string;
  guestNationalityScope: string;
  isRefundable: boolean;
  isCommissionable: boolean;
  isPackageOnly: boolean;
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

const boardBases = ["RO", "BB", "HB", "FB", "AI"];

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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Rate Plan" : "Edit Rate Plan"}</DialogTitle>
          <DialogDescription>
            Define the commercial board basis, validity, cancellation linkage, and selling restrictions for this contract plan.
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

          <div className="grid gap-2">
            <Label>Board basis</Label>
            <Select
              value={form.boardBasis}
              onValueChange={(value) => setForm((current) => ({ ...current, boardBasis: value }))}
              disabled={saving || isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {boardBases.map((basis) => (
                  <SelectItem key={basis} value={basis}>
                    {basis}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Pricing model</Label>
            <Input value={form.pricingModel} disabled />
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
              <SelectTrigger>
                <SelectValue placeholder="Select cancellation policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No linked policy</SelectItem>
                {cancellationPolicyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Release days override</Label>
            <Input
              type="number"
              min="0"
              value={form.releaseDaysOverride}
              onChange={(event) =>
                setForm((current) => ({ ...current, releaseDaysOverride: event.target.value }))
              }
              disabled={saving || isReadOnly}
              placeholder="Optional"
            />
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
            <Label>Market code</Label>
            <Input
              value={form.marketCode}
              onChange={(event) => setForm((current) => ({ ...current, marketCode: event.target.value }))}
              disabled={saving || isReadOnly}
              placeholder="FIT / GIT / WEB"
            />
          </div>
          <div className="grid gap-2">
            <Label>Guest nationality scope</Label>
            <Input
              value={form.guestNationalityScope}
              onChange={(event) =>
                setForm((current) => ({ ...current, guestNationalityScope: event.target.value }))
              }
              disabled={saving || isReadOnly}
              placeholder="Optional nationality restriction"
            />
          </div>

          <div className="grid gap-3 md:col-span-2 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="rate-plan-refundable"
                checked={form.isRefundable}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, isRefundable: checked === true }))
                }
                disabled={saving || isReadOnly}
              />
              <Label htmlFor="rate-plan-refundable">Refundable</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="rate-plan-commissionable"
                checked={form.isCommissionable}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, isCommissionable: checked === true }))
                }
                disabled={saving || isReadOnly}
              />
              <Label htmlFor="rate-plan-commissionable">Commissionable</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="rate-plan-package-only"
                checked={form.isPackageOnly}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, isPackageOnly: checked === true }))
                }
                disabled={saving || isReadOnly}
              />
              <Label htmlFor="rate-plan-package-only">Package only</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="rate-plan-active"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, isActive: checked === true }))
                }
                disabled={saving || isReadOnly}
              />
              <Label htmlFor="rate-plan-active">Active</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={saving || isReadOnly}>
            {saving ? "Saving..." : mode === "create" ? "Create Rate Plan" : "Save Rate Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
