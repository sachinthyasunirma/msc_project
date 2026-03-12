import { NextResponse } from "next/server";
import {
  deleteTaxRecord,
  toTaxErrorResponse,
  updateTaxRecord,
} from "@/modules/tax/server/tax-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const params = await context.params;
    const payload = await request.json();
    const updated = await updateTaxRecord(params.resource, params.id, payload, request.headers);
    return NextResponse.json(updated);
  } catch (error) {
    const normalized = toTaxErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> }
) {
  try {
    const params = await context.params;
    await deleteTaxRecord(params.resource, params.id, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const normalized = toTaxErrorResponse(error);
    return NextResponse.json(normalized.body, { status: normalized.status });
  }
}
