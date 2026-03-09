import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  createPreTourVersionFromPlan,
  toPreTourErrorResponse,
} from "@/modules/pre-tour/server/pre-tour-service";

const postHandler = withApiLogging(
  { route: "/api/pre-tours/clone-version", feature: "pre-tour" },
  async (request) => {
    try {
      const payload = await request.json();
      const created = await createPreTourVersionFromPlan(payload, request.headers);
      return NextResponse.json(created, { status: 201 });
    } catch (error) {
      const normalized = toPreTourErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function POST(request: Request) {
  return postHandler(request, {});
}
