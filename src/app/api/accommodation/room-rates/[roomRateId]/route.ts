import { NextResponse } from "next/server";
import {
  deleteHotelRoomRate,
  toAccommodationContractingErrorResponse,
  updateHotelRoomRate,
} from "@/modules/accommodation/server/accommodation-contracting-service";

type RouteContext = {
  params: Promise<{ roomRateId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { roomRateId } = await context.params;
    const payload = await request.json();
    const result = await updateHotelRoomRate(roomRateId, payload, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { roomRateId } = await context.params;
    await deleteHotelRoomRate(roomRateId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
