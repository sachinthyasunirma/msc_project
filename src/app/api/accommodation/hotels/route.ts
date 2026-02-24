import { NextResponse } from "next/server";
import {
  createHotel,
  listHotels,
  toAccommodationErrorResponse,
} from "@/modules/accommodation/server/accommodation-service";

export async function GET(request: Request) {
  try {
    const result = await listHotels(new URL(request.url).searchParams, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await createHotel(payload, request.headers);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const formatted = toAccommodationErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
