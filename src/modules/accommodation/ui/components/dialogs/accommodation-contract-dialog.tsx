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

export type AccommodationContractFormState = {
  code: string;
  supplierOrgId: string;
  contractRef: string;
  currencyCode: string;
  validFrom: string;
  validTo: string;
  releaseDaysDefault: string;
  marketScope: string;
  remarks: string;
  status: string;
  isActive: boolean;
};

type Option = { value: string; label: string };

type AccommodationContractDialogProps = AccommodationDialogProps & {
  form: AccommodationContractFormState;
  setForm: (value: AccommodationContractFormState | ((current: AccommodationContractFormState) => AccommodationContractFormState)) => void;
  supplierOptions: Option[];
};

const contractStatuses = ["DRAFT", "ACTIVE", "SUSPENDED", "EXPIRED", "ARCHIVED"];
const marketScopes = ["ALL_MARKETS", "SPECIFIC_MARKET", "SPECIFIC_COUNTRY"];

export function AccommodationContractDialog({
  open,
  mode,
  saving,
  isReadOnly,
  form,
  setForm,
  supplierOptions,
  onOpenChange,
  onCancel,
  onSubmit,
}: AccommodationContractDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Hotel Contract" : "Edit Hotel Contract"}</DialogTitle>
          <DialogDescription>
            Maintain buy-side contract validity, supplier reference, release policy, and commercial scope.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Contract code</Label>
            <Input
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              disabled={saving || isReadOnly}
              placeholder="HTL-CNTR-001"
            />
          </div>
          <div className="grid gap-2">
            <Label>Supplier</Label>
            <Select
              value={form.supplierOrgId || "__none__"}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, supplierOrgId: value === "__none__" ? "" : value }))
              }
              disabled={saving || isReadOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No supplier link</SelectItem>
                {supplierOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Supplier contract reference</Label>
            <Input
              value={form.contractRef}
              onChange={(event) => setForm((current) => ({ ...current, contractRef: event.target.value }))}
              disabled={saving || isReadOnly}
              placeholder="CN-2026-SUMMER"
            />
          </div>
          <div className="grid gap-2">
            <Label>Currency</Label>
            <Input
              value={form.currencyCode}
              onChange={(event) =>
                setForm((current) => ({ ...current, currencyCode: event.target.value.toUpperCase().slice(0, 3) }))
              }
              disabled={saving || isReadOnly}
              placeholder="USD"
              maxLength={3}
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
            <Label>Default release days</Label>
            <Input
              type="number"
              min="0"
              value={form.releaseDaysDefault}
              onChange={(event) => setForm((current) => ({ ...current, releaseDaysDefault: event.target.value }))}
              disabled={saving || isReadOnly}
              placeholder="14"
            />
          </div>
          <div className="grid gap-2">
            <Label>Market scope</Label>
            <Select
              value={form.marketScope || "__none__"}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, marketScope: value === "__none__" ? "" : value }))
              }
              disabled={saving || isReadOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select market scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No restriction</SelectItem>
                {marketScopes.map((scope) => (
                  <SelectItem key={scope} value={scope}>
                    {scope}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}
              disabled={saving || isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contractStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <Checkbox
              id="contract-is-active"
              checked={form.isActive}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, isActive: checked === true }))
              }
              disabled={saving || isReadOnly}
            />
            <Label htmlFor="contract-is-active">Contract is active</Label>
          </div>

          <div className="grid gap-2 md:col-span-2">
            <Label>Remarks</Label>
            <Textarea
              value={form.remarks}
              onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))}
              disabled={saving || isReadOnly}
              placeholder="Operational notes, blackout clauses, payment terms, or contracting remarks."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={saving || isReadOnly}>
            {saving ? "Saving..." : mode === "create" ? "Create Contract" : "Save Contract"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
