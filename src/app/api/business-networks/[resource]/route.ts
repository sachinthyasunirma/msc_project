import { NextResponse } from "next/server";
import {
  createBusinessNetworkRecord,
  listBusinessNetworkRecords,
  toBusinessNetworkErrorResponse,
} from "@/modules/business-network/server/business-network-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ resource: string }> }
) {
  try {
    const params = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const records = await listBusinessNetworkRecords(params.resource, searchParams, request.headers);
    return NextResponse.json(records);
  } catch (error) {
    const normalized = toBusinessNetworkErrorResponse(error);
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
    const created = await createBusinessNetworkRecord(params.resource, payload, request.headers);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const normalized = toBusinessNetworkErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}
