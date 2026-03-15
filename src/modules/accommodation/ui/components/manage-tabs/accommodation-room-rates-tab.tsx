"use client";

import { memo } from "react";
import type { AccommodationRoomRatesTabProps } from "@/modules/accommodation/shared/accommodation-room-rates.types";
import { RoomRatesTab } from "@/modules/accommodation/ui/components/accommodation-manage/room-rates-tab";

function AccommodationRoomRatesTabComponent({
  loadingDetails,
  contracting,
  roomTypes,
  isReadOnly,
}: AccommodationRoomRatesTabProps) {
  return (
    <RoomRatesTab
      loadingDetails={loadingDetails}
      contracting={contracting}
      roomTypes={roomTypes}
      isReadOnly={isReadOnly}
    />
  );
}

export const AccommodationRoomRatesTab = memo(AccommodationRoomRatesTabComponent);
