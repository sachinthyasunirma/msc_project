import { NextResponse } from "next/server";
import {
  deleteHotel,
  getHotelById,
  toAccommodationErrorResponse,
  updateHotel,
} from "@/modules/accommodation/server/accommodation-service";

type RouteContext = {
  params: Promise<{ hotelId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { hotelId } = await context.params;
    const result = await getHotelById(hotelId, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { hotelId } = await context.params;
    const payload = await request.json();
    const result = await updateHotel(hotelId, payload, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { hotelId } = await context.params;
    await deleteHotel(hotelId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
