"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CopyPlus,
  GripVertical,
  MapPinned,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
} from "lucide-react";
import { notify } from "@/lib/notify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordAuditMeta } from "@/components/ui/record-audit-meta";
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
import { TablePagination } from "@/components/ui/table-pagination";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { listTourCategoryRecords } from "@/modules/tour-category/lib/tour-category-api";
import { listTechnicalVisitRecords } from "@/modules/technical-visit/lib/technical-visit-api";
import { PreTourDayWorkspace } from "@/modules/pre-tour/ui/components/pre-tour-day-workspace";
import { PreTourRouteMap } from "@/modules/pre-tour/ui/components/pre-tour-route-map";

export type PreTourResourceKey =
  | "pre-tours"
  | "pre-tour-days"
  | "pre-tour-items"
  | "pre-tour-item-addons"
  | "pre-tour-totals"
  | "pre-tour-categories"
  | "pre-tour-technical-visits"
  | "pre-tour-bins";

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
type CompanySettingsResponse = {
  company?: { baseCurrencyCode?: string | null } | null;
};
type AccessControlResponse = {
  privileges?: string[];
};

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
  "pre-tour-categories": {
    title: "Tour Categories",
    description: "Assign category type and category mapping for this pre-tour.",
  },
  "pre-tour-technical-visits": {
    title: "Field Visits",
    description: "Attach technical/field visits into pre-tour planning context.",
  },
  "pre-tour-bins": {
    title: "Recycle Bin",
    description: "Soft deleted pre-tour records. Admin can permanently delete.",
  },
};

