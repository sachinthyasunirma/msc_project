"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Edit3, Plus, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/app-confirm-provider";
import { guideImportConfig } from "@/components/batch-import/master-batch-import-config";
import { MasterBatchImportDialog } from "@/components/batch-import/master-batch-import-dialog";
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
  createGuideRecord,
  deleteGuideRecord,
  listGuideRecords,
  updateGuideRecord,
} from "@/modules/guides/lib/guides-api";
import { listTransportRecords } from "@/modules/transport/lib/transport-api";
import { listCurrencyRecords } from "@/modules/currency/lib/currency-api";

export type GuideResourceKey =
  | "guides"
  | "languages"
  | "guide-languages"
  | "guide-coverage-areas"
  | "guide-licenses"
  | "guide-certifications"
  | "guide-documents"
  | "guide-weekly-availability"
  | "guide-blackout-dates"
  | "guide-rates"
  | "guide-assignments";

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "datetime" | "json";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number | boolean;
  nullable?: boolean;
};

const META: Record<GuideResourceKey, { title: string; description: string }> = {
  guides: { title: "Guides", description: "Manage guide profiles and professional information." },
  languages: { title: "Languages", description: "Manage language master for guide skills." },
  "guide-languages": { title: "Guide Languages", description: "Map guide language proficiency." },
  "guide-coverage-areas": { title: "Coverage Areas", description: "Map guide service coverage locations." },
  "guide-licenses": { title: "Licenses", description: "Manage guide license and verification data." },
  "guide-certifications": { title: "Certifications", description: "Track certifications and validity windows." },
  "guide-documents": { title: "Documents", description: "Store guide document metadata and file URLs." },
  "guide-weekly-availability": { title: "Weekly Availability", description: "Configure weekly guide availability slots." },
  "guide-blackout-dates": { title: "Blackout Dates", description: "Track blocked/unavailable date ranges." },
  "guide-rates": { title: "Guide Rates", description: "Manage guide pricing rules and effective windows." },
  "guide-assignments": { title: "Assignments", description: "Track booking-level guide assignments and amount snapshot." },
};

