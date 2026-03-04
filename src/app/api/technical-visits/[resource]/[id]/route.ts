import { NextResponse } from "next/server";
import {
  deleteTechnicalVisitRecord,
  toTechnicalVisitErrorResponse,
  updateTechnicalVisitRecord,
} from "@/modules/technical-visit/server/technical-visit-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const params = await context.params;
    const payload = await request.json();
    const updated = await updateTechnicalVisitRecord(
      params.resource,
      params.id,
      payload,
      request.headers
    );
    return NextResponse.json(updated);
  } catch (error) {
    const normalized = toTechnicalVisitErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const params = await context.params;
    await deleteTechnicalVisitRecord(params.resource, params.id, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const normalized = toTechnicalVisitErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}
