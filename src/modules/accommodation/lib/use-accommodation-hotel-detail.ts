"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
import {
  createAvailability,
  createHotelImage,
  createRoomRate,
  createRoomRateHeader,
  createRoomType,
  deleteAvailability,
  deleteHotelImage,
  deleteRoomRate,
  deleteRoomRateHeader,
  deleteRoomType,
  getHotel,
  listAvailability,
  listHotelImages,
  listRoomRateHeaders,
  listRoomRates,
  listRoomTypes,
  updateAvailability,
  updateHotelImage,
  updateRoomRate,
  updateRoomRateHeader,
  updateRoomType,
  type Availability,
  type Hotel,
  type HotelImage,
  type RoomRate,
  type RoomRateHeader,
  type RoomType,
} from "@/modules/accommodation/lib/accommodation-api";
import {
  getInitialAvailabilityForm,
  getInitialImageForm,
  getInitialRoomRateForm,
  getInitialRoomRateHeaderForm,
  getInitialRoomTypeForm,
  getInitialSeasonForm,
  type AvailabilityFormState,
  type ImageFormState,
  type RoomRateFormState,
  type RoomRateHeaderFormState,
  type RoomTypeFormState,
  type SeasonFormState,
} from "@/modules/accommodation/lib/accommodation-view-helpers";
import { useAccommodationFormDialog } from "@/modules/accommodation/lib/use-accommodation-form-dialog";
import {
  createAvailabilitySchema,
  createHotelImageSchema,
  createRoomRateHeaderSchema,
  createRoomRateSchema,
  createRoomTypeSchema,
} from "@/modules/accommodation/shared/accommodation-schemas";
import { createSeason, deleteSeason, listSeasons, updateSeason } from "@/modules/season/lib/season-api";
import type { SeasonOption } from "@/modules/season/lib/season-api";
import { createSeasonSchema } from "@/modules/season/shared/season-schemas";

type UseAccommodationHotelDetailOptions = {
  hotelId?: string;
  isReadOnly: boolean;
};

