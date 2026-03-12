"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
import {
  createRoomRate,
  createRoomRateHeader,
  deleteRoomRate,
  deleteRoomRateHeader,
  listRoomRateHeaders,
  listRoomRates,
  updateRoomRate,
  updateRoomRateHeader,
  type RoomRate,
  type RoomRateHeader,
  type RoomType,
} from "@/modules/accommodation/lib/accommodation-api";
import {
  getInitialRoomRateForm,
  getInitialRoomRateHeaderForm,
  type RoomRateFormState,
  type RoomRateHeaderFormState,
} from "@/modules/accommodation/lib/accommodation-view-helpers";
import { useAccommodationFormDialog } from "@/modules/accommodation/lib/use-accommodation-form-dialog";
import {
  createRoomRateHeaderSchema,
  createRoomRateSchema,
} from "@/modules/accommodation/shared/accommodation-schemas";
import type {
  AccommodationRoomRatesInitialData,
  AccommodationSelectOption,
} from "@/modules/accommodation/shared/accommodation-room-rates.types";
import { listCurrencyRecords } from "@/modules/currency/lib/currency-api";
import { listSeasons, type SeasonOption } from "@/modules/season/lib/season-api";

type UseAccommodationRoomRatesTabOptions = {
  hotelId?: string;
  initialData?: AccommodationRoomRatesInitialData | null;
  isReadOnly: boolean;
  roomTypes: RoomType[];
  roomTypesLoading: boolean;
};

