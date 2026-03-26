"use client";

import dynamic from "next/dynamic";
import { memo, useMemo } from "react";
import { hotelImportConfig } from "@/components/batch-import/master-batch-import-config";
import { createHotel } from "@/modules/accommodation/lib/accommodation-api";
import {
  useAccommodationHotelList,
  type AccommodationHotelListData,
} from "@/modules/accommodation/lib/use-accommodation-hotel-list";
import { AccommodationHotelListCard } from "@/modules/accommodation/ui/components/accommodation-hotel-list-card";

const AccommodationHotelDialog = dynamic(
  () =>
    import("@/modules/accommodation/ui/components/dialogs/accommodation-hotel-dialog").then(
      (module) => module.AccommodationHotelDialog
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
    systemLocationOptions,
    loadingSystemLocations,
    hotelExistingCodes,
    refreshHotelExistingCodes,
  } = useAccommodationHotelList({ isReadOnly, initialData: initialHotelList });

  const hotelBatchImportConfig = useMemo(
    () => ({
      ...hotelImportConfig,
      fields: hotelImportConfig.fields.map((field) =>
        field.key === "locationCode"
          ? {
              ...field,
              options: systemLocationOptions.map((location) => ({
                value: location.code,
                label: location.label,
              })),
            }
          : field
      ),
    }),
    [systemLocationOptions]
  );

  const locationByCode = useMemo(
    () =>
      new Map(
        systemLocationOptions.map((location) => [location.code.trim().toUpperCase(), location.id])
      ),
    [systemLocationOptions]
  );

  const locationDetailsByCode = useMemo(
    () =>
      new Map(
        systemLocationOptions.map((location) => [
          location.code.trim().toUpperCase(),
          {
            city: location.city,
            country: location.country,
            address: location.address,
          },
        ])
      ),
    [systemLocationOptions]
  );

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

      {hotelDialog.dialog.open ? (
        <AccommodationHotelDialog
          open={hotelDialog.dialog.open}
          mode={hotelDialog.dialog.mode}
          row={hotelDialog.dialog.row}
          form={hotelDialog.form}
          setForm={hotelDialog.setForm}
          locationOptions={systemLocationOptions}
          loadingLocations={loadingSystemLocations}
          saving={saving}
          isReadOnly={isReadOnly}
          onOpenChange={hotelDialog.setOpen}
          onCancel={hotelDialog.closeDialog}
          onSubmit={() => void submitHotel()}
        />
      ) : null}

      <MasterBatchImportDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        config={hotelBatchImportConfig}
        readOnly={isReadOnly}
        context={{
          locationByCode,
          locationDetailsByCode,
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
