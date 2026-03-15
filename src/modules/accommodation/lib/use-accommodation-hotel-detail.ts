"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { accommodationKeys } from "@/modules/accommodation/lib/accommodation-query";
import {
  getInitialAvailabilityForm,
  getInitialRoomTypeForm,
  getInitialSeasonForm,
  type AvailabilityFormState,
  type RoomTypeFormState,
  type SeasonFormState,
} from "@/modules/accommodation/lib/accommodation-view-helpers";
import { useAccommodationFormDialog } from "@/modules/accommodation/lib/use-accommodation-form-dialog";
import type { HotelContractingBundle } from "@/modules/accommodation/shared/accommodation-contracting-types";
import type { AccommodationHotelDetailData } from "@/modules/accommodation/shared/accommodation-detail-types";
import {
  createAvailabilitySchema,
  createRoomTypeSchema,
} from "@/modules/accommodation/shared/accommodation-schemas";
import { getAccommodationContractingBundle } from "@/modules/accommodation/lib/accommodation-contracting-api";
import { createSeason, deleteSeason, listSeasons, updateSeason } from "@/modules/season/lib/season-api";
import type { SeasonOption } from "@/modules/season/lib/season-api";
import { createSeasonSchema } from "@/modules/season/shared/season-schemas";

type UseAccommodationHotelDetailOptions = {
  hotelId?: string;
  isReadOnly: boolean;
  initialData?: AccommodationHotelDetailData | null;
};

const EMPTY_ROOM_TYPES: RoomType[] = [];
const EMPTY_AVAILABILITY: Availability[] = [];
const EMPTY_SEASONS: SeasonOption[] = [];

