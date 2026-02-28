import { NextResponse } from "next/server";
import {
  deleteBusinessNetworkRecord,
  toBusinessNetworkErrorResponse,
  updateBusinessNetworkRecord,
} from "@/modules/business-network/server/business-network-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const params = await context.params;
    const payload = await request.json();
    const updated = await updateBusinessNetworkRecord(
      params.resource,
      params.id,
      payload,
      request.headers
    );
    return NextResponse.json(updated);
  } catch (error) {
    const normalized = toBusinessNetworkErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const params = await context.params;
    await deleteBusinessNetworkRecord(params.resource, params.id, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const normalized = toBusinessNetworkErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}
