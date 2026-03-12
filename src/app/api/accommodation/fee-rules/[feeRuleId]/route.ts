import { NextResponse } from "next/server";
import {
  deleteHotelFeeRule,
  toAccommodationContractingErrorResponse,
  updateHotelFeeRule,
} from "@/modules/accommodation/server/accommodation-contracting-service";

type RouteContext = {
  params: Promise<{ feeRuleId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { feeRuleId } = await context.params;
    const payload = await request.json();
    const result = await updateHotelFeeRule(feeRuleId, payload, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { feeRuleId } = await context.params;
    await deleteHotelFeeRule(feeRuleId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
