import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  copyPreTourPlanChildren,
  toPreTourErrorResponse,
} from "@/modules/pre-tour/server/pre-tour-service";

const postHandler = withApiLogging(
  { route: "/api/pre-tours/copy-children", feature: "pre-tour" },
  async (request) => {
    try {
      const payload = await request.json();
      const result = await copyPreTourPlanChildren(payload, request.headers);
      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      const normalized = toPreTourErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function POST(request: Request) {
  return postHandler(request);
}
