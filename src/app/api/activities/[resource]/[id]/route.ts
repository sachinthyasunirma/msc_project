import { NextResponse } from "next/server";
import {
  deleteActivityRecord,
  toActivityErrorResponse,
  updateActivityRecord,
} from "@/modules/activity/server/activity-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const params = await context.params;
    const payload = await request.json();
    const updated = await updateActivityRecord(
      params.resource,
      params.id,
      payload,
      request.headers
    );
    return NextResponse.json(updated);
  } catch (error) {
    const normalized = toActivityErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const params = await context.params;
    await deleteActivityRecord(params.resource, params.id, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const normalized = toActivityErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}

