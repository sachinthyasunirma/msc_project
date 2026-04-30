import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  buildPreTourAIEmailPrefill,
  toEmailIntegrationErrorResponse,
} from "@/modules/email-integration/server/email-integration-service";

export const runtime = "nodejs";

const postHandler = withApiLogging(
  { route: "/api/pre-tours/ai/email-context", feature: "pre-tour-ai" },
  async (request: Request) => {
    try {
      const payload = await request.json();
      const response = await buildPreTourAIEmailPrefill(payload, request.headers);
      return NextResponse.json(response);
    } catch (error) {
      const normalized = toEmailIntegrationErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function POST(request: Request) {
  return postHandler(request);
}
