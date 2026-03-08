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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toNightCount } from "@/modules/pre-tour/ui/views/pre-tour-management/utils";

type CopyForm = {
  planCode: string;
  title: string;
  startDate: string;
  endDate: string;
  totalNights: string;
  adults: string;
  children: string;
  infants: string;
  categoryId: string;
  operatorOrgId: string;
  marketOrgId: string;
  currencyCode: string;
  priceMode: string;
};

type PreTourCopyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copyForm: CopyForm;
  setCopyForm: (updater: (prev: CopyForm) => CopyForm) => void;
  allTourCategoryOptions: Array<{ value: string; label: string }>;
  marketOrganizationOptions: Array<{ value: string; label: string }>;
  copyOperatorOptions: Array<{ value: string; label: string }>;
  hasContractForCopyMarket: boolean;
  currencyOptions: Array<{ value: string; label: string }>;
  copySaving: boolean;
  isReadOnly: boolean;
  onSubmit: () => void;
};

export function PreTourCopyDialog({
  open,
  onOpenChange,
  copyForm,
  setCopyForm,
  allTourCategoryOptions,
  marketOrganizationOptions,
  copyOperatorOptions,
  hasContractForCopyMarket,
  currencyOptions,
  copySaving,
  isReadOnly,
  onSubmit,
}: PreTourCopyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Copy Pre-Tour</DialogTitle>
          <DialogDescription>Update header details before creating the copied pre-tour.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <Label className="mb-1 block text-xs">Plan Code *</Label>
            <Input
              value={copyForm.planCode}
              onChange={(event) => setCopyForm((prev) => ({ ...prev, planCode: event.target.value }))}
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Title *</Label>
            <Input
              value={copyForm.title}
              onChange={(event) => setCopyForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Tour Category *</Label>
            <Select
              value={copyForm.categoryId}
              onValueChange={(value) => setCopyForm((prev) => ({ ...prev, categoryId: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {allTourCategoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs">Market *</Label>
            <Select
              value={copyForm.marketOrgId}
              onValueChange={(value) => setCopyForm((prev) => ({ ...prev, marketOrgId: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select market" />
              </SelectTrigger>
              <SelectContent>
                {marketOrganizationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs">Operator *</Label>
            <Select
              value={copyForm.operatorOrgId}
              onValueChange={(value) => setCopyForm((prev) => ({ ...prev, operatorOrgId: value }))}
              disabled={!copyForm.marketOrgId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={copyForm.marketOrgId ? "Select operator" : "Select market first"} />
              </SelectTrigger>
              <SelectContent>
                {copyOperatorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!copyForm.marketOrgId ? (
              <p className="mt-1 text-xs text-muted-foreground">Select a market to load relevant operators.</p>
            ) : null}
            {copyForm.marketOrgId && !hasContractForCopyMarket ? (
              <p className="mt-1 text-xs text-muted-foreground">
                No active contracts for selected market. Showing all operators.
              </p>
            ) : null}
          </div>
          <div>
            <Label className="mb-1 block text-xs">Start Date *</Label>
            <Input
              type="datetime-local"
              value={copyForm.startDate}
              onChange={(event) =>
                setCopyForm((prev) => {
                  const startDate = event.target.value;
                  return { ...prev, startDate, totalNights: String(toNightCount(startDate, prev.endDate)) };
                })
              }
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">End Date *</Label>
            <Input
              type="datetime-local"
              value={copyForm.endDate}
              onChange={(event) =>
                setCopyForm((prev) => {
                  const endDate = event.target.value;
                  return { ...prev, endDate, totalNights: String(toNightCount(prev.startDate, endDate)) };
                })
              }
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Total Nights</Label>
            <Input type="number" value={copyForm.totalNights} readOnly className="bg-muted/30 text-muted-foreground" />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Adults</Label>
            <Input
              type="number"
              value={copyForm.adults}
              onChange={(event) => setCopyForm((prev) => ({ ...prev, adults: event.target.value }))}
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Children</Label>
            <Input
              type="number"
              value={copyForm.children}
              onChange={(event) => setCopyForm((prev) => ({ ...prev, children: event.target.value }))}
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Infants</Label>
            <Input
              type="number"
              value={copyForm.infants}
              onChange={(event) => setCopyForm((prev) => ({ ...prev, infants: event.target.value }))}
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Currency</Label>
            <Select
              value={copyForm.currencyCode}
              onValueChange={(value) => setCopyForm((prev) => ({ ...prev, currencyCode: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs">Price Mode</Label>
            <Select
              value={copyForm.priceMode}
              onValueChange={(value) => setCopyForm((prev) => ({ ...prev, priceMode: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select price mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXCLUSIVE">EXCLUSIVE</SelectItem>
                <SelectItem value="INCLUSIVE">INCLUSIVE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={copySaving || isReadOnly}>
            {copySaving ? "Copying..." : "Copy Pre-Tour"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

