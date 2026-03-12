import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  getMediaAssetReadUrl,
  toMediaErrorResponse,
} from "@/modules/media/server/media-asset-service";

export const GET = withApiLogging(
  { route: "/api/media/assets/[assetId]/file", method: "GET", feature: "media-assets" },
  async (request, context) => {
    try {
      const params = await context.params;
      const result = await getMediaAssetReadUrl(params?.assetId || "", request.headers);
      return NextResponse.redirect(result.readUrl, {
        headers: {
          "Cache-Control": "private, max-age=300",
        },
      });
    } catch (error) {
      const normalized = toMediaErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);
