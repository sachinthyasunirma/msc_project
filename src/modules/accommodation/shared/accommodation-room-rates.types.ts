import type {
  RoomRate,
  RoomRateHeader,
  RoomType,
} from "@/modules/accommodation/lib/accommodation-api";
import type { HotelContractingBundle } from "@/modules/accommodation/shared/accommodation-contracting-types";
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

export type AccommodationRoomRatesTabProps = {
  hotelId: string;
  isReadOnly: boolean;
  roomTypes: RoomType[];
  loadingDetails: boolean;
  initialContracting?: HotelContractingBundle | null;
};