export function useAccommodationRoomRatesTab({
  hotelId,
  initialData = null,
  isReadOnly,
  roomTypes,
  roomTypesLoading,
}: UseAccommodationRoomRatesTabOptions) {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);
  const [currencyLoading, setCurrencyLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roomRateHeaders, setRoomRateHeaders] = useState<RoomRateHeader[]>(
    initialData?.roomRateHeaders ?? []
  );
  const [roomRates, setRoomRates] = useState<RoomRate[]>(initialData?.roomRates ?? []);
  const [seasons, setSeasons] = useState<SeasonOption[]>(initialData?.seasons ?? []);
  const [currencyOptions, setCurrencyOptions] = useState<AccommodationSelectOption[]>([]);
  const [selectedRoomRateHeaderId, setSelectedRoomRateHeaderId] = useState<string | null>(
    initialData?.roomRateHeaders[0]?.id ?? null
  );
  const [roomRateLineSearch, setRoomRateLineSearch] = useState("");
  const [roomRateLineStatusFilter, setRoomRateLineStatusFilter] = useState("all");
  const [roomRateLinePageSize, setRoomRateLinePageSize] = useState("10");
  const [roomRateLinePage, setRoomRateLinePage] = useState(1);

  const roomRateHeaderDialog = useAccommodationFormDialog<
    RoomRateHeaderFormState,
    RoomRateHeader
  >((row) => getInitialRoomRateHeaderForm(row ?? null));
  const roomRateDialog = useAccommodationFormDialog<RoomRateFormState, RoomRate>((row) =>
    getInitialRoomRateForm(row ?? null, selectedRoomRateHeaderId, roomTypes[0]?.id ?? "")
  );

  const preloadRoomRatesData = useCallback(async () => {
    if (!hotelId) {
      setRoomRateHeaders([]);
      setRoomRates([]);
      setSeasons([]);
      setSelectedRoomRateHeaderId(null);
      return;
    }

    setLoading(true);
    try {
      const [headers, rates, seasonResponse] = await Promise.all([
        listRoomRateHeaders(hotelId),
        listRoomRates(hotelId),
        listSeasons({ limit: 100 }),
      ]);
      setRoomRateHeaders(headers);
      setRoomRates(rates);
      setSeasons(seasonResponse.items);
      setSelectedRoomRateHeaderId((previous) =>
        previous && headers.some((item) => item.id === previous) ? previous : (headers[0]?.id ?? null)
      );
    } catch {
      notify.error("Failed to load room rate data.");
      setRoomRateHeaders([]);
      setRoomRates([]);
      setSeasons([]);
      setSelectedRoomRateHeaderId(null);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  const loadCurrencyOptions = useCallback(async () => {
    setCurrencyLoading(true);
    try {
      const records = await listCurrencyRecords("currencies", { limit: 200 });
      const options = records
        .filter((record) => record.isActive !== false)
        .map((record) => {
          const code = String(record.code ?? "").trim().toUpperCase();
          const name = String(record.name ?? "").trim();
          return {
            value: code,
            label: name ? `${code} - ${name}` : code,
          };
        })
        .filter((option) => option.value.length > 0);
      setCurrencyOptions(options);
    } catch {
      notify.error("Failed to load currencies.");
      setCurrencyOptions([]);
    } finally {
      setCurrencyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hotelId) {
      setRoomRateHeaders([]);
      setRoomRates([]);
      setSeasons([]);
      setSelectedRoomRateHeaderId(null);
      return;
    }

    if (initialData) {
      setRoomRateHeaders(initialData.roomRateHeaders);
      setRoomRates(initialData.roomRates);
      setSeasons(initialData.seasons);
      setSelectedRoomRateHeaderId((previous) =>
        previous && initialData.roomRateHeaders.some((item) => item.id === previous)
          ? previous
          : (initialData.roomRateHeaders[0]?.id ?? null)
      );
      return;
    }

    void preloadRoomRatesData();
  }, [hotelId, initialData, preloadRoomRatesData]);

  useEffect(() => {
    if (!hotelId) {
      setCurrencyOptions([]);
      return;
    }

    void loadCurrencyOptions();
  }, [hotelId, loadCurrencyOptions]);

  useEffect(() => {
    if (!selectedRoomRateHeaderId) {
      return;
    }

    if (roomRateHeaders.some((item) => item.id === selectedRoomRateHeaderId)) {
      return;
    }

    setSelectedRoomRateHeaderId(roomRateHeaders[0]?.id ?? null);
  }, [roomRateHeaders, selectedRoomRateHeaderId]);

  useEffect(() => {
    setRoomRateLinePage(1);
  }, [roomRateLinePageSize, roomRateLineSearch, roomRateLineStatusFilter, selectedRoomRateHeaderId]);

  const filteredRoomRates = useMemo(
    () =>
      selectedRoomRateHeaderId
        ? roomRates.filter((item) => item.roomRateHeaderId === selectedRoomRateHeaderId)
        : roomRates,
    [roomRates, selectedRoomRateHeaderId]
  );

  const visibleRoomRates = useMemo(() => {
    if (!roomRateLineSearch.trim()) {
      return filteredRoomRates;
    }

    const term = roomRateLineSearch.toLowerCase();
    return filteredRoomRates.filter((item) =>
      [item.roomCategory, item.roomTypeName, item.roomBasis, item.baseRatePerNight, item.currency]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [filteredRoomRates, roomRateLineSearch]);

  const statusFilteredRoomRates = useMemo(
    () =>
      roomRateLineStatusFilter === "all"
        ? visibleRoomRates
        : visibleRoomRates.filter((item) =>
            roomRateLineStatusFilter === "active" ? item.isActive : !item.isActive
          ),
    [roomRateLineStatusFilter, visibleRoomRates]
  );

  const roomRateLineTotalPages = useMemo(
    () => Math.max(1, Math.ceil(statusFilteredRoomRates.length / Number(roomRateLinePageSize))),
    [roomRateLinePageSize, statusFilteredRoomRates.length]
  );

  useEffect(() => {
    if (roomRateLinePage > roomRateLineTotalPages) {
      setRoomRateLinePage(roomRateLineTotalPages);
    }
  }, [roomRateLinePage, roomRateLineTotalPages]);

  const pagedRoomRates = useMemo(() => {
    const pageSize = Number(roomRateLinePageSize);
    const start = (roomRateLinePage - 1) * pageSize;
    return statusFilteredRoomRates.slice(start, start + pageSize);
  }, [roomRateLinePage, roomRateLinePageSize, statusFilteredRoomRates]);

  const selectedRoomRateHeader = useMemo(
    () => roomRateHeaders.find((item) => item.id === selectedRoomRateHeaderId) || null,
    [roomRateHeaders, selectedRoomRateHeaderId]
  );

  const roomRateHeaderOptions = useMemo<AccommodationSelectOption[]>(
    () =>
      roomRateHeaders.map((header) => ({
        value: header.id,
        label: header.name,
      })),
    [roomRateHeaders]
  );

  const roomTypeOptions = useMemo<AccommodationSelectOption[]>(
    () =>
      roomTypes.map((roomType) => ({
        value: roomType.id,
        label: roomType.name,
      })),
    [roomTypes]
  );

  const lookupLoading = loading || roomTypesLoading || currencyLoading;

  const withSave = useCallback(async (callback: () => Promise<void>) => {
    try {
      setSaving(true);
      await callback();
    } finally {
      setSaving(false);
    }
  }, []);

  const confirmDelete = useCallback(
    async (message: string, callback: () => Promise<void>) => {
      const confirmed = await confirm({
        title: "Delete Record",
        description: `${message} This action cannot be undone.`,
        confirmText: "Yes",
        cancelText: "No",
        destructive: true,
      });
      if (!confirmed) {
        return;
      }
      await withSave(callback);
    },
    [confirm, withSave]
  );

  const guardCreate = useCallback(
    (mode: "create" | "edit") => {
      if (mode === "create" && isReadOnly) {
        notify.warning("View only mode: adding records is disabled.");
        return false;
      }
      return true;
    },
    [isReadOnly]
  );

  const openRoomRateHeaderDialog = useCallback(
    (mode: "create" | "edit", row: RoomRateHeader | null = null) => {
      if (!guardCreate(mode)) {
        return;
      }
      roomRateHeaderDialog.openDialog(mode, row);
    },
    [guardCreate, roomRateHeaderDialog]
  );

  const openRoomRateDialog = useCallback(
    (mode: "create" | "edit", row: RoomRate | null = null) => {
      if (!guardCreate(mode)) {
        return;
      }
      roomRateDialog.openDialog(mode, row);
    },
    [guardCreate, roomRateDialog]
  );

  const submitRoomRateHeader = useCallback(async () => {
    if (!hotelId) {
      return;
    }

    const parsed = createRoomRateHeaderSchema.safeParse({
      ...roomRateHeaderDialog.form,
      seasonId: roomRateHeaderDialog.form.seasonId || null,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid room rate header data.");
      return;
    }

    await withSave(async () => {
      if (roomRateHeaderDialog.dialog.mode === "create") {
        const created = await createRoomRateHeader(hotelId, parsed.data);
        setRoomRateHeaders((previous) => [...previous, created]);
        setSelectedRoomRateHeaderId(created.id);
        notify.success("Room rate header created.");
      } else if (roomRateHeaderDialog.dialog.row) {
        const updated = await updateRoomRateHeader(
          hotelId,
          roomRateHeaderDialog.dialog.row.id,
          parsed.data
        );
        setRoomRateHeaders((previous) =>
          previous.map((row) => (row.id === updated.id ? updated : row))
        );
        notify.success("Room rate header updated.");
      }

      roomRateHeaderDialog.closeDialog();
    });
  }, [hotelId, roomRateHeaderDialog, withSave]);

  const submitRoomRate = useCallback(async () => {
    if (!hotelId) {
      return;
    }

    const parsed = createRoomRateSchema.safeParse(roomRateDialog.form);
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid room rate data.");
      return;
    }

    await withSave(async () => {
      if (roomRateDialog.dialog.mode === "create") {
        const created = await createRoomRate(hotelId, parsed.data);
        setRoomRates((previous) => [...previous, created]);
        notify.success("Room rate created.");
      } else if (roomRateDialog.dialog.row) {
        const updated = await updateRoomRate(hotelId, roomRateDialog.dialog.row.id, parsed.data);
        setRoomRates((previous) =>
          previous.map((row) => (row.id === updated.id ? updated : row))
        );
        notify.success("Room rate updated.");
      }

      roomRateDialog.closeDialog();
    });
  }, [hotelId, roomRateDialog, withSave]);

  const deleteRoomRateHeaderRecord = useCallback(
    async (row: RoomRateHeader) => {
      if (!hotelId) {
        return;
      }

      await confirmDelete("Delete room rate header and linked lines?", async () => {
        await deleteRoomRateHeader(hotelId, row.id);
        setRoomRateHeaders((previous) => previous.filter((item) => item.id !== row.id));
        setRoomRates((previous) => previous.filter((item) => item.roomRateHeaderId !== row.id));
        setSelectedRoomRateHeaderId((previous) => (previous === row.id ? null : previous));
        notify.success("Room rate header deleted.");
      });
    },
    [confirmDelete, hotelId]
  );

  const deleteRoomRateRecord = useCallback(
    async (row: RoomRate) => {
      if (!hotelId) {
        return;
      }

      await confirmDelete("Delete room rate line?", async () => {
        await deleteRoomRate(hotelId, row.id);
        setRoomRates((previous) => previous.filter((item) => item.id !== row.id));
        notify.success("Room rate line deleted.");
      });
    },
    [confirmDelete, hotelId]
  );

  const openRoomRateLines = useCallback((header: RoomRateHeader) => {
    setSelectedRoomRateHeaderId(header.id);
    setRoomRateLineSearch("");
    setRoomRateLineStatusFilter("all");
    setRoomRateLinePageSize("10");
    setRoomRateLinePage(1);
  }, []);

  const closeRoomRateLines = useCallback(() => {
    setRoomRateLineSearch("");
    setRoomRateLineStatusFilter("all");
    setRoomRateLinePageSize("10");
    setRoomRateLinePage(1);
    setSelectedRoomRateHeaderId(null);
  }, []);

  return {
    loading,
    lookupLoading,
    saving,
    roomRateHeaders,
    seasons,
    currencyOptions,
    roomRateHeaderOptions,
    roomTypeOptions,
    selectedRoomRateHeaderId,
    selectedRoomRateHeader,
    filteredRoomRatesCount: filteredRoomRates.length,
    statusFilteredRoomRatesCount: statusFilteredRoomRates.length,
    pagedRoomRates,
    roomTypesAvailable: roomTypes.length > 0,
    roomRateLineSearch,
    roomRateLineStatusFilter,
    roomRateLinePageSize,
    roomRateLinePage,
    roomRateLineTotalPages,
    setRoomRateLineSearch,
    setRoomRateLineStatusFilter,
    setRoomRateLinePageSize,
    setRoomRateLinePage,
    setSelectedRoomRateHeaderId,
    openRoomRateLines,
    closeRoomRateLines,
    openRoomRateHeaderDialog,
    openRoomRateDialog,
    submitRoomRateHeader,
    submitRoomRate,
    deleteRoomRateHeaderRecord,
    deleteRoomRateRecord,
    roomRateHeaderDialog,
    roomRateDialog,
  };
}
