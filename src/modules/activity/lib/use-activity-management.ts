"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
import {
  buildActivityRecordsParams,
  activityKeys,
} from "@/modules/activity/lib/activity-query";
import {
  createActivityRecord,
  deleteActivityRecord,
  listActivityRecords,
  updateActivityRecord,
} from "@/modules/activity/lib/activity-api";
import {
  defaultValue,
  toIsoDateTime,
  toLocalDateTime,
} from "@/modules/activity/lib/activity-management-utils";
import { ACTIVITY_META } from "@/modules/activity/shared/activity-management-constants";
import type {
  ActivityField,
  ActivityManagementInitialData,
  ActivityResourceKey,
} from "@/modules/activity/shared/activity-management-types";
import { listTransportRecords } from "@/modules/transport/lib/transport-api";

const EMPTY_ROWS: Array<Record<string, unknown>> = [];

type UseActivityManagementOptions = {
  activityId?: string;
  showActivityList?: boolean;
  initialData?: ActivityManagementInitialData | null;
  isReadOnly: boolean;
};

export function useActivityManagement({
  activityId,
  showActivityList = true,
  initialData = null,
  isReadOnly,
}: UseActivityManagementOptions) {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const initialResource: ActivityResourceKey = showActivityList ? "activities" : "activity-rates";
  const [resource, setResource] = useState<ActivityResourceKey>(initialResource);
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

  const lookupsInitialData = initialData
    ? {
        activities: initialData.activities,
        locations: initialData.locations,
      }
    : undefined;

  const recordsInput = useMemo(() => {
    const input = buildActivityRecordsParams({
      resource,
      q: query || undefined,
      limit: 500,
    });

    if (!showActivityList && activityId) {
      if (resource === "activity-supplements") {
        input.parentActivityId = activityId;
      } else if (resource !== "activities") {
        input.activityId = activityId;
      }
    }

    return input;
  }, [activityId, query, resource, showActivityList]);

  const isDefaultRecordsQuery = resource === initialResource && query.length === 0;

  const {
    data: lookupsData,
    error: lookupsError,
    isFetching: lookupsLoading,
    refetch: refetchLookups,
  } = useQuery({
    queryKey: activityKeys.lookups(),
    queryFn: async () => {
      const [activities, locations] = await Promise.all([
        listActivityRecords("activities", { limit: 500 }),
        listTransportRecords("locations", { limit: 500 }),
      ]);

      return {
        activities,
        locations,
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
    queryKey: activityKeys.records({
      resource,
      q: recordsInput.q,
      activityId: recordsInput.activityId,
      parentActivityId: recordsInput.parentActivityId,
      limit: recordsInput.limit,
    }),
    queryFn: () => listActivityRecords(resource, recordsInput),
    initialData: isDefaultRecordsQuery ? initialData?.records ?? undefined : undefined,
    placeholderData: keepPreviousData,
  });

  const createActivityMutation = useMutation({
    mutationFn: ({ targetResource, payload }: { targetResource: string; payload: Record<string, unknown> }) =>
      createActivityRecord(targetResource, payload),
  });
  const updateActivityMutation = useMutation({
    mutationFn: ({
      targetResource,
      id,
      payload,
    }: {
      targetResource: string;
      id: string;
      payload: Record<string, unknown>;
    }) => updateActivityRecord(targetResource, id, payload),
  });
  const deleteActivityMutation = useMutation({
    mutationFn: ({ targetResource, id }: { targetResource: string; id: string }) =>
      deleteActivityRecord(targetResource, id),
  });

  const activities = lookupsData?.activities ?? EMPTY_ROWS;
  const locations = lookupsData?.locations ?? EMPTY_ROWS;
  const loading = lookupsLoading || recordsLoading;
  const saving =
    createActivityMutation.isPending ||
    updateActivityMutation.isPending ||
    deleteActivityMutation.isPending;

  useEffect(() => {
    if (!lookupsError) return;
    notify.error(
      lookupsError instanceof Error ? lookupsError.message : "Failed to load activity lookups."
    );
  }, [lookupsError]);

  useEffect(() => {
    if (!recordsError) return;
    notify.error(recordsError instanceof Error ? recordsError.message : "Failed to load records.");
  }, [recordsError]);

  const selectedActivity = useMemo(() => {
    if (!activityId) return null;
    return activities.find((item) => String(item.id) === activityId) ?? null;
  }, [activities, activityId]);

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

  const activityExistingCodes = useMemo(
    () =>
      new Set(
        activities
          .map((row) => String(row.code ?? "").trim().toUpperCase())
          .filter((value) => value.length > 0)
      ),
    [activities]
  );

  const locationByCode = useMemo(
    () =>
      new Map(
        locations.map((location) => [
          String(location.code ?? "").trim().toUpperCase(),
          String(location.id ?? ""),
        ])
      ),
    [locations]
  );

  const activityByCode = useMemo(
    () =>
      new Map(
        activities.map((activity) => [
          String(activity.code ?? "").trim().toUpperCase(),
          String(activity.id ?? ""),
        ])
      ),
    [activities]
  );

  const fields = useMemo<ActivityField[]>(() => {
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
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "activity-availability": {
        const base: ActivityField[] = [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "effectiveFrom", label: "Effective From", type: "datetime", nullable: true },
          { key: "effectiveTo", label: "Effective To", type: "datetime", nullable: true },
          { key: "weekdays", label: "Weekdays JSON", type: "json", nullable: true },
          { key: "startTime", label: "Start Time (HH:mm)", type: "text", nullable: true },
          { key: "endTime", label: "End Time (HH:mm)", type: "text", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
          { key: "notes", label: "Notes", type: "text" },
        ];
        return showActivityList
          ? [
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
            ]
          : base;
      }
      case "activity-rates": {
        const base: ActivityField[] = [
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
        return showActivityList
          ? [
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
            ]
          : base;
      }
      case "activity-supplements": {
        const base: ActivityField[] = [
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
        return showActivityList
          ? [
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
            ]
          : base;
      }
      default:
        return [];
    }
  }, [activities, activityId, locations, resource, showActivityList]);

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
  }, [resource, query, pageSize, showActivityList, activityId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: activityKeys.lookups() }),
      queryClient.invalidateQueries({ queryKey: activityKeys.recordsRoot() }),
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
      fields.forEach((field) => {
        if (mode === "edit" && row) {
          const raw = row[field.key];
          if (field.type === "datetime") {
            next[field.key] = toLocalDateTime(raw);
          } else if (field.type === "json") {
            next[field.key] = raw ? JSON.stringify(raw) : "";
          } else {
            next[field.key] = raw ?? defaultValue(field);
          }
        } else {
          next[field.key] = defaultValue(field);
        }
      });

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
    },
    [activityId, fields, isReadOnly, resource, showActivityList]
  );

  const onSubmit = useCallback(async () => {
    try {
      const payload: Record<string, unknown> = {};

      for (const field of fields) {
        const value = form[field.key];
        if ((value === "" || value === undefined) && field.nullable) {
          payload[field.key] = null;
          continue;
        }
        if ((value === "" || value === undefined) && !field.required) {
          continue;
        }
        if (field.required && (value === "" || value === undefined)) {
          throw new Error(`${field.label} is required.`);
        }

        if (field.type === "number") {
          payload[field.key] = value === "" ? null : Number(value);
        } else if (field.type === "boolean") {
          payload[field.key] = Boolean(value);
        } else if (field.type === "json") {
          payload[field.key] = value ? JSON.parse(String(value)) : null;
        } else if (field.type === "datetime") {
          payload[field.key] = toIsoDateTime(value);
        } else if (field.key === "code" && typeof value === "string") {
          payload[field.key] = value.toUpperCase().trim();
        } else {
          payload[field.key] = value;
        }
      }

      if (!showActivityList && activityId) {
        if (resource === "activity-rates" || resource === "activity-availability") {
          payload.activityId = activityId;
        }
        if (resource === "activity-supplements") {
          payload.parentActivityId = activityId;
        }
      }

      const targetResource = resource === "activities" ? "activities" : resource;
      if (dialog.mode === "create") {
        await createActivityMutation.mutateAsync({ targetResource, payload });
        notify.success(resource === "activities" ? "Activity created." : "Record created.");
      } else if (dialog.row?.id) {
        await updateActivityMutation.mutateAsync({
          targetResource,
          id: String(dialog.row.id),
          payload,
        });
        notify.success(resource === "activities" ? "Activity updated." : "Record updated.");
      }

      setDialog({ open: false, mode: "create", row: null });
      await refreshAll();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save record.");
    }
  }, [
    activityId,
    createActivityMutation,
    dialog.mode,
    dialog.row,
    fields,
    form,
    refreshAll,
    resource,
    showActivityList,
    updateActivityMutation,
  ]);

  const onDelete = useCallback(
    async (row: Record<string, unknown>) => {
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
        await deleteActivityMutation.mutateAsync({
          targetResource: resource,
          id: String(row.id),
        });
        notify.success("Record deleted.");
        await refreshAll();
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to delete record.");
      }
    },
    [confirm, deleteActivityMutation, refreshAll, resource]
  );

  const refreshActivityExistingCodes = useCallback(async () => {
    const rows = await listActivityRecords("activities", { limit: 500 });
    return new Set(
      rows
        .map((row) => String(row.code ?? "").trim().toUpperCase())
        .filter((value) => value.length > 0)
    );
  }, []);

  const refreshActivityRateExistingCodes = useCallback(async () => {
    const rows = await listActivityRecords("activity-rates", {
      limit: 500,
      activityId: showActivityList ? undefined : activityId || undefined,
    });
    return new Set(
      rows
        .map((row) => String(row.code ?? "").trim().toUpperCase())
        .filter((value) => value.length > 0)
    );
  }, [activityId, showActivityList]);

  const resourceTabs = showActivityList
    ? (["activities"] as ActivityResourceKey[])
    : (["activity-rates", "activity-availability", "activity-supplements"] as ActivityResourceKey[]);

  const selectedActivityLabel = !showActivityList
    ? `${selectedActivity?.code ?? ""} ${selectedActivity?.name ?? ""}`.trim()
    : "";

  return {
    resource,
    setResource,
    query,
    setQuery,
    records,
    pagedRecords,
    loading,
    saving,
    activities,
    locations,
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
    activityExistingCodes,
    locationByCode,
    activityByCode,
    fields,
    refreshAll,
    openDialog,
    onSubmit,
    onDelete,
    refreshActivityExistingCodes,
    refreshActivityRateExistingCodes,
    resourceTabs,
    selectedActivity,
    selectedActivityLabel,
    activityMeta: ACTIVITY_META[resource],
  };
}
