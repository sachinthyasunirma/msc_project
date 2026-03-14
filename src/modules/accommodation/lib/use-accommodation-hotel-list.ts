"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  accommodationKeys,
  buildHotelListParams,
} from "@/modules/accommodation/lib/accommodation-query";
import {
  getInitialHotelForm,
  type HotelFormState,
} from "@/modules/accommodation/lib/accommodation-view-helpers";
import { useAccommodationFormDialog } from "@/modules/accommodation/lib/use-accommodation-form-dialog";
import { createHotelSchema } from "@/modules/accommodation/shared/accommodation-schemas";

type HotelFilters = {
  isActive: string;
  city: string;
  country: string;
};

const DEFAULT_HOTEL_FILTERS: HotelFilters = {
  isActive: "all",
  city: "",
  country: "",
};
const EMPTY_HOTELS: Hotel[] = [];

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
  const queryClient = useQueryClient();
  const [batchOpen, setBatchOpen] = useState(false);
  const [hotelSearch, setHotelSearch] = useState("");
  const [debouncedHotelSearch, setDebouncedHotelSearch] = useState("");
  const [hotelFilters, setHotelFilters] = useState<HotelFilters>(DEFAULT_HOTEL_FILTERS);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(
    initialData?.items[0]?.id ?? null
  );

  const hotelDialog = useAccommodationFormDialog<HotelFormState, Hotel>((row) =>
    getInitialHotelForm(row ?? null)
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedHotelSearch(hotelSearch), 300);
    return () => clearTimeout(timer);
  }, [hotelSearch]);

  useEffect(() => {
    setCursorHistory([null]);
    setPageIndex(0);
  }, [debouncedHotelSearch, hotelFilters.city, hotelFilters.country, hotelFilters.isActive]);

  const activeCursor = cursorHistory[pageIndex] ?? null;
  const isDefaultQuery =
    debouncedHotelSearch.length === 0 &&
    hotelFilters.isActive === DEFAULT_HOTEL_FILTERS.isActive &&
    hotelFilters.city === DEFAULT_HOTEL_FILTERS.city &&
    hotelFilters.country === DEFAULT_HOTEL_FILTERS.country &&
    pageIndex === 0 &&
    cursorHistory[0] === null;

  const hotelListInput = useMemo(
    () => ({
      q: debouncedHotelSearch || undefined,
      isActive: hotelFilters.isActive,
      city: hotelFilters.city || undefined,
      country: hotelFilters.country || undefined,
      cursor: activeCursor,
      limit: 15,
    }),
    [activeCursor, debouncedHotelSearch, hotelFilters.city, hotelFilters.country, hotelFilters.isActive]
  );

  const {
    data: hotelListData,
    error: hotelListError,
    isFetching: loadingHotels,
    refetch: refetchHotels,
  } = useQuery({
    queryKey: accommodationKeys.hotelList(hotelListInput),
    queryFn: () => listHotels(buildHotelListParams(hotelListInput)),
    initialData: isDefaultQuery ? initialData ?? undefined : undefined,
    placeholderData: keepPreviousData,
  });

  const createHotelMutation = useMutation({
    mutationFn: createHotel,
  });
  const updateHotelMutation = useMutation({
    mutationFn: ({ hotelId, payload }: { hotelId: string; payload: unknown }) =>
      updateHotel(hotelId, payload),
  });
  const deleteHotelMutation = useMutation({
    mutationFn: deleteHotel,
  });

  const hotels = hotelListData?.items ?? EMPTY_HOTELS;
  const hasNext = hotelListData?.hasNext ?? false;
  const nextCursor = hotelListData?.nextCursor ?? null;
  const saving =
    createHotelMutation.isPending ||
    updateHotelMutation.isPending ||
    deleteHotelMutation.isPending;

  const hotelExistingCodes = useMemo(
    () =>
      new Set(
        hotels
          .map((hotel) => String(hotel.code ?? "").trim().toUpperCase())
          .filter((value) => value.length > 0)
      ),
    [hotels]
  );

  useEffect(() => {
    if (!hotelListError) return;
    notify.error(hotelListError instanceof Error ? hotelListError.message : "Failed to load hotels.");
  }, [hotelListError]);

  useEffect(() => {
    if (hotels.length === 0) {
      setSelectedHotelId(null);
      return;
    }

    setSelectedHotelId((current) =>
      current && hotels.some((hotel) => hotel.id === current) ? current : (hotels[0]?.id ?? null)
    );
  }, [hotels]);

  const refreshHotelQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: accommodationKeys.hotels() }),
      queryClient.invalidateQueries({ queryKey: accommodationKeys.hotelCodes() }),
    ]);
    await refetchHotels();
  }, [queryClient, refetchHotels]);

  const loadHotels = useCallback(async () => {
    await refetchHotels();
  }, [refetchHotels]);

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

    try {
      if (hotelDialog.dialog.mode === "create") {
        const created = await createHotelMutation.mutateAsync(parsed.data);
        notify.success("Hotel created.");
        setSelectedHotelId(created.id);
      } else if (hotelDialog.dialog.row) {
        await updateHotelMutation.mutateAsync({
          hotelId: hotelDialog.dialog.row.id,
          payload: parsed.data,
        });
        notify.success("Hotel updated.");
      }

      hotelDialog.closeDialog();
      await refreshHotelQueries();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save hotel.");
    }
  }, [createHotelMutation, hotelDialog, refreshHotelQueries, updateHotelMutation]);

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

      try {
        await deleteHotelMutation.mutateAsync(hotel.id);
        notify.success("Hotel deleted.");
        setSelectedHotelId((current) => (current === hotel.id ? null : current));
        await refreshHotelQueries();
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to delete hotel.");
      }
    },
    [confirm, deleteHotelMutation, refreshHotelQueries]
  );

  const refreshHotelExistingCodes = useCallback(async () => {
    const codes = new Set<string>();
    let cursor: string | null = null;
    let keepLoading = true;
    let pageSafety = 0;

    while (keepLoading && pageSafety < 100) {
      const response = await listHotels(
        buildHotelListParams({
          cursor,
          limit: 100,
        })
      );

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
    setPageIndex((current) => (current > 0 ? current - 1 : current));
  }, []);

  const goNextPage = useCallback(() => {
    if (!nextCursor) return;
    setCursorHistory((current) => [...current.slice(0, pageIndex + 1), nextCursor]);
    setPageIndex((current) => current + 1);
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
