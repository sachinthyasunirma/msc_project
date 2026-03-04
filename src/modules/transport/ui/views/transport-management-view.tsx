"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/app-confirm-provider";
import {
  locationImportConfig,
  transportBaggageRateImportConfig,
  transportLocationExpenseImportConfig,
  transportLocationRateImportConfig,
  transportPaxVehicleRateImportConfig,
  transportVehicleCategoryImportConfig,
  transportVehicleTypeImportConfig,
} from "@/components/batch-import/master-batch-import-config";
import {
  MasterBatchImportDialog,
  type ImportEntityConfig,
} from "@/components/batch-import/master-batch-import-dialog";
import { notify } from "@/lib/notify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordAuditMeta } from "@/components/ui/record-audit-meta";
import { TablePagination } from "@/components/ui/table-pagination";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import {
  createTransportRecord,
  deleteTransportRecord,
  listTransportRecords,
  updateTransportRecord,
} from "@/modules/transport/lib/transport-api";

export type TransportResourceKey =
  | "locations"
  | "vehicle-categories"
  | "vehicle-types"
  | "location-rates"
  | "location-expenses"
  | "pax-vehicle-rates"
  | "baggage-rates";

type FormField = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "datetime" | "json";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  nullable?: boolean;
};

type CompanySettingsResponse = {
  company?: {
    transportRateBasis?: "VEHICLE_CATEGORY" | "VEHICLE_TYPE" | null;
  } | null;
};

const RESOURCE_META: Record<TransportResourceKey, { title: string; description: string }> = {
  locations: {
    title: "Transport Locations",
    description: "Manage pickup and drop locations used by transport rules.",
  },
  "vehicle-categories": {
    title: "Transport Vehicle Categories",
    description: "Manage high-level vehicle groups (Sedan, Van, SUV...).",
  },
  "vehicle-types": {
    title: "Transport Vehicle Types",
    description: "Manage detailed vehicle definitions and capacities.",
  },
  "location-rates": {
    title: "Transport Location Rates",
    description: "Manage point-to-point transport rates.",
  },
  "location-expenses": {
    title: "Transport Location Expenses",
    description: "Manage additional location-based charges.",
  },
  "pax-vehicle-rates": {
    title: "Transport Pax Vehicle Rates",
    description: "Manage passenger pricing rules for transport.",
  },
  "baggage-rates": {
    title: "Transport Baggage Rates",
    description: "Manage baggage transportation pricing.",
  },
};

const RESOURCE_COLUMNS: Record<TransportResourceKey, Array<{ key: string; label: string }>> = {
  locations: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "country", label: "Country" },
    { key: "region", label: "Region" },
    { key: "isActive", label: "Status" },
  ],
  "vehicle-categories": [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "sortOrder", label: "Sort" },
    { key: "isActive", label: "Status" },
  ],
  "vehicle-types": [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "categoryId", label: "Category" },
    { key: "paxCapacity", label: "Pax" },
    { key: "isActive", label: "Status" },
  ],
  "location-rates": [
    { key: "code", label: "Code" },
    { key: "fromLocationId", label: "From" },
    { key: "toLocationId", label: "To" },
    { key: "pricingModel", label: "Model" },
    { key: "currency", label: "Currency" },
    { key: "isActive", label: "Status" },
  ],
  "location-expenses": [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "locationId", label: "Location" },
    { key: "expenseType", label: "Type" },
    { key: "amount", label: "Amount" },
    { key: "isActive", label: "Status" },
  ],
  "pax-vehicle-rates": [
    { key: "code", label: "Code" },
    { key: "fromLocationId", label: "From" },
    { key: "toLocationId", label: "To" },
    { key: "pricingModel", label: "Model" },
    { key: "currency", label: "Currency" },
    { key: "isActive", label: "Status" },
  ],
  "baggage-rates": [
    { key: "code", label: "Code" },
    { key: "fromLocationId", label: "From" },
    { key: "toLocationId", label: "To" },
    { key: "unit", label: "Unit" },
    { key: "pricingModel", label: "Model" },
    { key: "isActive", label: "Status" },
  ],
};

