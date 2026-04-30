import dynamic from "next/dynamic";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { LoadingState } from "@/components/ui/loading-state";
import { getItineraryPreviewPayload } from "@/modules/itinerary/server/itinerary-service";
import type { ItinerarySurface } from "@/modules/itinerary/shared/itinerary-types";

const ItineraryStudioView = dynamic(
  () =>
    import("@/modules/itinerary/ui/views/itinerary-studio-view").then(
      (module) => module.ItineraryStudioView
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading itinerary studio"
        description="Preparing the document studio, structured pages, and web surfaces for editing."
      />
    ),
  }
);

type PageProps = {
  params: Promise<{ planId: string; itineraryId: string }>;
  searchParams: Promise<{ surface?: string }>;
};

const ItineraryPreviewPage = async ({ params, searchParams }: PageProps) => {
  const { planId, itineraryId } = await params;
  const { surface } = await searchParams;

  let payload;
  try {
    payload = await getItineraryPreviewPayload(itineraryId, planId, await headers());
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      Number((error as { status?: number }).status) === 404
    ) {
      notFound();
    }
    throw error;
  }

  const initialSurface: ItinerarySurface = surface === "web" ? "WEB" : "DOCUMENT";

  return (
    <div className="p-4 md:p-6">
      <ItineraryStudioView payload={payload} initialSurface={initialSurface} />
    </div>
  );
};

export default ItineraryPreviewPage;
