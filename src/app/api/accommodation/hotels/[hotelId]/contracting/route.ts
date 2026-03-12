import { NextResponse } from "next/server";
import {
  loadAccommodationContractingData,
} from "@/modules/accommodation/server/accommodation-contracting-loader";
import {
  toAccommodationContractingErrorResponse,
} from "@/modules/accommodation/server/accommodation-contracting-service";

type RouteContext = {
  params: Promise<{ hotelId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { hotelId } = await context.params;
    const result = await loadAccommodationContractingData(hotelId, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
