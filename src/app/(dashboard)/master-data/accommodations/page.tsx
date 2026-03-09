import { headers } from "next/headers";
import { listHotels as listAccommodationHotels } from "@/modules/accommodation/server/accommodation-service";
import { AccommodationManagementView } from "@/modules/accommodation/ui/views/accommodation-management-view";

async function loadInitialHotelList() {
  try {
    const requestHeaders = await headers();
    const searchParams = new URLSearchParams({ limit: "15" });
    const result = await listAccommodationHotels(searchParams, requestHeaders);
    return {
      ...result,
      items: result.items.map((hotel) => ({
        ...hotel,
        createdAt:
          hotel.createdAt instanceof Date ? hotel.createdAt.toISOString() : hotel.createdAt,
        updatedAt:
          hotel.updatedAt instanceof Date ? hotel.updatedAt.toISOString() : hotel.updatedAt,
      })),
    };
  } catch {
    return null;
  }
}

const AccommodationsPage = async () => {
  const initialHotelList = await loadInitialHotelList();

  return (
    <div className="p-4 md:p-6">
      <AccommodationManagementView initialHotelList={initialHotelList} />
    </div>
  );
};

export default AccommodationsPage;
