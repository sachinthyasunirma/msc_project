"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import { hotelImportConfig } from "@/components/batch-import/master-batch-import-config";
import { createHotel } from "@/modules/accommodation/lib/accommodation-api";
import {
  useAccommodationHotelList,
  type AccommodationHotelListData,
} from "@/modules/accommodation/lib/use-accommodation-hotel-list";
import { AccommodationHotelListCard } from "@/modules/accommodation/ui/components/accommodation-hotel-list-card";
import { AccommodationHotelDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-hotel-dialog";

const MasterBatchImportDialog = dynamic(
  () =>
    import("@/components/batch-import/master-batch-import-dialog").then(
      (module) => module.MasterBatchImportDialog
    ),
  { ssr: false }
);

type AccommodationHotelListSectionProps = {
  isReadOnly: boolean;
  initialHotelList?: AccommodationHotelListData | null;
};

function AccommodationHotelListSectionComponent({
  isReadOnly,
  initialHotelList = null,
}: AccommodationHotelListSectionProps) {
  const {
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
  } = useAccommodationHotelList({ isReadOnly, initialData: initialHotelList });

  return (
    <>
      <AccommodationHotelListCard
        loadingHotels={loadingHotels}
        hotels={hotels}
        selectedHotelId={selectedHotelId}
        hotelSearch={hotelSearch}
        hotelFilters={hotelFilters}
        pageIndex={pageIndex}
        hasNext={hasNext}
        nextCursor={nextCursor}
        isReadOnly={isReadOnly}
        onRefresh={() => void loadHotels()}
        onOpenBatch={() => setBatchOpen(true)}
        onAddHotel={() => openHotelDialog("create")}
        onSearchChange={setHotelSearch}
        onFiltersChange={setHotelFilters}
        onSelectHotel={setSelectedHotelId}
        onManageHotel={setSelectedHotelId}
        onEditHotel={(hotel) => openHotelDialog("edit", hotel)}
        onDeleteHotel={(hotel) => void deleteHotelRecord(hotel)}
        onPreviousPage={goPreviousPage}
        onNextPage={goNextPage}
      />

      <AccommodationHotelDialog
        open={hotelDialog.dialog.open}
        mode={hotelDialog.dialog.mode}
        row={hotelDialog.dialog.row}
        form={hotelDialog.form}
        setForm={hotelDialog.setForm}
        saving={saving}
        isReadOnly={isReadOnly}
        onOpenChange={hotelDialog.setOpen}
        onCancel={hotelDialog.closeDialog}
        onSubmit={() => void submitHotel()}
      />

      <MasterBatchImportDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        config={hotelImportConfig}
        readOnly={isReadOnly}
        context={{
          locationByCode: new Map(),
          currencyByCode: new Map(),
          vehicleCategoryByCode: new Map(),
          vehicleTypeByCode: new Map(),
          vehicleTypeCategoryCodeByCode: new Map(),
        }}
        existingCodes={hotelExistingCodes}
        onRefreshExistingCodes={refreshHotelExistingCodes}
        onUploadRow={async (payload) => {
          await createHotel(payload);
        }}
        onCompleted={async () => {
          await loadHotels();
        }}
      />
    </>
  );
}

export const AccommodationHotelListSection = memo(AccommodationHotelListSectionComponent);
