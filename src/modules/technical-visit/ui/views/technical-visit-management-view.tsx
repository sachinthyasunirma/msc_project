"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { notify } from "@/lib/notify";
import { useConfirm } from "@/components/app-confirm-provider";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { TablePagination } from "@/components/ui/table-pagination";
import { listHotels } from "@/modules/accommodation/lib/accommodation-api";
import { listActivityRecords } from "@/modules/activity/lib/activity-api";
import { listGuideRecords } from "@/modules/guides/lib/guides-api";
import { listTransportRecords } from "@/modules/transport/lib/transport-api";
import { listBusinessNetworkRecords } from "@/modules/business-network/lib/business-network-api";
import {
  createTechnicalVisitRecord,
  deleteTechnicalVisitRecord,
  listTechnicalVisitRecords,
  updateTechnicalVisitRecord,
} from "@/modules/technical-visit/lib/technical-visit-api";
import type { TechnicalVisitResourceKey } from "@/modules/technical-visit/shared/technical-visit-schemas";

type Row = Record<string, unknown>;

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "datetime";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  nullable?: boolean;
  defaultValue?: string | number | boolean;
};

const META: Record<TechnicalVisitResourceKey, { title: string; description: string }> = {
  "technical-visits": {
    title: "Technical Visits",
    description: "Capture supplier field visits and quality assessments.",
  },
  "technical-visit-checklists": {
    title: "Checklist",
    description: "Capture detailed checks per technical visit.",
  },
  "technical-visit-media": {
    title: "Media",
    description: "Attach evidence photos and files for each visit.",
  },
  "technical-visit-actions": {
    title: "Actions",
    description: "Follow-up actions and ownership after visit.",
  },
};

