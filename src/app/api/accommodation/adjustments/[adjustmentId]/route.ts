import { NextResponse } from "next/server";
import {
  deleteHotelRateAdjustment,
  toAccommodationContractingErrorResponse,
  updateHotelRateAdjustment,
} from "@/modules/accommodation/server/accommodation-contracting-service";

type RouteContext = {
  params: Promise<{ adjustmentId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { adjustmentId } = await context.params;
    const payload = await request.json();
    const result = await updateHotelRateAdjustment(adjustmentId, payload, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { adjustmentId } = await context.params;
    await deleteHotelRateAdjustment(adjustmentId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
