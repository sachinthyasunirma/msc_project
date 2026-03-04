import { NextResponse } from "next/server";
import { runPreTourBinCleanupForAllCompanies } from "@/modules/pre-tour/server/pre-tour-service";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const authHeader = request.headers.get("authorization") || "";
  return authHeader === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "Unauthorized." }, { status: 401 });
  }

  try {
    const deletedCount = await runPreTourBinCleanupForAllCompanies();
    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error("[pre-tour-bin-cleanup] failed", error);
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Cleanup failed." },
      { status: 500 }
    );
  }
}

