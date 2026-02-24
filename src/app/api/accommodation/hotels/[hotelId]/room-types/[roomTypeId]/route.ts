import { NextResponse } from "next/server";
import {
  deleteRoomType,
  toAccommodationErrorResponse,
  updateRoomType,
} from "@/modules/accommodation/server/accommodation-service";

type RouteContext = {
  params: Promise<{ hotelId: string; roomTypeId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { hotelId, roomTypeId } = await context.params;
    const payload = await request.json();
    const result = await updateRoomType(hotelId, roomTypeId, payload, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { hotelId, roomTypeId } = await context.params;
    await deleteRoomType(hotelId, roomTypeId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
