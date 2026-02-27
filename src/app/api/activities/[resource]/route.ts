import { NextResponse } from "next/server";
import {
  createActivityRecord,
  listActivityRecords,
  toActivityErrorResponse,
} from "@/modules/activity/server/activity-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ resource: string }> }
) {
  try {
    const params = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const records = await listActivityRecords(params.resource, searchParams, request.headers);
    return NextResponse.json(records);
  } catch (error) {
    const normalized = toActivityErrorResponse(error);
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
    const created = await createActivityRecord(params.resource, payload, request.headers);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const normalized = toActivityErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}

