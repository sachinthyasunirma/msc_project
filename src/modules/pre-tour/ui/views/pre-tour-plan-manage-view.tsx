"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPinned, RefreshCw } from "lucide-react";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import {
  createPreTourRecord,
  deletePreTourRecord,
  generatePreTourCosting,
  getPreTourRecord,
  listAllPreTourRecords,
  listPreTourRecords,
  updatePreTourRecord,
} from "@/modules/pre-tour/lib/pre-tour-api";
import {
  addDays,
  defaultValue,
  getCoordinatesFromGeo,
  matchesQuery,
  parseFieldValue,
  validateRequiredFieldValue,
  toLocalDateTime,
  toNightCount,
} from "@/modules/pre-tour/lib/pre-tour-management-utils";
import type { PreTourMastersData } from "@/modules/pre-tour/shared/pre-tour-master-types";
import type { DetailSheetState, PreTourResourceKey, Row } from "@/modules/pre-tour/shared/pre-tour-management-types";
import { usePreTourAccess } from "@/modules/pre-tour/ui/hooks/use-pre-tour-access";
import { usePreTourDayInitialization } from "@/modules/pre-tour/ui/hooks/use-pre-tour-day-initialization";
import { usePreTourMasters } from "@/modules/pre-tour/ui/hooks/use-pre-tour-masters";
import { usePreTourPlanOperations } from "@/modules/pre-tour/ui/hooks/use-pre-tour-plan-operations";
import { convertPreTourToOnTour } from "@/modules/on-tour/lib/on-tour-api";
import {
  getPreTourFields,
  getVisiblePreTourFields,
} from "@/modules/pre-tour/ui/lib/pre-tour-form-config";

const ManagedDayEditor = dynamic(
  () =>
    import("@/modules/pre-tour/ui/components/managed-day-editor").then(
      (module) => module.ManagedDayEditor
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading day editor"
        description="Preparing item sequencing, addon tools, and day-level actions."
      />
    ),
  }
);
const PreTourDayWorkspace = dynamic(
  () =>
    import("@/modules/pre-tour/ui/components/pre-tour-day-workspace").then(
      (module) => module.PreTourDayWorkspace
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading day planner"
        description="Preparing day summaries, routing hints, and quick item actions."
      />
    ),
  }
);
const SectionTable = dynamic(
  () =>
    import("@/modules/pre-tour/ui/components/pre-tour-section-table").then(
      (module) => module.SectionTable
    ),
  {
    loading: () => (
      <LoadingState
        compact
        size="sm"
        title="Loading section table"
        description="Preparing linked planning records."
      />
    ),
  }
);

const PreTourCopyDialogController = dynamic(
  () =>
    import("@/modules/pre-tour/ui/components/pre-tour-copy-dialog-controller").then(
      (module) => module.PreTourCopyDialogController
    ),
  { ssr: false }
);
const PreTourDetailSheet = dynamic(
  () =>
    import("@/modules/pre-tour/ui/components/pre-tour-detail-sheet").then(
      (module) => module.PreTourDetailSheet
    ),
  { ssr: false }
);
const PreTourGuideAllocationDialog = dynamic(
  () =>
    import("@/modules/pre-tour/ui/components/pre-tour-guide-allocation-dialog").then(
      (module) => module.PreTourGuideAllocationDialog
    ),
  { ssr: false }
);
const PreTourItemAllocationDialog = dynamic(
  () =>
    import("@/modules/pre-tour/ui/components/pre-tour-item-allocation-dialog").then(
      (module) => module.PreTourItemAllocationDialog
    ),
  { ssr: false }
);
const PreTourRecordDialog = dynamic(
  () =>
    import("@/modules/pre-tour/ui/components/pre-tour-record-dialog").then(
      (module) => module.PreTourRecordDialog
    ),
  { ssr: false }
);
const PreTourRouteMapDialogController = dynamic(
  () =>
    import("@/modules/pre-tour/ui/components/pre-tour-route-map-dialog-controller").then(
      (module) => module.PreTourRouteMapDialogController
    ),
  { ssr: false }
);
const PreTourShareDialogController = dynamic(
  () =>
    import("@/modules/pre-tour/ui/components/pre-tour-share-dialog-controller").then(
      (module) => module.PreTourShareDialogController
    ),
  { ssr: false }
);
const PreTourAIPlannerDialog = dynamic(
  () =>
    import("@/modules/pre-tour/ui/components/pre-tour-ai-planner-dialog").then(
      (module) => module.PreTourAIPlannerDialog
    ),
  { ssr: false }
);

