import { NextResponse } from "next/server";
import {
  createPreTourRecord,
  listPreTourRecords,
  toPreTourErrorResponse,
} from "@/modules/pre-tour/server/pre-tour-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ resource: string }> }
) {
  try {
    const params = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const records = await listPreTourRecords(params.resource, searchParams, request.headers);
    return NextResponse.json(records);
  } catch (error) {
    const normalized = toPreTourErrorResponse(error);
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
    const created = await createPreTourRecord(params.resource, payload, request.headers);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const normalized = toPreTourErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}
