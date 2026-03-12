"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
import {
  createAvailability,
  createRoomType,
  deleteAvailability,
  deleteRoomType,
  getHotel,
  listAvailability,
  listRoomTypes,
  updateAvailability,
  updateRoomType,
  type Availability,
  type Hotel,
  type RoomType,
} from "@/modules/accommodation/lib/accommodation-api";
import {
  getInitialAvailabilityForm,
  getInitialRoomTypeForm,
  getInitialSeasonForm,
  type AvailabilityFormState,
  type RoomTypeFormState,
  type SeasonFormState,
} from "@/modules/accommodation/lib/accommodation-view-helpers";
import { useAccommodationFormDialog } from "@/modules/accommodation/lib/use-accommodation-form-dialog";
import {
  createAvailabilitySchema,
  createRoomTypeSchema,
} from "@/modules/accommodation/shared/accommodation-schemas";
import { createSeason, deleteSeason, listSeasons, updateSeason } from "@/modules/season/lib/season-api";
import type { SeasonOption } from "@/modules/season/lib/season-api";
import { createSeasonSchema } from "@/modules/season/shared/season-schemas";
import type { AccommodationHotelDetailData } from "@/modules/accommodation/shared/accommodation-detail-types";

type UseAccommodationHotelDetailOptions = {
  hotelId?: string;
  isReadOnly: boolean;
  initialData?: AccommodationHotelDetailData | null;
};

export function useAccommodationHotelDetail({
  hotelId,
  isReadOnly,
  initialData = null,
}: UseAccommodationHotelDetailOptions) {
  const confirm = useConfirm();
  const skipInitialLoadRef = useRef(
    Boolean(initialData && initialData.selectedHotel && hotelId)
  );
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(
    (initialData?.selectedHotel as Hotel | null) ?? null
  );
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(
    (initialData?.roomTypes as RoomType[] | undefined) ?? []
  );
  const [availability, setAvailability] = useState<Availability[]>(
    (initialData?.availability as Availability[] | undefined) ?? []
  );
  const [seasons, setSeasons] = useState<SeasonOption[]>(
    (initialData?.seasons as SeasonOption[] | undefined) ?? []
  );

  const roomTypeDialog = useAccommodationFormDialog<RoomTypeFormState, RoomType>((row) =>
    getInitialRoomTypeForm(row ?? null)
  );
  const availabilityDialog = useAccommodationFormDialog<AvailabilityFormState, Availability>((row) =>
    getInitialAvailabilityForm(row ?? null, roomTypes[0]?.id ?? "")
  );
  const seasonDialog = useAccommodationFormDialog<SeasonFormState, SeasonOption>((row) =>
    getInitialSeasonForm(row ?? null)
  );

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
      setAvailability([]);
      setSeasons([]);
      return;
    }

    setLoadingDetails(true);
    try {
      await Promise.all([
        loadHotel(),
        loadRoomTypes(),
        loadAvailability(),
        loadSeasons(),
      ]);
    } finally {
      setLoadingDetails(false);
    }
  }, [hotelId, loadAvailability, loadHotel, loadRoomTypes, loadSeasons]);

  useEffect(() => {
    if (skipInitialLoadRef.current) {
      skipInitialLoadRef.current = false;
      return;
    }
    void loadDetails();
  }, [loadDetails]);

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

  const openAvailabilityDialog = useCallback((mode: "create" | "edit", row: Availability | null = null) => {
    if (!guardCreate(mode)) return;
    availabilityDialog.openDialog(mode, row);
  }, [availabilityDialog, guardCreate]);

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

  const deleteAvailabilityRecord = useCallback(async (row: Availability) => {
    if (!hotelId) return;
    await confirmDelete("Delete availability record?", async () => {
      await deleteAvailability(hotelId, row.id);
      setAvailability((prev) => prev.filter((item) => item.id !== row.id));
      notify.success("Availability deleted.");
    });
  }, [confirmDelete, hotelId]);

  const deleteSeasonRecord = useCallback(async (row: SeasonOption) => {
    await confirmDelete("Delete this season? Linked room rates may be deleted due cascade.", async () => {
      await deleteSeason(row.id);
      setSeasons((prev) => prev.filter((item) => item.id !== row.id));
      notify.success("Season deleted.");
    });
  }, [confirmDelete]);

  return {
    loadingDetails,
    saving,
    selectedHotel,
    roomTypes,
    availability,
    seasons,
    openRoomTypeDialog,
    openAvailabilityDialog,
    openSeasonDialog,
    submitRoomType,
    submitAvailability,
    submitSeason,
    deleteRoomTypeRecord,
    deleteAvailabilityRecord,
    deleteSeasonRecord,
    roomTypeDialog,
    availabilityDialog,
    seasonDialog,
    reloadHotel: loadHotel,
  };
}
