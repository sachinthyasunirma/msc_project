import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  convertPreTourPlanToOnTour,
  listOnTourRecords,
  toOnTourErrorResponse,
} from "@/modules/on-tour/server/on-tour-service";
import { convertPreTourToOnTourSchema } from "@/modules/on-tour/shared/on-tour-schemas";

const getHandler = withApiLogging(
  { route: "/api/on-tours", feature: "on-tour" },
  async (request) => {
    try {
      const records = await listOnTourRecords(new URL(request.url).searchParams, request.headers);
      return NextResponse.json(records);
    } catch (error) {
      const normalized = toOnTourErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function GET(request: Request) {
  return getHandler(request);
}

const postHandler = withApiLogging(
  { route: "/api/on-tours", feature: "on-tour" },
  async (request) => {
    try {
      const body = convertPreTourToOnTourSchema.parse(await request.json());
      const converted = await convertPreTourPlanToOnTour(body.preTourPlanId, request.headers);
      return NextResponse.json(converted, { status: converted.created ? 201 : 200 });
    } catch (error) {
      const normalized = toOnTourErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function POST(request: Request) {
  return postHandler(request);
}
