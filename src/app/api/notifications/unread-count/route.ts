import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { internalNotification } from "@/db/schema";
import { withApiLogging } from "@/lib/logging/request";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";

const getHandler = withApiLogging(
  { route: "/api/notifications/unread-count", method: "GET", feature: "notifications" },
  async (request) => {
    try {
      const access = await resolveAccess(request.headers);
      const [unread] = await db
        .select({ count: count() })
        .from(internalNotification)
        .where(
          and(
            eq(internalNotification.companyId, access.companyId),
            eq(internalNotification.recipientUserId, access.userId),
            eq(internalNotification.deletedByRecipient, false),
            eq(internalNotification.isRead, false)
          )
        );

      return NextResponse.json({
        unreadCount: Number(unread?.count ?? 0),
      });
    } catch (error) {
      if (error instanceof AccessControlError) {
        return NextResponse.json(
          { code: error.code, message: error.message },
          { status: error.status }
        );
      }
      return NextResponse.json(
        { code: "INTERNAL_SERVER_ERROR", message: "Failed to load unread notification count." },
        { status: 500 }
      );
    }
  }
);

export async function GET(request: Request) {
  return getHandler(request, {});
}