type PreTourPlanManageViewProps = {
  planId: string;
  initialMasters?: PreTourMastersData | null;
};

function isMissingGuideAllocationTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("pre_tour_plan_guide_allocation") &&
    normalized.includes("does not exist")
  );
}

function extractTransportLocationSequence(items: Row[]) {
  return items
    .flatMap((item) => [item.fromLocationId, item.toLocationId])
    .filter(Boolean)
    .map((value) => String(value))
    .filter((value, index, entries) => index === 0 || value !== entries[index - 1]);
}

const TRANSPORT_CHARGE_METHODS = new Set([
  "PER_TRANSFER",
  "PER_VEHICLE",
  "PER_PAX",
  "PER_HOUR",
  "PER_DAY",
  "PER_KM",
  "SLAB",
]);

function readTransportChargeMethodDefault(row: Row | null | undefined) {
  const pricingPolicy =
    row?.pricingPolicy && typeof row.pricingPolicy === "object" && !Array.isArray(row.pricingPolicy)
      ? (row.pricingPolicy as Record<string, unknown>)
      : null;
  const value = String(pricingPolicy?.transportChargeMethodDefault || "").toUpperCase();
  return TRANSPORT_CHARGE_METHODS.has(value) ? value : "PER_KM";
}

function applyTransportChargeMethodDefaultToPricingPolicy(payload: Record<string, unknown>) {
  const value = String(payload.transportChargeMethodDefault || "").toUpperCase();
  delete payload.transportChargeMethodDefault;
  const currentPricingPolicy =
    payload.pricingPolicy && typeof payload.pricingPolicy === "object" && !Array.isArray(payload.pricingPolicy)
      ? (payload.pricingPolicy as Record<string, unknown>)
      : {};
  payload.pricingPolicy = {
    ...currentPricingPolicy,
    transportChargeMethodDefault: TRANSPORT_CHARGE_METHODS.has(value) ? value : "PER_KM",
  };
}

const INITIAL_PRE_TOUR_PAGE_SIZE = 100;

