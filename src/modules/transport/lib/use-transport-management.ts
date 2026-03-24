"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
import {
  createTransportRecord,
  deleteTransportRecord,
  listAllTransportCodes,
  listAllTransportRecords,
  listTransportRecords,
  updateTransportRecord,
} from "@/modules/transport/lib/transport-api";
import {
  buildTransportRecordsParams,
  transportKeys,
} from "@/modules/transport/lib/transport-query";
import {
  defaultTransportFieldValue,
  toIsoDateTime,
  toLocalDateTime,
} from "@/modules/transport/lib/transport-management-utils";
import type {
  TransportFormField,
  TransportManagementInitialData,
  TransportResourceKey,
} from "@/modules/transport/shared/transport-management-types";

type UseTransportManagementOptions = {
  initialResource?: TransportResourceKey;
  initialData?: TransportManagementInitialData | null;
  isReadOnly: boolean;
};

const EMPTY_ROWS: Array<Record<string, unknown>> = [];
const LOOKUP_LIMIT = 100;

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : EMPTY_ROWS;
}

function asTotalCount(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function uniqueRows(rows: Array<Record<string, unknown>>) {
  const seen = new Set<string>();
  const merged: Array<Record<string, unknown>> = [];

  rows.forEach((row) => {
    const id = String(row.id ?? "");
    if (!id || seen.has(id)) return;
    seen.add(id);
    merged.push(row);
  });

  return merged;
}

function collectCatalogRefs(
  resource: TransportResourceKey,
  rows: Array<Record<string, unknown>>
) {
  const locationIds = new Set<string>();
  const vehicleCategoryIds = new Set<string>();
  const vehicleTypeIds = new Set<string>();

  rows.forEach((row) => {
    const pushId = (bucket: Set<string>, value: unknown) => {
      const id = String(value ?? "").trim();
      if (id) bucket.add(id);
    };

    if (resource === "vehicle-types") {
      pushId(vehicleCategoryIds, row.categoryId);
      return;
    }

    if (
      resource === "location-rates" ||
      resource === "pax-vehicle-rates" ||
      resource === "baggage-rates"
    ) {
      pushId(locationIds, row.fromLocationId);
      pushId(locationIds, row.toLocationId);
      pushId(vehicleCategoryIds, row.vehicleCategoryId);
      pushId(vehicleTypeIds, row.vehicleTypeId);
      return;
    }

    if (resource === "location-expenses") {
      pushId(locationIds, row.locationId);
      pushId(vehicleCategoryIds, row.vehicleCategoryId);
      pushId(vehicleTypeIds, row.vehicleTypeId);
    }
  });

  return {
    locationIds: [...locationIds],
    vehicleCategoryIds: [...vehicleCategoryIds],
    vehicleTypeIds: [...vehicleTypeIds],
  };
}

function getCatalogInvalidationTargets(resource: TransportResourceKey): TransportResourceKey[] {
  switch (resource) {
    case "locations":
      return ["location-rates", "location-expenses", "pax-vehicle-rates", "baggage-rates"];
    case "vehicle-categories":
      return [
        "vehicle-types",
        "location-rates",
        "location-expenses",
        "pax-vehicle-rates",
        "baggage-rates",
      ];
    case "vehicle-types":
      return ["location-rates", "location-expenses", "pax-vehicle-rates", "baggage-rates"];
    default:
      return [];
  }
}

export function useTransportManagement({
  initialResource = "locations",
  initialData = null,
  isReadOnly,
}: UseTransportManagementOptions) {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [resource, setResource] = useState<TransportResourceKey>(initialResource);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    row: Record<string, unknown> | null;
  }>({ open: false, mode: "create", row: null });
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [batchOpen, setBatchOpen] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [transportRateBasis] = useState<"VEHICLE_CATEGORY" | "VEHICLE_TYPE">(
    initialData?.transportRateBasis ?? "VEHICLE_TYPE"
  );

  useEffect(() => {
    setResource(initialResource);
  }, [initialResource]);

  const recordsInput = useMemo(
    () =>
      buildTransportRecordsParams({
        resource,
        q: query || undefined,
        page: currentPage,
        limit: pageSize,
      }),
    [currentPage, pageSize, query, resource]
  );

  const isDefaultRecordsQuery =
    resource === initialResource && query.length === 0 && currentPage === 1 && pageSize === 25;

  const {
    data: recordsData,
    error: recordsError,
    isFetching: recordsLoading,
    refetch: refetchRecords,
  } = useQuery({
    queryKey: transportKeys.records({
      resource,
      q: recordsInput.q,
      page: recordsInput.page,
      limit: recordsInput.limit,
    }),
    queryFn: () => listTransportRecords(resource, recordsInput),
    initialData: isDefaultRecordsQuery
      ? {
          rows: initialData?.records ?? [],
          total: initialData?.totalRecords ?? 0,
          page: 1,
          limit: 25,
        }
      : undefined,
    placeholderData: keepPreviousData,
  });

  const records = asRecordArray(
    Array.isArray(recordsData) ? recordsData : recordsData?.rows
  );
  const totalRecords = asTotalCount(
    Array.isArray(recordsData) ? recordsData.length : recordsData?.total,
    records.length
  );
  const selectionMode: "none" | "dialog" | "batch" = batchOpen
    ? "batch"
    : dialog.open
      ? "dialog"
      : "none";
  const catalogRefs = useMemo(() => collectCatalogRefs(resource, records), [records, resource]);
  const catalogInvalidationTargets = useMemo(
    () => getCatalogInvalidationTargets(resource),
    [resource]
  );
  const catalogsInitialData =
    initialData?.catalogs && selectionMode === "none" && isDefaultRecordsQuery
      ? {
          locations: initialData.catalogs.locations,
          vehicleCategories: initialData.catalogs.vehicleCategories,
          vehicleTypes: initialData.catalogs.vehicleTypes,
        }
      : undefined;

  const {
    data: catalogsData,
    error: catalogsError,
    isFetching: catalogsLoading,
    refetch: refetchCatalogs,
  } = useQuery({
    queryKey: transportKeys.catalogs({
      resource,
      transportRateBasis,
      selectionMode,
      locationIds: catalogRefs.locationIds,
      vehicleCategoryIds: catalogRefs.vehicleCategoryIds,
      vehicleTypeIds: catalogRefs.vehicleTypeIds,
    }),
    queryFn: async () => {
      const fetchCatalog = async (
        targetResource: "locations" | "vehicle-categories" | "vehicle-types",
        ids: string[]
      ) => {
        const rows: Array<Record<string, unknown>> = [];

        if (selectionMode === "batch") {
          const allRows = await listAllTransportRecords(targetResource, { limit: LOOKUP_LIMIT });
          rows.push(...allRows);
        } else if (selectionMode === "dialog") {
          const generic = await listTransportRecords(targetResource, {
            limit: LOOKUP_LIMIT,
          });
          rows.push(...generic.rows);
        }

        if (ids.length > 0) {
          const referenced = await listTransportRecords(targetResource, {
            ids,
            limit: Math.max(ids.length, 1),
          });
          rows.push(...referenced.rows);
        }

        return uniqueRows(rows);
      };

      const [locations, vehicleCategories, vehicleTypes] = await Promise.all([
        fetchCatalog("locations", catalogRefs.locationIds),
        fetchCatalog("vehicle-categories", catalogRefs.vehicleCategoryIds),
        fetchCatalog("vehicle-types", catalogRefs.vehicleTypeIds),
      ]);

      return {
        locations,
        vehicleCategories,
        vehicleTypes,
      };
    },
    initialData: catalogsInitialData,
    staleTime: 5 * 60 * 1000,
  });

  const createTransportMutation = useMutation({
    mutationFn: ({
      targetResource,
      payload,
    }: {
      targetResource: string;
      payload: Record<string, unknown>;
    }) => createTransportRecord(targetResource, payload),
  });
  const updateTransportMutation = useMutation({
    mutationFn: ({
      targetResource,
      id,
      payload,
    }: {
      targetResource: string;
      id: string;
      payload: Record<string, unknown>;
    }) => updateTransportRecord(targetResource, id, payload),
  });
  const deleteTransportMutation = useMutation({
    mutationFn: ({ targetResource, id }: { targetResource: string; id: string }) =>
      deleteTransportRecord(targetResource, id),
  });

  const catalogs = useMemo(
    () => ({
      locations: asRecordArray(catalogsData?.locations),
      vehicleCategories: asRecordArray(catalogsData?.vehicleCategories),
      vehicleTypes: asRecordArray(catalogsData?.vehicleTypes),
    }),
    [catalogsData]
  );
  const loading = catalogsLoading || recordsLoading;
  const saving =
    createTransportMutation.isPending ||
    updateTransportMutation.isPending ||
    deleteTransportMutation.isPending;

  useEffect(() => {
    if (!catalogsError) return;
    notify.error(
      catalogsError instanceof Error ? catalogsError.message : "Failed to load transport catalogs."
    );
  }, [catalogsError]);

  useEffect(() => {
    if (!recordsError) return;
    notify.error(
      recordsError instanceof Error ? recordsError.message : "Failed to load transport records."
    );
  }, [recordsError]);

  const lookupMap = useMemo(() => {
    const pairs: Array<[string, string]> = [];
    catalogs.locations.forEach((item) =>
      pairs.push([String(item.id), `${item.code} - ${item.name}`])
    );
    catalogs.vehicleCategories.forEach((item) =>
      pairs.push([String(item.id), `${item.code} - ${item.name}`])
    );
    catalogs.vehicleTypes.forEach((item) =>
      pairs.push([String(item.id), `${item.code} - ${item.name}`])
    );
    return Object.fromEntries(pairs);
  }, [catalogs]);

  const existingCodes = useMemo(
    () =>
      new Set(
        records
          .map((row) => String(row.code ?? "").trim().toUpperCase())
          .filter((value) => value.length > 0)
      ),
    [records]
  );

  const locationByCode = useMemo(
    () =>
      new Map(
        catalogs.locations.map((row) => [
          String(row.code ?? "").trim().toUpperCase(),
          String(row.id ?? ""),
        ])
      ),
    [catalogs.locations]
  );

  const vehicleCategoryByCode = useMemo(
    () =>
      new Map(
        catalogs.vehicleCategories.map((row) => [
          String(row.code ?? "").trim().toUpperCase(),
          String(row.id ?? ""),
        ])
      ),
    [catalogs.vehicleCategories]
  );

  const vehicleTypeByCode = useMemo(
    () =>
      new Map(
        catalogs.vehicleTypes.map((row) => [
          String(row.code ?? "").trim().toUpperCase(),
          String(row.id ?? ""),
        ])
      ),
    [catalogs.vehicleTypes]
  );

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

  const fields = useMemo<TransportFormField[]>(() => {
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
          } as TransportFormField)
        : ({
            key: "vehicleTypeId",
            label: "Vehicle Type",
            type: "select",
            options: vehicleTypeOptions,
            required: true,
          } as TransportFormField);

    if (resource === "locations") {
      return [
        { key: "code", label: "Code", type: "text", required: true },
        { key: "name", label: "Name", type: "text", required: true },
        { key: "country", label: "Country", type: "text" },
        { key: "region", label: "Region", type: "text" },
        { key: "address", label: "Address", type: "text" },
        {
          key: "geo",
          label: "Geo JSON",
          type: "json",
          placeholder: '{"type":"Point","coordinates":[79.8,6.9]}',
        },
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
        {
          key: "categoryId",
          label: "Category",
          type: "select",
          required: true,
          options: vehicleCategoryOptions,
        },
        { key: "paxCapacity", label: "Pax Capacity", type: "number", required: true },
        { key: "baggageCapacity", label: "Baggage Capacity", type: "number", defaultValue: 0 },
        { key: "features", label: "Features JSON", type: "json", placeholder: '["AC","WIFI"]' },
        { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
      ];
    }

    if (resource === "location-rates") {
      return [
        { key: "code", label: "Code", type: "text", required: true },
        {
          key: "fromLocationId",
          label: "From Location",
          type: "select",
          required: true,
          options: locationOptions,
        },
        {
          key: "toLocationId",
          label: "To Location",
          type: "select",
          required: true,
          options: locationOptions,
        },
        vehicleBasisField,
        { key: "distanceKm", label: "Distance (km)", type: "number" },
        { key: "durationMin", label: "Duration (min)", type: "number" },
        { key: "currency", label: "Currency", type: "text", defaultValue: "LKR" },
        {
          key: "pricingModel",
          label: "Pricing Model",
          type: "select",
          options: [
            { label: "FIXED", value: "FIXED" },
            { label: "PER_KM", value: "PER_KM" },
            { label: "SLAB", value: "SLAB" },
          ],
          defaultValue: "FIXED",
        },
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
        {
          key: "locationId",
          label: "Location",
          type: "select",
          required: true,
          options: locationOptions,
        },
        { key: "name", label: "Name", type: "text", required: true },
        {
          key: "expenseType",
          label: "Expense Type",
          type: "select",
          options: [
            { label: "FIXED", value: "FIXED" },
            { label: "PER_DAY", value: "PER_DAY" },
            { label: "PER_HOUR", value: "PER_HOUR" },
            { label: "PER_PAX", value: "PER_PAX" },
            { label: "PER_VEHICLE", value: "PER_VEHICLE" },
          ],
          defaultValue: "FIXED",
        },
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
        {
          key: "fromLocationId",
          label: "From Location",
          type: "select",
          required: true,
          options: locationOptions,
        },
        {
          key: "toLocationId",
          label: "To Location",
          type: "select",
          required: true,
          options: locationOptions,
        },
        vehicleBasisField,
        { key: "currency", label: "Currency", type: "text", defaultValue: "LKR" },
        {
          key: "pricingModel",
          label: "Pricing Model",
          type: "select",
          options: [
            { label: "PER_PAX", value: "PER_PAX" },
            { label: "TIERED", value: "TIERED" },
          ],
          defaultValue: "PER_PAX",
        },
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
      {
        key: "fromLocationId",
        label: "From Location",
        type: "select",
        required: true,
        options: locationOptions,
      },
      {
        key: "toLocationId",
        label: "To Location",
        type: "select",
        required: true,
        options: locationOptions,
      },
      vehicleBasisField,
      { key: "currency", label: "Currency", type: "text", defaultValue: "LKR" },
      {
        key: "unit",
        label: "Unit",
        type: "select",
        options: [
          { label: "BAG", value: "BAG" },
          { label: "KG", value: "KG" },
        ],
        defaultValue: "BAG",
      },
      {
        key: "pricingModel",
        label: "Pricing Model",
        type: "select",
        options: [
          { label: "PER_UNIT", value: "PER_UNIT" },
          { label: "TIERED", value: "TIERED" },
          { label: "FIXED", value: "FIXED" },
        ],
        defaultValue: "PER_UNIT",
      },
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

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalRecords / pageSize)),
    [pageSize, totalRecords]
  );
  const pagedRecords = records;

  useEffect(() => {
    setCurrentPage(1);
  }, [resource, query, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const refreshAll = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: transportKeys.recordsByResource(resource),
    });

    if (catalogInvalidationTargets.length > 0) {
      await Promise.all(
        catalogInvalidationTargets.map((target) =>
          queryClient.invalidateQueries({
            queryKey: transportKeys.catalogsByResource(target),
          })
        )
      );
    }

    await refetchRecords();
    if (selectionMode !== "none") {
      await refetchCatalogs();
    }
  }, [
    catalogInvalidationTargets,
    queryClient,
    refetchCatalogs,
    refetchRecords,
    resource,
    selectionMode,
  ]);

  const openDialog = useCallback(
    (mode: "create" | "edit", row?: Record<string, unknown>) => {
      if (mode === "create" && isReadOnly) {
        notify.warning("View only mode: adding records is disabled.");
        return;
      }

      const next: Record<string, unknown> = {};
      fields.forEach((field) => {
        if (mode === "edit" && row) {
          const raw = row[field.key];
          if (field.type === "datetime") {
            next[field.key] = toLocalDateTime(raw);
          } else if (field.type === "json") {
            next[field.key] = raw ? JSON.stringify(raw) : "";
          } else {
            next[field.key] = raw ?? defaultTransportFieldValue(field);
          }
        } else {
          next[field.key] = defaultTransportFieldValue(field);
        }
      });

      setForm(next);
      setDialog({ open: true, mode, row: row ?? null });
    },
    [fields, isReadOnly]
  );

  const onSubmit = useCallback(async () => {
    try {
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
        if (field.type === "number") {
          payload[field.key] = value === "" ? null : Number(value);
        } else if (field.type === "boolean") {
          payload[field.key] = Boolean(value);
        } else if (field.type === "json") {
          payload[field.key] = value ? JSON.parse(String(value)) : null;
        } else if (field.type === "datetime") {
          payload[field.key] = toIsoDateTime(value);
        } else if (field.key === "code" && typeof value === "string") {
          payload[field.key] = value.toUpperCase().trim();
        } else {
          payload[field.key] = value;
        }
      });

      if (dialog.mode === "create") {
        await createTransportMutation.mutateAsync({ targetResource: resource, payload });
        notify.success("Record created.");
      } else if (dialog.row?.id) {
        await updateTransportMutation.mutateAsync({
          targetResource: resource,
          id: String(dialog.row.id),
          payload,
        });
        notify.success("Record updated.");
      }

      setDialog({ open: false, mode: "create", row: null });
      await refreshAll();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save record.");
    }
  }, [createTransportMutation, dialog.mode, dialog.row, fields, form, refreshAll, resource, updateTransportMutation]);

  const onDelete = useCallback(
    async (row: Record<string, unknown>) => {
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
        await deleteTransportMutation.mutateAsync({
          targetResource: resource,
          id: String(row.id),
        });
        notify.success("Record deleted.");
        await refreshAll();
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to delete record.");
      }
    },
    [confirm, deleteTransportMutation, refreshAll, resource]
  );

  const refreshExistingCodes = useCallback(async () => {
    const rows = await listAllTransportCodes(resource, { limit: LOOKUP_LIMIT });
    return new Set(
      rows
        .map((row) => String(row.code ?? "").trim().toUpperCase())
        .filter((value) => value.length > 0)
    );
  }, [resource]);

  return {
    resource,
    setResource,
    query,
    setQuery,
    records,
    totalRecords,
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
