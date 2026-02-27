import { NextResponse } from "next/server";
import {
  deleteRoomRate,
  toAccommodationErrorResponse,
  updateRoomRate,
} from "@/modules/accommodation/server/accommodation-service";

type RouteContext = {
  params: Promise<{ hotelId: string; roomRateId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { hotelId, roomRateId } = await context.params;
    const payload = await request.json();
    const result = await updateRoomRate(hotelId, roomRateId, payload, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { hotelId, roomRateId } = await context.params;
    await deleteRoomRate(hotelId, roomRateId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
