"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MapPinned,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
} from "lucide-react";
import { notify } from "@/lib/notify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordAuditMeta } from "@/components/ui/record-audit-meta";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authClient } from "@/lib/auth-client";
import {
  createPreTourRecord,
  deletePreTourRecord,
  listPreTourRecords,
  updatePreTourRecord,
} from "@/modules/pre-tour/lib/pre-tour-api";
import { listTransportRecords } from "@/modules/transport/lib/transport-api";
import { listActivityRecords } from "@/modules/activity/lib/activity-api";
import { listGuideRecords } from "@/modules/guides/lib/guides-api";
import { listCurrencyRecords } from "@/modules/currency/lib/currency-api";
import { listBusinessNetworkRecords } from "@/modules/business-network/lib/business-network-api";
import { listTourCategoryRecords } from "@/modules/tour-category/lib/tour-category-api";
import { listTechnicalVisitRecords } from "@/modules/technical-visit/lib/technical-visit-api";
import { listHotels } from "@/modules/accommodation/lib/accommodation-api";
import { PreTourDayWorkspace } from "@/modules/pre-tour/ui/components/pre-tour-day-workspace";
import { PreTourRouteMapDialog } from "@/modules/pre-tour/ui/components/pre-tour-route-map-dialog";
import { PreTourShareDialog } from "@/modules/pre-tour/ui/components/pre-tour-share-dialog";
import { PreTourCopyDialog } from "@/modules/pre-tour/ui/components/pre-tour-copy-dialog";
import { PreTourDetailSheet } from "@/modules/pre-tour/ui/components/pre-tour-detail-sheet";
import { ManagedDayEditor } from "@/modules/pre-tour/ui/components/managed-day-editor";
import { PreTourRecordForm } from "@/modules/pre-tour/ui/components/pre-tour-record-form";
import {
  META,
} from "@/modules/pre-tour/ui/views/pre-tour-management/constants";
import { SectionTable } from "@/modules/pre-tour/ui/views/pre-tour-management/section-table";
import type {
  AccessControlResponse,
  CompanySettingsResponse,
  DetailSheetState,
  Field,
  PreTourResourceKey,
  Row,
} from "@/modules/pre-tour/ui/views/pre-tour-management/types";
import {
  addDays,
  defaultValue,
  formatDate,
  getCoordinatesFromGeo,
  matchesQuery,
  parseFieldValue,
  sanitizeCodePart,
  toDayCount,
  toIsoDateTime,
  toLocalDateTime,
  toNightCount,
  toNumericValue,
} from "@/modules/pre-tour/ui/views/pre-tour-management/utils";

type PreTourPlanManageViewProps = {
  planId: string;
};

