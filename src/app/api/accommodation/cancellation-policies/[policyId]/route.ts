import { NextResponse } from "next/server";
import {
  deleteHotelCancellationPolicy,
  toAccommodationContractingErrorResponse,
  updateHotelCancellationPolicy,
} from "@/modules/accommodation/server/accommodation-contracting-service";

type RouteContext = {
  params: Promise<{ policyId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { policyId } = await context.params;
    const payload = await request.json();
    const result = await updateHotelCancellationPolicy(policyId, payload, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { policyId } = await context.params;
    await deleteHotelCancellationPolicy(policyId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
