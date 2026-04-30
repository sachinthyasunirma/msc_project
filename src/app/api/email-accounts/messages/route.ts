import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  listAIEmailMessages,
  toEmailIntegrationErrorResponse,
} from "@/modules/email-integration/server/email-integration-service";

export const runtime = "nodejs";

const getHandler = withApiLogging(
  { route: "/api/email-accounts/messages", feature: "email-integration" },
  async (request: Request) => {
    try {
      const response = await listAIEmailMessages(new URL(request.url).searchParams, request.headers);
      return NextResponse.json(response);
    } catch (error) {
      const normalized = toEmailIntegrationErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function GET(request: Request) {
  return getHandler(request);
}
