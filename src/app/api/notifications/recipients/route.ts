import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { withApiLogging } from "@/lib/logging/request";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import { buildMentionDirectory } from "@/modules/notifications/lib/notification-utils";

const getHandler = withApiLogging(
  { route: "/api/notifications/recipients", method: "GET", feature: "notifications" },
  async (request) => {
    try {
      const access = await resolveAccess(request.headers);
      const rows = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          isActive: user.isActive,
        })
        .from(user)
        .where(eq(user.companyId, access.companyId));

      const recipients = buildMentionDirectory(rows)
        .filter((entry) => entry.id !== access.userId)
        .map((entry) => ({
          id: entry.id,
          name: entry.name,
          email: entry.email,
          mentionHandle: entry.mentionHandle,
          isActive: entry.isActive,
        }));

      return NextResponse.json({ recipients });
    } catch (error) {
      if (error instanceof AccessControlError) {
        return NextResponse.json(
          { code: error.code, message: error.message },
          { status: error.status }
        );
      }
      return NextResponse.json(
        { code: "INTERNAL_SERVER_ERROR", message: "Failed to load recipients." },
        { status: 500 }
      );
    }
  }
);

export async function GET(request: Request) {
  return getHandler(request, {});
}
