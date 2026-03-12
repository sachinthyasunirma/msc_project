import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  createMediaUploadSession,
  toMediaErrorResponse,
} from "@/modules/media/server/media-asset-service";

export const POST = withApiLogging(
  { route: "/api/media/uploads/presign", method: "POST", feature: "media-assets" },
  async (request) => {
    try {
      const payload = await request.json();
      const session = await createMediaUploadSession(payload, request.headers);
      return NextResponse.json(session);
    } catch (error) {
      const normalized = toMediaErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);
