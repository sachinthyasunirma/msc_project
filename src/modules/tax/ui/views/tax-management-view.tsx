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
import { authClient } from "@/lib/auth-client";
import {
  createTaxRecord,
  deleteTaxRecord,
  listTaxRecords,
  updateTaxRecord,
} from "@/modules/tax/lib/tax-api";

export type TaxResourceKey =
  | "tax-jurisdictions"
  | "taxes"
  | "tax-rates"
  | "tax-rule-sets"
  | "tax-rules"
  | "tax-rule-taxes"
  | "document-fx-snapshots"
  | "document-tax-snapshots"
  | "document-tax-lines";

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "datetime";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number | boolean;
  nullable?: boolean;
};

const META: Record<TaxResourceKey, { title: string; description: string }> = {
  "tax-jurisdictions": {
    title: "Tax Jurisdictions",
    description: "Country/region/city level jurisdiction master data.",
  },
  taxes: {
    title: "Taxes",
    description: "Tax definitions such as VAT, levy and withholding.",
  },
  "tax-rates": {
    title: "Tax Rates",
    description: "Tax rates per jurisdiction with effective dates.",
  },
  "tax-rule-sets": {
    title: "Tax Rule Sets",
    description: "Versioned collections of tax rules.",
  },
  "tax-rules": {
    title: "Tax Rules",
    description: "Matching rules by service type, customer and residency.",
  },
  "tax-rule-taxes": {
    title: "Tax Rule Taxes",
    description: "Tax application order and inclusion behavior per rule.",
  },
  "document-fx-snapshots": {
    title: "Document FX Snapshots",
    description: "FX rates frozen against quote/booking/invoice documents.",
  },
  "document-tax-snapshots": {
    title: "Document Tax Snapshots",
    description: "Tax totals frozen on commercial documents.",
  },
  "document-tax-lines": {
    title: "Document Tax Lines",
    description: "Detailed line-level taxes linked to tax snapshots.",
  },
};

