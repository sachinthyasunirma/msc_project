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
import { listHotels } from "@/modules/accommodation/lib/accommodation-api";
import { listActivityRecords } from "@/modules/activity/lib/activity-api";
import { listBusinessNetworkRecords } from "@/modules/business-network/lib/business-network-api";
import { listCompanyUsersLookup } from "@/modules/dashboard/lib/company-users-api";
import { listGuideRecords } from "@/modules/guides/lib/guides-api";
import {
  buildTechnicalVisitRecordsParams,
  technicalVisitKeys,
} from "@/modules/technical-visit/lib/technical-visit-query";
import {
  createTechnicalVisitRecord,
  deleteTechnicalVisitRecord,
  listTechnicalVisitRecords,
  updateTechnicalVisitRecord,
} from "@/modules/technical-visit/lib/technical-visit-api";
import type {
  TechnicalVisitLookupHotel,
  TechnicalVisitManagementInitialData,
} from "@/modules/technical-visit/shared/technical-visit-management-types";
import type { TechnicalVisitResourceKey } from "@/modules/technical-visit/shared/technical-visit-schemas";
import { listTransportRecords } from "@/modules/transport/lib/transport-api";

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

type UseTechnicalVisitManagementOptions = {
  initialResource?: TechnicalVisitResourceKey;
  initialData?: TechnicalVisitManagementInitialData | null;
  isReadOnly: boolean;
};

const EMPTY_ROWS: Row[] = [];
const EMPTY_HOTELS: TechnicalVisitLookupHotel[] = [];

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

