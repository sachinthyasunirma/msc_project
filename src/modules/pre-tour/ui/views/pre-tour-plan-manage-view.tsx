"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPinned, RefreshCw } from "lucide-react";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createPreTourRecord,
  deletePreTourRecord,
  listPreTourRecords,
  updatePreTourRecord,
} from "@/modules/pre-tour/lib/pre-tour-api";
import {
  addDays,
  defaultValue,
  getCoordinatesFromGeo,
  matchesQuery,
  parseFieldValue,
  sanitizeCodePart,
  toDayCount,
  toIsoDateTime,
  toLocalDateTime,
  toNightCount,
  toNumericValue,
} from "@/modules/pre-tour/lib/pre-tour-management-utils";
import type { PreTourMastersData } from "@/modules/pre-tour/shared/pre-tour-master-types";
import type { DetailSheetState, PreTourResourceKey, Row } from "@/modules/pre-tour/shared/pre-tour-management-types";
import { ManagedDayEditor } from "@/modules/pre-tour/ui/components/managed-day-editor";
import { PreTourCopyDialogController } from "@/modules/pre-tour/ui/components/pre-tour-copy-dialog-controller";
import { PreTourDayWorkspace } from "@/modules/pre-tour/ui/components/pre-tour-day-workspace";
import { PreTourDetailSheet } from "@/modules/pre-tour/ui/components/pre-tour-detail-sheet";
import { PreTourRecordDialog } from "@/modules/pre-tour/ui/components/pre-tour-record-dialog";
import { PreTourRouteMapDialogController } from "@/modules/pre-tour/ui/components/pre-tour-route-map-dialog-controller";
import { SectionTable } from "@/modules/pre-tour/ui/components/pre-tour-section-table";
import { PreTourShareDialogController } from "@/modules/pre-tour/ui/components/pre-tour-share-dialog-controller";
import { usePreTourAccess } from "@/modules/pre-tour/ui/hooks/use-pre-tour-access";
import { usePreTourMasters } from "@/modules/pre-tour/ui/hooks/use-pre-tour-masters";
import { usePreTourPlanOperations } from "@/modules/pre-tour/ui/hooks/use-pre-tour-plan-operations";
import {
  EMPTY_DAY_TRANSPORT_FORM,
  getPreTourFields,
  getVisiblePreTourFields,
  type DayTransportForm,
} from "@/modules/pre-tour/ui/lib/pre-tour-form-config";

type PreTourPlanManageViewProps = {
  planId: string;
  initialMasters?: PreTourMastersData | null;
};