const COLUMNS: Record<TechnicalVisitResourceKey, Array<{ key: string; label: string }>> = {
  "technical-visits": [
    { key: "code", label: "Code" },
    { key: "visitType", label: "Type" },
    { key: "referenceId", label: "Reference" },
    { key: "visitDate", label: "Visit Date" },
    { key: "visitedByUserId", label: "Visited By" },
    { key: "overallRating", label: "Rating" },
    { key: "status", label: "Status" },
    { key: "isActive", label: "Active" },
  ],
  "technical-visit-checklists": [
    { key: "code", label: "Code" },
    { key: "visitId", label: "Visit" },
    { key: "category", label: "Category" },
    { key: "item", label: "Item" },
    { key: "rating", label: "Rating" },
    { key: "isActive", label: "Active" },
  ],
  "technical-visit-media": [
    { key: "code", label: "Code" },
    { key: "visitId", label: "Visit" },
    { key: "fileUrl", label: "File URL" },
    { key: "caption", label: "Caption" },
    { key: "isActive", label: "Active" },
  ],
  "technical-visit-actions": [
    { key: "code", label: "Code" },
    { key: "visitId", label: "Visit" },
    { key: "action", label: "Action" },
    { key: "assignedToUserId", label: "Assigned To" },
    { key: "dueDate", label: "Due Date" },
    { key: "status", label: "Status" },
    { key: "isActive", label: "Active" },
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

export function TechnicalVisitManagementView({
  initialResource = "technical-visits",
}: {
  initialResource?: TechnicalVisitResourceKey;
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

  const [resource, setResource] = useState<TechnicalVisitResourceKey>(initialResource);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [visits, setVisits] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [guides, setGuides] = useState<Row[]>([]);
  const [activities, setActivities] = useState<Row[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<Row[]>([]);
  const [hotels, setHotels] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [restaurants, setRestaurants] = useState<Row[]>([]);
  const [users, setUsers] = useState<Row[]>([]);

  const [selectedVisitId, setSelectedVisitId] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    row: Row | null;
  }>({ open: false, mode: "create", row: null });
  const [form, setForm] = useState<Row>({});

  const visitOptions = useMemo(
    () =>
      visits.map((row) => ({
        value: String(row.id),
        label: `${String(row.code)} - ${String(row.visitType)} - ${new Date(String(row.visitDate)).toLocaleDateString()}`,
      })),
    [visits]
  );

  const userOptions = useMemo(
    () =>
      users.map((row) => ({
        value: String(row.id),
        label: String(row.name || row.email || row.id),
      })),
    [users]
  );

  const currentVisitType = useMemo(() => {
    const raw = form.visitType;
    return typeof raw === "string" ? raw : "HOTEL";
  }, [form.visitType]);

  const referenceOptions = useMemo(() => {
    switch (currentVisitType) {
      case "HOTEL":
        return hotels.map((row) => ({ value: row.id, label: `${row.code} - ${row.name}` }));
      case "ACTIVITY":
        return activities.map((row) => ({
          value: String(row.id),
          label: `${String(row.code)} - ${String(row.name)}`,
        }));
      case "VEHICLE":
        return vehicleTypes.map((row) => ({
          value: String(row.id),
          label: `${String(row.code)} - ${String(row.name)}`,
        }));
      case "GUIDE":
        return guides.map((row) => ({
          value: String(row.id),
          label: `${String(row.code)} - ${String(row.fullName || row.name)}`,
        }));
      case "RESTAURANT":
        return restaurants.map((row) => ({
          value: String(row.id),
          label: `${String(row.code)} - ${String(row.name)}`,
        }));
      default:
        return [];
    }
  }, [activities, currentVisitType, guides, hotels, restaurants, vehicleTypes]);

  const lookups = useMemo(() => {
    const pairs: Array<[string, string]> = [];
    visitOptions.forEach((option) => pairs.push([option.value, option.label]));
    userOptions.forEach((option) => pairs.push([option.value, option.label]));
    referenceOptions.forEach((option) => pairs.push([option.value, option.label]));
    return Object.fromEntries(pairs);
  }, [visitOptions, userOptions, referenceOptions]);

  const fields = useMemo<Field[]>(() => {
    switch (resource) {
      case "technical-visits":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "visitType",
            label: "Visit Type",
            type: "select",
            required: true,
            defaultValue: "HOTEL",
            options: [
              { label: "HOTEL", value: "HOTEL" },
              { label: "ACTIVITY", value: "ACTIVITY" },
              { label: "VEHICLE", value: "VEHICLE" },
              { label: "GUIDE", value: "GUIDE" },
              { label: "RESTAURANT", value: "RESTAURANT" },
            ],
          },
          {
            key: "referenceId",
            label: "Reference",
            type: "select",
            required: true,
            options: referenceOptions,
          },
          { key: "visitDate", label: "Visit Date", type: "datetime", required: true },
          {
            key: "visitedByUserId",
            label: "Visited By",
            type: "select",
            required: true,
            options: userOptions,
          },
          { key: "overallRating", label: "Overall Rating", type: "number", nullable: true },
          {
            key: "status",
            label: "Status",
            type: "select",
            defaultValue: "COMPLETED",
            options: [
              { label: "PLANNED", value: "PLANNED" },
              { label: "COMPLETED", value: "COMPLETED" },
              { label: "FOLLOW_UP", value: "FOLLOW_UP" },
            ],
          },
          { key: "summary", label: "Summary", type: "text", nullable: true },
          {
            key: "followUpRequired",
            label: "Follow Up Required",
            type: "boolean",
            defaultValue: false,
          },
          {
            key: "nextVisitDate",
            label: "Next Visit Date",
            type: "datetime",
            nullable: true,
          },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];

      case "technical-visit-checklists":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "visitId",
            label: "Visit",
            type: "select",
            required: true,
            options: visitOptions,
          },
          {
            key: "category",
            label: "Category",
            type: "select",
            nullable: true,
            options: [
              { label: "CLEANLINESS", value: "CLEANLINESS" },
              { label: "SAFETY", value: "SAFETY" },
              { label: "SERVICE", value: "SERVICE" },
              { label: "LOCATION", value: "LOCATION" },
              { label: "VEHICLE_CONDITION", value: "VEHICLE_CONDITION" },
            ],
          },
          { key: "item", label: "Checklist Item", type: "text", required: true },
          { key: "rating", label: "Rating", type: "number", nullable: true },
          { key: "remarks", label: "Remarks", type: "text", nullable: true },
          { key: "sortOrder", label: "Sort Order", type: "number", defaultValue: 0 },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];

      case "technical-visit-media":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "visitId",
            label: "Visit",
            type: "select",
            required: true,
            options: visitOptions,
          },
          { key: "fileUrl", label: "File URL", type: "text", required: true },
          { key: "caption", label: "Caption", type: "text", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];

      case "technical-visit-actions":
      default:
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "visitId",
            label: "Visit",
            type: "select",
            required: true,
            options: visitOptions,
          },
          { key: "action", label: "Action", type: "text", required: true },
          {
            key: "assignedToUserId",
            label: "Assigned To",
            type: "select",
            nullable: true,
            options: userOptions,
          },
          { key: "dueDate", label: "Due Date", type: "datetime", nullable: true },
          {
            key: "status",
            label: "Status",
            type: "select",
            defaultValue: "OPEN",
            options: [
              { label: "OPEN", value: "OPEN" },
              { label: "IN_PROGRESS", value: "IN_PROGRESS" },
              { label: "DONE", value: "DONE" },
              { label: "CANCELLED", value: "CANCELLED" },
            ],
          },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
    }
  }, [referenceOptions, resource, userOptions, visitOptions]);

  const loadLookups = useCallback(async () => {
    const [visitRows, guideRows, activityRows, vehicleRows, hotelResponse, orgRows, usersResponse] =
      await Promise.all([
        listTechnicalVisitRecords("technical-visits", { limit: 500 }),
        listGuideRecords("guides", { limit: 300 }),
        listActivityRecords("activities", { limit: 300 }),
        listTransportRecords("vehicle-types", { limit: 300 }),
        listHotels(new URLSearchParams({ limit: "200" })),
        listBusinessNetworkRecords("organizations", { limit: 400 }),
        fetch("/api/companies/users", { cache: "no-store" }),
      ]);

    setVisits(visitRows);
    setGuides(guideRows);
    setActivities(activityRows);
    setVehicleTypes(vehicleRows);
    setHotels(hotelResponse.items.map((item) => ({ id: item.id, code: item.code, name: item.name })));
    setRestaurants(
      orgRows.filter((row) => {
        const type = String(row.type || "");
        return type === "SUPPLIER" || type === "RESTAURANT";
      })
    );
    if (usersResponse.ok) {
      const payload = (await usersResponse.json()) as { users?: Array<Record<string, unknown>> };
      setUsers(payload.users ?? []);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTechnicalVisitRecords(resource, {
        q: query || undefined,
        limit: 500,
        visitId: resource === "technical-visits" ? undefined : selectedVisitId || undefined,
      });
      setRows(data);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [query, resource, selectedVisitId]);

  useEffect(() => {
    void loadLookups().catch((error) => {
      notify.error(error instanceof Error ? error.message : "Failed to load lookup data.");
    });
  }, [loadLookups]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, query, resource, selectedVisitId]);

  useEffect(() => {
    if (resource !== "technical-visits" && !selectedVisitId && visitOptions[0]) {
      setSelectedVisitId(visitOptions[0].value);
    }
  }, [resource, selectedVisitId, visitOptions]);

  const visibleRows = useMemo(() => {
    const from = (page - 1) * pageSize;
    return rows.slice(from, from + pageSize);
  }, [page, pageSize, rows]);

  const openDialog = (mode: "create" | "edit", row?: Row) => {
    if (mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }

    const nextForm: Row = {};
    fields.forEach((field) => {
      const existing = row?.[field.key];
      if (field.type === "datetime") {
        nextForm[field.key] = existing ? toLocalDateTime(existing) : "";
      } else if (existing !== undefined) {
        nextForm[field.key] = existing;
      } else {
        nextForm[field.key] = defaultValue(field);
      }
    });

    if (mode === "create" && resource !== "technical-visits" && selectedVisitId) {
      nextForm.visitId = selectedVisitId;
    }

    setForm(nextForm);
    setDialog({ open: true, mode, row: row ?? null });
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of fields) {
        const value = form[field.key];
        if ((value === "" || value === undefined || value === null) && field.nullable) {
          payload[field.key] = null;
          continue;
        }
        if (field.required && (value === "" || value === undefined || value === null)) {
          throw new Error(`${field.label} is required.`);
        }
        if ((value === "" || value === undefined) && !field.required) continue;

        if (field.type === "number") {
          payload[field.key] = value === "" ? null : Number(value);
        } else if (field.type === "datetime") {
          payload[field.key] = toIsoDateTime(value);
        } else if (field.type === "boolean") {
          payload[field.key] = Boolean(value);
        } else if (field.key === "code" && typeof value === "string") {
          payload[field.key] = value.trim().toUpperCase();
        } else {
          payload[field.key] = value;
        }
      }

      if (resource !== "technical-visits" && selectedVisitId) {
        payload.visitId = payload.visitId ?? selectedVisitId;
      }

      if (dialog.mode === "create") {
        await createTechnicalVisitRecord(resource, payload);
        notify.success("Record created.");
      } else if (dialog.row?.id) {
        await updateTechnicalVisitRecord(resource, String(dialog.row.id), payload);
        notify.success("Record updated.");
      }

      setDialog({ open: false, mode: "create", row: null });
      await Promise.all([loadLookups(), loadRecords()]);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save record.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row: Row) => {
    if (!row.id) return;
    if (isReadOnly) {
      notify.warning("View only mode: deleting records is disabled.");
      return;
    }

    const targetLabel = String(row.code || row.action || row.item || row.id);
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
      await deleteTechnicalVisitRecord(resource, String(row.id));
      notify.success("Record deleted.");
      await Promise.all([loadLookups(), loadRecords()]);
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
            <Button variant="outline" onClick={() => void Promise.all([loadLookups(), loadRecords()])}>
              Refresh
            </Button>
            <Button onClick={() => openDialog("create")} disabled={isReadOnly} className="master-add-btn">
              Add Record
            </Button>
          </div>
        </div>

        <Tabs value={resource} onValueChange={(value) => setResource(value as TechnicalVisitResourceKey)}>
          <div className="master-tabs-scroll">
            <TabsList className="master-tabs-list">
              {Object.keys(META).map((key) => (
                <TabsTrigger key={key} value={key} className="master-tab-trigger">
                  {META[key as TechnicalVisitResourceKey].title}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          {resource !== "technical-visits" ? (
            <Select value={selectedVisitId} onValueChange={setSelectedVisitId}>
              <SelectTrigger className="w-[320px] max-w-full">
                <SelectValue placeholder="Select visit" />
              </SelectTrigger>
              <SelectContent>
                {visitOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search..."
            className="max-w-md"
          />
        </div>

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
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS[resource].length + 1} className="text-center text-muted-foreground">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row) => (
                <TableRow key={String(row.id)}>
                  {COLUMNS[resource].map((column) => (
                    <TableCell key={column.key}>
                      {column.key === "isActive" ? (
                        <Badge variant={row.isActive ? "default" : "secondary"}>
                          {row.isActive ? "Active" : "Inactive"}
                        </Badge>
                      ) : column.key === "status" ? (
                        <Badge variant="outline">{String(row.status || "-")}</Badge>
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

        {!loading && rows.length > 0 ? (
          <TablePagination
            totalItems={rows.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
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
                <Label>{field.label}{field.required ? " *" : ""}</Label>
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
                        ...(field.key === "visitType" ? { referenceId: "" } : {}),
                        [field.key]: field.nullable && value === "__none__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
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
                ) : field.type === "boolean" ? (
                  <div className="flex h-9 items-center justify-between rounded-md border px-3">
                    <span className="text-xs text-muted-foreground">
                      {Boolean(form[field.key]) ? "Yes" : "No"}
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
