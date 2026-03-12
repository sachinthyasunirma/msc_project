import { NextResponse } from "next/server";
import {
  deleteHotelRatePlan,
  toAccommodationContractingErrorResponse,
  updateHotelRatePlan,
} from "@/modules/accommodation/server/accommodation-contracting-service";

type RouteContext = {
  params: Promise<{ ratePlanId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { ratePlanId } = await context.params;
    const payload = await request.json();
    const result = await updateHotelRatePlan(ratePlanId, payload, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { ratePlanId } = await context.params;
    await deleteHotelRatePlan(ratePlanId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
