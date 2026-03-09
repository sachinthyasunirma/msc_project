"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
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
  defaultValue,
  getCoordinatesFromGeo,
  matchesQuery,
  parseFieldValue,
  toLocalDateTime,
  toNightCount,
} from "@/modules/pre-tour/lib/pre-tour-management-utils";
import type { DetailSheetState, PreTourResourceKey, Row } from "@/modules/pre-tour/shared/pre-tour-management-types";
import { PreTourCopyDialogController } from "@/modules/pre-tour/ui/components/pre-tour-copy-dialog-controller";
import { PreTourDetailSheet } from "@/modules/pre-tour/ui/components/pre-tour-detail-sheet";
import { PreTourRecordDialog } from "@/modules/pre-tour/ui/components/pre-tour-record-dialog";
import { SectionTable } from "@/modules/pre-tour/ui/components/pre-tour-section-table";
import { usePreTourAccess } from "@/modules/pre-tour/ui/hooks/use-pre-tour-access";
import { usePreTourMasters } from "@/modules/pre-tour/ui/hooks/use-pre-tour-masters";
import { usePreTourPlanOperations } from "@/modules/pre-tour/ui/hooks/use-pre-tour-plan-operations";
import { EMPTY_DAY_TRANSPORT_FORM, getPreTourFields } from "@/modules/pre-tour/ui/lib/pre-tour-form-config";

type PreTourPlansViewProps = {
  initialResource?: PreTourResourceKey;
  showBinOnly?: boolean;
};

