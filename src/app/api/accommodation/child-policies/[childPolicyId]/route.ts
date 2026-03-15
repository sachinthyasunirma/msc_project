import { NextResponse } from "next/server";
import {
  deleteHotelRateChildPolicy,
  toAccommodationContractingErrorResponse,
  updateHotelRateChildPolicy,
} from "@/modules/accommodation/server/accommodation-contracting-service";

type RouteContext = {
  params: Promise<{ childPolicyId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { childPolicyId } = await context.params;
    const payload = await request.json();
    const result = await updateHotelRateChildPolicy(childPolicyId, payload, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { childPolicyId } = await context.params;
    await deleteHotelRateChildPolicy(childPolicyId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
