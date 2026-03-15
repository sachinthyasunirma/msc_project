"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/app-confirm-provider";
import { listCurrencyRecords } from "@/modules/currency/lib/currency-api";
import {
  buildGuideRecordsParams,
  guideKeys,
} from "@/modules/guides/lib/guides-query";
import {
  createGuideRecord,
  deleteGuideRecord,
  listGuideRecords,
  updateGuideRecord,
} from "@/modules/guides/lib/guides-api";
import type { GuideResourceKey } from "@/modules/guides/shared/guides-management-config";
import type { GuidesManagementInitialData } from "@/modules/guides/shared/guides-management-types";
import { listTransportRecords } from "@/modules/transport/lib/transport-api";
import { notify } from "@/lib/notify";

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "datetime" | "json";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number | boolean;
  nullable?: boolean;
};

type UseGuidesManagementOptions = {
  initialResource?: GuideResourceKey;
  managedGuideId?: string;
  initialData?: GuidesManagementInitialData | null;
  isReadOnly: boolean;
};

const EMPTY_ROWS: Array<Record<string, unknown>> = [];

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
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoDateTime(value: unknown) {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function useGuidesManagement({
  initialResource = "guides",
  managedGuideId = "",
  initialData = null,
  isReadOnly,
}: UseGuidesManagementOptions) {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [resource, setResource] = useState<GuideResourceKey>(initialResource);
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

  const guideScopedResources: GuideResourceKey[] = useMemo(
    () => [
      "guide-rates",
      "guide-languages",
      "guide-coverage-areas",
      "guide-licenses",
      "guide-certifications",
      "guide-documents",
      "guide-weekly-availability",
      "guide-blackout-dates",
      "guide-assignments",
    ],
    []
  );

  const isGuideManageMode = Boolean(managedGuideId);

  useEffect(() => {
    setResource(initialResource);
  }, [initialResource]);

  const lookupsInitialData = initialData
    ? {
        guides: initialData.guides,
        languages: initialData.languages,
        locations: initialData.locations,
        currencies: initialData.currencies,
      }
    : undefined;

  const recordsInput = useMemo(() => {
    const input = buildGuideRecordsParams({
      resource,
      q: query || undefined,
      limit: 200,
    });
    if (isGuideManageMode && guideScopedResources.includes(resource)) {
      input.guideId = managedGuideId;
    }
    return input;
  }, [guideScopedResources, isGuideManageMode, managedGuideId, query, resource]);

  const isDefaultRecordsQuery = resource === initialResource && query.length === 0;

  const {
    data: lookupsData,
    error: lookupsError,
    isFetching: lookupsLoading,
    refetch: refetchLookups,
  } = useQuery({
    queryKey: guideKeys.lookups(),
    queryFn: async () => {
      const [guides, languages, locations, currencies] = await Promise.all([
        listGuideRecords("guides", { limit: 200 }),
        listGuideRecords("languages", { limit: 200 }),
        listTransportRecords("locations", { limit: 200 }),
        listCurrencyRecords("currencies", { limit: 200 }),
      ]);
      return {
        guides,
        languages,
        locations,
        currencies,
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
    queryKey: guideKeys.records({
      resource,
      q: recordsInput.q,
      guideId: recordsInput.guideId,
      limit: recordsInput.limit,
    }),
    queryFn: () => listGuideRecords(resource, recordsInput),
    initialData: isDefaultRecordsQuery ? initialData?.records ?? undefined : undefined,
    placeholderData: keepPreviousData,
  });

  const createGuideMutation = useMutation({
    mutationFn: ({ targetResource, payload }: { targetResource: string; payload: Record<string, unknown> }) =>
      createGuideRecord(targetResource, payload),
  });
  const updateGuideMutation = useMutation({
    mutationFn: ({
      targetResource,
      id,
      payload,
    }: {
      targetResource: string;
      id: string;
      payload: Record<string, unknown>;
    }) => updateGuideRecord(targetResource, id, payload),
  });
  const deleteGuideMutation = useMutation({
    mutationFn: ({ targetResource, id }: { targetResource: string; id: string }) =>
      deleteGuideRecord(targetResource, id),
  });

  const guides = lookupsData?.guides ?? EMPTY_ROWS;
  const languages = lookupsData?.languages ?? EMPTY_ROWS;
  const locations = lookupsData?.locations ?? EMPTY_ROWS;
  const currencies = lookupsData?.currencies ?? EMPTY_ROWS;
  const loading = lookupsLoading || recordsLoading;
  const saving =
    createGuideMutation.isPending ||
    updateGuideMutation.isPending ||
    deleteGuideMutation.isPending;

  useEffect(() => {
    if (!lookupsError) return;
    notify.error(lookupsError instanceof Error ? lookupsError.message : "Failed to load lookup data.");
  }, [lookupsError]);

  useEffect(() => {
    if (!recordsError) return;
    notify.error(recordsError instanceof Error ? recordsError.message : "Failed to load records.");
  }, [recordsError]);

  const lookups = useMemo(() => {
    const items: Array<[string, string]> = [];
    guides.forEach((item) => items.push([String(item.id), `${item.code} - ${item.fullName}`]));
    languages.forEach((item) => items.push([String(item.id), `${item.code} - ${item.name}`]));
    locations.forEach((item) => items.push([String(item.id), `${item.code} - ${item.name}`]));
    currencies.forEach((item) => items.push([String(item.id), `${item.code} - ${item.name}`]));
    return Object.fromEntries(items);
  }, [guides, languages, locations, currencies]);

  const guideExistingCodes = useMemo(
    () =>
      new Set(
        guides
          .map((row) => String(row.code ?? "").trim().toUpperCase())
          .filter((value) => value.length > 0)
      ),
    [guides]
  );

  const currencyByCode = useMemo(
    () =>
      new Map(
        currencies.map((currency) => [
          String(currency.code ?? "").trim().toUpperCase(),
          String(currency.id ?? ""),
        ])
      ),
    [currencies]
  );

  const fields = useMemo<Field[]>(() => {
    const guideOptions = guides.map((item) => ({
      value: String(item.id),
      label: `${item.code} - ${item.fullName}`,
    }));
    const languageOptions = languages.map((item) => ({
      value: String(item.id),
      label: `${item.code} - ${item.name}`,
    }));
    const locationOptions = locations.map((item) => ({
      value: String(item.id),
      label: `${item.code} - ${item.name}`,
    }));
    const currencyOptions = currencies.map((item) => ({
      value: String(item.id),
      label: `${item.code} - ${item.name}`,
    }));

    switch (resource) {
      case "guides":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "guideType", label: "Guide Type", type: "select", defaultValue: "INDIVIDUAL", options: [{ label: "INDIVIDUAL", value: "INDIVIDUAL" }, { label: "COMPANY", value: "COMPANY" }, { label: "INTERNAL", value: "INTERNAL" }] },
          { key: "fullName", label: "Full Name", type: "text", required: true },
          { key: "displayName", label: "Display Name", type: "text", nullable: true },
          { key: "gender", label: "Gender", type: "select", nullable: true, options: [{ label: "Male", value: "MALE" }, { label: "Female", value: "FEMALE" }, { label: "Other", value: "OTHER" }, { label: "Prefer Not To Say", value: "PREFER_NOT_TO_SAY" }] },
          { key: "dob", label: "DOB", type: "datetime", nullable: true },
          { key: "phone", label: "Phone", type: "text", nullable: true },
          { key: "email", label: "Email", type: "text", nullable: true },
          { key: "address", label: "Address", type: "text", nullable: true },
          { key: "countryCode", label: "Country", type: "text", nullable: true },
          { key: "city", label: "City", type: "text", nullable: true },
          { key: "emergencyContact", label: "Emergency Contact JSON", type: "json", nullable: true },
          { key: "bio", label: "Bio", type: "text", nullable: true },
          { key: "yearsExperience", label: "Experience Years", type: "number", defaultValue: 0 },
          { key: "rating", label: "Rating (0-5)", type: "number", nullable: true },
          { key: "baseCurrencyId", label: "Base Currency", type: "select", nullable: true, options: currencyOptions },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "languages":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "name", label: "Name", type: "text", required: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "guide-languages":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "guideId", label: "Guide", type: "select", required: true, options: guideOptions },
          { key: "languageId", label: "Language", type: "select", required: true, options: languageOptions },
          { key: "proficiency", label: "Proficiency", type: "select", defaultValue: "BASIC", options: [{ label: "BASIC", value: "BASIC" }, { label: "INTERMEDIATE", value: "INTERMEDIATE" }, { label: "FLUENT", value: "FLUENT" }, { label: "NATIVE", value: "NATIVE" }] },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "guide-coverage-areas":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "guideId", label: "Guide", type: "select", required: true, options: guideOptions },
          { key: "locationId", label: "Location", type: "select", required: true, options: locationOptions },
          { key: "coverageType", label: "Coverage Type", type: "select", defaultValue: "REGION", options: [{ label: "REGION", value: "REGION" }, { label: "CITY", value: "CITY" }, { label: "SITE", value: "SITE" }, { label: "COUNTRY", value: "COUNTRY" }] },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "guide-licenses":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "guideId", label: "Guide", type: "select", required: true, options: guideOptions },
          { key: "licenseType", label: "License Type", type: "select", required: true, options: [{ label: "NATIONAL_GUIDE", value: "NATIONAL_GUIDE" }, { label: "SITE_GUIDE", value: "SITE_GUIDE" }, { label: "DRIVER_GUIDE", value: "DRIVER_GUIDE" }, { label: "ADVENTURE_INSTRUCTOR", value: "ADVENTURE_INSTRUCTOR" }, { label: "OTHER", value: "OTHER" }] },
          { key: "licenseNumber", label: "License Number", type: "text", required: true },
          { key: "issuedBy", label: "Issued By", type: "text", nullable: true },
          { key: "issuedAt", label: "Issued At", type: "datetime", nullable: true },
          { key: "expiresAt", label: "Expires At", type: "datetime", nullable: true },
          { key: "isVerified", label: "Verified", type: "boolean", defaultValue: false },
          { key: "notes", label: "Notes", type: "text", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "guide-certifications":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "guideId", label: "Guide", type: "select", required: true, options: guideOptions },
          { key: "name", label: "Name", type: "text", required: true },
          { key: "provider", label: "Provider", type: "text", nullable: true },
          { key: "issuedAt", label: "Issued At", type: "datetime", nullable: true },
          { key: "expiresAt", label: "Expires At", type: "datetime", nullable: true },
          { key: "certificateNo", label: "Certificate No", type: "text", nullable: true },
          { key: "notes", label: "Notes", type: "text", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "guide-documents":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "guideId", label: "Guide", type: "select", required: true, options: guideOptions },
          { key: "docType", label: "Doc Type", type: "select", required: true, options: [{ label: "ID", value: "ID" }, { label: "PASSPORT", value: "PASSPORT" }, { label: "LICENSE", value: "LICENSE" }, { label: "CERTIFICATE", value: "CERTIFICATE" }, { label: "CONTRACT", value: "CONTRACT" }, { label: "INSURANCE", value: "INSURANCE" }, { label: "OTHER", value: "OTHER" }] },
          { key: "fileUrl", label: "File URL", type: "text", required: true },
          { key: "fileName", label: "File Name", type: "text", nullable: true },
          { key: "mimeType", label: "MIME Type", type: "text", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "guide-weekly-availability":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "guideId", label: "Guide", type: "select", required: true, options: guideOptions },
          { key: "weekday", label: "Weekday (0-6)", type: "number", required: true },
          { key: "startTime", label: "Start Time (HH:mm)", type: "text", nullable: true },
          { key: "endTime", label: "End Time (HH:mm)", type: "text", nullable: true },
          { key: "isAvailable", label: "Available", type: "boolean", defaultValue: true },
        ];
      case "guide-blackout-dates":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "guideId", label: "Guide", type: "select", required: true, options: guideOptions },
          { key: "startAt", label: "Start", type: "datetime", required: true },
          { key: "endAt", label: "End", type: "datetime", required: true },
          { key: "reason", label: "Reason", type: "text", nullable: true },
        ];
      case "guide-rates":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "guideId", label: "Guide", type: "select", required: true, options: guideOptions },
          { key: "locationId", label: "Location", type: "select", nullable: true, options: locationOptions },
          { key: "rateName", label: "Rate Name", type: "text", required: true },
          { key: "pricingModel", label: "Pricing Model", type: "select", required: true, options: [{ label: "PER_DAY", value: "PER_DAY" }, { label: "HALF_DAY", value: "HALF_DAY" }, { label: "PER_HOUR", value: "PER_HOUR" }, { label: "PER_PAX", value: "PER_PAX" }, { label: "FIXED", value: "FIXED" }, { label: "TIERED_PAX", value: "TIERED_PAX" }] },
          { key: "currencyId", label: "Currency", type: "select", required: true, options: currencyOptions },
          { key: "fixedRate", label: "Fixed Rate", type: "number", nullable: true },
          { key: "perHourRate", label: "Per Hour Rate", type: "number", nullable: true },
          { key: "perPaxRate", label: "Per Pax Rate", type: "number", nullable: true },
          { key: "paxTiers", label: "Pax Tiers JSON", type: "json", nullable: true },
          { key: "minCharge", label: "Min Charge", type: "number", defaultValue: 0 },
          { key: "overtimeAfterHours", label: "Overtime After Hours", type: "number", nullable: true },
          { key: "overtimePerHourRate", label: "Overtime Per Hour", type: "number", nullable: true },
          { key: "nightAllowance", label: "Night Allowance", type: "number", nullable: true },
          { key: "perDiem", label: "Per Diem", type: "number", nullable: true },
          { key: "effectiveFrom", label: "Effective From", type: "datetime", required: true },
          { key: "effectiveTo", label: "Effective To", type: "datetime", nullable: true },
          { key: "notes", label: "Notes", type: "text", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "guide-assignments":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "bookingId", label: "Booking ID", type: "text", required: true },
          { key: "guideId", label: "Guide", type: "select", required: true, options: guideOptions },
          { key: "serviceType", label: "Service Type", type: "select", defaultValue: "DAY", options: [{ label: "DAY", value: "DAY" }, { label: "ACTIVITY", value: "ACTIVITY" }, { label: "TRANSPORT", value: "TRANSPORT" }, { label: "PACKAGE", value: "PACKAGE" }] },
          { key: "serviceId", label: "Service ID", type: "text", nullable: true },
          { key: "startAt", label: "Start", type: "datetime", required: true },
          { key: "endAt", label: "End", type: "datetime", required: true },
          { key: "status", label: "Status", type: "select", defaultValue: "ASSIGNED", options: [{ label: "ASSIGNED", value: "ASSIGNED" }, { label: "CONFIRMED", value: "CONFIRMED" }, { label: "COMPLETED", value: "COMPLETED" }, { label: "CANCELLED", value: "CANCELLED" }] },
          { key: "currencyCode", label: "Currency Code", type: "text", required: true },
          { key: "baseAmount", label: "Base Amount", type: "number", required: true },
          { key: "taxAmount", label: "Tax Amount", type: "number", defaultValue: 0 },
          { key: "totalAmount", label: "Total Amount", type: "number", required: true },
          { key: "rateSnapshot", label: "Rate Snapshot JSON", type: "json", nullable: true },
          { key: "notes", label: "Notes", type: "text", nullable: true },
        ];
      default:
        return [];
    }
  }, [resource, guides, languages, locations, currencies]);

  const visibleFields = useMemo(
    () =>
      isGuideManageMode && guideScopedResources.includes(resource)
        ? fields.filter((field) => field.key !== "guideId")
        : fields,
    [fields, guideScopedResources, isGuideManageMode, resource]
  );

  const visibleResources = useMemo(
    () =>
      !isGuideManageMode
        ? (["guides", "languages"] as GuideResourceKey[])
        : guideScopedResources,
    [guideScopedResources, isGuideManageMode]
  );

  const managedGuide = useMemo(
    () => guides.find((guide) => String(guide.id) === managedGuideId) ?? null,
    [guides, managedGuideId]
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
  }, [resource, query, pageSize, isGuideManageMode, managedGuideId]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: guideKeys.lookups() }),
      queryClient.invalidateQueries({ queryKey: guideKeys.recordsRoot() }),
    ]);
    await Promise.all([refetchLookups(), refetchRecords()]);
  }, [queryClient, refetchLookups, refetchRecords]);

  const openDialog = useCallback(
    (mode: "create" | "edit", row?: Record<string, unknown>) => {
      if (mode === "create" && isReadOnly) {
        notify.warning("View only mode: adding records is disabled.");
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
      if (isGuideManageMode && guideScopedResources.includes(resource)) {
        next.guideId = managedGuideId;
      }
      setForm(next);
      setDialog({ open: true, mode, row: row ?? null });
    },
    [guideScopedResources, isGuideManageMode, isReadOnly, managedGuideId, resource, visibleFields]
  );

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
        else if (field.type === "json") {
          const parsedJson = value ? JSON.parse(String(value)) : null;
          if (field.key === "emergencyContact" && parsedJson !== null) {
            if (typeof parsedJson !== "object" || Array.isArray(parsedJson)) {
              throw new Error("Emergency Contact must be a JSON object.");
            }
          }
          payload[field.key] = parsedJson;
        } else if (field.type === "datetime") payload[field.key] = toIsoDateTime(value);
        else if (field.key === "code" && typeof value === "string") payload[field.key] = value.toUpperCase().trim();
        else payload[field.key] = value;
      });
      if (isGuideManageMode && guideScopedResources.includes(resource)) payload.guideId = managedGuideId;

      if (dialog.mode === "create") {
        await createGuideMutation.mutateAsync({ targetResource: resource, payload });
        notify.success("Record created.");
      } else if (dialog.row?.id) {
        await updateGuideMutation.mutateAsync({
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
    createGuideMutation,
    dialog.mode,
    dialog.row,
    form,
    guideScopedResources,
    isGuideManageMode,
    managedGuideId,
    refreshAll,
    resource,
    updateGuideMutation,
    visibleFields,
  ]);

  const onDelete = useCallback(
    async (row: Record<string, unknown>) => {
      if (!row.id) return;
      const targetLabel =
        String(row.code ?? "").trim() ||
        String(row.fullName ?? "").trim() ||
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
        await deleteGuideMutation.mutateAsync({
          targetResource: resource,
          id: String(row.id),
        });
        notify.success("Record deleted.");
        await refreshAll();
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to delete record.");
      }
    },
    [confirm, deleteGuideMutation, refreshAll, resource]
  );

  const refreshGuideExistingCodes = useCallback(async () => {
    const rows = await listGuideRecords("guides", { limit: 500 });
    return new Set(
      rows
        .map((row) => String(row.code ?? "").trim().toUpperCase())
        .filter((value) => value.length > 0)
    );
  }, []);

  return {
    resource,
    setResource,
    query,
    setQuery,
    records,
    pagedRecords,
    loading,
    saving,
    guides,
    currencies,
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
    lookups,
    guideExistingCodes,
    currencyByCode,
    visibleFields,
    visibleResources,
    managedGuide,
    isGuideManageMode,
    refreshAll,
    openDialog,
    onSubmit,
    onDelete,
    refreshGuideExistingCodes,
  };
}
