import { headers } from "next/headers";
import { listHotels as listAccommodationHotels } from "@/modules/accommodation/server/accommodation-service";

type HotelListResponse = Awaited<
  ReturnType<typeof listAccommodationHotels>
>;
type SerializableHotel = Omit<HotelListResponse["items"][number], "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};
type SerializableHotelListResponse = Omit<HotelListResponse, "items"> & {
  items: SerializableHotel[];
};

export async function loadAccommodationHotelListInitialData(): Promise<SerializableHotelListResponse | null> {
  try {
    const requestHeaders = await headers();
    const searchParams = new URLSearchParams({ limit: "15" });
    const result = await listAccommodationHotels(searchParams, requestHeaders);

    return {
      ...result,
      items: result.items.map((hotel) => ({
        ...hotel,
        createdAt: hotel.createdAt.toISOString(),
        updatedAt: hotel.updatedAt.toISOString(),
      })),
    };
  } catch {
    return null;
  }
}
