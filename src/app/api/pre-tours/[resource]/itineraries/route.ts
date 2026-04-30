import { NextResponse } from "next/server";
import { withApiLogging, type ApiRouteContext } from "@/lib/logging/request";
import {
  createItineraryDraft,
  getItineraryLauncherPayload,
  toItineraryErrorResponse,
} from "@/modules/itinerary/server/itinerary-service";

const getHandler = withApiLogging(
  {
    route: "/api/pre-tours/[resource]/itineraries",
    method: "GET",
    feature: "itinerary",
  },
  async (request: Request, context: ApiRouteContext<{ resource: string }>) => {
    try {
      const params = await context.params;
      const result = await getItineraryLauncherPayload(params?.resource || "", request.headers);
      return NextResponse.json(result);
    } catch (error) {
      const normalized = toItineraryErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

const postHandler = withApiLogging(
  {
    route: "/api/pre-tours/[resource]/itineraries",
    method: "POST",
    feature: "itinerary",
  },
  async (request: Request, context: ApiRouteContext<{ resource: string }>) => {
    try {
      const params = await context.params;
      const payload = await request.json();
      const result = await createItineraryDraft(params?.resource || "", payload, request.headers);
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      const normalized = toItineraryErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export const GET = getHandler;
export const POST = postHandler;
