"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
import {
  createTaxRecord,
  deleteTaxRecord,
  listTaxRecords,
  updateTaxRecord,
} from "@/modules/tax/lib/tax-api";
import type { TaxManagementInitialData } from "@/modules/tax/shared/tax-management-types";
import {
  TAX_META,
  type TaxField,
  type TaxResourceKey,
} from "@/modules/tax/ui/components/tax-management/tax-management-config";
import {
  getDefaultTaxFieldValue,
  toIsoDateTime,
  toLocalDateTime,
} from "@/modules/tax/ui/components/tax-management/tax-management-utils";

type UseTaxManagementOptions = {
  initialResource?: TaxResourceKey;
  managedTaxId?: string;
  initialData?: TaxManagementInitialData | null;
  isReadOnly: boolean;
};

export function useTaxManagement({
  initialResource = "taxes",
  managedTaxId = "",
  initialData = null,
  isReadOnly,
}: UseTaxManagementOptions) {
  const confirm = useConfirm();
  const skipInitialRecordsLoadRef = useRef(
    Boolean(initialData && initialData.resource === initialResource)
  );
  const skipInitialLookupsLoadRef = useRef(Boolean(initialData));
  const [resource, setResource] = useState<TaxResourceKey>(initialResource);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Array<Record<string, unknown>>>(initialData?.records ?? []);
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [taxes, setTaxes] = useState<Array<Record<string, unknown>>>(initialData?.taxes ?? []);
  const [jurisdictions, setJurisdictions] = useState<Array<Record<string, unknown>>>(
    initialData?.jurisdictions ?? []
  );
  const [currencies, setCurrencies] = useState<Array<Record<string, unknown>>>(
    initialData?.currencies ?? []
  );
  const [ruleSets, setRuleSets] = useState<Array<Record<string, unknown>>>(
    initialData?.ruleSets ?? []
  );
  const [rules, setRules] = useState<Array<Record<string, unknown>>>(initialData?.rules ?? []);
  const [snapshots, setSnapshots] = useState<Array<Record<string, unknown>>>(
    initialData?.snapshots ?? []
  );
  const [dialog, setDialog] = useState<{ open: boolean; mode: "create" | "edit"; row: Record<string, unknown> | null }>({ open: false, mode: "create", row: null });
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const isTaxManageMode = Boolean(managedTaxId);
  const taxScopedResources: TaxResourceKey[] = useMemo(() => ["tax-rates", "tax-rule-taxes"], []);

  const lookups = useMemo(() => {
    const items: Array<[string, string]> = [];
    taxes.forEach((item) => items.push([String(item.id), `${item.code} - ${item.name}`]));
    jurisdictions.forEach((item) => items.push([String(item.id), `${item.code} - ${item.name}`]));
    currencies.forEach((item) => items.push([String(item.id), `${item.code} - ${item.name}`]));
    ruleSets.forEach((item) => items.push([String(item.id), `${item.code} - ${item.name}`]));
    rules.forEach((item) => items.push([String(item.id), `${item.code} - ${item.name}`]));
    snapshots.forEach((item) => items.push([String(item.id), `${item.code} - ${item.documentType}`]));
    return Object.fromEntries(items);
  }, [currencies, jurisdictions, ruleSets, rules, snapshots, taxes]);

  const fields = useMemo<TaxField[]>(() => {
    const taxOptions = taxes.map((item) => ({ value: String(item.id), label: `${item.code} - ${item.name}` }));
    const jurisdictionOptions = jurisdictions.map((item) => ({ value: String(item.id), label: `${item.code} - ${item.name}` }));
    const currencyOptions = currencies.map((item) => ({ value: String(item.id), label: `${item.code} - ${item.name}` }));
    const ruleSetOptions = ruleSets.map((item) => ({ value: String(item.id), label: `${item.code} - ${item.name}` }));
    const ruleOptions = rules.map((item) => ({ value: String(item.id), label: `${item.code} - ${item.name}` }));
    const snapshotOptions = snapshots.map((item) => ({ value: String(item.id), label: `${item.code} - ${item.documentType}` }));

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
          { key: "taxType", label: "Tax Type", type: "select", defaultValue: "VAT", options: [{ label: "VAT", value: "VAT" }, { label: "LEVY", value: "LEVY" }, { label: "SERVICE_CHARGE", value: "SERVICE_CHARGE" }, { label: "CITY_TAX", value: "CITY_TAX" }, { label: "WITHHOLDING", value: "WITHHOLDING" }, { label: "OTHER", value: "OTHER" }] },
          { key: "scope", label: "Scope", type: "select", defaultValue: "OUTPUT", options: [{ label: "OUTPUT", value: "OUTPUT" }, { label: "INPUT", value: "INPUT" }, { label: "WITHHOLDING", value: "WITHHOLDING" }] },
          { key: "isRecoverable", label: "Recoverable", type: "boolean", defaultValue: false },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "tax-rates":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "taxId", label: "Tax", type: "select", required: true, options: taxOptions },
          { key: "jurisdictionId", label: "Jurisdiction", type: "select", required: true, options: jurisdictionOptions },
          { key: "rateType", label: "Rate Type", type: "select", defaultValue: "PERCENT", options: [{ label: "PERCENT", value: "PERCENT" }, { label: "FIXED", value: "FIXED" }] },
          { key: "ratePercent", label: "Rate Percent", type: "number", nullable: true },
          { key: "rateAmount", label: "Rate Amount", type: "number", nullable: true },
          { key: "currencyId", label: "Currency", type: "select", options: currencyOptions, nullable: true },
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
          { key: "ruleSetId", label: "Rule Set", type: "select", options: ruleSetOptions, nullable: true },
          { key: "name", label: "Name", type: "text", required: true },
          { key: "jurisdictionId", label: "Jurisdiction", type: "select", required: true, options: jurisdictionOptions },
          { key: "serviceType", label: "Service Type", type: "select", defaultValue: "MISC", options: [{ label: "TRANSPORT", value: "TRANSPORT" }, { label: "ACTIVITY", value: "ACTIVITY" }, { label: "HOTEL", value: "HOTEL" }, { label: "PACKAGE", value: "PACKAGE" }, { label: "MISC", value: "MISC" }, { label: "SUPPLEMENT", value: "SUPPLEMENT" }] },
          { key: "customerType", label: "Customer Type", type: "select", defaultValue: "B2C", options: [{ label: "B2C", value: "B2C" }, { label: "B2B", value: "B2B" }] },
          { key: "travelerResidency", label: "Traveler Residency", type: "select", defaultValue: "ANY", options: [{ label: "ANY", value: "ANY" }, { label: "LOCAL", value: "LOCAL" }, { label: "FOREIGNER", value: "FOREIGNER" }] },
          { key: "taxInclusion", label: "Tax Inclusion", type: "select", defaultValue: "INHERIT", options: [{ label: "INHERIT", value: "INHERIT" }, { label: "INCLUSIVE", value: "INCLUSIVE" }, { label: "EXCLUSIVE", value: "EXCLUSIVE" }] },
          { key: "effectiveFrom", label: "Effective From", type: "datetime", required: true },
          { key: "effectiveTo", label: "Effective To", type: "datetime", nullable: true },
          { key: "priority", label: "Priority", type: "number", defaultValue: 1 },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "tax-rule-taxes":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "ruleId", label: "Tax Rule", type: "select", required: true, options: ruleOptions },
          { key: "taxId", label: "Tax", type: "select", required: true, options: taxOptions },
          { key: "priority", label: "Priority", type: "number", defaultValue: 1 },
          { key: "applyOn", label: "Apply On", type: "select", defaultValue: "BASE", options: [{ label: "BASE", value: "BASE" }, { label: "BASE_PLUS_PREVIOUS_TAXES", value: "BASE_PLUS_PREVIOUS_TAXES" }] },
          { key: "isInclusive", label: "Inclusive", type: "boolean", defaultValue: false },
          { key: "roundingMode", label: "Rounding Mode", type: "select", defaultValue: "HALF_UP", options: [{ label: "HALF_UP", value: "HALF_UP" }, { label: "HALF_DOWN", value: "HALF_DOWN" }, { label: "UP", value: "UP" }, { label: "DOWN", value: "DOWN" }, { label: "BANKERS", value: "BANKERS" }] },
          { key: "roundingScale", label: "Rounding Scale", type: "number", defaultValue: 2 },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "document-fx-snapshots":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "documentType", label: "Document Type", type: "select", required: true, options: [{ label: "QUOTATION", value: "QUOTATION" }, { label: "BOOKING", value: "BOOKING" }, { label: "INVOICE", value: "INVOICE" }] },
          { key: "documentId", label: "Document ID", type: "text", required: true },
          { key: "baseCurrencyId", label: "Base Currency", type: "select", required: true, options: currencyOptions },
          { key: "quoteCurrencyId", label: "Quote Currency", type: "select", required: true, options: currencyOptions },
          { key: "rate", label: "Rate", type: "number", required: true },
          { key: "asOf", label: "As Of", type: "datetime", required: true },
          { key: "providerCode", label: "Provider Code", type: "text", nullable: true },
        ];
      case "document-tax-snapshots":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "documentType", label: "Document Type", type: "select", required: true, options: [{ label: "QUOTATION", value: "QUOTATION" }, { label: "BOOKING", value: "BOOKING" }, { label: "INVOICE", value: "INVOICE" }] },
          { key: "documentId", label: "Document ID", type: "text", required: true },
          { key: "jurisdictionCode", label: "Jurisdiction Code", type: "text", required: true },
          { key: "priceMode", label: "Price Mode", type: "select", required: true, options: [{ label: "INCLUSIVE", value: "INCLUSIVE" }, { label: "EXCLUSIVE", value: "EXCLUSIVE" }] },
          { key: "currencyCode", label: "Currency Code", type: "text", required: true },
          { key: "taxableAmount", label: "Taxable Amount", type: "number", required: true },
          { key: "taxAmount", label: "Tax Amount", type: "number", required: true },
          { key: "totalAmount", label: "Total Amount", type: "number", required: true },
        ];
      case "document-tax-lines":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "snapshotId", label: "Tax Snapshot", type: "select", required: true, options: snapshotOptions },
          { key: "taxCode", label: "Tax Code", type: "text", required: true },
          { key: "taxName", label: "Tax Name", type: "text", required: true },
          { key: "rateType", label: "Rate Type", type: "select", required: true, options: [{ label: "PERCENT", value: "PERCENT" }, { label: "FIXED", value: "FIXED" }] },
          { key: "ratePercent", label: "Rate Percent", type: "number", nullable: true },
          { key: "rateAmount", label: "Rate Amount", type: "number", nullable: true },
          { key: "applyOn", label: "Apply On", type: "select", required: true, options: [{ label: "BASE", value: "BASE" }, { label: "BASE_PLUS_PREVIOUS_TAXES", value: "BASE_PLUS_PREVIOUS_TAXES" }] },
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

  const visibleResources = useMemo(
    () =>
      !isTaxManageMode
        ? (["taxes", "tax-jurisdictions", "tax-rule-sets", "tax-rules"] as TaxResourceKey[])
        : taxScopedResources,
    [isTaxManageMode, taxScopedResources]
  );

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
      const response = await fetch("/api/currencies/currencies?limit=500", { cache: "no-store" });
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
      notify.error(error instanceof Error ? error.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [isTaxManageMode, managedTaxId, query, resource, taxScopedResources]);

  useEffect(() => {
    if (skipInitialLookupsLoadRef.current) {
      skipInitialLookupsLoadRef.current = false;
      return;
    }
    void Promise.all([loadLookups(), loadCurrencies()]);
  }, [loadCurrencies, loadLookups]);

  useEffect(() => {
    if (
      skipInitialRecordsLoadRef.current &&
      resource === initialResource &&
      query.length === 0
    ) {
      skipInitialRecordsLoadRef.current = false;
      return;
    }
    void load();
  }, [initialResource, load, query.length, resource]);

  useEffect(() => {
    if (!visibleResources.includes(resource)) {
      setResource(visibleResources[0]);
    }
  }, [resource, visibleResources]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(records.length / pageSize)), [records.length, pageSize]);
  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [records, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [resource, query, pageSize, managedTaxId]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const refreshAll = useCallback(async () => {
    await Promise.all([load(), loadLookups(), loadCurrencies()]);
  }, [load, loadCurrencies, loadLookups]);

  const openDialog = useCallback((mode: "create" | "edit", row?: Record<string, unknown>) => {
    if (mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    const next: Record<string, unknown> = {};
    visibleFields.forEach((field) => {
      if (mode === "edit" && row) {
        const raw = row[field.key];
        if (field.type === "datetime") next[field.key] = toLocalDateTime(raw);
        else next[field.key] = raw ?? getDefaultTaxFieldValue(field);
      } else {
        next[field.key] = getDefaultTaxFieldValue(field);
      }
    });
    if (isTaxManageMode && taxScopedResources.includes(resource)) next.taxId = managedTaxId;
    setForm(next);
    setDialog({ open: true, mode, row: row ?? null });
  }, [isReadOnly, isTaxManageMode, managedTaxId, resource, taxScopedResources, visibleFields]);

  const onSubmit = useCallback(async () => {
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
        else if (["code", "countryCode", "currencyCode", "taxCode", "jurisdictionCode"].includes(field.key) && typeof value === "string") {
          payload[field.key] = value.toUpperCase().trim();
        } else payload[field.key] = value;
      });
      if (isTaxManageMode && taxScopedResources.includes(resource)) payload.taxId = managedTaxId;

      if (dialog.mode === "create") {
        await createTaxRecord(resource, payload);
        notify.success("Record created.");
      } else if (dialog.row?.id) {
        await updateTaxRecord(resource, String(dialog.row.id), payload);
        notify.success("Record updated.");
      }
      setDialog({ open: false, mode: "create", row: null });
      await refreshAll();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save record.");
    } finally {
      setSaving(false);
    }
  }, [dialog.mode, dialog.row, form, isTaxManageMode, managedTaxId, refreshAll, resource, taxScopedResources, visibleFields]);

  const onDelete = useCallback(async (row: Record<string, unknown>) => {
    if (isReadOnly) {
      notify.warning("View only mode: deleting records is disabled.");
      return;
    }
    if (!row.id) return;
    const targetLabel = String(row.code ?? "").trim() || String(row.name ?? "").trim() || String(row.taxName ?? "").trim() || String(row.id);
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
      await deleteTaxRecord(resource, String(row.id));
      notify.success("Record deleted.");
      await refreshAll();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete record.");
    } finally {
      setSaving(false);
    }
  }, [confirm, isReadOnly, refreshAll, resource]);

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
    lookups,
    visibleFields,
    visibleResources,
    managedTax,
    isTaxManageMode,
    refreshAll,
    openDialog,
    onSubmit,
    onDelete,
    meta: TAX_META[resource],
  };
}
