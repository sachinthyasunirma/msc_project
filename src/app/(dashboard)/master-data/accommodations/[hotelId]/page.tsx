import { AccommodationManagementView } from "@/modules/accommodation/ui/views/accommodation-management-view";

type PageProps = {
  params: Promise<{ hotelId: string }>;
};

const AccommodationHotelDetailsPage = async ({ params }: PageProps) => {
  const { hotelId } = await params;

  return (
    <div className="p-4 md:p-6">
      <AccommodationManagementView hotelId={hotelId} showHotelList={false} />
    </div>
  );
};

export default AccommodationHotelDetailsPage;
