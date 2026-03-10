import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  resolveAccommodationRates,
  toPreTourRateResolutionErrorResponse,
} from "@/modules/pre-tour/server/rate-resolution/accommodation-rate-resolver";

const postHandler = withApiLogging(
  { route: "/api/pre-tours/rate-resolution", feature: "pre-tour" },
  async (request) => {
    try {
      const payload = (await request.json()) as {
        itemType?: string;
        hotelId?: string;
        travelDate?: string;
        roomTypeId?: string | null;
        roomBasis?: string | null;
      };

      if (String(payload.itemType || "").toUpperCase() !== "ACCOMMODATION") {
        return NextResponse.json(
          { message: "Only accommodation rate resolution is supported right now." },
          { status: 400 }
        );
      }

      const options = await resolveAccommodationRates(
        {
          hotelId: String(payload.hotelId || ""),
          travelDate: String(payload.travelDate || ""),
          roomTypeId: payload.roomTypeId ?? null,
          roomBasis: payload.roomBasis ?? null,
        },
        request.headers
      );

      return NextResponse.json({ options });
    } catch (error) {
      const normalized = toPreTourRateResolutionErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function POST(request: Request) {
  return postHandler(request, {});
}
