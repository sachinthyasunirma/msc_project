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
  buildCurrencyRecordsParams,
  currencyKeys,
} from "@/modules/currency/lib/currency-query";
import {
  createCurrencyRecord,
  deleteCurrencyRecord,
  listCurrencyRecords,
  updateCurrencyRecord,
} from "@/modules/currency/lib/currency-api";
import type { CurrencyManagementInitialData } from "@/modules/currency/shared/currency-management-types";
import {
  CURRENCY_META,
  type CurrencyField,
  type CurrencyResourceKey,
} from "@/modules/currency/ui/components/currency-management/currency-management-config";
import {
  getDefaultFieldValue,
  toIsoDateTime,
  toLocalDateTime,
} from "@/modules/currency/ui/components/currency-management/currency-management-utils";

type UseCurrencyManagementOptions = {
  initialResource?: CurrencyResourceKey;
  managedCurrencyId?: string;
  initialData?: CurrencyManagementInitialData | null;
  isReadOnly: boolean;
};

const EMPTY_ROWS: Array<Record<string, unknown>> = [];

export function useCurrencyManagement({
  initialResource = "currencies",
  managedCurrencyId = "",
  initialData = null,
  isReadOnly,
}: UseCurrencyManagementOptions) {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const isCurrencyManageMode = Boolean(managedCurrencyId);
  const [resource, setResource] = useState<CurrencyResourceKey>(initialResource);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    row: Record<string, unknown> | null;
  }>({ open: false, mode: "create", row: null });
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setResource(initialResource);
  }, [initialResource]);

  const recordsInput = useMemo(
    () =>
      buildCurrencyRecordsParams({
        resource,
        q: query || undefined,
        limit: 200,
        currencyId:
          isCurrencyManageMode &&
          (resource === "exchange-rates" || resource === "money-settings")
            ? managedCurrencyId
            : undefined,
      }),
    [isCurrencyManageMode, managedCurrencyId, query, resource]
  );

  const isDefaultRecordsQuery = resource === initialResource && query.length === 0;
  const lookupsInitialData = initialData
    ? {
        currencies: initialData.currencies,
        providers: initialData.providers,
      }
    : undefined;

  const {
    data: lookupsData,
    error: lookupsError,
    isFetching: lookupsLoading,
    refetch: refetchLookups,
  } = useQuery({
    queryKey: currencyKeys.lookups(),
    queryFn: async () => {
      const [currencies, providers] = await Promise.all([
        listCurrencyRecords("currencies", { limit: 200 }),
        listCurrencyRecords("fx-providers", { limit: 200 }),
      ]);
      return {
        currencies,
        providers,
      };
    },
    initialData: lookupsInitialData,
  });

  const {
    data: records = EMPTY_ROWS,
    error: recordsError,
    isFetching: recordsLoading,
    refetch: refetchRecords,
  } = useQuery({
    queryKey: currencyKeys.records({
      resource,
      q: recordsInput.q,
      currencyId: recordsInput.currencyId,
      limit: recordsInput.limit,
    }),
    queryFn: () => listCurrencyRecords(resource, recordsInput),
    initialData: isDefaultRecordsQuery ? initialData?.records ?? undefined : undefined,
    placeholderData: keepPreviousData,
  });

  const createCurrencyMutation = useMutation({
    mutationFn: ({ targetResource, payload }: { targetResource: string; payload: Record<string, unknown> }) =>
      createCurrencyRecord(targetResource, payload),
  });
  const updateCurrencyMutation = useMutation({
    mutationFn: ({
      targetResource,
      id,
      payload,
    }: {
      targetResource: string;
      id: string;
      payload: Record<string, unknown>;
    }) => updateCurrencyRecord(targetResource, id, payload),
  });
  const deleteCurrencyMutation = useMutation({
    mutationFn: ({ targetResource, id }: { targetResource: string; id: string }) =>
      deleteCurrencyRecord(targetResource, id),
  });

  const currencies = lookupsData?.currencies ?? EMPTY_ROWS;
  const providers = lookupsData?.providers ?? EMPTY_ROWS;
  const loading = lookupsLoading || recordsLoading;
  const saving =
    createCurrencyMutation.isPending ||
    updateCurrencyMutation.isPending ||
    deleteCurrencyMutation.isPending;

  useEffect(() => {
    if (!lookupsError) return;
    notify.error(
      lookupsError instanceof Error ? lookupsError.message : "Failed to load currency lookups."
    );
  }, [lookupsError]);

  useEffect(() => {
    if (!recordsError) return;
    notify.error(
      recordsError instanceof Error ? recordsError.message : "Failed to load records."
    );
  }, [recordsError]);

  const managedCurrency = useMemo(
    () => currencies.find((item) => String(item.id) === managedCurrencyId) ?? null,
    [currencies, managedCurrencyId]
  );

  const visibleResources = useMemo<CurrencyResourceKey[]>(
    () =>
      isCurrencyManageMode
        ? (["exchange-rates", "money-settings"] as CurrencyResourceKey[])
        : (["currencies", "fx-providers"] as CurrencyResourceKey[]),
    [isCurrencyManageMode]
  );

  const lookups = useMemo(() => {
    const items: Array<[string, string]> = [];
    currencies.forEach((item) => {
      items.push([String(item.id), `${item.code} - ${item.name}`]);
    });
    providers.forEach((item) => {
      items.push([String(item.id), `${item.code} - ${item.name}`]);
    });
    return Object.fromEntries(items);
  }, [currencies, providers]);

  const fields = useMemo<CurrencyField[]>(() => {
    const currencyOptions = currencies.map((item) => ({
      value: String(item.id),
      label: `${item.code} - ${item.name}`,
    }));
    const providerOptions = providers.map((item) => ({
      value: String(item.id),
      label: `${item.code} - ${item.name}`,
    }));

    switch (resource) {
      case "currencies":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "name", label: "Name", type: "text", required: true },
          { key: "symbol", label: "Symbol", type: "text", nullable: true },
          { key: "numericCode", label: "Numeric Code", type: "text", nullable: true },
          { key: "minorUnit", label: "Minor Unit", type: "number", defaultValue: 2 },
          {
            key: "roundingMode",
            label: "Rounding Mode",
            type: "select",
            defaultValue: "HALF_UP",
            options: [
              { label: "HALF_UP", value: "HALF_UP" },
              { label: "HALF_DOWN", value: "HALF_DOWN" },
              { label: "UP", value: "UP" },
              { label: "DOWN", value: "DOWN" },
              { label: "BANKERS", value: "BANKERS" },
            ],
          },
          { key: "roundingScale", label: "Rounding Scale", type: "number", defaultValue: 2 },
          { key: "metadata", label: "Metadata JSON", type: "json", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "fx-providers":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "name", label: "Name", type: "text", required: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "exchange-rates":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "providerId", label: "Provider", type: "select", options: providerOptions, nullable: true },
          { key: "baseCurrencyId", label: "Base Currency", type: "select", required: true, options: currencyOptions },
          { key: "quoteCurrencyId", label: "Quote Currency", type: "select", required: true, options: currencyOptions },
          { key: "rate", label: "Rate", type: "number", required: true },
          { key: "effectiveFrom", label: "Effective From", type: "datetime", required: true },
          { key: "effectiveTo", label: "Effective To", type: "datetime", nullable: true },
          {
            key: "rateType",
            label: "Rate Type",
            type: "select",
            defaultValue: "MID",
            options: [
              { label: "MID", value: "MID" },
              { label: "BUY", value: "BUY" },
              { label: "SELL", value: "SELL" },
            ],
          },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "money-settings":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "baseCurrencyId", label: "Base Currency", type: "select", required: true, options: currencyOptions },
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
          {
            key: "fxRateSource",
            label: "FX Rate Source",
            type: "select",
            defaultValue: "LATEST",
            options: [
              { label: "LATEST", value: "LATEST" },
              { label: "DATE_OF_SERVICE", value: "DATE_OF_SERVICE" },
              { label: "DATE_OF_BOOKING", value: "DATE_OF_BOOKING" },
            ],
          },
        ];
      default:
        return [];
    }
  }, [currencies, providers, resource]);

  const visibleFields = useMemo(
    () =>
      isCurrencyManageMode && (resource === "exchange-rates" || resource === "money-settings")
        ? fields.filter((field) => field.key !== "baseCurrencyId")
        : fields,
    [fields, isCurrencyManageMode, resource]
  );

  useEffect(() => {
    if (!visibleResources.includes(resource)) {
      setResource(visibleResources[0]);
    }
  }, [resource, visibleResources]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(records.length / pageSize)),
    [records.length, pageSize]
  );

  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [records, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [resource, query, pageSize, managedCurrencyId]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: currencyKeys.lookups() }),
      queryClient.invalidateQueries({ queryKey: currencyKeys.recordsRoot() }),
    ]);
    await Promise.all([refetchLookups(), refetchRecords()]);
  }, [queryClient, refetchLookups, refetchRecords]);

  const openDialog = useCallback((mode: "create" | "edit", row?: Record<string, unknown>) => {
    if (mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    const next: Record<string, unknown> = {};
    visibleFields.forEach((field) => {
      if (mode === "edit" && row) {
        const raw =
          field.key === "effectiveFrom"
            ? row.effectiveFrom ?? row.asOf
            : field.key === "effectiveTo"
              ? row.effectiveTo ?? null
              : row[field.key];
        if (field.type === "datetime") next[field.key] = toLocalDateTime(raw);
        else if (field.type === "json") next[field.key] = raw ? JSON.stringify(raw) : "";
        else next[field.key] = raw ?? getDefaultFieldValue(field);
      } else {
        next[field.key] = getDefaultFieldValue(field);
      }
    });
    if (isCurrencyManageMode && (resource === "exchange-rates" || resource === "money-settings")) {
      next.baseCurrencyId = managedCurrencyId;
    }
    setForm(next);
    setDialog({ open: true, mode, row: row ?? null });
  }, [isCurrencyManageMode, isReadOnly, managedCurrencyId, resource, visibleFields]);

  const onSubmit = useCallback(async () => {
    try {
      const payload: Record<string, unknown> = {};
      visibleFields.forEach((field) => {
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

      if (resource === "currencies") {
        const currencyCode = String(payload.code ?? "").trim().toUpperCase();
        if (currencyCode.length < 3) {
          throw new Error("Currency Code must be at least 3 characters (e.g. LKR, USD).");
        }
      }

      if (isCurrencyManageMode && (resource === "exchange-rates" || resource === "money-settings")) {
        payload.baseCurrencyId = managedCurrencyId;
      }
      if (dialog.mode === "create") {
        await createCurrencyMutation.mutateAsync({ targetResource: resource, payload });
        notify.success("Record created.");
      } else if (dialog.row?.id) {
        await updateCurrencyMutation.mutateAsync({
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
  }, [
    createCurrencyMutation,
    dialog.mode,
    dialog.row,
    form,
    isCurrencyManageMode,
    managedCurrencyId,
    refreshAll,
    resource,
    updateCurrencyMutation,
    visibleFields,
  ]);

  const onDelete = useCallback(async (row: Record<string, unknown>) => {
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
      await deleteCurrencyMutation.mutateAsync({
        targetResource: resource,
        id: String(row.id),
      });
      notify.success("Record deleted.");
      await refreshAll();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete record.");
    }
  }, [confirm, deleteCurrencyMutation, refreshAll, resource]);

  return {
    resource,
    setResource,
    query,
    setQuery,
    records,
    pagedRecords,
    loading,
    saving,
    dialog,
    setDialog,
    form,
    setForm,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    managedCurrency,
    visibleResources,
    lookups,
    visibleFields,
    refreshAll,
    openDialog,
    onSubmit,
    onDelete,
    meta: CURRENCY_META[resource],
    isCurrencyManageMode,
  };
}
