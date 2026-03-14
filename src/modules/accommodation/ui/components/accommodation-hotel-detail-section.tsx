"use client";

import { memo, useCallback } from "react";
import { useAccommodationHotelDetail } from "@/modules/accommodation/lib/use-accommodation-hotel-detail";
import type { AccommodationHotelDetailData } from "@/modules/accommodation/shared/accommodation-detail-types";
import { AccommodationHotelDetailCard } from "@/modules/accommodation/ui/components/accommodation-hotel-detail-card";
import { AccommodationAvailabilityDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-availability-dialog";
import { AccommodationRoomTypeDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-room-type-dialog";
import { AccommodationSeasonDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-season-dialog";

type AccommodationHotelDetailSectionProps = {
  hotelId?: string;
  showHotelList: boolean;
  isReadOnly: boolean;
  initialData?: AccommodationHotelDetailData | null;
};

function AccommodationHotelDetailSectionComponent({
  hotelId,
  showHotelList,
  isReadOnly,
  initialData = null,
}: AccommodationHotelDetailSectionProps) {
  const detail = useAccommodationHotelDetail({ hotelId, isReadOnly, initialData });
  const {
    openRoomTypeDialog,
    openAvailabilityDialog,
    deleteRoomTypeRecord,
    deleteAvailabilityRecord,
  } = detail;
  const handleAddRoomType = useCallback(() => openRoomTypeDialog("create"), [openRoomTypeDialog]);
  const handleEditRoomType = useCallback(
    (row: Parameters<typeof deleteRoomTypeRecord>[0]) => openRoomTypeDialog("edit", row),
    [openRoomTypeDialog]
  );
  const handleDeleteRoomType = useCallback(
    (row: Parameters<typeof deleteRoomTypeRecord>[0]) => {
      void deleteRoomTypeRecord(row);
    },
    [deleteRoomTypeRecord]
  );
  const handleAddAvailability = useCallback(() => openAvailabilityDialog("create"), [openAvailabilityDialog]);
  const handleEditAvailability = useCallback(
    (row: Parameters<typeof deleteAvailabilityRecord>[0]) => openAvailabilityDialog("edit", row),
    [openAvailabilityDialog]
  );
  const handleDeleteAvailability = useCallback(
    (row: Parameters<typeof deleteAvailabilityRecord>[0]) => {
      void deleteAvailabilityRecord(row);
    },
    [deleteAvailabilityRecord]
  );

  return (
    <>
      <AccommodationHotelDetailCard
        selectedHotel={detail.selectedHotel}
        showHotelList={showHotelList}
        loadingDetails={detail.loadingDetails}
        roomTypes={detail.roomTypes}
        availability={detail.availability}
        contracting={detail.contracting}
        isReadOnly={isReadOnly}
        onAddRoomType={handleAddRoomType}
        onEditRoomType={handleEditRoomType}
        onDeleteRoomType={handleDeleteRoomType}
        onAddAvailability={handleAddAvailability}
        onEditAvailability={handleEditAvailability}
        onDeleteAvailability={handleDeleteAvailability}
      />

      {detail.roomTypeDialog.dialog.open ? (
        <AccommodationRoomTypeDialog
          open={detail.roomTypeDialog.dialog.open}
          mode={detail.roomTypeDialog.dialog.mode}
          row={detail.roomTypeDialog.dialog.row}
          form={detail.roomTypeDialog.form}
          setForm={detail.roomTypeDialog.setForm}
          saving={detail.saving}
          isReadOnly={isReadOnly}
          onOpenChange={detail.roomTypeDialog.setOpen}
          onCancel={detail.roomTypeDialog.closeDialog}
          onSubmit={() => void detail.submitRoomType()}
        />
      ) : null}

      {detail.availabilityDialog.dialog.open ? (
        <AccommodationAvailabilityDialog
          open={detail.availabilityDialog.dialog.open}
          mode={detail.availabilityDialog.dialog.mode}
          row={detail.availabilityDialog.dialog.row}
          form={detail.availabilityDialog.form}
          setForm={detail.availabilityDialog.setForm}
          roomTypes={detail.roomTypes}
          saving={detail.saving}
          isReadOnly={isReadOnly}
          onOpenChange={detail.availabilityDialog.setOpen}
          onCancel={detail.availabilityDialog.closeDialog}
          onSubmit={() => void detail.submitAvailability()}
        />
      ) : null}

      {detail.seasonDialog.dialog.open ? (
        <AccommodationSeasonDialog
          open={detail.seasonDialog.dialog.open}
          mode={detail.seasonDialog.dialog.mode}
          row={detail.seasonDialog.dialog.row}
          form={detail.seasonDialog.form}
          setForm={detail.seasonDialog.setForm}
          seasons={detail.seasons}
          saving={detail.saving}
          isReadOnly={isReadOnly}
          onOpenChange={detail.seasonDialog.setOpen}
          onCancel={detail.seasonDialog.closeDialog}
          onSubmit={() => void detail.submitSeason()}
          onEditSeason={(season) => detail.openSeasonDialog("edit", season)}
          onDeleteSeason={(season) => void detail.deleteSeasonRecord(season)}
        />
      ) : null}
    </>
  );
}

export const AccommodationHotelDetailSection = memo(AccommodationHotelDetailSectionComponent);