const COLUMNS: Record<TaxResourceKey, Array<{ key: string; label: string }>> = {
  "tax-jurisdictions": [
    { key: "code", label: "Code" },
    { key: "countryCode", label: "Country" },
    { key: "name", label: "Name" },
    { key: "region", label: "Region" },
    { key: "isActive", label: "Status" },
  ],
  taxes: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "taxType", label: "Type" },
    { key: "scope", label: "Scope" },
    { key: "isActive", label: "Status" },
  ],
  "tax-rates": [
    { key: "code", label: "Code" },
    { key: "taxId", label: "Tax" },
    { key: "jurisdictionId", label: "Jurisdiction" },
    { key: "rateType", label: "Rate Type" },
    { key: "ratePercent", label: "Rate %" },
    { key: "rateAmount", label: "Rate Amount" },
    { key: "isActive", label: "Status" },
  ],
  "tax-rule-sets": [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "isActive", label: "Status" },
  ],
  "tax-rules": [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "serviceType", label: "Service" },
    { key: "customerType", label: "Customer" },
    { key: "taxInclusion", label: "Tax Inclusion" },
    { key: "isActive", label: "Status" },
  ],
  "tax-rule-taxes": [
    { key: "code", label: "Code" },
    { key: "ruleId", label: "Rule" },
    { key: "taxId", label: "Tax" },
    { key: "applyOn", label: "Apply On" },
    { key: "priority", label: "Priority" },
    { key: "isActive", label: "Status" },
  ],
  "document-fx-snapshots": [
    { key: "code", label: "Code" },
    { key: "documentType", label: "Document" },
    { key: "documentId", label: "Document ID" },
    { key: "baseCurrencyId", label: "Base Currency" },
    { key: "quoteCurrencyId", label: "Quote Currency" },
    { key: "rate", label: "Rate" },
  ],
  "document-tax-snapshots": [
    { key: "code", label: "Code" },
    { key: "documentType", label: "Document" },
    { key: "documentId", label: "Document ID" },
    { key: "jurisdictionCode", label: "Jurisdiction Code" },
    { key: "taxAmount", label: "Tax Amount" },
    { key: "totalAmount", label: "Total Amount" },
  ],
  "document-tax-lines": [
    { key: "code", label: "Code" },
    { key: "snapshotId", label: "Snapshot" },
    { key: "taxCode", label: "Tax Code" },
    { key: "taxName", label: "Tax Name" },
    { key: "rateType", label: "Rate Type" },
    { key: "taxAmount", label: "Tax Amount" },
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
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export function TaxManagementView({
  initialResource = "tax-jurisdictions",
  managedTaxId = "",
}: {
  initialResource?: TaxResourceKey;
  managedTaxId?: string;
}) {
  const { data: session } = authClient.useSession();
  const isReadOnly = Boolean((session?.user as { readOnly?: boolean } | undefined)?.readOnly);

  const [resource, setResource] = useState<TaxResourceKey>(initialResource);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taxes, setTaxes] = useState<Array<Record<string, unknown>>>([]);
  const [jurisdictions, setJurisdictions] = useState<Array<Record<string, unknown>>>([]);
  const [currencies, setCurrencies] = useState<Array<Record<string, unknown>>>([]);
  const [ruleSets, setRuleSets] = useState<Array<Record<string, unknown>>>([]);
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [snapshots, setSnapshots] = useState<Array<Record<string, unknown>>>([]);
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    row: Record<string, unknown> | null;
  }>({ open: false, mode: "create", row: null });
  const [form, setForm] = useState<Record<string, unknown>>({});
  const isTaxManageMode = Boolean(managedTaxId);
  const taxScopedResources: TaxResourceKey[] = useMemo(
    () => ["tax-rates", "tax-rule-taxes"],
    []
  );

  const lookups = useMemo(() => {
    const items: Array<[string, string]> = [];
    taxes.forEach((item) => items.push([String(item.id), `${item.code} - ${item.name}`]));
    jurisdictions.forEach((item) => items.push([String(item.id), `${item.code} - ${item.name}`]));
    currencies.forEach((item) => items.push([String(item.id), `${item.code} - ${item.name}`]));
    ruleSets.forEach((item) => items.push([String(item.id), `${item.code} - ${item.name}`]));
    rules.forEach((item) => items.push([String(item.id), `${item.code} - ${item.name}`]));
    snapshots.forEach((item) =>
      items.push([String(item.id), `${item.code} - ${item.documentType}`])
    );
    return Object.fromEntries(items);
  }, [currencies, jurisdictions, ruleSets, rules, snapshots, taxes]);

  const fields = useMemo<Field[]>(() => {
    const taxOptions = taxes.map((item) => ({
      value: String(item.id),
      label: `${item.code} - ${item.name}`,
    }));
    const jurisdictionOptions = jurisdictions.map((item) => ({
      value: String(item.id),
      label: `${item.code} - ${item.name}`,
    }));
    const currencyOptions = currencies.map((item) => ({
      value: String(item.id),
      label: `${item.code} - ${item.name}`,
    }));
    const ruleSetOptions = ruleSets.map((item) => ({
      value: String(item.id),
      label: `${item.code} - ${item.name}`,
    }));
    const ruleOptions = rules.map((item) => ({
      value: String(item.id),
      label: `${item.code} - ${item.name}`,
    }));
    const snapshotOptions = snapshots.map((item) => ({
      value: String(item.id),
      label: `${item.code} - ${item.documentType}`,
    }));

    switch (resource) {
      case "tax-jurisdictions":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "countryCode", label: "Country Code", type: "text", required: true },
          { key: "region", label: "Region", type: "text", nullable: true },
          { key: "city", label: "City", type: "text", nullable: true },
          { key: "name", label: "Name", type: "text", required: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];

      case "taxes":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "name", label: "Name", type: "text", required: true },
          { key: "description", label: "Description", type: "text", nullable: true },
          {
            key: "taxType",
            label: "Tax Type",
            type: "select",
            defaultValue: "VAT",
            options: [
              { label: "VAT", value: "VAT" },
              { label: "LEVY", value: "LEVY" },
              { label: "SERVICE_CHARGE", value: "SERVICE_CHARGE" },
              { label: "CITY_TAX", value: "CITY_TAX" },
              { label: "WITHHOLDING", value: "WITHHOLDING" },
              { label: "OTHER", value: "OTHER" },
            ],
          },
          {
            key: "scope",
            label: "Scope",
            type: "select",
            defaultValue: "OUTPUT",
            options: [
              { label: "OUTPUT", value: "OUTPUT" },
              { label: "INPUT", value: "INPUT" },
              { label: "WITHHOLDING", value: "WITHHOLDING" },
            ],
          },
          {
            key: "isRecoverable",
            label: "Recoverable",
            type: "boolean",
            defaultValue: false,
          },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];

      case "tax-rates":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "taxId",
            label: "Tax",
            type: "select",
            required: true,
            options: taxOptions,
          },
          {
            key: "jurisdictionId",
            label: "Jurisdiction",
            type: "select",
            required: true,
            options: jurisdictionOptions,
          },
          {
            key: "rateType",
            label: "Rate Type",
            type: "select",
            defaultValue: "PERCENT",
            options: [
              { label: "PERCENT", value: "PERCENT" },
              { label: "FIXED", value: "FIXED" },
            ],
          },
          { key: "ratePercent", label: "Rate Percent", type: "number", nullable: true },
          { key: "rateAmount", label: "Rate Amount", type: "number", nullable: true },
          {
            key: "currencyId",
            label: "Currency",
            type: "select",
            options: currencyOptions,
            nullable: true,
          },
          { key: "effectiveFrom", label: "Effective From", type: "datetime", required: true },
          { key: "effectiveTo", label: "Effective To", type: "datetime", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];

      case "tax-rule-sets":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "name", label: "Name", type: "text", required: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];

      case "tax-rules":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "ruleSetId",
            label: "Rule Set",
            type: "select",
            options: ruleSetOptions,
            nullable: true,
          },
          { key: "name", label: "Name", type: "text", required: true },
          {
            key: "jurisdictionId",
            label: "Jurisdiction",
            type: "select",
            required: true,
            options: jurisdictionOptions,
          },
          {
            key: "serviceType",
            label: "Service Type",
            type: "select",
            defaultValue: "MISC",
            options: [
              { label: "TRANSPORT", value: "TRANSPORT" },
              { label: "ACTIVITY", value: "ACTIVITY" },
              { label: "HOTEL", value: "HOTEL" },
              { label: "PACKAGE", value: "PACKAGE" },
              { label: "MISC", value: "MISC" },
              { label: "SUPPLEMENT", value: "SUPPLEMENT" },
            ],
          },
          {
            key: "customerType",
            label: "Customer Type",
            type: "select",
            defaultValue: "B2C",
            options: [
              { label: "B2C", value: "B2C" },
              { label: "B2B", value: "B2B" },
            ],
          },
          {
            key: "travelerResidency",
            label: "Traveler Residency",
            type: "select",
            defaultValue: "ANY",
            options: [
              { label: "ANY", value: "ANY" },
              { label: "LOCAL", value: "LOCAL" },
              { label: "FOREIGNER", value: "FOREIGNER" },
            ],
          },
          {
            key: "taxInclusion",
            label: "Tax Inclusion",
            type: "select",
            defaultValue: "INHERIT",
            options: [
              { label: "INHERIT", value: "INHERIT" },
              { label: "INCLUSIVE", value: "INCLUSIVE" },
              { label: "EXCLUSIVE", value: "EXCLUSIVE" },
            ],
          },
          { key: "effectiveFrom", label: "Effective From", type: "datetime", required: true },
          { key: "effectiveTo", label: "Effective To", type: "datetime", nullable: true },
          { key: "priority", label: "Priority", type: "number", defaultValue: 1 },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];

      case "tax-rule-taxes":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "ruleId",
            label: "Tax Rule",
            type: "select",
            required: true,
            options: ruleOptions,
          },
          {
            key: "taxId",
            label: "Tax",
            type: "select",
            required: true,
            options: taxOptions,
          },
          { key: "priority", label: "Priority", type: "number", defaultValue: 1 },
          {
            key: "applyOn",
            label: "Apply On",
            type: "select",
            defaultValue: "BASE",
            options: [
              { label: "BASE", value: "BASE" },
              { label: "BASE_PLUS_PREVIOUS_TAXES", value: "BASE_PLUS_PREVIOUS_TAXES" },
            ],
          },
          {
            key: "isInclusive",
            label: "Inclusive",
            type: "boolean",
            defaultValue: false,
          },
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
          {
            key: "roundingScale",
            label: "Rounding Scale",
            type: "number",
            defaultValue: 2,
          },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];

      case "document-fx-snapshots":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "documentType",
            label: "Document Type",
            type: "select",
            required: true,
            options: [
              { label: "QUOTATION", value: "QUOTATION" },
              { label: "BOOKING", value: "BOOKING" },
              { label: "INVOICE", value: "INVOICE" },
            ],
          },
          { key: "documentId", label: "Document ID", type: "text", required: true },
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
          { key: "providerCode", label: "Provider Code", type: "text", nullable: true },
        ];

      case "document-tax-snapshots":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "documentType",
            label: "Document Type",
            type: "select",
            required: true,
            options: [
              { label: "QUOTATION", value: "QUOTATION" },
              { label: "BOOKING", value: "BOOKING" },
              { label: "INVOICE", value: "INVOICE" },
            ],
          },
          { key: "documentId", label: "Document ID", type: "text", required: true },
          {
            key: "jurisdictionCode",
            label: "Jurisdiction Code",
            type: "text",
            required: true,
          },
          {
            key: "priceMode",
            label: "Price Mode",
            type: "select",
            required: true,
            options: [
              { label: "INCLUSIVE", value: "INCLUSIVE" },
              { label: "EXCLUSIVE", value: "EXCLUSIVE" },
            ],
          },
          { key: "currencyCode", label: "Currency Code", type: "text", required: true },
          { key: "taxableAmount", label: "Taxable Amount", type: "number", required: true },
          { key: "taxAmount", label: "Tax Amount", type: "number", required: true },
          { key: "totalAmount", label: "Total Amount", type: "number", required: true },
        ];

      case "document-tax-lines":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "snapshotId",
            label: "Tax Snapshot",
            type: "select",
            required: true,
            options: snapshotOptions,
          },
          { key: "taxCode", label: "Tax Code", type: "text", required: true },
          { key: "taxName", label: "Tax Name", type: "text", required: true },
          {
            key: "rateType",
            label: "Rate Type",
            type: "select",
            required: true,
            options: [
              { label: "PERCENT", value: "PERCENT" },
              { label: "FIXED", value: "FIXED" },
            ],
          },
          { key: "ratePercent", label: "Rate Percent", type: "number", nullable: true },
          { key: "rateAmount", label: "Rate Amount", type: "number", nullable: true },
          {
            key: "applyOn",
            label: "Apply On",
            type: "select",
            required: true,
            options: [
              { label: "BASE", value: "BASE" },
              { label: "BASE_PLUS_PREVIOUS_TAXES", value: "BASE_PLUS_PREVIOUS_TAXES" },
            ],
          },
          { key: "priority", label: "Priority", type: "number", required: true },
          { key: "taxBase", label: "Tax Base", type: "number", required: true },
          { key: "taxAmount", label: "Tax Amount", type: "number", required: true },
        ];

      default:
        return [];
    }
  }, [currencies, jurisdictions, resource, ruleSets, rules, snapshots, taxes]);

  const visibleFields = useMemo(
    () =>
      isTaxManageMode && taxScopedResources.includes(resource)
        ? fields.filter((field) => field.key !== "taxId")
        : fields,
    [fields, isTaxManageMode, resource, taxScopedResources]
  );

  const visibleResources = useMemo(() => {
    if (!isTaxManageMode) {
      return ["taxes", "tax-jurisdictions", "tax-rule-sets", "tax-rules"] as TaxResourceKey[];
    }
    return taxScopedResources;
  }, [isTaxManageMode, taxScopedResources]);

  const managedTax = useMemo(
    () => taxes.find((tax) => String(tax.id) === managedTaxId) ?? null,
    [managedTaxId, taxes]
  );

  const loadLookups = useCallback(async () => {
    try {
      const [taxList, jurisdictionList, ruleSetList, ruleList, snapshotList] =
        await Promise.all([
          listTaxRecords("taxes", { limit: 500 }),
          listTaxRecords("tax-jurisdictions", { limit: 500 }),
          listTaxRecords("tax-rule-sets", { limit: 500 }),
          listTaxRecords("tax-rules", { limit: 500 }),
          listTaxRecords("document-tax-snapshots", { limit: 500 }),
        ]);
      setTaxes(taxList);
      setJurisdictions(jurisdictionList);
      setRuleSets(ruleSetList);
      setRules(ruleList);
      setSnapshots(snapshotList);
    } catch {
      setTaxes([]);
      setJurisdictions([]);
      setCurrencies([]);
      setRuleSets([]);
      setRules([]);
      setSnapshots([]);
    }
  }, []);

  const loadCurrencies = useCallback(async () => {
    try {
      const response = await fetch("/api/currencies/currencies?limit=500", {
        cache: "no-store",
      });
      const payload = (await response.json()) as Array<Record<string, unknown>>;
      if (response.ok) setCurrencies(payload);
    } catch {
      setCurrencies([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listTaxRecords(resource, {
        q: query || undefined,
        limit: 500,
        taxId: isTaxManageMode && taxScopedResources.includes(resource) ? managedTaxId : undefined,
      });
      setRecords(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [isTaxManageMode, managedTaxId, query, resource, taxScopedResources]);

  useEffect(() => {
    void Promise.all([loadLookups(), loadCurrencies()]);
  }, [loadCurrencies, loadLookups]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!visibleResources.includes(resource)) {
      setResource(visibleResources[0]);
    }
  }, [resource, visibleResources]);

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
        else next[field.key] = raw ?? defaultValue(field);
      } else {
        next[field.key] = defaultValue(field);
      }
    });
    if (isTaxManageMode && taxScopedResources.includes(resource)) {
      next.taxId = managedTaxId;
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
        else if (field.type === "datetime") payload[field.key] = toIsoDateTime(value);
        else if (
          ["code", "countryCode", "currencyCode", "taxCode", "jurisdictionCode"].includes(
            field.key
          ) &&
          typeof value === "string"
        ) {
          payload[field.key] = value.toUpperCase().trim();
        } else {
          payload[field.key] = value;
        }
      });
      if (isTaxManageMode && taxScopedResources.includes(resource)) {
        payload.taxId = managedTaxId;
      }

      if (dialog.mode === "create") {
        await createTaxRecord(resource, payload);
        toast.success("Record created.");
      } else if (dialog.row?.id) {
        await updateTaxRecord(resource, String(dialog.row.id), payload);
        toast.success("Record updated.");
      }
      setDialog({ open: false, mode: "create", row: null });
      await Promise.all([load(), loadLookups(), loadCurrencies()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save record.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row: Record<string, unknown>) => {
    if (isReadOnly) {
      toast.error("View only mode: deleting records is disabled.");
      return;
    }
    if (!row.id) return;
    if (!window.confirm("Delete this record?")) return;
    try {
      setSaving(true);
      await deleteTaxRecord(resource, String(row.id));
      toast.success("Record deleted.");
      await Promise.all([load(), loadLookups(), loadCurrencies()]);
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
              {isTaxManageMode && managedTax
                ? ` Managing: ${managedTax.code} - ${managedTax.name}`
                : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isTaxManageMode ? (
              <Button variant="outline" asChild>
                <Link href="/master-data/taxes">Back to Taxes</Link>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => void Promise.all([load(), loadLookups(), loadCurrencies()])}>
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

        <Tabs value={resource} onValueChange={(value) => setResource(value as TaxResourceKey)}>
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
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search..."
          className="max-w-md"
        />

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
                      {resource === "taxes" && row.id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="master-manage-btn"
                          asChild
                        >
                          <Link href={`/master-data/taxes/manage/${row.id}`}>
                            <Settings2 className="mr-1 size-4" />
                            Manage
                          </Link>
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog("edit", row)}
                        disabled={isReadOnly}
                        title={isReadOnly ? "View only mode" : undefined}
                      >
                        <Edit3 className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void onDelete(row)}
                        disabled={isReadOnly}
                        title={isReadOnly ? "View only mode" : undefined}
                      >
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
        <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{dialog.mode === "create" ? "Add" : "Edit"} Record</DialogTitle>
            <DialogDescription>Fill required fields and save.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[68vh] grid-cols-1 gap-3 overflow-x-hidden overflow-y-auto px-1 md:grid-cols-2 lg:grid-cols-3">
            {visibleFields.map((field) => (
              <div key={field.key} className="min-w-0 space-y-2">
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
                      {Boolean(form[field.key]) ? "Enabled" : "Disabled"}
                    </span>
                    <Switch
                      checked={Boolean(form[field.key])}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, [field.key]: checked }))
                      }
                    />
                  </div>
                ) : (
                  <Input
                    type={
                      field.type === "number"
                        ? "number"
                        : field.type === "datetime"
                          ? "datetime-local"
                          : "text"
                    }
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
