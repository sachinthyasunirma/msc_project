import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { internalNotification } from "@/db/schema";
import { getNotificationRealtimeEmitter } from "@/lib/realtime/redis-emitter";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ notificationId: string }> }
) {
  try {
    const access = await resolveAccess(request.headers);
    const { notificationId } = await context.params;
    if (!notificationId) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "notificationId is required." },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(internalNotification)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(internalNotification.id, notificationId),
          eq(internalNotification.companyId, access.companyId),
          eq(internalNotification.recipientUserId, access.userId),
          eq(internalNotification.deletedByRecipient, false)
        )
      )
      .returning({ id: internalNotification.id, isRead: internalNotification.isRead });

    if (!updated) {
      return NextResponse.json(
        { code: "NOTIFICATION_NOT_FOUND", message: "Notification not found." },
        { status: 404 }
      );
    }

    try {
      getNotificationRealtimeEmitter()?.emitRead({
        recipientUserId: access.userId,
        notificationId,
      });
    } catch {
      // Realtime publishing failures should not block persisted read state.
    }

    return NextResponse.json({ success: true, notification: updated });
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to mark notification as read." },
      { status: 500 }
    );
  }
}