const COLUMNS: Record<PreTourResourceKey, Array<{ key: string; label: string }>> = {
  "pre-tours": [
    { key: "code", label: "Code" },
    { key: "referenceNo", label: "Reference No" },
    { key: "version", label: "Version" },
    { key: "title", label: "Title" },
    { key: "status", label: "Status" },
    { key: "currencyCode", label: "Currency" },
    { key: "updatedByName", label: "Updated By" },
    { key: "updatedAt", label: "Updated At" },
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
  "pre-tour-categories": [
    { key: "code", label: "Code" },
    { key: "typeId", label: "Category Type" },
    { key: "categoryId", label: "Category" },
    { key: "notes", label: "Notes" },
    { key: "isActive", label: "Active" },
  ],
  "pre-tour-technical-visits": [
    { key: "code", label: "Code" },
    { key: "dayId", label: "Day" },
    { key: "technicalVisitId", label: "Field Visit" },
    { key: "notes", label: "Notes" },
    { key: "isActive", label: "Active" },
  ],
  "pre-tour-bins": [
    { key: "programCode", label: "Program" },
    { key: "code", label: "Code" },
    { key: "referenceNo", label: "Reference" },
    { key: "planCode", label: "Plan Code" },
    { key: "deletedByName", label: "Deleted By" },
    { key: "deletedAt", label: "Deleted At" },
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

function toNumericValue(value: string | number | null | undefined, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatCell(value: unknown, lookups: Record<string, string>) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && lookups[value]) return lookups[value];
  if (typeof value === "string" && value.includes("T")) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString();
    }
  }
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

function getCoordinatesFromGeo(geo: unknown): [number, number] | null {
  let geoValue: unknown = geo;
  if (typeof geoValue === "string") {
    try {
      geoValue = JSON.parse(geoValue);
    } catch {
      return null;
    }
  }
  if (!geoValue || typeof geoValue !== "object") return null;
  const coordinates = (geoValue as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return [lon, lat];
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
  hideAdd,
  onView,
  hideEdit,
  editLabel,
  deleteLabel,
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
  onAdd?: () => void;
  hideAdd?: boolean;
  onView?: (row: Row) => void;
  hideEdit?: boolean;
  editLabel?: string;
  deleteLabel?: string;
  onEdit: (row: Row) => void;
  onDelete: (row: Row) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, rows.length]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [page, pageSize, rows]);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-4 py-3">
        <div>
          <CardTitle className="text-sm">{META[resource].title}</CardTitle>
          <CardDescription className="text-xs">{META[resource].description}</CardDescription>
        </div>
        {!hideAdd ? (
          <Button className="master-add-btn" size="sm" onClick={onAdd} disabled={isReadOnly}>
            <Plus className="mr-1 size-4" />
            Add
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="overflow-x-auto">
        <Table className="min-w-[920px]">
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
              paginatedRows.map((row) => (
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
                      {onView ? (
                        <Button size="sm" variant="outline" onClick={() => onView(row)}>
                          <PanelLeftOpen className="mr-1 size-4" />
                          View
                        </Button>
                      ) : null}
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
                      {!hideEdit ? (
                        <Button size="sm" variant="outline" onClick={() => onEdit(row)} disabled={isReadOnly}>
                          <Settings2 className="mr-1 size-4" />
                          {editLabel || "Edit"}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(row)}
                        disabled={isReadOnly}
                      >
                        <Trash2 className="mr-1 size-4" />
                        {deleteLabel || "Delete"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
        <TablePagination
          totalItems={rows.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </CardContent>
    </Card>
  );
}

export function PreTourManagementView({
  initialResource = "pre-tours",
  managedPlanId = "",
  showBinOnly = false,
}: {
  initialResource?: PreTourResourceKey;
  managedPlanId?: string;
  showBinOnly?: boolean;
}) {
  const { data: session } = authClient.useSession();
  const accessUser = session?.user as
    | { readOnly?: boolean; role?: string | null; canWritePreTour?: boolean }
    | undefined;
  const canWrite =
    Boolean(accessUser) &&
    !Boolean(accessUser?.readOnly) &&
    (accessUser?.role === "ADMIN" ||
      accessUser?.role === "MANAGER" ||
      Boolean(accessUser?.canWritePreTour));
  const isReadOnly = !canWrite;
  const isAdmin = accessUser?.role === "ADMIN";
  const [privileges, setPrivileges] = useState<string[]>([]);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const canViewRouteMap = privileges.includes("PRE_TOUR_MAP");
  const canViewCosting = privileges.includes("PRE_TOUR_COSTING");

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
  const [planCategories, setPlanCategories] = useState<Row[]>([]);
  const [planTechnicalVisits, setPlanTechnicalVisits] = useState<Row[]>([]);
  const [planBins, setPlanBins] = useState<Row[]>([]);

  const [locations, setLocations] = useState<Row[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<Row[]>([]);
  const [activities, setActivities] = useState<Row[]>([]);
  const [guides, setGuides] = useState<Row[]>([]);
  const [currencies, setCurrencies] = useState<Row[]>([]);
  const [organizations, setOrganizations] = useState<Row[]>([]);
  const [tourCategoryTypes, setTourCategoryTypes] = useState<Row[]>([]);
  const [tourCategories, setTourCategories] = useState<Row[]>([]);
  const [technicalVisits, setTechnicalVisits] = useState<Row[]>([]);
  const [companyBaseCurrencyCode, setCompanyBaseCurrencyCode] = useState("USD");

  const [selectedDayId, setSelectedDayId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [dragItemId, setDragItemId] = useState("");
  const [sharingItem, setSharingItem] = useState<Row | null>(null);
  const [shareTargetDayId, setShareTargetDayId] = useState("");
  const [sharing, setSharing] = useState(false);
  const [, setCreatingVersion] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourcePlan, setCopySourcePlan] = useState<Row | null>(null);
  const [copySaving, setCopySaving] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [useRoadRoute, setUseRoadRoute] = useState(true);
  const [routeMeta, setRouteMeta] = useState<{ distanceKm: number | null; durationMin: number | null }>({
    distanceKm: null,
    durationMin: null,
  });
  const [drawerRouteMeta, setDrawerRouteMeta] = useState<{
    distanceKm: number | null;
    durationMin: number | null;
  }>({
    distanceKm: null,
    durationMin: null,
  });
  const [drawerShowMap, setDrawerShowMap] = useState(false);
  const [dayTransportForm, setDayTransportForm] = useState<{
    enabled: boolean;
    serviceId: string;
    startAt: string;
    endAt: string;
    pax: string;
    baseAmount: string;
    taxAmount: string;
    totalAmount: string;
    status: string;
    notes: string;
  }>({
    enabled: false,
    serviceId: "",
    startAt: "",
    endAt: "",
    pax: "",
    baseAmount: "0",
    taxAmount: "0",
    totalAmount: "0",
    status: "PLANNED",
    notes: "",
  });
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
    currencyCode: companyBaseCurrencyCode,
    priceMode: "EXCLUSIVE",
  });

  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    resource: PreTourResourceKey;
    row: Row | null;
  }>({ open: false, mode: "create", resource: initialResource, row: null });
  const [form, setForm] = useState<Row>({});
  const [dayPage, setDayPage] = useState(1);
  const [dayPageSize, setDayPageSize] = useState(5);
  const [detailSheet, setDetailSheet] = useState<{
    open: boolean;
    title: string;
    description: string;
    kind: "generic" | "pre-tour" | "day-item";
    dayId?: string;
    row: Row | null;
  }>({ open: false, title: "", description: "", kind: "generic", row: null });
  const [detailPreTourRouteIds, setDetailPreTourRouteIds] = useState<string[]>([]);
  const [detailPreTourRouteLoading, setDetailPreTourRouteLoading] = useState(false);

  const selectedPlan = useMemo(
    () => plans.find((row) => String(row.id) === managedPlanId) ?? null,
    [plans, managedPlanId]
  );

  const sortedDays = useMemo(
    () => [...days].sort((a, b) => Number(a.dayNumber ?? 0) - Number(b.dayNumber ?? 0)),
    [days]
  );

  const selectedDayItems = useMemo(
    () =>
      items.filter(
        (item) =>
          String(item.dayId) === selectedDayId && String(item.itemType || "").toUpperCase() !== "TRANSPORT"
      ),
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

  const locationCoordinatesById = useMemo(() => {
    const next = new Map<string, { name: string; coordinates: [number, number] }>();
    locations.forEach((row) => {
      const id = String(row.id || "");
      if (!id) return;
      const coordinates = getCoordinatesFromGeo(row.geo);
      if (!coordinates) return;
      next.set(id, {
        name: String(row.name || row.code || id),
        coordinates,
      });
    });
    return next;
  }, [locations]);

  const locationNameById = useMemo(() => {
    const next = new Map<string, string>();
    locations.forEach((row) => {
      const id = String(row.id || "");
      if (!id) return;
      next.set(id, String(row.name || row.code || id));
    });
    return next;
  }, [locations]);

  const serviceOptions = useMemo(
    () => [
      ...vehicleTypes.map((row) => ({
        value: String(row.id),
        label: `TRANSPORT • ${row.code} - ${row.name}`,
      })),
      ...activities.map((row) => ({ value: String(row.id), label: `ACT • ${row.code} - ${row.name}` })),
      ...guides.map((row) => ({ value: String(row.id), label: `GUIDE • ${row.code} - ${row.fullName}` })),
    ],
    [activities, guides, vehicleTypes]
  );

  const transportVehicleOptions = useMemo(
    () =>
      vehicleTypes.map((row) => ({
        value: String(row.id),
        label: `${row.code} - ${row.name}`,
      })),
    [vehicleTypes]
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

  const tourCategoryTypeOptions = useMemo(
    () =>
      tourCategoryTypes.map((row) => ({
        value: String(row.id),
        label: `${String(row.code)} - ${String(row.name)}`,
      })),
    [tourCategoryTypes]
  );

  const selectedCategoryTypeId = useMemo(() => {
    const formTypeId = form.typeId;
    if (typeof formTypeId === "string" && formTypeId.trim().length > 0) {
      return formTypeId;
    }
    const rowTypeId = dialog.row?.typeId;
    if (typeof rowTypeId === "string" && rowTypeId.trim().length > 0) {
      return rowTypeId;
    }
    return "";
  }, [dialog.row?.typeId, form.typeId]);

  const tourCategoryOptions = useMemo(() => {
    const rows = selectedCategoryTypeId
      ? tourCategories.filter((row) => String(row.typeId) === selectedCategoryTypeId)
      : tourCategories;

    return rows.map((row) => ({
      value: String(row.id),
      label: `${String(row.code)} - ${String(row.name)}`,
    }));
  }, [selectedCategoryTypeId, tourCategories]);

  const technicalVisitOptions = useMemo(
    () =>
      technicalVisits.map((row) => ({
        value: String(row.id),
        label: `${String(row.code)} - ${String(row.visitType)} - ${new Date(
          String(row.visitDate)
        ).toLocaleDateString()}`,
      })),
    [technicalVisits]
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
    tourCategoryTypeOptions.forEach((o) => pairs.push([o.value, o.label]));
    tourCategoryOptions.forEach((o) => pairs.push([o.value, o.label]));
    technicalVisitOptions.forEach((o) => pairs.push([o.value, o.label]));
    return Object.fromEntries(pairs);
  }, [
    planOptions,
    dayOptions,
    itemOptions,
    locationOptions,
    serviceOptions,
    operatorOrganizationOptions,
    marketOrganizationOptions,
    tourCategoryTypeOptions,
    tourCategoryOptions,
    technicalVisitOptions,
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
            defaultValue: companyBaseCurrencyCode,
            options: currencyOptions,
          },
          {
            key: "exchangeRateMode",
            label: "FX Mode",
            type: "select",
            defaultValue: "AUTO",
            options: [
              { label: "AUTO", value: "AUTO" },
              { label: "MANUAL", value: "MANUAL" },
            ],
          },
          { key: "exchangeRate", label: "FX Rate", type: "number", defaultValue: 0 },
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
          { key: "locationId", label: "Location", type: "select", nullable: true, options: locationOptions },
          { key: "rateId", label: "Rate Id", type: "text", nullable: true },
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
          { key: "currencyCode", label: "Currency", type: "select", required: true, defaultValue: companyBaseCurrencyCode, options: currencyOptions },
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
          { key: "currencyCode", label: "Currency", type: "select", required: true, defaultValue: companyBaseCurrencyCode, options: currencyOptions },
          { key: "totalsByType", label: "Totals By Type JSON", type: "json", nullable: true },
          { key: "baseTotal", label: "Base Total", type: "number", required: true, defaultValue: 0 },
          { key: "taxTotal", label: "Tax Total", type: "number", required: true, defaultValue: 0 },
          { key: "grandTotal", label: "Grand Total", type: "number", required: true, defaultValue: 0 },
          { key: "snapshot", label: "Snapshot JSON", type: "json", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "pre-tour-categories":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
          {
            key: "typeId",
            label: "Category Type",
            type: "select",
            required: true,
            options: tourCategoryTypeOptions,
          },
          {
            key: "categoryId",
            label: "Category",
            type: "select",
            required: true,
            options: tourCategoryOptions,
          },
          { key: "notes", label: "Notes", type: "textarea", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "pre-tour-technical-visits":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "planId", label: "Pre-Tour Plan", type: "select", required: true, options: planOptions },
          { key: "dayId", label: "Day", type: "select", nullable: true, options: dayOptions },
          {
            key: "technicalVisitId",
            label: "Field Visit",
            type: "select",
            required: true,
            options: technicalVisitOptions,
          },
          { key: "notes", label: "Notes", type: "textarea", nullable: true },
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
    tourCategoryTypeOptions,
    tourCategoryOptions,
    technicalVisitOptions,
    companyBaseCurrencyCode,
  ]);

  const visibleFields = useMemo(() => {
    if (!isPlanManageMode) return fields;
    if (dialog.resource === "pre-tour-days") return fields.filter((field) => field.key !== "planId");
    if (dialog.resource === "pre-tour-items") {
      return fields.filter(
        (field) =>
          field.key !== "planId" &&
          field.key !== "dayId" &&
          field.key !== "currencyCode" &&
          field.key !== "priceMode"
      );
    }
    if (dialog.resource === "pre-tour-item-addons") {
      return fields.filter((field) => field.key !== "planId" && field.key !== "planItemId");
    }
    if (dialog.resource === "pre-tour-totals") return fields.filter((field) => field.key !== "planId");
    if (dialog.resource === "pre-tour-categories") return fields.filter((field) => field.key !== "planId");
    if (dialog.resource === "pre-tour-technical-visits") return fields.filter((field) => field.key !== "planId");
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
    const [
      locationRows,
      vehicleTypeRows,
      activityRows,
      guideRows,
      currencyRows,
      organizationRows,
      tourCategoryTypeRows,
      tourCategoryRows,
      technicalVisitRows,
      companyResponse,
    ] =
      await Promise.all([
        listTransportRecords("locations", { limit: 300 }),
        listTransportRecords("vehicle-types", { limit: 300 }),
        listActivityRecords("activities", { limit: 300 }),
        listGuideRecords("guides", { limit: 300 }),
        listCurrencyRecords("currencies", { limit: 200 }),
        listBusinessNetworkRecords("organizations", { limit: 400 }),
        listTourCategoryRecords("tour-category-types", { limit: 500 }),
        listTourCategoryRecords("tour-categories", { limit: 500 }),
        listTechnicalVisitRecords("technical-visits", { limit: 500 }),
        fetch("/api/companies/me", { cache: "no-store" }),
      ]);

    setLocations(locationRows);
    setVehicleTypes(vehicleTypeRows);
    setActivities(activityRows);
    setGuides(guideRows);
    setCurrencies(currencyRows);
    setOrganizations(organizationRows);
    setTourCategoryTypes(tourCategoryTypeRows);
    setTourCategories(tourCategoryRows);
    setTechnicalVisits(technicalVisitRows);
    if (companyResponse.ok) {
      const body = (await companyResponse.json()) as CompanySettingsResponse;
      const base = body.company?.baseCurrencyCode?.trim().toUpperCase();
      if (base) setCompanyBaseCurrencyCode(base);
    }
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
        if (showBinOnly) {
          const binRows = await listPreTourRecords("pre-tour-bins", {
            limit: 200,
            q: query || undefined,
          });
          setPlanBins(binRows);
          setPlans([]);
          return;
        }
        setPlanBins([]);
        setDays([]);
        setItems([]);
        setAddons([]);
        setTotals([]);
        setPlanCategories([]);
        setPlanTechnicalVisits([]);
        return;
      }

      const [dayRows, itemRows, addonRows, totalRows, categoryRows, technicalVisitRows] =
        await Promise.all([
        listPreTourRecords("pre-tour-days", { limit: 500, planId: managedPlanId }),
        listPreTourRecords("pre-tour-items", { limit: 500, planId: managedPlanId }),
        listPreTourRecords("pre-tour-item-addons", { limit: 500, planId: managedPlanId }),
        canViewCosting
          ? listPreTourRecords("pre-tour-totals", { limit: 500, planId: managedPlanId })
          : Promise.resolve([] as Row[]),
        listPreTourRecords("pre-tour-categories", { limit: 500, planId: managedPlanId }),
          listPreTourRecords("pre-tour-technical-visits", { limit: 500, planId: managedPlanId }),
        ]);

      setDays(dayRows);
      setItems(itemRows);
      setAddons(addonRows);
      setTotals(totalRows);
      setPlanCategories(categoryRows);
      setPlanTechnicalVisits(technicalVisitRows);
      setPlanBins([]);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [canViewCosting, isPlanManageMode, managedPlanId, query, showBinOnly]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/companies/access-control", { cache: "no-store" });
        const body = (await response.json()) as AccessControlResponse & { message?: string };
        if (!response.ok) throw new Error(body.message || "Failed to load access control.");
        if (!active) return;
        setPrivileges(Array.isArray(body.privileges) ? body.privileges : []);
      } catch {
        if (active) setPrivileges([]);
      } finally {
        if (active) setAccessLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (canViewRouteMap) return;
    if (mapDialogOpen) setMapDialogOpen(false);
    if (drawerShowMap) setDrawerShowMap(false);
  }, [canViewRouteMap, drawerShowMap, mapDialogOpen]);

  useEffect(() => {
    void loadMasters().catch((error) => {
      notify.error(error instanceof Error ? error.message : "Failed to load lookup data.");
    });
  }, [loadMasters]);

  useEffect(() => {
    setCopyForm((prev) =>
      prev.currencyCode && prev.currencyCode !== "USD"
        ? prev
        : { ...prev, currencyCode: companyBaseCurrencyCode }
    );
  }, [companyBaseCurrencyCode]);

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
        [
          "pre-tour-days",
          "pre-tour-items",
          "pre-tour-item-addons",
          "pre-tour-totals",
          "pre-tour-categories",
          "pre-tour-technical-visits",
        ].includes(dialog.resource)
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

      if (dialog.resource === "pre-tour-categories" && !nextForm.typeId && tourCategoryTypeOptions[0]) {
        nextForm.typeId = tourCategoryTypeOptions[0].value;
      }
      if (dialog.resource === "pre-tour-technical-visits") {
        if (selectedDayId) nextForm.dayId = selectedDayId;
        if (!nextForm.technicalVisitId && technicalVisitOptions[0]) {
          nextForm.technicalVisitId = technicalVisitOptions[0].value;
        }
      }
    }

    setForm(nextForm);

    if (dialog.resource === "pre-tour-days") {
      const currentDayId = dialog.mode === "edit" ? String(dialog.row?.id || "") : "";
      const existingTransportItem = currentDayId
        ? items.find(
            (item) =>
              String(item.dayId) === currentDayId &&
              String(item.itemType || "").toUpperCase() === "TRANSPORT"
          )
        : null;

      setDayTransportForm({
        enabled: Boolean(existingTransportItem),
        serviceId: String(existingTransportItem?.serviceId || ""),
        startAt: toLocalDateTime(existingTransportItem?.startAt),
        endAt: toLocalDateTime(existingTransportItem?.endAt),
        pax:
          existingTransportItem?.pax !== undefined && existingTransportItem?.pax !== null
            ? String(existingTransportItem.pax)
            : "",
        baseAmount: String(existingTransportItem?.baseAmount ?? "0"),
        taxAmount: String(existingTransportItem?.taxAmount ?? "0"),
        totalAmount: String(existingTransportItem?.totalAmount ?? "0"),
        status: String(existingTransportItem?.status || "PLANNED"),
        notes: String(existingTransportItem?.notes || ""),
      });
    }
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
    items,
    tourCategoryTypeOptions,
    technicalVisitOptions,
    visibleFields,
  ]);

  const upsertDayTransportItem = useCallback(
    async (dayId: string, dayRow: Row) => {
      const existingTransportItem = items.find(
        (item) =>
          String(item.dayId) === dayId && String(item.itemType || "").toUpperCase() === "TRANSPORT"
      );

      if (!dayTransportForm.enabled || !dayTransportForm.serviceId) {
        if (existingTransportItem) {
          await deletePreTourRecord("pre-tour-items", String(existingTransportItem.id));
        }
        return;
      }

      if (!selectedPlan) {
        throw new Error("Pre-tour header is required before saving day transport details.");
      }

      const dayCode = sanitizeCodePart(String(dayRow.code || `DAY_${dayRow.dayNumber || "00"}`));
      const transportCode = `${dayCode}_TRANSPORT`;
      const startLabel = lookupLabel(dayRow.startLocationId);
      const endLabel = lookupLabel(dayRow.endLocationId);
      const title = `${startLabel} -> ${endLabel}`.replace(/\s+/g, " ").trim();

      const payload: Record<string, unknown> = {
        code: transportCode.slice(0, 80),
        planId: managedPlanId,
        dayId,
        itemType: "TRANSPORT",
        serviceId: dayTransportForm.serviceId || null,
        startAt: toIsoDateTime(dayTransportForm.startAt),
        endAt: toIsoDateTime(dayTransportForm.endAt),
        sortOrder: 0,
        pax: dayTransportForm.pax === "" ? null : toNumericValue(dayTransportForm.pax),
        fromLocationId: dayRow.startLocationId ? String(dayRow.startLocationId) : null,
        toLocationId: dayRow.endLocationId ? String(dayRow.endLocationId) : null,
        locationId: null,
        currencyCode: String(selectedPlan.currencyCode || companyBaseCurrencyCode),
        priceMode: String(selectedPlan.priceMode || "EXCLUSIVE"),
        baseAmount: toNumericValue(dayTransportForm.baseAmount),
        taxAmount: toNumericValue(dayTransportForm.taxAmount),
        totalAmount: toNumericValue(dayTransportForm.totalAmount),
        title: title || "Day Transport",
        description: null,
        notes: dayTransportForm.notes || null,
        status: dayTransportForm.status || "PLANNED",
        isActive: true,
      };

      if (existingTransportItem) {
        await updatePreTourRecord("pre-tour-items", String(existingTransportItem.id), payload);
      } else {
        await createPreTourRecord("pre-tour-items", payload);
      }
    },
    [
      companyBaseCurrencyCode,
      dayTransportForm,
      items,
      lookupLabel,
      managedPlanId,
      selectedPlan,
    ]
  );

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
      if (dialog.resource === "pre-tour-items") {
        payload.currencyCode = String(selectedPlan?.currencyCode || companyBaseCurrencyCode);
        payload.priceMode = String(selectedPlan?.priceMode || "EXCLUSIVE");
        if (!payload.itemType) payload.itemType = "MISC";
      }
      if (dialog.resource === "pre-tour-categories") {
        const selectedTypeId = String(payload.typeId ?? "");
        const selectedCategoryId = String(payload.categoryId ?? "");
        const validCategory = tourCategories.some(
          (row) => String(row.id) === selectedCategoryId && String(row.typeId) === selectedTypeId
        );
        if (!validCategory) {
          throw new Error("Selected category does not match the selected category type.");
        }
      }
      if (dialog.resource === "pre-tour-technical-visits") {
        const selectedTechnicalVisitId = String(payload.technicalVisitId ?? "");
        const exists = technicalVisits.some((row) => String(row.id) === selectedTechnicalVisitId);
        if (!exists) {
          throw new Error("Selected field visit is invalid.");
        }
      }
      if (dialog.resource === "pre-tour-totals" && !canViewCosting) {
        throw new Error("Your subscription plan does not include Pre-Tour Costing.");
      }
      if (dialog.resource === "pre-tour-days" && dayTransportForm.enabled && !dayTransportForm.serviceId) {
        throw new Error("Select vehicle type in Day Transport Details.");
      }

      if (dialog.mode === "create") {
        const created = await createPreTourRecord(dialog.resource, payload);
        if (dialog.resource === "pre-tour-days") {
          await upsertDayTransportItem(String(created.id), created);
        }
        notify.success("Record created.");
      } else {
        const id = String(dialog.row?.id || "");
        const updated = await updatePreTourRecord(dialog.resource, id, payload);
        if (dialog.resource === "pre-tour-days") {
          await upsertDayTransportItem(id, updated);
        }
        notify.success("Record updated.");
      }

      setDialog((prev) => ({ ...prev, open: false, row: null, mode: "create" }));
      await loadData();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save record.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (resource: PreTourResourceKey, row: Row) => {
    if (isReadOnly) {
      notify.warning("You are in read-only mode.");
      return;
    }
    if (resource === "pre-tour-bins" && !isAdmin) {
      notify.warning("Only Admin can permanently delete records from bin.");
      return;
    }

    try {
      await deletePreTourRecord(resource, String(row.id));
      notify.success("Record deleted.");
      await loadData();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete record.");
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
        notify.error(error instanceof Error ? error.message : "Failed to reorder items.");
        await loadData();
      }
    },
    [items, loadData]
  );

  const shareItemToDay = useCallback(async () => {
    if (!sharingItem || !shareTargetDayId) {
      notify.error("Select a target day.");
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
      currencyCode: String(
        sharingItem.currencyCode || selectedPlan?.currencyCode || companyBaseCurrencyCode
      ),
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
      notify.success("Item shared to selected day.");
      setSharingItem(null);
      setShareTargetDayId("");
      await loadData();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to share item.");
    } finally {
      setSharing(false);
    }
  }, [sharingItem, shareTargetDayId, sortedDays, managedPlanId, selectedPlan, companyBaseCurrencyCode, loadData]);

  const clonePlanChildren = useCallback(
    async (sourcePlan: Row, newPlanId: string, codePrefix: string) => {
      const sourcePlanId = String(sourcePlan.id);
      const [sourceDays, sourceItems, sourceAddons, sourceTotals, sourceCategories, sourceTechnicalVisits] =
        await Promise.all([
        listPreTourRecords("pre-tour-days", { planId: sourcePlanId, limit: 1000 }),
        listPreTourRecords("pre-tour-items", { planId: sourcePlanId, limit: 2000 }),
        listPreTourRecords("pre-tour-item-addons", { planId: sourcePlanId, limit: 2000 }),
        canViewCosting
          ? listPreTourRecords("pre-tour-totals", { planId: sourcePlanId, limit: 10 })
          : Promise.resolve([] as Row[]),
          listPreTourRecords("pre-tour-categories", { planId: sourcePlanId, limit: 200 }),
          listPreTourRecords("pre-tour-technical-visits", { planId: sourcePlanId, limit: 200 }),
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
          currencyCode: String(
            sourceItem.currencyCode || sourcePlan.currencyCode || companyBaseCurrencyCode
          ),
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
          currencyCode: String(
            sourceAddon.currencyCode || sourcePlan.currencyCode || companyBaseCurrencyCode
          ),
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
          currencyCode: String(
            sourceTotal.currencyCode || sourcePlan.currencyCode || companyBaseCurrencyCode
          ),
          totalsByType: sourceTotal.totalsByType ?? null,
          baseTotal: Number(sourceTotal.baseTotal || 0),
          taxTotal: Number(sourceTotal.taxTotal || 0),
          grandTotal: Number(sourceTotal.grandTotal || 0),
          snapshot: sourceTotal.snapshot ?? null,
          isActive: Boolean(sourceTotal.isActive ?? true),
        });
      }

      for (const sourceCategory of sourceCategories) {
        if (!sourceCategory.typeId || !sourceCategory.categoryId) continue;
        await createPreTourRecord("pre-tour-categories", {
          code: `${codePrefix}_CAT_${String(sourceCategory.id).slice(-6)}`.slice(0, 80),
          planId: newPlanId,
          typeId: String(sourceCategory.typeId),
          categoryId: String(sourceCategory.categoryId),
          notes: sourceCategory.notes ?? null,
          isActive: Boolean(sourceCategory.isActive ?? true),
        });
      }

      for (const sourceTechnicalVisit of sourceTechnicalVisits) {
        if (!sourceTechnicalVisit.technicalVisitId) continue;
        const mappedDayId = sourceTechnicalVisit.dayId
          ? dayIdMap.get(String(sourceTechnicalVisit.dayId))
          : null;
        await createPreTourRecord("pre-tour-technical-visits", {
          code: `${codePrefix}_TV_${String(sourceTechnicalVisit.id).slice(-6)}`.slice(0, 80),
          planId: newPlanId,
          dayId: mappedDayId ?? null,
          technicalVisitId: String(sourceTechnicalVisit.technicalVisitId),
          notes: sourceTechnicalVisit.notes ?? null,
          isActive: Boolean(sourceTechnicalVisit.isActive ?? true),
        });
      }
    },
    [canViewCosting, companyBaseCurrencyCode]
  );

  const createVersionFromPlan = useCallback(
    async (sourcePlan: Row) => {
      if (!sourcePlan.operatorOrgId || !sourcePlan.marketOrgId) {
        notify.error("Source pre-tour must have Operator and Market before creating a version.");
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
        currencyCode: String(sourcePlan.currencyCode || companyBaseCurrencyCode),
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
        notify.success(`Version V${nextVersion} created.`);
        await loadData();
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to create version.");
      } finally {
        setCreatingVersion(false);
      }
    },
    [clonePlanChildren, companyBaseCurrencyCode, plans, loadData]
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
      currencyCode: String(sourcePlan.currencyCode || companyBaseCurrencyCode),
      priceMode: String(sourcePlan.priceMode || "EXCLUSIVE"),
    });
    setCopyDialogOpen(true);
  }, [companyBaseCurrencyCode]);

  const submitCopyPlan = useCallback(async () => {
    if (!copySourcePlan) return;
    if (
      !copyForm.code.trim() ||
      !copyForm.planCode.trim() ||
      !copyForm.operatorOrgId ||
      !copyForm.marketOrgId
    ) {
      notify.error("Code, Plan Code, Operator and Market are required.");
      return;
    }

    const startIso = toIsoDateTime(copyForm.startDate);
    const endIso = toIsoDateTime(copyForm.endDate);
    if (!startIso || !endIso) {
      notify.error("Start Date and End Date are required.");
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
      notify.success("Pre-tour copied successfully.");
      setCopyDialogOpen(false);
      setCopySourcePlan(null);
      await loadData();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to copy pre-tour.");
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
      notify.error("Invalid plan date range. Update pre-tour header dates first.");
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
      notify.info("All days are already initialized from the date range.");
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
      notify.success(`Initialized ${missingDayNumbers.length} day(s) from plan date range.`);
      await loadData();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to initialize plan days.");
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

  const filteredCategoryRows = useMemo(
    () => planCategories.filter((row) => matchesQuery("pre-tour-categories", row, query)),
    [planCategories, query]
  );

  const filteredTechnicalVisitRows = useMemo(
    () =>
      planTechnicalVisits.filter((row) => matchesQuery("pre-tour-technical-visits", row, query)),
    [planTechnicalVisits, query]
  );

  const filteredBinRows = useMemo(
    () => planBins.filter((row) => matchesQuery("pre-tour-bins", row, query)),
    [planBins, query]
  );

  const dayCards = useMemo(() => {
    return sortedDays
      .map((day) => {
        const dayId = String(day.id);
        const dayItems = items
          .filter((item) => String(item.dayId) === dayId)
          .filter((item) => String(item.itemType || "").toUpperCase() !== "TRANSPORT")
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

  const paginatedDayCards = useMemo(() => {
    const start = (dayPage - 1) * dayPageSize;
    return dayCards.slice(start, start + dayPageSize);
  }, [dayCards, dayPage, dayPageSize]);

  const routeLocationSequenceIds = useMemo(() => {
    if (!isPlanManageMode) return [];

    const orderedLocationIds: string[] = [];
    const pushLocation = (locationId: unknown) => {
      if (!locationId) return;
      const id = String(locationId);
      if (orderedLocationIds[orderedLocationIds.length - 1] === id) return;
      orderedLocationIds.push(id);
    };

    sortedDays.forEach((day) => {
      pushLocation(day.startLocationId);
      pushLocation(day.endLocationId);
    });

    return orderedLocationIds;
  }, [isPlanManageMode, sortedDays]);

  const routeMapLocations = useMemo(() => {
    return routeLocationSequenceIds
      .map((id, index) => {
        const location = locationCoordinatesById.get(id);
        if (!location) return null;
        return {
          id: `${id}-${index}`,
          name: location.name,
          coordinates: location.coordinates,
        };
      })
      .filter((location): location is { id: string; name: string; coordinates: [number, number] } =>
        Boolean(location)
      );
  }, [locationCoordinatesById, routeLocationSequenceIds]);

  const routePathLabel = useMemo(
    () =>
      routeLocationSequenceIds
        .map((locationId) => locationNameById.get(locationId) || locationId)
        .join(" -> "),
    [locationNameById, routeLocationSequenceIds]
  );

  useEffect(() => {
    if (routeMapLocations.length === 0) {
      setRouteMeta({ distanceKm: null, durationMin: null });
    }
  }, [routeMapLocations.length]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(dayCards.length / dayPageSize));
    if (dayPage > totalPages) setDayPage(totalPages);
  }, [dayCards.length, dayPage, dayPageSize]);

  const openDetailSheet = useCallback(
    (
      title: string,
      description: string,
      row: Row,
      options?: { kind?: "generic" | "pre-tour" | "day-item"; dayId?: string }
    ) => {
      setDetailSheet({
        open: true,
        title,
        description,
        row,
        kind: options?.kind ?? "generic",
        dayId: options?.dayId,
      });
      setDrawerShowMap(false);
    },
    []
  );

  const detailDay = useMemo(() => {
    if (!detailSheet.open) return null;
    if (detailSheet.kind === "day-item") {
      const dayId = detailSheet.dayId || String(detailSheet.row?.dayId || "");
      if (!dayId) return null;
      return sortedDays.find((day) => String(day.id) === dayId) ?? null;
    }
    return null;
  }, [detailSheet.dayId, detailSheet.kind, detailSheet.open, detailSheet.row?.dayId, sortedDays]);

  const detailRouteLocationSequenceIds = useMemo(() => {
    if (!detailSheet.open) return [];
    if (detailSheet.kind === "pre-tour") return detailPreTourRouteIds;
    if (detailSheet.kind === "day-item" && detailDay) {
      const ids = [detailDay.startLocationId, detailDay.endLocationId]
        .filter(Boolean)
        .map((value) => String(value));
      return ids.filter((id, index) => id !== ids[index - 1]);
    }
    return [];
  }, [detailDay, detailPreTourRouteIds, detailSheet.kind, detailSheet.open]);

  const detailRouteMapLocations = useMemo(
    () =>
      detailRouteLocationSequenceIds
        .map((id, index) => {
          const location = locationCoordinatesById.get(id);
          if (!location) return null;
          return {
            id: `${id}-${index}`,
            name: location.name,
            coordinates: location.coordinates,
          };
        })
        .filter((row): row is { id: string; name: string; coordinates: [number, number] } =>
          Boolean(row)
        ),
    [detailRouteLocationSequenceIds, locationCoordinatesById]
  );

  const detailRoutePathLabel = useMemo(
    () =>
      detailRouteLocationSequenceIds
        .map((locationId) => locationNameById.get(locationId) || locationId)
        .join(" -> "),
    [detailRouteLocationSequenceIds, locationNameById]
  );

  useEffect(() => {
    if (!detailSheet.open || detailRouteMapLocations.length === 0) {
      setDrawerRouteMeta({ distanceKm: null, durationMin: null });
    }
  }, [detailRouteMapLocations.length, detailSheet.open]);

  useEffect(() => {
    const loadDetailPreTourRoute = async () => {
      if (!detailSheet.open || detailSheet.kind !== "pre-tour" || !detailSheet.row?.id) {
        setDetailPreTourRouteIds([]);
        setDetailPreTourRouteLoading(false);
        return;
      }

      if (isPlanManageMode) {
        setDetailPreTourRouteIds(routeLocationSequenceIds);
        setDetailPreTourRouteLoading(false);
        return;
      }

      setDetailPreTourRouteLoading(true);
      try {
        const dayRows = await listPreTourRecords("pre-tour-days", {
          planId: String(detailSheet.row.id),
          limit: 500,
        });
        const sorted = [...dayRows].sort(
          (a, b) => Number(a.dayNumber ?? 0) - Number(b.dayNumber ?? 0)
        );
        const ids: string[] = [];
        const pushId = (value: unknown) => {
          if (!value) return;
          const id = String(value);
          if (ids[ids.length - 1] === id) return;
          ids.push(id);
        };
        sorted.forEach((day) => {
          pushId(day.startLocationId);
          pushId(day.endLocationId);
        });
        setDetailPreTourRouteIds(ids);
      } catch {
        setDetailPreTourRouteIds([]);
      } finally {
        setDetailPreTourRouteLoading(false);
      }
    };

    void loadDetailPreTourRoute();
  }, [detailSheet.kind, detailSheet.open, detailSheet.row?.id, isPlanManageMode, routeLocationSequenceIds]);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-3 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>
              {showBinOnly ? "Pre-Tour Bin" : isPlanManageMode ? "Pre-Tour Workspace" : "Pre-Tour Plans"}
            </CardTitle>
            <CardDescription>
              {showBinOnly
                ? "Deleted pre-tour records bin. Admin can restore or permanently purge."
                : isPlanManageMode
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
            {isPlanManageMode ? (
              <Button
                variant="outline"
                onClick={() => setMapDialogOpen(true)}
                disabled={!accessLoaded || !canViewRouteMap || routeLocationSequenceIds.length === 0}
              >
                <MapPinned className="mr-1 size-4" />
                Route Map
              </Button>
            ) : null}
            {!isPlanManageMode && !showBinOnly ? (
              <Button className="master-add-btn" onClick={() => openDialog("pre-tours", "create")} disabled={isReadOnly}>
                <Plus className="mr-1 size-4" />
                Add Pre-Tour
              </Button>
            ) : null}
          </div>
        </div>

        <Input
          placeholder={
            showBinOnly
              ? "Search bin records..."
              : isPlanManageMode
              ? canViewCosting
                ? "Search in days, items, addons, totals..."
                : "Search in days, items, addons..."
              : "Search plans..."
          }
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        {isPlanManageMode ? (
          <PreTourDayWorkspace
            days={sortedDays}
            items={items.filter((item) => String(item.itemType || "").toUpperCase() !== "TRANSPORT")}
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
          showBinOnly ? (
            <SectionTable
              resource="pre-tour-bins"
              rows={filteredBinRows}
              loading={loading}
              isReadOnly={!isAdmin}
              lookups={lookups}
              hideAdd
              hideEdit={false}
              editLabel="Restore"
              deleteLabel="Purge"
              onView={(row) => openDetailSheet("Pre-Tour Bin Details", "Soft-deleted pre-tour.", row)}
              onEdit={(row) =>
                void updatePreTourRecord("pre-tour-bins", String(row.id), { action: "RESTORE" })
                  .then(() => {
                    notify.success("Pre-tour restored from bin.");
                    return loadData();
                  })
                  .catch((error) => {
                    notify.error(error instanceof Error ? error.message : "Failed to restore pre-tour.");
                  })
              }
              onDelete={(row) => void onDelete("pre-tour-bins", row)}
            />
          ) : (
          <>
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
              onView={(row) =>
                openDetailSheet("Pre-Tour Details", "Selected pre-tour record details.", row, {
                  kind: "pre-tour",
                })
              }
              onEdit={(row) => openDialog("pre-tours", "edit", row)}
              onDelete={(row) => void onDelete("pre-tours", row)}
            />
          </>)
        ) : (
          <>
            {paginatedDayCards.map(({ day, dayItems }) => (
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
                <CardContent className="space-y-2 px-3 pb-2.5 pt-0">
                  <div className="overflow-x-auto">
                  <Table className="min-w-[680px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[28px]" />
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-3 text-center text-muted-foreground">
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
                                <p className="text-xs text-muted-foreground">
                                  {String(item.startAt || "").slice(11, 16) || "-"} -{" "}
                                  {String(item.endAt || "").slice(11, 16) || "-"} •{" "}
                                  {String(item.currencyCode || "-")} {String(item.totalAmount || "0")}
                                </p>
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
                                <Badge variant="outline">{String(item.status || "-")}</Badge>
                              </TableCell>
                              <TableCell className="py-1.5 text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      openDetailSheet("Day Item Details", `Day ${String(day.dayNumber)} item information.`, item, {
                                        kind: "day-item",
                                        dayId: String(day.id),
                                      })
                                    }
                                  >
                                    <PanelLeftOpen className="mr-1 size-4" />
                                    View
                                  </Button>
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
                  </div>
                </CardContent>
              </Card>
            ))}

            <TablePagination
              totalItems={dayCards.length}
              page={dayPage}
              pageSize={dayPageSize}
              onPageChange={setDayPage}
              onPageSizeChange={setDayPageSize}
            />

            <SectionTable
              resource="pre-tour-categories"
              rows={filteredCategoryRows}
              loading={loading}
              isReadOnly={isReadOnly}
              lookups={lookups}
              onAdd={() => openDialog("pre-tour-categories", "create")}
              onView={(row) =>
                openDetailSheet("Pre-Tour Category Details", "Selected category mapping details.", row)
              }
              onEdit={(row) => openDialog("pre-tour-categories", "edit", row)}
              onDelete={(row) => void onDelete("pre-tour-categories", row)}
            />
            <SectionTable
              resource="pre-tour-technical-visits"
              rows={filteredTechnicalVisitRows}
              loading={loading}
              isReadOnly={isReadOnly}
              lookups={lookups}
              onAdd={() => openDialog("pre-tour-technical-visits", "create")}
              onView={(row) =>
                openDetailSheet("Field Visit Link Details", "Selected field visit link details.", row)
              }
              onEdit={(row) => openDialog("pre-tour-technical-visits", "edit", row)}
              onDelete={(row) => void onDelete("pre-tour-technical-visits", row)}
            />
            <SectionTable
              resource="pre-tour-item-addons"
              rows={filteredAddonRows}
              loading={loading}
              isReadOnly={isReadOnly}
              lookups={lookups}
              onAdd={() => openDialog("pre-tour-item-addons", "create")}
              onView={(row) => openDetailSheet("Addon Details", "Selected addon details.", row)}
              onEdit={(row) => openDialog("pre-tour-item-addons", "edit", row)}
              onDelete={(row) => void onDelete("pre-tour-item-addons", row)}
            />
            {canViewCosting ? (
              <SectionTable
                resource="pre-tour-totals"
                rows={filteredTotalRows}
                loading={loading}
                isReadOnly={isReadOnly}
                lookups={lookups}
                onAdd={() => openDialog("pre-tour-totals", "create")}
                onView={(row) => openDetailSheet("Totals Details", "Selected totals details.", row)}
                onEdit={(row) => openDialog("pre-tour-totals", "edit", row)}
                onDelete={(row) => void onDelete("pre-tour-totals", row)}
              />
            ) : null}
          </>
        )}
      </CardContent>

      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Pre-Tour Route Map</DialogTitle>
            <DialogDescription>
              Visual route for the current pre-tour based on day detail start and end locations.
            </DialogDescription>
          </DialogHeader>
          <div className="mb-2 flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Selected {routeLocationSequenceIds.length} location point
              {routeLocationSequenceIds.length === 1 ? "" : "s"} in sequence. Mapped:{" "}
              {routeMapLocations.length}.
            </p>
            <div className="flex items-center gap-2">
              <Label htmlFor="pretour-road-route" className="text-xs">
                Use road route (OSRM)
              </Label>
              <Switch
                id="pretour-road-route"
                checked={useRoadRoute}
                onCheckedChange={setUseRoadRoute}
              />
            </div>
          </div>
          <div className="mb-2 space-y-1 rounded-md border bg-background px-3 py-2">
            <p className="truncate text-xs text-muted-foreground">
              Path: <span className="font-medium text-foreground">{routePathLabel || "-"}</span>
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-muted-foreground">
                Distance:{" "}
                <span className="font-medium text-foreground">
                  {routeMeta.distanceKm !== null ? `${routeMeta.distanceKm.toFixed(2)} km` : "-"}
                </span>
              </span>
              <span className="text-muted-foreground">
                Duration:{" "}
                <span className="font-medium text-foreground">
                  {routeMeta.durationMin !== null ? `${routeMeta.durationMin.toFixed(1)} min` : "-"}
                </span>
              </span>
            </div>
          </div>
          <PreTourRouteMap
            locations={routeMapLocations}
            useRoadRoute={useRoadRoute}
            onRouteMetaChange={setRouteMeta}
          />
        </DialogContent>
      </Dialog>

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

      <Sheet
        open={detailSheet.open}
        onOpenChange={(open) => setDetailSheet((prev) => ({ ...prev, open }))}
      >
        <SheetContent side="right" className="w-[92vw] sm:max-w-xl">
          <SheetHeader className="border-b pb-3">
            <SheetTitle>{detailSheet.title}</SheetTitle>
            <SheetDescription>{detailSheet.description}</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 overflow-y-auto p-4">
            {detailSheet.row && detailSheet.kind === "pre-tour" ? (
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/master-data/pre-tours/${String(detailSheet.row.id)}`}>
                    <Settings2 className="mr-1 size-4" />
                    Manage
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDetailSheet((prev) => ({ ...prev, open: false }));
                    void createVersionFromPlan(detailSheet.row as Row);
                  }}
                  disabled={isReadOnly}
                >
                  + Version
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDetailSheet((prev) => ({ ...prev, open: false }));
                    openCopyPlanDialog(detailSheet.row as Row);
                  }}
                  disabled={isReadOnly}
                >
                  <CopyPlus className="mr-1 size-4" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDetailSheet((prev) => ({ ...prev, open: false }));
                    openDialog("pre-tours", "edit", detailSheet.row as Row);
                  }}
                  disabled={isReadOnly}
                >
                  <Settings2 className="mr-1 size-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDetailSheet((prev) => ({ ...prev, open: false }));
                    void onDelete("pre-tours", detailSheet.row as Row);
                  }}
                  disabled={isReadOnly}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ) : null}

            {detailSheet.row && detailSheet.kind === "pre-tour" ? (
              <div className="grid gap-1 rounded-md border bg-muted/20 p-3">
                {([
                  ["Code", detailSheet.row.code],
                  ["Reference No", detailSheet.row.referenceNo],
                  ["Plan Code", detailSheet.row.planCode],
                  ["Title", detailSheet.row.title],
                  ["Status", detailSheet.row.status],
                  ["Operator", lookupLabel(detailSheet.row.operatorOrgId)],
                  ["Market", lookupLabel(detailSheet.row.marketOrgId)],
                  ["Start Date", formatDate(detailSheet.row.startDate)],
                  ["End Date", formatDate(detailSheet.row.endDate)],
                  ["Total Nights", detailSheet.row.totalNights],
                  ["Adults", detailSheet.row.adults],
                  ["Children", detailSheet.row.children],
                  ["Infants", detailSheet.row.infants],
                  ["Currency", detailSheet.row.currencyCode],
                  ["Price Mode", detailSheet.row.priceMode],
                  ["Version", detailSheet.row.version],
                ] as Array<[string, unknown]>).map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-muted-foreground">{label}</span>
                    <span className="text-right text-foreground">{formatCell(value, lookups)}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {detailSheet.row && detailSheet.kind === "day-item" ? (
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedDayId(String(detailSheet.dayId || detailSheet.row?.dayId || ""));
                    setSelectedItemId(String(detailSheet.row?.id || ""));
                    setDetailSheet((prev) => ({ ...prev, open: false }));
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
                    setSharingItem(detailSheet.row);
                    setShareTargetDayId("");
                    setDetailSheet((prev) => ({ ...prev, open: false }));
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
                    setSelectedDayId(String(detailSheet.dayId || detailSheet.row?.dayId || ""));
                    setSelectedItemId(String(detailSheet.row?.id || ""));
                    setDetailSheet((prev) => ({ ...prev, open: false }));
                    openDialog("pre-tour-items", "edit", detailSheet.row as Row);
                  }}
                  disabled={isReadOnly}
                >
                  <Settings2 className="mr-1 size-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDetailSheet((prev) => ({ ...prev, open: false }));
                    void onDelete("pre-tour-items", detailSheet.row as Row);
                  }}
                  disabled={isReadOnly}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ) : null}

            {detailSheet.kind === "pre-tour" && canViewRouteMap ? (
              <div className="rounded-md border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Locations: <span className="font-medium text-foreground">{detailRoutePathLabel || "-"}</span>
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDrawerShowMap((prev) => !prev)}
                    disabled={detailPreTourRouteLoading || detailRouteLocationSequenceIds.length === 0}
                  >
                    {drawerShowMap ? "Hide Map" : "Show Map"}
                  </Button>
                </div>
              </div>
            ) : null}

            {canViewRouteMap &&
            (detailSheet.kind === "pre-tour" || detailSheet.kind === "day-item") &&
            drawerShowMap &&
            (detailPreTourRouteLoading || detailRouteLocationSequenceIds.length > 0) ? (
              <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                {detailPreTourRouteLoading ? (
                  <p className="text-xs text-muted-foreground">Loading route details...</p>
                ) : null}
                {selectedPlan || detailSheet.kind === "pre-tour" ? (
                  <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>
                      Header:{" "}
                      <span className="font-medium text-foreground">
                        {String(selectedPlan?.code || detailSheet.row?.code || "-")}
                      </span>
                    </p>
                    <p>
                      Date Range:{" "}
                      <span className="font-medium text-foreground">
                        {formatDate(selectedPlan?.startDate || detailSheet.row?.startDate)} -{" "}
                        {formatDate(selectedPlan?.endDate || detailSheet.row?.endDate)}
                      </span>
                    </p>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-muted-foreground">
                    Distance:{" "}
                    <span className="font-medium text-foreground">
                      {drawerRouteMeta.distanceKm !== null ? `${drawerRouteMeta.distanceKm.toFixed(2)} km` : "-"}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Duration:{" "}
                    <span className="font-medium text-foreground">
                      {drawerRouteMeta.durationMin !== null ? `${drawerRouteMeta.durationMin.toFixed(1)} min` : "-"}
                    </span>
                  </span>
                </div>
                {detailRouteMapLocations.length > 0 ? (
                  <PreTourRouteMap
                    locations={detailRouteMapLocations}
                    useRoadRoute={true}
                    onRouteMetaChange={setDrawerRouteMeta}
                  />
                ) : (
                  <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground">
                    No mapped coordinates found for selected tour locations.
                  </div>
                )}
              </div>
            ) : null}

            {detailSheet.row && detailSheet.kind !== "pre-tour" ? (
              Object.entries(detailSheet.row).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {key}
                  </span>
                  <span className="max-w-[70%] text-right text-foreground">
                    {formatCell(value, lookups)}
                  </span>
                </div>
              ))
            ) : (
              detailSheet.kind !== "pre-tour" ? (
                <p className="text-sm text-muted-foreground">No details to show.</p>
              ) : null
            )}
          </div>
        </SheetContent>
      </Sheet>

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
                        ...(field.key === "typeId" ? { categoryId: "" } : {}),
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

            {dialog.resource === "pre-tour-days" ? (
              <div className="space-y-2 rounded-md border bg-muted/20 p-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Day Transport Details</p>
                    <p className="text-xs text-muted-foreground">
                      Maintain transport here. This will auto-save as the day transport record.
                    </p>
                  </div>
                  <Switch
                    checked={dayTransportForm.enabled}
                    onCheckedChange={(checked) =>
                      setDayTransportForm((prev) => ({ ...prev, enabled: checked }))
                    }
                  />
                </div>

                {dayTransportForm.enabled ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <Label className="mb-1 block text-xs font-medium">Vehicle Type *</Label>
                      <Select
                        value={dayTransportForm.serviceId || "__none__"}
                        onValueChange={(value) =>
                          setDayTransportForm((prev) => ({
                            ...prev,
                            serviceId: value === "__none__" ? "" : value,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {transportVehicleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs font-medium">Pax</Label>
                      <Input
                        type="number"
                        value={dayTransportForm.pax}
                        onChange={(event) =>
                          setDayTransportForm((prev) => ({ ...prev, pax: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs font-medium">Start Time</Label>
                      <Input
                        type="datetime-local"
                        value={dayTransportForm.startAt}
                        onChange={(event) =>
                          setDayTransportForm((prev) => ({ ...prev, startAt: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs font-medium">End Time</Label>
                      <Input
                        type="datetime-local"
                        value={dayTransportForm.endAt}
                        onChange={(event) =>
                          setDayTransportForm((prev) => ({ ...prev, endAt: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs font-medium">Base Amount</Label>
                      <Input
                        type="number"
                        value={dayTransportForm.baseAmount}
                        onChange={(event) =>
                          setDayTransportForm((prev) => ({ ...prev, baseAmount: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs font-medium">Tax Amount</Label>
                      <Input
                        type="number"
                        value={dayTransportForm.taxAmount}
                        onChange={(event) =>
                          setDayTransportForm((prev) => ({ ...prev, taxAmount: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs font-medium">Total Amount</Label>
                      <Input
                        type="number"
                        value={dayTransportForm.totalAmount}
                        onChange={(event) =>
                          setDayTransportForm((prev) => ({ ...prev, totalAmount: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs font-medium">Status</Label>
                      <Select
                        value={dayTransportForm.status}
                        onValueChange={(value) =>
                          setDayTransportForm((prev) => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PLANNED">PLANNED</SelectItem>
                          <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
                          <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                          <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="mb-1 block text-xs font-medium">Transport Notes</Label>
                      <Textarea
                        value={dayTransportForm.notes}
                        onChange={(event) =>
                          setDayTransportForm((prev) => ({ ...prev, notes: event.target.value }))
                        }
                        className="min-h-[90px]"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <RecordAuditMeta row={dialog.row} className="mr-auto" />
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
