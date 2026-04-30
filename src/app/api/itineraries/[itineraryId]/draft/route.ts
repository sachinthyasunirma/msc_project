import { NextResponse } from "next/server";
import { withApiLogging, type ApiRouteContext } from "@/lib/logging/request";
import {
  toItineraryErrorResponse,
  updateItineraryDraft,
} from "@/modules/itinerary/server/itinerary-service";

export const PATCH = withApiLogging(
  { route: "/api/itineraries/[itineraryId]/draft", method: "PATCH", feature: "itinerary" },
  async (request: Request, context: ApiRouteContext<{ itineraryId: string }>) => {
    try {
      const params = await context.params;
      const payload = await request.json();
      const result = await updateItineraryDraft(params?.itineraryId || "", payload, request.headers);
      return NextResponse.json(result);
    } catch (error) {
      const normalized = toItineraryErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);
