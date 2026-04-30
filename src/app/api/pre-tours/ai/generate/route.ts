import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  generatePreTourAIDraft,
  toPreTourAIErrorResponse,
} from "@/modules/pre-tour/server/pre-tour-ai-service";

const postHandler = withApiLogging(
  { route: "/api/pre-tours/ai/generate", feature: "pre-tour-ai" },
  async (request: Request) => {
    try {
      const payload = await request.json();
      const response = await generatePreTourAIDraft(payload, request.headers);
      return NextResponse.json(response);
    } catch (error) {
      const normalized = toPreTourAIErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function POST(request: Request) {
  return postHandler(request);
}
