import { and, count, desc, eq, gte, ilike, lt, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { internalNotification, user } from "@/db/schema";
import { getNotificationRealtimeEmitter } from "@/lib/realtime/redis-emitter";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import {
  buildMentionDirectory,
  countWords,
  normalizeMentionHandle,
} from "@/modules/notifications/lib/notification-utils";

const createNotificationSchema = z.object({
  recipientUserId: z.string().trim().min(1).optional(),
  recipientHandle: z.string().trim().min(1).max(64).optional(),
  message: z.string().trim().min(1).max(1800),
});

const notificationScopeSchema = z.enum(["inbox", "sent"]);
const notificationViewSchema = z.enum(["list", "threads", "conversation"]);
const markThreadReadSchema = z.object({
  peerUserId: z.string().trim().min(1),
});

type DirectoryEntry = {
  id: string;
  name: string;
  email: string;
  mentionHandle: string;
  isActive: boolean;
};

async function loadDirectory(companyId: string) {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
    })
    .from(user)
    .where(eq(user.companyId, companyId));

  const directory = buildMentionDirectory(rows) as DirectoryEntry[];
  return {
    directory,
    byUserId: new Map(directory.map((entry) => [entry.id, entry])),
    mentionByUserId: new Map(directory.map((entry) => [entry.id, entry.mentionHandle])),
  };
}

async function handleListView(request: Request) {
  const access = await resolveAccess(request.headers);
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 10) || 10, 50);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);
  const scopeResult = notificationScopeSchema.safeParse(url.searchParams.get("scope") ?? "inbox");
  const scope = scopeResult.success ? scopeResult.data : "inbox";
  const q = url.searchParams.get("q")?.trim() ?? "";
  const recipientUserId = url.searchParams.get("recipientUserId")?.trim() ?? "";
  const term = q ? `%${q}%` : null;

  const inboxFilter = and(
    eq(internalNotification.companyId, access.companyId),
    eq(internalNotification.recipientUserId, access.userId),
    eq(internalNotification.deletedByRecipient, false),
    term
      ? or(
          ilike(user.name, term),
          ilike(user.email, term),
          ilike(internalNotification.message, term)
        )
      : undefined
  );
  const sentFilter = and(
    eq(internalNotification.companyId, access.companyId),
    eq(internalNotification.senderUserId, access.userId),
    eq(internalNotification.deletedBySender, false),
    recipientUserId ? eq(internalNotification.recipientUserId, recipientUserId) : undefined,
    term
      ? or(
          ilike(user.name, term),
          ilike(user.email, term),
          ilike(internalNotification.message, term)
        )
      : undefined
  );

  const [rows, unread, totalRows, directoryData] = await Promise.all([
    scope === "inbox"
      ? db
          .select({
            id: internalNotification.id,
            senderUserId: internalNotification.senderUserId,
            recipientUserId: internalNotification.recipientUserId,
            message: internalNotification.message,
            contextTitle: internalNotification.contextTitle,
            contextUrl: internalNotification.contextUrl,
            isRead: internalNotification.isRead,
            deliveredAt: internalNotification.deliveredAt,
            readAt: internalNotification.readAt,
            createdAt: internalNotification.createdAt,
            senderName: user.name,
            senderEmail: user.email,
          })
          .from(internalNotification)
          .innerJoin(user, eq(user.id, internalNotification.senderUserId))
          .where(inboxFilter)
          .orderBy(desc(internalNotification.createdAt))
          .limit(limit)
          .offset(offset)
      : db
          .select({
            id: internalNotification.id,
            senderUserId: internalNotification.senderUserId,
            recipientUserId: internalNotification.recipientUserId,
            message: internalNotification.message,
            contextTitle: internalNotification.contextTitle,
            contextUrl: internalNotification.contextUrl,
            isRead: internalNotification.isRead,
            deliveredAt: internalNotification.deliveredAt,
            readAt: internalNotification.readAt,
            createdAt: internalNotification.createdAt,
            senderName: user.name,
            senderEmail: user.email,
          })
          .from(internalNotification)
          .innerJoin(user, eq(user.id, internalNotification.recipientUserId))
          .where(sentFilter)
          .orderBy(desc(internalNotification.createdAt))
          .limit(limit)
          .offset(offset),
    db
      .select({ count: count() })
      .from(internalNotification)
      .where(
        and(
          eq(internalNotification.companyId, access.companyId),
          eq(internalNotification.recipientUserId, access.userId),
          eq(internalNotification.deletedByRecipient, false),
          eq(internalNotification.isRead, false)
        )
      ),
    scope === "inbox"
      ? db
          .select({ count: count() })
          .from(internalNotification)
          .innerJoin(user, eq(user.id, internalNotification.senderUserId))
          .where(inboxFilter)
      : db
          .select({ count: count() })
          .from(internalNotification)
          .innerJoin(user, eq(user.id, internalNotification.recipientUserId))
          .where(sentFilter),
    loadDirectory(access.companyId),
  ]);

  return NextResponse.json({
    items: rows.map((row) => ({
      id: row.id,
      senderUserId: row.senderUserId,
      recipientUserId: row.recipientUserId,
      senderName: row.senderName,
      senderEmail: row.senderEmail,
      senderHandle: directoryData.mentionByUserId.get(row.senderUserId) ?? "user",
      recipientHandle: directoryData.mentionByUserId.get(row.recipientUserId) ?? "user",
      recipientName:
        scope === "sent" ? row.senderName : directoryData.byUserId.get(row.recipientUserId)?.name ?? "",
      recipientEmail:
        scope === "sent" ? row.senderEmail : directoryData.byUserId.get(row.recipientUserId)?.email ?? "",
      message: row.message,
      contextTitle: row.contextTitle,
      contextUrl: row.contextUrl,
      isRead: row.isRead,
      deliveredAt: row.deliveredAt,
      readAt: row.readAt,
      createdAt: row.createdAt,
    })),
    scope,
    totalCount: Number(totalRows[0]?.count ?? 0),
    unreadCount: Number(unread[0]?.count ?? 0),
  });
}

