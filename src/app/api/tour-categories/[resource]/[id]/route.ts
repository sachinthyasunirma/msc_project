import { NextResponse } from "next/server";
import {
  deleteTourCategoryRecord,
  toTourCategoryErrorResponse,
  updateTourCategoryRecord,
} from "@/modules/tour-category/server/tour-category-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const params = await context.params;
    const payload = await request.json();
    const updated = await updateTourCategoryRecord(
      params.resource,
      params.id,
      payload,
      request.headers
    );
    return NextResponse.json(updated);
  } catch (error) {
    const normalized = toTourCategoryErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const params = await context.params;
    await deleteTourCategoryRecord(params.resource, params.id, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const normalized = toTourCategoryErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}

