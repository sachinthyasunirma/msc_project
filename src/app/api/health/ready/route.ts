import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await db.execute(sql`select 1`);

    return NextResponse.json({
      status: "ready",
      checks: {
        database: "ok",
      },
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "not_ready",
        checks: {
          database: "failed",
        },
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown readiness failure",
      },
      { status: 503 }
    );
  }
}
