"use client";

import { useQuery } from "@tanstack/react-query";
import { memo } from "react";
import { getAccommodationContractingBundle } from "@/modules/accommodation/lib/accommodation-contracting-api";
import { accommodationKeys } from "@/modules/accommodation/lib/accommodation-query";
import type { AccommodationRoomRatesTabProps } from "@/modules/accommodation/shared/accommodation-room-rates.types";
import { RoomRatesTab } from "@/modules/accommodation/ui/components/accommodation-manage/room-rates-tab";

function AccommodationRoomRatesTabComponent({
  hotelId,
  loadingDetails,
  initialContracting = null,
  roomTypes,
  isReadOnly,
}: AccommodationRoomRatesTabProps) {
  const {
    data: contracting = null,
    isFetching: contractingLoading,
  } = useQuery({
    queryKey: accommodationKeys.hotelContracting(hotelId),
    queryFn: async () => {
      const payload = await getAccommodationContractingBundle(hotelId);
      return payload.contracting;
    },
    initialData: initialContracting ?? undefined,
  });

  return (
    <RoomRatesTab
      loadingDetails={loadingDetails || contractingLoading}
      contracting={contracting}
      roomTypes={roomTypes}
      isReadOnly={isReadOnly}
    />
  );
}

export const AccommodationRoomRatesTab = memo(AccommodationRoomRatesTabComponent);
