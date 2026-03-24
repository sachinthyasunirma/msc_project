import { NextResponse } from "next/server";
import { withApiLogging, type ApiRouteContext } from "@/lib/logging/request";
import { getOnTourDetail, toOnTourErrorResponse } from "@/modules/on-tour/server/on-tour-service";

const getHandler = withApiLogging(
  { route: "/api/on-tours/[onTourId]", feature: "on-tour" },
  async (request: Request, context: ApiRouteContext<{ onTourId: string }>) => {
    try {
      const params = await context.params;
      if (!params?.onTourId) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: "On-tour id is required." },
          { status: 400 }
        );
      }

      const detail = await getOnTourDetail(params.onTourId, request.headers);
      return NextResponse.json(detail);
    } catch (error) {
      const normalized = toOnTourErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function GET(
  request: Request,
  context: { params: Promise<{ onTourId: string }> }
) {
  return getHandler(request, context);
}
