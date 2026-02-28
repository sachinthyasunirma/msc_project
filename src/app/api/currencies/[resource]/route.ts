import { NextResponse } from "next/server";
import {
  createCurrencyRecord,
  listCurrencyRecords,
  toCurrencyErrorResponse,
} from "@/modules/currency/server/currency-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ resource: string }> }
) {
  try {
    const params = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const records = await listCurrencyRecords(params.resource, searchParams, request.headers);
    return NextResponse.json(records);
  } catch (error) {
    const normalized = toCurrencyErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ resource: string }> }
) {
  try {
    const params = await context.params;
    const payload = await request.json();
    const created = await createCurrencyRecord(params.resource, payload, request.headers);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const normalized = toCurrencyErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}
