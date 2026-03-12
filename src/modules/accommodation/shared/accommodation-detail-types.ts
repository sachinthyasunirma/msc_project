import type { HotelContractingBundle } from "@/modules/accommodation/shared/accommodation-contracting-types";

export type AccommodationHotelDetailData = {
  selectedHotel: Record<string, unknown> | null;
  roomTypes: Array<Record<string, unknown>>;
  roomRateHeaders: Array<Record<string, unknown>>;
  roomRates: Array<Record<string, unknown>>;
  availability: Array<Record<string, unknown>>;
  images: Array<Record<string, unknown>>;
  seasons: Array<Record<string, unknown>>;
  contracting: HotelContractingBundle | null;
};
