import { ItineraryBuilderPage } from "@/components/itinerary/itinerary-builder-page";
import { createMockItinerary } from "@/lib/mock/itinerary-data";

type PageProps = {
  params: Promise<{ id: string }>;
};

const ItineraryEditPage = async ({ params }: PageProps) => {
  const { id } = await params;

  return <ItineraryBuilderPage initialItinerary={createMockItinerary(id)} />;
};

export default ItineraryEditPage;
