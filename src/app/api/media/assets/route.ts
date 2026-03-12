import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  createMediaAsset,
  listMediaAssets,
  toMediaErrorResponse,
} from "@/modules/media/server/media-asset-service";

export const GET = withApiLogging(
  { route: "/api/media/assets", method: "GET", feature: "media-assets" },
  async (request) => {
    try {
      const searchParams = new URL(request.url).searchParams;
      const records = await listMediaAssets(searchParams, request.headers);
      return NextResponse.json(records);
    } catch (error) {
      const normalized = toMediaErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export const POST = withApiLogging(
  { route: "/api/media/assets", method: "POST", feature: "media-assets" },
  async (request) => {
    try {
      const payload = await request.json();
      const created = await createMediaAsset(payload, request.headers);
      return NextResponse.json(created, { status: 201 });
    } catch (error) {
      const normalized = toMediaErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);
