import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  resolveAccommodationRates,
  toPreTourRateResolutionErrorResponse,
} from "@/modules/pre-tour/server/rate-resolution/accommodation-rate-resolver";
import {
  resolveTransportRates,
  toPreTourTransportRateResolutionErrorResponse,
} from "@/modules/pre-tour/server/rate-resolution/transport-rate-resolver";

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
        chargeMethod?: string;
        fromLocationId?: string;
        toLocationId?: string;
        serviceDate?: string | null;
        vehicleCategoryId?: string | null;
        vehicleTypeId?: string | null;
        pax?: number | null;
      };

      const itemType = String(payload.itemType || "").toUpperCase();

      if (itemType === "ACCOMMODATION") {
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
      }

      if (itemType === "TRANSPORT") {
        const options = await resolveTransportRates(
          {
            chargeMethod: String(payload.chargeMethod || "PER_KM") as
              | "PER_TRANSFER"
              | "PER_VEHICLE"
              | "PER_PAX"
              | "PER_HOUR"
              | "PER_DAY"
              | "PER_KM"
              | "SLAB",
            fromLocationId: String(payload.fromLocationId || ""),
            toLocationId: String(payload.toLocationId || ""),
            serviceDate: payload.serviceDate ?? null,
            vehicleCategoryId: payload.vehicleCategoryId ?? null,
            vehicleTypeId: payload.vehicleTypeId ?? null,
            pax: payload.pax ?? null,
          },
          request.headers
        );

        return NextResponse.json({ options });
      }

      return NextResponse.json(
        { message: "Only accommodation and transport rate resolution are supported right now." },
        { status: 400 }
      );
    } catch (error) {
      const normalized = toPreTourRateResolutionErrorResponse(error);
      const transportNormalized = toPreTourTransportRateResolutionErrorResponse(error);
      if (transportNormalized.status !== 500) {
        return NextResponse.json(transportNormalized.body, { status: transportNormalized.status });
      }
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function POST(request: Request) {
  return postHandler(request);
}