const COLUMNS: Record<GuideResourceKey, Array<{ key: string; label: string }>> = {
  guides: [
    { key: "code", label: "Code" },
    { key: "fullName", label: "Full Name" },
    { key: "guideType", label: "Type" },
    { key: "yearsExperience", label: "Exp" },
    { key: "isActive", label: "Status" },
  ],
  languages: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "isActive", label: "Status" },
  ],
  "guide-languages": [
    { key: "code", label: "Code" },
    { key: "guideId", label: "Guide" },
    { key: "languageId", label: "Language" },
    { key: "proficiency", label: "Proficiency" },
  ],
  "guide-coverage-areas": [
    { key: "code", label: "Code" },
    { key: "guideId", label: "Guide" },
    { key: "locationId", label: "Location" },
    { key: "coverageType", label: "Type" },
  ],
  "guide-licenses": [
    { key: "code", label: "Code" },
    { key: "guideId", label: "Guide" },
    { key: "licenseType", label: "License Type" },
    { key: "isVerified", label: "Verified" },
  ],
  "guide-certifications": [
    { key: "code", label: "Code" },
    { key: "guideId", label: "Guide" },
    { key: "name", label: "Name" },
    { key: "provider", label: "Provider" },
  ],
  "guide-documents": [
    { key: "code", label: "Code" },
    { key: "guideId", label: "Guide" },
    { key: "docType", label: "Doc Type" },
    { key: "isActive", label: "Status" },
  ],
  "guide-weekly-availability": [
    { key: "code", label: "Code" },
    { key: "guideId", label: "Guide" },
    { key: "weekday", label: "Weekday" },
    { key: "isAvailable", label: "Available" },
  ],
  "guide-blackout-dates": [
    { key: "code", label: "Code" },
    { key: "guideId", label: "Guide" },
    { key: "startAt", label: "Start" },
    { key: "endAt", label: "End" },
  ],
  "guide-rates": [
    { key: "code", label: "Code" },
    { key: "guideId", label: "Guide" },
    { key: "rateName", label: "Rate" },
    { key: "pricingModel", label: "Model" },
    { key: "isActive", label: "Status" },
  ],
  "guide-assignments": [
    { key: "code", label: "Code" },
    { key: "bookingId", label: "Booking" },
    { key: "guideId", label: "Guide" },
    { key: "status", label: "Status" },
    { key: "totalAmount", label: "Total" },
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

function getBooleanMeta(fieldKey: string, value: boolean) {
  switch (fieldKey) {
    case "isActive":
      return { text: value ? "Active" : "Inactive", active: value };
    case "isAvailable":
      return { text: value ? "Available" : "Unavailable", active: value };
    case "isVerified":
      return { text: value ? "Verified" : "Unverified", active: value };
    default:
      return { text: value ? "Yes" : "No", active: value };
  }
}

export function GuidesManagementView({
  initialResource = "guides",
  managedGuideId = "",
}: {
  initialResource?: GuideResourceKey;
  managedGuideId?: string;
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

  const [resource, setResource] = useState<GuideResourceKey>(initialResource);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guides, setGuides] = useState<Array<Record<string, unknown>>>([]);
  const [languages, setLanguages] = useState<Array<Record<string, unknown>>>([]);
  const [locations, setLocations] = useState<Array<Record<string, unknown>>>([]);
  const [currencies, setCurrencies] = useState<Array<Record<string, unknown>>>([]);
  const [dialog, setDialog] = useState<{ open: boolean; mode: "create" | "edit"; row: Record<string, unknown> | null }>({ open: false, mode: "create", row: null });
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [batchOpen, setBatchOpen] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const lookups = useMemo(() => {
    const items: Array<[string, string]> = [];
    guides.forEach((item) => items.push([String(item.id), `${item.code} - ${item.fullName}`]));
    languages.forEach((item) => items.push([String(item.id), `${item.code} - ${item.name}`]));
    locations.forEach((item) => items.push([String(item.id), `${item.code} - ${item.name}`]));
    currencies.forEach((item) => items.push([String(item.id), `${item.code} - ${item.name}`]));
    return Object.fromEntries(items);
  }, [guides, languages, locations, currencies]);

  const guideExistingCodes = useMemo(() => {
    return new Set(
      guides
        .map((row) => String(row.code ?? "").trim().toUpperCase())
        .filter((value) => value.length > 0)
    );
  }, [guides]);

  const currencyByCode = useMemo(() => {
    return new Map(
      currencies.map((currency) => [
        String(currency.code ?? "").trim().toUpperCase(),
        String(currency.id ?? ""),
      ])
    );
  }, [currencies]);

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

  const fields = useMemo<Field[]>(() => {
    const guideOptions = guides.map((item) => ({ value: String(item.id), label: `${item.code} - ${item.fullName}` }));
    const languageOptions = languages.map((item) => ({ value: String(item.id), label: `${item.code} - ${item.name}` }));
    const locationOptions = locations.map((item) => ({ value: String(item.id), label: `${item.code} - ${item.name}` }));
    const currencyOptions = currencies.map((item) => ({ value: String(item.id), label: `${item.code} - ${item.name}` }));

    switch (resource) {
      case "guides":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "guideType", label: "Guide Type", type: "select", defaultValue: "INDIVIDUAL", options: [{label:"INDIVIDUAL",value:"INDIVIDUAL"},{label:"COMPANY",value:"COMPANY"},{label:"INTERNAL",value:"INTERNAL"}] },
          { key: "fullName", label: "Full Name", type: "text", required: true },
          { key: "displayName", label: "Display Name", type: "text", nullable: true },
          {
            key: "gender",
            label: "Gender",
            type: "select",
            nullable: true,
            options: [
              { label: "Male", value: "MALE" },
              { label: "Female", value: "FEMALE" },
              { label: "Other", value: "OTHER" },
              { label: "Prefer Not To Say", value: "PREFER_NOT_TO_SAY" },
            ],
          },
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
          { key: "proficiency", label: "Proficiency", type: "select", defaultValue: "BASIC", options: [{label:"BASIC",value:"BASIC"},{label:"INTERMEDIATE",value:"INTERMEDIATE"},{label:"FLUENT",value:"FLUENT"},{label:"NATIVE",value:"NATIVE"}] },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "guide-coverage-areas":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "guideId", label: "Guide", type: "select", required: true, options: guideOptions },
          { key: "locationId", label: "Location", type: "select", required: true, options: locationOptions },
          { key: "coverageType", label: "Coverage Type", type: "select", defaultValue: "REGION", options: [{label:"REGION",value:"REGION"},{label:"CITY",value:"CITY"},{label:"SITE",value:"SITE"},{label:"COUNTRY",value:"COUNTRY"}] },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "guide-licenses":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "guideId", label: "Guide", type: "select", required: true, options: guideOptions },
          { key: "licenseType", label: "License Type", type: "select", required: true, options: [{label:"NATIONAL_GUIDE",value:"NATIONAL_GUIDE"},{label:"SITE_GUIDE",value:"SITE_GUIDE"},{label:"DRIVER_GUIDE",value:"DRIVER_GUIDE"},{label:"ADVENTURE_INSTRUCTOR",value:"ADVENTURE_INSTRUCTOR"},{label:"OTHER",value:"OTHER"}] },
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
          { key: "docType", label: "Doc Type", type: "select", required: true, options: [{label:"ID",value:"ID"},{label:"PASSPORT",value:"PASSPORT"},{label:"LICENSE",value:"LICENSE"},{label:"CERTIFICATE",value:"CERTIFICATE"},{label:"CONTRACT",value:"CONTRACT"},{label:"INSURANCE",value:"INSURANCE"},{label:"OTHER",value:"OTHER"}] },
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
          { key: "pricingModel", label: "Pricing Model", type: "select", required: true, options: [{label:"PER_DAY",value:"PER_DAY"},{label:"HALF_DAY",value:"HALF_DAY"},{label:"PER_HOUR",value:"PER_HOUR"},{label:"PER_PAX",value:"PER_PAX"},{label:"FIXED",value:"FIXED"},{label:"TIERED_PAX",value:"TIERED_PAX"}] },
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
          { key: "serviceType", label: "Service Type", type: "select", defaultValue: "DAY", options: [{label:"DAY",value:"DAY"},{label:"ACTIVITY",value:"ACTIVITY"},{label:"TRANSPORT",value:"TRANSPORT"},{label:"PACKAGE",value:"PACKAGE"}] },
          { key: "serviceId", label: "Service ID", type: "text", nullable: true },
          { key: "startAt", label: "Start", type: "datetime", required: true },
          { key: "endAt", label: "End", type: "datetime", required: true },
          { key: "status", label: "Status", type: "select", defaultValue: "ASSIGNED", options: [{label:"ASSIGNED",value:"ASSIGNED"},{label:"CONFIRMED",value:"CONFIRMED"},{label:"COMPLETED",value:"COMPLETED"},{label:"CANCELLED",value:"CANCELLED"}] },
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

  const visibleResources = useMemo(() => {
    if (!isGuideManageMode) return ["guides", "languages"] as GuideResourceKey[];
    return guideScopedResources;
  }, [guideScopedResources, isGuideManageMode]);

  const managedGuide = useMemo(
    () => guides.find((guide) => String(guide.id) === managedGuideId) ?? null,
    [guides, managedGuideId]
  );

  const loadLookups = useCallback(async () => {
    try {
      const [guideRows, languageRows, locationRows, currencyRows] = await Promise.all([
        listGuideRecords("guides", { limit: 200 }),
        listGuideRecords("languages", { limit: 200 }),
        listTransportRecords("locations", { limit: 200 }),
        listCurrencyRecords("currencies", { limit: 200 }),
      ]);
      setGuides(guideRows);
      setLanguages(languageRows);
      setLocations(locationRows);
      setCurrencies(currencyRows);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load lookup data.");
      setGuides([]);
      setLanguages([]);
      setLocations([]);
      setCurrencies([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listGuideRecords(resource, {
        q: query || undefined,
        limit: 200,
        guideId: isGuideManageMode && guideScopedResources.includes(resource) ? managedGuideId : undefined,
      });
      setRecords(rows);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [guideScopedResources, isGuideManageMode, managedGuideId, query, resource]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(records.length / pageSize)),
    [records.length, pageSize]
  );

  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [records, currentPage, pageSize]);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [resource, query, pageSize, isGuideManageMode, managedGuideId]);

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
        else if (field.type === "json") {
          const parsedJson = value ? JSON.parse(String(value)) : null;
          if (field.key === "emergencyContact" && parsedJson !== null) {
            if (typeof parsedJson !== "object" || Array.isArray(parsedJson)) {
              throw new Error("Emergency Contact must be a JSON object.");
            }
          }
          payload[field.key] = parsedJson;
        }
        else if (field.type === "datetime") payload[field.key] = toIsoDateTime(value);
        else if (field.key === "code" && typeof value === "string") payload[field.key] = value.toUpperCase().trim();
        else payload[field.key] = value;
      });

      if (isGuideManageMode && guideScopedResources.includes(resource)) {
        payload.guideId = managedGuideId;
      }

      if (dialog.mode === "create") {
        await createGuideRecord(resource, payload);
        notify.success("Record created.");
      } else if (dialog.row?.id) {
        await updateGuideRecord(resource, String(dialog.row.id), payload);
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
      setSaving(true);
      await deleteGuideRecord(resource, String(row.id));
      notify.success("Record deleted.");
      await Promise.all([load(), loadLookups()]);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete record.");
    } finally {
      setSaving(false);
    }
  };

  const refreshGuideExistingCodes = async () => {
    const rows = await listGuideRecords("guides", { limit: 500 });
    return new Set(
      rows
        .map((row) => String(row.code ?? "").trim().toUpperCase())
        .filter((value) => value.length > 0)
    );
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{META[resource].title}</CardTitle>
            <CardDescription>
              {META[resource].description}
              {isGuideManageMode && managedGuide
                ? ` Managing: ${managedGuide.code} - ${managedGuide.fullName}`
                : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isGuideManageMode ? (
              <Button variant="outline" asChild>
                <Link href="/master-data/guides">Back to Guides</Link>
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="master-refresh-btn"
              onClick={() => void Promise.all([load(), loadLookups()])}
            >
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
            {!isGuideManageMode && resource === "guides" ? (
              <Button variant="outline" onClick={() => setBatchOpen(true)}>
                Batch Upload
              </Button>
            ) : null}
            <Button onClick={() => openDialog("create")} disabled={isReadOnly} className="master-add-btn">
              <Plus className="mr-2 size-4" />
              Add Record
            </Button>
          </div>
        </div>

        <Tabs value={resource} onValueChange={(value) => setResource(value as GuideResourceKey)}>
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
                <TableCell colSpan={COLUMNS[resource].length + 1} className="text-center text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS[resource].length + 1} className="text-center text-muted-foreground">No records found.</TableCell>
              </TableRow>
            ) : (
              pagedRecords.map((row) => (
                <TableRow key={String(row.id)}>
                  {COLUMNS[resource].map((column) => (
                    <TableCell key={column.key}>
                      {typeof row[column.key] === "boolean" ? (
                        <Badge
                          variant={
                            getBooleanMeta(column.key, Boolean(row[column.key])).active
                              ? "default"
                              : "secondary"
                          }
                        >
                          {getBooleanMeta(column.key, Boolean(row[column.key])).text}
                        </Badge>
                      ) : (
                        formatCell(row[column.key], lookups)
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {resource === "guides" && row.id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="master-manage-btn"
                          asChild
                        >
                          <Link href={`/master-data/guides/manage/${row.id}`}>
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
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "create" ? "Add" : "Edit"} {META[resource].title}
            </DialogTitle>
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
                      setForm((prev) => ({ ...prev, [field.key]: value === "__none__" ? "" : value }))
                    }
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {field.nullable ? <SelectItem value="__none__">None</SelectItem> : null}
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "boolean" ? (
                  <div className="flex h-9 items-center justify-between rounded-md border px-3">
                    <span className="text-muted-foreground text-xs">
                      {getBooleanMeta(field.key, Boolean(form[field.key])).text}
                    </span>
                    <Switch checked={Boolean(form[field.key])} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, [field.key]: checked }))} />
                  </div>
                ) : field.type === "json" ? (
                  <Textarea value={String(form[field.key] ?? "")} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))} />
                ) : (
                  <Input
                    type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"}
                    value={String(form[field.key] ?? "")}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="pt-2">
            <RecordAuditMeta row={dialog.row} className="mr-auto" />
            <Button variant="outline" onClick={() => setDialog({ open: false, mode: "create", row: null })}>Cancel</Button>
            <Button onClick={() => void onSubmit()} disabled={saving || (isReadOnly && dialog.mode === "create")}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MasterBatchImportDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        config={{
          ...guideImportConfig,
          fields: guideImportConfig.fields.map((field) =>
            field.key === "baseCurrencyCode"
              ? {
                  ...field,
                  options: currencies.map((item) => ({
                    value: String(item.code ?? "").trim().toUpperCase(),
                    label: `${String(item.code ?? "").trim().toUpperCase()} - ${String(item.name ?? "")}`,
                  })),
                }
              : field
          ),
          lookupHints: [
            {
              label: "Available Currency Codes",
              values: currencies
                .map((item) => String(item.code ?? "").trim().toUpperCase())
                .filter((value) => value.length > 0)
                .slice(0, 20),
            },
          ],
        }}
        readOnly={isReadOnly}
        context={{
          locationByCode: new Map(),
          currencyByCode,
          vehicleCategoryByCode: new Map(),
          vehicleTypeByCode: new Map(),
          vehicleTypeCategoryCodeByCode: new Map(),
        }}
        existingCodes={guideExistingCodes}
        onRefreshExistingCodes={refreshGuideExistingCodes}
        onUploadRow={async (payload) => {
          await createGuideRecord("guides", payload);
        }}
        onCompleted={async () => {
          await Promise.all([load(), loadLookups()]);
        }}
      />
    </Card>
  );
}
