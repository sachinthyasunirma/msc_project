import { NextResponse } from "next/server";
import {
  deleteHotelImage,
  toAccommodationErrorResponse,
  updateHotelImage,
} from "@/modules/accommodation/server/accommodation-service";

type RouteContext = {
  params: Promise<{ hotelId: string; imageId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { hotelId, imageId } = await context.params;
    const payload = await request.json();
    const result = await updateHotelImage(hotelId, imageId, payload, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { hotelId, imageId } = await context.params;
    await deleteHotelImage(hotelId, imageId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
