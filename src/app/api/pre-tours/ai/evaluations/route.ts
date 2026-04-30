import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  listPreTourAIRuns,
  toPreTourAIErrorResponse,
} from "@/modules/pre-tour/server/pre-tour-ai-service";

const getHandler = withApiLogging(
  { route: "/api/pre-tours/ai/evaluations", feature: "pre-tour-ai" },
  async (request: Request) => {
    try {
      const response = await listPreTourAIRuns(new URL(request.url).searchParams, request.headers);
      return NextResponse.json(response);
    } catch (error) {
      const normalized = toPreTourAIErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function GET(request: Request) {
  return getHandler(request);
}
