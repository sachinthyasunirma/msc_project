import { NextResponse } from "next/server";
import { withApiLogging, type ApiRouteContext } from "@/lib/logging/request";
import {
  getPreTourAIRun,
  reviewPreTourAIRun,
  toPreTourAIErrorResponse,
} from "@/modules/pre-tour/server/pre-tour-ai-service";

const getHandler = withApiLogging(
  { route: "/api/pre-tours/ai/evaluations/[runId]", feature: "pre-tour-ai" },
  async (request: Request, context: ApiRouteContext<{ runId: string }>) => {
    try {
      const params = await context.params;
      const response = await getPreTourAIRun(params.runId, request.headers);
      return NextResponse.json(response);
    } catch (error) {
      const normalized = toPreTourAIErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

const patchHandler = withApiLogging(
  { route: "/api/pre-tours/ai/evaluations/[runId]", feature: "pre-tour-ai" },
  async (request: Request, context: ApiRouteContext<{ runId: string }>) => {
    try {
      const params = await context.params;
      const payload = await request.json();
      const response = await reviewPreTourAIRun(params.runId, payload, request.headers);
      return NextResponse.json(response);
    } catch (error) {
      const normalized = toPreTourAIErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function GET(
  request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  return getHandler(request, context);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  return patchHandler(request, context);
}
