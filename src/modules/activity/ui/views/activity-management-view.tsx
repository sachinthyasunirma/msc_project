"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Edit3, Plus, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/app-confirm-provider";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import {
  createActivityRecord,
  deleteActivityRecord,
  listActivityRecords,
  updateActivityRecord,
} from "@/modules/activity/lib/activity-api";
import { listTransportRecords } from "@/modules/transport/lib/transport-api";

type ResourceKey = "activities" | "activity-availability" | "activity-rates" | "activity-supplements";

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "datetime" | "json";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number | boolean;
  nullable?: boolean;
  placeholder?: string;
};

type Props = {
  activityId?: string;
  showActivityList?: boolean;
};

const META: Record<ResourceKey, { title: string; description: string }> = {
  activities: {
    title: "Activities",
    description:
      "Create and maintain activities. Cover image is managed inside the activity form.",
  },
  "activity-availability": {
    title: "Activity Availability",
    description: "Configure date windows, weekdays, and operating times for this activity.",
  },
  "activity-rates": {
    title: "Activity Rates",
    description: "Configure pricing lines for this activity.",
  },
  "activity-supplements": {
    title: "Activity Supplements",
    description: "Configure supplements linked to this activity.",
  },
};

const COLUMNS: Record<ResourceKey, Array<{ key: string; label: string }>> = {
  activities: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "type", label: "Type" },
    { key: "locationId", label: "Location" },
    { key: "coverImageUrl", label: "Cover Image" },
    { key: "isActive", label: "Status" },
  ],
  "activity-availability": [
    { key: "code", label: "Code" },
    { key: "startTime", label: "Start" },
    { key: "endTime", label: "End" },
    { key: "isActive", label: "Status" },
  ],
  "activity-rates": [
    { key: "code", label: "Code" },
    { key: "label", label: "Label" },
    { key: "pricingModel", label: "Model" },
    { key: "currency", label: "Currency" },
    { key: "isActive", label: "Status" },
  ],
  "activity-supplements": [
    { key: "code", label: "Code" },
    { key: "supplementActivityId", label: "Supplement" },
    { key: "isRequired", label: "Required" },
    { key: "isActive", label: "Status" },
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

function defaultValue(field: Field) {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === "boolean") return true;
  return "";
}

