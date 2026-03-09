"use client";

import { memo } from "react";
import { useAccommodationHotelDetail } from "@/modules/accommodation/lib/use-accommodation-hotel-detail";
import { AccommodationHotelDetailCard } from "@/modules/accommodation/ui/components/accommodation-hotel-detail-card";
import { AccommodationAvailabilityDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-availability-dialog";
import { AccommodationImageDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-image-dialog";
import { AccommodationRoomRateDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-room-rate-dialog";
import { AccommodationRoomRateHeaderDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-room-rate-header-dialog";
import { AccommodationRoomTypeDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-room-type-dialog";
import { AccommodationSeasonDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-season-dialog";

type AccommodationHotelDetailSectionProps = {
  hotelId?: string;
  showHotelList: boolean;
  isReadOnly: boolean;
};

function AccommodationHotelDetailSectionComponent({
  hotelId,
  showHotelList,
  isReadOnly,
}: AccommodationHotelDetailSectionProps) {
  const detail = useAccommodationHotelDetail({ hotelId, isReadOnly });

  return (
    <>
      <AccommodationHotelDetailCard
        selectedHotel={detail.selectedHotel}
        showHotelList={showHotelList}
        loadingDetails={detail.loadingDetails}
        roomTypes={detail.roomTypes}
        roomRateHeaders={detail.roomRateHeaders}
        selectedRoomRateHeaderId={detail.selectedRoomRateHeaderId}
        availability={detail.availability}
        images={detail.images}
        isReadOnly={isReadOnly}
        roomTypesAvailable={detail.roomTypesAvailable}
        roomRateLineSearch={detail.roomRateLineSearch}
        roomRateLineStatusFilter={detail.roomRateLineStatusFilter}
        roomRateLinePageSize={detail.roomRateLinePageSize}
        roomRateLinePage={detail.roomRateLinePage}
        roomRateLineTotalPages={detail.roomRateLineTotalPages}
        filteredRoomRatesCount={detail.filteredRoomRatesCount}
        statusFilteredRoomRatesCount={detail.statusFilteredRoomRatesCount}
        pagedRoomRates={detail.pagedRoomRates}
        selectedRoomRateHeader={detail.selectedRoomRateHeader}
        onSelectRoomRateHeader={detail.setSelectedRoomRateHeaderId}
        onRoomRateLineSearchChange={detail.setRoomRateLineSearch}
        onRoomRateLineStatusFilterChange={detail.setRoomRateLineStatusFilter}
        onRoomRateLinePageSizeChange={detail.setRoomRateLinePageSize}
        onRoomRateLinePageChange={detail.setRoomRateLinePage}
        onAddRoomType={() => detail.openRoomTypeDialog("create")}
        onEditRoomType={(row) => detail.openRoomTypeDialog("edit", row)}
        onDeleteRoomType={(row) => void detail.deleteRoomTypeRecord(row)}
        onAddRoomRateHeader={() => void detail.openRoomRateHeaderDialog("create")}
        onOpenRoomRateLines={detail.openRoomRateLines}
        onEditRoomRateHeader={(row) => void detail.openRoomRateHeaderDialog("edit", row)}
        onDeleteRoomRateHeader={(row) => void detail.deleteRoomRateHeaderRecord(row)}
        onAddAvailability={() => detail.openAvailabilityDialog("create")}
        onEditAvailability={(row) => detail.openAvailabilityDialog("edit", row)}
        onDeleteAvailability={(row) => void detail.deleteAvailabilityRecord(row)}
        onAddImage={() => detail.openImageDialog("create")}
        onEditImage={(row) => detail.openImageDialog("edit", row)}
        onDeleteImage={(row) => void detail.deleteImageRecord(row)}
        onAddRateLine={() => detail.openRoomRateDialog("create")}
        onEditRateLine={(row) => detail.openRoomRateDialog("edit", row)}
        onDeleteRateLine={(row) => void detail.deleteRoomRateRecord(row)}
        onCloseRateLines={detail.closeRoomRateLines}
      />

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

      <AccommodationRoomRateHeaderDialog
        open={detail.roomRateHeaderDialog.dialog.open}
        mode={detail.roomRateHeaderDialog.dialog.mode}
        row={detail.roomRateHeaderDialog.dialog.row}
        form={detail.roomRateHeaderDialog.form}
        setForm={detail.roomRateHeaderDialog.setForm}
        seasons={detail.seasons}
        saving={detail.saving}
        isReadOnly={isReadOnly}
        onOpenChange={detail.roomRateHeaderDialog.setOpen}
        onCancel={detail.roomRateHeaderDialog.closeDialog}
        onSubmit={() => void detail.submitRoomRateHeader()}
      />

      <AccommodationRoomRateDialog
        open={detail.roomRateDialog.dialog.open}
        mode={detail.roomRateDialog.dialog.mode}
        row={detail.roomRateDialog.dialog.row}
        form={detail.roomRateDialog.form}
        setForm={detail.roomRateDialog.setForm}
        roomRateHeaders={detail.roomRateHeaders}
        roomTypes={detail.roomTypes}
        saving={detail.saving}
        isReadOnly={isReadOnly}
        onOpenChange={detail.roomRateDialog.setOpen}
        onCancel={detail.roomRateDialog.closeDialog}
        onSubmit={() => void detail.submitRoomRate()}
      />

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

      <AccommodationImageDialog
        open={detail.imageDialog.dialog.open}
        mode={detail.imageDialog.dialog.mode}
        row={detail.imageDialog.dialog.row}
        form={detail.imageDialog.form}
        setForm={detail.imageDialog.setForm}
        saving={detail.saving}
        isReadOnly={isReadOnly}
        onOpenChange={detail.imageDialog.setOpen}
        onCancel={detail.imageDialog.closeDialog}
        onSubmit={() => void detail.submitImage()}
      />

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
    </>
  );
}

export const AccommodationHotelDetailSection = memo(AccommodationHotelDetailSectionComponent);
