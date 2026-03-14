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
  createSeason,
  deleteSeason,
  listSeasons,
  type SeasonListResponse,
  type SeasonOption,
  updateSeason,
} from "@/modules/season/lib/season-api";
import { seasonKeys } from "@/modules/season/lib/season-query";
import { createSeasonSchema } from "@/modules/season/shared/season-schemas";

type UseSeasonManagementOptions = {
  isReadOnly: boolean;
  initialData?: SeasonListResponse | null;
};

type Mode = "create" | "edit";

const PAGE_SIZE = 20;
const EMPTY_SEASONS: SeasonOption[] = [];

export function useSeasonManagement({
  isReadOnly,
  initialData = null,
}: UseSeasonManagementOptions) {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [startDateTo, setStartDateTo] = useState("");
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: Mode;
    row: SeasonOption | null;
  }>({ open: false, mode: "create", row: null });
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setCursorHistory([null]);
    setPageIndex(0);
  }, [debouncedSearch, startDateFrom, startDateTo]);

  const activeCursor = cursorHistory[pageIndex] ?? null;
  const filters = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      startDateFrom: startDateFrom || undefined,
      startDateTo: startDateTo || undefined,
      cursor: activeCursor,
      limit: PAGE_SIZE,
    }),
    [activeCursor, debouncedSearch, startDateFrom, startDateTo]
  );

  const isDefaultQuery =
    debouncedSearch.length === 0 &&
    startDateFrom.length === 0 &&
    startDateTo.length === 0 &&
    pageIndex === 0 &&
    cursorHistory[0] === null;

  const {
    data: seasonListData,
    error: seasonListError,
    isFetching: loading,
    refetch: refetchSeasons,
  } = useQuery({
    queryKey: seasonKeys.list(filters),
    queryFn: () => listSeasons(filters),
    initialData: isDefaultQuery ? initialData ?? undefined : undefined,
    placeholderData: keepPreviousData,
  });

  const createSeasonMutation = useMutation({
    mutationFn: createSeason,
  });
  const updateSeasonMutation = useMutation({
    mutationFn: ({ seasonId, payload }: { seasonId: string; payload: unknown }) =>
      updateSeason(seasonId, payload),
  });
  const deleteSeasonMutation = useMutation({
    mutationFn: deleteSeason,
  });

  const seasons = seasonListData?.items ?? EMPTY_SEASONS;
  const hasNext = seasonListData?.hasNext ?? false;
  const nextCursor = seasonListData?.nextCursor ?? null;
  const saving =
    createSeasonMutation.isPending ||
    updateSeasonMutation.isPending ||
    deleteSeasonMutation.isPending;

  useEffect(() => {
    if (!seasonListError) return;
    notify.error(seasonListError instanceof Error ? seasonListError.message : "Failed to load seasons.");
  }, [seasonListError]);

  const load = useCallback(async () => {
    await refetchSeasons();
  }, [refetchSeasons]);

  const refreshAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: seasonKeys.lists() });
    await refetchSeasons();
  }, [queryClient, refetchSeasons]);

  const resetToFirstPage = useCallback(() => {
    setCursorHistory([null]);
    setPageIndex(0);
  }, []);

  const openDialog = useCallback(
    (mode: Mode, row: SeasonOption | null = null) => {
      if (mode === "create" && isReadOnly) {
        notify.warning("View only mode: adding records is disabled.");
        return;
      }
      setDialog({ open: true, mode, row });
      setForm({
        code: row?.code ?? "",
        name: row?.name ?? "",
        description: row?.description ?? "",
        startDate: row?.startDate ?? "",
        endDate: row?.endDate ?? "",
      });
    },
    [isReadOnly]
  );

  const submit = useCallback(async () => {
    if (dialog.mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }

    const parsed = createSeasonSchema.safeParse({
      ...form,
      description: form.description || null,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid season data.");
      return;
    }

    try {
      if (dialog.mode === "create") {
        await createSeasonMutation.mutateAsync(parsed.data);
        notify.success("Season created.");
      } else if (dialog.row) {
        await updateSeasonMutation.mutateAsync({
          seasonId: dialog.row.id,
          payload: parsed.data,
        });
        notify.success("Season updated.");
      }

      setDialog({ open: false, mode: "create", row: null });
      if (pageIndex === 0) {
        await refreshAll();
      } else {
        resetToFirstPage();
      }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Request failed.");
    }
  }, [
    createSeasonMutation,
    dialog.mode,
    dialog.row,
    form,
    isReadOnly,
    pageIndex,
    refreshAll,
    resetToFirstPage,
    updateSeasonMutation,
  ]);

  const remove = useCallback(
    async (season: SeasonOption) => {
      const confirmed = await confirm({
        title: "Delete Season",
        description: `Delete season "${season.name}"? This action cannot be undone.`,
        confirmText: "Yes",
        cancelText: "No",
        destructive: true,
      });
      if (!confirmed) return;

      try {
        await deleteSeasonMutation.mutateAsync(season.id);
        notify.success("Season deleted.");
        if (pageIndex === 0) {
          await refreshAll();
        } else {
          resetToFirstPage();
        }
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Delete failed.");
      }
    },
    [confirm, deleteSeasonMutation, pageIndex, refreshAll, resetToFirstPage]
  );

  const nextPage = useCallback(() => {
    if (!nextCursor) return;
    setCursorHistory((current) => [...current.slice(0, pageIndex + 1), nextCursor]);
    setPageIndex((current) => current + 1);
  }, [nextCursor, pageIndex]);

  const previousPage = useCallback(() => {
    if (pageIndex === 0) return;
    setPageIndex((current) => current - 1);
  }, [pageIndex]);

  return {
    seasons,
    loading,
    saving,
    search,
    setSearch,
    startDateFrom,
    setStartDateFrom,
    startDateTo,
    setStartDateTo,
    hasNext,
    nextCursor,
    pageIndex,
    dialog,
    setDialog,
    form,
    setForm,
    load,
    openDialog,
    submit,
    remove,
    nextPage,
    previousPage,
  };
}
