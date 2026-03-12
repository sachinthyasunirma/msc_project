import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  createTransportRecord,
  listTransportRecords,
  toTransportErrorResponse,
} from "@/modules/transport/server/transport-service";

const getHandler = withApiLogging(
  { route: "/api/transports/[resource]", method: "GET", feature: "master-transport" },
  async (request, context) => {
    try {
      const params = await context.params;
      if (!params?.resource) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: "Transport resource is required." },
          { status: 400 }
        );
      }
      const searchParams = new URL(request.url).searchParams;
      const records = await listTransportRecords(params.resource, searchParams, request.headers);
      return NextResponse.json(records);
    } catch (error) {
      const normalized = toTransportErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

const postHandler = withApiLogging(
  { route: "/api/transports/[resource]", method: "POST", feature: "master-transport" },
  async (request, context) => {
    try {
      const params = await context.params;
      if (!params?.resource) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: "Transport resource is required." },
          { status: 400 }
        );
      }
      const payload = await request.json();
      const created = await createTransportRecord(params.resource, payload, request.headers);
      return NextResponse.json(created, { status: 201 });
    } catch (error) {
      const normalized = toTransportErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function GET(
  request: Request,
  context: { params: Promise<{ resource: string }> }
) {
  return getHandler(request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ resource: string }> }
) {
  return postHandler(request, context);
}