async function handleThreadsView(request: Request) {
  const access = await resolveAccess(request.headers);
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20) || 20, 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

  const { directory, byUserId, mentionByUserId } = await loadDirectory(access.companyId);
  const peers = directory.filter((entry) => entry.id !== access.userId);
  const peerMatches = new Set(
    peers
      .filter((entry) => {
        if (!q) return true;
        const handle = entry.mentionHandle.toLowerCase();
        return (
          entry.name.toLowerCase().includes(q) ||
          entry.email.toLowerCase().includes(q) ||
          handle.includes(q) ||
          `@${handle}`.includes(q)
        );
      })
      .map((entry) => entry.id)
  );

  const rows = await db
    .select({
      id: internalNotification.id,
      senderUserId: internalNotification.senderUserId,
      recipientUserId: internalNotification.recipientUserId,
      message: internalNotification.message,
      isRead: internalNotification.isRead,
      createdAt: internalNotification.createdAt,
    })
    .from(internalNotification)
    .where(
      and(
        eq(internalNotification.companyId, access.companyId),
        or(
          and(
            eq(internalNotification.senderUserId, access.userId),
            eq(internalNotification.deletedBySender, false)
          ),
          and(
            eq(internalNotification.recipientUserId, access.userId),
            eq(internalNotification.deletedByRecipient, false)
          )
        )
      )
    )
    .orderBy(desc(internalNotification.createdAt))
    .limit(2000);

  const byPeer = new Map<
    string,
    {
      peerUserId: string;
      lastMessageId: string;
      lastMessage: string;
      lastMessageAt: Date;
      lastSenderUserId: string;
      unreadCount: number;
    }
  >();

  for (const row of rows) {
    const peerUserId =
      row.senderUserId === access.userId ? row.recipientUserId : row.senderUserId;
    if (!peerMatches.has(peerUserId)) continue;

    const existing = byPeer.get(peerUserId);
    if (!existing) {
      byPeer.set(peerUserId, {
        peerUserId,
        lastMessageId: row.id,
        lastMessage: row.message,
        lastMessageAt: row.createdAt,
        lastSenderUserId: row.senderUserId,
        unreadCount: 0,
      });
    }
    if (row.senderUserId === peerUserId && row.recipientUserId === access.userId && !row.isRead) {
      const tracked = byPeer.get(peerUserId);
      if (tracked) tracked.unreadCount += 1;
    }
  }

  const threadItems = Array.from(byPeer.values())
    .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
    .slice(offset, offset + limit)
    .map((thread) => {
      const peer = byUserId.get(thread.peerUserId);
      return {
        peerUserId: thread.peerUserId,
        peerName: peer?.name ?? "Unknown User",
        peerEmail: peer?.email ?? "",
        peerHandle: mentionByUserId.get(thread.peerUserId) ?? "user",
        lastMessageId: thread.lastMessageId,
        lastMessage: thread.lastMessage,
        lastMessageAt: thread.lastMessageAt,
        lastSenderUserId: thread.lastSenderUserId,
        unreadCount: thread.unreadCount,
      };
    });

  const totalCount = byPeer.size;
  const unreadCount = Array.from(byPeer.values()).reduce((sum, item) => sum + item.unreadCount, 0);

  return NextResponse.json({
    items: threadItems,
    totalCount,
    unreadCount,
  });
}

