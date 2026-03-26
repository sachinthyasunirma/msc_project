import { NextResponse } from "next/server";
import {
  createTechnicalVisitRecord,
  listTechnicalVisitRecordPage,
  listTechnicalVisitRecords,
  toTechnicalVisitErrorResponse,
} from "@/modules/technical-visit/server/technical-visit-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ resource: string }> }
) {
  try {
    const params = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const records = searchParams.has("page")
      ? await listTechnicalVisitRecordPage(params.resource, searchParams, request.headers)
      : await listTechnicalVisitRecords(params.resource, searchParams, request.headers);
    return NextResponse.json(records);
  } catch (error) {
    const normalized = toTechnicalVisitErrorResponse(error);
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
    const created = await createTechnicalVisitRecord(params.resource, payload, request.headers);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const normalized = toTechnicalVisitErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}