export function useTechnicalVisitManagement({
  initialResource = "technical-visits",
  initialData = null,
  isReadOnly,
}: UseTechnicalVisitManagementOptions) {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [resource, setResource] = useState<TechnicalVisitResourceKey>(initialResource);
  const [query, setQuery] = useState("");
  const [selectedVisitId, setSelectedVisitId] = useState(initialData?.selectedVisitId ?? "");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    row: Row | null;
  }>({ open: false, mode: "create", row: null });
  const [form, setForm] = useState<Row>({});

  useEffect(() => {
    setResource(initialResource);
  }, [initialResource]);

  const lookupsInitialData = initialData
    ? {
        visits: initialData.visits,
        guides: initialData.guides,
        activities: initialData.activities,
        vehicleTypes: initialData.vehicleTypes,
        hotels: initialData.hotels,
        restaurants: initialData.restaurants,
        users: initialData.users,
      }
    : undefined;

  const recordsInput = useMemo(
    () =>
      buildTechnicalVisitRecordsParams({
        resource,
        q: query || undefined,
        limit: 500,
        visitId: resource === "technical-visits" ? undefined : selectedVisitId || undefined,
      }),
    [query, resource, selectedVisitId]
  );

  const isDefaultRecordsQuery =
    resource === initialResource &&
    query.length === 0 &&
    selectedVisitId === (initialData?.selectedVisitId ?? "");

  const {
    data: lookupsData,
    error: lookupsError,
    isFetching: lookupsLoading,
    refetch: refetchLookups,
  } = useQuery({
    queryKey: technicalVisitKeys.lookups(),
    queryFn: async () => {
      const [
        visits,
        guides,
        activities,
        vehicleTypes,
        hotelResponse,
        organizations,
        users,
      ] = await Promise.all([
        listTechnicalVisitRecords("technical-visits", { limit: 500 }),
        listGuideRecords("guides", { limit: 300 }),
        listActivityRecords("activities", { limit: 300 }),
        listTransportRecords("vehicle-types", { limit: 300 }),
        listHotels(new URLSearchParams({ limit: "200" })),
        listBusinessNetworkRecords("organizations", { limit: 400 }),
        listCompanyUsersLookup(),
      ]);

      return {
        visits,
        guides,
        activities,
        vehicleTypes,
        hotels: hotelResponse.items.map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
        })),
        restaurants: organizations.filter((row) => {
          const type = String(row.type || "");
          return type === "SUPPLIER" || type === "RESTAURANT";
        }),
        users,
      };
    },
    initialData: lookupsInitialData,
  });

  const {
    data: rows = EMPTY_ROWS,
    error: recordsError,
    isFetching: recordsLoading,
    refetch: refetchRecords,
  } = useQuery({
    queryKey: technicalVisitKeys.records({
      resource,
      q: recordsInput.q,
      limit: recordsInput.limit,
      visitId: recordsInput.visitId,
    }),
    queryFn: () => listTechnicalVisitRecords(resource, recordsInput),
    initialData: isDefaultRecordsQuery ? initialData?.rows ?? undefined : undefined,
    placeholderData: keepPreviousData,
    enabled: resource === "technical-visits" || Boolean(selectedVisitId),
  });

  const createMutation = useMutation({
    mutationFn: ({ targetResource, payload }: { targetResource: TechnicalVisitResourceKey; payload: Record<string, unknown> }) =>
      createTechnicalVisitRecord(targetResource, payload),
  });
  const updateMutation = useMutation({
    mutationFn: ({
      targetResource,
      id,
      payload,
    }: {
      targetResource: TechnicalVisitResourceKey;
      id: string;
      payload: Record<string, unknown>;
    }) => updateTechnicalVisitRecord(targetResource, id, payload),
  });
  const deleteMutation = useMutation({
    mutationFn: ({ targetResource, id }: { targetResource: TechnicalVisitResourceKey; id: string }) =>
      deleteTechnicalVisitRecord(targetResource, id),
  });

  const visits = lookupsData?.visits ?? EMPTY_ROWS;
  const guides = lookupsData?.guides ?? EMPTY_ROWS;
  const activities = lookupsData?.activities ?? EMPTY_ROWS;
  const vehicleTypes = lookupsData?.vehicleTypes ?? EMPTY_ROWS;
  const hotels = lookupsData?.hotels ?? EMPTY_HOTELS;
  const restaurants = lookupsData?.restaurants ?? EMPTY_ROWS;
  const users = lookupsData?.users ?? EMPTY_ROWS;
  const loading = lookupsLoading || recordsLoading;
  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  useEffect(() => {
    if (!lookupsError) return;
    notify.error(lookupsError instanceof Error ? lookupsError.message : "Failed to load lookup data.");
  }, [lookupsError]);

  useEffect(() => {
    if (!recordsError) return;
    notify.error(recordsError instanceof Error ? recordsError.message : "Failed to load records.");
  }, [recordsError]);

  const visitOptions = useMemo(
    () =>
      visits.map((row) => ({
        value: String(row.id),
        label: `${String(row.code)} - ${String(row.visitType)} - ${new Date(
          String(row.visitDate)
        ).toLocaleDateString()}`,
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
  }, [referenceOptions, userOptions, visitOptions]);

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
          { key: "referenceId", label: "Reference", type: "select", required: true, options: referenceOptions },
          { key: "visitDate", label: "Visit Date", type: "datetime", required: true },
          { key: "visitedByUserId", label: "Visited By", type: "select", required: true, options: userOptions },
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
          { key: "followUpRequired", label: "Follow Up Required", type: "boolean", defaultValue: false },
          { key: "nextVisitDate", label: "Next Visit Date", type: "datetime", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "technical-visit-checklists":
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "visitId", label: "Visit", type: "select", required: true, options: visitOptions },
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
          { key: "visitId", label: "Visit", type: "select", required: true, options: visitOptions },
          { key: "fileUrl", label: "File URL", type: "text", required: true },
          { key: "caption", label: "Caption", type: "text", nullable: true },
          { key: "isActive", label: "Active", type: "boolean", defaultValue: true },
        ];
      case "technical-visit-actions":
      default:
        return [
          { key: "code", label: "Code", type: "text", required: true },
          { key: "visitId", label: "Visit", type: "select", required: true, options: visitOptions },
          { key: "action", label: "Action", type: "text", required: true },
          { key: "assignedToUserId", label: "Assigned To", type: "select", nullable: true, options: userOptions },
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

  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: technicalVisitKeys.lookups() }),
      queryClient.invalidateQueries({ queryKey: technicalVisitKeys.recordsRoot() }),
    ]);
    await Promise.all([refetchLookups(), refetchRecords()]);
  }, [queryClient, refetchLookups, refetchRecords]);

  const openDialog = useCallback(
    (mode: "create" | "edit", row?: Row) => {
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
    },
    [fields, isReadOnly, resource, selectedVisitId]
  );

  const onSave = useCallback(async () => {
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

        if (field.type === "number") payload[field.key] = value === "" ? null : Number(value);
        else if (field.type === "datetime") payload[field.key] = toIsoDateTime(value);
        else if (field.type === "boolean") payload[field.key] = Boolean(value);
        else if (field.key === "code" && typeof value === "string") payload[field.key] = value.trim().toUpperCase();
        else payload[field.key] = value;
      }

      if (resource !== "technical-visits" && selectedVisitId) {
        payload.visitId = payload.visitId ?? selectedVisitId;
      }

      if (dialog.mode === "create") {
        await createMutation.mutateAsync({ targetResource: resource, payload });
        notify.success("Record created.");
      } else if (dialog.row?.id) {
        await updateMutation.mutateAsync({
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
  }, [createMutation, dialog.mode, dialog.row, fields, form, refreshAll, resource, selectedVisitId, updateMutation]);

  const onDelete = useCallback(
    async (row: Row) => {
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
        await deleteMutation.mutateAsync({
          targetResource: resource,
          id: String(row.id),
        });
        notify.success("Record deleted.");
        await refreshAll();
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to delete record.");
      }
    },
    [confirm, deleteMutation, isReadOnly, refreshAll, resource]
  );

  return {
    currentVisitType,
    dialog,
    fields,
    form,
    loading,
    lookups,
    onDelete,
    onSave,
    openDialog,
    page,
    pageSize,
    rows,
    refreshAll,
    referenceOptions,
    resource,
    saving,
    selectedVisitId,
    setDialog,
    setForm,
    setPage,
    setPageSize,
    setQuery,
    setResource,
    setSelectedVisitId,
    query,
    userOptions,
    visibleRows,
    visitOptions,
  };
}
