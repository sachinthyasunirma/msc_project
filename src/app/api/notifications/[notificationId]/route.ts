import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { internalNotification } from "@/db/schema";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";

export async function DELETE(
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

    const [existing] = await db
      .select({
        id: internalNotification.id,
        senderUserId: internalNotification.senderUserId,
        isRead: internalNotification.isRead,
      })
      .from(internalNotification)
      .where(
        and(
          eq(internalNotification.id, notificationId),
          eq(internalNotification.companyId, access.companyId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { code: "NOTIFICATION_NOT_FOUND", message: "Notification not found." },
        { status: 404 }
      );
    }

    if (existing.senderUserId !== access.userId) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "You can only delete your own messages." },
        { status: 403 }
      );
    }

    if (existing.isRead) {
      return NextResponse.json(
        {
          code: "MESSAGE_ALREADY_SEEN",
          message: "This message was already seen and cannot be deleted.",
        },
        { status: 400 }
      );
    }

    await db
      .delete(internalNotification)
      .where(
        and(
          eq(internalNotification.id, notificationId),
          eq(internalNotification.companyId, access.companyId)
        )
      );

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to delete notification." },
      { status: 500 }
    );
  }
}
