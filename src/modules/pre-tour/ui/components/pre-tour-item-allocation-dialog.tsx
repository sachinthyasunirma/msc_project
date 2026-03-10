"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { notify } from "@/lib/notify";
import { sanitizeCodePart } from "@/modules/pre-tour/lib/pre-tour-management-utils";
import { resolvePreTourAccommodationRates } from "@/modules/pre-tour/lib/pre-tour-api";
import { buildPreTourPricingSnapshot } from "@/modules/pre-tour/lib/pricing/pricing-snapshot-builder";
import {
  calculateCommercialPricing,
  toMoney,
} from "@/modules/pre-tour/lib/pricing/markup-calculator";
import type {
  PreTourAccommodationRateCard,
  PreTourCommercialPricing,
  PreTourItemAllocationFormState,
  PreTourPricingSnapshot,
  PreTourRateCard,
} from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";
import type { Row } from "@/modules/pre-tour/shared/pre-tour-management-types";
import { AccommodationAllocationTab } from "@/modules/pre-tour/ui/components/item-tabs/accommodation-allocation-tab";
import { ActivityAllocationTab } from "@/modules/pre-tour/ui/components/item-tabs/activity-allocation-tab";
import { SupplementAllocationTab } from "@/modules/pre-tour/ui/components/item-tabs/supplement-allocation-tab";
import { TransportAllocationTab } from "@/modules/pre-tour/ui/components/item-tabs/transport-allocation-tab";
import { PreTourItemPricingSummary } from "@/modules/pre-tour/ui/components/pre-tour-item-pricing-summary";

type Option = { value: string; label: string };

type PreTourItemAllocationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  row: Row | null;
  isReadOnly: boolean;
  saving: boolean;
  selectedPlan: Row | null;
  selectedDay: Row | null;
  companyBaseCurrencyCode: string;
  hotelOptions: Option[];
  activityOptions: Option[];
  transportOptions: Option[];
  canOverrideContractRates: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void> | void;
};

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function toDateInput(value: unknown) {
  const raw = toStringValue(value);
  return raw ? raw.slice(0, 10) : "";
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

function readSnapshot(row: Row | null): PreTourPricingSnapshot | null {
  const snapshot = row?.pricingSnapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  return snapshot as unknown as PreTourPricingSnapshot;
}

function readDimension(snapshot: PreTourPricingSnapshot | null, key: string) {
  return snapshot?.dimensions?.[key];
}

function createInitialState(args: {
  row: Row | null;
  selectedPlan: Row | null;
  selectedDay: Row | null;
  companyBaseCurrencyCode: string;
}): PreTourItemAllocationFormState {
  const { row, selectedPlan, selectedDay, companyBaseCurrencyCode } = args;
  const snapshot = readSnapshot(row);
  const itemType = (() => {
    const value = toStringValue(row?.itemType).toUpperCase();
    if (
      value === "ACCOMMODATION" ||
      value === "ACTIVITY" ||
      value === "TRANSPORT" ||
      value === "GUIDE" ||
      value === "SUPPLEMENT" ||
      value === "MISC"
    ) {
      return value;
    }
    return "ACCOMMODATION";
  })();
  const selectedDayDate = toDateInput(selectedDay?.date);
  const roomRows = Array.isArray(row?.rooms) ? row?.rooms : [];
  const firstRoom =
    roomRows.length > 0 && typeof roomRows[0] === "object" && roomRows[0] !== null
      ? (roomRows[0] as Record<string, unknown>)
      : null;

  return {
    code: toStringValue(row?.code),
    title: toStringValue(row?.title),
    description: toStringValue(row?.description),
    notes: toStringValue(row?.notes),
    status: (() => {
      const status = toStringValue(row?.status).toUpperCase();
      if (status === "CONFIRMED" || status === "CANCELLED" || status === "COMPLETED") return status;
      return "PLANNED";
    })(),
    itemType,
    priceMode:
      toStringValue(row?.priceMode || snapshot?.priceMode || selectedPlan?.priceMode).toUpperCase() ===
      "INCLUSIVE"
        ? "INCLUSIVE"
        : "EXCLUSIVE",
    currencyCode:
      toStringValue(row?.currencyCode || snapshot?.buy.currencyCode || selectedPlan?.currencyCode) ||
      companyBaseCurrencyCode,
    pax: toNumberString(row?.pax, toNumberString(selectedPlan?.adults, "1")),
    units: toNumberString(row?.units, "1"),
    nights: toNumberString(row?.nights, "1"),
    buyBaseAmount: toNumberString(snapshot?.buy.baseAmount ?? row?.baseAmount, "0"),
    buyTaxAmount: toNumberString(snapshot?.buy.taxAmount ?? row?.taxAmount, "0"),
    overrideSourceRate: Boolean(snapshot?.override.applied),
    overrideReason: toStringValue(snapshot?.override.reason),
    markupMode:
      snapshot?.commercial.markupMode === "PERCENT" || snapshot?.commercial.markupMode === "FIXED"
        ? snapshot.commercial.markupMode
        : "NONE",
    markupValue: toNumberString(snapshot?.commercial.markupValue, "0"),
    selectedRateId: toStringValue(row?.rateId || snapshot?.source.sourceRateId),
    accommodation: {
      hotelId: toStringValue(row?.serviceId || readDimension(snapshot, "hotelId")),
      stayDate: toDateInput(
        readDimension(snapshot, "stayDate") || row?.startAt || selectedDayDate || selectedPlan?.startDate
      ),
      roomTypeId: toStringValue(readDimension(snapshot, "roomTypeId")),
      roomBasis: toStringValue(readDimension(snapshot, "roomBasis")),
      occupancy: toStringValue(readDimension(snapshot, "occupancy") || firstRoom?.roomType),
      roomCount: toNumberString(readDimension(snapshot, "roomCount") || firstRoom?.count, "1"),
      nights: toNumberString(readDimension(snapshot, "nights") || row?.nights, "1"),
      roomingContext: toStringValue(readDimension(snapshot, "roomingContext")),
    },
    activity: {
      activityId: itemType === "ACTIVITY" ? toStringValue(row?.serviceId) : toStringValue(readDimension(snapshot, "activityId")),
      unitBasis: toStringValue(readDimension(snapshot, "unitBasis")),
      paxSlab: toStringValue(readDimension(snapshot, "paxSlab")),
      ageBand: toStringValue(readDimension(snapshot, "ageBand")),
      quantity: toNumberString(readDimension(snapshot, "quantity") || row?.units, "1"),
    },
    transport: {
      vehicleTypeId:
        itemType === "TRANSPORT" ? toStringValue(row?.serviceId) : toStringValue(readDimension(snapshot, "vehicleTypeId")),
      unitBasis: toStringValue(readDimension(snapshot, "unitBasis")),
      routeLabel: toStringValue(readDimension(snapshot, "routeLabel")),
      quantity: toNumberString(readDimension(snapshot, "quantity") || row?.units, "1"),
      pax: toNumberString(readDimension(snapshot, "pax") || row?.pax, "1"),
    },
    guide: {
      guideId: itemType === "GUIDE" ? toStringValue(row?.serviceId) : toStringValue(readDimension(snapshot, "guideId")),
      language: toStringValue(readDimension(snapshot, "language") || selectedPlan?.preferredLanguage),
      unitBasis: toStringValue(readDimension(snapshot, "unitBasis")),
      paxSlab: toStringValue(readDimension(snapshot, "paxSlab")),
      quantity: toNumberString(readDimension(snapshot, "quantity") || row?.units, "1"),
    },
    supplement: {
      serviceLabel:
        itemType === "SUPPLEMENT" || itemType === "MISC"
          ? toStringValue(row?.title || readDimension(snapshot, "serviceLabel"))
          : toStringValue(readDimension(snapshot, "serviceLabel")),
      unitBasis: toStringValue(readDimension(snapshot, "unitBasis")),
      quantity: toNumberString(readDimension(snapshot, "quantity") || row?.units, "1"),
    },
  };
}

function buildCode(itemType: string, selectedDay: Row | null, currentCode: string) {
  if (currentCode.trim()) return currentCode.trim().toUpperCase();
  const dayCode = sanitizeCodePart(toStringValue(selectedDay?.code || "DAY"));
  return `${dayCode}_${sanitizeCodePart(itemType)}`.slice(0, 80);
}

function buildDimensions(
  state: PreTourItemAllocationFormState,
  selectedRate: PreTourAccommodationRateCard | null
) {
  switch (state.itemType) {
    case "ACCOMMODATION":
      return {
        hotelId: state.accommodation.hotelId,
        stayDate: state.accommodation.stayDate,
        roomTypeId: selectedRate?.roomTypeId || state.accommodation.roomTypeId,
        roomBasis: selectedRate?.roomBasis || state.accommodation.roomBasis || null,
        occupancy: state.accommodation.occupancy || null,
        roomCount: Number(state.accommodation.roomCount || "1"),
        nights: Number(state.accommodation.nights || "1"),
        roomingContext: state.accommodation.roomingContext || null,
      };
    case "ACTIVITY":
      return {
        activityId: state.activity.activityId,
        unitBasis: state.activity.unitBasis || null,
        paxSlab: state.activity.paxSlab || null,
        ageBand: state.activity.ageBand || null,
        quantity: Number(state.activity.quantity || "1"),
      };
    case "TRANSPORT":
      return {
        vehicleTypeId: state.transport.vehicleTypeId,
        unitBasis: state.transport.unitBasis || null,
        routeLabel: state.transport.routeLabel || null,
        pax: Number(state.transport.pax || "0"),
        quantity: Number(state.transport.quantity || "1"),
      };
    case "GUIDE":
      return {
        guideId: state.guide.guideId,
        language: state.guide.language || null,
        unitBasis: state.guide.unitBasis || null,
        paxSlab: state.guide.paxSlab || null,
        quantity: Number(state.guide.quantity || "1"),
      };
    default:
      return {
        serviceLabel: state.supplement.serviceLabel || null,
        unitBasis: state.supplement.unitBasis || null,
        quantity: Number(state.supplement.quantity || "1"),
      };
  }
}

export function PreTourItemAllocationDialog({
  open,
  onOpenChange,
  mode,
  row,
  isReadOnly,
  saving,
  selectedPlan,
  selectedDay,
  companyBaseCurrencyCode,
  hotelOptions,
  activityOptions,
  transportOptions,
  canOverrideContractRates,
  onSubmit,
}: PreTourItemAllocationDialogProps) {
  const [form, setForm] = useState<PreTourItemAllocationFormState>(
    createInitialState({ row, selectedPlan, selectedDay, companyBaseCurrencyCode })
  );
  const [validationError, setValidationError] = useState("");
  const [accommodationRates, setAccommodationRates] = useState<PreTourAccommodationRateCard[]>([]);
  const [loadingAccommodationRates, setLoadingAccommodationRates] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(createInitialState({ row, selectedPlan, selectedDay, companyBaseCurrencyCode }));
    setValidationError("");
    setAccommodationRates([]);
  }, [companyBaseCurrencyCode, open, row, selectedDay, selectedPlan]);

  useEffect(() => {
    if (!open || form.itemType !== "ACCOMMODATION") return;
    const hotelId = form.accommodation.hotelId;
    const travelDate = form.accommodation.stayDate;
    if (!hotelId || !travelDate) {
      setAccommodationRates([]);
      return;
    }

    let active = true;
    setLoadingAccommodationRates(true);
    resolvePreTourAccommodationRates({
      hotelId,
      travelDate,
      roomTypeId: form.accommodation.roomTypeId || null,
      roomBasis: form.accommodation.roomBasis || null,
    })
      .then((payload) => {
        if (!active) return;
        setAccommodationRates(payload.options);
      })
      .catch((error) => {
        if (!active) return;
        setAccommodationRates([]);
        notify.error(error instanceof Error ? error.message : "Failed to resolve accommodation rates.");
      })
      .finally(() => {
        if (active) setLoadingAccommodationRates(false);
      });

    return () => {
      active = false;
    };
  }, [
    form.accommodation.hotelId,
    form.accommodation.roomBasis,
    form.accommodation.roomTypeId,
    form.accommodation.stayDate,
    form.itemType,
    open,
  ]);

  const isLegacyGuideItem = form.itemType === "GUIDE";
  const tabValue = form.itemType === "MISC" ? "SUPPLEMENT" : form.itemType;
  const selectedAccommodationRate = useMemo(
    () => accommodationRates.find((rate) => rate.sourceRateId === form.selectedRateId) ?? null,
    [accommodationRates, form.selectedRateId]
  );

  useEffect(() => {
    if (!selectedAccommodationRate || form.overrideSourceRate) return;
    setForm((current) => {
      const nextCurrency = selectedAccommodationRate.currencyCode;
      const nextBase = String(selectedAccommodationRate.buyBaseAmount);
      const nextTax = String(selectedAccommodationRate.buyTaxAmount);
      const nextRoomTypeId = current.accommodation.roomTypeId || selectedAccommodationRate.roomTypeId;
      const nextRoomBasis = current.accommodation.roomBasis || selectedAccommodationRate.roomBasis || "";
      if (
        current.currencyCode === nextCurrency &&
        current.buyBaseAmount === nextBase &&
        current.buyTaxAmount === nextTax &&
        current.accommodation.roomTypeId === nextRoomTypeId &&
        current.accommodation.roomBasis === nextRoomBasis
      ) {
        return current;
      }
      return {
        ...current,
        currencyCode: nextCurrency,
        buyBaseAmount: nextBase,
        buyTaxAmount: nextTax,
        accommodation: {
          ...current.accommodation,
          roomTypeId: nextRoomTypeId,
          roomBasis: nextRoomBasis,
        },
      };
    });
  }, [form.overrideSourceRate, selectedAccommodationRate]);

  const buyBaseAmount = toMoney(form.buyBaseAmount);
  const buyTaxAmount = toMoney(form.buyTaxAmount);
  const buyTotalAmount = toMoney(buyBaseAmount + buyTaxAmount);
  const commercialPricing: PreTourCommercialPricing = useMemo(
    () =>
      calculateCommercialPricing({
        buyBaseAmount,
        buyTaxAmount,
        markupMode: form.markupMode,
        markupValue: toMoney(form.markupValue),
      }),
    [buyBaseAmount, buyTaxAmount, form.markupMode, form.markupValue]
  );

  const roomTypeOptions = useMemo(() => {
    const map = new Map<string, string>();
    accommodationRates.forEach((rate) => {
      map.set(rate.roomTypeId, `${rate.roomTypeCode} - ${rate.roomTypeName}`);
    });
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [accommodationRates]);

  const activityMap = useMemo(
    () => new Map(activityOptions.map((option) => [option.value, option.label])),
    [activityOptions]
  );
  const hotelMap = useMemo(
    () => new Map(hotelOptions.map((option) => [option.value, option.label])),
    [hotelOptions]
  );
  const transportMap = useMemo(
    () => new Map(transportOptions.map((option) => [option.value, option.label])),
    [transportOptions]
  );

  const sourceRate: PreTourRateCard | null = selectedAccommodationRate;
  const buyFieldsLocked = Boolean(sourceRate?.locked) && !form.overrideSourceRate;

  const contextLine = useMemo(() => {
    const dayNumber = toStringValue(selectedDay?.dayNumber);
    const dayLabel = dayNumber ? `Day ${dayNumber}` : "Unassigned day";
    const travelDate = toDateInput(selectedDay?.date || form.accommodation.stayDate);
    return `${dayLabel}${travelDate ? ` • ${travelDate}` : ""}`;
  }, [form.accommodation.stayDate, selectedDay?.date, selectedDay?.dayNumber]);

  const handleSave = async () => {
    try {
      setValidationError("");

      if (!selectedDay) throw new Error("Select a day before allocating an item.");

      if (form.itemType === "ACCOMMODATION") {
        if (!form.accommodation.hotelId) throw new Error("Select a hotel.");
        if (!form.accommodation.stayDate) throw new Error("Stay date is required.");
        if (Number(form.accommodation.roomCount || "0") <= 0) throw new Error("Room count must be at least 1.");
        if (Number(form.accommodation.nights || "0") <= 0) throw new Error("Nights must be at least 1.");
      }

      if (form.itemType === "ACTIVITY" && !form.activity.activityId) {
        throw new Error("Select an activity.");
      }
      if (form.itemType === "TRANSPORT" && !form.transport.vehicleTypeId) {
        throw new Error("Select a transport service.");
      }
      if (form.itemType === "GUIDE") {
        throw new Error("Guide allocation is no longer supported in the day-wise workspace.");
      }
      if ((form.itemType === "SUPPLEMENT" || form.itemType === "MISC") && !form.supplement.serviceLabel.trim()) {
        throw new Error("Enter the supplement or misc charge name.");
      }

      if (sourceRate?.locked && form.overrideSourceRate && !canOverrideContractRates) {
        throw new Error("You do not have permission to override contracted buy rates.");
      }
      if (sourceRate?.locked && form.overrideSourceRate && !form.overrideReason.trim()) {
        throw new Error("Override reason is required when changing a contracted buy rate.");
      }
      if (buyTotalAmount <= 0) {
        throw new Error("Buy amount must be greater than zero.");
      }

      const dimensions = buildDimensions(form, selectedAccommodationRate);
      const snapshot = buildPreTourPricingSnapshot({
        sourceRate,
        currencyCode: form.currencyCode,
        buyBaseAmount,
        buyTaxAmount,
        buyTotalAmount,
        markupMode: form.markupMode,
        markupValue: toMoney(form.markupValue),
        sellBaseAmount: commercialPricing.sellBaseAmount,
        sellTaxAmount: commercialPricing.sellTaxAmount,
        sellTotalAmount: commercialPricing.sellTotalAmount,
        priceMode: form.priceMode,
        overrideApplied: form.overrideSourceRate,
        overrideReason: form.overrideReason,
        dimensions,
      });

      const serviceId =
        form.itemType === "ACCOMMODATION"
          ? form.accommodation.hotelId
          : form.itemType === "ACTIVITY"
            ? form.activity.activityId
            : form.itemType === "TRANSPORT"
              ? form.transport.vehicleTypeId
              : form.itemType === "GUIDE"
                ? form.guide.guideId
                : null;

      const defaultTitle =
        form.title.trim() ||
        (form.itemType === "ACCOMMODATION"
          ? hotelMap.get(form.accommodation.hotelId) || "Accommodation"
          : form.itemType === "ACTIVITY"
            ? activityMap.get(form.activity.activityId) || "Activity"
            : form.itemType === "TRANSPORT"
              ? transportMap.get(form.transport.vehicleTypeId) || "Transport"
              : form.supplement.serviceLabel.trim() || "Supplement");

      const payload: Record<string, unknown> = {
        code: buildCode(form.itemType, selectedDay, form.code),
        planId: toStringValue(selectedPlan?.id),
        dayId: toStringValue(selectedDay.id),
        itemType: form.itemType,
        serviceId,
        startAt:
          form.itemType === "ACCOMMODATION" && form.accommodation.stayDate
            ? `${form.accommodation.stayDate}T00:00:00.000Z`
            : null,
        endAt: null,
        sortOrder: Number(row?.sortOrder ?? 0),
        pax:
          form.itemType === "TRANSPORT"
            ? Number(form.transport.pax || "0")
            : Number(form.pax || selectedPlan?.adults || 0),
        units:
          form.itemType === "ACTIVITY"
            ? Number(form.activity.quantity || "1")
            : form.itemType === "TRANSPORT"
              ? Number(form.transport.quantity || "1")
              : form.itemType === "GUIDE"
                ? Number(form.guide.quantity || "1")
                : form.itemType === "SUPPLEMENT" || form.itemType === "MISC"
                  ? Number(form.supplement.quantity || "1")
                  : Number(form.units || "1"),
        nights:
          form.itemType === "ACCOMMODATION"
            ? Number(form.accommodation.nights || "1")
            : Number(form.nights || "0"),
        rooms:
          form.itemType === "ACCOMMODATION"
            ? [
                {
                  roomType:
                    selectedAccommodationRate?.roomTypeName ||
                    form.accommodation.occupancy ||
                    "ROOM",
                  count: Number(form.accommodation.roomCount || "1"),
                  adults: Number(selectedPlan?.adults ?? 0),
                  children: Number(selectedPlan?.children ?? 0),
                },
              ]
            : null,
        fromLocationId: null,
        toLocationId: null,
        locationId: null,
        rateId: sourceRate?.sourceRateId || null,
        currencyCode: form.currencyCode,
        priceMode: form.priceMode,
        baseAmount: buyBaseAmount,
        taxAmount: buyTaxAmount,
        totalAmount: buyTotalAmount,
        pricingSnapshot: snapshot as unknown as Record<string, unknown>,
        title: defaultTitle,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
        status: form.status,
        isActive: true,
      };

      await onSubmit(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save allocation.";
      setValidationError(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] flex-col sm:max-w-7xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add" : "Edit"} Pre-Tour Item Allocation</DialogTitle>
          <DialogDescription>
            Build the operational allocation, resolve source buying, and review commercial pricing in one workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.95fr)]">
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <Card className="border-border/70">
              <CardContent className="flex flex-wrap items-center gap-2 px-4 py-3">
                <Badge variant="secondary">{contextLine}</Badge>
                {selectedPlan ? (
                  <Badge variant="outline">
                    {toStringValue(selectedPlan.planCode || selectedPlan.code)} • {toStringValue(selectedPlan.currencyCode || companyBaseCurrencyCode)}
                  </Badge>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  Plan: {toStringValue(selectedPlan?.title || selectedPlan?.planCode || selectedPlan?.code)}
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Code</span>
                <Input
                  value={form.code}
                  onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                  placeholder="Auto-generated if blank"
                  disabled={isReadOnly}
                />
              </label>
              <label className="grid gap-2 text-sm xl:col-span-2">
                <span className="font-medium">Title</span>
                <Input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Optional commercial title"
                  disabled={isReadOnly}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Status</span>
                <Select
                  value={form.status}
                  onValueChange={(status) =>
                    setForm((current) => ({
                      ...current,
                      status: status as PreTourItemAllocationFormState["status"],
                    }))
                  }
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED">Planned</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>

            <Tabs
              value={tabValue}
              onValueChange={(nextValue) =>
                setForm((current) => ({
                  ...current,
                  itemType: nextValue as PreTourItemAllocationFormState["itemType"],
                  selectedRateId: "",
                  overrideSourceRate: false,
                  overrideReason: "",
                  buyBaseAmount: nextValue === current.itemType ? current.buyBaseAmount : "0",
                  buyTaxAmount: nextValue === current.itemType ? current.buyTaxAmount : "0",
                }))
              }
            >
              <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
                <TabsTrigger value="ACCOMMODATION">Accommodation</TabsTrigger>
                <TabsTrigger value="ACTIVITY">Activity</TabsTrigger>
                <TabsTrigger value="TRANSPORT">Transport</TabsTrigger>
                <TabsTrigger value="SUPPLEMENT">Supplement / Misc</TabsTrigger>
              </TabsList>

              {isLegacyGuideItem ? (
                <div className="rounded-lg border border-dashed p-4 text-sm">
                  <p className="font-medium">Legacy guide item</p>
                  <p className="mt-1 text-muted-foreground">
                    Guide allocation has been removed from the day-wise workspace because guide costing normally spans the
                    full tour or a date range, not a single day line. Keep this record for reference and recreate guide
                    pricing in a tour-level guide allocation flow.
                  </p>
                </div>
              ) : (
                <>
                  <TabsContent value="ACCOMMODATION">
                    <AccommodationAllocationTab
                      value={form.accommodation}
                      hotelOptions={hotelOptions}
                      roomTypeOptions={roomTypeOptions}
                      rateOptions={accommodationRates}
                      selectedRateId={form.selectedRateId}
                      loadingRates={loadingAccommodationRates}
                      disabled={isReadOnly}
                      onChange={(patch) =>
                        setForm((current) => {
                          const resetsRate =
                            Object.prototype.hasOwnProperty.call(patch, "hotelId") ||
                            Object.prototype.hasOwnProperty.call(patch, "roomTypeId") ||
                            Object.prototype.hasOwnProperty.call(patch, "roomBasis") ||
                            Object.prototype.hasOwnProperty.call(patch, "stayDate");
                          return {
                            ...current,
                            accommodation: { ...current.accommodation, ...patch },
                            selectedRateId: resetsRate ? "" : current.selectedRateId,
                          };
                        })
                      }
                      onSelectRate={(rateId) =>
                        setForm((current) => ({
                          ...current,
                          selectedRateId: rateId,
                        }))
                      }
                    />
                  </TabsContent>

                  <TabsContent value="ACTIVITY">
                    <ActivityAllocationTab
                      value={form.activity}
                      activityOptions={activityOptions}
                      disabled={isReadOnly}
                      onChange={(patch) =>
                        setForm((current) => ({
                          ...current,
                          itemType: "ACTIVITY",
                          activity: { ...current.activity, ...patch },
                        }))
                      }
                    />
                  </TabsContent>

                  <TabsContent value="TRANSPORT">
                    <TransportAllocationTab
                      value={form.transport}
                      vehicleOptions={transportOptions}
                      disabled={isReadOnly}
                      onChange={(patch) =>
                        setForm((current) => ({
                          ...current,
                          itemType: "TRANSPORT",
                          transport: { ...current.transport, ...patch },
                        }))
                      }
                    />
                  </TabsContent>

                  <TabsContent value="SUPPLEMENT">
                    <SupplementAllocationTab
                      itemType={form.itemType === "MISC" ? "MISC" : "SUPPLEMENT"}
                      value={form.supplement}
                      disabled={isReadOnly}
                      onItemTypeChange={(itemType) =>
                        setForm((current) => ({
                          ...current,
                          itemType,
                        }))
                      }
                      onChange={(patch) =>
                        setForm((current) => ({
                          ...current,
                          supplement: { ...current.supplement, ...patch },
                        }))
                      }
                    />
                  </TabsContent>
                </>
              )}
            </Tabs>

            <div className="grid gap-3">
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Operational notes</span>
                <Textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Operational notes, confirmations, or supplier remarks."
                  disabled={isReadOnly}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Description</span>
                <Textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Optional internal description."
                  disabled={isReadOnly}
                />
              </label>
            </div>
          </div>

          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <Card className="border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Buy Pricing Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium">Currency context</span>
                    <Input value={form.currencyCode} disabled />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium">Buy base amount</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.buyBaseAmount}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, buyBaseAmount: event.target.value }))
                      }
                      disabled={isReadOnly || buyFieldsLocked}
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium">Buy tax amount</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.buyTaxAmount}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, buyTaxAmount: event.target.value }))
                      }
                      disabled={isReadOnly || buyFieldsLocked}
                    />
                  </label>
                </div>

                {sourceRate?.locked ? (
                  <div className="space-y-3 rounded-lg border border-dashed p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Contracted source rate</p>
                        <p className="text-xs text-muted-foreground">
                          Buy fields are locked while using the resolved source rate.
                        </p>
                      </div>
                      <Switch
                        checked={form.overrideSourceRate}
                        onCheckedChange={(checked) =>
                          setForm((current) => ({
                            ...current,
                            overrideSourceRate: checked,
                            overrideReason: checked ? current.overrideReason : "",
                            buyBaseAmount:
                              !checked && selectedAccommodationRate
                                ? String(selectedAccommodationRate.buyBaseAmount)
                                : current.buyBaseAmount,
                            buyTaxAmount:
                              !checked && selectedAccommodationRate
                                ? String(selectedAccommodationRate.buyTaxAmount)
                                : current.buyTaxAmount,
                          }))
                        }
                        disabled={isReadOnly || !canOverrideContractRates}
                      />
                    </div>
                    {!canOverrideContractRates ? (
                      <p className="text-xs text-muted-foreground">
                        Override requires admin access or pre-tour costing permission.
                      </p>
                    ) : null}
                    {form.overrideSourceRate ? (
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium">Override reason</span>
                        <Textarea
                          value={form.overrideReason}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              overrideReason: event.target.value,
                            }))
                          }
                          placeholder="Why is the contracted buy price being overridden?"
                          disabled={isReadOnly}
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-3">
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium">Markup mode</span>
                    <Select
                      value={form.markupMode}
                      onValueChange={(markupMode) =>
                        setForm((current) => ({
                          ...current,
                          markupMode: markupMode as PreTourItemAllocationFormState["markupMode"],
                        }))
                      }
                      disabled={isReadOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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
                      onChange={(event) =>
                        setForm((current) => ({ ...current, markupValue: event.target.value }))
                      }
                      disabled={isReadOnly || form.markupMode === "NONE"}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

            <PreTourItemPricingSummary
              currencyCode={form.currencyCode}
              buyBaseAmount={buyBaseAmount}
              buyTaxAmount={buyTaxAmount}
              buyTotalAmount={buyTotalAmount}
              commercialPricing={commercialPricing}
              priceMode={form.priceMode}
              sourceRate={sourceRate}
              overrideApplied={form.overrideSourceRate}
            />

            <Card className="border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Snapshot Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(
                    buildPreTourPricingSnapshot({
                      sourceRate,
                      currencyCode: form.currencyCode,
                      buyBaseAmount,
                      buyTaxAmount,
                      buyTotalAmount,
                      markupMode: form.markupMode,
                      markupValue: toMoney(form.markupValue),
                      sellBaseAmount: commercialPricing.sellBaseAmount,
                      sellTaxAmount: commercialPricing.sellTaxAmount,
                      sellTotalAmount: commercialPricing.sellTotalAmount,
                      priceMode: form.priceMode,
                      overrideApplied: form.overrideSourceRate,
                      overrideReason: form.overrideReason,
                      dimensions: buildDimensions(form, selectedAccommodationRate),
                    }),
                    null,
                    2
                  )}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <RecordAuditMeta row={row} className="mr-auto" />
          {validationError ? (
            <p className="mr-auto text-sm text-destructive">{validationError}</p>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || isReadOnly || isLegacyGuideItem}>
            {saving ? "Saving..." : "Save Allocation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
