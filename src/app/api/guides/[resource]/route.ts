import { NextResponse } from "next/server";
import {
  createGuideRecord,
  listGuideRecordPage,
  listGuideRecords,
  toGuideErrorResponse,
} from "@/modules/guides/server/guides-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ resource: string }> }
) {
  try {
    const params = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const records = searchParams.has("page")
      ? await listGuideRecordPage(params.resource, searchParams, request.headers)
      : await listGuideRecords(params.resource, searchParams, request.headers);
    return NextResponse.json(records);
  } catch (error) {
    const normalized = toGuideErrorResponse(error);
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
    const created = await createGuideRecord(params.resource, payload, request.headers);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const normalized = toGuideErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}
