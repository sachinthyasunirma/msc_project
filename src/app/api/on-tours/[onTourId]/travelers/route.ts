import { NextResponse } from "next/server";
import { withApiLogging, type ApiRouteContext } from "@/lib/logging/request";
import { createOnTourTravelerRecord, toOnTourErrorResponse } from "@/modules/on-tour/server/on-tour-service";

const postHandler = withApiLogging(
  { route: "/api/on-tours/[onTourId]/travelers", feature: "on-tour" },
  async (request: Request, context: ApiRouteContext<{ onTourId: string }>) => {
    try {
      const params = await context.params;
      const onTourId = params?.onTourId;
      if (!onTourId) {
        return NextResponse.json(
          { code: "INVALID_REQUEST", message: "Operational file id is required." },
          { status: 400 }
        );
      }
      const body = await request.json();
      const created = await createOnTourTravelerRecord(onTourId, body, request.headers);
      return NextResponse.json(created, { status: 201 });
    } catch (error) {
      const normalized = toOnTourErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function POST(
  request: Request,
  context: { params: Promise<{ onTourId: string }> }
) {
  return postHandler(request, context);
}
