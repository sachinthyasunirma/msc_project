"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
import {
  createTransportRecord,
  deleteTransportRecord,
  listTransportRecords,
  updateTransportRecord,
} from "@/modules/transport/lib/transport-api";
import {
  defaultTransportFieldValue,
  toIsoDateTime,
  toLocalDateTime,
} from "@/modules/transport/lib/transport-management-utils";
import type {
  CompanySettingsResponse,
  TransportFormField,
  TransportResourceKey,
} from "@/modules/transport/shared/transport-management-types";

type UseTransportManagementOptions = {
  initialResource?: TransportResourceKey;
  isReadOnly: boolean;
};

export function useTransportManagement({
  initialResource = "locations",
  isReadOnly,
}: UseTransportManagementOptions) {
  const confirm = useConfirm();
  const [resource, setResource] = useState<TransportResourceKey>(initialResource);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalogs, setCatalogs] = useState({
    locations: [] as Array<Record<string, unknown>>,
    vehicleCategories: [] as Array<Record<string, unknown>>,
    vehicleTypes: [] as Array<Record<string, unknown>>,
  });
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    row: Record<string, unknown> | null;
  }>({ open: false, mode: "create", row: null });
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [batchOpen, setBatchOpen] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [transportRateBasis, setTransportRateBasis] = useState<"VEHICLE_CATEGORY" | "VEHICLE_TYPE">(
    "VEHICLE_TYPE"
  );

  const lookupMap = useMemo(() => {
    const pairs: Array<[string, string]> = [];
    catalogs.locations.forEach((item) => pairs.push([String(item.id), `${item.code} - ${item.name}`]));
    catalogs.vehicleCategories.forEach((item) => pairs.push([String(item.id), `${item.code} - ${item.name}`]));
    catalogs.vehicleTypes.forEach((item) => pairs.push([String(item.id), `${item.code} - ${item.name}`]));
    return Object.fromEntries(pairs);
  }, [catalogs]);

  const existingCodes = useMemo(
    () =>
      new Set(
        records.map((row) => String(row.code ?? "").trim().toUpperCase()).filter((value) => value.length > 0)
      ),
    [records]
  );

  const locationByCode = useMemo(
    () =>
      new Map(
        catalogs.locations.map((row) => [String(row.code ?? "").trim().toUpperCase(), String(row.id ?? "")])
      ),
    [catalogs.locations]
  );
  const vehicleCategoryByCode = useMemo(
    () =>
      new Map(
        catalogs.vehicleCategories.map((row) => [String(row.code ?? "").trim().toUpperCase(), String(row.id ?? "")])
      ),
    [catalogs.vehicleCategories]
  );
  const vehicleTypeByCode = useMemo(
    () =>
      new Map(
        catalogs.vehicleTypes.map((row) => [String(row.code ?? "").trim().toUpperCase(), String(row.id ?? "")])
      ),
    [catalogs.vehicleTypes]
  );
  const vehicleTypeCategoryCodeByCode = useMemo(() => {
    const categoryCodeById = new Map(
      catalogs.vehicleCategories.map((row) => [String(row.id ?? ""), String(row.code ?? "").trim().toUpperCase()])
    );
    return new Map(
      catalogs.vehicleTypes.map((row) => [
        String(row.code ?? "").trim().toUpperCase(),
        categoryCodeById.get(String(row.categoryId ?? "")) ?? "",
      ])
    );
  }, [catalogs.vehicleCategories, catalogs.vehicleTypes]);

  const fields = useMemo<TransportFormField[]>(() => {
    const locationOptions = catalogs.locations.map((item) => ({ value: String(item.id), label: `${item.code} - ${item.name}` }));
    const vehicleCategoryOptions = catalogs.vehicleCategories.map((item) => ({ value: String(item.id), label: `${item.code} - ${item.name}` }));
    const vehicleTypeOptions = catalogs.vehicleTypes.map((item) => ({ value: String(item.id), label: `${item.code} - ${item.name}` }));

    const vehicleBasisField =
      transportRateBasis === "VEHICLE_CATEGORY"
        ? ({ key: "vehicleCategoryId", label: "Vehicle Category", type: "select", options: vehicleCategoryOptions, required: true } as TransportFormField)
        : ({ key: "vehicleTypeId", label: "Vehicle Type", type: "select", options: vehicleTypeOptions, required: true } as TransportFormField);

    if (resource === "locations") {
      return [
        { key: "code", label: "Code", type: "text", required: true },
        { key: "name", label: "Name", type: "text", required: true },
        { key: "country", label: "Country", type: "text" },
        { key: "region", label: "Region", type: "text" },
        { key: "address", label: "Address", type: "text" },
        { key: "geo", label: "Geo JSON", type: "json", placeholder: '{"type":"Point","coordinates":[79.8,6.9]}' },
        { key: "tags", label: "Tags JSON", type: "json", placeholder: '["CITY","AIRPORT"]' },
        { key: "notes", label: "Notes", type: "text" },
        { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
      ];
    }
    if (resource === "vehicle-categories") {
      return [
        { key: "code", label: "Code", type: "text", required: true },
        { key: "name", label: "Name", type: "text", required: true },
        { key: "description", label: "Description", type: "text" },
        { key: "sortOrder", label: "Sort Order", type: "number", defaultValue: 0 },
        { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
      ];
    }
    if (resource === "vehicle-types") {
      return [
        { key: "code", label: "Code", type: "text", required: true },
        { key: "name", label: "Name", type: "text", required: true },
        { key: "categoryId", label: "Category", type: "select", required: true, options: vehicleCategoryOptions },
        { key: "paxCapacity", label: "Pax Capacity", type: "number", required: true },
        { key: "baggageCapacity", label: "Baggage Capacity", type: "number", defaultValue: 0 },
        { key: "features", label: "Features JSON", type: "json", placeholder: '["AC","WIFI"]' },
        { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
      ];
    }
    if (resource === "location-rates") {
      return [
        { key: "code", label: "Code", type: "text", required: true },
        { key: "fromLocationId", label: "From Location", type: "select", required: true, options: locationOptions },
        { key: "toLocationId", label: "To Location", type: "select", required: true, options: locationOptions },
        vehicleBasisField,
        { key: "distanceKm", label: "Distance (km)", type: "number" },
        { key: "durationMin", label: "Duration (min)", type: "number" },
        { key: "currency", label: "Currency", type: "text", defaultValue: "LKR" },
        { key: "pricingModel", label: "Pricing Model", type: "select", options: [{ label: "FIXED", value: "FIXED" }, { label: "PER_KM", value: "PER_KM" }, { label: "SLAB", value: "SLAB" }], defaultValue: "FIXED" },
        { key: "fixedRate", label: "Fixed Rate", type: "number" },
        { key: "perKmRate", label: "Per KM Rate", type: "number" },
        { key: "slabs", label: "Slabs JSON", type: "json" },
        { key: "minCharge", label: "Min Charge", type: "number", defaultValue: 0 },
        { key: "nightSurcharge", label: "Night Surcharge", type: "number", defaultValue: 0 },
        { key: "effectiveFrom", label: "Effective From", type: "datetime" },
        { key: "effectiveTo", label: "Effective To", type: "datetime" },
        { key: "notes", label: "Notes", type: "text" },
        { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
      ];
    }
    if (resource === "location-expenses") {
      return [
        { key: "code", label: "Code", type: "text", required: true },
        { key: "locationId", label: "Location", type: "select", required: true, options: locationOptions },
        { key: "name", label: "Name", type: "text", required: true },
        { key: "expenseType", label: "Expense Type", type: "select", options: [{ label: "FIXED", value: "FIXED" }, { label: "PER_DAY", value: "PER_DAY" }, { label: "PER_HOUR", value: "PER_HOUR" }, { label: "PER_PAX", value: "PER_PAX" }, { label: "PER_VEHICLE", value: "PER_VEHICLE" }], defaultValue: "FIXED" },
        { key: "amount", label: "Amount", type: "number", required: true },
        { key: "currency", label: "Currency", type: "text", defaultValue: "LKR" },
        vehicleBasisField,
        { key: "effectiveFrom", label: "Effective From", type: "datetime" },
        { key: "effectiveTo", label: "Effective To", type: "datetime" },
        { key: "notes", label: "Notes", type: "text" },
        { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
      ];
    }
    if (resource === "pax-vehicle-rates") {
      return [
        { key: "code", label: "Code", type: "text", required: true },
        { key: "fromLocationId", label: "From Location", type: "select", required: true, options: locationOptions },
        { key: "toLocationId", label: "To Location", type: "select", required: true, options: locationOptions },
        vehicleBasisField,
        { key: "currency", label: "Currency", type: "text", defaultValue: "LKR" },
        { key: "pricingModel", label: "Pricing Model", type: "select", options: [{ label: "PER_PAX", value: "PER_PAX" }, { label: "TIERED", value: "TIERED" }], defaultValue: "PER_PAX" },
        { key: "perPaxRate", label: "Per Pax Rate", type: "number" },
        { key: "tiers", label: "Tiers JSON", type: "json" },
        { key: "minCharge", label: "Min Charge", type: "number", defaultValue: 0 },
        { key: "effectiveFrom", label: "Effective From", type: "datetime" },
        { key: "effectiveTo", label: "Effective To", type: "datetime" },
        { key: "notes", label: "Notes", type: "text" },
        { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
      ];
    }
    return [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "fromLocationId", label: "From Location", type: "select", required: true, options: locationOptions },
      { key: "toLocationId", label: "To Location", type: "select", required: true, options: locationOptions },
      vehicleBasisField,
      { key: "currency", label: "Currency", type: "text", defaultValue: "LKR" },
      { key: "unit", label: "Unit", type: "select", options: [{ label: "BAG", value: "BAG" }, { label: "KG", value: "KG" }], defaultValue: "BAG" },
      { key: "pricingModel", label: "Pricing Model", type: "select", options: [{ label: "PER_UNIT", value: "PER_UNIT" }, { label: "TIERED", value: "TIERED" }, { label: "FIXED", value: "FIXED" }], defaultValue: "PER_UNIT" },
      { key: "perUnitRate", label: "Per Unit Rate", type: "number" },
      { key: "fixedRate", label: "Fixed Rate", type: "number" },
      { key: "tiers", label: "Tiers JSON", type: "json" },
      { key: "minCharge", label: "Min Charge", type: "number", defaultValue: 0 },
      { key: "effectiveFrom", label: "Effective From", type: "datetime" },
      { key: "effectiveTo", label: "Effective To", type: "datetime" },
      { key: "notes", label: "Notes", type: "text" },
      { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
    ];
  }, [catalogs, resource, transportRateBasis]);

  const loadCatalogs = useCallback(async () => {
    const results = await Promise.allSettled([
      listTransportRecords("locations", { limit: 200 }),
      listTransportRecords("vehicle-categories", { limit: 200 }),
      listTransportRecords("vehicle-types", { limit: 200 }),
    ]);

    const errors: string[] = [];
    const [locationsResult, vehicleCategoriesResult, vehicleTypesResult] = results;
    const locations = locationsResult.status === "fulfilled" ? locationsResult.value : (errors.push("locations"), []);
    const vehicleCategories = vehicleCategoriesResult.status === "fulfilled" ? vehicleCategoriesResult.value : (errors.push("vehicle categories"), []);
    const vehicleTypes = vehicleTypesResult.status === "fulfilled" ? vehicleTypesResult.value : (errors.push("vehicle types"), []);
    setCatalogs({ locations, vehicleCategories, vehicleTypes });
    if (errors.length > 0) notify.error(`Could not load ${errors.join(", ")}.`);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listTransportRecords(resource, { q: query || undefined, limit: 200 });
      setRecords(rows);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load transport records.");
    } finally {
      setLoading(false);
    }
  }, [query, resource]);

  const refreshAll = useCallback(async () => {
    await Promise.all([load(), loadCatalogs()]);
  }, [load, loadCatalogs]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(records.length / pageSize)), [records.length, pageSize]);
  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [records, currentPage, pageSize]);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/companies/me", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as CompanySettingsResponse;
        if (!active) return;
        setTransportRateBasis(body.company?.transportRateBasis === "VEHICLE_CATEGORY" ? "VEHICLE_CATEGORY" : "VEHICLE_TYPE");
      } catch {
        if (active) setTransportRateBasis("VEHICLE_TYPE");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setResource(initialResource);
  }, [initialResource]);

  useEffect(() => {
    setCurrentPage(1);
  }, [resource, query, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const openDialog = useCallback((mode: "create" | "edit", row?: Record<string, unknown>) => {
    if (mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    const next: Record<string, unknown> = {};
    fields.forEach((field) => {
      if (mode === "edit" && row) {
        const raw = row[field.key];
        if (field.type === "datetime") next[field.key] = toLocalDateTime(raw);
        else if (field.type === "json") next[field.key] = raw ? JSON.stringify(raw) : "";
        else next[field.key] = raw ?? defaultTransportFieldValue(field);
      } else {
        next[field.key] = defaultTransportFieldValue(field);
      }
    });
    setForm(next);
    setDialog({ open: true, mode, row: row ?? null });
  }, [fields, isReadOnly]);

  const onSubmit = useCallback(async () => {
    try {
      setSaving(true);
      const payload: Record<string, unknown> = {};
      fields.forEach((field) => {
        const value = form[field.key];
        if ((value === "" || value === undefined) && field.nullable) {
          payload[field.key] = null;
          return;
        }
        if ((value === "" || value === undefined) && !field.required) return;
        if (field.required && (value === "" || value === undefined)) {
          throw new Error(`${field.label} is required.`);
        }
        if (field.type === "number") payload[field.key] = value === "" ? null : Number(value);
        else if (field.type === "boolean") payload[field.key] = Boolean(value);
        else if (field.type === "json") payload[field.key] = value ? JSON.parse(String(value)) : null;
        else if (field.type === "datetime") payload[field.key] = toIsoDateTime(value);
        else if (field.key === "code" && typeof value === "string") payload[field.key] = value.toUpperCase().trim();
        else payload[field.key] = value;
      });
      if (dialog.mode === "create") {
        await createTransportRecord(resource, payload);
        notify.success("Record created.");
      } else if (dialog.row?.id) {
        await updateTransportRecord(resource, String(dialog.row.id), payload);
        notify.success("Record updated.");
      }
      setDialog({ open: false, mode: "create", row: null });
      await refreshAll();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save record.");
    } finally {
      setSaving(false);
    }
  }, [dialog.mode, dialog.row, fields, form, refreshAll, resource]);

  const onDelete = useCallback(async (row: Record<string, unknown>) => {
    if (!row.id) return;
    const targetLabel = String(row.code ?? "").trim() || String(row.name ?? "").trim() || String(row.id);
    const confirmed = await confirm({
      title: "Delete Record",
      targetLabel,
      confirmText: "Yes",
      cancelText: "No",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      setSaving(true);
      await deleteTransportRecord(resource, String(row.id));
      notify.success("Record deleted.");
      await refreshAll();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete record.");
    } finally {
      setSaving(false);
    }
  }, [confirm, refreshAll, resource]);

  const refreshExistingCodes = useCallback(async () => {
    const rows = await listTransportRecords(resource, { limit: 500 });
    return new Set(rows.map((row) => String(row.code ?? "").trim().toUpperCase()).filter((value) => value.length > 0));
  }, [resource]);

  return {
    resource,
    setResource,
    query,
    setQuery,
    records,
    pagedRecords,
    loading,
    saving,
    catalogs,
    dialog,
    setDialog,
    form,
    setForm,
    batchOpen,
    setBatchOpen,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    transportRateBasis,
    lookupMap,
    existingCodes,
    locationByCode,
    vehicleCategoryByCode,
    vehicleTypeByCode,
    vehicleTypeCategoryCodeByCode,
    fields,
    refreshAll,
    openDialog,
    onSubmit,
    onDelete,
    refreshExistingCodes,
  };
}
