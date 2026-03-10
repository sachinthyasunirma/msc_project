"use client";

import { memo, useCallback } from "react";
import type { RoomRate, RoomRateHeader } from "@/modules/accommodation/lib/accommodation-api";
import { useAccommodationRoomRatesTab } from "@/modules/accommodation/lib/hooks/use-accommodation-room-rates-tab";
import type { AccommodationRoomRatesTabProps } from "@/modules/accommodation/shared/accommodation-room-rates.types";
import { RoomRatesTab } from "@/modules/accommodation/ui/components/accommodation-manage/room-rates-tab";
import { AccommodationRoomRateDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-room-rate-dialog";
import { AccommodationRoomRateHeaderDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-room-rate-header-dialog";

function AccommodationRoomRatesTabComponent({
  hotelId,
  isReadOnly,
  roomTypes,
  roomTypesLoading,
  initialData = null,
}: AccommodationRoomRatesTabProps) {
  const roomRates = useAccommodationRoomRatesTab({
    hotelId,
    initialData,
    isReadOnly,
    roomTypes,
    roomTypesLoading,
  });

  const handleAddRoomRateHeader = useCallback(() => {
    roomRates.openRoomRateHeaderDialog("create");
  }, [roomRates]);

  const handleEditRoomRateHeader = useCallback(
    (row: RoomRateHeader) => {
      roomRates.openRoomRateHeaderDialog("edit", row);
    },
    [roomRates]
  );

  const handleDeleteRoomRateHeader = useCallback(
    (row: RoomRateHeader) => {
      void roomRates.deleteRoomRateHeaderRecord(row);
    },
    [roomRates]
  );

  const handleAddRateLine = useCallback(() => {
    roomRates.openRoomRateDialog("create");
  }, [roomRates]);

  const handleEditRateLine = useCallback(
    (row: RoomRate) => {
      roomRates.openRoomRateDialog("edit", row);
    },
    [roomRates]
  );

  const handleDeleteRateLine = useCallback(
    (row: RoomRate) => {
      void roomRates.deleteRoomRateRecord(row);
    },
    [roomRates]
  );

  return (
    <>
      <RoomRatesTab
        loadingDetails={roomRates.loading}
        roomRateHeaders={roomRates.roomRateHeaders}
        selectedRoomRateHeaderId={roomRates.selectedRoomRateHeaderId}
        selectedRoomRateHeader={roomRates.selectedRoomRateHeader}
        filteredRoomRatesCount={roomRates.filteredRoomRatesCount}
        statusFilteredRoomRatesCount={roomRates.statusFilteredRoomRatesCount}
        pagedRoomRates={roomRates.pagedRoomRates}
        roomRateLineSearch={roomRates.roomRateLineSearch}
        roomRateLineStatusFilter={roomRates.roomRateLineStatusFilter}
        roomRateLinePageSize={roomRates.roomRateLinePageSize}
        roomRateLinePage={roomRates.roomRateLinePage}
        roomRateLineTotalPages={roomRates.roomRateLineTotalPages}
        roomTypesAvailable={roomRates.roomTypesAvailable}
        isReadOnly={isReadOnly}
        onOpenRoomRateLines={roomRates.openRoomRateLines}
        onAddRoomRateHeader={handleAddRoomRateHeader}
        onEditRoomRateHeader={handleEditRoomRateHeader}
        onDeleteRoomRateHeader={handleDeleteRoomRateHeader}
        onRoomRateLineSearchChange={roomRates.setRoomRateLineSearch}
        onRoomRateLineStatusFilterChange={roomRates.setRoomRateLineStatusFilter}
        onRoomRateLinePageSizeChange={roomRates.setRoomRateLinePageSize}
        onRoomRateLinePageChange={roomRates.setRoomRateLinePage}
        onAddRateLine={handleAddRateLine}
        onEditRateLine={handleEditRateLine}
        onDeleteRateLine={handleDeleteRateLine}
        onCloseRateLines={roomRates.closeRoomRateLines}
      />

      {roomRates.roomRateHeaderDialog.dialog.open ? (
        <AccommodationRoomRateHeaderDialog
          open={roomRates.roomRateHeaderDialog.dialog.open}
          mode={roomRates.roomRateHeaderDialog.dialog.mode}
          row={roomRates.roomRateHeaderDialog.dialog.row}
          form={roomRates.roomRateHeaderDialog.form}
          setForm={roomRates.roomRateHeaderDialog.setForm}
          seasons={roomRates.seasons}
          currencyOptions={roomRates.currencyOptions}
          lookupLoading={roomRates.lookupLoading}
          saving={roomRates.saving}
          isReadOnly={isReadOnly}
          onOpenChange={roomRates.roomRateHeaderDialog.setOpen}
          onCancel={roomRates.roomRateHeaderDialog.closeDialog}
          onSubmit={() => void roomRates.submitRoomRateHeader()}
        />
      ) : null}

      {roomRates.roomRateDialog.dialog.open ? (
        <AccommodationRoomRateDialog
          open={roomRates.roomRateDialog.dialog.open}
          mode={roomRates.roomRateDialog.dialog.mode}
          row={roomRates.roomRateDialog.dialog.row}
          form={roomRates.roomRateDialog.form}
          setForm={roomRates.roomRateDialog.setForm}
          roomRateHeaderOptions={roomRates.roomRateHeaderOptions}
          roomTypeOptions={roomRates.roomTypeOptions}
          lookupLoading={roomRates.lookupLoading}
          saving={roomRates.saving}
          isReadOnly={isReadOnly}
          onOpenChange={roomRates.roomRateDialog.setOpen}
          onCancel={roomRates.roomRateDialog.closeDialog}
          onSubmit={() => void roomRates.submitRoomRate()}
        />
      ) : null}
    </>
  );
}

export const AccommodationRoomRatesTab = memo(AccommodationRoomRatesTabComponent);
