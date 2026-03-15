import { loadAccommodationHotelListInitialData } from "@/modules/accommodation/server/accommodation-hotel-list-loader";
import { AccommodationManagementView } from "@/modules/accommodation/ui/views/accommodation-management-view";

const AccommodationsPage = async () => {
  const initialHotelList = await loadAccommodationHotelListInitialData();

  return (
    <div className="p-4 md:p-6">
      <AccommodationManagementView initialHotelList={initialHotelList} />
    </div>
  );
};

export default AccommodationsPage;
