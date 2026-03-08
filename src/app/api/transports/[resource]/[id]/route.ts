import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  deleteTransportRecord,
  toTransportErrorResponse,
  updateTransportRecord,
} from "@/modules/transport/server/transport-service";

const patchHandler = withApiLogging(
  { route: "/api/transports/[resource]/[id]", method: "PATCH", feature: "master-transport" },
  async (request, context) => {
    try {
      const params = await context.params;
      if (!params?.resource || !params?.id) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: "Transport resource and id are required." },
          { status: 400 }
        );
      }
      const payload = await request.json();
      const updated = await updateTransportRecord(
        params.resource,
        params.id,
        payload,
        request.headers
      );
      return NextResponse.json(updated);
    } catch (error) {
      const normalized = toTransportErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

const deleteHandler = withApiLogging(
  { route: "/api/transports/[resource]/[id]", method: "DELETE", feature: "master-transport" },
  async (request, context) => {
    try {
      const params = await context.params;
      if (!params?.resource || !params?.id) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: "Transport resource and id are required." },
          { status: 400 }
        );
      }
      await deleteTransportRecord(params.resource, params.id, request.headers);
      return NextResponse.json({ success: true });
    } catch (error) {
      const normalized = toTransportErrorResponse(error);
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