export function PreTourPlanManageView({
  planId,
  initialMasters = null,
}: PreTourPlanManageViewProps) {
  const { isReadOnly, canViewRouteMap, canViewCosting } = usePreTourAccess();
  const {
    locations,
    vehicleTypes,
    activities,
    guides,
    currencies,
    organizations,
    operatorMarketContracts,
    tourCategoryTypes,
    tourCategories,
    technicalVisits,
    hotels,
    tourCategoryRules,
    companyBaseCurrencyCode,
  } = usePreTourMasters({ initialData: initialMasters });

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingDays, setSyncingDays] = useState(false);
  const [plans, setPlans] = useState<Row[]>([]);
  const [days, setDays] = useState<Row[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [addons, setAddons] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Row[]>([]);
  const [planTechnicalVisits, setPlanTechnicalVisits] = useState<Row[]>([]);
  const [selectedDayId, setSelectedDayId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [sharingItem, setSharingItem] = useState<Row | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourcePlan, setCopySourcePlan] = useState<Row | null>(null);
  const [detailSheet, setDetailSheet] = useState<DetailSheetState>({
    open: false,
    title: "",
    description: "",
    kind: "generic",
    row: null,
  });
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    resource: PreTourResourceKey;
    row: Row | null;
  }>({ open: false, mode: "create", resource: "pre-tour-days", row: null });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const planRows = await listPreTourRecords("pre-tours", { limit: 400 });
      setPlans(planRows);

      const [dayRows, itemRows, addonRows, totalRows, technicalVisitRows] = await Promise.all([
        listPreTourRecords("pre-tour-days", { limit: 500, planId }),
        listPreTourRecords("pre-tour-items", { limit: 500, planId }),
        listPreTourRecords("pre-tour-item-addons", { limit: 500, planId }),
        canViewCosting
          ? listPreTourRecords("pre-tour-totals", { limit: 500, planId })
          : Promise.resolve([] as Row[]),
        listPreTourRecords("pre-tour-technical-visits", { limit: 500, planId }),
      ]);

      setDays(dayRows);
      setItems(itemRows);
      setAddons(addonRows);
      setTotals(totalRows);
      setPlanTechnicalVisits(technicalVisitRows);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [canViewCosting, planId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedPlan = useMemo(
    () => plans.find((row) => String(row.id) === planId) ?? null,
    [planId, plans]
  );

  const { clonePlanChildren, createVersionFromPlan } = usePreTourPlanOperations({
    canViewCosting,
    companyBaseCurrencyCode,
    onSuccess: loadData,
  });

  const sortedDays = useMemo(
    () => [...days].sort((a, b) => Number(a.dayNumber ?? 0) - Number(b.dayNumber ?? 0)),
    [days]
  );

  useEffect(() => {
    if (sortedDays.length === 0) {
      setSelectedDayId("");
      return;
    }
    if (!sortedDays.some((day) => String(day.id) === selectedDayId)) {
      setSelectedDayId(String(sortedDays[0].id));
    }
  }, [selectedDayId, sortedDays]);

  const nonTransportItems = useMemo(
    () => items.filter((item) => String(item.itemType || "").toUpperCase() !== "TRANSPORT"),
    [items]
  );

  const selectedDayItems = useMemo(
    () => nonTransportItems.filter((item) => String(item.dayId) === selectedDayId),
    [nonTransportItems, selectedDayId]
  );

  useEffect(() => {
    if (selectedDayItems.length === 0) {
      setSelectedItemId("");
      return;
    }
    if (!selectedDayItems.some((item) => String(item.id) === selectedItemId)) {
      setSelectedItemId(String(selectedDayItems[0].id));
    }
  }, [selectedDayItems, selectedItemId]);

  const transportItemsByDayId = useMemo(() => {
    const map = new Map<string, Row[]>();
    items.forEach((item) => {
      if (String(item.itemType || "").toUpperCase() !== "TRANSPORT") return;
      const dayKey = String(item.dayId || "");
      if (!dayKey) return;
      map.set(dayKey, [...(map.get(dayKey) ?? []), item]);
    });
    map.forEach((rows) => rows.sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)));
    return map;
  }, [items]);

  const itemsByDayId = useMemo(() => {
    const map = new Map<string, Row[]>();
    nonTransportItems.forEach((item) => {
      const dayKey = String(item.dayId || "");
      if (!dayKey) return;
      map.set(dayKey, [...(map.get(dayKey) ?? []), item]);
    });
    map.forEach((rows) => rows.sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)));
    return map;
  }, [nonTransportItems]);

  const addonsByItemId = useMemo(() => {
    const map = new Map<string, Row[]>();
    addons.forEach((addon) => {
      const itemId = String(addon.planItemId || "");
      if (!itemId) return;
      map.set(itemId, [...(map.get(itemId) ?? []), addon]);
    });
    return map;
  }, [addons]);

  const selectedManagedDay = useMemo(
    () => sortedDays.find((day) => String(day.id) === selectedDayId) ?? null,
    [selectedDayId, sortedDays]
  );

  const selectedManagedDayItems = useMemo(() => {
    const baseItems = itemsByDayId.get(selectedDayId) ?? [];
    if (!query.trim()) return baseItems;
    return baseItems.filter((item) => {
      if (matchesQuery("pre-tour-items", item, query)) return true;
      return (addonsByItemId.get(String(item.id || "")) ?? []).some((addon) =>
        matchesQuery("pre-tour-item-addons", addon, query)
      );
    });
  }, [addonsByItemId, itemsByDayId, query, selectedDayId]);

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
    () => items.map((row) => ({ value: String(row.id), label: `${row.code} - ${row.title || row.itemType}` })),
    [items]
  );
  const filteredItemOptions = useMemo(
    () =>
      itemOptions.filter((option) =>
        items.some((row) => String(row.id) === option.value && String(row.dayId) === selectedDayId)
      ),
    [itemOptions, items, selectedDayId]
  );
  const locationOptions = useMemo(
    () => locations.map((row) => ({ value: String(row.id), label: `${row.code} - ${row.name}` })),
    [locations]
  );
  const serviceOptions = useMemo(
    () => [
      ...vehicleTypes.map((row) => ({ value: String(row.id), label: `TRANSPORT • ${row.code} - ${row.name}` })),
      ...activities.map((row) => ({ value: String(row.id), label: `ACT • ${row.code} - ${row.name}` })),
      ...guides.map((row) => ({ value: String(row.id), label: `GUIDE • ${row.code} - ${row.fullName}` })),
    ],
    [activities, guides, vehicleTypes]
  );
  const transportVehicleOptions = useMemo(
    () => vehicleTypes.map((row) => ({ value: String(row.id), label: `${row.code} - ${row.name}` })),
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
  const operatorIdsByMarketId = useMemo(() => {
    const map = new Map<string, string[]>();
    operatorMarketContracts
      .filter((row) => String(row.status || "ACTIVE") === "ACTIVE" && Boolean(row.isActive ?? true))
      .forEach((row) => {
        const marketId = String(row.marketOrgId || "");
        const operatorId = String(row.operatorOrgId || "");
        if (!marketId || !operatorId) return;
        map.set(marketId, [...(map.get(marketId) ?? []), operatorId]);
      });
    return map;
  }, [operatorMarketContracts]);
  const tourCategoryTypeOptions = useMemo(
    () =>
      tourCategoryTypes.map((row) => ({
        value: String(row.id),
        label: `${String(row.code)} - ${String(row.name)}`,
      })),
    [tourCategoryTypes]
  );
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
        label: `${String(row.code)} - ${String(row.visitType)} - ${new Date(String(row.visitDate)).toLocaleDateString()}`,
      })),
    [technicalVisits]
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

  const buildVisibleFields = useCallback(
    (resource: PreTourResourceKey, form: Row) => {
      const selectedDialogMarketOrgId = String(form.marketOrgId ?? dialog.row?.marketOrgId ?? "");
      const allowedOperatorIds = operatorIdsByMarketId.get(selectedDialogMarketOrgId) ?? [];
      const preTourOperatorOptions =
        !selectedDialogMarketOrgId || allowedOperatorIds.length === 0
          ? operatorOrganizationOptions
          : operatorOrganizationOptions.filter((option) => allowedOperatorIds.includes(option.value));

      const selectedCategoryTypeId =
        typeof form.typeId === "string" && form.typeId.trim().length > 0
          ? form.typeId
          : typeof dialog.row?.typeId === "string"
            ? dialog.row.typeId
            : "";
      const tourCategoryOptions = (selectedCategoryTypeId
        ? tourCategories.filter((row) => String(row.typeId) === selectedCategoryTypeId)
        : tourCategories
      ).map((row) => ({
        value: String(row.id),
        label: `${String(row.code)} - ${String(row.name)}`,
      }));

      const planForItem = plans.find((row) => String(row.id) === String(form.planId ?? planId)) ?? selectedPlan;
      const activeRule = planForItem?.categoryId
        ? tourCategoryRules.find((row) => String(row.categoryId) === String(planForItem.categoryId)) ?? null
        : null;
      const minStar = Number(activeRule?.restrictHotelStarMin ?? 0);
      const maxStar = Number(activeRule?.restrictHotelStarMax ?? 0);
      const accommodationServiceOptions = activeHotelOptions
        .filter((hotel) => {
          if (minStar > 0 && hotel.star < minStar) return false;
          if (maxStar > 0 && hotel.star > maxStar) return false;
          return true;
        })
        .map(({ value, label }) => ({ value, label }));

      const fields = getPreTourFields(resource, {
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
        selectedPreTourItemType: String(form.itemType ?? dialog.row?.itemType ?? "").toUpperCase(),
      });

      return getVisiblePreTourFields(fields, resource, true);
    },
    [
      activeHotelOptions,
      allTourCategoryOptions,
      companyBaseCurrencyCode,
      currencyOptions,
      dayOptions,
      dialog.row?.itemType,
      dialog.row?.marketOrgId,
      dialog.row?.typeId,
      filteredItemOptions,
      locationOptions,
      marketOrganizationOptions,
      operatorIdsByMarketId,
      operatorOrganizationOptions,
      planId,
      planOptions,
      plans,
      selectedPlan,
      serviceOptions,
      technicalVisitOptions,
      tourCategories,
      tourCategoryRules,
      tourCategoryTypeOptions,
    ]
  );

  const dialogInitialForm = useMemo(() => {
    const visibleFields = buildVisibleFields(dialog.resource, {});
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

    if (dialog.mode === "create" && dialog.resource !== "pre-tours") nextForm.planId = planId;
    if (dialog.mode === "create" && dialog.resource === "pre-tour-days") {
      const nextDayNumber =
        sortedDays.length > 0
          ? Math.max(...sortedDays.map((row) => Number(row.dayNumber ?? 0)).filter(Number.isFinite)) + 1
          : 1;
      nextForm.dayNumber = nextDayNumber;
      if (selectedPlan?.startDate && typeof selectedPlan.startDate === "string") {
        nextForm.date = toLocalDateTime(addDays(selectedPlan.startDate, nextDayNumber - 1).toISOString());
      }
    }
    if (dialog.mode === "create" && dialog.resource === "pre-tour-items" && selectedDayId) nextForm.dayId = selectedDayId;
    if (dialog.mode === "create" && dialog.resource === "pre-tour-item-addons" && selectedItemId) {
      nextForm.planItemId = selectedItemId;
    }
    if (dialog.mode === "create" && dialog.resource === "pre-tour-categories" && !nextForm.typeId && tourCategoryTypeOptions[0]) {
      nextForm.typeId = tourCategoryTypeOptions[0].value;
    }
    if (dialog.mode === "create" && dialog.resource === "pre-tour-technical-visits") {
      if (selectedDayId) nextForm.dayId = selectedDayId;
      if (!nextForm.technicalVisitId && technicalVisitOptions[0]) nextForm.technicalVisitId = technicalVisitOptions[0].value;
    }
    return nextForm;
  }, [
    buildVisibleFields,
    dialog.mode,
    dialog.resource,
    dialog.row,
    planId,
    selectedDayId,
    selectedItemId,
    selectedPlan,
    sortedDays,
    technicalVisitOptions,
    tourCategoryTypeOptions,
  ]);

  const dialogInitialDayTransportForm = useMemo<DayTransportForm>(() => {
    if (dialog.resource !== "pre-tour-days") return EMPTY_DAY_TRANSPORT_FORM;
    const currentDayId = dialog.mode === "edit" ? String(dialog.row?.id || "") : "";
    const existingTransportItem = currentDayId
      ? items.find(
          (item) => String(item.dayId) === currentDayId && String(item.itemType || "").toUpperCase() === "TRANSPORT"
        )
      : null;
    return {
      enabled: Boolean(existingTransportItem),
      serviceId: String(existingTransportItem?.serviceId || ""),
      startAt: toLocalDateTime(existingTransportItem?.startAt),
      endAt: toLocalDateTime(existingTransportItem?.endAt),
      pax: existingTransportItem?.pax !== undefined && existingTransportItem?.pax !== null ? String(existingTransportItem.pax) : "",
      baseAmount: String(existingTransportItem?.baseAmount ?? "0"),
      taxAmount: String(existingTransportItem?.taxAmount ?? "0"),
      totalAmount: String(existingTransportItem?.totalAmount ?? "0"),
      status: String(existingTransportItem?.status || "PLANNED"),
      notes: String(existingTransportItem?.notes || ""),
    };
  }, [dialog.mode, dialog.resource, dialog.row?.id, items]);

  const lookups = useMemo(() => {
    const pairs: Array<[string, string]> = [];
    [
      planOptions,
      dayOptions,
      itemOptions,
      locationOptions,
      serviceOptions,
      operatorOrganizationOptions,
      marketOrganizationOptions,
      tourCategoryTypeOptions,
      allTourCategoryOptions,
      technicalVisitOptions,
      currencyOptions,
    ].forEach((options) => options.forEach((option) => pairs.push([option.value, option.label])));
    return Object.fromEntries(pairs);
  }, [
    allTourCategoryOptions,
    currencyOptions,
    dayOptions,
    itemOptions,
    locationOptions,
    marketOrganizationOptions,
    operatorOrganizationOptions,
    planOptions,
    serviceOptions,
    technicalVisitOptions,
    tourCategoryTypeOptions,
  ]);

  const lookupLabel = useCallback((id: unknown) => {
    if (!id || typeof id !== "string") return "-";
    return lookups[id] ?? id;
  }, [lookups]);

  const routeLocationSequenceIds = useMemo(() => {
    const orderedLocationIds: string[] = [];
    const appendDayPath = (path: unknown[]) => {
      const normalized = path
        .filter(Boolean)
        .map((value) => String(value))
        .filter((value, index, items) => index === 0 || value !== items[index - 1]);
      if (normalized.length === 0) return;
      if (orderedLocationIds.length > 0 && orderedLocationIds[orderedLocationIds.length - 1] === normalized[0]) {
        normalized.shift();
      }
      orderedLocationIds.push(...normalized);
    };

    sortedDays.forEach((day) => {
      const dayTransportItems = transportItemsByDayId.get(String(day.id || "")) ?? [];
      if (dayTransportItems.length > 0) {
        const dayPath: unknown[] = [];
        dayTransportItems.forEach((item) => {
          dayPath.push(item.fromLocationId ?? day.startLocationId);
          dayPath.push(item.toLocationId ?? day.endLocationId);
        });
        appendDayPath(dayPath);
        return;
      }
      appendDayPath([day.startLocationId, day.endLocationId]);
    });

    return orderedLocationIds;
  }, [sortedDays, transportItemsByDayId]);

  const locationCoordinatesById = useMemo(() => {
    const next = new Map<string, { name: string; coordinates: [number, number] }>();
    locations.forEach((row) => {
      const id = String(row.id || "");
      if (!id) return;
      const coordinates = getCoordinatesFromGeo(row.geo);
      if (!coordinates) return;
      next.set(id, { name: String(row.name || row.code || id), coordinates });
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

  const routeMapLocations = useMemo(
    () =>
      routeLocationSequenceIds
        .map((id, index) => {
          const location = locationCoordinatesById.get(id);
          if (!location) return null;
          return { id: `${id}-${index}`, name: location.name, coordinates: location.coordinates };
        })
        .filter((location): location is { id: string; name: string; coordinates: [number, number] } => Boolean(location)),
    [locationCoordinatesById, routeLocationSequenceIds]
  );
  const routePathLabel = useMemo(
    () => routeLocationSequenceIds.map((locationId) => locationNameById.get(locationId) || locationId).join(" -> "),
    [locationNameById, routeLocationSequenceIds]
  );

  const detailDay = useMemo(() => {
    if (!detailSheet.open || detailSheet.kind !== "day-item") return null;
    const dayId = detailSheet.dayId || String(detailSheet.row?.dayId || "");
    if (!dayId) return null;
    return sortedDays.find((day) => String(day.id) === dayId) ?? null;
  }, [detailSheet.dayId, detailSheet.kind, detailSheet.open, detailSheet.row?.dayId, sortedDays]);
  const detailRouteLocationSequenceIds = useMemo(() => {
    if (!detailSheet.open) return [];
    if (detailSheet.kind === "pre-tour") return routeLocationSequenceIds;
    if (detailSheet.kind === "day-item" && detailDay) {
      const ids = [detailDay.startLocationId, detailDay.endLocationId].filter(Boolean).map((value) => String(value));
      return ids.filter((id, index) => id !== ids[index - 1]);
    }
    return [];
  }, [detailDay, detailSheet.kind, detailSheet.open, routeLocationSequenceIds]);
  const detailRouteMapLocations = useMemo(
    () =>
      detailRouteLocationSequenceIds
        .map((id, index) => {
          const location = locationCoordinatesById.get(id);
          if (!location) return null;
          return { id: `${id}-${index}`, name: location.name, coordinates: location.coordinates };
        })
        .filter((row): row is { id: string; name: string; coordinates: [number, number] } => Boolean(row)),
    [detailRouteLocationSequenceIds, locationCoordinatesById]
  );
  const detailRoutePathLabel = useMemo(
    () => detailRouteLocationSequenceIds.map((locationId) => locationNameById.get(locationId) || locationId).join(" -> "),
    [detailRouteLocationSequenceIds, locationNameById]
  );

  const upsertDayTransportItem = useCallback(
    async (dayId: string, dayRow: Row, dayTransportForm: DayTransportForm) => {
      const existingTransportItem = items.find(
        (item) => String(item.dayId) === dayId && String(item.itemType || "").toUpperCase() === "TRANSPORT"
      );

      if (!dayTransportForm.enabled || !dayTransportForm.serviceId) {
        if (existingTransportItem) await deletePreTourRecord("pre-tour-items", String(existingTransportItem.id));
        return;
      }
      if (!selectedPlan) throw new Error("Pre-tour header is required before saving day transport details.");

      const dayCode = sanitizeCodePart(String(dayRow.code || `DAY_${dayRow.dayNumber || "00"}`));
      const transportCode = `${dayCode}_TRANSPORT`;
      const title = `${lookupLabel(dayRow.startLocationId)} -> ${lookupLabel(dayRow.endLocationId)}`.replace(/\s+/g, " ").trim();
      const payload: Record<string, unknown> = {
        code: transportCode.slice(0, 80),
        planId,
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
    [companyBaseCurrencyCode, items, lookupLabel, planId, selectedPlan]
  );

  const onSave = async ({ form, dayTransportForm }: { form: Row; dayTransportForm: DayTransportForm }) => {
    setSaving(true);
    try {
      const visibleFields = buildVisibleFields(dialog.resource, form);
      const payload: Record<string, unknown> = {};
      visibleFields.forEach((field) => {
        payload[field.key] = parseFieldValue(field, form[field.key]);
      });

      if (dialog.resource !== "pre-tours") payload.planId = planId;
      if (dialog.resource === "pre-tour-items" && selectedDayId) payload.dayId = selectedDayId;
      if (dialog.resource === "pre-tour-item-addons" && selectedItemId) payload.planItemId = selectedItemId;

      if (dialog.resource === "pre-tour-items") {
        payload.currencyCode = String(selectedPlan?.currencyCode || companyBaseCurrencyCode);
        payload.priceMode = String(selectedPlan?.priceMode || "EXCLUSIVE");
        if (!payload.itemType) payload.itemType = "MISC";

        if (String(payload.itemType || "").toUpperCase() === "ACCOMMODATION") {
          const roomPreference = String(selectedPlan?.roomPreference || "").toUpperCase();
          const mealPreference = String(selectedPlan?.mealPreference || "").toUpperCase();
          if (!payload.rooms && roomPreference) {
            const adults = Number(selectedPlan?.adults ?? 0);
            const children = Number(selectedPlan?.children ?? 0);
            payload.rooms = [{
              roomType: roomPreference || "DOUBLE",
              count: Math.max(1, Math.ceil(adults / 2)),
              adults,
              children,
            }];
          }
          const noteLines: string[] = [];
          if (roomPreference) noteLines.push(`Room Preference: ${roomPreference}`);
          if (mealPreference) noteLines.push(`Meal Preference: ${mealPreference}`);
          if (noteLines.length > 0) {
            const existingNotes = String(payload.notes || "").trim();
            payload.notes = existingNotes ? `${existingNotes}\n${noteLines.join("\n")}` : noteLines.join("\n");
          }
          const existingSnapshot =
            payload.pricingSnapshot && typeof payload.pricingSnapshot === "object"
              ? (payload.pricingSnapshot as Record<string, unknown>)
              : {};
          payload.pricingSnapshot = {
            ...existingSnapshot,
            preferences: { roomPreference: roomPreference || null, mealPreference: mealPreference || null },
          };
        }
      }
      if (dialog.resource === "pre-tour-categories") {
        const validCategory = tourCategories.some(
          (row) => String(row.id) === String(payload.categoryId ?? "") && String(row.typeId) === String(payload.typeId ?? "")
        );
        if (!validCategory) throw new Error("Selected category does not match the selected category type.");
      }
      if (dialog.resource === "pre-tour-technical-visits") {
        const exists = technicalVisits.some((row) => String(row.id) === String(payload.technicalVisitId ?? ""));
        if (!exists) throw new Error("Selected field visit is invalid.");
      }
      if (dialog.resource === "pre-tour-totals" && !canViewCosting) {
        throw new Error("Your subscription plan does not include Pre-Tour Costing.");
      }
      if (dialog.resource === "pre-tours") {
        payload.totalNights = toNightCount(String(form.startDate ?? ""), String(form.endDate ?? ""));
      }
      if (dialog.resource === "pre-tour-days" && dayTransportForm.enabled && !dayTransportForm.serviceId) {
        throw new Error("Select vehicle type in Day Transport Details.");
      }

      if (dialog.mode === "create") {
        const created = await createPreTourRecord(dialog.resource, payload);
        if (dialog.resource === "pre-tour-days") await upsertDayTransportItem(String(created.id), created, dayTransportForm);
        notify.success("Record created.");
      } else {
        const updated = await updatePreTourRecord(dialog.resource, String(dialog.row?.id || ""), payload);
        if (dialog.resource === "pre-tour-days") {
          await upsertDayTransportItem(String(dialog.row?.id || ""), updated, dayTransportForm);
        }
        notify.success("Record updated.");
      }

      setDialog({ open: false, mode: "create", resource: "pre-tour-days", row: null });
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
    try {
      await deletePreTourRecord(resource, String(row.id));
      notify.success("Record deleted.");
      await loadData();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete record.");
    }
  };

  const moveItemWithinDay = useCallback(async (dayId: string, fromItemId: string, toItemId: string) => {
    if (!fromItemId || !toItemId || fromItemId === toItemId) return;
    const dayItems = items.filter((item) => String(item.dayId) === dayId).sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
    const fromIndex = dayItems.findIndex((item) => String(item.id) === fromItemId);
    const toIndex = dayItems.findIndex((item) => String(item.id) === toItemId);
    if (fromIndex < 0 || toIndex < 0) return;

    const reordered = [...dayItems];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    setItems((prev) =>
      prev.map((item) => {
        const nextIndex = reordered.findIndex((row) => String(row.id) === String(item.id));
        return nextIndex >= 0 ? { ...item, sortOrder: nextIndex + 1 } : item;
      })
    );

    try {
      await Promise.all(
        reordered.map((item, index) => updatePreTourRecord("pre-tour-items", String(item.id), { sortOrder: index + 1 }))
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to reorder items.");
      await loadData();
    }
  }, [items, loadData]);

  const syncDaysFromRange = useCallback(async () => {
    if (!selectedPlan) return;
    const expectedDays = toDayCount(String(selectedPlan.startDate || ""), String(selectedPlan.endDate || ""));
    if (expectedDays <= 0) {
      notify.error("Invalid plan date range. Update pre-tour header dates first.");
      return;
    }

    setSyncingDays(true);
    try {
      const latestDayRows = await listPreTourRecords("pre-tour-days", { planId, limit: 1000 });
      const existingDayNumbers = new Set(
        latestDayRows.map((day) => Number(day.dayNumber)).filter((value) => Number.isFinite(value))
      );
      const baseCode = sanitizeCodePart(String(selectedPlan.planCode || selectedPlan.code || "PRE_TOUR"));
      const missingDayNumbers: number[] = [];
      for (let dayNumber = 1; dayNumber <= expectedDays; dayNumber += 1) {
        if (!existingDayNumbers.has(dayNumber)) missingDayNumbers.push(dayNumber);
      }
      if (missingDayNumbers.length === 0) {
        notify.info("All days are already initialized from the date range.");
        return;
      }
      for (const dayNumber of missingDayNumbers) {
        await createPreTourRecord("pre-tour-days", {
          code: `${baseCode}_DAY_${String(dayNumber).padStart(2, "0")}`,
          planId,
          dayNumber,
          date: addDays(String(selectedPlan.startDate), dayNumber - 1).toISOString(),
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
  }, [loadData, planId, selectedPlan]);

  useEffect(() => {
    if (!selectedPlan || syncingDays || days.length > 0) return;
    void syncDaysFromRange();
  }, [days.length, selectedPlan, syncDaysFromRange, syncingDays]);

  const filteredAddonRows = useMemo(() => {
    const rows = selectedItemId ? addons.filter((row) => String(row.planItemId) === selectedItemId) : addons;
    return rows.filter((row) => matchesQuery("pre-tour-item-addons", row, query));
  }, [addons, query, selectedItemId]);
  const filteredTotalRows = useMemo(
    () => totals.filter((row) => matchesQuery("pre-tour-totals", row, query)),
    [query, totals]
  );
  const filteredTechnicalVisitRows = useMemo(
    () => planTechnicalVisits.filter((row) => matchesQuery("pre-tour-technical-visits", row, query)),
    [planTechnicalVisits, query]
  );

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>Pre-Tour Plan Manage</CardTitle>
            <CardDescription>Complete day-wise planning view for this pre-tour.</CardDescription>
            {selectedPlan ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Plan: <span className="font-medium text-foreground">{selectedPlan.code as string}</span> - {selectedPlan.title as string}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="outline" asChild>
              <Link href="/master-data/pre-tours">
                <ArrowLeft className="mr-1 size-4" />
                Back to Plans
              </Link>
            </Button>
            <Button variant="outline" className="master-refresh-btn" onClick={() => void loadData()}>
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => void syncDaysFromRange()} disabled={isReadOnly || syncingDays}>
              {syncingDays ? "Syncing..." : "Sync Days From Range"}
            </Button>
            <Button variant="outline" onClick={() => setMapDialogOpen(true)} disabled={routeMapLocations.length === 0}>
              <MapPinned className="mr-1 size-4" />
              Route Map
            </Button>
          </div>
        </div>

        <Input
          placeholder={canViewCosting ? "Search in days, items, addons, totals..." : "Search in days, items, addons..."}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <PreTourDayWorkspace
          days={sortedDays}
          items={nonTransportItems}
          selectedDayId={selectedDayId}
          onSelectDay={setSelectedDayId}
          lookupLabel={lookupLabel}
          onAddItem={() => setDialog({ open: true, mode: "create", resource: "pre-tour-items", row: null })}
          disableAdd={isReadOnly}
        />
      </CardHeader>

      <CardContent className="space-y-2 px-4 pb-3 pt-0">
        <ManagedDayEditor
          selectedDay={selectedManagedDay}
          selectedDayItems={selectedManagedDayItems}
          query={query}
          isReadOnly={isReadOnly}
          addonsByItemId={addonsByItemId}
          lookupLabel={lookupLabel}
          onAddItem={(day) => {
            setSelectedDayId(String(day.id));
            setDialog({ open: true, mode: "create", resource: "pre-tour-items", row: null });
          }}
          onEditDay={(day) => setDialog({ open: true, mode: "edit", resource: "pre-tour-days", row: day })}
          onViewItem={(day, item) =>
            setDetailSheet({
              open: true,
              title: "Day Item Details",
              description: `Day ${String(day.dayNumber)} item information.`,
              row: item,
              kind: "day-item",
              dayId: String(day.id),
            })
          }
          onAddAddon={(day, item) => {
            setSelectedDayId(String(day.id));
            setSelectedItemId(String(item.id));
            setDialog({ open: true, mode: "create", resource: "pre-tour-item-addons", row: null });
          }}
          onEditAddon={(item, addon) => {
            setSelectedItemId(String(item.id));
            setDialog({ open: true, mode: "edit", resource: "pre-tour-item-addons", row: addon });
          }}
          onShareItem={setSharingItem}
          onEditItem={(day, item) => {
            setSelectedDayId(String(day.id));
            setSelectedItemId(String(item.id));
            setDialog({ open: true, mode: "edit", resource: "pre-tour-items", row: item });
          }}
          onDeleteItem={(item) => void onDelete("pre-tour-items", item)}
          onMoveItemWithinDay={(dayId, dragItemId, targetItemId) => void moveItemWithinDay(dayId, dragItemId, targetItemId)}
        />

        <SectionTable
          resource="pre-tour-technical-visits"
          rows={filteredTechnicalVisitRows}
          loading={loading}
          isReadOnly={isReadOnly}
          lookups={lookups}
          onAdd={() => setDialog({ open: true, mode: "create", resource: "pre-tour-technical-visits", row: null })}
          onView={(row) => setDetailSheet({ open: true, title: "Field Visit Link Details", description: "Selected field visit link details.", row, kind: "generic" })}
          onEdit={(row) => setDialog({ open: true, mode: "edit", resource: "pre-tour-technical-visits", row })}
          onDelete={(row) => void onDelete("pre-tour-technical-visits", row)}
        />
        <SectionTable
          resource="pre-tour-item-addons"
          rows={filteredAddonRows}
          loading={loading}
          isReadOnly={isReadOnly}
          lookups={lookups}
          onAdd={() => setDialog({ open: true, mode: "create", resource: "pre-tour-item-addons", row: null })}
          onView={(row) => setDetailSheet({ open: true, title: "Addon Details", description: "Selected addon details.", row, kind: "generic" })}
          onEdit={(row) => setDialog({ open: true, mode: "edit", resource: "pre-tour-item-addons", row })}
          onDelete={(row) => void onDelete("pre-tour-item-addons", row)}
        />
        {canViewCosting ? (
          <SectionTable
            resource="pre-tour-totals"
            rows={filteredTotalRows}
            loading={loading}
            isReadOnly={isReadOnly}
            lookups={lookups}
            onAdd={() => setDialog({ open: true, mode: "create", resource: "pre-tour-totals", row: null })}
            onView={(row) => setDetailSheet({ open: true, title: "Totals Details", description: "Selected totals details.", row, kind: "generic" })}
            onEdit={(row) => setDialog({ open: true, mode: "edit", resource: "pre-tour-totals", row })}
            onDelete={(row) => void onDelete("pre-tour-totals", row)}
          />
        ) : null}
      </CardContent>

      <PreTourRouteMapDialogController
        open={mapDialogOpen}
        onOpenChange={setMapDialogOpen}
        selectedPlan={selectedPlan}
        routePathLabel={routePathLabel}
        routeMapLocations={routeMapLocations}
      />

      <PreTourShareDialogController
        sharingItem={sharingItem}
        onClose={() => setSharingItem(null)}
        dayOptions={dayOptions}
        sortedDays={sortedDays}
        managedPlanId={planId}
        selectedPlan={selectedPlan}
        companyBaseCurrencyCode={companyBaseCurrencyCode}
        isReadOnly={isReadOnly}
        onSuccess={loadData}
      />

      <PreTourDetailSheet
        detailSheet={detailSheet}
        setDetailSheetOpen={(open) => setDetailSheet((prev) => ({ ...prev, open }))}
        onClose={() => setDetailSheet((prev) => ({ ...prev, open: false }))}
        isReadOnly={isReadOnly}
        canViewRouteMap={canViewRouteMap}
        lookups={lookups}
        selectedPlan={selectedPlan}
        detailPreTourRouteLoading={false}
        detailRouteLocationSequenceIds={detailRouteLocationSequenceIds}
        detailRoutePathLabel={detailRoutePathLabel}
        detailRouteMapLocations={detailRouteMapLocations}
        onCreateVersion={(row) => void createVersionFromPlan(row)}
        onCopy={(row) => {
          setCopySourcePlan(row);
          setCopyDialogOpen(true);
        }}
        onEditPreTour={(row) => setDialog({ open: true, mode: "edit", resource: "pre-tours", row })}
        onDeletePreTour={(row) => void onDelete("pre-tours", row)}
        onAddAddonFromItem={(row, dayId) => {
          setSelectedDayId(String(dayId || row.dayId || ""));
          setSelectedItemId(String(row.id || ""));
          setDetailSheet((prev) => ({ ...prev, open: false }));
          setDialog({ open: true, mode: "create", resource: "pre-tour-item-addons", row: null });
        }}
        onShareItem={(row) => {
          setSharingItem(row);
          setDetailSheet((prev) => ({ ...prev, open: false }));
        }}
        onEditItem={(row, dayId) => {
          setSelectedDayId(String(dayId || row.dayId || ""));
          setSelectedItemId(String(row.id || ""));
          setDetailSheet((prev) => ({ ...prev, open: false }));
          setDialog({ open: true, mode: "edit", resource: "pre-tour-items", row });
        }}
        onDeleteItem={(row) => {
          setDetailSheet((prev) => ({ ...prev, open: false }));
          void onDelete("pre-tour-items", row);
        }}
      />

      <PreTourCopyDialogController
        open={copyDialogOpen}
        onOpenChange={(open) => {
          setCopyDialogOpen(open);
          if (!open) setCopySourcePlan(null);
        }}
        sourcePlan={copySourcePlan}
        companyBaseCurrencyCode={companyBaseCurrencyCode}
        operatorIdsByMarketId={operatorIdsByMarketId}
        operatorOrganizationOptions={operatorOrganizationOptions}
        marketOrganizationOptions={marketOrganizationOptions}
        allTourCategoryOptions={allTourCategoryOptions}
        currencyOptions={currencyOptions}
        isReadOnly={isReadOnly}
        clonePlanChildren={clonePlanChildren}
        onSuccess={loadData}
      />

      <PreTourRecordDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((prev) => ({ ...prev, open, row: open ? prev.row : null }))}
        mode={dialog.mode}
        resource={dialog.resource}
        row={dialog.row}
        isReadOnly={isReadOnly}
        saving={saving}
        visibleFields={buildVisibleFields(dialog.resource, dialogInitialForm)}
        buildVisibleFields={(form) => buildVisibleFields(dialog.resource, form)}
        initialForm={dialogInitialForm}
        initialDayTransportForm={dialogInitialDayTransportForm}
        selectedDialogMarketOrgId={String(dialogInitialForm.marketOrgId ?? dialog.row?.marketOrgId ?? "")}
        hasContractForSelectedDialogMarket={true}
        getHasContractForSelectedDialogMarket={(form) => {
          const marketOrgId = String(form.marketOrgId ?? "");
          if (!marketOrgId) return true;
          return (operatorIdsByMarketId.get(marketOrgId)?.length ?? 0) > 0;
        }}
        selectedPreTourItemType={String(dialogInitialForm.itemType ?? dialog.row?.itemType ?? "").toUpperCase()}
        lookupLabel={lookupLabel}
        transportVehicleOptions={transportVehicleOptions}
        onSubmit={(payload) => void onSave(payload)}
      />
    </Card>
  );
}
