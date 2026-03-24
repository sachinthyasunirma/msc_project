import { NextResponse } from "next/server";
import { withApiLogging, type ApiRouteContext } from "@/lib/logging/request";
import { assignOnTourTravelersToGroupRecord, toOnTourErrorResponse } from "@/modules/on-tour/server/on-tour-service";

const postHandler = withApiLogging(
  { route: "/api/on-tours/[onTourId]/groups/[groupId]/travelers", feature: "on-tour" },
  async (request: Request, context: ApiRouteContext<{ onTourId: string; groupId: string }>) => {
    try {
      const params = await context.params;
      const onTourId = params?.onTourId;
      const groupId = params?.groupId;
      if (!onTourId || !groupId) {
        return NextResponse.json(
          { code: "INVALID_REQUEST", message: "Operational file id and subgroup id are required." },
          { status: 400 }
        );
      }
      const body = await request.json();
      const created = await assignOnTourTravelersToGroupRecord(
        onTourId,
        groupId,
        body,
        request.headers
      );
      return NextResponse.json(created, { status: 201 });
    } catch (error) {
      const normalized = toOnTourErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function POST(
  request: Request,
  context: { params: Promise<{ onTourId: string; groupId: string }> }
) {
  return postHandler(request, context);
}
