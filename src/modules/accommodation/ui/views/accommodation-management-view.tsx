"use client";

import { useAccommodationAccess } from "@/modules/accommodation/lib/use-accommodation-access";
import { AccommodationHotelDetailSection } from "@/modules/accommodation/ui/components/accommodation-hotel-detail-section";
import { AccommodationHotelListSection } from "@/modules/accommodation/ui/components/accommodation-hotel-list-section";

type Props = {
  hotelId?: string;
  showHotelList?: boolean;
};

export const AccommodationManagementView = ({ hotelId, showHotelList = true }: Props) => {
  const { isReadOnly } = useAccommodationAccess();

  return (
    <div className="space-y-6">
      {showHotelList ? <AccommodationHotelListSection isReadOnly={isReadOnly} /> : null}
      {!showHotelList ? (
        <AccommodationHotelDetailSection
          hotelId={hotelId}
          showHotelList={showHotelList}
          isReadOnly={isReadOnly}
        />
      ) : null}
    </div>
  );
};
