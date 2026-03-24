"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/loading-state";
import type { AccommodationHotelListData } from "@/modules/accommodation/lib/use-accommodation-hotel-list";
import type { AccommodationHotelDetailData } from "@/modules/accommodation/shared/accommodation-detail-types";
import { useAccommodationAccess } from "@/modules/accommodation/lib/use-accommodation-access";

const AccommodationHotelListSection = dynamic(
  () =>
    import("@/modules/accommodation/ui/components/accommodation-hotel-list-section").then(
      (module) => module.AccommodationHotelListSection
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading hotel directory"
        description="Preparing hotel search, filters, and import tools."
      />
    ),
  }
);

const AccommodationHotelDetailSection = dynamic(
  () =>
    import("@/modules/accommodation/ui/components/accommodation-hotel-detail-section").then(
      (module) => module.AccommodationHotelDetailSection
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading hotel workspace"
        description="Preparing room types, rates, availability, and media."
      />
    ),
  }
);

type Props = {
  hotelId?: string;
  showHotelList?: boolean;
  initialHotelList?: AccommodationHotelListData | null;
  initialHotelDetail?: AccommodationHotelDetailData | null;
};

export const AccommodationManagementView = ({
  hotelId,
  showHotelList = true,
  initialHotelList = null,
  initialHotelDetail = null,
}: Props) => {
  const { isReadOnly } = useAccommodationAccess();

  return (
    <div className="space-y-6">
      {showHotelList ? (
        <AccommodationHotelListSection
          initialHotelList={initialHotelList}
          isReadOnly={isReadOnly}
        />
      ) : null}
      {!showHotelList ? (
        <AccommodationHotelDetailSection
          hotelId={hotelId}
          showHotelList={showHotelList}
          isReadOnly={isReadOnly}
          initialData={initialHotelDetail}
        />
      ) : null}
    </div>
  );
};