export function PreTourPlanManageView({ planId }: PreTourPlanManageViewProps) {
  const initialResource: PreTourResourceKey = "pre-tour-days";
  const managedPlanId = planId;
  const showBinOnly = false;
  const { data: session } = authClient.useSession();
  const accessUser = session?.user as
    | { readOnly?: boolean; role?: string | null; canWritePreTour?: boolean }
    | undefined;
  const canWrite =
    Boolean(accessUser) &&
    !Boolean(accessUser?.readOnly) &&
    (accessUser?.role === "ADMIN" ||
      accessUser?.role === "MANAGER" ||
      Boolean(accessUser?.canWritePreTour));
  const isReadOnly = !canWrite;
  const isAdmin = accessUser?.role === "ADMIN";
  const [privileges, setPrivileges] = useState<string[]>([]);
  const canViewRouteMap = privileges.includes("PRE_TOUR_MAP");
  const canViewCosting = privileges.includes("PRE_TOUR_COSTING");

  const isPlanManageMode = Boolean(managedPlanId);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingDays, setSyncingDays] = useState(false);

  const [plans, setPlans] = useState<Row[]>([]);
  const [days, setDays] = useState<Row[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [addons, setAddons] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Row[]>([]);
  const [planCategories, setPlanCategories] = useState<Row[]>([]);
  const [planTechnicalVisits, setPlanTechnicalVisits] = useState<Row[]>([]);
  const [planBins, setPlanBins] = useState<Row[]>([]);

  const [locations, setLocations] = useState<Row[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<Row[]>([]);
  const [activities, setActivities] = useState<Row[]>([]);
  const [guides, setGuides] = useState<Row[]>([]);
  const [currencies, setCurrencies] = useState<Row[]>([]);
  const [organizations, setOrganizations] = useState<Row[]>([]);
  const [operatorMarketContracts, setOperatorMarketContracts] = useState<Row[]>([]);
  const [tourCategoryTypes, setTourCategoryTypes] = useState<Row[]>([]);
  const [tourCategories, setTourCategories] = useState<Row[]>([]);
  const [technicalVisits, setTechnicalVisits] = useState<Row[]>([]);
  const [hotels, setHotels] = useState<Row[]>([]);
  const [tourCategoryRules, setTourCategoryRules] = useState<Row[]>([]);
  const [companyBaseCurrencyCode, setCompanyBaseCurrencyCode] = useState("USD");

  const [selectedDayId, setSelectedDayId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [sharingItem, setSharingItem] = useState<Row | null>(null);
  const [shareTargetDayId, setShareTargetDayId] = useState("");
  const [sharing, setSharing] = useState(false);
  const [, setCreatingVersion] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourcePlan, setCopySourcePlan] = useState<Row | null>(null);
  const [copySaving, setCopySaving] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [useRoadRoute, setUseRoadRoute] = useState(true);
  const [routeMeta, setRouteMeta] = useState<{ distanceKm: number | null; durationMin: number | null }>({
    distanceKm: null,
    durationMin: null,
  });
  const [drawerRouteMeta, setDrawerRouteMeta] = useState<{
    distanceKm: number | null;
    durationMin: number | null;
  }>({
    distanceKm: null,
    durationMin: null,
  });
  const [drawerShowMap, setDrawerShowMap] = useState(false);
  const [dayTransportForm, setDayTransportForm] = useState<{
    enabled: boolean;
    serviceId: string;
    startAt: string;
    endAt: string;
    pax: string;
    baseAmount: string;
    taxAmount: string;
    totalAmount: string;
    status: string;
    notes: string;
  }>({
    enabled: false,
    serviceId: "",
    startAt: "",
    endAt: "",
    pax: "",
    baseAmount: "0",
    taxAmount: "0",
    totalAmount: "0",
    status: "PLANNED",
    notes: "",
  });
  const [copyForm, setCopyForm] = useState<{
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
  }>({
    planCode: "",
    title: "",
    startDate: "",
    endDate: "",
    totalNights: "0",
    adults: "1",
    children: "0",
    infants: "0",
    categoryId: "",
    operatorOrgId: "",
    marketOrgId: "",
    currencyCode: companyBaseCurrencyCode,
    priceMode: "EXCLUSIVE",
  });

  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    resource: PreTourResourceKey;
    row: Row | null;
  }>({ open: false, mode: "create", resource: initialResource, row: null });
  const [dialogSessionId, setDialogSessionId] = useState(0);
  const dialogInitKeyRef = useRef<string | null>(null);
  const [form, setForm] = useState<Row>({});
  const [detailSheet, setDetailSheet] = useState<DetailSheetState>({
    open: false,
    title: "",
    description: "",
    kind: "generic",
    row: null,
  });
  const [detailPreTourRouteIds, setDetailPreTourRouteIds] = useState<string[]>([]);
  const [detailPreTourRouteLoading, setDetailPreTourRouteLoading] = useState(false);

  const selectedPlan = useMemo(
    () => plans.find((row) => String(row.id) === managedPlanId) ?? null,
    [plans, managedPlanId]
  );

  const activeHotelOptions = useMemo(
    () =>
      hotels
        .filter((row) => Boolean(row.isActive ?? true))
        .map((row) => ({
          value: String(row.id),
          label: `HOTEL • ${String(row.code)} - ${String(row.name)} (${Number(row.starRating ?? 0)}★)`,
          star: Number(row.starRating ?? 0),
        })),
    [hotels]
  );

  const activePlanForItemForm = useMemo(() => {
    if (dialog.resource !== "pre-tour-items") return null;
    const planId = String(form.planId ?? managedPlanId ?? "");
    if (!planId) return selectedPlan;
    return plans.find((row) => String(row.id) === planId) ?? selectedPlan;
  }, [dialog.resource, form.planId, managedPlanId, plans, selectedPlan]);

  const activeTourCategoryRuleForItemForm = useMemo(() => {
    if (!activePlanForItemForm?.categoryId) return null;
    return (
      tourCategoryRules.find(
        (row) => String(row.categoryId) === String(activePlanForItemForm.categoryId)
      ) ?? null
    );
  }, [activePlanForItemForm, tourCategoryRules]);

  const accommodationServiceOptions = useMemo(() => {
    const minStar = Number(activeTourCategoryRuleForItemForm?.restrictHotelStarMin ?? 0);
    const maxStar = Number(activeTourCategoryRuleForItemForm?.restrictHotelStarMax ?? 0);
    return activeHotelOptions
      .filter((hotel) => {
        if (minStar > 0 && hotel.star < minStar) return false;
        if (maxStar > 0 && hotel.star > maxStar) return false;
        return true;
      })
      .map(({ value, label }) => ({ value, label }));
  }, [activeHotelOptions, activeTourCategoryRuleForItemForm]);

  const selectedPreTourItemType = useMemo(() => {
    if (dialog.resource !== "pre-tour-items") return "";
    return String(form.itemType ?? dialog.row?.itemType ?? "").toUpperCase();
  }, [dialog.resource, dialog.row?.itemType, form.itemType]);

  const sortedDays = useMemo(
    () => [...days].sort((a, b) => Number(a.dayNumber ?? 0) - Number(b.dayNumber ?? 0)),
    [days]
  );

  const nonTransportItems = useMemo(
    () => items.filter((item) => String(item.itemType || "").toUpperCase() !== "TRANSPORT"),
    [items]
  );

  const transportItemsByDayId = useMemo(() => {
    const map = new Map<string, Row[]>();
    items.forEach((item) => {
      if (String(item.itemType || "").toUpperCase() !== "TRANSPORT") return;
      const dayId = String(item.dayId || "");
      if (!dayId) return;
      const existing = map.get(dayId);
      if (existing) {
        existing.push(item);
        return;
      }
      map.set(dayId, [item]);
    });
    map.forEach((rows) =>
      rows.sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    );
    return map;
  }, [items]);

  const selectedDayItems = useMemo(
    () => nonTransportItems.filter((item) => String(item.dayId) === selectedDayId),
    [nonTransportItems, selectedDayId]
  );

  const planOptions = useMemo(
    () => plans.map((row) => ({ value: String(row.id), label: `${row.code} - ${row.title}` })),
    [plans]
  );

  const dayOptions = useMemo(
    () =>
      sortedDays.map((row) => ({
        value: String(row.id),
        label: `Day ${row.dayNumber} - ${row.title || row.code}`,
      })),
    [sortedDays]
  );

  const itemOptions = useMemo(
    () =>
      items.map((row) => ({
        value: String(row.id),
        label: `${row.code} - ${row.title || row.itemType}`,
      })),
    [items]
  );

  const filteredItemOptions = useMemo(() => {
    if (!isPlanManageMode || !selectedDayId) return itemOptions;
    return itemOptions.filter((option) =>
      items.some((row) => String(row.id) === option.value && String(row.dayId) === selectedDayId)
    );
  }, [isPlanManageMode, itemOptions, items, selectedDayId]);

  const locationOptions = useMemo(
    () => locations.map((row) => ({ value: String(row.id), label: `${row.code} - ${row.name}` })),
    [locations]
  );

  const locationCoordinatesById = useMemo(() => {
    const next = new Map<string, { name: string; coordinates: [number, number] }>();
    locations.forEach((row) => {
      const id = String(row.id || "");
      if (!id) return;
      const coordinates = getCoordinatesFromGeo(row.geo);
      if (!coordinates) return;
      next.set(id, {
        name: String(row.name || row.code || id),
        coordinates,
      });
    });
    return next;
  }, [locations]);

  const locationNameById = useMemo(() => {
    const next = new Map<string, string>();
    locations.forEach((row) => {
      const id = String(row.id || "");
      if (!id) return;
      next.set(id, String(row.name || row.code || id));
    });
    return next;
  }, [locations]);

  const serviceOptions = useMemo(
    () => [
      ...vehicleTypes.map((row) => ({
        value: String(row.id),
        label: `TRANSPORT • ${row.code} - ${row.name}`,
      })),
      ...activities.map((row) => ({ value: String(row.id), label: `ACT • ${row.code} - ${row.name}` })),
      ...guides.map((row) => ({ value: String(row.id), label: `GUIDE • ${row.code} - ${row.fullName}` })),
    ],
    [activities, guides, vehicleTypes]
  );

  const transportVehicleOptions = useMemo(
    () =>
      vehicleTypes.map((row) => ({
        value: String(row.id),
        label: `${row.code} - ${row.name}`,
      })),
    [vehicleTypes]
  );

  const currencyOptions = useMemo(
    () => currencies.map((row) => ({ value: String(row.code), label: `${row.code} - ${row.name}` })),
    [currencies]
  );

  const operatorOrganizationOptions = useMemo(
    () =>
      organizations
        .filter((row) => {
          const type = String(row.type || "");
          return type === "OPERATOR" || type === "SUPPLIER";
        })
        .map((row) => ({ value: String(row.id), label: `${row.code} - ${row.name}` })),
    [organizations]
  );

  const marketOrganizationOptions = useMemo(
    () =>
      organizations
        .filter((row) => {
          const type = String(row.type || "");
          return type === "MARKET" || type === "MARKETING";
        })
        .map((row) => ({ value: String(row.id), label: `${row.code} - ${row.name}` })),
    [organizations]
  );

  const activeOperatorMarketContracts = useMemo(
    () =>
      operatorMarketContracts.filter(
        (row) =>
          String(row.status || "ACTIVE") === "ACTIVE" &&
          Boolean(row.isActive ?? true)
      ),
    [operatorMarketContracts]
  );

  const operatorIdsByMarketId = useMemo(() => {
    const map = new Map<string, string[]>();
    activeOperatorMarketContracts.forEach((row) => {
      const marketId = String(row.marketOrgId || "");
      const operatorId = String(row.operatorOrgId || "");
      if (!marketId || !operatorId) return;
      map.set(marketId, [...(map.get(marketId) ?? []), operatorId]);
    });
    return map;
  }, [activeOperatorMarketContracts]);

  const selectedDialogMarketOrgId = useMemo(() => {
    if (dialog.resource !== "pre-tours") return "";
    const fromForm = String(form.marketOrgId ?? "");
    if (fromForm) return fromForm;
    return String(dialog.row?.marketOrgId ?? "");
  }, [dialog.resource, dialog.row?.marketOrgId, form.marketOrgId]);

  const preTourOperatorOptions = useMemo(() => {
    if (!selectedDialogMarketOrgId) return operatorOrganizationOptions;
    const allowedOperatorIds = operatorIdsByMarketId.get(selectedDialogMarketOrgId) ?? [];
    if (allowedOperatorIds.length === 0) return operatorOrganizationOptions;
    return operatorOrganizationOptions.filter((option) =>
      allowedOperatorIds.includes(option.value)
    );
  }, [
    operatorIdsByMarketId,
    operatorOrganizationOptions,
    selectedDialogMarketOrgId,
  ]);

  const hasContractForSelectedDialogMarket = useMemo(() => {
    if (!selectedDialogMarketOrgId) return true;
    return (operatorIdsByMarketId.get(selectedDialogMarketOrgId)?.length ?? 0) > 0;
  }, [operatorIdsByMarketId, selectedDialogMarketOrgId]);

  const copyOperatorOptions = useMemo(() => {
    if (!copyForm.marketOrgId) return operatorOrganizationOptions;
    const allowedOperatorIds = operatorIdsByMarketId.get(copyForm.marketOrgId) ?? [];
    if (allowedOperatorIds.length === 0) return operatorOrganizationOptions;
    return operatorOrganizationOptions.filter((option) =>
      allowedOperatorIds.includes(option.value)
    );
  }, [
    copyForm.marketOrgId,
    operatorIdsByMarketId,
    operatorOrganizationOptions,
  ]);

  const hasContractForCopyMarket = useMemo(() => {
    if (!copyForm.marketOrgId) return true;
    return (operatorIdsByMarketId.get(copyForm.marketOrgId)?.length ?? 0) > 0;
  }, [copyForm.marketOrgId, operatorIdsByMarketId]);

  const tourCategoryTypeOptions = useMemo(
    () =>
      tourCategoryTypes.map((row) => ({
        value: String(row.id),
        label: `${String(row.code)} - ${String(row.name)}`,
      })),
    [tourCategoryTypes]
  );

  const selectedCategoryTypeId = useMemo(() => {
    const formTypeId = form.typeId;
    if (typeof formTypeId === "string" && formTypeId.trim().length > 0) {
      return formTypeId;
    }
    const rowTypeId = dialog.row?.typeId;
    if (typeof rowTypeId === "string" && rowTypeId.trim().length > 0) {
      return rowTypeId;
    }
    return "";
  }, [dialog.row?.typeId, form.typeId]);

  const tourCategoryOptions = useMemo(() => {
    const rows = selectedCategoryTypeId
      ? tourCategories.filter((row) => String(row.typeId) === selectedCategoryTypeId)
      : tourCategories;

    return rows.map((row) => ({
      value: String(row.id),
      label: `${String(row.code)} - ${String(row.name)}`,
    }));
  }, [selectedCategoryTypeId, tourCategories]);

  const allTourCategoryOptions = useMemo(
    () =>
      tourCategories.map((row) => ({
        value: String(row.id),
        label: `${String(row.code)} - ${String(row.name)}`,
      })),
    [tourCategories]
  );

  const technicalVisitOptions = useMemo(
    () =>
      technicalVisits.map((row) => ({
        value: String(row.id),
        label: `${String(row.code)} - ${String(row.visitType)} - ${new Date(
          String(row.visitDate)
        ).toLocaleDateString()}`,
      })),
    [technicalVisits]
  );

  const lookups = useMemo(() => {
    const pairs: Array<[string, string]> = [];
    planOptions.forEach((o) => pairs.push([o.value, o.label]));
    dayOptions.forEach((o) => pairs.push([o.value, o.label]));
    itemOptions.forEach((o) => pairs.push([o.value, o.label]));
    locationOptions.forEach((o) => pairs.push([o.value, o.label]));
    serviceOptions.forEach((o) => pairs.push([o.value, o.label]));
    accommodationServiceOptions.forEach((o) => pairs.push([o.value, o.label]));
    operatorOrganizationOptions.forEach((o) => pairs.push([o.value, o.label]));
    marketOrganizationOptions.forEach((o) => pairs.push([o.value, o.label]));
    tourCategoryTypeOptions.forEach((o) => pairs.push([o.value, o.label]));
    tourCategoryOptions.forEach((o) => pairs.push([o.value, o.label]));
    allTourCategoryOptions.forEach((o) => pairs.push([o.value, o.label]));
    technicalVisitOptions.forEach((o) => pairs.push([o.value, o.label]));
    return Object.fromEntries(pairs);
  }, [
    planOptions,
    dayOptions,
    itemOptions,
    locationOptions,
    serviceOptions,
    accommodationServiceOptions,
    operatorOrganizationOptions,
    marketOrganizationOptions,
    tourCategoryTypeOptions,
    tourCategoryOptions,
    allTourCategoryOptions,
    technicalVisitOptions,
  ]);

  const fields = useMemo<Field[]>(() => {
    const resource = dialog.resource;

    switch (resource) {
      case "pre-tours":
        return [
          { key: "planCode", label: "Plan Code", type: "text", required: true },
          { key: "title", label: "Title", type: "text", required: true },
          {
            key: "categoryId",
            label: "Tour Category",
            type: "select",
            required: true,
            options: allTourCategoryOptions,
          },
          {
            key: "marketOrgId",
            label: "Market",
            type: "select",
            required: true,
            options: marketOrganizationOptions,
          },
          {
            key: "operatorOrgId",
            label: "Operator",
            type: "select",
            required: true,
            options: preTourOperatorOptions,
          },
          {
            key: "status",
            label: "Status",
            type: "select",
            defaultValue: "DRAFT",
            options: [
              { label: "DRAFT", value: "DRAFT" },
              { label: "QUOTED", value: "QUOTED" },
              { label: "APPROVED", value: "APPROVED" },
              { label: "BOOKED", value: "BOOKED" },
              { label: "IN_PROGRESS", value: "IN_PROGRESS" },
              { label: "COMPLETED", value: "COMPLETED" },
              { label: "CANCELLED", value: "CANCELLED" },
            ],
          },
          { key: "startDate", label: "Start Date", type: "datetime", required: true },
          { key: "endDate", label: "End Date", type: "datetime", required: true },
          { key: "totalNights", label: "Total Nights", type: "number", defaultValue: 0 },
          { key: "adults", label: "Adults", type: "number", defaultValue: 1 },
          { key: "children", label: "Children", type: "number", defaultValue: 0 },
          { key: "infants", label: "Infants", type: "number", defaultValue: 0 },
          { key: "preferredLanguage", label: "Language", type: "text", nullable: true },
          {
            key: "roomPreference",
            label: "Room Preference",
            type: "select",
            nullable: true,
            options: [
              { label: "DOUBLE", value: "DOUBLE" },
              { label: "TWIN", value: "TWIN" },
              { label: "MIXED", value: "MIXED" },
            ],
          },
          {
            key: "mealPreference",
            label: "Meal Preference",
            type: "select",
            nullable: true,
            options: [
              { label: "BB", value: "BB" },
              { label: "HB", value: "HB" },
              { label: "FB", value: "FB" },
              { label: "AI", value: "AI" },
            ],
          },
          {
            key: "currencyCode",
            label: "Currency",
            type: "select",
            required: true,
            defaultValue: companyBaseCurrencyCode,
            options: currencyOptions,
          },
          {
            key: "exchangeRateMode",
            label: "FX Mode",
            type: "select",
            defaultValue: "AUTO",
            options: [
              { label: "AUTO", value: "AUTO" },
              { label: "MANUAL", value: "MANUAL" },
            ],
          },
          { key: "exchangeRate", label: "FX Rate", type: "number", defaultValue: 0 },
          {
            key: "priceMode",
            label: "Price Mode",
            type: "select",
            defaultValue: "EXCLUSIVE",
            options: [
              { label: "EXCLUSIVE", value: "EXCLUSIVE" },
              { label: "INCLUSIVE", value: "INCLUSIVE" },
            ],
          },
          { key: "pricingPolicy", label: "Pricing Policy JSON", type: "json", nullable: true },
          { key: "baseTotal", label: "Base Total", type: "number", defaultValue: 0 },
          { key: "taxTotal", label: "Tax Total", type: "number", defaultValue: 0 },
          { key: "grandTotal", label: "Grand Total", type: "number", defaultValue: 0 },
          { key: "version", label: "Version", type: "number", defaultValue: 1 },
          { key: "isLocked", label: "Locked", type: "boolean", defaultValue: false },
          { key: "notes", label: "Notes", type: "textarea", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "pre-tour-days":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
          { key: "dayNumber", label: "Day Number", type: "number", required: true, defaultValue: 1 },
          { key: "date", label: "Date", type: "datetime", required: true },
          { key: "title", label: "Title", type: "text", nullable: true },
          { key: "startLocationId", label: "Start Location", type: "select", nullable: true, options: locationOptions },
          { key: "endLocationId", label: "End Location", type: "select", nullable: true, options: locationOptions },
          { key: "notes", label: "Notes", type: "textarea", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "pre-tour-items":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
          { key: "dayId", label: "Day", type: "select", required: true, options: dayOptions },
          {
            key: "itemType",
            label: "Item Type",
            type: "select",
            defaultValue: "MISC",
            options: [
              { label: "ACTIVITY", value: "ACTIVITY" },
              { label: "ACCOMMODATION", value: "ACCOMMODATION" },
              { label: "GUIDE", value: "GUIDE" },
              { label: "CEREMONY", value: "CEREMONY" },
              { label: "SUPPLEMENT", value: "SUPPLEMENT" },
              { label: "MISC", value: "MISC" },
            ],
          },
          {
            key: "serviceId",
            label: "Service",
            type: "select",
            nullable: true,
            options:
              selectedPreTourItemType === "ACCOMMODATION"
                ? accommodationServiceOptions
                : serviceOptions,
          },
          { key: "title", label: "Title", type: "text", nullable: true },
          { key: "description", label: "Description", type: "textarea", nullable: true },
          { key: "startAt", label: "Start At", type: "datetime", nullable: true },
          { key: "endAt", label: "End At", type: "datetime", nullable: true },
          { key: "sortOrder", label: "Sort Order", type: "number", defaultValue: 0 },
          { key: "pax", label: "Pax", type: "number", nullable: true },
          { key: "units", label: "Units", type: "number", nullable: true },
          { key: "nights", label: "Nights", type: "number", nullable: true },
          { key: "rooms", label: "Rooms JSON", type: "json", nullable: true },
          { key: "locationId", label: "Location", type: "select", nullable: true, options: locationOptions },
          { key: "rateId", label: "Rate Id", type: "text", nullable: true },
          { key: "baseAmount", label: "Base Amount", type: "number", defaultValue: 0 },
          { key: "taxAmount", label: "Tax Amount", type: "number", defaultValue: 0 },
          { key: "totalAmount", label: "Total Amount", type: "number", defaultValue: 0 },
          { key: "pricingSnapshot", label: "Pricing Snapshot JSON", type: "json", nullable: true },
          {
            key: "status",
            label: "Status",
            type: "select",
            defaultValue: "PLANNED",
            options: [
              { label: "PLANNED", value: "PLANNED" },
              { label: "CONFIRMED", value: "CONFIRMED" },
              { label: "CANCELLED", value: "CANCELLED" },
              { label: "COMPLETED", value: "COMPLETED" },
            ],
          },
          { key: "notes", label: "Notes", type: "textarea", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "pre-tour-item-addons":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
          { key: "planItemId", label: "Plan Item", type: "select", required: true, options: filteredItemOptions },
          {
            key: "addonType",
            label: "Addon Type",
            type: "select",
            defaultValue: "SUPPLEMENT",
            options: [
              { label: "SUPPLEMENT", value: "SUPPLEMENT" },
              { label: "MISC", value: "MISC" },
            ],
          },
          { key: "addonServiceId", label: "Addon Service", type: "text", nullable: true },
          { key: "title", label: "Title", type: "text", required: true },
          { key: "qty", label: "Quantity", type: "number", defaultValue: 1 },
          { key: "currencyCode", label: "Currency", type: "select", required: true, defaultValue: companyBaseCurrencyCode, options: currencyOptions },
          { key: "baseAmount", label: "Base Amount", type: "number", defaultValue: 0 },
          { key: "taxAmount", label: "Tax Amount", type: "number", defaultValue: 0 },
          { key: "totalAmount", label: "Total Amount", type: "number", defaultValue: 0 },
          { key: "snapshot", label: "Snapshot JSON", type: "json", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "pre-tour-totals":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
          { key: "currencyCode", label: "Currency", type: "select", required: true, defaultValue: companyBaseCurrencyCode, options: currencyOptions },
          { key: "totalsByType", label: "Totals By Type JSON", type: "json", nullable: true },
          { key: "baseTotal", label: "Base Total", type: "number", required: true, defaultValue: 0 },
          { key: "taxTotal", label: "Tax Total", type: "number", required: true, defaultValue: 0 },
          { key: "grandTotal", label: "Grand Total", type: "number", required: true, defaultValue: 0 },
          { key: "snapshot", label: "Snapshot JSON", type: "json", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "pre-tour-categories":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
          {
            key: "typeId",
            label: "Category Type",
            type: "select",
            required: true,
            options: tourCategoryTypeOptions,
          },
          {
            key: "categoryId",
            label: "Category",
            type: "select",
            required: true,
            options: tourCategoryOptions,
          },
          { key: "notes", label: "Notes", type: "textarea", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "pre-tour-technical-visits":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
          { key: "dayId", label: "Day", type: "select", nullable: true, options: dayOptions },
          {
            key: "technicalVisitId",
            label: "Field Visit",
            type: "select",
            required: true,
            options: technicalVisitOptions,
          },
          { key: "notes", label: "Notes", type: "textarea", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      default:
        return [];
    }
  }, [
    dialog.resource,
    planOptions,
    dayOptions,
    filteredItemOptions,
    locationOptions,
    serviceOptions,
    accommodationServiceOptions,
    currencyOptions,
    preTourOperatorOptions,
    marketOrganizationOptions,
    tourCategoryTypeOptions,
    tourCategoryOptions,
    allTourCategoryOptions,
    technicalVisitOptions,
    companyBaseCurrencyCode,
    selectedPreTourItemType,
  ]);

  const visibleFields = useMemo(() => {
    if (!isPlanManageMode) return fields;
    if (dialog.resource === "pre-tour-days") return fields.filter((field) => field.key !== "planId");
    if (dialog.resource === "pre-tour-items") {
      return fields.filter(
        (field) =>
          field.key !== "planId" &&
          field.key !== "dayId" &&
          field.key !== "currencyCode" &&
          field.key !== "priceMode"
      );
    }
    if (dialog.resource === "pre-tour-item-addons") {
      return fields.filter((field) => field.key !== "planId" && field.key !== "planItemId");
    }
    if (dialog.resource === "pre-tour-totals") return fields.filter((field) => field.key !== "planId");
    if (dialog.resource === "pre-tour-categories") return fields.filter((field) => field.key !== "planId");
    if (dialog.resource === "pre-tour-technical-visits") return fields.filter((field) => field.key !== "planId");
    return fields;
  }, [fields, isPlanManageMode, dialog.resource]);

  const lookupLabel = useCallback(
    (id: unknown) => {
      if (!id || typeof id !== "string") return "-";
      return lookups[id] ?? id;
    },
    [lookups]
  );

  const loadMasters = useCallback(async () => {
    const optionalMaster = async <T,>(loader: () => Promise<T>, fallback: T) => {
      try {
        return await loader();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? "");
        const normalized = message.toLowerCase();
        const restricted =
          normalized.includes("plan does not include") ||
          normalized.includes("permission denied") ||
          normalized.includes("do not have access");
        if (restricted) return fallback;
        throw error;
      }
    };

    const [
      locationRows,
      vehicleTypeRows,
      activityRows,
      guideRows,
      currencyRows,
      organizationRows,
      contractRows,
      tourCategoryTypeRows,
      tourCategoryRows,
      tourCategoryRuleRows,
      technicalVisitRows,
      hotelRows,
      companyResponse,
    ] =
      await Promise.all([
        listTransportRecords("locations", { limit: 300 }),
        listTransportRecords("vehicle-types", { limit: 300 }),
        listActivityRecords("activities", { limit: 300 }),
        listGuideRecords("guides", { limit: 300 }),
        optionalMaster(() => listCurrencyRecords("currencies", { limit: 200 }), [] as Row[]),
        optionalMaster(
          () => listBusinessNetworkRecords("organizations", { limit: 400 }),
          [] as Row[]
        ),
        optionalMaster(
          () => listBusinessNetworkRecords("operator-market-contracts", { limit: 400 }),
          [] as Row[]
        ),
        listTourCategoryRecords("tour-category-types", { limit: 500 }),
        listTourCategoryRecords("tour-categories", { limit: 500 }),
        listTourCategoryRecords("tour-category-rules", { limit: 500 }),
        listTechnicalVisitRecords("technical-visits", { limit: 500 }),
        listHotels(new URLSearchParams({ limit: "100" })),
        fetch("/api/companies/me", { cache: "no-store" }),
      ]);

    setLocations(locationRows);
    setVehicleTypes(vehicleTypeRows);
    setActivities(activityRows);
    setGuides(guideRows);
    setCurrencies(currencyRows);
    setOrganizations(organizationRows);
    setOperatorMarketContracts(contractRows);
    setTourCategoryTypes(tourCategoryTypeRows);
    setTourCategories(tourCategoryRows);
    setTourCategoryRules(tourCategoryRuleRows);
    setTechnicalVisits(technicalVisitRows);
    setHotels(hotelRows.items ?? []);
    if (companyResponse.ok) {
      const body = (await companyResponse.json()) as CompanySettingsResponse;
      const base = body.company?.baseCurrencyCode?.trim().toUpperCase();
      if (base) setCompanyBaseCurrencyCode(base);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const planRows = await listPreTourRecords("pre-tours", {
        limit: 400,
        q: isPlanManageMode ? undefined : query || undefined,
      });
      setPlans(planRows);

      if (!isPlanManageMode) {
        if (showBinOnly) {
          const binRows = await listPreTourRecords("pre-tour-bins", {
            limit: 200,
            q: query || undefined,
          });
          setPlanBins(binRows);
          setPlans([]);
          return;
        }
        setPlanBins([]);
        setDays([]);
        setItems([]);
        setAddons([]);
        setTotals([]);
        setPlanCategories([]);
        setPlanTechnicalVisits([]);
        return;
      }

      const [dayRows, itemRows, addonRows, totalRows, categoryRows, technicalVisitRows] =
        await Promise.all([
        listPreTourRecords("pre-tour-days", { limit: 500, planId: managedPlanId }),
        listPreTourRecords("pre-tour-items", { limit: 500, planId: managedPlanId }),
        listPreTourRecords("pre-tour-item-addons", { limit: 500, planId: managedPlanId }),
        canViewCosting
          ? listPreTourRecords("pre-tour-totals", { limit: 500, planId: managedPlanId })
          : Promise.resolve([] as Row[]),
        listPreTourRecords("pre-tour-categories", { limit: 500, planId: managedPlanId }),
          listPreTourRecords("pre-tour-technical-visits", { limit: 500, planId: managedPlanId }),
        ]);

      setDays(dayRows);
      setItems(itemRows);
      setAddons(addonRows);
      setTotals(totalRows);
      setPlanCategories(categoryRows);
      setPlanTechnicalVisits(technicalVisitRows);
      setPlanBins([]);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [canViewCosting, isPlanManageMode, managedPlanId, query, showBinOnly]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/companies/access-control", { cache: "no-store" });
        const body = (await response.json()) as AccessControlResponse & { message?: string };
        if (!response.ok) throw new Error(body.message || "Failed to load access control.");
        if (!active) return;
        setPrivileges(Array.isArray(body.privileges) ? body.privileges : []);
      } catch {
        if (active) setPrivileges([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (dialog.resource !== "pre-tours") return;
    const currentOperatorOrgId = String(form.operatorOrgId ?? "");
    if (!currentOperatorOrgId) return;
    if (preTourOperatorOptions.some((option) => option.value === currentOperatorOrgId)) return;
    setForm((prev) => ({ ...prev, operatorOrgId: "" }));
  }, [dialog.resource, form.operatorOrgId, preTourOperatorOptions]);

  useEffect(() => {
    const currentOperatorOrgId = String(copyForm.operatorOrgId || "");
    if (!currentOperatorOrgId) return;
    if (copyOperatorOptions.some((option) => option.value === currentOperatorOrgId)) return;
    setCopyForm((prev) => ({ ...prev, operatorOrgId: "" }));
  }, [copyForm.operatorOrgId, copyOperatorOptions]);

  useEffect(() => {
    void loadMasters().catch((error) => {
      notify.error(error instanceof Error ? error.message : "Failed to load lookup data.");
    });
  }, [loadMasters]);

  useEffect(() => {
    setCopyForm((prev) =>
      prev.currencyCode && prev.currencyCode !== "USD"
        ? prev
        : { ...prev, currencyCode: companyBaseCurrencyCode }
    );
  }, [companyBaseCurrencyCode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isPlanManageMode) return;
    if (sortedDays.length === 0) {
      setSelectedDayId("");
      return;
    }
    const exists = sortedDays.some((day) => String(day.id) === selectedDayId);
    if (!selectedDayId || !exists) {
      setSelectedDayId(String(sortedDays[0].id));
    }
  }, [isPlanManageMode, selectedDayId, sortedDays]);

  useEffect(() => {
    if (!isPlanManageMode) return;
    if (selectedDayItems.length === 0) {
      setSelectedItemId("");
      return;
    }
    const exists = selectedDayItems.some((item) => String(item.id) === selectedItemId);
    if (!selectedItemId || !exists) {
      setSelectedItemId(String(selectedDayItems[0].id));
    }
  }, [isPlanManageMode, selectedDayItems, selectedItemId]);

  const openDialog = (resource: PreTourResourceKey, mode: "create" | "edit", row?: Row) => {
    setDialogSessionId((prev) => prev + 1);
    setDialog({ open: true, mode, resource, row: row || null });
  };

  useEffect(() => {
    if (!dialog.open) return;
    const initKey = String(dialogSessionId);
    if (dialogInitKeyRef.current === initKey) return;
    dialogInitKeyRef.current = initKey;

    const nextForm: Row = {};
    visibleFields.forEach((field) => {
      const existing = dialog.row?.[field.key];
      if (field.type === "datetime") {
        nextForm[field.key] = existing ? toLocalDateTime(existing) : "";
      } else if (field.type === "json") {
        nextForm[field.key] = existing ? JSON.stringify(existing, null, 2) : "";
      } else if (existing !== undefined) {
        nextForm[field.key] = existing;
      } else {
        nextForm[field.key] = defaultValue(field);
      }
    });

    if (isPlanManageMode && dialog.mode === "create") {
      if (
        [
          "pre-tour-days",
          "pre-tour-items",
          "pre-tour-item-addons",
          "pre-tour-totals",
          "pre-tour-categories",
          "pre-tour-technical-visits",
        ].includes(dialog.resource)
      ) {
        nextForm.planId = managedPlanId;
      }

      if (dialog.resource === "pre-tour-days") {
        const nextDayNumber =
          sortedDays.length > 0
            ? Math.max(...sortedDays.map((row) => Number(row.dayNumber ?? 0)).filter(Number.isFinite)) + 1
            : 1;
        nextForm.dayNumber = nextDayNumber;
        if (selectedPlan?.startDate && typeof selectedPlan.startDate === "string") {
          nextForm.date = toLocalDateTime(
            addDays(selectedPlan.startDate, nextDayNumber - 1).toISOString()
          );
        }
      }

      if (dialog.resource === "pre-tour-items" && selectedDayId) {
        nextForm.dayId = selectedDayId;
      }

      if (dialog.resource === "pre-tour-item-addons" && selectedItemId) {
        nextForm.planItemId = selectedItemId;
      }

      if (dialog.resource === "pre-tour-categories" && !nextForm.typeId && tourCategoryTypeOptions[0]) {
        nextForm.typeId = tourCategoryTypeOptions[0].value;
      }
      if (dialog.resource === "pre-tour-technical-visits") {
        if (selectedDayId) nextForm.dayId = selectedDayId;
        if (!nextForm.technicalVisitId && technicalVisitOptions[0]) {
          nextForm.technicalVisitId = technicalVisitOptions[0].value;
        }
      }
    }

    setForm(nextForm);

    if (dialog.resource === "pre-tour-days") {
      const currentDayId = dialog.mode === "edit" ? String(dialog.row?.id || "") : "";
      const existingTransportItem = currentDayId
        ? items.find(
            (item) =>
              String(item.dayId) === currentDayId &&
              String(item.itemType || "").toUpperCase() === "TRANSPORT"
          )
        : null;

      setDayTransportForm({
        enabled: Boolean(existingTransportItem),
        serviceId: String(existingTransportItem?.serviceId || ""),
        startAt: toLocalDateTime(existingTransportItem?.startAt),
        endAt: toLocalDateTime(existingTransportItem?.endAt),
        pax:
          existingTransportItem?.pax !== undefined && existingTransportItem?.pax !== null
            ? String(existingTransportItem.pax)
            : "",
        baseAmount: String(existingTransportItem?.baseAmount ?? "0"),
        taxAmount: String(existingTransportItem?.taxAmount ?? "0"),
        totalAmount: String(existingTransportItem?.totalAmount ?? "0"),
        status: String(existingTransportItem?.status || "PLANNED"),
        notes: String(existingTransportItem?.notes || ""),
      });
    }
  }, [
    dialog.open,
    dialog.mode,
    dialog.resource,
    dialog.row,
    isPlanManageMode,
    managedPlanId,
    sortedDays,
    selectedPlan,
    selectedDayId,
    selectedItemId,
    items,
    tourCategoryTypeOptions,
    technicalVisitOptions,
    visibleFields,
    dialogSessionId,
  ]);

  const upsertDayTransportItem = useCallback(
    async (dayId: string, dayRow: Row) => {
      const existingTransportItem = items.find(
        (item) =>
          String(item.dayId) === dayId && String(item.itemType || "").toUpperCase() === "TRANSPORT"
      );

      if (!dayTransportForm.enabled || !dayTransportForm.serviceId) {
        if (existingTransportItem) {
          await deletePreTourRecord("pre-tour-items", String(existingTransportItem.id));
        }
        return;
      }

      if (!selectedPlan) {
        throw new Error("Pre-tour header is required before saving day transport details.");
      }

      const dayCode = sanitizeCodePart(String(dayRow.code || `DAY_${dayRow.dayNumber || "00"}`));
      const transportCode = `${dayCode}_TRANSPORT`;
      const startLabel = lookupLabel(dayRow.startLocationId);
      const endLabel = lookupLabel(dayRow.endLocationId);
      const title = `${startLabel} -> ${endLabel}`.replace(/\s+/g, " ").trim();

      const payload: Record<string, unknown> = {
        code: transportCode.slice(0, 80),
        planId: managedPlanId,
        dayId,
        itemType: "TRANSPORT",
        serviceId: dayTransportForm.serviceId || null,
        startAt: toIsoDateTime(dayTransportForm.startAt),
        endAt: toIsoDateTime(dayTransportForm.endAt),
        sortOrder: 0,
        pax: dayTransportForm.pax === "" ? null : toNumericValue(dayTransportForm.pax),
        fromLocationId: dayRow.startLocationId ? String(dayRow.startLocationId) : null,
        toLocationId: dayRow.endLocationId ? String(dayRow.endLocationId) : null,
        locationId: null,
        currencyCode: String(selectedPlan.currencyCode || companyBaseCurrencyCode),
        priceMode: String(selectedPlan.priceMode || "EXCLUSIVE"),
        baseAmount: toNumericValue(dayTransportForm.baseAmount),
        taxAmount: toNumericValue(dayTransportForm.taxAmount),
        totalAmount: toNumericValue(dayTransportForm.totalAmount),
        title: title || "Day Transport",
        description: null,
        notes: dayTransportForm.notes || null,
        status: dayTransportForm.status || "PLANNED",
        isActive: true,
      };

      if (existingTransportItem) {
        await updatePreTourRecord("pre-tour-items", String(existingTransportItem.id), payload);
      } else {
        await createPreTourRecord("pre-tour-items", payload);
      }
    },
    [
      companyBaseCurrencyCode,
      dayTransportForm,
      items,
      lookupLabel,
      managedPlanId,
      selectedPlan,
    ]
  );

  const onSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      visibleFields.forEach((field) => {
        payload[field.key] = parseFieldValue(field, form[field.key]);
      });

      if (isPlanManageMode && dialog.resource !== "pre-tours") {
        payload.planId = managedPlanId;
      }
      if (isPlanManageMode && dialog.resource === "pre-tour-items" && selectedDayId) {
        payload.dayId = selectedDayId;
      }
      if (isPlanManageMode && dialog.resource === "pre-tour-item-addons" && selectedItemId) {
        payload.planItemId = selectedItemId;
      }
      if (dialog.resource === "pre-tour-items") {
        payload.currencyCode = String(selectedPlan?.currencyCode || companyBaseCurrencyCode);
        payload.priceMode = String(selectedPlan?.priceMode || "EXCLUSIVE");
        if (!payload.itemType) payload.itemType = "MISC";

        const itemType = String(payload.itemType || "").toUpperCase();
        if (itemType === "ACCOMMODATION") {
          const planForPreferences = selectedPlan;
          const roomPreference = String(planForPreferences?.roomPreference || "").toUpperCase();
          const mealPreference = String(planForPreferences?.mealPreference || "").toUpperCase();

          if (!payload.rooms && roomPreference) {
            const adults = Number(planForPreferences?.adults ?? 0);
            const children = Number(planForPreferences?.children ?? 0);
            const childrenPerRoom = 2;
            const defaultRoomCount =
              roomPreference === "DOUBLE"
                ? Math.max(1, Math.ceil(adults / 2))
                : roomPreference === "TWIN"
                  ? Math.max(1, Math.ceil(adults / 2))
                  : Math.max(1, Math.ceil(adults / 2));
            payload.rooms = [
              {
                roomType: roomPreference || "DOUBLE",
                count: defaultRoomCount,
                adults,
                children: Math.max(0, childrenPerRoom > 0 ? children : 0),
              },
            ];
          }

          const noteLines: string[] = [];
          if (roomPreference) noteLines.push(`Room Preference: ${roomPreference}`);
          if (mealPreference) noteLines.push(`Meal Preference: ${mealPreference}`);
          if (noteLines.length > 0) {
            const existingNotes = String(payload.notes || "").trim();
            const prefBlock = noteLines.join("\n");
            payload.notes = existingNotes ? `${existingNotes}\n${prefBlock}` : prefBlock;
          }

          const existingSnapshot =
            payload.pricingSnapshot && typeof payload.pricingSnapshot === "object"
              ? (payload.pricingSnapshot as Record<string, unknown>)
              : {};
          payload.pricingSnapshot = {
            ...existingSnapshot,
            preferences: {
              roomPreference: roomPreference || null,
              mealPreference: mealPreference || null,
            },
          };
        }
      }
      if (dialog.resource === "pre-tour-categories") {
        const selectedTypeId = String(payload.typeId ?? "");
        const selectedCategoryId = String(payload.categoryId ?? "");
        const validCategory = tourCategories.some(
          (row) => String(row.id) === selectedCategoryId && String(row.typeId) === selectedTypeId
        );
        if (!validCategory) {
          throw new Error("Selected category does not match the selected category type.");
        }
      }
      if (dialog.resource === "pre-tour-technical-visits") {
        const selectedTechnicalVisitId = String(payload.technicalVisitId ?? "");
        const exists = technicalVisits.some((row) => String(row.id) === selectedTechnicalVisitId);
        if (!exists) {
          throw new Error("Selected field visit is invalid.");
        }
      }
      if (dialog.resource === "pre-tour-totals" && !canViewCosting) {
        throw new Error("Your subscription plan does not include Pre-Tour Costing.");
      }
      if (dialog.resource === "pre-tours") {
        const startDate = String(form.startDate ?? "");
        const endDate = String(form.endDate ?? "");
        payload.totalNights = toNightCount(startDate, endDate);
      }
      if (dialog.resource === "pre-tour-days" && dayTransportForm.enabled && !dayTransportForm.serviceId) {
        throw new Error("Select vehicle type in Day Transport Details.");
      }

      if (dialog.mode === "create") {
        const created = await createPreTourRecord(dialog.resource, payload);
        if (dialog.resource === "pre-tour-days") {
          await upsertDayTransportItem(String(created.id), created);
        }
        notify.success("Record created.");
      } else {
        const id = String(dialog.row?.id || "");
        const updated = await updatePreTourRecord(dialog.resource, id, payload);
        if (dialog.resource === "pre-tour-days") {
          await upsertDayTransportItem(id, updated);
        }
        notify.success("Record updated.");
      }

      setDialog((prev) => ({ ...prev, open: false, row: null, mode: "create" }));
      await loadData();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save record.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (resource: PreTourResourceKey, row: Row) => {
    if (isReadOnly) {
      notify.warning("You are in read-only mode.");
      return;
    }
    if (resource === "pre-tour-bins" && !isAdmin) {
      notify.warning("Only Admin can permanently delete records from bin.");
      return;
    }

    try {
      await deletePreTourRecord(resource, String(row.id));
      notify.success("Record deleted.");
      await loadData();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete record.");
    }
  };

  const moveItemWithinDay = useCallback(
    async (dayId: string, fromItemId: string, toItemId: string) => {
      if (!fromItemId || !toItemId || fromItemId === toItemId) return;

      const dayItems = items
        .filter((item) => String(item.dayId) === dayId)
        .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));

      const fromIndex = dayItems.findIndex((item) => String(item.id) === fromItemId);
      const toIndex = dayItems.findIndex((item) => String(item.id) === toItemId);
      if (fromIndex < 0 || toIndex < 0) return;

      const reordered = [...dayItems];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      const reorderMap = new Map<string, number>();
      reordered.forEach((item, index) => {
        reorderMap.set(String(item.id), index + 1);
      });

      setItems((prev) =>
        prev.map((item) => {
          const nextOrder = reorderMap.get(String(item.id));
          if (nextOrder === undefined) return item;
          return { ...item, sortOrder: nextOrder };
        })
      );

      try {
        await Promise.all(
          reordered.map((item, index) =>
            updatePreTourRecord("pre-tour-items", String(item.id), { sortOrder: index + 1 })
          )
        );
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to reorder items.");
        await loadData();
      }
    },
    [items, loadData]
  );

  const shareItemToDay = useCallback(async () => {
    if (!sharingItem || !shareTargetDayId) {
      notify.error("Select a target day.");
      return;
    }

    const targetDay = sortedDays.find((day) => String(day.id) === shareTargetDayId);
    const dayNum = Number(targetDay?.dayNumber ?? 0);
    const sourceCode = sanitizeCodePart(String(sharingItem.code || "ITEM"));
    const code = `${sourceCode}_D${String(dayNum || 0).padStart(2, "0")}_${Date.now()
      .toString()
      .slice(-4)}`;

    const payload: Record<string, unknown> = {
      code: code.slice(0, 80),
      planId: managedPlanId,
      dayId: shareTargetDayId,
      itemType: String(sharingItem.itemType || "MISC"),
      serviceId: sharingItem.serviceId ?? null,
      startAt: sharingItem.startAt ? new Date(String(sharingItem.startAt)).toISOString() : null,
      endAt: sharingItem.endAt ? new Date(String(sharingItem.endAt)).toISOString() : null,
      sortOrder: Number(sharingItem.sortOrder ?? 0),
      pax: sharingItem.pax ?? null,
      units: sharingItem.units ?? null,
      nights: sharingItem.nights ?? null,
      rooms: sharingItem.rooms ?? null,
      fromLocationId: sharingItem.fromLocationId ?? null,
      toLocationId: sharingItem.toLocationId ?? null,
      locationId: sharingItem.locationId ?? null,
      rateId: sharingItem.rateId ?? null,
      currencyCode: String(
        sharingItem.currencyCode || selectedPlan?.currencyCode || companyBaseCurrencyCode
      ),
      priceMode: String(sharingItem.priceMode || selectedPlan?.priceMode || "EXCLUSIVE"),
      baseAmount: Number(sharingItem.baseAmount ?? 0),
      taxAmount: Number(sharingItem.taxAmount ?? 0),
      totalAmount: Number(sharingItem.totalAmount ?? 0),
      pricingSnapshot: sharingItem.pricingSnapshot ?? null,
      title: sharingItem.title ?? null,
      description: sharingItem.description ?? null,
      notes: sharingItem.notes ?? null,
      status: String(sharingItem.status || "PLANNED"),
      isActive: Boolean(sharingItem.isActive ?? true),
    };

    setSharing(true);
    try {
      await createPreTourRecord("pre-tour-items", payload);
      notify.success("Item shared to selected day.");
      setSharingItem(null);
      setShareTargetDayId("");
      await loadData();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to share item.");
    } finally {
      setSharing(false);
    }
  }, [sharingItem, shareTargetDayId, sortedDays, managedPlanId, selectedPlan, companyBaseCurrencyCode, loadData]);

  const clonePlanChildren = useCallback(
    async (sourcePlan: Row, newPlanId: string, codePrefix: string) => {
      const sourcePlanId = String(sourcePlan.id);
      const [sourceDays, sourceItems, sourceAddons, sourceTotals, sourceCategories, sourceTechnicalVisits] =
        await Promise.all([
        listPreTourRecords("pre-tour-days", { planId: sourcePlanId, limit: 1000 }),
        listPreTourRecords("pre-tour-items", { planId: sourcePlanId, limit: 2000 }),
        listPreTourRecords("pre-tour-item-addons", { planId: sourcePlanId, limit: 2000 }),
        canViewCosting
          ? listPreTourRecords("pre-tour-totals", { planId: sourcePlanId, limit: 10 })
          : Promise.resolve([] as Row[]),
          listPreTourRecords("pre-tour-categories", { planId: sourcePlanId, limit: 200 }),
          listPreTourRecords("pre-tour-technical-visits", { planId: sourcePlanId, limit: 200 }),
        ]);

      const dayIdMap = new Map<string, string>();
      const sortedSourceDays = [...sourceDays].sort(
        (a, b) => Number(a.dayNumber || 0) - Number(b.dayNumber || 0)
      );
      for (const sourceDay of sortedSourceDays) {
        const dayNumber = Number(sourceDay.dayNumber || 1);
        const createdDay = await createPreTourRecord("pre-tour-days", {
          code: `${codePrefix}_DAY_${String(dayNumber).padStart(2, "0")}`.slice(0, 80),
          planId: newPlanId,
          dayNumber,
          date: new Date(String(sourceDay.date)).toISOString(),
          title: sourceDay.title ?? null,
          notes: sourceDay.notes ?? null,
          startLocationId: sourceDay.startLocationId ?? null,
          endLocationId: sourceDay.endLocationId ?? null,
          isActive: Boolean(sourceDay.isActive ?? true),
        });
        dayIdMap.set(String(sourceDay.id), String(createdDay.id));
      }

      const itemIdMap = new Map<string, string>();
      const sortedSourceItems = [...sourceItems].sort(
        (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
      );
      for (const sourceItem of sortedSourceItems) {
        const mappedDayId = dayIdMap.get(String(sourceItem.dayId));
        if (!mappedDayId) continue;
        const createdItem = await createPreTourRecord("pre-tour-items", {
          code: `${codePrefix}_ITEM_${String(sourceItem.sortOrder || 0)}`.slice(0, 80),
          planId: newPlanId,
          dayId: mappedDayId,
          itemType: String(sourceItem.itemType || "MISC"),
          serviceId: sourceItem.serviceId ?? null,
          startAt: sourceItem.startAt ? new Date(String(sourceItem.startAt)).toISOString() : null,
          endAt: sourceItem.endAt ? new Date(String(sourceItem.endAt)).toISOString() : null,
          sortOrder: Number(sourceItem.sortOrder || 0),
          pax: sourceItem.pax ?? null,
          units: sourceItem.units ?? null,
          nights: sourceItem.nights ?? null,
          rooms: sourceItem.rooms ?? null,
          fromLocationId: sourceItem.fromLocationId ?? null,
          toLocationId: sourceItem.toLocationId ?? null,
          locationId: sourceItem.locationId ?? null,
          rateId: sourceItem.rateId ?? null,
          currencyCode: String(
            sourceItem.currencyCode || sourcePlan.currencyCode || companyBaseCurrencyCode
          ),
          priceMode: String(sourceItem.priceMode || sourcePlan.priceMode || "EXCLUSIVE"),
          baseAmount: Number(sourceItem.baseAmount || 0),
          taxAmount: Number(sourceItem.taxAmount || 0),
          totalAmount: Number(sourceItem.totalAmount || 0),
          pricingSnapshot: sourceItem.pricingSnapshot ?? null,
          title: sourceItem.title ?? null,
          description: sourceItem.description ?? null,
          notes: sourceItem.notes ?? null,
          status: String(sourceItem.status || "PLANNED"),
          isActive: Boolean(sourceItem.isActive ?? true),
        });
        itemIdMap.set(String(sourceItem.id), String(createdItem.id));
      }

      for (const sourceAddon of sourceAddons) {
        const mappedItemId = itemIdMap.get(String(sourceAddon.planItemId));
        if (!mappedItemId) continue;
        await createPreTourRecord("pre-tour-item-addons", {
          code: `${codePrefix}_ADDON_${String(sourceAddon.id).slice(-6)}`.slice(0, 80),
          planId: newPlanId,
          planItemId: mappedItemId,
          addonType: String(sourceAddon.addonType || "SUPPLEMENT"),
          addonServiceId: sourceAddon.addonServiceId ?? null,
          title: sourceAddon.title ?? null,
          qty: Number(sourceAddon.qty || 1),
          currencyCode: String(
            sourceAddon.currencyCode || sourcePlan.currencyCode || companyBaseCurrencyCode
          ),
          baseAmount: Number(sourceAddon.baseAmount || 0),
          taxAmount: Number(sourceAddon.taxAmount || 0),
          totalAmount: Number(sourceAddon.totalAmount || 0),
          snapshot: sourceAddon.snapshot ?? null,
          isActive: Boolean(sourceAddon.isActive ?? true),
        });
      }

      for (const sourceTotal of sourceTotals) {
        await createPreTourRecord("pre-tour-totals", {
          code: `${codePrefix}_TOTAL`.slice(0, 80),
          planId: newPlanId,
          currencyCode: String(
            sourceTotal.currencyCode || sourcePlan.currencyCode || companyBaseCurrencyCode
          ),
          totalsByType: sourceTotal.totalsByType ?? null,
          baseTotal: Number(sourceTotal.baseTotal || 0),
          taxTotal: Number(sourceTotal.taxTotal || 0),
          grandTotal: Number(sourceTotal.grandTotal || 0),
          snapshot: sourceTotal.snapshot ?? null,
          isActive: Boolean(sourceTotal.isActive ?? true),
        });
      }

      for (const sourceCategory of sourceCategories) {
        if (!sourceCategory.typeId || !sourceCategory.categoryId) continue;
        await createPreTourRecord("pre-tour-categories", {
          code: `${codePrefix}_CAT_${String(sourceCategory.id).slice(-6)}`.slice(0, 80),
          planId: newPlanId,
          typeId: String(sourceCategory.typeId),
          categoryId: String(sourceCategory.categoryId),
          notes: sourceCategory.notes ?? null,
          isActive: Boolean(sourceCategory.isActive ?? true),
        });
      }

      for (const sourceTechnicalVisit of sourceTechnicalVisits) {
        if (!sourceTechnicalVisit.technicalVisitId) continue;
        const mappedDayId = sourceTechnicalVisit.dayId
          ? dayIdMap.get(String(sourceTechnicalVisit.dayId))
          : null;
        await createPreTourRecord("pre-tour-technical-visits", {
          code: `${codePrefix}_TV_${String(sourceTechnicalVisit.id).slice(-6)}`.slice(0, 80),
          planId: newPlanId,
          dayId: mappedDayId ?? null,
          technicalVisitId: String(sourceTechnicalVisit.technicalVisitId),
          notes: sourceTechnicalVisit.notes ?? null,
          isActive: Boolean(sourceTechnicalVisit.isActive ?? true),
        });
      }
    },
    [canViewCosting, companyBaseCurrencyCode]
  );

  const createVersionFromPlan = useCallback(
    async (sourcePlan: Row) => {
      if (!sourcePlan.categoryId || !sourcePlan.operatorOrgId || !sourcePlan.marketOrgId) {
        notify.error("Source pre-tour must have Category, Operator and Market before creating a version.");
        return;
      }
      const sourceReferenceNo = String(sourcePlan.referenceNo || sourcePlan.planCode || "");
      const versions = plans
        .filter((plan) => String(plan.referenceNo || "") === sourceReferenceNo)
        .map((plan) => Number(plan.version || 1));
      const nextVersion = (versions.length ? Math.max(...versions) : 1) + 1;
      const sourcePlanCode = String(sourcePlan.planCode || sourcePlan.code || "PRE_TOUR");
      const codePrefix = `${sourcePlanCode}_V${nextVersion}`;

      const headerPayload: Record<string, unknown> = {
        referenceNo: sourceReferenceNo,
        planCode: codePrefix.slice(0, 80),
        title: String(sourcePlan.title || "") || "Pre-Tour",
        categoryId: sourcePlan.categoryId,
        operatorOrgId: sourcePlan.operatorOrgId,
        marketOrgId: sourcePlan.marketOrgId,
        status: "DRAFT",
        startDate: new Date(String(sourcePlan.startDate)).toISOString(),
        endDate: new Date(String(sourcePlan.endDate)).toISOString(),
        totalNights: Number(sourcePlan.totalNights || 0),
        adults: Number(sourcePlan.adults || 1),
        children: Number(sourcePlan.children || 0),
        infants: Number(sourcePlan.infants || 0),
        preferredLanguage: sourcePlan.preferredLanguage ?? null,
        roomPreference: sourcePlan.roomPreference ?? null,
        mealPreference: sourcePlan.mealPreference ?? null,
        notes: sourcePlan.notes ?? null,
        currencyCode: String(sourcePlan.currencyCode || companyBaseCurrencyCode),
        priceMode: String(sourcePlan.priceMode || "EXCLUSIVE"),
        pricingPolicy: sourcePlan.pricingPolicy ?? null,
        baseTotal: Number(sourcePlan.baseTotal || 0),
        taxTotal: Number(sourcePlan.taxTotal || 0),
        grandTotal: Number(sourcePlan.grandTotal || 0),
        version: nextVersion,
        isLocked: false,
        isActive: Boolean(sourcePlan.isActive ?? true),
      };

      setCreatingVersion(true);
      try {
        const createdPlan = await createPreTourRecord("pre-tours", headerPayload);
        await clonePlanChildren(sourcePlan, String(createdPlan.id), codePrefix);
        notify.success(`Version V${nextVersion} created.`);
        await loadData();
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to create version.");
      } finally {
        setCreatingVersion(false);
      }
    },
    [clonePlanChildren, companyBaseCurrencyCode, plans, loadData]
  );

  const openCopyPlanDialog = useCallback((sourcePlan: Row) => {
    const sourcePlanCode = String(sourcePlan.planCode || sourcePlan.code || "PRE_TOUR");
    const copySuffix = Date.now().toString().slice(-4);
    setCopySourcePlan(sourcePlan);
    setCopyForm({
      planCode: `${sourcePlanCode}_COPY_${copySuffix}`.slice(0, 80),
      title: `${String(sourcePlan.title || "Pre-Tour")} (Copy)`,
      startDate: toLocalDateTime(sourcePlan.startDate),
      endDate: toLocalDateTime(sourcePlan.endDate),
      totalNights: String(Number(sourcePlan.totalNights || 0)),
      adults: String(Number(sourcePlan.adults || 1)),
      children: String(Number(sourcePlan.children || 0)),
      infants: String(Number(sourcePlan.infants || 0)),
      categoryId: String(sourcePlan.categoryId || ""),
      operatorOrgId: String(sourcePlan.operatorOrgId || ""),
      marketOrgId: String(sourcePlan.marketOrgId || ""),
      currencyCode: String(sourcePlan.currencyCode || companyBaseCurrencyCode),
      priceMode: String(sourcePlan.priceMode || "EXCLUSIVE"),
    });
    setCopyDialogOpen(true);
  }, [companyBaseCurrencyCode]);

  const submitCopyPlan = useCallback(async () => {
    if (!copySourcePlan) return;
    if (
      !copyForm.planCode.trim() ||
      !copyForm.categoryId ||
      !copyForm.operatorOrgId ||
      !copyForm.marketOrgId
    ) {
      notify.error("Plan Code, Tour Category, Operator and Market are required.");
      return;
    }

    const startIso = toIsoDateTime(copyForm.startDate);
    const endIso = toIsoDateTime(copyForm.endDate);
    if (!startIso || !endIso) {
      notify.error("Start Date and End Date are required.");
      return;
    }

    const headerPayload: Record<string, unknown> = {
      planCode: copyForm.planCode.trim().toUpperCase(),
      title: copyForm.title.trim() || "Pre-Tour",
      categoryId: copyForm.categoryId,
      operatorOrgId: copyForm.operatorOrgId,
      marketOrgId: copyForm.marketOrgId,
      status: "DRAFT",
      startDate: startIso,
      endDate: endIso,
      totalNights: Number(copyForm.totalNights || 0),
      adults: Number(copyForm.adults || 1),
      children: Number(copyForm.children || 0),
      infants: Number(copyForm.infants || 0),
      preferredLanguage: copySourcePlan.preferredLanguage ?? null,
      roomPreference: copySourcePlan.roomPreference ?? null,
      mealPreference: copySourcePlan.mealPreference ?? null,
      notes: copySourcePlan.notes ?? null,
      currencyCode: copyForm.currencyCode,
      priceMode: copyForm.priceMode,
      pricingPolicy: copySourcePlan.pricingPolicy ?? null,
      baseTotal: Number(copySourcePlan.baseTotal || 0),
      taxTotal: Number(copySourcePlan.taxTotal || 0),
      grandTotal: Number(copySourcePlan.grandTotal || 0),
      version: 1,
      isLocked: false,
      isActive: Boolean(copySourcePlan.isActive ?? true),
    };

    setCopySaving(true);
    try {
      const createdPlan = await createPreTourRecord("pre-tours", headerPayload);
      await clonePlanChildren(copySourcePlan, String(createdPlan.id), copyForm.planCode.trim().toUpperCase());
      notify.success("Pre-tour copied successfully.");
      setCopyDialogOpen(false);
      setCopySourcePlan(null);
      await loadData();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to copy pre-tour.");
    } finally {
      setCopySaving(false);
    }
  }, [clonePlanChildren, copyForm, copySourcePlan, loadData]);

  const syncDaysFromRange = useCallback(async () => {
    if (!isPlanManageMode || !selectedPlan) return;
    const startDate = String(selectedPlan.startDate || "");
    const endDate = String(selectedPlan.endDate || "");
    const expectedDays = toDayCount(startDate, endDate);

    if (expectedDays <= 0) {
      notify.error("Invalid plan date range. Update pre-tour header dates first.");
      return;
    }

    const baseCode = sanitizeCodePart(
      String(selectedPlan.planCode || selectedPlan.code || "PRE_TOUR")
    );

    setSyncingDays(true);
    try {
      const latestDayRows = await listPreTourRecords("pre-tour-days", {
        planId: managedPlanId,
        limit: 1000,
      });
      const existingDayNumbers = new Set(
        latestDayRows
          .map((day) => Number(day.dayNumber))
          .filter((value) => Number.isFinite(value))
      );

      const missingDayNumbers: number[] = [];
      for (let i = 1; i <= expectedDays; i += 1) {
        if (!existingDayNumbers.has(i)) missingDayNumbers.push(i);
      }

      if (missingDayNumbers.length === 0) {
        notify.info("All days are already initialized from the date range.");
        return;
      }

      for (const dayNumber of missingDayNumbers) {
        const code = `${baseCode}_DAY_${String(dayNumber).padStart(2, "0")}`;
        const date = addDays(startDate, dayNumber - 1).toISOString();
        await createPreTourRecord("pre-tour-days", {
          code,
          planId: managedPlanId,
          dayNumber,
          date,
          title: `Day ${dayNumber}`,
          isActive: true,
        });
      }
      notify.success(`Initialized ${missingDayNumbers.length} day(s) from plan date range.`);
      await loadData();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to initialize plan days.");
    } finally {
      setSyncingDays(false);
    }
  }, [isPlanManageMode, loadData, managedPlanId, selectedPlan]);

  useEffect(() => {
    if (!isPlanManageMode || !selectedPlan) return;
    if (syncingDays) return;
    if (days.length > 0) return;
    void syncDaysFromRange();
  }, [days.length, isPlanManageMode, selectedPlan, syncDaysFromRange, syncingDays]);

  const filteredPlanRows = useMemo(
    () => plans.filter((row) => matchesQuery("pre-tours", row, deferredQuery)),
    [deferredQuery, plans]
  );

  const filteredAddonRows = useMemo(() => {
    const rows = selectedItemId
      ? addons.filter((row) => String(row.planItemId) === selectedItemId)
      : addons;
    return rows.filter((row) => matchesQuery("pre-tour-item-addons", row, deferredQuery));
  }, [addons, deferredQuery, selectedItemId]);

  const filteredTotalRows = useMemo(
    () => totals.filter((row) => matchesQuery("pre-tour-totals", row, deferredQuery)),
    [deferredQuery, totals]
  );

  const filteredCategoryRows = useMemo(
    () => planCategories.filter((row) => matchesQuery("pre-tour-categories", row, deferredQuery)),
    [deferredQuery, planCategories]
  );

  const filteredTechnicalVisitRows = useMemo(
    () =>
      planTechnicalVisits.filter((row) => matchesQuery("pre-tour-technical-visits", row, deferredQuery)),
    [deferredQuery, planTechnicalVisits]
  );

  const filteredBinRows = useMemo(
    () => planBins.filter((row) => matchesQuery("pre-tour-bins", row, deferredQuery)),
    [deferredQuery, planBins]
  );

  const itemsByDayId = useMemo(() => {
    const map = new Map<string, Row[]>();
    nonTransportItems.forEach((item) => {
      const dayId = String(item.dayId || "");
      if (!dayId) return;
      const existing = map.get(dayId);
      if (existing) {
        existing.push(item);
        return;
      }
      map.set(dayId, [item]);
    });
    map.forEach((rows) => rows.sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)));
    return map;
  }, [nonTransportItems]);

  const addonsByItemId = useMemo(() => {
    const map = new Map<string, Row[]>();
    addons.forEach((addon) => {
      const itemId = String(addon.planItemId || "");
      if (!itemId) return;
      const existing = map.get(itemId);
      if (existing) {
        existing.push(addon);
        return;
      }
      map.set(itemId, [addon]);
    });
    return map;
  }, [addons]);

  const selectedManagedDay = useMemo(
    () => sortedDays.find((day) => String(day.id) === selectedDayId) ?? null,
    [selectedDayId, sortedDays]
  );

  const selectedManagedDayItems = useMemo(() => {
    if (!selectedDayId) return [];
    const baseItems = itemsByDayId.get(selectedDayId) ?? [];
    const trimmedQuery = deferredQuery.trim();
    if (!trimmedQuery) return baseItems;

    return baseItems.filter((item) => {
      if (matchesQuery("pre-tour-items", item, deferredQuery)) return true;
      const itemId = String(item.id || "");
      const itemAddons = addonsByItemId.get(itemId) ?? [];
      return itemAddons.some((addon) => matchesQuery("pre-tour-item-addons", addon, deferredQuery));
    });
  }, [addonsByItemId, deferredQuery, itemsByDayId, selectedDayId]);

  const routeLocationSequenceIds = useMemo(() => {
    if (!isPlanManageMode) return [];

    const orderedLocationIds: string[] = [];
    const pushLocation = (locationId: unknown) => {
      if (!locationId) return;
      const id = String(locationId);
      if (orderedLocationIds[orderedLocationIds.length - 1] === id) return;
      orderedLocationIds.push(id);
    };

    sortedDays.forEach((day) => {
      const dayId = String(day.id || "");
      const dayTransportItems = dayId ? transportItemsByDayId.get(dayId) ?? [] : [];
      if (dayTransportItems.length > 0) {
        dayTransportItems.forEach((item) => {
          pushLocation(item.fromLocationId ?? day.startLocationId);
          pushLocation(item.toLocationId ?? day.endLocationId);
        });
        return;
      }
      pushLocation(day.startLocationId);
      pushLocation(day.endLocationId);
    });

    return orderedLocationIds;
  }, [isPlanManageMode, sortedDays, transportItemsByDayId]);

  const routeMapLocations = useMemo(() => {
    return routeLocationSequenceIds
      .map((id, index) => {
        const location = locationCoordinatesById.get(id);
        if (!location) return null;
        return {
          id: `${id}-${index}`,
          name: location.name,
          coordinates: location.coordinates,
        };
      })
      .filter((location): location is { id: string; name: string; coordinates: [number, number] } =>
        Boolean(location)
      );
  }, [locationCoordinatesById, routeLocationSequenceIds]);

  const routePathLabel = useMemo(
    () =>
      routeLocationSequenceIds
        .map((locationId) => locationNameById.get(locationId) || locationId)
        .join(" -> "),
    [locationNameById, routeLocationSequenceIds]
  );

  useEffect(() => {
    if (routeMapLocations.length === 0) {
      setRouteMeta({ distanceKm: null, durationMin: null });
      if (mapDialogOpen) setMapDialogOpen(false);
      if (drawerShowMap) setDrawerShowMap(false);
    }
  }, [drawerShowMap, mapDialogOpen, routeMapLocations.length]);

  const openDetailSheet = useCallback(
    (
      title: string,
      description: string,
      row: Row,
      options?: { kind?: "generic" | "pre-tour" | "day-item"; dayId?: string }
    ) => {
      setDetailSheet({
        open: true,
        title,
        description,
        row,
        kind: options?.kind ?? "generic",
        dayId: options?.dayId,
      });
      setDrawerShowMap(false);
    },
    []
  );

  const detailDay = useMemo(() => {
    if (!detailSheet.open) return null;
    if (detailSheet.kind === "day-item") {
      const dayId = detailSheet.dayId || String(detailSheet.row?.dayId || "");
      if (!dayId) return null;
      return sortedDays.find((day) => String(day.id) === dayId) ?? null;
    }
    return null;
  }, [detailSheet.dayId, detailSheet.kind, detailSheet.open, detailSheet.row?.dayId, sortedDays]);

  const detailRouteLocationSequenceIds = useMemo(() => {
    if (!detailSheet.open) return [];
    if (detailSheet.kind === "pre-tour") return detailPreTourRouteIds;
    if (detailSheet.kind === "day-item" && detailDay) {
      const ids = [detailDay.startLocationId, detailDay.endLocationId]
        .filter(Boolean)
        .map((value) => String(value));
      return ids.filter((id, index) => id !== ids[index - 1]);
    }
    return [];
  }, [detailDay, detailPreTourRouteIds, detailSheet.kind, detailSheet.open]);

  const detailRouteMapLocations = useMemo(
    () =>
      detailRouteLocationSequenceIds
        .map((id, index) => {
          const location = locationCoordinatesById.get(id);
          if (!location) return null;
          return {
            id: `${id}-${index}`,
            name: location.name,
            coordinates: location.coordinates,
          };
        })
        .filter((row): row is { id: string; name: string; coordinates: [number, number] } =>
          Boolean(row)
        ),
    [detailRouteLocationSequenceIds, locationCoordinatesById]
  );

  const detailRoutePathLabel = useMemo(
    () =>
      detailRouteLocationSequenceIds
        .map((locationId) => locationNameById.get(locationId) || locationId)
        .join(" -> "),
    [detailRouteLocationSequenceIds, locationNameById]
  );

  useEffect(() => {
    if (!detailSheet.open || detailRouteMapLocations.length === 0) {
      setDrawerRouteMeta({ distanceKm: null, durationMin: null });
    }
  }, [detailRouteMapLocations.length, detailSheet.open]);

  useEffect(() => {
    const loadDetailPreTourRoute = async () => {
      if (!detailSheet.open || detailSheet.kind !== "pre-tour" || !detailSheet.row?.id) {
        setDetailPreTourRouteIds([]);
        setDetailPreTourRouteLoading(false);
        return;
      }

      if (isPlanManageMode) {
        setDetailPreTourRouteIds(routeLocationSequenceIds);
        setDetailPreTourRouteLoading(false);
        return;
      }

      setDetailPreTourRouteLoading(true);
      try {
        const dayRows = await listPreTourRecords("pre-tour-days", {
          planId: String(detailSheet.row.id),
          limit: 500,
        });
        const sorted = [...dayRows].sort(
          (a, b) => Number(a.dayNumber ?? 0) - Number(b.dayNumber ?? 0)
        );
        const ids: string[] = [];
        const pushId = (value: unknown) => {
          if (!value) return;
          const id = String(value);
          if (ids[ids.length - 1] === id) return;
          ids.push(id);
        };
        sorted.forEach((day) => {
          pushId(day.startLocationId);
          pushId(day.endLocationId);
        });
        setDetailPreTourRouteIds(ids);
      } catch {
        setDetailPreTourRouteIds([]);
      } finally {
        setDetailPreTourRouteLoading(false);
      }
    };

    void loadDetailPreTourRoute();
  }, [detailSheet.kind, detailSheet.open, detailSheet.row?.id, isPlanManageMode, routeLocationSequenceIds]);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>
              {showBinOnly ? "Pre-Tour Bin" : isPlanManageMode ? "Pre-Tour Workspace" : "Pre-Tour Plans"}
            </CardTitle>
            <CardDescription>
              {showBinOnly
                ? "Deleted pre-tour records bin. Admin can restore or permanently purge."
                : isPlanManageMode
                ? "Complete day-wise planning view for this pre-tour."
                : "Initialize pre-tour headers and manage each plan."}
            </CardDescription>
            {isPlanManageMode && selectedPlan ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Plan: <span className="font-medium text-foreground">{selectedPlan.code as string}</span> - {selectedPlan.title as string}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {isPlanManageMode ? (
              <Button variant="outline" asChild>
                <Link href="/master-data/pre-tours">
                  <ArrowLeft className="mr-1 size-4" />
                  Back to Plans
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" className="master-refresh-btn" onClick={() => void loadData()}>
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
            {isPlanManageMode ? (
              <Button
                variant="outline"
                onClick={() => void syncDaysFromRange()}
                disabled={isReadOnly || syncingDays}
              >
                {syncingDays ? "Syncing..." : "Sync Days From Range"}
              </Button>
            ) : null}
            {isPlanManageMode ? (
                <Button
                  variant="outline"
                  onClick={() => setMapDialogOpen(true)}
                  disabled={routeMapLocations.length === 0}
                >
                <MapPinned className="mr-1 size-4" />
                Route Map
              </Button>
            ) : null}
            {!isPlanManageMode && !showBinOnly ? (
              <Button className="master-add-btn" onClick={() => openDialog("pre-tours", "create")} disabled={isReadOnly}>
                <Plus className="mr-1 size-4" />
                Add Pre-Tour
              </Button>
            ) : null}
          </div>
        </div>

        <Input
          placeholder={
            showBinOnly
              ? "Search bin records..."
              : isPlanManageMode
              ? canViewCosting
                ? "Search in days, items, addons, totals..."
                : "Search in days, items, addons..."
              : "Search plans..."
          }
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        {isPlanManageMode ? (
          <PreTourDayWorkspace
            days={sortedDays}
            items={nonTransportItems}
            selectedDayId={selectedDayId}
            onSelectDay={setSelectedDayId}
            lookupLabel={lookupLabel}
            onAddItem={() => openDialog("pre-tour-items", "create")}
            disableAdd={isReadOnly}
          />
        ) : null}
      </CardHeader>

      <CardContent className="space-y-2 px-4 pb-3 pt-0">
        {!isPlanManageMode ? (
          showBinOnly ? (
            <SectionTable
              resource="pre-tour-bins"
              rows={filteredBinRows}
              loading={loading}
              isReadOnly={!isAdmin}
              lookups={lookups}
              hideAdd
              hideEdit={false}
              editLabel="Restore"
              deleteLabel="Purge"
              onView={(row) => openDetailSheet("Pre-Tour Bin Details", "Soft-deleted pre-tour.", row)}
              onEdit={(row) =>
                void updatePreTourRecord("pre-tour-bins", String(row.id), { action: "RESTORE" })
                  .then(() => {
                    notify.success("Pre-tour restored from bin.");
                    return loadData();
                  })
                  .catch((error) => {
                    notify.error(error instanceof Error ? error.message : "Failed to restore pre-tour.");
                  })
              }
              onDelete={(row) => void onDelete("pre-tour-bins", row)}
            />
          ) : (
          <>
            <SectionTable
              resource="pre-tours"
              rows={filteredPlanRows}
              loading={loading}
              isReadOnly={isReadOnly}
              lookups={lookups}
              embedded
              hideHeader
              hideSummary
              hideAdd
              showManage
              onCreateVersion={(row) => void createVersionFromPlan(row)}
              onCopyPlan={(row) => openCopyPlanDialog(row)}
              onView={(row) =>
                openDetailSheet("Pre-Tour Details", "Selected pre-tour record details.", row, {
                  kind: "pre-tour",
                })
              }
              onEdit={(row) => openDialog("pre-tours", "edit", row)}
              onDelete={(row) => void onDelete("pre-tours", row)}
            />
          </>)
        ) : (
          <>
            <ManagedDayEditor
              selectedDay={selectedManagedDay}
              selectedDayItems={selectedManagedDayItems}
              query={deferredQuery}
              isReadOnly={isReadOnly}
              addonsByItemId={addonsByItemId}
              lookupLabel={lookupLabel}
              onAddItem={(day) => {
                setSelectedDayId(String(day.id));
                openDialog("pre-tour-items", "create");
              }}
              onEditDay={(day) => {
                openDialog("pre-tour-days", "edit", day);
              }}
              onViewItem={(day, item) => {
                openDetailSheet("Day Item Details", `Day ${String(day.dayNumber)} item information.`, item, {
                  kind: "day-item",
                  dayId: String(day.id),
                });
              }}
              onAddAddon={(day, item) => {
                setSelectedDayId(String(day.id));
                setSelectedItemId(String(item.id));
                openDialog("pre-tour-item-addons", "create");
              }}
              onEditAddon={(item, addon) => {
                setSelectedItemId(String(item.id));
                openDialog("pre-tour-item-addons", "edit", addon);
              }}
              onShareItem={(item) => {
                setSharingItem(item);
                setShareTargetDayId("");
              }}
              onEditItem={(day, item) => {
                setSelectedDayId(String(day.id));
                setSelectedItemId(String(item.id));
                openDialog("pre-tour-items", "edit", item);
              }}
              onDeleteItem={(item) => {
                void onDelete("pre-tour-items", item);
              }}
              onMoveItemWithinDay={(dayId, draggedId, targetId) => {
                void moveItemWithinDay(dayId, draggedId, targetId);
              }}
            />

            <SectionTable
              resource="pre-tour-categories"
              rows={filteredCategoryRows}
              loading={loading}
              isReadOnly={isReadOnly}
              lookups={lookups}
              onAdd={() => openDialog("pre-tour-categories", "create")}
              onView={(row) =>
                openDetailSheet("Pre-Tour Category Details", "Selected category mapping details.", row)
              }
              onEdit={(row) => openDialog("pre-tour-categories", "edit", row)}
              onDelete={(row) => void onDelete("pre-tour-categories", row)}
            />
            <SectionTable
              resource="pre-tour-technical-visits"
              rows={filteredTechnicalVisitRows}
              loading={loading}
              isReadOnly={isReadOnly}
              lookups={lookups}
              onAdd={() => openDialog("pre-tour-technical-visits", "create")}
              onView={(row) =>
                openDetailSheet("Field Visit Link Details", "Selected field visit link details.", row)
              }
              onEdit={(row) => openDialog("pre-tour-technical-visits", "edit", row)}
              onDelete={(row) => void onDelete("pre-tour-technical-visits", row)}
            />
            <SectionTable
              resource="pre-tour-item-addons"
              rows={filteredAddonRows}
              loading={loading}
              isReadOnly={isReadOnly}
              lookups={lookups}
              onAdd={() => openDialog("pre-tour-item-addons", "create")}
              onView={(row) => openDetailSheet("Addon Details", "Selected addon details.", row)}
              onEdit={(row) => openDialog("pre-tour-item-addons", "edit", row)}
              onDelete={(row) => void onDelete("pre-tour-item-addons", row)}
            />
            {canViewCosting ? (
              <SectionTable
                resource="pre-tour-totals"
                rows={filteredTotalRows}
                loading={loading}
                isReadOnly={isReadOnly}
                lookups={lookups}
                onAdd={() => openDialog("pre-tour-totals", "create")}
                onView={(row) => openDetailSheet("Totals Details", "Selected totals details.", row)}
                onEdit={(row) => openDialog("pre-tour-totals", "edit", row)}
                onDelete={(row) => void onDelete("pre-tour-totals", row)}
              />
            ) : null}
          </>
        )}
      </CardContent>

      <PreTourRouteMapDialog
        open={mapDialogOpen}
        onOpenChange={setMapDialogOpen}
        selectedPlan={selectedPlan}
        routePathLabel={routePathLabel}
        routeMapLocations={routeMapLocations}
        useRoadRoute={useRoadRoute}
        onUseRoadRouteChange={setUseRoadRoute}
        routeMeta={routeMeta}
        onRouteMetaChange={setRouteMeta}
      />

      <PreTourShareDialog
        sharingItem={sharingItem}
        shareTargetDayId={shareTargetDayId}
        onShareTargetDayIdChange={setShareTargetDayId}
        dayOptions={dayOptions}
        sharing={sharing}
        isReadOnly={isReadOnly}
        onClose={() => setSharingItem(null)}
        onShare={() => void shareItemToDay()}
      />

      <PreTourDetailSheet
        detailSheet={detailSheet}
        setDetailSheetOpen={(open) => setDetailSheet((prev) => ({ ...prev, open }))}
        onClose={() => setDetailSheet((prev) => ({ ...prev, open: false }))}
        isReadOnly={isReadOnly}
        canViewRouteMap={canViewRouteMap}
        lookups={lookups}
        selectedPlan={selectedPlan}
        drawerShowMap={drawerShowMap}
        setDrawerShowMap={setDrawerShowMap}
        detailPreTourRouteLoading={detailPreTourRouteLoading}
        detailRouteLocationSequenceIds={detailRouteLocationSequenceIds}
        detailRoutePathLabel={detailRoutePathLabel}
        drawerRouteMeta={drawerRouteMeta}
        setDrawerRouteMeta={setDrawerRouteMeta}
        detailRouteMapLocations={detailRouteMapLocations}
        onCreateVersion={(row) => void createVersionFromPlan(row)}
        onCopy={(row) => openCopyPlanDialog(row)}
        onEditPreTour={(row) => openDialog("pre-tours", "edit", row)}
        onDeletePreTour={(row) => void onDelete("pre-tours", row)}
        onAddAddonFromItem={(row, dayId) => {
          setSelectedDayId(String(dayId || row.dayId || ""));
          setSelectedItemId(String(row.id || ""));
          setDetailSheet((prev) => ({ ...prev, open: false }));
          openDialog("pre-tour-item-addons", "create");
        }}
        onShareItem={(row) => {
          setSharingItem(row);
          setShareTargetDayId("");
          setDetailSheet((prev) => ({ ...prev, open: false }));
        }}
        onEditItem={(row, dayId) => {
          setSelectedDayId(String(dayId || row.dayId || ""));
          setSelectedItemId(String(row.id || ""));
          setDetailSheet((prev) => ({ ...prev, open: false }));
          openDialog("pre-tour-items", "edit", row);
        }}
        onDeleteItem={(row) => {
          setDetailSheet((prev) => ({ ...prev, open: false }));
          void onDelete("pre-tour-items", row);
        }}
      />

      <PreTourCopyDialog
        open={copyDialogOpen}
        onOpenChange={(open) => {
          setCopyDialogOpen(open);
          if (!open) setCopySourcePlan(null);
        }}
        copyForm={copyForm}
        setCopyForm={(updater) => setCopyForm((prev) => updater(prev))}
        allTourCategoryOptions={allTourCategoryOptions}
        marketOrganizationOptions={marketOrganizationOptions}
        copyOperatorOptions={copyOperatorOptions}
        hasContractForCopyMarket={hasContractForCopyMarket}
        currencyOptions={currencyOptions}
        copySaving={copySaving}
        isReadOnly={isReadOnly}
        onSubmit={() => void submitCopyPlan()}
      />

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}>
        <DialogContent
          className={`flex max-h-[90vh] flex-col ${
            dialog.resource === "pre-tour-days" ? "sm:max-w-6xl" : "sm:max-w-4xl"
          }`}
        >
          <DialogHeader>
            <DialogTitle>{dialog.mode === "create" ? "Add" : "Edit"} {META[dialog.resource].title}</DialogTitle>
            <DialogDescription>Fill required fields and save.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[68vh] overflow-y-auto pr-2">
            <PreTourRecordForm
              resource={dialog.resource}
              visibleFields={visibleFields}
              form={form}
              setForm={setForm}
              selectedDialogMarketOrgId={selectedDialogMarketOrgId}
              hasContractForSelectedDialogMarket={hasContractForSelectedDialogMarket}
              selectedPreTourItemType={selectedPreTourItemType}
              lookupLabel={lookupLabel}
              dayTransportForm={dayTransportForm}
              setDayTransportForm={setDayTransportForm}
              transportVehicleOptions={transportVehicleOptions}
            />
          </div>

          <DialogFooter>
            <RecordAuditMeta row={dialog.row} className="mr-auto" />
            <Button variant="outline" onClick={() => setDialog((prev) => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button onClick={() => void onSave()} disabled={saving || isReadOnly}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
