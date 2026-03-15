import { NextResponse } from "next/server";
import {
  deleteHotelSellRateRule,
  toAccommodationContractingErrorResponse,
  updateHotelSellRateRule,
} from "@/modules/accommodation/server/accommodation-contracting-service";

type RouteContext = {
  params: Promise<{ sellRateRuleId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { sellRateRuleId } = await context.params;
    const payload = await request.json();
    const result = await updateHotelSellRateRule(sellRateRuleId, payload, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { sellRateRuleId } = await context.params;
    await deleteHotelSellRateRule(sellRateRuleId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
