import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logging/logger";
import { sanitizeForLog } from "@/lib/logging/redaction";
import { withApiLogging } from "@/lib/logging/request";

const clientLogSchema = z.object({
  level: z.enum(["warn", "error"]).default("error"),
  message: z.string().trim().min(1).max(500),
  feature: z.string().trim().max(100).optional(),
  route: z.string().trim().max(300).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const postHandler = withApiLogging(
  { route: "/api/logs/client", method: "POST", feature: "client-log-ingest" },
  async (request) => {
    const body = await request.json().catch(() => ({}));
    const parsed = clientLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Invalid client log payload." },
        { status: 400 }
      );
    }
    const payload = sanitizeForLog(parsed.data);
    if (payload.level === "warn") {
      logger.warn("client_log", {
        eventType: "error",
        runtime: "client",
        feature: payload.feature,
        route: payload.route,
        clientMessage: payload.message,
        metadata: payload.metadata,
      });
    } else {
      logger.error("client_log", {
        eventType: "error",
        runtime: "client",
        feature: payload.feature,
        route: payload.route,
        clientMessage: payload.message,
        metadata: payload.metadata,
      });
    }
    return NextResponse.json({ success: true });
  }
);

export const POST = postHandler;
