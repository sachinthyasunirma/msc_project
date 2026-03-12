"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RecordAuditMeta } from "@/components/ui/record-audit-meta";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeCodePart } from "@/modules/pre-tour/lib/pre-tour-management-utils";
import { buildPreTourPricingSnapshot } from "@/modules/pre-tour/lib/pricing/pricing-snapshot-builder";
import {
  calculateCommercialPricing,
  toMoney,
} from "@/modules/pre-tour/lib/pricing/markup-calculator";
import { PreTourItemPricingSummary } from "@/modules/pre-tour/ui/components/pre-tour-item-pricing-summary";
import type { Row } from "@/modules/pre-tour/shared/pre-tour-management-types";

type Option = { value: string; label: string };

type GuideAllocationFormState = {
  code: string;
  title: string;
  status: "PLANNED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  serviceId: string;
  coverageMode: "FULL_TOUR" | "DAY_RANGE";
  startDayId: string;
  endDayId: string;
  language: string;
  guideBasis: string;
  pax: string;
  units: string;
  currencyCode: string;
  buyBaseAmount: string;
  buyTaxAmount: string;
  markupMode: "NONE" | "PERCENT" | "FIXED";
  markupValue: string;
  notes: string;
};

type PreTourGuideAllocationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  row: Row | null;
  isReadOnly: boolean;
  saving: boolean;
  selectedPlan: Row | null;
  companyBaseCurrencyCode: string;
  guideOptions: Option[];
  dayOptions: Option[];
  onSubmit: (payload: Record<string, unknown>) => Promise<void> | void;
};

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function toNumberString(value: unknown, fallback = "0") {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(numeric) ? String(numeric) : fallback;
}

function createInitialState(args: {
  row: Row | null;
  selectedPlan: Row | null;
  companyBaseCurrencyCode: string;
}): GuideAllocationFormState {
  const { row, selectedPlan, companyBaseCurrencyCode } = args;
  const snapshot =
    row?.pricingSnapshot && typeof row.pricingSnapshot === "object" && !Array.isArray(row.pricingSnapshot)
      ? (row.pricingSnapshot as Record<string, unknown>)
      : null;

  return {
    code: toStringValue(row?.code),
    title: toStringValue(row?.title),
    status: (() => {
      const status = toStringValue(row?.status).toUpperCase();
      if (status === "CONFIRMED" || status === "CANCELLED" || status === "COMPLETED") return status;
      return "PLANNED";
    })(),
    serviceId: toStringValue(row?.serviceId),
    coverageMode:
      toStringValue(row?.coverageMode).toUpperCase() === "DAY_RANGE" ? "DAY_RANGE" : "FULL_TOUR",
    startDayId: toStringValue(row?.startDayId),
    endDayId: toStringValue(row?.endDayId),
    language: toStringValue(row?.language || snapshot?.language || selectedPlan?.preferredLanguage),
    guideBasis: toStringValue(row?.guideBasis || snapshot?.guideBasis),
    pax: toNumberString(row?.pax, toNumberString(selectedPlan?.adults, "1")),
    units: toNumberString(row?.units, "1"),
    currencyCode: toStringValue(row?.currencyCode || selectedPlan?.currencyCode) || companyBaseCurrencyCode,
    buyBaseAmount: toNumberString(row?.baseAmount, "0"),
    buyTaxAmount: toNumberString(row?.taxAmount, "0"),
    markupMode:
      toStringValue(snapshot?.commercial && (snapshot.commercial as Record<string, unknown>).markupMode) === "PERCENT"
        ? "PERCENT"
        : toStringValue(snapshot?.commercial && (snapshot.commercial as Record<string, unknown>).markupMode) === "FIXED"
          ? "FIXED"
          : "NONE",
    markupValue: toNumberString(
      snapshot?.commercial && (snapshot.commercial as Record<string, unknown>).markupValue,
      "0"
    ),
    notes: toStringValue(row?.notes),
  };
}

function buildCode(currentCode: string, selectedPlan: Row | null) {
  if (currentCode.trim()) return currentCode.trim().toUpperCase();
  const planCode = sanitizeCodePart(toStringValue(selectedPlan?.planCode || selectedPlan?.code || "PRE_TOUR"));
  return `${planCode}_GUIDE`.slice(0, 80);
}

