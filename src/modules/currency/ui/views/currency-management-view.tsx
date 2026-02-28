"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Edit3, Plus, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  createCurrencyRecord,
  deleteCurrencyRecord,
  listCurrencyRecords,
  updateCurrencyRecord,
} from "@/modules/currency/lib/currency-api";

export type CurrencyResourceKey =
  | "currencies"
  | "fx-providers"
  | "exchange-rates"
  | "money-settings";

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "datetime" | "json";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number | boolean;
  nullable?: boolean;
};

const META: Record<CurrencyResourceKey, { title: string; description: string }> = {
  currencies: {
    title: "Currencies",
    description: "Maintain currency master with rounding and precision rules.",
  },
  "fx-providers": {
    title: "FX Providers",
    description: "Maintain exchange-rate providers (manual or external source).",
  },
  "exchange-rates": {
    title: "Exchange Rates",
    description: "Maintain rate pairs and validity timestamps.",
  },
  "money-settings": {
    title: "Money Settings",
    description: "Configure pricing mode and FX rate source defaults.",
  },
};

const COLUMNS: Record<CurrencyResourceKey, Array<{ key: string; label: string }>> = {
  currencies: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "symbol", label: "Symbol" },
    { key: "minorUnit", label: "Minor Unit" },
    { key: "isActive", label: "Status" },
  ],
  "fx-providers": [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "isActive", label: "Status" },
  ],
  "exchange-rates": [
    { key: "code", label: "Code" },
    { key: "providerId", label: "Provider" },
    { key: "baseCurrencyId", label: "Base" },
    { key: "quoteCurrencyId", label: "Quote" },
    { key: "rate", label: "Rate" },
    { key: "isActive", label: "Status" },
  ],
  "money-settings": [
    { key: "code", label: "Code" },
    { key: "baseCurrencyId", label: "Base Currency" },
    { key: "priceMode", label: "Price Mode" },
    { key: "fxRateSource", label: "FX Source" },
  ],
};

function defaultValue(field: Field) {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === "boolean") return true;
  return "";
}

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
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && lookups[value]) return lookups[value];
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export function CurrencyManagementView({
  initialResource = "currencies",
  managedCurrencyId = "",
}: {
  initialResource?: CurrencyResourceKey;
  managedCurrencyId?: string;
}) {
  const { data: session } = authClient.useSession();
  const isReadOnly = Boolean((session?.user as { readOnly?: boolean } | undefined)?.readOnly);
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

  const managedCurrency = useMemo(
    () => currencies.find((item) => String(item.id) === managedCurrencyId) ?? null,
    [currencies, managedCurrencyId]
  );

  const visibleResources = useMemo<CurrencyResourceKey[]>(
    () => (isCurrencyManageMode ? ["exchange-rates"] : (Object.keys(META) as CurrencyResourceKey[])),
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

  const fields = useMemo<Field[]>(() => {
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
          { key: "asOf", label: "As Of", type: "datetime", required: true },
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
      toast.error(error instanceof Error ? error.message : "Failed to load currency lookups.");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listCurrencyRecords(resource, {
        q: query || undefined,
        limit: 200,
        currencyId: isCurrencyManageMode && resource === "exchange-rates" ? managedCurrencyId : undefined,
      });
      setRecords(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load records.");
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

  const visibleFields = useMemo(
    () =>
      isCurrencyManageMode && resource === "exchange-rates"
        ? fields.filter((field) => field.key !== "baseCurrencyId")
        : fields,
    [fields, isCurrencyManageMode, resource]
  );

  const openDialog = (mode: "create" | "edit", row?: Record<string, unknown>) => {
    if (mode === "create" && isReadOnly) {
      toast.error("View only mode: adding records is disabled.");
      return;
    }
    const next: Record<string, unknown> = {};
    visibleFields.forEach((field) => {
      if (mode === "edit" && row) {
        const raw = row[field.key];
        if (field.type === "datetime") next[field.key] = toLocalDateTime(raw);
        else if (field.type === "json") next[field.key] = raw ? JSON.stringify(raw) : "";
        else next[field.key] = raw ?? defaultValue(field);
      } else {
        next[field.key] = defaultValue(field);
      }
    });
    if (isCurrencyManageMode && resource === "exchange-rates") {
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
      if (isCurrencyManageMode && resource === "exchange-rates") {
        payload.baseCurrencyId = managedCurrencyId;
      }
      if (dialog.mode === "create") {
        await createCurrencyRecord(resource, payload);
        toast.success("Record created.");
      } else if (dialog.row?.id) {
        await updateCurrencyRecord(resource, String(dialog.row.id), payload);
        toast.success("Record updated.");
      }
      setDialog({ open: false, mode: "create", row: null });
      await Promise.all([load(), loadLookups()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save record.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row: Record<string, unknown>) => {
    if (!row.id) return;
    if (!window.confirm("Delete this record?")) return;
    try {
      setSaving(true);
      await deleteCurrencyRecord(resource, String(row.id));
      toast.success("Record deleted.");
      await Promise.all([load(), loadLookups()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{META[resource].title}</CardTitle>
            <CardDescription>
              {META[resource].description}
              {isCurrencyManageMode && managedCurrency
                ? ` Managing: ${managedCurrency.code} - ${managedCurrency.name}`
                : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isCurrencyManageMode ? (
              <Button variant="outline" asChild>
                <Link href="/master-data/currencies">Back to Currencies</Link>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => void Promise.all([load(), loadLookups()])}>
              <RefreshCw className="mr-2 size-4" />
              Refresh
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
        </div>

        <Tabs value={resource} onValueChange={(value) => setResource(value as CurrencyResourceKey)}>
          <div className="master-tabs-scroll">
            <TabsList className="master-tabs-list">
              {visibleResources.map((key) => (
                <TabsTrigger key={key} value={key} className="master-tab-trigger">
                  {META[key].title}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </CardHeader>

      <CardContent className="space-y-4">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="max-w-md" />

        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS[resource].map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={COLUMNS[resource].length + 1} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS[resource].length + 1} className="text-center text-muted-foreground">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              records.map((row) => (
                <TableRow key={String(row.id)}>
                  {COLUMNS[resource].map((column) => (
                    <TableCell key={column.key}>
                      {column.key === "isActive" ? (
                        <Badge variant={row.isActive ? "default" : "secondary"}>
                          {row.isActive ? "Active" : "Inactive"}
                        </Badge>
                      ) : (
                        formatCell(row[column.key], lookups)
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {resource === "currencies" && row.id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="master-manage-btn"
                          asChild
                        >
                          <Link href={`/master-data/currencies/manage/${row.id}`}>
                            <Settings2 className="mr-1 size-4" />
                            Manage
                          </Link>
                        </Button>
                      ) : null}
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
      </CardContent>

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{dialog.mode === "create" ? "Add" : "Edit"} Record</DialogTitle>
            <DialogDescription>Fill required fields and save.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[62vh] grid-cols-1 gap-3 overflow-x-hidden overflow-y-auto px-1 md:grid-cols-2">
            {visibleFields.map((field) => (
              <div key={field.key} className={`min-w-0 space-y-2 ${field.type === "json" ? "md:col-span-2" : ""}`}>
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
                  />
                ) : (
                  <Input
                    type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"}
                    value={String(form[field.key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialog({ open: false, mode: "create", row: null })}>
              Cancel
            </Button>
            <Button onClick={() => void onSubmit()} disabled={saving || (isReadOnly && dialog.mode === "create")}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
