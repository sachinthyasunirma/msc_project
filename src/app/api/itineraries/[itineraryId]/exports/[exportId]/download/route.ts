import { withApiLogging, type ApiRouteContext } from "@/lib/logging/request";
import {
  downloadItineraryExportHook,
  toItineraryErrorResponse,
} from "@/modules/itinerary/server/itinerary-service";

export const GET = withApiLogging(
  {
    route: "/api/itineraries/[itineraryId]/exports/[exportId]/download",
    method: "GET",
    feature: "itinerary",
  },
  async (
    request: Request,
    context: ApiRouteContext<{ itineraryId: string; exportId: string }>
  ) => {
    try {
      const params = await context.params;
      const result = await downloadItineraryExportHook(
        params?.itineraryId || "",
        params?.exportId || "",
        request.headers
      );
      return new Response(result.body, {
        status: 200,
        headers: {
          "Content-Type": result.contentType,
          "Content-Disposition": `attachment; filename="${result.fileName}"`,
          "Cache-Control": "private, max-age=60",
        },
      });
    } catch (error) {
      const normalized = toItineraryErrorResponse(error);
      return Response.json(normalized.body, { status: normalized.status });
    }
  }
);
