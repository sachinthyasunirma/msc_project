"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/table-pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { authClient } from "@/lib/auth-client";
import {
  createTourCategoryRecord,
  deleteTourCategoryRecord,
  listTourCategoryRecords,
  updateTourCategoryRecord,
} from "@/modules/tour-category/lib/tour-category-api";
import type { TourCategoryResourceKey } from "@/modules/tour-category/shared/tour-category-schemas";

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
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
    { key: "defaultMarkupPercent", label: "Markup %" },
    { key: "requireCertifiedGuide", label: "Certified Guide" },
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

export function TourCategoryManagementView({
  initialResource = "tour-category-types",
}: {
  initialResource?: TourCategoryResourceKey;
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

  const [resource, setResource] = useState<TourCategoryResourceKey>(initialResource);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [types, setTypes] = useState<Array<Record<string, unknown>>>([]);
  const [categories, setCategories] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
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
          { key: "description", label: "Description", type: "text", nullable: true },
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
            options: categoryOptions,
          },
          { key: "description", label: "Description", type: "text", nullable: true },
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
          { key: "notes", label: "Notes", type: "text", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
    }
  }, [categories, resource, types]);

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
    void loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    void load();
  }, [load]);

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
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{META[resource].title}</h2>
            <p className="text-sm text-muted-foreground">{META[resource].description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void Promise.all([load(), loadLookups()])}>
              Refresh
            </Button>
            <Button onClick={() => openDialog("create")} disabled={isReadOnly} className="master-add-btn">
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
                      <Button size="sm" variant="outline" onClick={() => openDialog("edit", row)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void onDelete(row)}>
                        Delete
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialog.mode === "create" ? "Add" : "Edit"} {META[resource].title}</DialogTitle>
            <DialogDescription>Fill required fields and save.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
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
                    <SelectTrigger>
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
                    <span className="text-xs text-muted-foreground">
                      {Boolean(form[field.key]) ? "Active" : "Inactive"}
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
                    type={field.type === "number" ? "number" : "text"}
                    value={String(form[field.key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
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

