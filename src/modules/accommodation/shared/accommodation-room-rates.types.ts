"use client";

import type {
  RoomRate,
  RoomRateHeader,
  RoomType,
} from "@/modules/accommodation/lib/accommodation-api";
import type { SeasonOption } from "@/modules/season/lib/season-api";

export type AccommodationSelectOption = {
  value: string;
  label: string;
};

export type AccommodationRoomRatesInitialData = {
  roomRateHeaders: RoomRateHeader[];
  roomRates: RoomRate[];
  seasons: SeasonOption[];
};

export type AccommodationRoomRateDialogLookups = {
  roomRateHeaderOptions: AccommodationSelectOption[];
  roomTypeOptions: AccommodationSelectOption[];
};

export type AccommodationRoomRatesTabProps = {
  hotelId?: string;
  isReadOnly: boolean;
  roomTypes: RoomType[];
  roomTypesLoading: boolean;
  initialData?: AccommodationRoomRatesInitialData | null;
};