function toLocalDateTime(value: unknown) {
  if (!value || typeof value !== "string") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function toIsoDateTime(value: unknown) {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatCell(value: unknown, lookups: Record<string, string>) {
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  if (typeof value === "string" && lookups[value]) return lookups[value];
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function defaultFieldValue(field: FormField) {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === "boolean") return true;
  return "";
}

export function TransportManagementView({
  initialResource = "locations",
}: {
  initialResource?: TransportResourceKey;
}) {
  const confirm = useConfirm();
  const { data: session } = authClient.useSession();
  const accessUser = session?.user as
    | { readOnly?: boolean; role?: string | null; canWriteMasterData?: boolean }
    | undefined;
  const canWrite =
    Boolean(accessUser) &&
    !Boolean(accessUser?.readOnly) &&
    (accessUser?.role === "ADMIN" ||
      accessUser?.role === "MANAGER" ||
      Boolean(accessUser?.canWriteMasterData));
  const isReadOnly = !canWrite;
  const [resource, setResource] = useState<TransportResourceKey>(initialResource);

  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalogs, setCatalogs] = useState<{
    locations: Array<Record<string, unknown>>;
    vehicleCategories: Array<Record<string, unknown>>;
    vehicleTypes: Array<Record<string, unknown>>;
  }>({
    locations: [],
    vehicleCategories: [],
    vehicleTypes: [],
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
  const [transportRateBasis, setTransportRateBasis] = useState<
    "VEHICLE_CATEGORY" | "VEHICLE_TYPE"
  >("VEHICLE_TYPE");

  const meta = RESOURCE_META[resource];

  const lookupMap = useMemo(() => {
    const pairs: Array<[string, string]> = [];
    catalogs.locations.forEach((item) => {
      pairs.push([String(item.id), `${item.code} - ${item.name}`]);
    });
    catalogs.vehicleCategories.forEach((item) => {
      pairs.push([String(item.id), `${item.code} - ${item.name}`]);
    });
    catalogs.vehicleTypes.forEach((item) => {
      pairs.push([String(item.id), `${item.code} - ${item.name}`]);
    });
    return Object.fromEntries(pairs);
  }, [catalogs]);

  const locationExistingCodes = useMemo(() => {
    return new Set(
      records
        .map((row) => String(row.code ?? "").trim().toUpperCase())
        .filter((value) => value.length > 0)
    );
  }, [records]);

  const locationByCode = useMemo(() => {
    return new Map(
      catalogs.locations.map((row) => [
        String(row.code ?? "").trim().toUpperCase(),
        String(row.id ?? ""),
      ])
    );
  }, [catalogs.locations]);

  const vehicleCategoryByCode = useMemo(() => {
    return new Map(
      catalogs.vehicleCategories.map((row) => [
        String(row.code ?? "").trim().toUpperCase(),
        String(row.id ?? ""),
      ])
    );
  }, [catalogs.vehicleCategories]);

  const vehicleTypeByCode = useMemo(() => {
    return new Map(
      catalogs.vehicleTypes.map((row) => [
        String(row.code ?? "").trim().toUpperCase(),
        String(row.id ?? ""),
      ])
    );
  }, [catalogs.vehicleTypes]);

  const vehicleTypeCategoryCodeByCode = useMemo(() => {
    const categoryCodeById = new Map(
      catalogs.vehicleCategories.map((row) => [
        String(row.id ?? ""),
        String(row.code ?? "").trim().toUpperCase(),
      ])
    );
    return new Map(
      catalogs.vehicleTypes.map((row) => [
        String(row.code ?? "").trim().toUpperCase(),
        categoryCodeById.get(String(row.categoryId ?? "")) ?? "",
      ])
    );
  }, [catalogs.vehicleCategories, catalogs.vehicleTypes]);

  const batchConfig = useMemo<ImportEntityConfig>(() => {
    const locationCodeOptions = catalogs.locations.map((row) => ({
      value: String(row.code ?? "").trim().toUpperCase(),
      label: `${String(row.code ?? "").trim().toUpperCase()} - ${String(row.name ?? "")}`,
    }));
    const vehicleCategoryCodeOptions = catalogs.vehicleCategories.map((row) => ({
      value: String(row.code ?? "").trim().toUpperCase(),
      label: `${String(row.code ?? "").trim().toUpperCase()} - ${String(row.name ?? "")}`,
    }));
    const vehicleTypeCodeOptions = catalogs.vehicleTypes.map((row) => ({
      value: String(row.code ?? "").trim().toUpperCase(),
      label: `${String(row.code ?? "").trim().toUpperCase()} - ${String(row.name ?? "")}`,
    }));

    const replaceCodeOptions = (config: ImportEntityConfig) => {
      let nextFields = config.fields.map((field) => {
        if (field.key === "locationCode" || field.key === "fromLocationCode" || field.key === "toLocationCode") {
          return { ...field, options: locationCodeOptions };
        }
        if (field.key === "categoryCode" || field.key === "vehicleCategoryCode") {
          return { ...field, options: vehicleCategoryCodeOptions };
        }
        if (field.key === "vehicleTypeCode") {
          return { ...field, options: vehicleTypeCodeOptions };
        }
        return field;
      });

      if (["location-rates", "location-expenses", "pax-vehicle-rates", "baggage-rates"].includes(config.key)) {
        nextFields = nextFields.filter((field) =>
          transportRateBasis === "VEHICLE_CATEGORY"
            ? field.key !== "vehicleTypeCode"
            : field.key !== "vehicleCategoryCode"
        );
      }

      return {
        ...config,
        fields: nextFields,
        lookupHints: [
        { label: "Location Codes", values: locationCodeOptions.map((item) => item.value).slice(0, 20) },
        ...(transportRateBasis === "VEHICLE_CATEGORY"
          ? [
              {
                label: "Vehicle Category Codes",
                values: vehicleCategoryCodeOptions.map((item) => item.value).slice(0, 20),
              },
            ]
          : [
              {
                label: "Vehicle Type Codes",
                values: vehicleTypeCodeOptions.map((item) => item.value).slice(0, 20),
              },
            ]),
      ],
      };
    };

    switch (resource) {
      case "locations":
        return locationImportConfig;
      case "vehicle-categories":
        return transportVehicleCategoryImportConfig;
      case "vehicle-types":
        return replaceCodeOptions(transportVehicleTypeImportConfig);
      case "location-rates":
        return replaceCodeOptions(transportLocationRateImportConfig);
      case "location-expenses":
        return replaceCodeOptions(transportLocationExpenseImportConfig);
      case "pax-vehicle-rates":
        return replaceCodeOptions(transportPaxVehicleRateImportConfig);
      case "baggage-rates":
      default:
        return replaceCodeOptions(transportBaggageRateImportConfig);
    }
  }, [resource, catalogs, transportRateBasis]);

  const fields = useMemo<FormField[]>(() => {
    const locationOptions = catalogs.locations.map((item) => ({
      value: String(item.id),
      label: `${item.code} - ${item.name}`,
    }));
    const vehicleCategoryOptions = catalogs.vehicleCategories.map((item) => ({
      value: String(item.id),
      label: `${item.code} - ${item.name}`,
    }));
    const vehicleTypeOptions = catalogs.vehicleTypes.map((item) => ({
      value: String(item.id),
      label: `${item.code} - ${item.name}`,
    }));

    const vehicleBasisField =
      transportRateBasis === "VEHICLE_CATEGORY"
        ? ({
            key: "vehicleCategoryId",
            label: "Vehicle Category",
            type: "select",
            options: vehicleCategoryOptions,
            required: true,
          } as FormField)
        : ({
            key: "vehicleTypeId",
            label: "Vehicle Type",
            type: "select",
            options: vehicleTypeOptions,
            required: true,
          } as FormField);

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
    const [locations, vehicleCategories, vehicleTypes] = await Promise.all([
      listTransportRecords("locations", { limit: 200 }),
      listTransportRecords("vehicle-categories", { limit: 200 }),
      listTransportRecords("vehicle-types", { limit: 200 }),
    ]);
    setCatalogs({ locations, vehicleCategories, vehicleTypes });
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

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(records.length / pageSize)),
    [records.length, pageSize]
  );

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
        const basis = body.company?.transportRateBasis;
        setTransportRateBasis(
          basis === "VEHICLE_CATEGORY" ? "VEHICLE_CATEGORY" : "VEHICLE_TYPE"
        );
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
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openDialog = (mode: "create" | "edit", row?: Record<string, unknown>) => {
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
        else next[field.key] = raw ?? defaultFieldValue(field);
      } else {
        next[field.key] = defaultFieldValue(field);
      }
    });
    setForm(next);
    setDialog({ open: true, mode, row: row ?? null });
  };

  const onSubmit = async () => {
    try {
      setSaving(true);
      const payload: Record<string, unknown> = {};
      fields.forEach((field) => {
        const value = form[field.key];
        if ((value === "" || value === undefined) && field.nullable) {
          payload[field.key] = null;
          return;
        }
        if ((value === "" || value === undefined) && !field.required) {
          return;
        }
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
      await Promise.all([load(), loadCatalogs()]);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save record.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row: Record<string, unknown>) => {
    if (!row.id) return;
    const targetLabel =
      String(row.code ?? "").trim() ||
      String(row.name ?? "").trim() ||
      String(row.id);
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
      await Promise.all([load(), loadCatalogs()]);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete record.");
    } finally {
      setSaving(false);
    }
  };

  const refreshLocationExistingCodes = async () => {
    const rows = await listTransportRecords(resource, { limit: 500 });
    return new Set(
      rows
        .map((row) => String(row.code ?? "").trim().toUpperCase())
        .filter((value) => value.length > 0)
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{meta.title}</CardTitle>
          <CardDescription>{meta.description}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void Promise.all([load(), loadCatalogs()])}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setBatchOpen(true)}>
            Batch Upload
          </Button>
          <Button
            onClick={() => openDialog("create")}
            disabled={isReadOnly}
            title={isReadOnly ? "View only mode" : undefined}
            className="master-add-btn"
          >
            <Plus className="mr-2 size-4" />
            Add Record
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={resource} onValueChange={(value) => setResource(value as TransportResourceKey)}>
          <div className="master-tabs-scroll">
            <TabsList className="master-tabs-list">
              {(Object.keys(RESOURCE_META) as TransportResourceKey[]).map((key) => (
                <TabsTrigger key={key} value={key} className="master-tab-trigger">
                  {RESOURCE_META[key].title.replace("Transport ", "")}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
        <Input
          placeholder="Search..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-md"
        />
        <Table>
          <TableHeader>
            <TableRow>
              {RESOURCE_COLUMNS[resource].map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={RESOURCE_COLUMNS[resource].length + 1}
                  className="text-center text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={RESOURCE_COLUMNS[resource].length + 1}
                  className="text-center text-muted-foreground"
                >
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              pagedRecords.map((row) => (
                <TableRow key={String(row.id)}>
                  {RESOURCE_COLUMNS[resource].map((column) => (
                    <TableCell key={column.key}>
                      {column.key === "isActive" ? (
                        <Badge variant={row.isActive ? "default" : "secondary"}>
                          {row.isActive ? "Active" : "Inactive"}
                        </Badge>
                      ) : (
                        formatCell(row[column.key], lookupMap)
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openDialog("edit", row)}>
                        <Edit3 className="size-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void onDelete(row)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!loading && records.length > 0 ? (
          <TablePagination
            totalItems={records.length}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        ) : null}
      </CardContent>

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "create" ? "Add" : "Edit"} {meta.title}
            </DialogTitle>
            <DialogDescription>Fill required fields and save.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-x-hidden overflow-y-auto px-1 md:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.key}
                className={`min-w-0 space-y-2 ${field.type === "json" ? "md:col-span-2" : ""}`}
              >
                <Label>{field.label}</Label>
                {field.type === "select" ? (
                  <Select
                    value={String(form[field.key] ?? (field.nullable ? "__none__" : ""))}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        [field.key]: value === "__none__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {field.nullable ? <SelectItem value="__none__">None</SelectItem> : null}
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "boolean" ? (
                  <div className="flex h-9 items-center justify-between rounded-md border px-3">
                    <span className="text-muted-foreground text-xs">
                      {Boolean(form[field.key]) ? "Active" : "Inactive"}
                    </span>
                    <Switch
                      checked={Boolean(form[field.key])}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, [field.key]: checked }))
                      }
                    />
                  </div>
                ) : field.type === "json" ? (
                  <Textarea
                    value={String(form[field.key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    placeholder={field.placeholder}
                  />
                ) : (
                  <Input
                    type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"}
                    value={String(form[field.key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="pt-2">
            <RecordAuditMeta row={dialog.row} className="mr-auto" />
            <Button variant="outline" onClick={() => setDialog({ open: false, mode: "create", row: null })}>
              Cancel
            </Button>
            <Button
              onClick={() => void onSubmit()}
              disabled={saving || (isReadOnly && dialog.mode === "create")}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MasterBatchImportDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        config={batchConfig}
        readOnly={isReadOnly}
        context={{
          locationByCode,
          currencyByCode: new Map(),
          vehicleCategoryByCode,
          vehicleTypeByCode,
          vehicleTypeCategoryCodeByCode,
          transportRateBasis,
        }}
        existingCodes={locationExistingCodes}
        onRefreshExistingCodes={refreshLocationExistingCodes}
        onUploadRow={async (payload) => {
          await createTransportRecord(resource, payload);
        }}
        onCompleted={async () => {
          await Promise.all([load(), loadCatalogs()]);
        }}
      />
    </Card>
  );
}
