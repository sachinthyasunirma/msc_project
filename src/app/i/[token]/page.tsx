import { notFound } from "next/navigation";
import { getItineraryPublicSharePayload } from "@/modules/itinerary/server/itinerary-service";
import { ItineraryPublicShareView } from "@/modules/itinerary/ui/views/itinerary-public-share-view";

type PageProps = {
  params: Promise<{ token: string }>;
};

const PublicItineraryPage = async ({ params }: PageProps) => {
  const { token } = await params;

  try {
    const payload = await getItineraryPublicSharePayload(token);
    return <ItineraryPublicShareView payload={payload} />;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      [404, 410].includes(Number((error as { status?: number }).status))
    ) {
      notFound();
    }
    throw error;
  }
};

export default PublicItineraryPage;
