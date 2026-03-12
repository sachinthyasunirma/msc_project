import { NextResponse } from "next/server";
import {
  deleteHotelCancellationPolicyRule,
  toAccommodationContractingErrorResponse,
  updateHotelCancellationPolicyRule,
} from "@/modules/accommodation/server/accommodation-contracting-service";

type RouteContext = {
  params: Promise<{ ruleId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { ruleId } = await context.params;
    const payload = await request.json();
    const result = await updateHotelCancellationPolicyRule(ruleId, payload, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { ruleId } = await context.params;
    await deleteHotelCancellationPolicyRule(ruleId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