export function PreTourPlanManageView({
  planId,
  initialMasters = null,
}: PreTourPlanManageViewProps) {
  const router = useRouter();
  const { isReadOnly, isAdmin, canViewRouteMap, canViewCosting } = usePreTourAccess();
  const {
    locations,
    vehicleCategories,
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
    transportRateBasis,
  } = usePreTourMasters({ initialData: initialMasters });

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [loading, setLoading] = useState(true);
  const [supplementalLoading, setSupplementalLoading] = useState(true);
  const [dayDataLoading, setDayDataLoading] = useState(true);
  const [routeDataLoading, setRouteDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingCosting, setGeneratingCosting] = useState(false);
  const [convertingToOnTour, setConvertingToOnTour] = useState(false);
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [plans, setPlans] = useState<Row[]>([]);
  const [days, setDays] = useState<Row[]>([]);
  const [daysHasMore, setDaysHasMore] = useState(false);
  const [items, setItems] = useState<Row[]>([]);
  const [guideAllocations, setGuideAllocations] = useState<Row[]>([]);
  const [addons, setAddons] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Row[]>([]);
  const [planTechnicalVisits, setPlanTechnicalVisits] = useState<Row[]>([]);
  const [routeTransportItems, setRouteTransportItems] = useState<Row[]>([]);
  const [routeTransportLoaded, setRouteTransportLoaded] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [sharingItem, setSharingItem] = useState<Row | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourcePlan, setCopySourcePlan] = useState<Row | null>(null);
  const [aiPlannerOpen, setAiPlannerOpen] = useState(false);
  const [detailSheet, setDetailSheet] = useState<DetailSheetState>({
    open: false,
    title: "",
    description: "",
    kind: "generic",
    row: null,
  });
  const guideAllocationUnavailableNotifiedRef = useRef(false);
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    resource: PreTourResourceKey;
    row: Row | null;
  }>({ open: false, mode: "create", resource: "pre-tour-days", row: null });
  const loadRequestIdRef = useRef(0);
  const dayDataRequestIdRef = useRef(0);
  const routeDataRequestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    setSupplementalLoading(true);
    setDayDataLoading(true);
    try {
      setItems([]);
      setAddons([]);
      setGuideAllocations([]);
      setTotals([]);
      setPlanTechnicalVisits([]);
      setRouteTransportItems([]);
      setRouteTransportLoaded(false);

      const [planRecord, dayRows] = await Promise.all([
        getPreTourRecord("pre-tours", planId),
        listPreTourRecords("pre-tour-days", {
          limit: INITIAL_PRE_TOUR_PAGE_SIZE,
          planId,
        }),
      ]);

      if (loadRequestIdRef.current !== requestId) return;

      setPlans([planRecord]);
      setDays(dayRows);
      setDaysHasMore(dayRows.length === INITIAL_PRE_TOUR_PAGE_SIZE);
      setRecordsVersion((value) => value + 1);
      setLoading(false);

      void (async () => {
        try {
          const [guideAllocationRows, totalRows, technicalVisitRows] = await Promise.all([
            listPreTourRecords("pre-tour-guide-allocations", {
              limit: INITIAL_PRE_TOUR_PAGE_SIZE,
              planId,
            }).catch(
              (error) => {
                if (!isMissingGuideAllocationTableError(error)) throw error;
                if (!guideAllocationUnavailableNotifiedRef.current) {
                  guideAllocationUnavailableNotifiedRef.current = true;
                  notify.warning(
                    "Guide allocations are disabled until the pre_tour_plan_guide_allocation table is created."
                  );
                }
                return [] as Row[];
              }
            ),
            canViewCosting
              ? listPreTourRecords("pre-tour-totals", {
                  limit: INITIAL_PRE_TOUR_PAGE_SIZE,
                  planId,
                })
              : Promise.resolve([] as Row[]),
            listPreTourRecords("pre-tour-technical-visits", {
              limit: INITIAL_PRE_TOUR_PAGE_SIZE,
              planId,
            }),
          ]);

          if (loadRequestIdRef.current !== requestId) return;

          setGuideAllocations(guideAllocationRows);
          setTotals(totalRows);
          setPlanTechnicalVisits(technicalVisitRows);
        } catch (error) {
          if (loadRequestIdRef.current !== requestId) return;
          notify.error(
            error instanceof Error
              ? error.message
              : "Failed to load supplemental pre-tour sections."
          );
        } finally {
          if (loadRequestIdRef.current === requestId) {
            setSupplementalLoading(false);
          }
        }
      })();
    } catch (error) {
      if (loadRequestIdRef.current === requestId) {
        notify.error(error instanceof Error ? error.message : "Failed to load records.");
      }
    } finally {
      if (loadRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [canViewCosting, planId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadMoreDays = useCallback(async () => {
    if (!daysHasMore || loading) return;
    try {
      const nextRows = await listPreTourRecords("pre-tour-days", {
        planId,
        limit: INITIAL_PRE_TOUR_PAGE_SIZE,
        offset: days.length,
      });
      setDays((current) => [...current, ...nextRows]);
      setDaysHasMore(nextRows.length === INITIAL_PRE_TOUR_PAGE_SIZE);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load more days.");
    }
  }, [days.length, daysHasMore, loading, planId]);

  useEffect(() => {
    if (!selectedDayId) {
      setItems([]);
      setAddons([]);
      setSelectedItemId("");
      setDayDataLoading(false);
      return;
    }

    const requestId = ++dayDataRequestIdRef.current;
    setItems([]);
    setAddons([]);
    setSelectedItemId("");
    setDayDataLoading(true);

    void (async () => {
      try {
        const [dayItems, dayAddons] = await Promise.all([
          listAllPreTourRecords("pre-tour-items", {
            planId,
            dayId: selectedDayId,
            limit: INITIAL_PRE_TOUR_PAGE_SIZE,
          }),
          listAllPreTourRecords("pre-tour-item-addons", {
            planId,
            dayId: selectedDayId,
            limit: INITIAL_PRE_TOUR_PAGE_SIZE,
          }),
        ]);

        if (dayDataRequestIdRef.current !== requestId) return;

        setItems(dayItems);
        setAddons(dayAddons);
      } catch (error) {
        if (dayDataRequestIdRef.current !== requestId) return;
        notify.error(error instanceof Error ? error.message : "Failed to load day services.");
      } finally {
        if (dayDataRequestIdRef.current === requestId) {
          setDayDataLoading(false);
        }
      }
    })();
  }, [planId, recordsVersion, selectedDayId]);

  const loadRouteTransportData = useCallback(async () => {
    const requestId = ++routeDataRequestIdRef.current;
    setRouteDataLoading(true);

    try {
      const nextRouteItems = await listAllPreTourRecords("pre-tour-items", {
        planId,
        itemType: "TRANSPORT",
        limit: INITIAL_PRE_TOUR_PAGE_SIZE,
      });

      if (routeDataRequestIdRef.current !== requestId) return;

      setRouteTransportItems(nextRouteItems);
      setRouteTransportLoaded(true);
    } catch (error) {
      if (routeDataRequestIdRef.current !== requestId) return;
      notify.error(error instanceof Error ? error.message : "Failed to load plan route data.");
    } finally {
      if (routeDataRequestIdRef.current === requestId) {
        setRouteTransportLoaded(true);
        setRouteDataLoading(false);
      }
    }
  }, [planId]);

  const selectedPlan = useMemo(
    () => plans.find((row) => String(row.id) === planId) ?? null,
    [planId, plans]
  );
  const aiPlannerInitialRequest = useMemo(
    () =>
      selectedPlan
        ? {
            mode: "REVISE" as const,
            sourcePlanId: String(selectedPlan.id || ""),
            prompt: String(selectedPlan.notes || ""),
            categoryId: String(selectedPlan.categoryId || ""),
            operatorOrgId: String(selectedPlan.operatorOrgId || ""),
            marketOrgId: String(selectedPlan.marketOrgId || ""),
            startDate: String(selectedPlan.startDate || ""),
            endDate: String(selectedPlan.endDate || ""),
            adults: Number(selectedPlan.adults ?? 2),
            children: Number(selectedPlan.children ?? 0),
            infants: Number(selectedPlan.infants ?? 0),
            currencyCode: String(selectedPlan.currencyCode || companyBaseCurrencyCode),
            preferredLanguage: String(selectedPlan.preferredLanguage || ""),
            roomPreference: selectedPlan.roomPreference
              ? (String(selectedPlan.roomPreference) as "DOUBLE" | "TWIN" | "MIXED")
              : null,
            mealPreference: selectedPlan.mealPreference
              ? (String(selectedPlan.mealPreference) as "BB" | "HB" | "FB" | "AI")
              : null,
            priceMode:
              String(selectedPlan.priceMode || "EXCLUSIVE") === "INCLUSIVE"
                ? ("INCLUSIVE" as const)
                : ("EXCLUSIVE" as const),
            exchangeRateMode:
              String(selectedPlan.exchangeRateMode || "AUTO") === "MANUAL"
                ? ("MANUAL" as const)
                : ("AUTO" as const),
            exchangeRate: Number(selectedPlan.exchangeRate ?? 0),
            exchangeRateDate: selectedPlan.exchangeRateDate
              ? String(selectedPlan.exchangeRateDate)
              : null,
          }
        : null,
    [companyBaseCurrencyCode, selectedPlan]
  );

  const { clonePlanChildren, createVersionFromPlan } = usePreTourPlanOperations({
    onSuccess: loadData,
  });

  const { syncingDays, syncDaysFromRange } = usePreTourDayInitialization({
    planId,
    selectedPlan,
    daysCount: days.length,
    loading,
    isReadOnly,
    onDaysChange: setDays,
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

  const selectedDayItems = useMemo(
    () => items.filter((item) => String(item.itemType || "").toUpperCase() !== "TRANSPORT"),
    [items]
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

  const selectedDayTransportItems = useMemo(
    () =>
      items
        .filter((item) => String(item.itemType || "").toUpperCase() === "TRANSPORT")
        .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
    [items]
  );

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
    const baseItems = items;
    if (!deferredQuery.trim()) return baseItems;
    return baseItems.filter((item) => {
      if (matchesQuery("pre-tour-items", item, deferredQuery)) return true;
      return (addonsByItemId.get(String(item.id || "")) ?? []).some((addon) =>
        matchesQuery("pre-tour-item-addons", addon, deferredQuery)
      );
    });
  }, [addonsByItemId, deferredQuery, items]);

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
  const filteredItemOptions = useMemo(() => itemOptions, [itemOptions]);
  const locationOptions = useMemo(
    () => locations.map((row) => ({ value: String(row.id), label: `${row.code} - ${row.name}` })),
    [locations]
  );
  const vehicleCategoryOptions = useMemo(
    () =>
      vehicleCategories.map((row) => ({
        value: String(row.id),
        label: `${row.code} - ${row.name}`,
      })),
    [vehicleCategories]
  );
  const vehicleTypeOptions = useMemo(
    () =>
      vehicleTypes.map((row) => ({
        value: String(row.id),
        label: `${row.code} - ${row.name}`,
      })),
    [vehicleTypes]
  );
  const serviceOptions = useMemo(
    () => [
      ...vehicleTypes.map((row) => ({ value: String(row.id), label: `TRANSPORT • ${row.code} - ${row.name}` })),
      ...activities.map((row) => ({ value: String(row.id), label: `ACT • ${row.code} - ${row.name}` })),
      ...guides.map((row) => ({ value: String(row.id), label: `GUIDE • ${row.code} - ${row.fullName}` })),
    ],
    [activities, guides, vehicleTypes]
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
      const existing =
        field.key === "transportChargeMethodDefault"
          ? readTransportChargeMethodDefault(dialog.row)
          : dialog.row?.[field.key];
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

  const routeLocationSequenceIds = useMemo(() => {
    const orderedLocationIds: string[] = [];
    const transportByDayId = new Map<string, Row[]>();
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

    routeTransportItems.forEach((item) => {
      const dayId = String(item.dayId || "");
      if (!dayId) return;
      transportByDayId.set(dayId, [...(transportByDayId.get(dayId) ?? []), item]);
    });

    sortedDays.forEach((day) => {
      const dayTransportItems = (transportByDayId.get(String(day.id || "")) ?? []).sort(
        (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)
      );
      appendDayPath(extractTransportLocationSequence(dayTransportItems));
    });

    return orderedLocationIds;
  }, [routeTransportItems, sortedDays]);

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

  useEffect(() => {
    if (
      (!mapDialogOpen && !(detailSheet.open && detailSheet.kind === "pre-tour")) ||
      routeTransportLoaded ||
      routeDataLoading
    ) {
      return;
    }
    void loadRouteTransportData();
  }, [
    detailSheet.kind,
    detailSheet.open,
    loadRouteTransportData,
    mapDialogOpen,
    routeDataLoading,
    routeTransportLoaded,
  ]);

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
      return extractTransportLocationSequence(selectedDayTransportItems);
    }
    return [];
  }, [
    detailDay,
    detailSheet.kind,
    detailSheet.open,
    routeLocationSequenceIds,
    selectedDayTransportItems,
  ]);
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
  const selectedDayRouteSummary = useMemo(() => {
    const ids = extractTransportLocationSequence(selectedDayTransportItems);
    return ids.map((locationId) => locationNameById.get(locationId) || locationId).join(" -> ");
  }, [locationNameById, selectedDayTransportItems]);

  const onSave = async (form: Row) => {
    setSaving(true);
    try {
      const visibleFields = buildVisibleFields(dialog.resource, form);
      const payload: Record<string, unknown> = {};
      visibleFields.forEach((field) => {
        validateRequiredFieldValue(field, form[field.key]);
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
        applyTransportChargeMethodDefaultToPricingPolicy(payload);
      }

      if (dialog.mode === "create") {
        await createPreTourRecord(dialog.resource, payload);
        notify.success("Record created.");
      } else {
        await updatePreTourRecord(dialog.resource, String(dialog.row?.id || ""), payload);
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

  const onSaveAllocationItem = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      if (dialog.mode === "create") {
        await createPreTourRecord("pre-tour-items", payload);
        notify.success("Item allocated.");
      } else {
        await updatePreTourRecord("pre-tour-items", String(dialog.row?.id || ""), payload);
        notify.success("Item allocation updated.");
      }

      setDialog({ open: false, mode: "create", resource: "pre-tour-days", row: null });
      await loadData();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save item allocation.");
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const onSaveGuideAllocation = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      if (dialog.mode === "create") {
        await createPreTourRecord("pre-tour-guide-allocations", payload);
        notify.success("Guide allocation created.");
      } else {
        await updatePreTourRecord("pre-tour-guide-allocations", String(dialog.row?.id || ""), payload);
        notify.success("Guide allocation updated.");
      }

      setDialog({ open: false, mode: "create", resource: "pre-tour-days", row: null });
      await loadData();
    } catch (error) {
      if (isMissingGuideAllocationTableError(error)) {
        notify.error(
          "Guide allocations cannot be saved yet. Run scripts/add-pre-tour-guide-allocation.sql on the database first."
        );
      } else {
        notify.error(error instanceof Error ? error.message : "Failed to save guide allocation.");
      }
      throw error;
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

  const onGenerateCosting = useCallback(async () => {
    if (!selectedPlan) return;
    setGeneratingCosting(true);
    try {
      const total = await generatePreTourCosting(String(selectedPlan.id));
      await loadData();
      setDetailSheet({
        open: true,
        title: "Costing Sheet Details",
        description: "Generated pre-tour costing snapshot and totals.",
        row: total,
        kind: "generic",
      });
      notify.success("Pre-tour costing generated.");
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to generate costing.");
    } finally {
      setGeneratingCosting(false);
    }
  }, [loadData, selectedPlan]);

  const openItemEditor = useCallback(
    (dayId: string, item: Row) => {
      if (String(item.itemType || "").toUpperCase() === "GUIDE") {
        notify.warning(
          "Guide allocation is not handled day-wise. It should be managed as a tour-level service."
        );
        return;
      }
      setSelectedDayId(String(dayId));
      setSelectedItemId(String(item.id || ""));
      setDialog({ open: true, mode: "edit", resource: "pre-tour-items", row: item });
    },
    []
  );

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

  const filteredAddonRows = useMemo(() => {
    const rows = selectedItemId ? addons.filter((row) => String(row.planItemId) === selectedItemId) : addons;
    return rows.filter((row) => matchesQuery("pre-tour-item-addons", row, deferredQuery));
  }, [addons, deferredQuery, selectedItemId]);
  const filteredGuideAllocationRows = useMemo(
    () =>
      guideAllocations.filter((row) =>
        matchesQuery("pre-tour-guide-allocations", row, deferredQuery)
      ),
    [deferredQuery, guideAllocations]
  );
  const filteredTotalRows = useMemo(
    () => totals.filter((row) => matchesQuery("pre-tour-totals", row, deferredQuery)),
    [deferredQuery, totals]
  );
  const filteredTechnicalVisitRows = useMemo(
    () =>
      planTechnicalVisits.filter((row) =>
        matchesQuery("pre-tour-technical-visits", row, deferredQuery)
      ),
    [deferredQuery, planTechnicalVisits]
  );

  const handleConvertToOnTour = useCallback(async () => {
    if (!selectedPlan?.id) return;
    setConvertingToOnTour(true);
    try {
      const converted = await convertPreTourToOnTour(String(selectedPlan.id));
      notify.success(
        converted.created ? "Converted to on-tour successfully." : "Opened existing on-tour file."
      );
      router.push(`/tours/on-tours/${converted.onTourId}`);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to convert to on-tour.");
    } finally {
      setConvertingToOnTour(false);
    }
  }, [router, selectedPlan?.id]);

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
            {isAdmin ? (
              <Button variant="outline" asChild>
                <Link href="/master-data/pre-tours/ai-evaluations">AI Dashboard</Link>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setAiPlannerOpen(true)} disabled={isReadOnly}>
              AI Revision
            </Button>
            <Button variant="outline" onClick={() => void syncDaysFromRange()} disabled={isReadOnly || syncingDays}>
              {syncingDays ? "Syncing..." : "Sync Days From Range"}
            </Button>
            {canViewCosting ? (
              <Button
                variant="outline"
                onClick={() => void onGenerateCosting()}
                disabled={isReadOnly || generatingCosting || !selectedPlan}
              >
                {generatingCosting ? "Generating Costing..." : "Generate Costing"}
              </Button>
            ) : null}
            <Button
              onClick={() => void handleConvertToOnTour()}
              disabled={isReadOnly || convertingToOnTour || !selectedPlan}
            >
              {convertingToOnTour ? "Converting..." : "Convert to On-Tour"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setMapDialogOpen(true)}
              disabled={loading || sortedDays.length === 0}
            >
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
          items={items}
          selectedDayId={selectedDayId}
          onSelectDay={setSelectedDayId}
          routeSummary={selectedDayRouteSummary}
          hasMoreDays={daysHasMore}
          onLoadMoreDays={() => void loadMoreDays()}
          onAddItem={() => setDialog({ open: true, mode: "create", resource: "pre-tour-items", row: null })}
          disableAdd={isReadOnly}
        />
      </CardHeader>

      <CardContent className="space-y-2 px-4 pb-3 pt-0">
        <ManagedDayEditor
          selectedDay={selectedManagedDay}
          selectedDayItems={selectedManagedDayItems}
          loading={dayDataLoading}
          query={deferredQuery}
          isReadOnly={isReadOnly}
          addonsByItemId={addonsByItemId}
          routeSummary={selectedDayRouteSummary}
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
          onEditItem={(day, item) => openItemEditor(String(day.id), item)}
          onDeleteItem={(item) => void onDelete("pre-tour-items", item)}
          onMoveItemWithinDay={(dayId, dragItemId, targetItemId) => void moveItemWithinDay(dayId, dragItemId, targetItemId)}
        />

        <SectionTable
          resource="pre-tour-technical-visits"
          rows={filteredTechnicalVisitRows}
          loading={loading || supplementalLoading}
          isReadOnly={isReadOnly}
          lookups={lookups}
          onAdd={() => setDialog({ open: true, mode: "create", resource: "pre-tour-technical-visits", row: null })}
          onView={(row) => setDetailSheet({ open: true, title: "Field Visit Link Details", description: "Selected field visit link details.", row, kind: "generic" })}
          onEdit={(row) => setDialog({ open: true, mode: "edit", resource: "pre-tour-technical-visits", row })}
          onDelete={(row) => void onDelete("pre-tour-technical-visits", row)}
        />
        <SectionTable
          resource="pre-tour-guide-allocations"
          rows={filteredGuideAllocationRows}
          loading={loading || supplementalLoading}
          isReadOnly={isReadOnly}
          lookups={lookups}
          onAdd={() => setDialog({ open: true, mode: "create", resource: "pre-tour-guide-allocations", row: null })}
          onView={(row) =>
            setDetailSheet({
              open: true,
              title: "Guide Allocation Details",
              description: "Selected tour-level guide allocation details.",
              row,
              kind: "generic",
            })
          }
          onEdit={(row) => setDialog({ open: true, mode: "edit", resource: "pre-tour-guide-allocations", row })}
          onDelete={(row) => void onDelete("pre-tour-guide-allocations", row)}
        />
        <SectionTable
          resource="pre-tour-item-addons"
          rows={filteredAddonRows}
          loading={loading || dayDataLoading}
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
            loading={loading || supplementalLoading}
            isReadOnly={isReadOnly}
            lookups={lookups}
            addLabel={generatingCosting ? "Generating..." : "Generate Costing"}
            addDisabled={generatingCosting || !selectedPlan}
            onAdd={() => void onGenerateCosting()}
            onView={(row) =>
              setDetailSheet({
                open: true,
                title: "Costing Sheet Details",
                description: "Selected totals details and generated costing snapshot.",
                row,
                kind: "generic",
              })
            }
            hideEdit
            hideDelete
            onEdit={(row) => setDialog({ open: true, mode: "edit", resource: "pre-tour-totals", row })}
            onDelete={(row) => void onDelete("pre-tour-totals", row)}
          />
        ) : null}
      </CardContent>

      {mapDialogOpen ? (
        <PreTourRouteMapDialogController
          open={mapDialogOpen}
          onOpenChange={setMapDialogOpen}
          selectedPlan={selectedPlan}
          routePathLabel={routePathLabel}
          routeMapLocations={routeMapLocations}
          routeDataLoading={routeDataLoading}
          routeTransportLoaded={routeTransportLoaded}
        />
      ) : null}

      {sharingItem ? (
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
      ) : null}

      {detailSheet.open ? (
        <PreTourDetailSheet
          detailSheet={detailSheet}
          setDetailSheetOpen={(open) => setDetailSheet((prev) => ({ ...prev, open }))}
          onClose={() => setDetailSheet((prev) => ({ ...prev, open: false }))}
          isReadOnly={isReadOnly}
          canViewRouteMap={canViewRouteMap}
          lookups={lookups}
          selectedPlan={selectedPlan}
          detailPreTourRouteLoading={routeDataLoading}
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
            setDetailSheet((prev) => ({ ...prev, open: false }));
            openItemEditor(String(dayId || row.dayId || ""), row);
          }}
          onDeleteItem={(row) => {
            setDetailSheet((prev) => ({ ...prev, open: false }));
            void onDelete("pre-tour-items", row);
          }}
        />
      ) : null}

      {copyDialogOpen ? (
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
      ) : null}

      {aiPlannerOpen ? (
        <PreTourAIPlannerDialog
          open={aiPlannerOpen}
          onOpenChange={setAiPlannerOpen}
          initialRequest={aiPlannerInitialRequest}
          currencies={currencies}
          organizations={organizations}
          operatorMarketContracts={operatorMarketContracts}
          tourCategories={tourCategories}
          companyBaseCurrencyCode={companyBaseCurrencyCode}
          sourcePlan={
            selectedPlan
              ? {
                  id: String(selectedPlan.id),
                  planCode: String(selectedPlan.planCode || selectedPlan.code || ""),
                  title: String(selectedPlan.title || ""),
                }
              : null
          }
          onApplied={(applied) => {
            router.push(`/master-data/pre-tours/${applied.planId}`);
          }}
        />
      ) : null}

      {dialog.open && dialog.resource === "pre-tour-items" ? (
        <PreTourItemAllocationDialog
          open={dialog.open}
          onOpenChange={(open) => setDialog((prev) => ({ ...prev, open, row: open ? prev.row : null }))}
          mode={dialog.mode}
          row={dialog.row}
          isReadOnly={isReadOnly}
          saving={saving}
          selectedPlan={selectedPlan}
          selectedDay={selectedManagedDay}
          companyBaseCurrencyCode={companyBaseCurrencyCode}
          hotelOptions={activeHotelOptions.map(({ value, label }) => ({ value, label }))}
          activityOptions={activities.map((row) => ({ value: String(row.id), label: `${row.code} - ${row.name}` }))}
          locationOptions={locationOptions}
          vehicleCategoryOptions={vehicleCategoryOptions}
          vehicleTypeOptions={vehicleTypeOptions}
          transportRateBasis={transportRateBasis}
          canOverrideContractRates={!isReadOnly && (isAdmin || canViewCosting)}
          onSubmit={(payload) => onSaveAllocationItem(payload)}
        />
      ) : dialog.open && dialog.resource === "pre-tour-guide-allocations" ? (
        <PreTourGuideAllocationDialog
          open={dialog.open}
          onOpenChange={(open) => setDialog((prev) => ({ ...prev, open, row: open ? prev.row : null }))}
          mode={dialog.mode}
          row={dialog.row}
          isReadOnly={isReadOnly}
          saving={saving}
          selectedPlan={selectedPlan}
          companyBaseCurrencyCode={companyBaseCurrencyCode}
          guideOptions={guides.map((row) => ({ value: String(row.id), label: `${row.code} - ${row.fullName}` }))}
          dayOptions={dayOptions}
          onSubmit={(payload) => onSaveGuideAllocation(payload)}
        />
      ) : dialog.open ? (
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
          selectedDialogMarketOrgId={String(dialogInitialForm.marketOrgId ?? dialog.row?.marketOrgId ?? "")}
          hasContractForSelectedDialogMarket={true}
          getHasContractForSelectedDialogMarket={(form) => {
            const marketOrgId = String(form.marketOrgId ?? "");
            if (!marketOrgId) return true;
            return (operatorIdsByMarketId.get(marketOrgId)?.length ?? 0) > 0;
          }}
          selectedPreTourItemType={String(dialogInitialForm.itemType ?? dialog.row?.itemType ?? "").toUpperCase()}
          onSubmit={(form) => void onSave(form)}
        />
      ) : null}
    </Card>
  );
}
