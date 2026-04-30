import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  applyPreTourAIDraft,
  toPreTourAIErrorResponse,
} from "@/modules/pre-tour/server/pre-tour-ai-service";

const postHandler = withApiLogging(
  { route: "/api/pre-tours/ai/apply", feature: "pre-tour-ai" },
  async (request: Request) => {
    try {
      const payload = await request.json();
      const response = await applyPreTourAIDraft(payload, request.headers);
      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      const normalized = toPreTourAIErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function POST(request: Request) {
  return postHandler(request);
}