export function useAccommodationHotelDetail({
  hotelId,
  isReadOnly,
}: UseAccommodationHotelDetailOptions) {
  const confirm = useConfirm();
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [roomRateHeaders, setRoomRateHeaders] = useState<RoomRateHeader[]>([]);
  const [selectedRoomRateHeaderId, setSelectedRoomRateHeaderId] = useState<string | null>(null);
  const [roomRates, setRoomRates] = useState<RoomRate[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [images, setImages] = useState<HotelImage[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [roomRateLineSearch, setRoomRateLineSearch] = useState("");
  const [roomRateLineStatusFilter, setRoomRateLineStatusFilter] = useState("all");
  const [roomRateLinePageSize, setRoomRateLinePageSize] = useState("10");
  const [roomRateLinePage, setRoomRateLinePage] = useState(1);

  const roomTypeDialog = useAccommodationFormDialog<RoomTypeFormState, RoomType>((row) =>
    getInitialRoomTypeForm(row ?? null)
  );
  const roomRateHeaderDialog = useAccommodationFormDialog<RoomRateHeaderFormState, RoomRateHeader>((row) =>
    getInitialRoomRateHeaderForm(row ?? null)
  );
  const roomRateDialog = useAccommodationFormDialog<RoomRateFormState, RoomRate>((row) =>
    getInitialRoomRateForm(row ?? null, selectedRoomRateHeaderId, roomTypes[0]?.id ?? "")
  );
  const availabilityDialog = useAccommodationFormDialog<AvailabilityFormState, Availability>((row) =>
    getInitialAvailabilityForm(row ?? null, roomTypes[0]?.id ?? "")
  );
  const imageDialog = useAccommodationFormDialog<ImageFormState, HotelImage>((row) =>
    getInitialImageForm(row ?? null)
  );
  const seasonDialog = useAccommodationFormDialog<SeasonFormState, SeasonOption>((row) =>
    getInitialSeasonForm(row ?? null)
  );

  const filteredRoomRates = useMemo(
    () =>
      selectedRoomRateHeaderId
        ? roomRates.filter((item) => item.roomRateHeaderId === selectedRoomRateHeaderId)
        : roomRates,
    [roomRates, selectedRoomRateHeaderId]
  );

  const visibleRoomRates = useMemo(() => {
    if (!roomRateLineSearch.trim()) return filteredRoomRates;
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

  const pagedRoomRates = useMemo(() => {
    const pageSize = Number(roomRateLinePageSize);
    const start = (roomRateLinePage - 1) * pageSize;
    return statusFilteredRoomRates.slice(start, start + pageSize);
  }, [roomRateLinePage, roomRateLinePageSize, statusFilteredRoomRates]);

  const selectedRoomRateHeader = useMemo(
    () => roomRateHeaders.find((item) => item.id === selectedRoomRateHeaderId) || null,
    [roomRateHeaders, selectedRoomRateHeaderId]
  );

  const roomTypesAvailable = roomTypes.length > 0;

  const loadHotel = useCallback(async () => {
    if (!hotelId) {
      setSelectedHotel(null);
      return;
    }

    try {
      const hotel = await getHotel(hotelId);
      setSelectedHotel(hotel);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load hotel.");
    }
  }, [hotelId]);

  const loadRoomTypes = useCallback(async () => {
    if (!hotelId) {
      setRoomTypes([]);
      return;
    }
    try {
      setRoomTypes(await listRoomTypes(hotelId));
    } catch {
      notify.error("Failed to load room types.");
      setRoomTypes([]);
    }
  }, [hotelId]);

  const loadRoomRateHeaders = useCallback(async () => {
    if (!hotelId) {
      setRoomRateHeaders([]);
      setSelectedRoomRateHeaderId(null);
      return;
    }
    try {
      const headers = await listRoomRateHeaders(hotelId);
      setRoomRateHeaders(headers);
      setSelectedRoomRateHeaderId((prev) =>
        prev && headers.some((item) => item.id === prev) ? prev : (headers[0]?.id ?? null)
      );
    } catch {
      notify.error("Failed to load room rate headers.");
      setRoomRateHeaders([]);
      setSelectedRoomRateHeaderId(null);
    }
  }, [hotelId]);

  const loadRoomRates = useCallback(async () => {
    if (!hotelId) {
      setRoomRates([]);
      return;
    }
    try {
      setRoomRates(await listRoomRates(hotelId));
    } catch {
      notify.error("Failed to load room rates.");
      setRoomRates([]);
    }
  }, [hotelId]);

  const loadAvailability = useCallback(async () => {
    if (!hotelId) {
      setAvailability([]);
      return;
    }
    try {
      setAvailability(await listAvailability(hotelId));
    } catch {
      notify.error("Failed to load availability.");
      setAvailability([]);
    }
  }, [hotelId]);

  const loadImages = useCallback(async () => {
    if (!hotelId) {
      setImages([]);
      return;
    }
    try {
      setImages(await listHotelImages(hotelId));
    } catch {
      notify.error("Failed to load images.");
      setImages([]);
    }
  }, [hotelId]);

  const loadSeasons = useCallback(async () => {
    try {
      const refreshed = await listSeasons({ limit: 100 });
      setSeasons(refreshed.items);
    } catch {
      notify.error("Failed to load seasons from master data.");
      setSeasons([]);
    }
  }, []);

  const loadDetails = useCallback(async () => {
    if (!hotelId) {
      setSelectedHotel(null);
      setRoomTypes([]);
      setRoomRateHeaders([]);
      setRoomRates([]);
      setAvailability([]);
      setImages([]);
      setSeasons([]);
      setSelectedRoomRateHeaderId(null);
      return;
    }

    setLoadingDetails(true);
    try {
      await Promise.all([
        loadHotel(),
        loadRoomTypes(),
        loadRoomRateHeaders(),
        loadRoomRates(),
        loadAvailability(),
        loadImages(),
        loadSeasons(),
      ]);
    } finally {
      setLoadingDetails(false);
    }
  }, [hotelId, loadAvailability, loadHotel, loadImages, loadRoomRateHeaders, loadRoomRates, loadRoomTypes, loadSeasons]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    setRoomRateLinePage(1);
  }, [roomRateLinePageSize, roomRateLineSearch, roomRateLineStatusFilter, selectedRoomRateHeaderId]);

  useEffect(() => {
    if (roomRateLinePage > roomRateLineTotalPages) {
      setRoomRateLinePage(roomRateLineTotalPages);
    }
  }, [roomRateLinePage, roomRateLineTotalPages]);

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
      if (!confirmed) return;
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

  const openRoomTypeDialog = useCallback((mode: "create" | "edit", row: RoomType | null = null) => {
    if (!guardCreate(mode)) return;
    roomTypeDialog.openDialog(mode, row);
  }, [guardCreate, roomTypeDialog]);

  const openRoomRateHeaderDialog = useCallback(async (mode: "create" | "edit", row: RoomRateHeader | null = null) => {
    if (!guardCreate(mode)) return;
    await loadSeasons();
    roomRateHeaderDialog.openDialog(mode, row);
  }, [guardCreate, loadSeasons, roomRateHeaderDialog]);

  const openRoomRateDialog = useCallback((mode: "create" | "edit", row: RoomRate | null = null) => {
    if (!guardCreate(mode)) return;
    roomRateDialog.openDialog(mode, row);
  }, [guardCreate, roomRateDialog]);

  const openAvailabilityDialog = useCallback((mode: "create" | "edit", row: Availability | null = null) => {
    if (!guardCreate(mode)) return;
    availabilityDialog.openDialog(mode, row);
  }, [availabilityDialog, guardCreate]);

  const openImageDialog = useCallback((mode: "create" | "edit", row: HotelImage | null = null) => {
    if (!guardCreate(mode)) return;
    imageDialog.openDialog(mode, row);
  }, [guardCreate, imageDialog]);

  const openSeasonDialog = useCallback((mode: "create" | "edit", row: SeasonOption | null = null) => {
    if (!guardCreate(mode)) return;
    seasonDialog.openDialog(mode, row);
  }, [guardCreate, seasonDialog]);

  const submitRoomType = useCallback(async () => {
    if (!hotelId) return;
    const parsed = createRoomTypeSchema.safeParse({
      ...roomTypeDialog.form,
      description: roomTypeDialog.form.description || null,
      size: roomTypeDialog.form.size || null,
      amenities: roomTypeDialog.form.amenitiesRaw.split(",").map((item) => item.trim()).filter(Boolean),
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid room type data.");
      return;
    }
    await withSave(async () => {
      if (roomTypeDialog.dialog.mode === "create") {
        const created = await createRoomType(hotelId, parsed.data);
        setRoomTypes((prev) => [...prev, created]);
        notify.success("Room type created.");
      } else if (roomTypeDialog.dialog.row) {
        const updated = await updateRoomType(hotelId, roomTypeDialog.dialog.row.id, parsed.data);
        setRoomTypes((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        notify.success("Room type updated.");
      }
      roomTypeDialog.closeDialog();
    });
  }, [hotelId, roomTypeDialog, withSave]);

  const submitRoomRateHeader = useCallback(async () => {
    if (!hotelId) return;
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
        setRoomRateHeaders((prev) => [...prev, created]);
        setSelectedRoomRateHeaderId(created.id);
        notify.success("Room rate header created.");
      } else if (roomRateHeaderDialog.dialog.row) {
        const updated = await updateRoomRateHeader(hotelId, roomRateHeaderDialog.dialog.row.id, parsed.data);
        setRoomRateHeaders((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        notify.success("Room rate header updated.");
      }
      roomRateHeaderDialog.closeDialog();
      await loadSeasons();
    });
  }, [hotelId, loadSeasons, roomRateHeaderDialog, withSave]);

  const submitRoomRate = useCallback(async () => {
    if (!hotelId) return;
    const parsed = createRoomRateSchema.safeParse(roomRateDialog.form);
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid room rate data.");
      return;
    }
    await withSave(async () => {
      if (roomRateDialog.dialog.mode === "create") {
        const created = await createRoomRate(hotelId, parsed.data);
        setRoomRates((prev) => [...prev, created]);
        notify.success("Room rate created.");
      } else if (roomRateDialog.dialog.row) {
        const updated = await updateRoomRate(hotelId, roomRateDialog.dialog.row.id, parsed.data);
        setRoomRates((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        notify.success("Room rate updated.");
      }
      roomRateDialog.closeDialog();
    });
  }, [hotelId, roomRateDialog, withSave]);

  const submitAvailability = useCallback(async () => {
    if (!hotelId) return;
    const parsed = createAvailabilitySchema.safeParse({
      ...availabilityDialog.form,
      blockReason: availabilityDialog.form.blockReason || null,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid availability data.");
      return;
    }
    await withSave(async () => {
      if (availabilityDialog.dialog.mode === "create") {
        const created = await createAvailability(hotelId, parsed.data);
        setAvailability((prev) => [...prev, created]);
        notify.success("Availability created.");
      } else if (availabilityDialog.dialog.row) {
        const updated = await updateAvailability(hotelId, availabilityDialog.dialog.row.id, parsed.data);
        setAvailability((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        notify.success("Availability updated.");
      }
      availabilityDialog.closeDialog();
    });
  }, [availabilityDialog, hotelId, withSave]);

  const submitImage = useCallback(async () => {
    if (!hotelId) return;
    const parsed = createHotelImageSchema.safeParse({
      ...imageDialog.form,
      caption: imageDialog.form.caption || null,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid image data.");
      return;
    }
    await withSave(async () => {
      if (imageDialog.dialog.mode === "create") {
        const created = await createHotelImage(hotelId, parsed.data);
        setImages((prev) => [...prev, created]);
        notify.success("Image created.");
      } else if (imageDialog.dialog.row) {
        const updated = await updateHotelImage(hotelId, imageDialog.dialog.row.id, parsed.data);
        setImages((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        notify.success("Image updated.");
      }
      imageDialog.closeDialog();
    });
  }, [hotelId, imageDialog, withSave]);

  const submitSeason = useCallback(async () => {
    const parsed = createSeasonSchema.safeParse({
      ...seasonDialog.form,
      description: seasonDialog.form.description || null,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid season data.");
      return;
    }
    await withSave(async () => {
      if (seasonDialog.dialog.mode === "create") {
        const created = await createSeason(parsed.data);
        setSeasons((prev) => [...prev, created]);
        notify.success("Season created.");
      } else if (seasonDialog.dialog.row) {
        const updated = await updateSeason(seasonDialog.dialog.row.id, parsed.data);
        setSeasons((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        notify.success("Season updated.");
      }
      seasonDialog.closeDialog();
    });
  }, [seasonDialog, withSave]);

  const deleteRoomTypeRecord = useCallback(async (row: RoomType) => {
    if (!hotelId) return;
    await confirmDelete("Delete room type?", async () => {
      await deleteRoomType(hotelId, row.id);
      setRoomTypes((prev) => prev.filter((item) => item.id !== row.id));
      notify.success("Room type deleted.");
    });
  }, [confirmDelete, hotelId]);

  const deleteRoomRateHeaderRecord = useCallback(async (row: RoomRateHeader) => {
    if (!hotelId) return;
    await confirmDelete("Delete room rate header and linked lines?", async () => {
      await deleteRoomRateHeader(hotelId, row.id);
      setRoomRateHeaders((prev) => prev.filter((item) => item.id !== row.id));
      setRoomRates((prev) => prev.filter((item) => item.roomRateHeaderId !== row.id));
      setSelectedRoomRateHeaderId((prev) => (prev === row.id ? null : prev));
      notify.success("Room rate header deleted.");
    });
  }, [confirmDelete, hotelId]);

  const deleteAvailabilityRecord = useCallback(async (row: Availability) => {
    if (!hotelId) return;
    await confirmDelete("Delete availability record?", async () => {
      await deleteAvailability(hotelId, row.id);
      setAvailability((prev) => prev.filter((item) => item.id !== row.id));
      notify.success("Availability deleted.");
    });
  }, [confirmDelete, hotelId]);

  const deleteImageRecord = useCallback(async (row: HotelImage) => {
    if (!hotelId) return;
    await confirmDelete("Delete image?", async () => {
      await deleteHotelImage(hotelId, row.id);
      setImages((prev) => prev.filter((item) => item.id !== row.id));
      notify.success("Image deleted.");
    });
  }, [confirmDelete, hotelId]);

  const deleteRoomRateRecord = useCallback(async (row: RoomRate) => {
    if (!hotelId) return;
    await confirmDelete("Delete room rate line?", async () => {
      await deleteRoomRate(hotelId, row.id);
      setRoomRates((prev) => prev.filter((item) => item.id !== row.id));
      notify.success("Room rate line deleted.");
    });
  }, [confirmDelete, hotelId]);

  const deleteSeasonRecord = useCallback(async (row: SeasonOption) => {
    await confirmDelete("Delete this season? Linked room rates may be deleted due cascade.", async () => {
      await deleteSeason(row.id);
      setSeasons((prev) => prev.filter((item) => item.id !== row.id));
      notify.success("Season deleted.");
      await loadRoomRateHeaders();
      await loadRoomRates();
    });
  }, [confirmDelete, loadRoomRateHeaders, loadRoomRates]);

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
    loadingDetails,
    saving,
    selectedHotel,
    roomTypes,
    roomRateHeaders,
    selectedRoomRateHeaderId,
    setSelectedRoomRateHeaderId,
    availability,
    images,
    seasons,
    roomTypesAvailable,
    roomRateLineSearch,
    setRoomRateLineSearch,
    roomRateLineStatusFilter,
    setRoomRateLineStatusFilter,
    roomRateLinePageSize,
    setRoomRateLinePageSize,
    roomRateLinePage,
    setRoomRateLinePage,
    roomRateLineTotalPages,
    filteredRoomRatesCount: filteredRoomRates.length,
    statusFilteredRoomRatesCount: statusFilteredRoomRates.length,
    pagedRoomRates,
    selectedRoomRateHeader,
    openRoomTypeDialog,
    openRoomRateHeaderDialog,
    openRoomRateDialog,
    openAvailabilityDialog,
    openImageDialog,
    openSeasonDialog,
    submitRoomType,
    submitRoomRateHeader,
    submitRoomRate,
    submitAvailability,
    submitImage,
    submitSeason,
    deleteRoomTypeRecord,
    deleteRoomRateHeaderRecord,
    deleteAvailabilityRecord,
    deleteImageRecord,
    deleteRoomRateRecord,
    deleteSeasonRecord,
    openRoomRateLines,
    closeRoomRateLines,
    roomTypeDialog,
    roomRateHeaderDialog,
    roomRateDialog,
    availabilityDialog,
    imageDialog,
    seasonDialog,
    reloadHotel: loadHotel,
  };
}
