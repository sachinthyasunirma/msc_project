"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/table-pagination";
import { authClient } from "@/lib/auth-client";
import {
  createCurrencyRecord,
  deleteCurrencyRecord,
  listCurrencyRecords,
  updateCurrencyRecord,
} from "@/modules/currency/lib/currency-api";
import {
  CURRENCY_META,
  type CurrencyField,
  type CurrencyResourceKey,
} from "@/modules/currency/ui/components/currency-management/currency-management-config";
import { CurrencyManagementHeader } from "@/modules/currency/ui/components/currency-management/currency-management-header";
import { CurrencyRecordDialog } from "@/modules/currency/ui/components/currency-management/currency-record-dialog";
import { CurrencyRecordsTable } from "@/modules/currency/ui/components/currency-management/currency-records-table";
import {
  getDefaultFieldValue,
  toIsoDateTime,
  toLocalDateTime,
} from "@/modules/currency/ui/components/currency-management/currency-management-utils";

export function CurrencyManagementView({
  initialResource = "currencies",
  managedCurrencyId = "",
}: {
  initialResource?: CurrencyResourceKey;
  managedCurrencyId?: string;
}) {
  const confirm = useConfirm();
  const { data: session } = authClient.useSession();
  const accessUser = session?.user as
    | {
        readOnly?: boolean;
        role?: string | null;
        canWriteMasterData?: boolean;
      }
    | undefined;
  const canWrite =
    Boolean(accessUser) &&
    !Boolean(accessUser?.readOnly) &&
    (accessUser?.role === "ADMIN" ||
      accessUser?.role === "MANAGER" ||
      Boolean(accessUser?.canWriteMasterData));
  const isReadOnly = !canWrite;
  const isCurrencyManageMode = Boolean(managedCurrencyId);

  const [resource, setResource] = useState<CurrencyResourceKey>(initialResource);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currencies, setCurrencies] = useState<Array<Record<string, unknown>>>([]);
  const [providers, setProviders] = useState<Array<Record<string, unknown>>>([]);
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    row: Record<string, unknown> | null;
  }>({ open: false, mode: "create", row: null });
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

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
          {
            key: "providerId",
            label: "Provider",
            type: "select",
            options: providerOptions,
            nullable: true,
          },
          {
            key: "baseCurrencyId",
            label: "Base Currency",
            type: "select",
            required: true,
            options: currencyOptions,
          },
          {
            key: "quoteCurrencyId",
            label: "Quote Currency",
            type: "select",
            required: true,
            options: currencyOptions,
          },
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
          {
            key: "baseCurrencyId",
            label: "Base Currency",
            type: "select",
            required: true,
            options: currencyOptions,
          },
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

  const loadLookups = useCallback(async () => {
    try {
      const [currencyList, providerList] = await Promise.all([
        listCurrencyRecords("currencies", { limit: 200 }),
        listCurrencyRecords("fx-providers", { limit: 200 }),
      ]);
      setCurrencies(currencyList);
      setProviders(providerList);
    } catch (error) {
      setCurrencies([]);
      setProviders([]);
      notify.error(error instanceof Error ? error.message : "Failed to load currency lookups.");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listCurrencyRecords(resource, {
        q: query || undefined,
        limit: 200,
        currencyId:
          isCurrencyManageMode &&
          (resource === "exchange-rates" || resource === "money-settings")
            ? managedCurrencyId
            : undefined,
      });
      setRecords(rows);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [isCurrencyManageMode, managedCurrencyId, query, resource]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    void load();
  }, [load]);

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
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visibleFields = useMemo(
    () =>
      isCurrencyManageMode && (resource === "exchange-rates" || resource === "money-settings")
        ? fields.filter((field) => field.key !== "baseCurrencyId")
        : fields,
    [fields, isCurrencyManageMode, resource]
  );

  const openDialog = (mode: "create" | "edit", row?: Record<string, unknown>) => {
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
    if (
      isCurrencyManageMode &&
      (resource === "exchange-rates" || resource === "money-settings")
    ) {
      next.baseCurrencyId = managedCurrencyId;
    }
    setForm(next);
    setDialog({ open: true, mode, row: row ?? null });
  };

  const onSubmit = async () => {
    try {
      setSaving(true);
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

      if (
        isCurrencyManageMode &&
        (resource === "exchange-rates" || resource === "money-settings")
      ) {
        payload.baseCurrencyId = managedCurrencyId;
      }
      if (dialog.mode === "create") {
        await createCurrencyRecord(resource, payload);
        notify.success("Record created.");
      } else if (dialog.row?.id) {
        await updateCurrencyRecord(resource, String(dialog.row.id), payload);
        notify.success("Record updated.");
      }
      setDialog({ open: false, mode: "create", row: null });
      await Promise.all([load(), loadLookups()]);
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
      await deleteCurrencyRecord(resource, String(row.id));
      notify.success("Record deleted.");
      await Promise.all([load(), loadLookups()]);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CurrencyManagementHeader
        resource={resource}
        visibleResources={visibleResources}
        isCurrencyManageMode={isCurrencyManageMode}
        managedCurrencyLabel={
          managedCurrency ? `${String(managedCurrency.code)} - ${String(managedCurrency.name)}` : ""
        }
        isReadOnly={isReadOnly}
        onResourceChange={setResource}
        onRefresh={() => void Promise.all([load(), loadLookups()])}
        onAdd={() => openDialog("create")}
      />

      <CardContent className="space-y-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="max-w-md"
        />
        <CurrencyRecordsTable
          resource={resource}
          records={pagedRecords}
          loading={loading}
          lookups={lookups}
          onEdit={(row) => openDialog("edit", row)}
          onDelete={(row) => void onDelete(row)}
        />
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

      <CurrencyRecordDialog
        dialog={dialog}
        resourceTitle={CURRENCY_META[resource].title}
        visibleFields={visibleFields}
        form={form}
        saving={saving}
        isReadOnly={isReadOnly}
        setDialog={setDialog}
        setForm={setForm}
        onSubmit={onSubmit}
      />
    </Card>
  );
}

export type { CurrencyResourceKey };