export function useAccommodationHotelDetail({
  hotelId,
  isReadOnly,
  initialData = null,
}: UseAccommodationHotelDetailOptions) {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [manualSaving, setManualSaving] = useState(false);

  const hotelEnabled = Boolean(hotelId);
  const initialRoomTypes = (initialData?.roomTypes as RoomType[] | undefined) ?? EMPTY_ROOM_TYPES;
  const initialAvailability =
    (initialData?.availability as Availability[] | undefined) ?? EMPTY_AVAILABILITY;
  const initialSeasons =
    (initialData?.seasons as SeasonOption[] | undefined) ?? EMPTY_SEASONS;
  const initialContracting =
    (initialData?.contracting as HotelContractingBundle | null | undefined) ?? null;

  const {
    data: selectedHotel = null,
    isFetching: hotelLoading,
    error: hotelError,
  } = useQuery({
    queryKey: hotelId ? accommodationKeys.hotelDetail(hotelId) : accommodationKeys.hotelDetails(),
    queryFn: () => getHotel(String(hotelId)),
    enabled: hotelEnabled,
    initialData: hotelEnabled ? ((initialData?.selectedHotel as Hotel | null) ?? undefined) : undefined,
  });

  const {
    data: roomTypes = EMPTY_ROOM_TYPES,
    isFetching: roomTypesLoading,
    error: roomTypesError,
  } = useQuery({
    queryKey: hotelId ? accommodationKeys.hotelRoomTypes(hotelId) : accommodationKeys.hotelDetails(),
    queryFn: () => listRoomTypes(String(hotelId)),
    enabled: hotelEnabled,
    initialData: hotelEnabled && initialRoomTypes.length > 0 ? initialRoomTypes : undefined,
  });

  const {
    data: availability = EMPTY_AVAILABILITY,
    isFetching: availabilityLoading,
    error: availabilityError,
  } = useQuery({
    queryKey: hotelId ? accommodationKeys.hotelAvailability(hotelId) : accommodationKeys.hotelDetails(),
    queryFn: () => listAvailability(String(hotelId)),
    enabled: hotelEnabled,
    initialData: hotelEnabled && initialAvailability.length > 0 ? initialAvailability : undefined,
  });

  const {
    data: seasons = EMPTY_SEASONS,
    isFetching: seasonsLoading,
    error: seasonsError,
  } = useQuery({
    queryKey: accommodationKeys.seasonOptions(),
    queryFn: async () => {
      const response = await listSeasons({ limit: 100 });
      return response.items;
    },
    initialData: initialSeasons.length > 0 ? initialSeasons : undefined,
  });

  const {
    data: contracting = null,
    isFetching: contractingLoading,
    error: contractingError,
  } = useQuery({
    queryKey: hotelId
      ? accommodationKeys.hotelContracting(hotelId)
      : accommodationKeys.hotelDetails(),
    queryFn: async () => {
      const payload = await getAccommodationContractingBundle(String(hotelId));
      return payload.contracting;
    },
    enabled: hotelEnabled,
    initialData: hotelEnabled ? initialContracting ?? undefined : undefined,
  });

  const roomTypeDialog = useAccommodationFormDialog<RoomTypeFormState, RoomType>((row) =>
    getInitialRoomTypeForm(row ?? null)
  );
  const availabilityDialog = useAccommodationFormDialog<AvailabilityFormState, Availability>((row) =>
    getInitialAvailabilityForm(row ?? null, roomTypes[0]?.id ?? "")
  );
  const seasonDialog = useAccommodationFormDialog<SeasonFormState, SeasonOption>((row) =>
    getInitialSeasonForm(row ?? null)
  );

  const roomTypeMutation = useMutation({
    mutationFn: ({
      mode,
      payload,
      rowId,
    }: {
      mode: "create" | "edit";
      payload: unknown;
      rowId?: string;
    }) => {
      if (!hotelId) throw new Error("Hotel is required.");
      if (mode === "create") return createRoomType(hotelId, payload);
      return updateRoomType(hotelId, String(rowId), payload);
    },
  });

  const availabilityMutation = useMutation({
    mutationFn: ({
      mode,
      payload,
      rowId,
    }: {
      mode: "create" | "edit";
      payload: unknown;
      rowId?: string;
    }) => {
      if (!hotelId) throw new Error("Hotel is required.");
      if (mode === "create") return createAvailability(hotelId, payload);
      return updateAvailability(hotelId, String(rowId), payload);
    },
  });

  const seasonMutation = useMutation({
    mutationFn: ({
      mode,
      payload,
      rowId,
    }: {
      mode: "create" | "edit";
      payload: unknown;
      rowId?: string;
    }) => (mode === "create" ? createSeason(payload) : updateSeason(String(rowId), payload)),
  });

  const saving =
    manualSaving ||
    roomTypeMutation.isPending ||
    availabilityMutation.isPending ||
    seasonMutation.isPending;
  const loadingDetails =
    hotelEnabled &&
    (hotelLoading ||
      roomTypesLoading ||
      availabilityLoading ||
      seasonsLoading ||
      contractingLoading);

  useEffect(() => {
    if (!hotelError) return;
    notify.error(hotelError instanceof Error ? hotelError.message : "Failed to load hotel.");
  }, [hotelError]);

  useEffect(() => {
    if (!roomTypesError) return;
    notify.error(
      roomTypesError instanceof Error ? roomTypesError.message : "Failed to load room types."
    );
  }, [roomTypesError]);

  useEffect(() => {
    if (!availabilityError) return;
    notify.error(
      availabilityError instanceof Error
        ? availabilityError.message
        : "Failed to load availability."
    );
  }, [availabilityError]);

  useEffect(() => {
    if (!seasonsError) return;
    notify.error(
      seasonsError instanceof Error
        ? seasonsError.message
        : "Failed to load seasons from master data."
    );
  }, [seasonsError]);

  useEffect(() => {
    if (!contractingError) return;
    notify.error(
      contractingError instanceof Error
        ? contractingError.message
        : "Failed to load accommodation contracting."
    );
  }, [contractingError]);

  const refreshDetail = useCallback(async () => {
    if (!hotelId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: accommodationKeys.hotelDetail(hotelId) }),
      queryClient.invalidateQueries({ queryKey: accommodationKeys.hotelRoomTypes(hotelId) }),
      queryClient.invalidateQueries({ queryKey: accommodationKeys.hotelAvailability(hotelId) }),
      queryClient.invalidateQueries({ queryKey: accommodationKeys.hotelContracting(hotelId) }),
      queryClient.invalidateQueries({ queryKey: accommodationKeys.seasonOptions() }),
    ]);
  }, [hotelId, queryClient]);

  const withDelete = useCallback(
    async (message: string, callback: () => Promise<void>) => {
      const confirmed = await confirm({
        title: "Delete Record",
        description: `${message} This action cannot be undone.`,
        confirmText: "Yes",
        cancelText: "No",
        destructive: true,
      });
      if (!confirmed) return;
      try {
        setManualSaving(true);
        await callback();
      } finally {
        setManualSaving(false);
      }
    },
    [confirm]
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

  const openRoomTypeDialog = useCallback(
    (mode: "create" | "edit", row: RoomType | null = null) => {
      if (!guardCreate(mode)) return;
      roomTypeDialog.openDialog(mode, row);
    },
    [guardCreate, roomTypeDialog]
  );

  const openAvailabilityDialog = useCallback(
    (mode: "create" | "edit", row: Availability | null = null) => {
      if (!guardCreate(mode)) return;
      availabilityDialog.openDialog(mode, row);
    },
    [availabilityDialog, guardCreate]
  );

  const openSeasonDialog = useCallback(
    (mode: "create" | "edit", row: SeasonOption | null = null) => {
      if (!guardCreate(mode)) return;
      seasonDialog.openDialog(mode, row);
    },
    [guardCreate, seasonDialog]
  );

  const submitRoomType = useCallback(async () => {
    if (!hotelId) return;
    const parsed = createRoomTypeSchema.safeParse({
      ...roomTypeDialog.form,
      description: roomTypeDialog.form.description || null,
      size: roomTypeDialog.form.size || null,
      amenities: roomTypeDialog.form.amenitiesRaw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid room type data.");
      return;
    }
    try {
      await roomTypeMutation.mutateAsync({
        mode: roomTypeDialog.dialog.mode,
        payload: parsed.data,
        rowId: roomTypeDialog.dialog.row?.id,
      });
      roomTypeDialog.closeDialog();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accommodationKeys.hotelRoomTypes(hotelId) }),
        queryClient.invalidateQueries({ queryKey: accommodationKeys.hotelContracting(hotelId) }),
      ]);
      notify.success(
        roomTypeDialog.dialog.mode === "create" ? "Room type created." : "Room type updated."
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save room type.");
    }
  }, [hotelId, queryClient, roomTypeDialog, roomTypeMutation]);

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
    try {
      await availabilityMutation.mutateAsync({
        mode: availabilityDialog.dialog.mode,
        payload: parsed.data,
        rowId: availabilityDialog.dialog.row?.id,
      });
      availabilityDialog.closeDialog();
      await queryClient.invalidateQueries({
        queryKey: accommodationKeys.hotelAvailability(hotelId),
      });
      notify.success(
        availabilityDialog.dialog.mode === "create"
          ? "Availability created."
          : "Availability updated."
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save availability.");
    }
  }, [availabilityDialog, availabilityMutation, hotelId, queryClient]);

  const submitSeason = useCallback(async () => {
    const parsed = createSeasonSchema.safeParse({
      ...seasonDialog.form,
      description: seasonDialog.form.description || null,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid season data.");
      return;
    }
    try {
      await seasonMutation.mutateAsync({
        mode: seasonDialog.dialog.mode,
        payload: parsed.data,
        rowId: seasonDialog.dialog.row?.id,
      });
      seasonDialog.closeDialog();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accommodationKeys.seasonOptions() }),
        ...(hotelId
          ? [
              queryClient.invalidateQueries({
                queryKey: accommodationKeys.hotelContracting(hotelId),
              }),
            ]
          : []),
      ]);
      notify.success(
        seasonDialog.dialog.mode === "create" ? "Season created." : "Season updated."
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save season.");
    }
  }, [hotelId, queryClient, seasonDialog, seasonMutation]);

  const deleteRoomTypeRecord = useCallback(
    async (row: RoomType) => {
      if (!hotelId) return;
      await withDelete("Delete room type?", async () => {
        await deleteRoomType(hotelId, row.id);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: accommodationKeys.hotelRoomTypes(hotelId) }),
          queryClient.invalidateQueries({
            queryKey: accommodationKeys.hotelContracting(hotelId),
          }),
        ]);
        notify.success("Room type deleted.");
      });
    },
    [hotelId, queryClient, withDelete]
  );

  const deleteAvailabilityRecord = useCallback(
    async (row: Availability) => {
      if (!hotelId) return;
      await withDelete("Delete availability record?", async () => {
        await deleteAvailability(hotelId, row.id);
        await queryClient.invalidateQueries({
          queryKey: accommodationKeys.hotelAvailability(hotelId),
        });
        notify.success("Availability deleted.");
      });
    },
    [hotelId, queryClient, withDelete]
  );

  const deleteSeasonRecord = useCallback(
    async (row: SeasonOption) => {
      await withDelete(
        "Delete this season? Linked room rates may be deleted due cascade.",
        async () => {
          await deleteSeason(row.id);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: accommodationKeys.seasonOptions() }),
            ...(hotelId
              ? [
                  queryClient.invalidateQueries({
                    queryKey: accommodationKeys.hotelContracting(hotelId),
                  }),
                ]
              : []),
          ]);
          notify.success("Season deleted.");
        }
      );
    },
    [hotelId, queryClient, withDelete]
  );

  return {
    availability,
    availabilityDialog,
    contracting,
    deleteAvailabilityRecord,
    deleteRoomTypeRecord,
    deleteSeasonRecord,
    loadingDetails,
    openAvailabilityDialog,
    openRoomTypeDialog,
    openSeasonDialog,
    refreshDetail,
    roomTypeDialog,
    roomTypes,
    saving,
    seasonDialog,
    seasons,
    selectedHotel,
    submitAvailability,
    submitRoomType,
    submitSeason,
  };
}
