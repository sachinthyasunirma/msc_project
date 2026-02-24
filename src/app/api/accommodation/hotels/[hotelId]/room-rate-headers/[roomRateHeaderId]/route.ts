import { NextResponse } from "next/server";
import {
  deleteRoomRateHeader,
  toAccommodationErrorResponse,
  updateRoomRateHeader,
} from "@/modules/accommodation/server/accommodation-service";

type RouteContext = {
  params: Promise<{ hotelId: string; roomRateHeaderId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { hotelId, roomRateHeaderId } = await context.params;
    const payload = await request.json();
    const result = await updateRoomRateHeader(
      hotelId,
      roomRateHeaderId,
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
    const { hotelId, roomRateHeaderId } = await context.params;
    await deleteRoomRateHeader(hotelId, roomRateHeaderId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
