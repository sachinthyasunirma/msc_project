import { headers } from "next/headers";
import {
  getHotelById,
  listAvailability,
  listHotelImages,
  listRoomRateHeaders,
  listRoomRates,
  listRoomTypes,
} from "@/modules/accommodation/server/accommodation-service";
import { listSeasons } from "@/modules/season/server/season-service";
import { AccommodationManagementView } from "@/modules/accommodation/ui/views/accommodation-management-view";

type PageProps = {
  params: Promise<{ hotelId: string }>;
};

function toPlainRecord<T extends Record<string, unknown>>(value: T): T {
  const next = { ...value };
  for (const [key, field] of Object.entries(next)) {
    if (field instanceof Date) {
      next[key as keyof T] = field.toISOString() as T[keyof T];
    }
  }
  return next;
}

async function loadInitialHotelDetail(hotelId: string) {
  try {
    const requestHeaders = await headers();
    const nestedParams = new URLSearchParams({ limit: "100" });
    const seasonParams = new URLSearchParams({ limit: "100" });

    const [
      selectedHotel,
      roomTypes,
      roomRateHeaders,
      roomRates,
      availability,
      images,
      seasons,
    ] = await Promise.all([
      getHotelById(hotelId, requestHeaders),
      listRoomTypes(hotelId, nestedParams, requestHeaders),
      listRoomRateHeaders(hotelId, nestedParams, requestHeaders),
      listRoomRates(hotelId, nestedParams, requestHeaders),
      listAvailability(hotelId, nestedParams, requestHeaders),
      listHotelImages(hotelId, nestedParams, requestHeaders),
      listSeasons(seasonParams, requestHeaders),
    ]);

    return {
      selectedHotel: toPlainRecord(selectedHotel),
      roomTypes: roomTypes.map((item) => toPlainRecord(item)),
      roomRateHeaders: roomRateHeaders.map((item) => toPlainRecord(item)),
      roomRates: roomRates.map((item) => toPlainRecord(item)),
      availability: availability.map((item) => toPlainRecord(item)),
      images: images.map((item) => toPlainRecord(item)),
      seasons: seasons.items.map((item) => toPlainRecord(item)),
    };
  } catch {
    return null;
  }
}

const AccommodationHotelDetailsPage = async ({ params }: PageProps) => {
  const { hotelId } = await params;
  const initialHotelDetail = await loadInitialHotelDetail(hotelId);

  return (
    <div className="p-4 md:p-6">
      <AccommodationManagementView
        hotelId={hotelId}
        showHotelList={false}
        initialHotelDetail={initialHotelDetail}
      />
    </div>
  );
};

export default AccommodationHotelDetailsPage;
