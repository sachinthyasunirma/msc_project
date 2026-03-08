import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  deletePreTourRecord,
  toPreTourErrorResponse,
  updatePreTourRecord,
} from "@/modules/pre-tour/server/pre-tour-service";

const patchHandler = withApiLogging(
  { route: "/api/pre-tours/[resource]/[id]", feature: "pre-tour" },
  async (request, context) => {
    try {
      const params = await context.params;
      if (!params?.resource || !params?.id) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: "Pre-tour resource and id are required." },
          { status: 400 }
        );
      }
      const payload = await request.json();
      const updated = await updatePreTourRecord(
        params.resource,
        params.id,
        payload,
        request.headers
      );
      return NextResponse.json(updated);
    } catch (error) {
      const normalized = toPreTourErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

const deleteHandler = withApiLogging(
  { route: "/api/pre-tours/[resource]/[id]", feature: "pre-tour" },
  async (request, context) => {
    try {
      const params = await context.params;
      if (!params?.resource || !params?.id) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: "Pre-tour resource and id are required." },
          { status: 400 }
        );
      }
      await deletePreTourRecord(params.resource, params.id, request.headers);
      return NextResponse.json({ success: true });
    } catch (error) {
      const normalized = toPreTourErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> }
) {
  return patchHandler(request, context);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> }
) {
  return deleteHandler(request, context);
}
