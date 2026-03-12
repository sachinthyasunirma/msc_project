import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  deactivateMediaAsset,
  toMediaErrorResponse,
  updateMediaAsset,
} from "@/modules/media/server/media-asset-service";

export const PATCH = withApiLogging(
  { route: "/api/media/assets/[assetId]", method: "PATCH", feature: "media-assets" },
  async (request, context) => {
    try {
      const params = await context.params;
      const payload = await request.json();
      const updated = await updateMediaAsset(params?.assetId || "", payload, request.headers);
      return NextResponse.json(updated);
    } catch (error) {
      const normalized = toMediaErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export const DELETE = withApiLogging(
  { route: "/api/media/assets/[assetId]", method: "DELETE", feature: "media-assets" },
  async (request, context) => {
    try {
      const params = await context.params;
      const updated = await deactivateMediaAsset(params?.assetId || "", request.headers);
      return NextResponse.json(updated);
    } catch (error) {
      const normalized = toMediaErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);
