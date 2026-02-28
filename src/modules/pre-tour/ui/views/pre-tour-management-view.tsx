"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CopyPlus,
  GripVertical,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import {
  createPreTourRecord,
  deletePreTourRecord,
  listPreTourRecords,
  updatePreTourRecord,
} from "@/modules/pre-tour/lib/pre-tour-api";
import { listTransportRecords } from "@/modules/transport/lib/transport-api";
import { listActivityRecords } from "@/modules/activity/lib/activity-api";
import { listGuideRecords } from "@/modules/guides/lib/guides-api";
import { listCurrencyRecords } from "@/modules/currency/lib/currency-api";
import { listBusinessNetworkRecords } from "@/modules/business-network/lib/business-network-api";
import { PreTourDayWorkspace } from "@/modules/pre-tour/ui/components/pre-tour-day-workspace";

export type PreTourResourceKey =
  | "pre-tours"
  | "pre-tour-days"
  | "pre-tour-items"
  | "pre-tour-item-addons"
  | "pre-tour-totals";

type FieldType = "text" | "number" | "boolean" | "select" | "datetime" | "json" | "textarea";

type Field = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number | boolean;
  nullable?: boolean;
};

type Row = Record<string, unknown>;

const META: Record<PreTourResourceKey, { title: string; description: string }> = {
  "pre-tours": {
    title: "Pre-Tour Plans",
    description: "Create itinerary plans before operational on-tour execution.",
  },
  "pre-tour-days": {
    title: "Day Plan",
    description: "Define day-by-day structure and travel flow.",
  },
  "pre-tour-items": {
    title: "Plan Items",
    description: "Service lines for selected day.",
  },
  "pre-tour-item-addons": {
    title: "Item Addons",
    description: "Supplements and misc charges for selected service item.",
  },
  "pre-tour-totals": {
    title: "Plan Totals",
    description: "Aggregated totals and snapshot for the full pre-tour.",
  },
};

const COLUMNS: Record<PreTourResourceKey, Array<{ key: string; label: string }>> = {
  "pre-tours": [
    { key: "code", label: "Code" },
    { key: "referenceNo", label: "Reference No" },
    { key: "planCode", label: "Plan Code" },
    { key: "version", label: "Version" },
    { key: "title", label: "Title" },
    { key: "operatorOrgId", label: "Operator" },
    { key: "marketOrgId", label: "Market" },
    { key: "status", label: "Status" },
    { key: "currencyCode", label: "Currency" },
    { key: "isActive", label: "Active" },
  ],
  "pre-tour-days": [
    { key: "code", label: "Code" },
    { key: "dayNumber", label: "Day" },
    { key: "date", label: "Date" },
    { key: "title", label: "Title" },
    { key: "isActive", label: "Active" },
  ],
  "pre-tour-items": [
    { key: "code", label: "Code" },
    { key: "dayId", label: "Day" },
    { key: "itemType", label: "Type" },
    { key: "title", label: "Title" },
    { key: "currencyCode", label: "Currency" },
    { key: "totalAmount", label: "Total" },
    { key: "status", label: "Status" },
  ],
  "pre-tour-item-addons": [
    { key: "code", label: "Code" },
    { key: "planItemId", label: "Plan Item" },
    { key: "addonType", label: "Type" },
    { key: "title", label: "Title" },
    { key: "currencyCode", label: "Currency" },
    { key: "totalAmount", label: "Total" },
    { key: "isActive", label: "Active" },
  ],
  "pre-tour-totals": [
    { key: "code", label: "Code" },
    { key: "currencyCode", label: "Currency" },
    { key: "baseTotal", label: "Base" },
    { key: "taxTotal", label: "Tax" },
    { key: "grandTotal", label: "Grand" },
    { key: "isActive", label: "Active" },
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
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && lookups[value]) return lookups[value];
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function defaultValue(field: Field) {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === "boolean") return true;
  return "";
}

function parseFieldValue(field: Field, value: unknown) {
  if ((value === "" || value === null || value === undefined) && field.nullable) {
    return null;
  }

  if (field.type === "datetime") {
    return toIsoDateTime(value);
  }

  if (field.type === "number") {
    if (value === "" || value === null || value === undefined) {
      return field.nullable ? null : 0;
    }
    return Number(value);
  }

  if (field.type === "json") {
    if (value === "" || value === null || value === undefined) {
      return field.nullable ? null : {};
    }
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        throw new Error(`${field.label} must be valid JSON.`);
      }
    }
    return value;
  }

  return value;
}

function addDays(baseIso: string, count: number) {
  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) return new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + count);
  return next;
}

function matchesQuery(resource: PreTourResourceKey, row: Row, query: string) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return COLUMNS[resource].some((column) =>
    String(row[column.key] ?? "")
      .toLowerCase()
      .includes(q)
  );
}