export function PreTourPlansView({
  initialResource = "pre-tours",
  showBinOnly = false,
}: PreTourPlansViewProps) {
  const { isReadOnly, isAdmin, canViewRouteMap, canViewCosting } = usePreTourAccess();
  const {
    locations,
    currencies,
    organizations,
    operatorMarketContracts,
    tourCategories,
    companyBaseCurrencyCode,
  } = usePreTourMasters();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<Row[]>([]);
  const [planBins, setPlanBins] = useState<Row[]>([]);
  const [detailSheet, setDetailSheet] = useState<DetailSheetState>({
    open: false,
    title: "",
    description: "",
    kind: "generic",
    row: null,
  });
  const [detailPreTourRouteIds, setDetailPreTourRouteIds] = useState<string[]>([]);
  const [detailPreTourRouteLoading, setDetailPreTourRouteLoading] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourcePlan, setCopySourcePlan] = useState<Row | null>(null);
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    resource: PreTourResourceKey;
    row: Row | null;
  }>({ open: false, mode: "create", resource: initialResource, row: null });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (showBinOnly) {
        const binRows = await listPreTourRecords("pre-tour-bins", { limit: 200, q: query || undefined });
        setPlanBins(binRows);
        setPlans([]);
        return;
      }

      const planRows = await listPreTourRecords("pre-tours", { limit: 400, q: query || undefined });
      setPlans(planRows);
      setPlanBins([]);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [query, showBinOnly]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const { clonePlanChildren, createVersionFromPlan } = usePreTourPlanOperations({
    canViewCosting,
    companyBaseCurrencyCode,
    plans,
    onSuccess: loadData,
  });

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

  const selectedDialogMarketOrgId = useMemo(() => {
    if (dialog.resource !== "pre-tours") return "";
    return String(dialog.row?.marketOrgId ?? "");
  }, [dialog.resource, dialog.row?.marketOrgId]);

  const preTourOperatorOptions = useMemo(() => {
    if (!selectedDialogMarketOrgId) return operatorOrganizationOptions;
    const allowedOperatorIds = operatorIdsByMarketId.get(selectedDialogMarketOrgId) ?? [];
    if (allowedOperatorIds.length === 0) return operatorOrganizationOptions;
    return operatorOrganizationOptions.filter((option) => allowedOperatorIds.includes(option.value));
  }, [operatorIdsByMarketId, operatorOrganizationOptions, selectedDialogMarketOrgId]);

  const hasContractForSelectedDialogMarket = useMemo(() => {
    if (!selectedDialogMarketOrgId) return true;
    return (operatorIdsByMarketId.get(selectedDialogMarketOrgId)?.length ?? 0) > 0;
  }, [operatorIdsByMarketId, selectedDialogMarketOrgId]);

  const allTourCategoryOptions = useMemo(
    () =>
      tourCategories.map((row) => ({
        value: String(row.id),
        label: `${String(row.code)} - ${String(row.name)}`,
      })),
    [tourCategories]
  );

  const lookups = useMemo(() => {
    const pairs: Array<[string, string]> = [];
    currencyOptions.forEach((o) => pairs.push([o.value, o.label]));
    operatorOrganizationOptions.forEach((o) => pairs.push([o.value, o.label]));
    marketOrganizationOptions.forEach((o) => pairs.push([o.value, o.label]));
    allTourCategoryOptions.forEach((o) => pairs.push([o.value, o.label]));
    return Object.fromEntries(pairs);
  }, [allTourCategoryOptions, currencyOptions, marketOrganizationOptions, operatorOrganizationOptions]);

  const fields = useMemo(
    () =>
      getPreTourFields("pre-tours", {
        planOptions: [],
        dayOptions: [],
        filteredItemOptions: [],
        locationOptions: [],
        serviceOptions: [],
        accommodationServiceOptions: [],
        currencyOptions,
        preTourOperatorOptions,
        marketOrganizationOptions,
        tourCategoryTypeOptions: [],
        tourCategoryOptions: [],
        allTourCategoryOptions,
        technicalVisitOptions: [],
        companyBaseCurrencyCode,
        selectedPreTourItemType: "",
      }),
    [
      allTourCategoryOptions,
      companyBaseCurrencyCode,
      currencyOptions,
      marketOrganizationOptions,
      preTourOperatorOptions,
    ]
  );

  const dialogInitialForm = useMemo(() => {
    const nextForm: Row = {};
    fields.forEach((field) => {
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
    return nextForm;
  }, [dialog.row, fields]);

  const filteredPlanRows = useMemo(
    () => plans.filter((row) => matchesQuery("pre-tours", row, query)),
    [plans, query]
  );
  const filteredBinRows = useMemo(
    () => planBins.filter((row) => matchesQuery("pre-tour-bins", row, query)),
    [planBins, query]
  );

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

  const detailRouteMapLocations = useMemo(
    () =>
      detailPreTourRouteIds
        .map((id, index) => {
          const location = locationCoordinatesById.get(id);
          if (!location) return null;
          return { id: `${id}-${index}`, name: location.name, coordinates: location.coordinates };
        })
        .filter((row): row is { id: string; name: string; coordinates: [number, number] } => Boolean(row)),
    [detailPreTourRouteIds, locationCoordinatesById]
  );

  const detailRoutePathLabel = useMemo(
    () => detailPreTourRouteIds.map((locationId) => locationNameById.get(locationId) || locationId).join(" -> "),
    [detailPreTourRouteIds, locationNameById]
  );

  useEffect(() => {
    const loadDetailPreTourRoute = async () => {
      if (!detailSheet.open || detailSheet.kind !== "pre-tour" || !detailSheet.row?.id) {
        setDetailPreTourRouteIds([]);
        setDetailPreTourRouteLoading(false);
        return;
      }

      setDetailPreTourRouteLoading(true);
      try {
        const dayRows = await listPreTourRecords("pre-tour-days", {
          planId: String(detailSheet.row.id),
          limit: 500,
        });
        const sorted = [...dayRows].sort((a, b) => Number(a.dayNumber ?? 0) - Number(b.dayNumber ?? 0));
        const ids: string[] = [];
        const appendDayPath = (path: unknown[]) => {
          const normalized = path
            .filter(Boolean)
            .map((value) => String(value))
            .filter((value, index, items) => index === 0 || value !== items[index - 1]);
          if (normalized.length === 0) return;
          if (ids.length > 0 && ids[ids.length - 1] === normalized[0]) normalized.shift();
          ids.push(...normalized);
        };
        sorted.forEach((day) => appendDayPath([day.startLocationId, day.endLocationId]));
        setDetailPreTourRouteIds(ids);
      } catch {
        setDetailPreTourRouteIds([]);
      } finally {
        setDetailPreTourRouteLoading(false);
      }
    };

    void loadDetailPreTourRoute();
  }, [detailSheet.kind, detailSheet.open, detailSheet.row?.id]);

  const openDetailSheet = useCallback((title: string, description: string, row: Row) => {
    setDetailSheet({ open: true, title, description, row, kind: "pre-tour" });
  }, []);

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

  const onSave = async ({ form }: { form: Row }) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      fields.forEach((field) => {
        payload[field.key] = parseFieldValue(field, form[field.key]);
      });
      payload.totalNights = toNightCount(String(form.startDate ?? ""), String(form.endDate ?? ""));

      if (dialog.mode === "create") {
        await createPreTourRecord("pre-tours", payload);
        notify.success("Record created.");
      } else {
        await updatePreTourRecord("pre-tours", String(dialog.row?.id || ""), payload);
        notify.success("Record updated.");
      }

      setDialog({ open: false, mode: "create", resource: "pre-tours", row: null });
      await loadData();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>{showBinOnly ? "Pre-Tour Bin" : "Pre-Tour Plans"}</CardTitle>
            <CardDescription>
              {showBinOnly
                ? "Deleted pre-tour records bin. Admin can restore or permanently purge."
                : "Initialize pre-tour headers and manage each plan."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="outline" className="master-refresh-btn" onClick={() => void loadData()}>
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
            {!showBinOnly ? (
              <Button
                className="master-add-btn"
                onClick={() => setDialog({ open: true, mode: "create", resource: "pre-tours", row: null })}
                disabled={isReadOnly}
              >
                <Plus className="mr-1 size-4" />
                Add Pre-Tour
              </Button>
            ) : null}
          </div>
        </div>

        <Input
          placeholder={showBinOnly ? "Search bin records..." : "Search plans..."}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </CardHeader>

      <CardContent className="space-y-2 px-4 pb-3 pt-0">
        {showBinOnly ? (
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
            onView={(row) => setDetailSheet({ open: true, title: "Pre-Tour Bin Details", description: "Soft-deleted pre-tour.", row, kind: "generic" })}
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
            onCopyPlan={(row) => {
              setCopySourcePlan(row);
              setCopyDialogOpen(true);
            }}
            onView={(row) => openDetailSheet("Pre-Tour Details", "Selected pre-tour record details.", row)}
            onEdit={(row) => setDialog({ open: true, mode: "edit", resource: "pre-tours", row })}
            onDelete={(row) => void onDelete("pre-tours", row)}
          />
        )}
      </CardContent>

      <PreTourDetailSheet
        detailSheet={detailSheet}
        setDetailSheetOpen={(open) => setDetailSheet((prev) => ({ ...prev, open }))}
        onClose={() => setDetailSheet((prev) => ({ ...prev, open: false }))}
        isReadOnly={isReadOnly}
        canViewRouteMap={canViewRouteMap}
        lookups={lookups}
        selectedPlan={null}
        detailPreTourRouteLoading={detailPreTourRouteLoading}
        detailRouteLocationSequenceIds={detailPreTourRouteIds}
        detailRoutePathLabel={detailRoutePathLabel}
        detailRouteMapLocations={detailRouteMapLocations}
        onCreateVersion={(row) => void createVersionFromPlan(row)}
        onCopy={(row) => {
          setCopySourcePlan(row);
          setCopyDialogOpen(true);
        }}
        onEditPreTour={(row) => setDialog({ open: true, mode: "edit", resource: "pre-tours", row })}
        onDeletePreTour={(row) => void onDelete("pre-tours", row)}
        onAddAddonFromItem={() => undefined}
        onShareItem={() => undefined}
        onEditItem={() => undefined}
        onDeleteItem={() => undefined}
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
        visibleFields={fields}
        buildVisibleFields={() => fields}
        initialForm={dialogInitialForm}
        initialDayTransportForm={EMPTY_DAY_TRANSPORT_FORM}
        selectedDialogMarketOrgId={selectedDialogMarketOrgId}
        hasContractForSelectedDialogMarket={hasContractForSelectedDialogMarket}
        getHasContractForSelectedDialogMarket={(form) => {
          const marketOrgId = String(form.marketOrgId ?? "");
          if (!marketOrgId) return true;
          return (operatorIdsByMarketId.get(marketOrgId)?.length ?? 0) > 0;
        }}
        selectedPreTourItemType=""
        lookupLabel={(id) => (typeof id === "string" ? lookups[id] ?? id : "-")}
        transportVehicleOptions={[]}
        onSubmit={(payload) => void onSave(payload)}
      />
    </Card>
  );
}