function formatCell(value: unknown, lookups: Record<string, string>) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && lookups[value]) return lookups[value];
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function makeCode(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function toBooleanLabel(fieldKey: string, value: unknown) {
  const checked = Boolean(value);
  if (fieldKey === "isActive") return checked ? "Active" : "Inactive";
  if (fieldKey === "isRequired") return checked ? "Required" : "Optional";
  return checked ? "Yes" : "No";
}

export function ActivityManagementView({ activityId, showActivityList = true }: Props) {
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

  const initialResource: ResourceKey = showActivityList ? "activities" : "activity-rates";
  const [resource, setResource] = useState<ResourceKey>(initialResource);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState<Array<Record<string, unknown>>>([]);
  const [locations, setLocations] = useState<Array<Record<string, unknown>>>([]);
  const [images, setImages] = useState<Array<Record<string, unknown>>>([]);
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    row: Record<string, unknown> | null;
  }>({ open: false, mode: "create", row: null });
  const [form, setForm] = useState<Record<string, unknown>>({});

  const selectedActivity = useMemo(() => {
    if (!activityId) return null;
    return activities.find((item) => String(item.id) === activityId) ?? null;
  }, [activities, activityId]);

  const coverImageMap = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    images.forEach((item) => {
      if (item.activityId && item.isCover) {
        map.set(String(item.activityId), item);
      }
    });
    return map;
  }, [images]);

  const lookups = useMemo(() => {
    const items: Array<[string, string]> = [];
    activities.forEach((item) => {
      items.push([String(item.id), `${item.code} - ${item.name}`]);
    });
    locations.forEach((item) => {
      items.push([String(item.id), `${item.code} - ${item.name}`]);
    });
    return Object.fromEntries(items);
  }, [activities, locations]);

  const fields = useMemo<Field[]>(() => {
    const supplementOptions = activities
      .filter((item) => !activityId || String(item.id) !== activityId)
      .map((item) => ({
        value: String(item.id),
        label: `${item.code} - ${item.name}`,
      }));
    const locationOptions = locations.map((item) => ({
      value: String(item.id),
      label: `${item.code} - ${item.name}`,
    }));

    switch (resource) {
      case "activities":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "type",
            label: "Type",
            type: "select",
            required: true,
            options: [
              { label: "ACTIVITY", value: "ACTIVITY" },
              { label: "SUPPLEMENT", value: "SUPPLEMENT" },
              { label: "MISCELLANEOUS", value: "MISCELLANEOUS" },
              { label: "OTHER", value: "OTHER" },
            ],
            defaultValue: "ACTIVITY",
          },
          {
            key: "locationId",
            label: "Location",
            type: "select",
            required: true,
            options: locationOptions,
          },
          {
            key: "locationRole",
            label: "Location Role",
            type: "text",
            defaultValue: "ACTIVITY_LOCATION",
          },
          { key: "name", label: "Name", type: "text", required: true },
          { key: "shortDescription", label: "Short Description", type: "text" },
          { key: "description", label: "Description", type: "text" },
          { key: "durationMin", label: "Duration (min)", type: "number" },
          { key: "minPax", label: "Min Pax", type: "number", defaultValue: 1 },
          { key: "maxPax", label: "Max Pax", type: "number", nullable: true },
          { key: "minAge", label: "Min Age", type: "number", nullable: true },
          { key: "maxAge", label: "Max Age", type: "number", nullable: true },
          { key: "inclusions", label: "Inclusions JSON", type: "json" },
          { key: "exclusions", label: "Exclusions JSON", type: "json" },
          { key: "notes", label: "Notes", type: "text" },
          { key: "coverImageUrl", label: "Cover Image URL", type: "text", nullable: true },
          { key: "coverImageAltText", label: "Cover Image Alt Text", type: "text", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "activity-availability": {
        const base: Field[] = [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "effectiveFrom", label: "Effective From", type: "datetime", nullable: true },
          { key: "effectiveTo", label: "Effective To", type: "datetime", nullable: true },
          { key: "weekdays", label: "Weekdays JSON", type: "json", nullable: true },
          { key: "startTime", label: "Start Time (HH:mm)", type: "text", nullable: true },
          { key: "endTime", label: "End Time (HH:mm)", type: "text", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
          { key: "notes", label: "Notes", type: "text" },
        ];
        if (showActivityList) {
          return [
            {
              key: "activityId",
              label: "Activity",
              type: "select",
              required: true,
              options: activities.map((item) => ({
                value: String(item.id),
                label: `${item.code} - ${item.name}`,
              })),
            },
            ...base,
          ];
        }
        return base;
      }
      case "activity-rates": {
        const base: Field[] = [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "label", label: "Label", type: "text", nullable: true },
          { key: "currency", label: "Currency", type: "text", defaultValue: "LKR" },
          {
            key: "pricingModel",
            label: "Pricing Model",
            type: "select",
            defaultValue: "FIXED",
            options: [
              { label: "FIXED", value: "FIXED" },
              { label: "PER_PAX", value: "PER_PAX" },
              { label: "TIERED_PAX", value: "TIERED_PAX" },
              { label: "PER_HOUR", value: "PER_HOUR" },
              { label: "PER_UNIT", value: "PER_UNIT" },
            ],
          },
          { key: "fixedRate", label: "Fixed Rate", type: "number", nullable: true },
          { key: "perPaxRate", label: "Per Pax Rate", type: "number", nullable: true },
          { key: "perHourRate", label: "Per Hour Rate", type: "number", nullable: true },
          { key: "perUnitRate", label: "Per Unit Rate", type: "number", nullable: true },
          { key: "paxTiers", label: "Pax Tiers JSON", type: "json", nullable: true },
          { key: "minCharge", label: "Min Charge", type: "number", defaultValue: 0 },
          { key: "effectiveFrom", label: "Effective From", type: "datetime", nullable: true },
          { key: "effectiveTo", label: "Effective To", type: "datetime", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
          { key: "notes", label: "Notes", type: "text" },
        ];
        if (showActivityList) {
          return [
            {
              key: "activityId",
              label: "Activity",
              type: "select",
              required: true,
              options: activities.map((item) => ({
                value: String(item.id),
                label: `${item.code} - ${item.name}`,
              })),
            },
            ...base,
          ];
        }
        return base;
      }
      case "activity-supplements": {
        const base: Field[] = [
          { key: "code", label: "Code", type: "text", required: true },
          {
            key: "supplementActivityId",
            label: "Supplement Activity",
            type: "select",
            required: true,
            options: supplementOptions,
          },
          { key: "isRequired", label: "Required", type: "boolean", defaultValue: false },
          { key: "minQty", label: "Min Qty", type: "number", defaultValue: 0 },
          { key: "maxQty", label: "Max Qty", type: "number", nullable: true },
          { key: "sortOrder", label: "Sort Order", type: "number", defaultValue: 0 },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
        if (showActivityList) {
          return [
            {
              key: "parentActivityId",
              label: "Parent Activity",
              type: "select",
              required: true,
              options: activities.map((item) => ({
                value: String(item.id),
                label: `${item.code} - ${item.name}`,
              })),
            },
            ...base,
          ];
        }
        return base;
      }
      default:
        return [];
    }
  }, [activities, activityId, locations, resource, showActivityList]);

  const loadLookups = useCallback(async () => {
    try {
      const [acts, locs] = await Promise.all([
        listActivityRecords("activities", { limit: 200 }),
        listTransportRecords("locations", { limit: 200 }),
      ]);
      setActivities(acts);
      setLocations(locs);
    } catch (error) {
      setActivities([]);
      setLocations([]);
      notify.error(error instanceof Error ? error.message : "Failed to load activity lookups.");
    }
  }, []);

  const loadImages = useCallback(async () => {
    try {
      const rows = await listActivityRecords("activity-images", {
        limit: 200,
        activityId: activityId || undefined,
      });
      setImages(rows);
    } catch {
      setImages([]);
    }
  }, [activityId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: { q?: string; limit?: number; activityId?: string; parentActivityId?: string } = {
        q: query || undefined,
        limit: 200,
      };
      if (!showActivityList && activityId) {
        if (resource === "activity-supplements") {
          params.parentActivityId = activityId;
        } else if (resource !== "activities") {
          params.activityId = activityId;
        }
      }

      const rows = await listActivityRecords(resource, params);
      const hydrated =
        resource === "activities"
          ? rows.map((row) => ({
              ...row,
              coverImageUrl: coverImageMap.get(String(row.id))?.url ?? null,
            }))
          : rows;
      setRecords(hydrated);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [activityId, coverImageMap, query, resource, showActivityList]);

  useEffect(() => {
    void loadLookups();
    void loadImages();
  }, [loadLookups, loadImages]);

  useEffect(() => {
    void load();
  }, [load]);

  const upsertCoverImage = useCallback(
    async (targetActivityId: string, imageUrlRaw: unknown, altTextRaw: unknown) => {
      const imageUrl = String(imageUrlRaw ?? "").trim();
      const altText = String(altTextRaw ?? "").trim();
      const currentCover = coverImageMap.get(targetActivityId);

      if (!imageUrl) {
        if (currentCover?.id) {
          await deleteActivityRecord("activity-images", String(currentCover.id));
        }
        return;
      }

      if (currentCover?.id) {
        await updateActivityRecord("activity-images", String(currentCover.id), {
          url: imageUrl,
          altText: altText || null,
          isCover: true,
          sortOrder: 0,
        });
        return;
      }

      await createActivityRecord("activity-images", {
        code: makeCode("AIMG"),
        activityId: targetActivityId,
        url: imageUrl,
        altText: altText || null,
        isCover: true,
        sortOrder: 0,
      });
    },
    [coverImageMap]
  );

  const openDialog = (mode: "create" | "edit", row?: Record<string, unknown>) => {
    if (mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    const next: Record<string, unknown> = {};
    fields.forEach((field) => {
      if (mode === "edit" && row) {
        const raw = row[field.key];
        if (field.type === "datetime") next[field.key] = toLocalDateTime(raw);
        else if (field.type === "json") next[field.key] = raw ? JSON.stringify(raw) : "";
        else next[field.key] = raw ?? defaultValue(field);
      } else {
        next[field.key] = defaultValue(field);
      }
    });

    if (resource === "activities") {
      const targetActivityId = mode === "edit" && row?.id ? String(row.id) : "";
      const cover = targetActivityId ? coverImageMap.get(targetActivityId) : null;
      next.coverImageUrl = String(cover?.url ?? "");
      next.coverImageAltText = String(cover?.altText ?? "");
    }

    if (!showActivityList && activityId) {
      if (resource === "activity-rates" || resource === "activity-availability") {
        next.activityId = activityId;
      }
      if (resource === "activity-supplements") {
        next.parentActivityId = activityId;
      }
    }

    setForm(next);
    setDialog({ open: true, mode, row: row ?? null });
  };

  const onSubmit = async () => {
    try {
      setSaving(true);
      const payload: Record<string, unknown> = {};

      for (const field of fields) {
        const value = form[field.key];
        if ((value === "" || value === undefined) && field.nullable) {
          payload[field.key] = null;
          continue;
        }
        if ((value === "" || value === undefined) && !field.required) continue;
        if (field.required && (value === "" || value === undefined)) {
          throw new Error(`${field.label} is required.`);
        }

        if (field.type === "number") payload[field.key] = value === "" ? null : Number(value);
        else if (field.type === "boolean") payload[field.key] = Boolean(value);
        else if (field.type === "json") payload[field.key] = value ? JSON.parse(String(value)) : null;
        else if (field.type === "datetime") payload[field.key] = toIsoDateTime(value);
        else if (field.key === "code" && typeof value === "string") payload[field.key] = value.toUpperCase().trim();
        else payload[field.key] = value;
      }

      if (!showActivityList && activityId) {
        if (resource === "activity-rates" || resource === "activity-availability") {
          payload.activityId = activityId;
        }
        if (resource === "activity-supplements") {
          payload.parentActivityId = activityId;
        }
      }

      if (resource === "activities") {
        const { coverImageUrl, coverImageAltText, ...activityPayload } = payload;
        if (dialog.mode === "create") {
          const created = await createActivityRecord("activities", activityPayload);
          await upsertCoverImage(String(created.id), coverImageUrl, coverImageAltText);
          notify.success("Activity created.");
        } else if (dialog.row?.id) {
          const updated = await updateActivityRecord("activities", String(dialog.row.id), activityPayload);
          await upsertCoverImage(String(updated.id), coverImageUrl, coverImageAltText);
          notify.success("Activity updated.");
        }
      } else {
        if (dialog.mode === "create") {
          await createActivityRecord(resource, payload);
          notify.success("Record created.");
        } else if (dialog.row?.id) {
          await updateActivityRecord(resource, String(dialog.row.id), payload);
          notify.success("Record updated.");
        }
      }

      setDialog({ open: false, mode: "create", row: null });
      await Promise.all([load(), loadImages(), loadLookups()]);
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
      String(row.name ?? "").trim() ||
      String(row.label ?? "").trim() ||
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
      await deleteActivityRecord(resource, String(row.id));
      notify.success("Record deleted.");
      await Promise.all([load(), loadImages(), loadLookups()]);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete record.");
    } finally {
      setSaving(false);
    }
  };

  const resourceTabs = showActivityList
    ? (["activities"] as ResourceKey[])
    : (["activity-rates", "activity-availability", "activity-supplements"] as ResourceKey[]);

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{META[resource].title}</CardTitle>
            <CardDescription>
              {showActivityList
                ? META[resource].description
                : `${selectedActivity?.code ?? ""} ${selectedActivity?.name ?? ""}`.trim() ||
                  META[resource].description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!showActivityList ? (
              <Button variant="outline" asChild>
                <Link href="/master-data/activities">Back to Activities</Link>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => void Promise.all([load(), loadImages(), loadLookups()])}>
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

        {resourceTabs.length > 1 ? (
          <Tabs value={resource} onValueChange={(value) => setResource(value as ResourceKey)}>
            <div className="master-tabs-scroll">
              <TabsList className="master-tabs-list">
                {resourceTabs.map((key) => (
                  <TabsTrigger key={key} value={key} className="master-tab-trigger">
                    {META[key].title.replace("Activity ", "")}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
                      ) : column.key === "isRequired" ? (
                        <Badge variant={row.isRequired ? "default" : "secondary"}>
                          {row.isRequired ? "Required" : "Optional"}
                        </Badge>
                      ) : column.key === "coverImageUrl" ? (
                        row.coverImageUrl ? (
                          <a
                            href={String(row.coverImageUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          "-"
                        )
                      ) : (
                        formatCell(row[column.key], lookups)
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {resource === "activities" && showActivityList ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="master-manage-btn"
                          asChild
                        >
                          <Link href={`/master-data/activities/${row.id}`}>
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
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "create" ? "Add" : "Edit"} {META[resource].title}
            </DialogTitle>
            <DialogDescription>Fill required fields and save.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-x-hidden overflow-y-auto px-1 md:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.key}
                className={`min-w-0 space-y-2 ${field.type === "json" || field.key === "description" ? "md:col-span-2" : ""}`}
              >
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
                    <span className="text-muted-foreground text-xs">{toBooleanLabel(field.key, form[field.key])}</span>
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
                    placeholder={field.placeholder}
                  />
                ) : field.key === "description" ? (
                  <Textarea
                    value={String(form[field.key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    placeholder={field.placeholder}
                  />
                ) : (
                  <Input
                    type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"}
                    value={String(form[field.key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="pt-2">
            <RecordAuditMeta row={dialog.row} className="mr-auto" />
            <Button variant="outline" onClick={() => setDialog({ open: false, mode: "create", row: null })}>
              Cancel
            </Button>
            <Button
              onClick={() => void onSubmit()}
              disabled={saving || (isReadOnly && dialog.mode === "create")}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
