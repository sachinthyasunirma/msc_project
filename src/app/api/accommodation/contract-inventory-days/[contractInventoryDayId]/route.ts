import { NextResponse } from "next/server";
import {
  deleteHotelContractInventoryDay,
  toAccommodationContractingErrorResponse,
  updateHotelContractInventoryDay,
} from "@/modules/accommodation/server/accommodation-contracting-service";

type RouteContext = {
  params: Promise<{ contractInventoryDayId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { contractInventoryDayId } = await context.params;
    const payload = await request.json();
    const result = await updateHotelContractInventoryDay(
      contractInventoryDayId,
      payload,
      request.headers
    );
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { contractInventoryDayId } = await context.params;
    await deleteHotelContractInventoryDay(contractInventoryDayId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
