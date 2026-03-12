import { NextResponse } from "next/server";
import {
  deleteHotelInventoryDay,
  toAccommodationContractingErrorResponse,
  updateHotelInventoryDay,
} from "@/modules/accommodation/server/accommodation-contracting-service";

type RouteContext = {
  params: Promise<{ inventoryDayId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { inventoryDayId } = await context.params;
    const payload = await request.json();
    const result = await updateHotelInventoryDay(inventoryDayId, payload, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { inventoryDayId } = await context.params;
    await deleteHotelInventoryDay(inventoryDayId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
