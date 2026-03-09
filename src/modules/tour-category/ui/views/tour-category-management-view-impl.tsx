"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import {
  createTourCategoryRecord,
  deleteTourCategoryRecord,
  listTourCategoryRecords,
  updateTourCategoryRecord,
} from "@/modules/tour-category/lib/tour-category-api";
import type { TourCategoryManagementInitialData } from "@/modules/tour-category/shared/tour-category-management-types";
import type { TourCategoryResourceKey } from "@/modules/tour-category/shared/tour-category-schemas";

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "textarea";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  nullable?: boolean;
  defaultValue?: string | number | boolean;
};

const META: Record<TourCategoryResourceKey, { title: string; description: string }> = {
  "tour-category-types": {
    title: "Tour Category Types",
    description: "Define classification dimensions (theme, comfort level, travel style).",
  },
  "tour-categories": {
    title: "Tour Categories",
    description: "Define reusable values under each type.",
  },
  "tour-category-rules": {
    title: "Tour Category Rules",
    description: "Define pricing and operational rules per category.",
  },
};

const COLUMNS: Record<TourCategoryResourceKey, Array<{ key: string; label: string }>> = {
  "tour-category-types": [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "allowMultiple", label: "Allow Multiple" },
    { key: "sortOrder", label: "Sort" },
    { key: "isActive", label: "Status" },
  ],
  "tour-categories": [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "typeId", label: "Type" },
    { key: "parentId", label: "Parent" },
    { key: "isActive", label: "Status" },
  ],
  "tour-category-rules": [
    { key: "code", label: "Code" },
    { key: "categoryId", label: "Category" },
    { key: "requireHotel", label: "Hotel Required" },
    { key: "requireTransport", label: "Transport Required" },
    { key: "requireItinerary", label: "Itinerary Required" },
    { key: "isActive", label: "Status" },
  ],
};

function defaultValue(field: Field) {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === "boolean") return true;
  return "";
}

