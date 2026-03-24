"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useMemo, useState } from "react";
import { hotelRoomTypeImportConfig } from "@/components/batch-import/master-batch-import-config";
import { createRoomType } from "@/modules/accommodation/lib/accommodation-api";
import { useAccommodationHotelDetail } from "@/modules/accommodation/lib/use-accommodation-hotel-detail";
import type {
  AccommodationHotelDetailData,
  AccommodationHotelDetailTab,
} from "@/modules/accommodation/shared/accommodation-detail-types";
import { AccommodationHotelDetailCard } from "@/modules/accommodation/ui/components/accommodation-hotel-detail-card";

const AccommodationAvailabilityDialog = dynamic(
  () =>
    import("@/modules/accommodation/ui/components/dialogs/accommodation-availability-dialog").then(
      (module) => module.AccommodationAvailabilityDialog
    ),
  { ssr: false }
);
const AccommodationRoomTypeDialog = dynamic(
  () =>
    import("@/modules/accommodation/ui/components/dialogs/accommodation-room-type-dialog").then(
      (module) => module.AccommodationRoomTypeDialog
    ),
  { ssr: false }
);
const AccommodationSeasonDialog = dynamic(
  () =>
    import("@/modules/accommodation/ui/components/dialogs/accommodation-season-dialog").then(
      (module) => module.AccommodationSeasonDialog
    ),
  { ssr: false }
);

const MasterBatchImportDialog = dynamic(
  () =>
    import("@/components/batch-import/master-batch-import-dialog").then(
      (module) => module.MasterBatchImportDialog
    ),
  { ssr: false }
);

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
  const [activeTab, setActiveTab] = useState<AccommodationHotelDetailTab>("room-types");
  const detail = useAccommodationHotelDetail({
    hotelId,
    isReadOnly,
    initialData,
    activeTab,
  });
  const [roomTypeBatchOpen, setRoomTypeBatchOpen] = useState(false);
  const {
    openRoomTypeDialog,
    openAvailabilityDialog,
    deleteRoomTypeRecord,
    deleteAvailabilityRecord,
  } = detail;
  const handleAddRoomType = useCallback(() => openRoomTypeDialog("create"), [openRoomTypeDialog]);
  const handleOpenRoomTypeBatchUpload = useCallback(() => setRoomTypeBatchOpen(true), []);
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
  const roomTypeCodes = useMemo(() => detail.roomTypeExistingCodes(), [detail]);

  return (
    <>
      <AccommodationHotelDetailCard
        selectedHotel={detail.selectedHotel}
        showHotelList={showHotelList}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        loadingDetails={detail.loadingDetails}
        roomTypes={detail.roomTypes}
        availability={detail.availability}
        initialContracting={initialData?.contracting ?? null}
        isReadOnly={isReadOnly}
        onAddRoomType={handleAddRoomType}
        onOpenRoomTypeBatchUpload={handleOpenRoomTypeBatchUpload}
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

      {hotelId ? (
        <MasterBatchImportDialog
          open={roomTypeBatchOpen}
          onOpenChange={setRoomTypeBatchOpen}
          config={hotelRoomTypeImportConfig}
          readOnly={isReadOnly}
          context={{
            locationByCode: new Map(),
            currencyByCode: new Map(),
            vehicleCategoryByCode: new Map(),
            vehicleTypeByCode: new Map(),
            vehicleTypeCategoryCodeByCode: new Map(),
          }}
          existingCodes={roomTypeCodes}
          onRefreshExistingCodes={detail.refreshRoomTypeExistingCodes}
          onUploadRow={async (payload) => {
            await createRoomType(hotelId, payload);
          }}
          onCompleted={async () => {
            await detail.refreshRoomTypeData();
          }}
        />
      ) : null}
    </>
  );
}

export const AccommodationHotelDetailSection = memo(AccommodationHotelDetailSectionComponent);
