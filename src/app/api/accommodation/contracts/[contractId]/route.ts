import { NextResponse } from "next/server";
import {
  deleteHotelContract,
  toAccommodationContractingErrorResponse,
  updateHotelContract,
} from "@/modules/accommodation/server/accommodation-contracting-service";

type RouteContext = {
  params: Promise<{ contractId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { contractId } = await context.params;
    const payload = await request.json();
    const result = await updateHotelContract(contractId, payload, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { contractId } = await context.params;
    await deleteHotelContract(contractId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
