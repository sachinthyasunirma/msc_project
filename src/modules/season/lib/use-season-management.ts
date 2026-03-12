"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
import {
  createSeason,
  deleteSeason,
  listSeasons,
  type SeasonOption,
  updateSeason,
} from "@/modules/season/lib/season-api";
import { createSeasonSchema } from "@/modules/season/shared/season-schemas";

type UseSeasonManagementOptions = {
  isReadOnly: boolean;
  initialData?: SeasonListResponse | null;
};

type Mode = "create" | "edit";

const PAGE_SIZE = 20;

export function useSeasonManagement({
  isReadOnly,
  initialData = null,
}: UseSeasonManagementOptions) {
  const confirm = useConfirm();
  const skipInitialLoadRef = useRef(Boolean(initialData));
  const [seasons, setSeasons] = useState<SeasonOption[]>(initialData?.items ?? []);
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [startDateTo, setStartDateTo] = useState("");
  const [hasNext, setHasNext] = useState(initialData?.hasNext ?? false);
  const [nextCursor, setNextCursor] = useState<string | null>(initialData?.nextCursor ?? null);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const activeCursor = cursorHistory[pageIndex];
      const data = await listSeasons({
        q: debouncedSearch || undefined,
        startDateFrom: startDateFrom || undefined,
        startDateTo: startDateTo || undefined,
        cursor: activeCursor,
        limit: PAGE_SIZE,
      });
      setSeasons(data.items);
      setHasNext(data.hasNext);
      setNextCursor(data.nextCursor);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load seasons.");
    } finally {
      setLoading(false);
    }
  }, [cursorHistory, debouncedSearch, pageIndex, startDateFrom, startDateTo]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setCursorHistory([null]);
    setPageIndex(0);
  }, [debouncedSearch, startDateFrom, startDateTo]);

  useEffect(() => {
    const isDefaultQuery =
      debouncedSearch.length === 0 &&
      startDateFrom.length === 0 &&
      startDateTo.length === 0 &&
      pageIndex === 0 &&
      cursorHistory[0] === null;
    if (skipInitialLoadRef.current && isDefaultQuery) {
      skipInitialLoadRef.current = false;
      return;
    }
    void load();
  }, [cursorHistory, debouncedSearch, load, pageIndex, startDateFrom, startDateTo]);

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

    setSaving(true);
    try {
      if (dialog.mode === "create") {
        await createSeason(parsed.data);
        notify.success("Season created.");
      } else if (dialog.row) {
        await updateSeason(dialog.row.id, parsed.data);
        notify.success("Season updated.");
      }
      setDialog({ open: false, mode: "create", row: null });
      if (pageIndex === 0) await load();
      else {
        setCursorHistory([null]);
        setPageIndex(0);
      }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  }, [dialog.mode, dialog.row, form, isReadOnly, load, pageIndex]);

  const remove = useCallback(async (season: SeasonOption) => {
    const confirmed = await confirm({
      title: "Delete Season",
      description: `Delete season "${season.name}"? This action cannot be undone.`,
      confirmText: "Yes",
      cancelText: "No",
      destructive: true,
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      await deleteSeason(season.id);
      notify.success("Season deleted.");
      if (pageIndex === 0) await load();
      else {
        setCursorHistory([null]);
        setPageIndex(0);
      }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  }, [confirm, load, pageIndex]);

  const nextPage = useCallback(() => {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev.slice(0, pageIndex + 1), nextCursor]);
    setPageIndex((prev) => prev + 1);
  }, [nextCursor, pageIndex]);

  const previousPage = useCallback(() => {
    if (pageIndex === 0) return;
    setPageIndex((prev) => prev - 1);
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
