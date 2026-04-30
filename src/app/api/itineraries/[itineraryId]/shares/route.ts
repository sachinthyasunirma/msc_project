import { NextResponse } from "next/server";
import { withApiLogging, type ApiRouteContext } from "@/lib/logging/request";
import {
  createItineraryShareLink,
  toItineraryErrorResponse,
} from "@/modules/itinerary/server/itinerary-service";

export const POST = withApiLogging(
  { route: "/api/itineraries/[itineraryId]/shares", method: "POST", feature: "itinerary" },
  async (request: Request, context: ApiRouteContext<{ itineraryId: string }>) => {
    try {
      const params = await context.params;
      const payload = await request.json();
      const result = await createItineraryShareLink(params?.itineraryId || "", payload, request.headers);
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      const normalized = toItineraryErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);
