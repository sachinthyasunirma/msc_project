import { AccommodationManagementView } from "@/modules/accommodation/ui/views/accommodation-management-view";

type HotelPageProps = {
  params: Promise<{ hotelId: string }>;
};

const HotelDetailsPage = async ({ params }: HotelPageProps) => {
  const { hotelId } = await params;

  return (
    <div className="p-4 md:p-6">
      <AccommodationManagementView hotelId={hotelId} showHotelList={false} />
    </div>
  );
};

export default HotelDetailsPage;
