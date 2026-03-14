import type {
  RoomType,
} from "@/modules/accommodation/lib/accommodation-api";
import type { HotelContractingBundle } from "@/modules/accommodation/shared/accommodation-contracting-types";

export type AccommodationRoomRatesTabProps = {
  isReadOnly: boolean;
  roomTypes: RoomType[];
  loadingDetails: boolean;
  contracting: HotelContractingBundle | null;
};
