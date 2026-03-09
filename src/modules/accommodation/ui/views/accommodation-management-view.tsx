"use client";

import type { AccommodationHotelListData } from "@/modules/accommodation/lib/use-accommodation-hotel-list";
import type { AccommodationHotelDetailData } from "@/modules/accommodation/shared/accommodation-detail-types";
import { useAccommodationAccess } from "@/modules/accommodation/lib/use-accommodation-access";
import { AccommodationHotelDetailSection } from "@/modules/accommodation/ui/components/accommodation-hotel-detail-section";
import { AccommodationHotelListSection } from "@/modules/accommodation/ui/components/accommodation-hotel-list-section";

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
