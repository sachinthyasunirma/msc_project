"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
import {
  createHotel,
  deleteHotel,
  listHotels,
  updateHotel,
  type Hotel,
} from "@/modules/accommodation/lib/accommodation-api";
import {
  getInitialHotelForm,
  type HotelFormState,
} from "@/modules/accommodation/lib/accommodation-view-helpers";
import { useAccommodationFormDialog } from "@/modules/accommodation/lib/use-accommodation-form-dialog";
import { createHotelSchema } from "@/modules/accommodation/shared/accommodation-schemas";

type HotelFilters = { isActive: string; city: string; country: string };
const DEFAULT_HOTEL_FILTERS: HotelFilters = { isActive: "all", city: "", country: "" };

export type AccommodationHotelListData = {
  items: Hotel[];
  nextCursor: string | null;
  hasNext: boolean;
  limit: number;
};

type UseAccommodationHotelListOptions = {
  isReadOnly: boolean;
  initialData?: AccommodationHotelListData | null;
};

export function useAccommodationHotelList({
  isReadOnly,
  initialData = null,
}: UseAccommodationHotelListOptions) {
  const confirm = useConfirm();
  const skipInitialLoadRef = useRef(Boolean(initialData));
  const [loadingHotels, setLoadingHotels] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [hotelSearch, setHotelSearch] = useState("");
  const [debouncedHotelSearch, setDebouncedHotelSearch] = useState("");
  const [hotelFilters, setHotelFilters] = useState<HotelFilters>(DEFAULT_HOTEL_FILTERS);
  const [hotels, setHotels] = useState<Hotel[]>(initialData?.items ?? []);
  const [hasNext, setHasNext] = useState(initialData?.hasNext ?? false);
  const [nextCursor, setNextCursor] = useState<string | null>(initialData?.nextCursor ?? null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(
    initialData?.items[0]?.id ?? null
  );

  const hotelDialog = useAccommodationFormDialog<HotelFormState, Hotel>((row) =>
    getInitialHotelForm(row ?? null)
  );

  const hotelExistingCodes = useMemo(
    () =>
      new Set(
        hotels
          .map((hotel) => String(hotel.code ?? "").trim().toUpperCase())
          .filter((value) => value.length > 0)
      ),
    [hotels]
  );

  const loadHotels = useCallback(async () => {
    setLoadingHotels(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "15");
      if (debouncedHotelSearch) params.set("q", debouncedHotelSearch);
      if (hotelFilters.isActive !== "all") params.set("isActive", hotelFilters.isActive);
      if (hotelFilters.city) params.set("city", hotelFilters.city);
      if (hotelFilters.country) params.set("country", hotelFilters.country);

      const activeCursor = cursorHistory[pageIndex];
      if (activeCursor) params.set("cursor", activeCursor);

      const result = await listHotels(params);
      setHotels(result.items);
      setHasNext(result.hasNext);
      setNextCursor(result.nextCursor);
      setSelectedHotelId((prev) => prev ?? result.items[0]?.id ?? null);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load hotels.");
    } finally {
      setLoadingHotels(false);
    }
  }, [cursorHistory, debouncedHotelSearch, hotelFilters.city, hotelFilters.country, hotelFilters.isActive, pageIndex]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedHotelSearch(hotelSearch), 300);
    return () => clearTimeout(timer);
  }, [hotelSearch]);

  useEffect(() => {
    setCursorHistory([null]);
    setPageIndex(0);
  }, [debouncedHotelSearch, hotelFilters.city, hotelFilters.country, hotelFilters.isActive]);

  const isDefaultQuery =
    debouncedHotelSearch.length === 0 &&
    hotelFilters.isActive === DEFAULT_HOTEL_FILTERS.isActive &&
    hotelFilters.city === DEFAULT_HOTEL_FILTERS.city &&
    hotelFilters.country === DEFAULT_HOTEL_FILTERS.country &&
    pageIndex === 0 &&
    cursorHistory[0] === null;

  useEffect(() => {
    if (skipInitialLoadRef.current && isDefaultQuery) {
      skipInitialLoadRef.current = false;
      return;
    }
    void loadHotels();
  }, [isDefaultQuery, loadHotels]);

  const withSave = useCallback(async (callback: () => Promise<void>) => {
    try {
      setSaving(true);
      await callback();
    } finally {
      setSaving(false);
    }
  }, []);

  const openHotelDialog = useCallback(
    (mode: "create" | "edit", row: Hotel | null = null) => {
      if (mode === "create" && isReadOnly) {
        notify.warning("View only mode: adding records is disabled.");
        return;
      }
      hotelDialog.openDialog(mode, row);
    },
    [hotelDialog, isReadOnly]
  );

  const submitHotel = useCallback(async () => {
    const parsed = createHotelSchema.safeParse({
      ...hotelDialog.form,
      description: hotelDialog.form.description || null,
      contactEmail: hotelDialog.form.contactEmail || null,
      contactPhone: hotelDialog.form.contactPhone || null,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid hotel data.");
      return;
    }

    await withSave(async () => {
      if (hotelDialog.dialog.mode === "create") {
        const created = await createHotel(parsed.data);
        notify.success("Hotel created.");
        setSelectedHotelId(created.id);
        setHotels((prev) => [created, ...prev]);
      } else if (hotelDialog.dialog.row) {
        const updated = await updateHotel(hotelDialog.dialog.row.id, parsed.data);
        notify.success("Hotel updated.");
        setHotels((prev) => prev.map((hotel) => (hotel.id === updated.id ? updated : hotel)));
      }
      hotelDialog.closeDialog();
      await loadHotels();
    });
  }, [hotelDialog, loadHotels, withSave]);

  const deleteHotelRecord = useCallback(
    async (hotel: Hotel) => {
      const confirmed = await confirm({
        title: "Delete Record",
        description: "Delete this hotel? This action cannot be undone.",
        confirmText: "Yes",
        cancelText: "No",
        destructive: true,
      });
      if (!confirmed) return;

      await withSave(async () => {
        await deleteHotel(hotel.id);
        notify.success("Hotel deleted.");
        setHotels((prev) => prev.filter((item) => item.id !== hotel.id));
        setSelectedHotelId((prev) => (prev === hotel.id ? null : prev));
        await loadHotels();
      });
    },
    [confirm, loadHotels, withSave]
  );

  const refreshHotelExistingCodes = useCallback(async () => {
    const codes = new Set<string>();
    let cursor: string | null = null;
    let keepLoading = true;
    let pageSafety = 0;

    while (keepLoading && pageSafety < 100) {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (cursor) params.set("cursor", cursor);
      const response = await listHotels(params);
      response.items.forEach((hotel) => {
        const code = String(hotel.code ?? "").trim().toUpperCase();
        if (code) codes.add(code);
      });
      keepLoading = response.hasNext && Boolean(response.nextCursor);
      cursor = response.nextCursor;
      pageSafety += 1;
    }

    return codes;
  }, []);

  const goPreviousPage = useCallback(() => {
    setPageIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const goNextPage = useCallback(() => {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev.slice(0, pageIndex + 1), nextCursor]);
    setPageIndex((prev) => prev + 1);
  }, [nextCursor, pageIndex]);

  return {
    loadingHotels,
    saving,
    batchOpen,
    setBatchOpen,
    hotels,
    selectedHotelId,
    setSelectedHotelId,
    hotelSearch,
    setHotelSearch,
    hotelFilters,
    setHotelFilters,
    pageIndex,
    hasNext,
    nextCursor,
    loadHotels,
    openHotelDialog,
    deleteHotelRecord,
    submitHotel,
    goPreviousPage,
    goNextPage,
    hotelDialog,
    hotelExistingCodes,
    refreshHotelExistingCodes,
  };
}
