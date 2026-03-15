import { NextResponse } from "next/server";
import {
  deleteHotelRateBlackout,
  toAccommodationContractingErrorResponse,
  updateHotelRateBlackout,
} from "@/modules/accommodation/server/accommodation-contracting-service";

type RouteContext = {
  params: Promise<{ blackoutId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { blackoutId } = await context.params;
    const payload = await request.json();
    const result = await updateHotelRateBlackout(blackoutId, payload, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { blackoutId } = await context.params;
    await deleteHotelRateBlackout(blackoutId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