function formatCell(value: unknown, lookups: Record<string, string>) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && lookups[value]) return lookups[value];
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function toOptionalNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function TourCategoryManagementView({
  initialResource = "tour-category-types",
  initialData = null,
}: {
  initialResource?: TourCategoryResourceKey;
  initialData?: TourCategoryManagementInitialData | null;
}) {
  const confirm = useConfirm();
  const { isReadOnly } = useDashboardAccessState();
  const skipInitialLookupsLoadRef = useRef(Boolean(initialData));
  const skipInitialRecordsLoadRef = useRef(
    Boolean(initialData && initialData.resource === initialResource)
  );

  const [resource, setResource] = useState<TourCategoryResourceKey>(initialResource);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Array<Record<string, unknown>>>(initialData?.records ?? []);
  const [types, setTypes] = useState<Array<Record<string, unknown>>>(initialData?.types ?? []);
  const [categories, setCategories] = useState<Array<Record<string, unknown>>>(
    initialData?.categories ?? []
  );
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    row: Record<string, unknown> | null;
  }>({ open: false, mode: "create", row: null });
  const [form, setForm] = useState<Record<string, unknown>>({});

  const lookups = useMemo(() => {
    const pairs: Array<[string, string]> = [];
    types.forEach((row) => pairs.push([String(row.id), `${row.code} - ${row.name}`]));
    categories.forEach((row) => pairs.push([String(row.id), `${row.code} - ${row.name}`]));
    return Object.fromEntries(pairs);
  }, [types, categories]);

  const fields = useMemo<Field[]>(() => {
    const typeOptions = types.map((row) => ({
      value: String(row.id),
      label: `${row.code} - ${row.name}`,
    }));
    const categoryOptions = categories.map((row) => ({
      value: String(row.id),
      label: `${row.code} - ${row.name}`,
    }));

    switch (resource) {
      case "tour-category-types":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "name", label: "Name", type: "text", required: true },
          { key: "allowMultiple", label: "Allow Multiple", type: "boolean", defaultValue: true },
          { key: "description", label: "Description", type: "textarea", nullable: true },
          { key: "sortOrder", label: "Sort Order", type: "number", defaultValue: 0 },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "tour-categories":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "typeId", label: "Type", type: "select", required: true, options: typeOptions },
          { key: "name", label: "Name", type: "text", required: true },
          {
            key: "parentId",
            label: "Parent",
            type: "select",
            nullable: true,
            options: [],
          },
          { key: "description", label: "Description", type: "textarea", nullable: true },
          { key: "icon", label: "Icon", type: "text", nullable: true },
          { key: "color", label: "Color", type: "text", nullable: true },
          { key: "sortOrder", label: "Sort Order", type: "number", defaultValue: 0 },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "tour-category-rules":
      default:
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "categoryId",
            label: "Category",
            type: "select",
            required: true,
            options: categoryOptions,
          },
          {
            key: "defaultMarkupPercent",
            label: "Default Markup %",
            type: "number",
            nullable: true,
          },
          {
            key: "restrictHotelStarMin",
            label: "Hotel Star Min",
            type: "number",
            nullable: true,
          },
          {
            key: "restrictHotelStarMax",
            label: "Hotel Star Max",
            type: "number",
            nullable: true,
          },
          {
            key: "requireCertifiedGuide",
            label: "Require Certified Guide",
            type: "boolean",
            defaultValue: false,
          },
          { key: "requireHotel", label: "Require Hotel", type: "boolean", defaultValue: false },
          { key: "requireTransport", label: "Require Transport", type: "boolean", defaultValue: false },
          { key: "requireItinerary", label: "Require Itinerary", type: "boolean", defaultValue: false },
          { key: "requireActivity", label: "Require Activity", type: "boolean", defaultValue: false },
          { key: "requireCeremony", label: "Require Ceremony", type: "boolean", defaultValue: false },
          { key: "allowMultipleHotels", label: "Allow Multiple Hotels", type: "boolean", defaultValue: false },
          { key: "allowWithoutHotel", label: "Allow Without Hotel", type: "boolean", defaultValue: true },
          { key: "allowWithoutTransport", label: "Allow Without Transport", type: "boolean", defaultValue: true },
          { key: "minNights", label: "Min Nights", type: "number", nullable: true },
          { key: "maxNights", label: "Max Nights", type: "number", nullable: true },
          { key: "minDays", label: "Min Days", type: "number", nullable: true },
          { key: "maxDays", label: "Max Days", type: "number", nullable: true },
          { key: "notes", label: "Notes", type: "textarea", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
    }
  }, [categories, resource, types]);

  const selectedCategoryTypeId = useMemo(() => {
    if (resource !== "tour-categories") return "";
    const fromForm = String(form.typeId ?? "");
    if (fromForm) return fromForm;
    return String(dialog.row?.typeId ?? "");
  }, [dialog.row, form.typeId, resource]);

  const parentCategoryOptions = useMemo(() => {
    const selfId = String(dialog.row?.id ?? "");
    const rows = selectedCategoryTypeId
      ? categories.filter((row) => String(row.typeId) === selectedCategoryTypeId)
      : categories;
    return rows
      .filter((row) => String(row.id) !== selfId)
      .map((row) => ({
        value: String(row.id),
        label: `${row.code} - ${row.name}`,
      }));
  }, [categories, dialog.row, selectedCategoryTypeId]);

  const loadLookups = useCallback(async () => {
    const [typeRows, categoryRows] = await Promise.all([
      listTourCategoryRecords("tour-category-types", { limit: 500 }),
      listTourCategoryRecords("tour-categories", { limit: 500 }),
    ]);
    setTypes(typeRows);
    setCategories(categoryRows);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listTourCategoryRecords(resource, { q: query || undefined, limit: 500 });
      setRecords(rows);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [query, resource]);

  useEffect(() => {
    if (skipInitialLookupsLoadRef.current) {
      skipInitialLookupsLoadRef.current = false;
      return;
    }
    void loadLookups();
  }, [loadLookups]);

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
  }, [resource, query, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const openDialog = (mode: "create" | "edit", row?: Record<string, unknown>) => {
    if (mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    const next: Record<string, unknown> = {};
    fields.forEach((field) => {
      next[field.key] =
        mode === "edit" && row
          ? row[field.key] ?? defaultValue(field)
          : defaultValue(field);
    });
    setForm(next);
    setDialog({ open: true, mode, row: row ?? null });
  };

  const onSave = async () => {
    try {
      setSaving(true);

      if (resource === "tour-category-rules") {
        const requireHotel = Boolean(form.requireHotel);
        const requireTransport = Boolean(form.requireTransport);
        const allowWithoutHotel = Boolean(form.allowWithoutHotel);
        const allowWithoutTransport = Boolean(form.allowWithoutTransport);

        const hotelStarMin = toOptionalNumber(form.restrictHotelStarMin);
        const hotelStarMax = toOptionalNumber(form.restrictHotelStarMax);
        const minNights = toOptionalNumber(form.minNights);
        const maxNights = toOptionalNumber(form.maxNights);
        const minDays = toOptionalNumber(form.minDays);
        const maxDays = toOptionalNumber(form.maxDays);

        if (requireHotel && allowWithoutHotel) {
          throw new Error("Allow Without Hotel must be disabled when Require Hotel is enabled.");
        }

        if (requireTransport && allowWithoutTransport) {
          throw new Error(
            "Allow Without Transport must be disabled when Require Transport is enabled."
          );
        }

        if (hotelStarMin !== null && hotelStarMax !== null && hotelStarMin > hotelStarMax) {
          throw new Error("Hotel Star Min cannot be greater than Hotel Star Max.");
        }

        if (minNights !== null && maxNights !== null && minNights > maxNights) {
          throw new Error("Min Nights cannot be greater than Max Nights.");
        }

        if (minDays !== null && maxDays !== null && minDays > maxDays) {
          throw new Error("Min Days cannot be greater than Max Days.");
        }
      }

      const payload: Record<string, unknown> = {};
      fields.forEach((field) => {
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
        else if (field.key === "code" && typeof value === "string") {
          payload[field.key] = value.toUpperCase().trim();
        } else if (typeof value === "string") {
          payload[field.key] = value.trim();
        } else payload[field.key] = value;
      });

      if (dialog.mode === "create") {
        await createTourCategoryRecord(resource, payload);
        notify.success("Record created.");
      } else if (dialog.row?.id) {
        await updateTourCategoryRecord(resource, String(dialog.row.id), payload);
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
    if (isReadOnly) {
      notify.warning("View only mode: deleting records is disabled.");
      return;
    }
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
      await deleteTourCategoryRecord(resource, String(row.id));
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
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{META[resource].title}</CardTitle>
            <CardDescription>{META[resource].description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="master-refresh-btn"
              onClick={() => void Promise.all([load(), loadLookups()])}
            >
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

        <Tabs value={resource} onValueChange={(value) => setResource(value as TourCategoryResourceKey)}>
          <div className="master-tabs-scroll">
            <TabsList className="master-tabs-list">
              {Object.keys(META).map((key) => (
                <TabsTrigger key={key} value={key} className="master-tab-trigger">
                  {META[key as TourCategoryResourceKey].title.replace("Tour ", "")}
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

        <div className="overflow-hidden rounded-md border">
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
                pagedRecords.map((row) => (
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
                        <Button size="sm" variant="outline" onClick={() => openDialog("edit", row)} title="Edit">
                          <Edit3 className="size-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void onDelete(row)} title="Delete">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

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
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialog.mode === "create" ? "Add" : "Edit"} {META[resource].title}</DialogTitle>
            <DialogDescription>Fill required fields and save.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[62vh] grid-cols-1 gap-3 overflow-x-hidden overflow-y-auto px-1 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key} className={`space-y-2 ${field.type === "textarea" ? "md:col-span-2" : ""}`}>
                <Label>
                  {field.label}
                  {field.required ? " *" : ""}
                </Label>
                {field.type === "select" ? (
                  <Select
                    value={String(form[field.key] ?? (field.nullable ? "__none__" : ""))}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        ...(resource === "tour-categories" && field.key === "typeId" ? { parentId: "" } : {}),
                        [field.key]: value === "__none__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.nullable ? <SelectItem value="__none__">None</SelectItem> : null}
                      {(resource === "tour-categories" && field.key === "parentId"
                        ? parentCategoryOptions
                        : field.options ?? []
                      ).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "boolean" ? (
                  <div className="flex h-9 items-center justify-between rounded-md border px-3">
                    <span className="text-xs text-muted-foreground">
                      {Boolean(form[field.key]) ? "Active" : "Inactive"}
                    </span>
                    <Switch
                      checked={Boolean(form[field.key])}
                      disabled={
                        resource === "tour-category-rules" &&
                        ((field.key === "allowWithoutHotel" && Boolean(form.requireHotel)) ||
                          (field.key === "allowWithoutTransport" &&
                            Boolean(form.requireTransport)))
                      }
                      onCheckedChange={(checked) =>
                        setForm((prev) => {
                          const next = { ...prev, [field.key]: checked };
                          if (resource === "tour-category-rules") {
                            if (field.key === "requireHotel" && checked) {
                              next.allowWithoutHotel = false;
                            }
                            if (field.key === "requireTransport" && checked) {
                              next.allowWithoutTransport = false;
                            }
                          }
                          return next;
                        })
                      }
                    />
                  </div>
                ) : field.type === "textarea" ? (
                  <Textarea
                    value={String(form[field.key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    className="min-h-[92px]"
                  />
                ) : (
                  <Input
                    type={field.type === "number" ? "number" : "text"}
                    value={String(form[field.key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  />
                )}
                {resource === "tour-category-rules" && field.key === "allowWithoutHotel" && Boolean(form.requireHotel) ? (
                  <p className="text-xs text-muted-foreground">
                    Disabled because Require Hotel is enabled.
                  </p>
                ) : null}
                {resource === "tour-category-rules" &&
                field.key === "allowWithoutTransport" &&
                Boolean(form.requireTransport) ? (
                  <p className="text-xs text-muted-foreground">
                    Disabled because Require Transport is enabled.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <DialogFooter className="pt-2">
            <RecordAuditMeta row={dialog.row} className="mr-auto" />
            <Button variant="outline" onClick={() => setDialog({ open: false, mode: "create", row: null })}>
              Cancel
            </Button>
            <Button onClick={() => void onSave()} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