async function handleConversationView(request: Request) {
  const access = await resolveAccess(request.headers);
  const url = new URL(request.url);
  const peerUserId = url.searchParams.get("peerUserId")?.trim() ?? "";
  if (!peerUserId) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "peerUserId is required." },
      { status: 400 }
    );
  }

  const limit = Math.min(Number(url.searchParams.get("limit") ?? 30) || 30, 100);
  const beforeRaw = url.searchParams.get("before");
  const older = url.searchParams.get("older") === "true";
  const beforeDate = beforeRaw ? new Date(beforeRaw) : null;
  if (beforeDate && Number.isNaN(beforeDate.getTime())) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid before cursor." },
      { status: 400 }
    );
  }
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const { byUserId, mentionByUserId } = await loadDirectory(access.companyId);
  const peer = byUserId.get(peerUserId);
  if (!peer || peer.id === access.userId) {
    return NextResponse.json(
      { code: "USER_NOT_FOUND", message: "Peer user not found in your company." },
      { status: 404 }
    );
  }

  const baseFilter = and(
    eq(internalNotification.companyId, access.companyId),
    or(
      and(
        eq(internalNotification.senderUserId, access.userId),
        eq(internalNotification.recipientUserId, peerUserId),
        eq(internalNotification.deletedBySender, false)
      ),
      and(
        eq(internalNotification.senderUserId, peerUserId),
        eq(internalNotification.recipientUserId, access.userId),
        eq(internalNotification.deletedByRecipient, false)
      )
    ),
    older ? undefined : gte(internalNotification.createdAt, monthAgo),
    beforeDate ? lt(internalNotification.createdAt, beforeDate) : undefined
  );

  const rows = await db
    .select({
      id: internalNotification.id,
      senderUserId: internalNotification.senderUserId,
      recipientUserId: internalNotification.recipientUserId,
      message: internalNotification.message,
      isRead: internalNotification.isRead,
      deliveredAt: internalNotification.deliveredAt,
      readAt: internalNotification.readAt,
      createdAt: internalNotification.createdAt,
    })
    .from(internalNotification)
    .where(baseFilter)
    .orderBy(desc(internalNotification.createdAt))
    .limit(limit + 1);

  const trimmed = rows.slice(0, limit);
  const hasMoreOlder = rows.length > limit;

  const unreadCountRows = await db
    .select({ count: count() })
    .from(internalNotification)
    .where(
      and(
        eq(internalNotification.companyId, access.companyId),
        eq(internalNotification.senderUserId, peerUserId),
        eq(internalNotification.recipientUserId, access.userId),
        eq(internalNotification.deletedByRecipient, false),
        eq(internalNotification.isRead, false)
      )
    );

  return NextResponse.json({
    peer: {
      id: peer.id,
      name: peer.name,
      email: peer.email,
      mentionHandle: mentionByUserId.get(peer.id) ?? "user",
      isActive: peer.isActive,
    },
    items: trimmed.map((row) => ({
      id: row.id,
      senderUserId: row.senderUserId,
      recipientUserId: row.recipientUserId,
      message: row.message,
      isRead: row.isRead,
      deliveredAt: row.deliveredAt,
      readAt: row.readAt,
      createdAt: row.createdAt,
    })),
    hasMoreOlder,
    unreadFromPeer: Number(unreadCountRows[0]?.count ?? 0),
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const viewResult = notificationViewSchema.safeParse(url.searchParams.get("view") ?? "list");
    const view = viewResult.success ? viewResult.data : "list";

    if (view === "threads") return await handleThreadsView(request);
    if (view === "conversation") return await handleConversationView(request);
    return await handleListView(request);
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to load notifications." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await resolveAccess(request.headers);
    const payload = await request.json();
    const parsed = markThreadReadSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Invalid payload.",
        },
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
          eq(internalNotification.companyId, access.companyId),
          eq(internalNotification.senderUserId, parsed.data.peerUserId),
          eq(internalNotification.recipientUserId, access.userId),
          eq(internalNotification.deletedByRecipient, false),
          eq(internalNotification.isRead, false)
        )
      )
      .returning({
        id: internalNotification.id,
      });

    try {
      if (updated) {
        getNotificationRealtimeEmitter()?.emitRead({
          recipientUserId: access.userId,
          notificationId: updated.id,
        });
      }
    } catch {
      // Realtime publishing failures should not block persisted read state.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to update notifications." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await resolveAccess(request.headers);
    const payload = await request.json();
    const parsed = createNotificationSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Invalid notification payload.",
        },
        { status: 400 }
      );
    }

    const wordCount = countWords(parsed.data.message);
    if (wordCount > 200) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Message must be 200 words or fewer.",
        },
        { status: 400 }
      );
    }

    if (!parsed.data.recipientUserId && !parsed.data.recipientHandle) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "recipientUserId or recipientHandle is required.",
        },
        { status: 400 }
      );
    }

    const { directory } = await loadDirectory(access.companyId);

    const byId = new Map(directory.map((entry) => [entry.id, entry]));
    const byHandle = new Map(directory.map((entry) => [entry.mentionHandle, entry]));

    const recipientFromId = parsed.data.recipientUserId
      ? byId.get(parsed.data.recipientUserId)
      : null;
    const recipientFromHandle = parsed.data.recipientHandle
      ? byHandle.get(normalizeMentionHandle(parsed.data.recipientHandle))
      : null;

    const recipient = recipientFromId ?? recipientFromHandle;
    if (!recipient) {
      return NextResponse.json(
        { code: "USER_NOT_FOUND", message: "Recipient was not found in your company." },
        { status: 404 }
      );
    }
    if (!recipient.isActive) {
      return NextResponse.json(
        {
          code: "USER_INACTIVE",
          message: "Cannot send messages to an inactive user.",
        },
        { status: 400 }
      );
    }
    if (recipient.id === access.userId) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Cannot send a notification to yourself." },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(internalNotification)
      .values({
        companyId: access.companyId,
        senderUserId: access.userId,
        recipientUserId: recipient.id,
        message: parsed.data.message.trim(),
        contextTitle: null,
        contextUrl: null,
        isRead: false,
        deletedBySender: false,
        deletedByRecipient: false,
        deliveredAt: new Date(),
        readAt: null,
        updatedAt: new Date(),
      })
      .returning({
        id: internalNotification.id,
        createdAt: internalNotification.createdAt,
      });

    try {
      getNotificationRealtimeEmitter()?.emitCreated({
        recipientUserId: recipient.id,
        notificationId: created.id,
      });
    } catch {
      // Realtime publishing failures should not block persisted notifications.
    }

    return NextResponse.json({
      success: true,
      notification: created,
    });
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to send notification." },
      { status: 500 }
    );
  }
}
