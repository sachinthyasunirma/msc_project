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
  buildTourCategoryRecordsParams,
  tourCategoryKeys,
} from "@/modules/tour-category/lib/tour-category-query";
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

type UseTourCategoryManagementOptions = {
  initialResource?: TourCategoryResourceKey;
  initialData?: TourCategoryManagementInitialData | null;
  isReadOnly: boolean;
};

const EMPTY_ROWS: Array<Record<string, unknown>> = [];

function defaultValue(field: Field) {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === "boolean") return true;
  return "";
}

function toOptionalNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function useTourCategoryManagement({
  initialResource = "tour-category-types",
  initialData = null,
  isReadOnly,
}: UseTourCategoryManagementOptions) {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [resource, setResource] = useState<TourCategoryResourceKey>(initialResource);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    row: Record<string, unknown> | null;
  }>({ open: false, mode: "create", row: null });
  const [form, setForm] = useState<Record<string, unknown>>({});

  useEffect(() => {
    setResource(initialResource);
  }, [initialResource]);

  const lookupsInitialData = initialData
    ? {
        types: initialData.types,
        categories: initialData.categories,
      }
    : undefined;

  const recordsInput = useMemo(
    () =>
      buildTourCategoryRecordsParams({
        resource,
        q: query || undefined,
        limit: 500,
      }),
    [query, resource]
  );

  const isDefaultRecordsQuery = resource === initialResource && query.length === 0;

  const {
    data: lookupsData,
    error: lookupsError,
    isFetching: lookupsLoading,
    refetch: refetchLookups,
  } = useQuery({
    queryKey: tourCategoryKeys.lookups(),
    queryFn: async () => {
      const [types, categories] = await Promise.all([
        listTourCategoryRecords("tour-category-types", { limit: 500 }),
        listTourCategoryRecords("tour-categories", { limit: 500 }),
      ]);
      return { types, categories };
    },
    initialData: lookupsInitialData,
  });

  const {
    data: records = EMPTY_ROWS,
    error: recordsError,
    isFetching: recordsLoading,
    refetch: refetchRecords,
  } = useQuery({
    queryKey: tourCategoryKeys.records({
      resource,
      q: recordsInput.q,
      limit: recordsInput.limit,
    }),
    queryFn: () => listTourCategoryRecords(resource, recordsInput),
    initialData: isDefaultRecordsQuery ? initialData?.records ?? undefined : undefined,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: ({ targetResource, payload }: { targetResource: TourCategoryResourceKey; payload: Record<string, unknown> }) =>
      createTourCategoryRecord(targetResource, payload),
  });
  const updateMutation = useMutation({
    mutationFn: ({
      targetResource,
      id,
      payload,
    }: {
      targetResource: TourCategoryResourceKey;
      id: string;
      payload: Record<string, unknown>;
    }) => updateTourCategoryRecord(targetResource, id, payload),
  });
  const deleteMutation = useMutation({
    mutationFn: ({ targetResource, id }: { targetResource: TourCategoryResourceKey; id: string }) =>
      deleteTourCategoryRecord(targetResource, id),
  });

  const types = lookupsData?.types ?? EMPTY_ROWS;
  const categories = lookupsData?.categories ?? EMPTY_ROWS;
  const loading = lookupsLoading || recordsLoading;
  const saving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  useEffect(() => {
    if (!lookupsError) return;
    notify.error(
      lookupsError instanceof Error ? lookupsError.message : "Failed to load tour category lookups."
    );
  }, [lookupsError]);

  useEffect(() => {
    if (!recordsError) return;
    notify.error(recordsError instanceof Error ? recordsError.message : "Failed to load records.");
  }, [recordsError]);

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
          { key: "parentId", label: "Parent", type: "select", nullable: true, options: [] },
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
          { key: "defaultMarkupPercent", label: "Default Markup %", type: "number", nullable: true },
          { key: "restrictHotelStarMin", label: "Hotel Star Min", type: "number", nullable: true },
          { key: "restrictHotelStarMax", label: "Hotel Star Max", type: "number", nullable: true },
          { key: "requireCertifiedGuide", label: "Require Certified Guide", type: "boolean", defaultValue: false },
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

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(records.length / pageSize)),
    [pageSize, records.length]
  );

  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [currentPage, pageSize, records]);

  useEffect(() => {
    setCurrentPage(1);
  }, [resource, query, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: tourCategoryKeys.lookups() }),
      queryClient.invalidateQueries({ queryKey: tourCategoryKeys.recordsRoot() }),
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
        next[field.key] =
          mode === "edit" && row ? row[field.key] ?? defaultValue(field) : defaultValue(field);
      });
      setForm(next);
      setDialog({ open: true, mode, row: row ?? null });
    },
    [fields, isReadOnly]
  );

  const onSave = useCallback(async () => {
    try {
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
        else if (field.key === "code" && typeof value === "string") payload[field.key] = value.toUpperCase().trim();
        else if (typeof value === "string") payload[field.key] = value.trim();
        else payload[field.key] = value;
      });

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
  }, [createMutation, dialog.mode, dialog.row, fields, form, refreshAll, resource, updateMutation]);

  const onDelete = useCallback(
    async (row: Record<string, unknown>) => {
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
    categories,
    currentPage,
    dialog,
    fields,
    form,
    loading,
    lookups,
    onDelete,
    onSave,
    openDialog,
    pageSize,
    pagedRecords,
    parentCategoryOptions,
    query,
    records,
    refreshAll,
    resource,
    saving,
    setCurrentPage,
    setDialog,
    setForm,
    setPageSize,
    setQuery,
    setResource,
  };
}