export function PreTourGuideAllocationDialog({
  open,
  onOpenChange,
  mode,
  row,
  isReadOnly,
  saving,
  selectedPlan,
  companyBaseCurrencyCode,
  guideOptions,
  dayOptions,
  onSubmit,
}: PreTourGuideAllocationDialogProps) {
  const [form, setForm] = useState<GuideAllocationFormState>(
    createInitialState({ row, selectedPlan, companyBaseCurrencyCode })
  );
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(createInitialState({ row, selectedPlan, companyBaseCurrencyCode }));
    setValidationError("");
  }, [companyBaseCurrencyCode, open, row, selectedPlan]);

  const guideMap = useMemo(
    () => new Map(guideOptions.map((option) => [option.value, option.label])),
    [guideOptions]
  );
  const buyBaseAmount = toMoney(form.buyBaseAmount);
  const buyTaxAmount = toMoney(form.buyTaxAmount);
  const buyTotalAmount = toMoney(buyBaseAmount + buyTaxAmount);
  const commercialPricing = useMemo(
    () =>
      calculateCommercialPricing({
        buyBaseAmount,
        buyTaxAmount,
        markupMode: form.markupMode,
        markupValue: toMoney(form.markupValue),
      }),
    [buyBaseAmount, buyTaxAmount, form.markupMode, form.markupValue]
  );

  const handleSave = async () => {
    try {
      setValidationError("");
      if (!selectedPlan) throw new Error("Pre-tour header is required before saving guide allocation.");
      if (!form.serviceId) throw new Error("Select a guide.");
      if (form.coverageMode === "DAY_RANGE" && (!form.startDayId || !form.endDayId)) {
        throw new Error("Start day and end day are required for guide day-range coverage.");
      }
      if (buyTotalAmount <= 0) throw new Error("Buy amount must be greater than zero.");

      const snapshot = buildPreTourPricingSnapshot({
        sourceRate: null,
        currencyCode: form.currencyCode,
        buyBaseAmount,
        buyTaxAmount,
        buyTotalAmount,
        markupMode: form.markupMode,
        markupValue: toMoney(form.markupValue),
        sellBaseAmount: commercialPricing.sellBaseAmount,
        sellTaxAmount: commercialPricing.sellTaxAmount,
        sellTotalAmount: commercialPricing.sellTotalAmount,
        priceMode: "EXCLUSIVE",
        overrideApplied: false,
        dimensions: {
          coverageMode: form.coverageMode,
          startDayId: form.coverageMode === "DAY_RANGE" ? form.startDayId : null,
          endDayId: form.coverageMode === "DAY_RANGE" ? form.endDayId : null,
          language: form.language || null,
          guideBasis: form.guideBasis || null,
          pax: Number(form.pax || "0"),
          quantity: Number(form.units || "1"),
        },
      });

      await onSubmit({
        code: buildCode(form.code, selectedPlan),
        planId: toStringValue(selectedPlan.id),
        serviceId: form.serviceId,
        coverageMode: form.coverageMode,
        startDayId: form.coverageMode === "DAY_RANGE" ? form.startDayId : null,
        endDayId: form.coverageMode === "DAY_RANGE" ? form.endDayId : null,
        language: form.language || null,
        guideBasis: form.guideBasis || null,
        pax: Number(form.pax || "0"),
        units: Number(form.units || "1"),
        rateId: null,
        currencyCode: form.currencyCode,
        priceMode: "EXCLUSIVE",
        baseAmount: buyBaseAmount,
        taxAmount: buyTaxAmount,
        totalAmount: buyTotalAmount,
        pricingSnapshot: snapshot as unknown as Record<string, unknown>,
        title: form.title.trim() || guideMap.get(form.serviceId) || "Guide Allocation",
        notes: form.notes.trim() || null,
        status: form.status,
        isActive: true,
      });
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Failed to save guide allocation.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add" : "Edit"} Guide Allocation</DialogTitle>
          <DialogDescription>
            Allocate guide services at the tour level, either for the full tour or for a selected day range.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Code</span>
                <Input
                  value={form.code}
                  onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                  placeholder="Auto-generated if blank"
                  disabled={isReadOnly}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Status</span>
                <Select
                  value={form.status}
                  onValueChange={(status) =>
                    setForm((current) => ({ ...current, status: status as GuideAllocationFormState["status"] }))
                  }
                  disabled={isReadOnly}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED">Planned</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-medium">Commercial title</span>
                <Input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Optional title override"
                  disabled={isReadOnly}
                />
              </label>
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-medium">Guide</span>
                <Select
                  value={form.serviceId}
                  onValueChange={(serviceId) => setForm((current) => ({ ...current, serviceId }))}
                  disabled={isReadOnly}
                >
                  <SelectTrigger><SelectValue placeholder="Select guide" /></SelectTrigger>
                  <SelectContent>
                    {guideOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Coverage</span>
                <Select
                  value={form.coverageMode}
                  onValueChange={(coverageMode) =>
                    setForm((current) => ({
                      ...current,
                      coverageMode: coverageMode as GuideAllocationFormState["coverageMode"],
                    }))
                  }
                  disabled={isReadOnly}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TOUR">Full tour</SelectItem>
                    <SelectItem value="DAY_RANGE">Day range</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Language</span>
                <Input
                  value={form.language}
                  onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}
                  placeholder="English / German / French"
                  disabled={isReadOnly}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Guide basis</span>
                <Input
                  value={form.guideBasis}
                  onChange={(event) => setForm((current) => ({ ...current, guideBasis: event.target.value }))}
                  placeholder="Full tour / full day / transfer escort"
                  disabled={isReadOnly}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Pax</span>
                <Input
                  type="number"
                  min="0"
                  value={form.pax}
                  onChange={(event) => setForm((current) => ({ ...current, pax: event.target.value }))}
                  disabled={isReadOnly}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Quantity</span>
                <Input
                  type="number"
                  min="1"
                  value={form.units}
                  onChange={(event) => setForm((current) => ({ ...current, units: event.target.value }))}
                  disabled={isReadOnly}
                />
              </label>
            </div>

            {form.coverageMode === "DAY_RANGE" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Start day</span>
                  <Select
                    value={form.startDayId}
                    onValueChange={(startDayId) => setForm((current) => ({ ...current, startDayId }))}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger><SelectValue placeholder="Select start day" /></SelectTrigger>
                    <SelectContent>
                      {dayOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">End day</span>
                  <Select
                    value={form.endDayId}
                    onValueChange={(endDayId) => setForm((current) => ({ ...current, endDayId }))}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger><SelectValue placeholder="Select end day" /></SelectTrigger>
                    <SelectContent>
                      {dayOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
            ) : (
              <Card className="border-border/70">
                <CardContent className="px-4 py-3 text-sm text-muted-foreground">
                  Full-tour coverage applies one guide commercial line across the whole itinerary.
                </CardContent>
              </Card>
            )}

            <label className="grid gap-2 text-sm">
              <span className="font-medium">Operational notes</span>
              <Textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Pickup rules, accommodation arrangement, or escort notes."
                disabled={isReadOnly}
              />
            </label>
          </div>

          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <Card className="border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Commercial Pricing</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Currency</span>
                  <Input value={form.currencyCode} disabled />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Buy base amount</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.buyBaseAmount}
                    onChange={(event) => setForm((current) => ({ ...current, buyBaseAmount: event.target.value }))}
                    disabled={isReadOnly}
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Buy tax amount</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.buyTaxAmount}
                    onChange={(event) => setForm((current) => ({ ...current, buyTaxAmount: event.target.value }))}
                    disabled={isReadOnly}
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Markup mode</span>
                  <Select
                    value={form.markupMode}
                    onValueChange={(markupMode) =>
                      setForm((current) => ({ ...current, markupMode: markupMode as GuideAllocationFormState["markupMode"] }))
                    }
                    disabled={isReadOnly}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="PERCENT">Percent</SelectItem>
                      <SelectItem value="FIXED">Fixed amount</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Markup value</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.markupValue}
                    onChange={(event) => setForm((current) => ({ ...current, markupValue: event.target.value }))}
                    disabled={isReadOnly || form.markupMode === "NONE"}
                  />
                </label>
              </CardContent>
            </Card>

            <PreTourItemPricingSummary
              currencyCode={form.currencyCode}
              buyBaseAmount={buyBaseAmount}
              buyTaxAmount={buyTaxAmount}
              buyTotalAmount={buyTotalAmount}
              commercialPricing={commercialPricing}
              priceMode="EXCLUSIVE"
              sourceRate={null}
              overrideApplied={false}
            />
          </div>
        </div>

        <DialogFooter>
          <RecordAuditMeta row={row} className="mr-auto" />
          {validationError ? <p className="mr-auto text-sm text-destructive">{validationError}</p> : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || isReadOnly}>
            {saving ? "Saving..." : "Save Guide Allocation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
