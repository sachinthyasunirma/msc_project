import { AccommodationManagementView } from "@/modules/accommodation/ui/views/accommodation-management-view";

const HotelsPage = () => {
  return (
    <div className="p-4 md:p-6">
      <AccommodationManagementView showHotelList />
    </div>
  );
};

export default HotelsPage;
