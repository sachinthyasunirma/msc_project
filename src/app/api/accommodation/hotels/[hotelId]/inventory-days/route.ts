import { NextResponse } from "next/server";
import {
  createHotelInventoryDay,
  listHotelInventoryDays,
  toAccommodationContractingErrorResponse,
} from "@/modules/accommodation/server/accommodation-contracting-service";

type RouteContext = {
  params: Promise<{ hotelId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { hotelId } = await context.params;
    const result = await listHotelInventoryDays(
      hotelId,
      new URL(request.url).searchParams,
      request.headers
    );
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { hotelId } = await context.params;
    const payload = await request.json();
    const result = await createHotelInventoryDay(hotelId, payload, request.headers);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
