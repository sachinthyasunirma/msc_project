import { NextResponse } from "next/server";
import {
  deleteAvailability,
  toAccommodationErrorResponse,
  updateAvailability,
} from "@/modules/accommodation/server/accommodation-service";

type RouteContext = {
  params: Promise<{ hotelId: string; availabilityId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { hotelId, availabilityId } = await context.params;
    const payload = await request.json();
    const result = await updateAvailability(
      hotelId,
      availabilityId,
      payload,
      request.headers
    );
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { hotelId, availabilityId } = await context.params;
    await deleteAvailability(hotelId, availabilityId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
