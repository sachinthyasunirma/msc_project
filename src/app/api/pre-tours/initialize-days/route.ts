import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import { initializePreTourPlanDays } from "@/modules/pre-tour/server/pre-tour-day-initialization.service";
import { toPreTourErrorResponse } from "@/modules/pre-tour/server/pre-tour-service";

const postHandler = withApiLogging(
  { route: "/api/pre-tours/initialize-days", feature: "pre-tour" },
  async (request) => {
    try {
      const payload = await request.json();
      const result = await initializePreTourPlanDays(payload, request.headers);
      return NextResponse.json(result);
    } catch (error) {
      const normalized = toPreTourErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function POST(request: Request) {
  return postHandler(request, {});
}
