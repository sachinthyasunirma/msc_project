import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  listPreTourCategoryLookups,
  toPreTourCategoryLookupErrorResponse,
} from "@/modules/pre-tour/server/pre-tour-category-lookup-service";

const getHandler = withApiLogging(
  { route: "/api/pre-tours/category-lookups", feature: "pre-tour" },
  async (request: Request) => {
    try {
      const searchParams = new URL(request.url).searchParams;
      const lookups = await listPreTourCategoryLookups(searchParams, request.headers);
      return NextResponse.json(lookups);
    } catch (error) {
      const normalized = toPreTourCategoryLookupErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function GET(request: Request) {
  return getHandler(request);
}
