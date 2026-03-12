import { NextResponse } from "next/server";
import {
  deleteHotelRateRestriction,
  toAccommodationContractingErrorResponse,
  updateHotelRateRestriction,
} from "@/modules/accommodation/server/accommodation-contracting-service";

type RouteContext = {
  params: Promise<{ restrictionId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { restrictionId } = await context.params;
    const payload = await request.json();
    const result = await updateHotelRateRestriction(restrictionId, payload, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { restrictionId } = await context.params;
    await deleteHotelRateRestriction(restrictionId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