function formatDate(value: unknown) {
  if (!value || typeof value !== "string") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function toDayCount(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

function sanitizeCodePart(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function itemTypeAccentClass(itemType: unknown) {
  switch (String(itemType || "").toUpperCase()) {
    case "TRANSPORT":
      return "pretour-item-accent pretour-item-accent--transport";
    case "ACTIVITY":
      return "pretour-item-accent pretour-item-accent--activity";
    case "ACCOMMODATION":
      return "pretour-item-accent pretour-item-accent--accommodation";
    case "GUIDE":
      return "pretour-item-accent pretour-item-accent--guide";
    case "SUPPLEMENT":
      return "pretour-item-accent pretour-item-accent--supplement";
    default:
      return "pretour-item-accent pretour-item-accent--default";
  }
}

function SectionTable({
  resource,
  rows,
  loading,
  isReadOnly,
  lookups,
  showManage,
  onCreateVersion,
  onCopyPlan,
  onAdd,
  onEdit,
  onDelete,
}: {
  resource: PreTourResourceKey;
  rows: Row[];
  loading: boolean;
  isReadOnly: boolean;
  lookups: Record<string, string>;
  showManage?: boolean;
  onCreateVersion?: (row: Row) => void;
  onCopyPlan?: (row: Row) => void;
  onAdd: () => void;
  onEdit: (row: Row) => void;
  onDelete: (row: Row) => void;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-4 py-3">
        <div>
          <CardTitle className="text-sm">{META[resource].title}</CardTitle>
          <CardDescription className="text-xs">{META[resource].description}</CardDescription>
        </div>
        <Button className="master-add-btn" size="sm" onClick={onAdd} disabled={isReadOnly}>
          <Plus className="mr-1 size-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent>
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
                <TableCell colSpan={COLUMNS[resource].length + 1} className="py-6 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS[resource].length + 1} className="py-6 text-center text-muted-foreground">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={String(row.id)}>
                  {COLUMNS[resource].map((column) => (
                    <TableCell key={column.key}>
                      {column.key === "status" ? (
                        <Badge variant="outline">{String(row[column.key] || "-")}</Badge>
                      ) : (
                        formatCell(row[column.key], lookups)
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="py-1.5 text-right">
                    <div className="flex justify-end gap-1">
                      {showManage && resource === "pre-tours" ? (
                        <Button size="sm" variant="outline" className="master-manage-btn" asChild>
                          <Link href={`/master-data/pre-tours/${row.id}`}>
                            <Settings2 className="mr-1 size-4" />
                            Manage
                          </Link>
                        </Button>
                      ) : null}
                      {resource === "pre-tours" && onCreateVersion ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCreateVersion(row)}
                          disabled={isReadOnly}
                        >
                          + Version
                        </Button>
                      ) : null}
                      {resource === "pre-tours" && onCopyPlan ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCopyPlan(row)}
                          disabled={isReadOnly}
                        >
                          <CopyPlus className="mr-1 size-4" />
                          Copy
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => onEdit(row)} disabled={isReadOnly}>
                        <Settings2 className="mr-1 size-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(row)}
                        disabled={isReadOnly}
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
    </Card>
  );
}

export function PreTourManagementView({
  initialResource = "pre-tours",
  managedPlanId = "",
}: {
  initialResource?: PreTourResourceKey;
  managedPlanId?: string;
}) {
  const { data: session } = authClient.useSession();
  const isReadOnly = Boolean((session?.user as { readOnly?: boolean } | undefined)?.readOnly);

  const isPlanManageMode = Boolean(managedPlanId);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingDays, setSyncingDays] = useState(false);

  const [plans, setPlans] = useState<Row[]>([]);
  const [days, setDays] = useState<Row[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [addons, setAddons] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Row[]>([]);

  const [locations, setLocations] = useState<Row[]>([]);
  const [activities, setActivities] = useState<Row[]>([]);
  const [guides, setGuides] = useState<Row[]>([]);
  const [currencies, setCurrencies] = useState<Row[]>([]);
  const [organizations, setOrganizations] = useState<Row[]>([]);

  const [selectedDayId, setSelectedDayId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [dragItemId, setDragItemId] = useState("");
  const [sharingItem, setSharingItem] = useState<Row | null>(null);
  const [shareTargetDayId, setShareTargetDayId] = useState("");
  const [sharing, setSharing] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourcePlan, setCopySourcePlan] = useState<Row | null>(null);
  const [copySaving, setCopySaving] = useState(false);
  const [copyForm, setCopyForm] = useState<{
    code: string;
    planCode: string;
    title: string;
    startDate: string;
    endDate: string;
    totalNights: string;
    adults: string;
    children: string;
    infants: string;
    operatorOrgId: string;
    marketOrgId: string;
    currencyCode: string;
    priceMode: string;
  }>({
    code: "",
    planCode: "",
    title: "",
    startDate: "",
    endDate: "",
    totalNights: "0",
    adults: "1",
    children: "0",
    infants: "0",
    operatorOrgId: "",
    marketOrgId: "",
    currencyCode: "USD",
    priceMode: "EXCLUSIVE",
  });

  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    resource: PreTourResourceKey;
    row: Row | null;
  }>({ open: false, mode: "create", resource: initialResource, row: null });
  const [form, setForm] = useState<Row>({});

  const selectedPlan = useMemo(
    () => plans.find((row) => String(row.id) === managedPlanId) ?? null,
    [plans, managedPlanId]
  );

  const sortedDays = useMemo(
    () => [...days].sort((a, b) => Number(a.dayNumber ?? 0) - Number(b.dayNumber ?? 0)),
    [days]
  );

  const selectedDayItems = useMemo(
    () => items.filter((item) => String(item.dayId) === selectedDayId),
    [items, selectedDayId]
  );

  const planOptions = useMemo(
    () => plans.map((row) => ({ value: String(row.id), label: `${row.code} - ${row.title}` })),
    [plans]
  );

  const dayOptions = useMemo(
    () =>
      sortedDays.map((row) => ({
        value: String(row.id),
        label: `Day ${row.dayNumber} - ${row.title || row.code}`,
      })),
    [sortedDays]
  );

  const itemOptions = useMemo(
    () =>
      items.map((row) => ({
        value: String(row.id),
        label: `${row.code} - ${row.title || row.itemType}`,
      })),
    [items]
  );

  const filteredItemOptions = useMemo(() => {
    if (!isPlanManageMode || !selectedDayId) return itemOptions;
    return itemOptions.filter((option) =>
      items.some((row) => String(row.id) === option.value && String(row.dayId) === selectedDayId)
    );
  }, [isPlanManageMode, itemOptions, items, selectedDayId]);

  const locationOptions = useMemo(
    () => locations.map((row) => ({ value: String(row.id), label: `${row.code} - ${row.name}` })),
    [locations]
  );

  const serviceOptions = useMemo(
    () => [
      ...activities.map((row) => ({ value: String(row.id), label: `ACT • ${row.code} - ${row.name}` })),
      ...guides.map((row) => ({ value: String(row.id), label: `GUIDE • ${row.code} - ${row.fullName}` })),
    ],
    [activities, guides]
  );

  const currencyOptions = useMemo(
    () => currencies.map((row) => ({ value: String(row.code), label: `${row.code} - ${row.name}` })),
    [currencies]
  );

  const operatorOrganizationOptions = useMemo(
    () =>
      organizations
        .filter((row) => {
          const type = String(row.type || "");
          return type === "OPERATOR" || type === "SUPPLIER";
        })
        .map((row) => ({ value: String(row.id), label: `${row.code} - ${row.name}` })),
    [organizations]
  );

  const marketOrganizationOptions = useMemo(
    () =>
      organizations
        .filter((row) => String(row.type || "") === "MARKET")
        .map((row) => ({ value: String(row.id), label: `${row.code} - ${row.name}` })),
    [organizations]
  );

  const lookups = useMemo(() => {
    const pairs: Array<[string, string]> = [];
    planOptions.forEach((o) => pairs.push([o.value, o.label]));
    dayOptions.forEach((o) => pairs.push([o.value, o.label]));
    itemOptions.forEach((o) => pairs.push([o.value, o.label]));
    locationOptions.forEach((o) => pairs.push([o.value, o.label]));
    serviceOptions.forEach((o) => pairs.push([o.value, o.label]));
    operatorOrganizationOptions.forEach((o) => pairs.push([o.value, o.label]));
    marketOrganizationOptions.forEach((o) => pairs.push([o.value, o.label]));
    return Object.fromEntries(pairs);
  }, [
    planOptions,
    dayOptions,
    itemOptions,
    locationOptions,
    serviceOptions,
    operatorOrganizationOptions,
    marketOrganizationOptions,
  ]);

  const fields = useMemo<Field[]>(() => {
    const resource = dialog.resource;

    switch (resource) {
      case "pre-tours":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "planCode", label: "Plan Code", type: "text", required: true },
          { key: "title", label: "Title", type: "text", required: true },
          {
            key: "operatorOrgId",
            label: "Operator",
            type: "select",
            required: true,
            options: operatorOrganizationOptions,
          },
          {
            key: "marketOrgId",
            label: "Market",
            type: "select",
            required: true,
            options: marketOrganizationOptions,
          },
          {
            key: "status",
            label: "Status",
            type: "select",
            defaultValue: "DRAFT",
            options: [
              { label: "DRAFT", value: "DRAFT" },
              { label: "QUOTED", value: "QUOTED" },
              { label: "APPROVED", value: "APPROVED" },
              { label: "BOOKED", value: "BOOKED" },
              { label: "IN_PROGRESS", value: "IN_PROGRESS" },
              { label: "COMPLETED", value: "COMPLETED" },
              { label: "CANCELLED", value: "CANCELLED" },
            ],
          },
          { key: "startDate", label: "Start Date", type: "datetime", required: true },
          { key: "endDate", label: "End Date", type: "datetime", required: true },
          { key: "totalNights", label: "Total Nights", type: "number", defaultValue: 0 },
          { key: "adults", label: "Adults", type: "number", defaultValue: 1 },
          { key: "children", label: "Children", type: "number", defaultValue: 0 },
          { key: "infants", label: "Infants", type: "number", defaultValue: 0 },
          { key: "preferredLanguage", label: "Language", type: "text", nullable: true },
          {
            key: "roomPreference",
            label: "Room Preference",
            type: "select",
            nullable: true,
            options: [
              { label: "DOUBLE", value: "DOUBLE" },
              { label: "TWIN", value: "TWIN" },
              { label: "MIXED", value: "MIXED" },
            ],
          },
          {
            key: "mealPreference",
            label: "Meal Preference",
            type: "select",
            nullable: true,
            options: [
              { label: "BB", value: "BB" },
              { label: "HB", value: "HB" },
              { label: "FB", value: "FB" },
              { label: "AI", value: "AI" },
            ],
          },
          {
            key: "currencyCode",
            label: "Currency",
            type: "select",
            required: true,
            defaultValue: "USD",
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
          { key: "pricingPolicy", label: "Pricing Policy JSON", type: "json", nullable: true },
          { key: "baseTotal", label: "Base Total", type: "number", defaultValue: 0 },
          { key: "taxTotal", label: "Tax Total", type: "number", defaultValue: 0 },
          { key: "grandTotal", label: "Grand Total", type: "number", defaultValue: 0 },
          { key: "version", label: "Version", type: "number", defaultValue: 1 },
          { key: "isLocked", label: "Locked", type: "boolean", defaultValue: false },
          { key: "notes", label: "Notes", type: "textarea", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "pre-tour-days":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
          { key: "dayNumber", label: "Day Number", type: "number", required: true, defaultValue: 1 },
          { key: "date", label: "Date", type: "datetime", required: true },
          { key: "title", label: "Title", type: "text", nullable: true },
          { key: "startLocationId", label: "Start Location", type: "select", nullable: true, options: locationOptions },
          { key: "endLocationId", label: "End Location", type: "select", nullable: true, options: locationOptions },
          { key: "notes", label: "Notes", type: "textarea", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "pre-tour-items":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
          { key: "dayId", label: "Day", type: "select", required: true, options: dayOptions },
          {
            key: "itemType",
            label: "Item Type",
            type: "select",
            defaultValue: "MISC",
            options: [
              { label: "TRANSPORT", value: "TRANSPORT" },
              { label: "ACTIVITY", value: "ACTIVITY" },
              { label: "ACCOMMODATION", value: "ACCOMMODATION" },
              { label: "GUIDE", value: "GUIDE" },
              { label: "SUPPLEMENT", value: "SUPPLEMENT" },
              { label: "MISC", value: "MISC" },
            ],
          },
          { key: "serviceId", label: "Service", type: "select", nullable: true, options: serviceOptions },
          { key: "title", label: "Title", type: "text", nullable: true },
          { key: "description", label: "Description", type: "textarea", nullable: true },
          { key: "startAt", label: "Start At", type: "datetime", nullable: true },
          { key: "endAt", label: "End At", type: "datetime", nullable: true },
          { key: "sortOrder", label: "Sort Order", type: "number", defaultValue: 0 },
          { key: "pax", label: "Pax", type: "number", nullable: true },
          { key: "units", label: "Units", type: "number", nullable: true },
          { key: "nights", label: "Nights", type: "number", nullable: true },
          { key: "rooms", label: "Rooms JSON", type: "json", nullable: true },
          { key: "fromLocationId", label: "From", type: "select", nullable: true, options: locationOptions },
          { key: "toLocationId", label: "To", type: "select", nullable: true, options: locationOptions },
          { key: "locationId", label: "Location", type: "select", nullable: true, options: locationOptions },
          { key: "rateId", label: "Rate Id", type: "text", nullable: true },
          { key: "currencyCode", label: "Currency", type: "select", required: true, defaultValue: "USD", options: currencyOptions },
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
          { key: "baseAmount", label: "Base Amount", type: "number", defaultValue: 0 },
          { key: "taxAmount", label: "Tax Amount", type: "number", defaultValue: 0 },
          { key: "totalAmount", label: "Total Amount", type: "number", defaultValue: 0 },
          { key: "pricingSnapshot", label: "Pricing Snapshot JSON", type: "json", nullable: true },
          {
            key: "status",
            label: "Status",
            type: "select",
            defaultValue: "PLANNED",
            options: [
              { label: "PLANNED", value: "PLANNED" },
              { label: "CONFIRMED", value: "CONFIRMED" },
              { label: "CANCELLED", value: "CANCELLED" },
              { label: "COMPLETED", value: "COMPLETED" },
            ],
          },
          { key: "notes", label: "Notes", type: "textarea", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "pre-tour-item-addons":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
          { key: "planItemId", label: "Plan Item", type: "select", required: true, options: filteredItemOptions },
          {
            key: "addonType",
            label: "Addon Type",
            type: "select",
            defaultValue: "SUPPLEMENT",
            options: [
              { label: "SUPPLEMENT", value: "SUPPLEMENT" },
              { label: "MISC", value: "MISC" },
            ],
          },
          { key: "addonServiceId", label: "Addon Service", type: "text", nullable: true },
          { key: "title", label: "Title", type: "text", required: true },
          { key: "qty", label: "Quantity", type: "number", defaultValue: 1 },
          { key: "currencyCode", label: "Currency", type: "select", required: true, defaultValue: "USD", options: currencyOptions },
          { key: "baseAmount", label: "Base Amount", type: "number", defaultValue: 0 },
          { key: "taxAmount", label: "Tax Amount", type: "number", defaultValue: 0 },
          { key: "totalAmount", label: "Total Amount", type: "number", defaultValue: 0 },
          { key: "snapshot", label: "Snapshot JSON", type: "json", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "pre-tour-totals":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
          { key: "currencyCode", label: "Currency", type: "select", required: true, defaultValue: "USD", options: currencyOptions },
          { key: "totalsByType", label: "Totals By Type JSON", type: "json", nullable: true },
          { key: "baseTotal", label: "Base Total", type: "number", required: true, defaultValue: 0 },
          { key: "taxTotal", label: "Tax Total", type: "number", required: true, defaultValue: 0 },
          { key: "grandTotal", label: "Grand Total", type: "number", required: true, defaultValue: 0 },
          { key: "snapshot", label: "Snapshot JSON", type: "json", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      default:
        return [];
    }
  }, [
    dialog.resource,
    planOptions,
    dayOptions,
    filteredItemOptions,
    locationOptions,
    serviceOptions,
    currencyOptions,
    operatorOrganizationOptions,
    marketOrganizationOptions,
  ]);

  const visibleFields = useMemo(() => {
    if (!isPlanManageMode) return fields;
    if (dialog.resource === "pre-tour-days") return fields.filter((field) => field.key !== "planId");
    if (dialog.resource === "pre-tour-items") {
      return fields.filter((field) => field.key !== "planId" && field.key !== "dayId");
    }
    if (dialog.resource === "pre-tour-item-addons") {
      return fields.filter((field) => field.key !== "planId" && field.key !== "planItemId");
    }
    if (dialog.resource === "pre-tour-totals") return fields.filter((field) => field.key !== "planId");
    return fields;
  }, [fields, isPlanManageMode, dialog.resource]);

  const lookupLabel = useCallback(
    (id: unknown) => {
      if (!id || typeof id !== "string") return "-";
      return lookups[id] ?? id;
    },
    [lookups]
  );

  const loadMasters = useCallback(async () => {
    const [locationRows, activityRows, guideRows, currencyRows, organizationRows] =
      await Promise.all([
        listTransportRecords("locations", { limit: 300 }),
        listActivityRecords("activities", { limit: 300 }),
        listGuideRecords("guides", { limit: 300 }),
        listCurrencyRecords("currencies", { limit: 200 }),
        listBusinessNetworkRecords("organizations", { limit: 400 }),
      ]);

    setLocations(locationRows);
    setActivities(activityRows);
    setGuides(guideRows);
    setCurrencies(currencyRows);
    setOrganizations(organizationRows);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const planRows = await listPreTourRecords("pre-tours", {
        limit: 400,
        q: isPlanManageMode ? undefined : query || undefined,
      });
      setPlans(planRows);

      if (!isPlanManageMode) {
        setDays([]);
        setItems([]);
        setAddons([]);
        setTotals([]);
        return;
      }

      const [dayRows, itemRows, addonRows, totalRows] = await Promise.all([
        listPreTourRecords("pre-tour-days", { limit: 500, planId: managedPlanId }),
        listPreTourRecords("pre-tour-items", { limit: 500, planId: managedPlanId }),
        listPreTourRecords("pre-tour-item-addons", { limit: 500, planId: managedPlanId }),
        listPreTourRecords("pre-tour-totals", { limit: 500, planId: managedPlanId }),
      ]);

      setDays(dayRows);
      setItems(itemRows);
      setAddons(addonRows);
      setTotals(totalRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [isPlanManageMode, managedPlanId, query]);

  useEffect(() => {
    void loadMasters().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load lookup data.");
    });
  }, [loadMasters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isPlanManageMode) return;
    if (sortedDays.length === 0) {
      setSelectedDayId("");
      return;
    }
    const exists = sortedDays.some((day) => String(day.id) === selectedDayId);
    if (!selectedDayId || !exists) {
      setSelectedDayId(String(sortedDays[0].id));
    }
  }, [isPlanManageMode, selectedDayId, sortedDays]);

  useEffect(() => {
    if (!isPlanManageMode) return;
    if (selectedDayItems.length === 0) {
      setSelectedItemId("");
      return;
    }
    const exists = selectedDayItems.some((item) => String(item.id) === selectedItemId);
    if (!selectedItemId || !exists) {
      setSelectedItemId(String(selectedDayItems[0].id));
    }
  }, [isPlanManageMode, selectedDayItems, selectedItemId]);

  const openDialog = (resource: PreTourResourceKey, mode: "create" | "edit", row?: Row) => {
    setDialog({ open: true, mode, resource, row: row || null });
  };

  useEffect(() => {
    if (!dialog.open) return;

    const nextForm: Row = {};
    visibleFields.forEach((field) => {
      const existing = dialog.row?.[field.key];
      if (field.type === "datetime") {
        nextForm[field.key] = existing ? toLocalDateTime(existing) : "";
      } else if (field.type === "json") {
        nextForm[field.key] = existing ? JSON.stringify(existing, null, 2) : "";
      } else if (existing !== undefined) {
        nextForm[field.key] = existing;
      } else {
        nextForm[field.key] = defaultValue(field);
      }
    });

    if (isPlanManageMode && dialog.mode === "create") {
      if (
        ["pre-tour-days", "pre-tour-items", "pre-tour-item-addons", "pre-tour-totals"].includes(
          dialog.resource
        )
      ) {
        nextForm.planId = managedPlanId;
      }

      if (dialog.resource === "pre-tour-days") {
        const nextDayNumber = sortedDays.length + 1;
        nextForm.dayNumber = nextDayNumber;
        if (selectedPlan?.startDate && typeof selectedPlan.startDate === "string") {
          nextForm.date = toLocalDateTime(
            addDays(selectedPlan.startDate, nextDayNumber - 1).toISOString()
          );
        }
      }

      if (dialog.resource === "pre-tour-items" && selectedDayId) {
        nextForm.dayId = selectedDayId;
      }

      if (dialog.resource === "pre-tour-item-addons" && selectedItemId) {
        nextForm.planItemId = selectedItemId;
      }
    }

    setForm(nextForm);
  }, [
    dialog.open,
    dialog.mode,
    dialog.resource,
    dialog.row,
    isPlanManageMode,
    managedPlanId,
    sortedDays,
    selectedPlan,
    selectedDayId,
    selectedItemId,
    visibleFields,
  ]);

  const onSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      visibleFields.forEach((field) => {
        payload[field.key] = parseFieldValue(field, form[field.key]);
      });

      if (isPlanManageMode && dialog.resource !== "pre-tours") {
        payload.planId = managedPlanId;
      }
      if (isPlanManageMode && dialog.resource === "pre-tour-items" && selectedDayId) {
        payload.dayId = selectedDayId;
      }
      if (isPlanManageMode && dialog.resource === "pre-tour-item-addons" && selectedItemId) {
        payload.planItemId = selectedItemId;
      }

      if (dialog.mode === "create") {
        await createPreTourRecord(dialog.resource, payload);
        toast.success("Record created.");
      } else {
        const id = String(dialog.row?.id || "");
        await updatePreTourRecord(dialog.resource, id, payload);
        toast.success("Record updated.");
      }

      setDialog((prev) => ({ ...prev, open: false, row: null, mode: "create" }));
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save record.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (resource: PreTourResourceKey, row: Row) => {
    if (isReadOnly) {
      toast.error("You are in read-only mode.");
      return;
    }

    try {
      await deletePreTourRecord(resource, String(row.id));
      toast.success("Record deleted.");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete record.");
    }
  };

  const moveItemWithinDay = useCallback(
    async (dayId: string, fromItemId: string, toItemId: string) => {
      if (!fromItemId || !toItemId || fromItemId === toItemId) return;

      const dayItems = items
        .filter((item) => String(item.dayId) === dayId)
        .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));

      const fromIndex = dayItems.findIndex((item) => String(item.id) === fromItemId);
      const toIndex = dayItems.findIndex((item) => String(item.id) === toItemId);
      if (fromIndex < 0 || toIndex < 0) return;

      const reordered = [...dayItems];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      const reorderMap = new Map<string, number>();
      reordered.forEach((item, index) => {
        reorderMap.set(String(item.id), index + 1);
      });

      setItems((prev) =>
        prev.map((item) => {
          const nextOrder = reorderMap.get(String(item.id));
          if (nextOrder === undefined) return item;
          return { ...item, sortOrder: nextOrder };
        })
      );

      try {
        await Promise.all(
          reordered.map((item, index) =>
            updatePreTourRecord("pre-tour-items", String(item.id), { sortOrder: index + 1 })
          )
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to reorder items.");
        await loadData();
      }
    },
    [items, loadData]
  );

  const shareItemToDay = useCallback(async () => {
    if (!sharingItem || !shareTargetDayId) {
      toast.error("Select a target day.");
      return;
    }

    const targetDay = sortedDays.find((day) => String(day.id) === shareTargetDayId);
    const dayNum = Number(targetDay?.dayNumber ?? 0);
    const sourceCode = sanitizeCodePart(String(sharingItem.code || "ITEM"));
    const code = `${sourceCode}_D${String(dayNum || 0).padStart(2, "0")}_${Date.now()
      .toString()
      .slice(-4)}`;

    const payload: Record<string, unknown> = {
      code: code.slice(0, 80),
      planId: managedPlanId,
      dayId: shareTargetDayId,
      itemType: String(sharingItem.itemType || "MISC"),
      serviceId: sharingItem.serviceId ?? null,
      startAt: sharingItem.startAt ? new Date(String(sharingItem.startAt)).toISOString() : null,
      endAt: sharingItem.endAt ? new Date(String(sharingItem.endAt)).toISOString() : null,
      sortOrder: Number(sharingItem.sortOrder ?? 0),
      pax: sharingItem.pax ?? null,
      units: sharingItem.units ?? null,
      nights: sharingItem.nights ?? null,
      rooms: sharingItem.rooms ?? null,
      fromLocationId: sharingItem.fromLocationId ?? null,
      toLocationId: sharingItem.toLocationId ?? null,
      locationId: sharingItem.locationId ?? null,
      rateId: sharingItem.rateId ?? null,
      currencyCode: String(sharingItem.currencyCode || selectedPlan?.currencyCode || "USD"),
      priceMode: String(sharingItem.priceMode || selectedPlan?.priceMode || "EXCLUSIVE"),
      baseAmount: Number(sharingItem.baseAmount ?? 0),
      taxAmount: Number(sharingItem.taxAmount ?? 0),
      totalAmount: Number(sharingItem.totalAmount ?? 0),
      pricingSnapshot: sharingItem.pricingSnapshot ?? null,
      title: sharingItem.title ?? null,
      description: sharingItem.description ?? null,
      notes: sharingItem.notes ?? null,
      status: String(sharingItem.status || "PLANNED"),
      isActive: Boolean(sharingItem.isActive ?? true),
    };

    setSharing(true);
    try {
      await createPreTourRecord("pre-tour-items", payload);
      toast.success("Item shared to selected day.");
      setSharingItem(null);
      setShareTargetDayId("");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to share item.");
    } finally {
      setSharing(false);
    }
  }, [sharingItem, shareTargetDayId, sortedDays, managedPlanId, selectedPlan, loadData]);

  const clonePlanChildren = useCallback(
    async (sourcePlan: Row, newPlanId: string, codePrefix: string) => {
      const sourcePlanId = String(sourcePlan.id);
      const [sourceDays, sourceItems, sourceAddons, sourceTotals] = await Promise.all([
        listPreTourRecords("pre-tour-days", { planId: sourcePlanId, limit: 1000 }),
        listPreTourRecords("pre-tour-items", { planId: sourcePlanId, limit: 2000 }),
        listPreTourRecords("pre-tour-item-addons", { planId: sourcePlanId, limit: 2000 }),
        listPreTourRecords("pre-tour-totals", { planId: sourcePlanId, limit: 10 }),
      ]);

      const dayIdMap = new Map<string, string>();
      const sortedSourceDays = [...sourceDays].sort(
        (a, b) => Number(a.dayNumber || 0) - Number(b.dayNumber || 0)
      );
      for (const sourceDay of sortedSourceDays) {
        const dayNumber = Number(sourceDay.dayNumber || 1);
        const createdDay = await createPreTourRecord("pre-tour-days", {
          code: `${codePrefix}_DAY_${String(dayNumber).padStart(2, "0")}`.slice(0, 80),
          planId: newPlanId,
          dayNumber,
          date: new Date(String(sourceDay.date)).toISOString(),
          title: sourceDay.title ?? null,
          notes: sourceDay.notes ?? null,
          startLocationId: sourceDay.startLocationId ?? null,
          endLocationId: sourceDay.endLocationId ?? null,
          isActive: Boolean(sourceDay.isActive ?? true),
        });
        dayIdMap.set(String(sourceDay.id), String(createdDay.id));
      }

      const itemIdMap = new Map<string, string>();
      const sortedSourceItems = [...sourceItems].sort(
        (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
      );
      for (const sourceItem of sortedSourceItems) {
        const mappedDayId = dayIdMap.get(String(sourceItem.dayId));
        if (!mappedDayId) continue;
        const createdItem = await createPreTourRecord("pre-tour-items", {
          code: `${codePrefix}_ITEM_${String(sourceItem.sortOrder || 0)}`.slice(0, 80),
          planId: newPlanId,
          dayId: mappedDayId,
          itemType: String(sourceItem.itemType || "MISC"),
          serviceId: sourceItem.serviceId ?? null,
          startAt: sourceItem.startAt ? new Date(String(sourceItem.startAt)).toISOString() : null,
          endAt: sourceItem.endAt ? new Date(String(sourceItem.endAt)).toISOString() : null,
          sortOrder: Number(sourceItem.sortOrder || 0),
          pax: sourceItem.pax ?? null,
          units: sourceItem.units ?? null,
          nights: sourceItem.nights ?? null,
          rooms: sourceItem.rooms ?? null,
          fromLocationId: sourceItem.fromLocationId ?? null,
          toLocationId: sourceItem.toLocationId ?? null,
          locationId: sourceItem.locationId ?? null,
          rateId: sourceItem.rateId ?? null,
          currencyCode: String(sourceItem.currencyCode || sourcePlan.currencyCode || "USD"),
          priceMode: String(sourceItem.priceMode || sourcePlan.priceMode || "EXCLUSIVE"),
          baseAmount: Number(sourceItem.baseAmount || 0),
          taxAmount: Number(sourceItem.taxAmount || 0),
          totalAmount: Number(sourceItem.totalAmount || 0),
          pricingSnapshot: sourceItem.pricingSnapshot ?? null,
          title: sourceItem.title ?? null,
          description: sourceItem.description ?? null,
          notes: sourceItem.notes ?? null,
          status: String(sourceItem.status || "PLANNED"),
          isActive: Boolean(sourceItem.isActive ?? true),
        });
        itemIdMap.set(String(sourceItem.id), String(createdItem.id));
      }

      for (const sourceAddon of sourceAddons) {
        const mappedItemId = itemIdMap.get(String(sourceAddon.planItemId));
        if (!mappedItemId) continue;
        await createPreTourRecord("pre-tour-item-addons", {
          code: `${codePrefix}_ADDON_${String(sourceAddon.id).slice(-6)}`.slice(0, 80),
          planId: newPlanId,
          planItemId: mappedItemId,
          addonType: String(sourceAddon.addonType || "SUPPLEMENT"),
          addonServiceId: sourceAddon.addonServiceId ?? null,
          title: sourceAddon.title ?? null,
          qty: Number(sourceAddon.qty || 1),
          currencyCode: String(sourceAddon.currencyCode || sourcePlan.currencyCode || "USD"),
          baseAmount: Number(sourceAddon.baseAmount || 0),
          taxAmount: Number(sourceAddon.taxAmount || 0),
          totalAmount: Number(sourceAddon.totalAmount || 0),
          snapshot: sourceAddon.snapshot ?? null,
          isActive: Boolean(sourceAddon.isActive ?? true),
        });
      }

      for (const sourceTotal of sourceTotals) {
        await createPreTourRecord("pre-tour-totals", {
          code: `${codePrefix}_TOTAL`.slice(0, 80),
          planId: newPlanId,
          currencyCode: String(sourceTotal.currencyCode || sourcePlan.currencyCode || "USD"),
          totalsByType: sourceTotal.totalsByType ?? null,
          baseTotal: Number(sourceTotal.baseTotal || 0),
          taxTotal: Number(sourceTotal.taxTotal || 0),
          grandTotal: Number(sourceTotal.grandTotal || 0),
          snapshot: sourceTotal.snapshot ?? null,
          isActive: Boolean(sourceTotal.isActive ?? true),
        });
      }
    },
    []
  );

  const createVersionFromPlan = useCallback(
    async (sourcePlan: Row) => {
      if (!sourcePlan.operatorOrgId || !sourcePlan.marketOrgId) {
        toast.error("Source pre-tour must have Operator and Market before creating a version.");
        return;
      }
      const sourceReferenceNo = String(sourcePlan.referenceNo || sourcePlan.planCode || "");
      const versions = plans
        .filter((plan) => String(plan.referenceNo || "") === sourceReferenceNo)
        .map((plan) => Number(plan.version || 1));
      const nextVersion = (versions.length ? Math.max(...versions) : 1) + 1;
      const sourcePlanCode = String(sourcePlan.planCode || sourcePlan.code || "PRE_TOUR");
      const sourceCode = String(sourcePlan.code || sourcePlan.planCode || "PRE_TOUR");
      const codePrefix = `${sourcePlanCode}_V${nextVersion}`;

      const headerPayload: Record<string, unknown> = {
        code: `${sourceCode}_V${nextVersion}`.slice(0, 80),
        referenceNo: sourceReferenceNo,
        planCode: codePrefix.slice(0, 80),
        title: String(sourcePlan.title || "") || "Pre-Tour",
        operatorOrgId: sourcePlan.operatorOrgId,
        marketOrgId: sourcePlan.marketOrgId,
        status: "DRAFT",
        startDate: new Date(String(sourcePlan.startDate)).toISOString(),
        endDate: new Date(String(sourcePlan.endDate)).toISOString(),
        totalNights: Number(sourcePlan.totalNights || 0),
        adults: Number(sourcePlan.adults || 1),
        children: Number(sourcePlan.children || 0),
        infants: Number(sourcePlan.infants || 0),
        preferredLanguage: sourcePlan.preferredLanguage ?? null,
        roomPreference: sourcePlan.roomPreference ?? null,
        mealPreference: sourcePlan.mealPreference ?? null,
        notes: sourcePlan.notes ?? null,
        currencyCode: String(sourcePlan.currencyCode || "USD"),
        priceMode: String(sourcePlan.priceMode || "EXCLUSIVE"),
        pricingPolicy: sourcePlan.pricingPolicy ?? null,
        baseTotal: Number(sourcePlan.baseTotal || 0),
        taxTotal: Number(sourcePlan.taxTotal || 0),
        grandTotal: Number(sourcePlan.grandTotal || 0),
        version: nextVersion,
        isLocked: false,
        isActive: Boolean(sourcePlan.isActive ?? true),
      };

      setCreatingVersion(true);
      try {
        const createdPlan = await createPreTourRecord("pre-tours", headerPayload);
        await clonePlanChildren(sourcePlan, String(createdPlan.id), codePrefix);
        toast.success(`Version V${nextVersion} created.`);
        await loadData();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create version.");
      } finally {
        setCreatingVersion(false);
      }
    },
    [clonePlanChildren, plans, loadData]
  );

  const openCopyPlanDialog = useCallback((sourcePlan: Row) => {
    const sourcePlanCode = String(sourcePlan.planCode || sourcePlan.code || "PRE_TOUR");
    const sourceCode = String(sourcePlan.code || sourcePlan.planCode || "PRE_TOUR");
    const copySuffix = Date.now().toString().slice(-4);
    setCopySourcePlan(sourcePlan);
    setCopyForm({
      code: `${sourceCode}_COPY_${copySuffix}`.slice(0, 80),
      planCode: `${sourcePlanCode}_COPY_${copySuffix}`.slice(0, 80),
      title: `${String(sourcePlan.title || "Pre-Tour")} (Copy)`,
      startDate: toLocalDateTime(sourcePlan.startDate),
      endDate: toLocalDateTime(sourcePlan.endDate),
      totalNights: String(Number(sourcePlan.totalNights || 0)),
      adults: String(Number(sourcePlan.adults || 1)),
      children: String(Number(sourcePlan.children || 0)),
      infants: String(Number(sourcePlan.infants || 0)),
      operatorOrgId: String(sourcePlan.operatorOrgId || ""),
      marketOrgId: String(sourcePlan.marketOrgId || ""),
      currencyCode: String(sourcePlan.currencyCode || "USD"),
      priceMode: String(sourcePlan.priceMode || "EXCLUSIVE"),
    });
    setCopyDialogOpen(true);
  }, []);

  const submitCopyPlan = useCallback(async () => {
    if (!copySourcePlan) return;
    if (
      !copyForm.code.trim() ||
      !copyForm.planCode.trim() ||
      !copyForm.operatorOrgId ||
      !copyForm.marketOrgId
    ) {
      toast.error("Code, Plan Code, Operator and Market are required.");
      return;
    }

    const startIso = toIsoDateTime(copyForm.startDate);
    const endIso = toIsoDateTime(copyForm.endDate);
    if (!startIso || !endIso) {
      toast.error("Start Date and End Date are required.");
      return;
    }

    const headerPayload: Record<string, unknown> = {
      code: copyForm.code.trim().toUpperCase(),
      planCode: copyForm.planCode.trim().toUpperCase(),
      title: copyForm.title.trim() || "Pre-Tour",
      operatorOrgId: copyForm.operatorOrgId,
      marketOrgId: copyForm.marketOrgId,
      status: "DRAFT",
      startDate: startIso,
      endDate: endIso,
      totalNights: Number(copyForm.totalNights || 0),
      adults: Number(copyForm.adults || 1),
      children: Number(copyForm.children || 0),
      infants: Number(copyForm.infants || 0),
      preferredLanguage: copySourcePlan.preferredLanguage ?? null,
      roomPreference: copySourcePlan.roomPreference ?? null,
      mealPreference: copySourcePlan.mealPreference ?? null,
      notes: copySourcePlan.notes ?? null,
      currencyCode: copyForm.currencyCode,
      priceMode: copyForm.priceMode,
      pricingPolicy: copySourcePlan.pricingPolicy ?? null,
      baseTotal: Number(copySourcePlan.baseTotal || 0),
      taxTotal: Number(copySourcePlan.taxTotal || 0),
      grandTotal: Number(copySourcePlan.grandTotal || 0),
      version: 1,
      isLocked: false,
      isActive: Boolean(copySourcePlan.isActive ?? true),
    };

    setCopySaving(true);
    try {
      const createdPlan = await createPreTourRecord("pre-tours", headerPayload);
      await clonePlanChildren(copySourcePlan, String(createdPlan.id), copyForm.planCode.trim().toUpperCase());
      toast.success("Pre-tour copied successfully.");
      setCopyDialogOpen(false);
      setCopySourcePlan(null);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to copy pre-tour.");
    } finally {
      setCopySaving(false);
    }
  }, [clonePlanChildren, copyForm, copySourcePlan, loadData]);

  const syncDaysFromRange = useCallback(async () => {
    if (!isPlanManageMode || !selectedPlan) return;
    const startDate = String(selectedPlan.startDate || "");
    const endDate = String(selectedPlan.endDate || "");
    const expectedDays = toDayCount(startDate, endDate);

    if (expectedDays <= 0) {
      toast.error("Invalid plan date range. Update pre-tour header dates first.");
      return;
    }

    const existingDayNumbers = new Set(
      days.map((day) => Number(day.dayNumber)).filter((value) => Number.isFinite(value))
    );

    const missingDayNumbers: number[] = [];
    for (let i = 1; i <= expectedDays; i += 1) {
      if (!existingDayNumbers.has(i)) missingDayNumbers.push(i);
    }

    if (missingDayNumbers.length === 0) {
      toast.info("All days are already initialized from the date range.");
      return;
    }

    const baseCode = sanitizeCodePart(
      String(selectedPlan.planCode || selectedPlan.code || "PRE_TOUR")
    );

    setSyncingDays(true);
    try {
      for (const dayNumber of missingDayNumbers) {
        const code = `${baseCode}_DAY_${String(dayNumber).padStart(2, "0")}`;
        const date = addDays(startDate, dayNumber - 1).toISOString();
        await createPreTourRecord("pre-tour-days", {
          code,
          planId: managedPlanId,
          dayNumber,
          date,
          title: `Day ${dayNumber}`,
          isActive: true,
        });
      }
      toast.success(`Initialized ${missingDayNumbers.length} day(s) from plan date range.`);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to initialize plan days.");
    } finally {
      setSyncingDays(false);
    }
  }, [days, isPlanManageMode, loadData, managedPlanId, selectedPlan]);

  useEffect(() => {
    if (!isPlanManageMode || !selectedPlan) return;
    if (syncingDays) return;
    if (days.length > 0) return;
    void syncDaysFromRange();
  }, [days.length, isPlanManageMode, selectedPlan, syncDaysFromRange, syncingDays]);

  const filteredPlanRows = useMemo(
    () => plans.filter((row) => matchesQuery("pre-tours", row, query)),
    [plans, query]
  );

  const filteredAddonRows = useMemo(() => {
    const rows = selectedItemId
      ? addons.filter((row) => String(row.planItemId) === selectedItemId)
      : addons;
    return rows.filter((row) => matchesQuery("pre-tour-item-addons", row, query));
  }, [addons, query, selectedItemId]);

  const filteredTotalRows = useMemo(
    () => totals.filter((row) => matchesQuery("pre-tour-totals", row, query)),
    [totals, query]
  );

  const dayCards = useMemo(() => {
    return sortedDays
      .map((day) => {
        const dayId = String(day.id);
        const dayItems = items
          .filter((item) => String(item.dayId) === dayId)
          .filter((item) => matchesQuery("pre-tour-items", item, query))
          .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));

        const dayMatched =
          matchesQuery("pre-tour-days", day, query) ||
          dayItems.length > 0 ||
          !query.trim();

        if (!dayMatched) return null;

        return { day, dayItems };
      })
      .filter((entry): entry is { day: Row; dayItems: Row[] } => Boolean(entry));
  }, [sortedDays, items, query]);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-3 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>{isPlanManageMode ? "Pre-Tour Workspace" : "Pre-Tour Plans"}</CardTitle>
            <CardDescription>
              {isPlanManageMode
                ? "Complete day-wise planning view for this pre-tour."
                : "Initialize pre-tour headers and manage each plan."}
            </CardDescription>
            {isPlanManageMode && selectedPlan ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Plan: <span className="font-medium text-foreground">{selectedPlan.code as string}</span> - {selectedPlan.title as string}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {isPlanManageMode ? (
              <Button variant="outline" asChild>
                <Link href="/master-data/pre-tours">
                  <ArrowLeft className="mr-1 size-4" />
                  Back to Plans
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => void loadData()}>
              <RefreshCw className="mr-1 size-4" />
              Refresh
            </Button>
            {isPlanManageMode ? (
              <Button
                variant="outline"
                onClick={() => void syncDaysFromRange()}
                disabled={isReadOnly || syncingDays}
              >
                {syncingDays ? "Syncing..." : "Sync Days From Range"}
              </Button>
            ) : null}
            {!isPlanManageMode ? (
              <Button className="master-add-btn" onClick={() => openDialog("pre-tours", "create")} disabled={isReadOnly}>
                <Plus className="mr-1 size-4" />
                Add Pre-Tour
              </Button>
            ) : null}
          </div>
        </div>

        <Input
          placeholder={isPlanManageMode ? "Search in days, items, addons, totals..." : "Search plans..."}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        {isPlanManageMode ? (
          <PreTourDayWorkspace
            days={sortedDays}
            items={items}
            selectedDayId={selectedDayId}
            onSelectDay={setSelectedDayId}
            lookupLabel={lookupLabel}
            onAddItem={() => openDialog("pre-tour-items", "create")}
            disableAdd={isReadOnly}
          />
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3 px-4 pb-3 pt-0">
        {!isPlanManageMode ? (
          <SectionTable
            resource="pre-tours"
            rows={filteredPlanRows}
            loading={loading}
            isReadOnly={isReadOnly}
            lookups={lookups}
            showManage
            onCreateVersion={(row) => void createVersionFromPlan(row)}
            onCopyPlan={(row) => openCopyPlanDialog(row)}
            onAdd={() => openDialog("pre-tours", "create")}
            onEdit={(row) => openDialog("pre-tours", "edit", row)}
            onDelete={(row) => void onDelete("pre-tours", row)}
          />
        ) : (
          <>
            {dayCards.map(({ day, dayItems }) => (
              <Card key={String(day.id)} className="border-border/70 shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-3 py-2.5">
                  <div>
                    <CardTitle className="text-sm">
                      Day {String(day.dayNumber)} {day.title ? `• ${String(day.title)}` : ""}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {formatDate(day.date)} • {lookupLabel(day.startLocationId)} → {lookupLabel(day.endLocationId)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      className="master-add-btn"
                      onClick={() => {
                        setSelectedDayId(String(day.id));
                        openDialog("pre-tour-items", "create");
                      }}
                      disabled={isReadOnly}
                    >
                      <Plus className="mr-1 size-4" />
                      Add Item
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDialog("pre-tour-days", "edit", day)}
                      disabled={isReadOnly}
                    >
                      <Settings2 className="mr-1 size-4" />
                      Details
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-2.5 pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[28px]" />
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-3 text-center text-muted-foreground">
                            No plan items for this day.
                          </TableCell>
                        </TableRow>
                      ) : (
                        dayItems.map((item) => {
                          const itemId = String(item.id);
                          const itemAddons = addons
                            .filter((addon) => String(addon.planItemId) === itemId)
                            .filter((addon) => matchesQuery("pre-tour-item-addons", addon, query));

                          return (
                            <TableRow
                              key={itemId}
                              className={itemTypeAccentClass(item.itemType)}
                              draggable={!isReadOnly}
                              onDragStart={() => setDragItemId(itemId)}
                              onDragEnd={() => setDragItemId("")}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => {
                                event.preventDefault();
                                void moveItemWithinDay(String(day.id), dragItemId, itemId);
                                setDragItemId("");
                              }}
                            >
                              <TableCell className="py-1.5">
                                <GripVertical className="size-4 text-muted-foreground" />
                              </TableCell>
                              <TableCell className="py-1.5">
                                <Badge variant="secondary">{String(item.itemType || "-")}</Badge>
                              </TableCell>
                              <TableCell className="py-1.5 align-top">
                                <div className="font-medium">{String(item.title || item.code || "-")}</div>
                                {itemAddons.length > 0 ? (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {itemAddons.map((addon) => (
                                      <Badge
                                        key={String(addon.id)}
                                        variant="outline"
                                        className="cursor-pointer"
                                        onClick={() => {
                                          setSelectedItemId(itemId);
                                          openDialog("pre-tour-item-addons", "edit", addon);
                                        }}
                                      >
                                        {String(addon.title || addon.code)}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell className="py-1.5">
                                {String(item.startAt || "").slice(11, 16) || "-"} -{" "}
                                {String(item.endAt || "").slice(11, 16) || "-"}
                              </TableCell>
                              <TableCell className="py-1.5">
                                {String(item.currencyCode || "-")} {String(item.totalAmount || "0")}
                              </TableCell>
                              <TableCell className="py-1.5">
                                <Badge variant="outline">{String(item.status || "-")}</Badge>
                              </TableCell>
                              <TableCell className="py-1.5 text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedDayId(String(day.id));
                                      setSelectedItemId(itemId);
                                      openDialog("pre-tour-item-addons", "create");
                                    }}
                                    disabled={isReadOnly}
                                  >
                                    + Addon
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSharingItem(item);
                                      setShareTargetDayId("");
                                    }}
                                    disabled={isReadOnly}
                                  >
                                    <CopyPlus className="mr-1 size-4" />
                                    Share
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedDayId(String(day.id));
                                      setSelectedItemId(itemId);
                                      openDialog("pre-tour-items", "edit", item);
                                    }}
                                    disabled={isReadOnly}
                                  >
                                    <Settings2 className="mr-1 size-4" />
                                    Details
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void onDelete("pre-tour-items", item)}
                                    disabled={isReadOnly}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}

            <SectionTable
              resource="pre-tour-item-addons"
              rows={filteredAddonRows}
              loading={loading}
              isReadOnly={isReadOnly}
              lookups={lookups}
              onAdd={() => openDialog("pre-tour-item-addons", "create")}
              onEdit={(row) => openDialog("pre-tour-item-addons", "edit", row)}
              onDelete={(row) => void onDelete("pre-tour-item-addons", row)}
            />
            <SectionTable
              resource="pre-tour-totals"
              rows={filteredTotalRows}
              loading={loading}
              isReadOnly={isReadOnly}
              lookups={lookups}
              onAdd={() => openDialog("pre-tour-totals", "create")}
              onEdit={(row) => openDialog("pre-tour-totals", "edit", row)}
              onDelete={(row) => void onDelete("pre-tour-totals", row)}
            />
          </>
        )}
      </CardContent>

      <Dialog open={Boolean(sharingItem)} onOpenChange={(open) => (!open ? setSharingItem(null) : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Item To Another Day</DialogTitle>
            <DialogDescription>
              Copy this item and assign it to another day in the same pre-tour.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Target Day</Label>
            <Select value={shareTargetDayId} onValueChange={setShareTargetDayId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select target day" />
              </SelectTrigger>
              <SelectContent>
                {dayOptions
                  .filter(
                    (option) => option.value !== String(sharingItem?.dayId || "")
                  )
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSharingItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void shareItemToDay()}
              disabled={!shareTargetDayId || sharing || isReadOnly}
            >
              {sharing ? "Sharing..." : "Share Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={copyDialogOpen}
        onOpenChange={(open) => {
          setCopyDialogOpen(open);
          if (!open) {
            setCopySourcePlan(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Copy Pre-Tour</DialogTitle>
            <DialogDescription>
              Update header details before creating the copied pre-tour.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs">Code *</Label>
              <Input
                value={copyForm.code}
                onChange={(event) => setCopyForm((prev) => ({ ...prev, code: event.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Plan Code *</Label>
              <Input
                value={copyForm.planCode}
                onChange={(event) =>
                  setCopyForm((prev) => ({ ...prev, planCode: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Title *</Label>
              <Input
                value={copyForm.title}
                onChange={(event) => setCopyForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Operator *</Label>
              <Select
                value={copyForm.operatorOrgId}
                onValueChange={(value) =>
                  setCopyForm((prev) => ({ ...prev, operatorOrgId: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {operatorOrganizationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Market *</Label>
              <Select
                value={copyForm.marketOrgId}
                onValueChange={(value) =>
                  setCopyForm((prev) => ({ ...prev, marketOrgId: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select market" />
                </SelectTrigger>
                <SelectContent>
                  {marketOrganizationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Start Date *</Label>
              <Input
                type="datetime-local"
                value={copyForm.startDate}
                onChange={(event) =>
                  setCopyForm((prev) => ({ ...prev, startDate: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">End Date *</Label>
              <Input
                type="datetime-local"
                value={copyForm.endDate}
                onChange={(event) => setCopyForm((prev) => ({ ...prev, endDate: event.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Total Nights</Label>
              <Input
                type="number"
                value={copyForm.totalNights}
                onChange={(event) =>
                  setCopyForm((prev) => ({ ...prev, totalNights: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Adults</Label>
              <Input
                type="number"
                value={copyForm.adults}
                onChange={(event) => setCopyForm((prev) => ({ ...prev, adults: event.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Children</Label>
              <Input
                type="number"
                value={copyForm.children}
                onChange={(event) =>
                  setCopyForm((prev) => ({ ...prev, children: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Infants</Label>
              <Input
                type="number"
                value={copyForm.infants}
                onChange={(event) =>
                  setCopyForm((prev) => ({ ...prev, infants: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Currency</Label>
              <Select
                value={copyForm.currencyCode}
                onValueChange={(value) => setCopyForm((prev) => ({ ...prev, currencyCode: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Price Mode</Label>
              <Select
                value={copyForm.priceMode}
                onValueChange={(value) => setCopyForm((prev) => ({ ...prev, priceMode: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select price mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXCLUSIVE">EXCLUSIVE</SelectItem>
                  <SelectItem value="INCLUSIVE">INCLUSIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitCopyPlan()} disabled={copySaving || isReadOnly}>
              {copySaving ? "Copying..." : "Copy Pre-Tour"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="flex max-h-[86vh] flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{dialog.mode === "create" ? "Add" : "Edit"} {META[dialog.resource].title}</DialogTitle>
            <DialogDescription>Fill required fields and save.</DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
            {visibleFields.map((field) => (
              <div key={field.key} className={field.type === "textarea" || field.type === "json" ? "md:col-span-2" : ""}>
                <Label className="mb-1 block text-xs font-medium">
                  {field.label}
                  {field.required ? " *" : ""}
                </Label>

                {field.type === "boolean" ? (
                  <div className="mt-2 flex h-10 items-center rounded-md border px-3">
                    <Switch
                      checked={Boolean(form[field.key])}
                      onCheckedChange={(checked) => setForm((prev) => ({ ...prev, [field.key]: checked }))}
                    />
                  </div>
                ) : null}

                {field.type === "select" ? (
                  <Select
                    value={
                      field.nullable
                        ? form[field.key]
                          ? String(form[field.key])
                          : "__none__"
                        : String(form[field.key] ?? "")
                    }
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        [field.key]: field.nullable && value === "__none__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.nullable ? <SelectItem value="__none__">None</SelectItem> : null}
                      {(field.options ?? []).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}

                {field.type === "text" ? (
                  <Input
                    value={String(form[field.key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  />
                ) : null}

                {field.type === "number" ? (
                  <Input
                    type="number"
                    value={String(form[field.key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  />
                ) : null}

                {field.type === "datetime" ? (
                  <Input
                    type="datetime-local"
                    value={String(form[field.key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  />
                ) : null}

                {field.type === "json" ? (
                  <Textarea
                    value={String(form[field.key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    className="min-h-[120px] font-mono text-xs"
                  />
                ) : null}

                {field.type === "textarea" ? (
                  <Textarea
                    value={String(form[field.key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    className="min-h-[100px]"
                  />
                ) : null}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog((prev) => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button onClick={() => void onSave()} disabled={saving || isReadOnly}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
