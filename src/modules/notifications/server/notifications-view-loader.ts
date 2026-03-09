import { and, desc, eq, gte, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { internalNotification, user } from "@/db/schema";
import { resolveAccess } from "@/lib/security/access-control";
import { buildMentionDirectory } from "@/modules/notifications/lib/notification-utils";
import type {
  ConversationMessage,
  ConversationPeer,
  NotificationsViewInitialData,
  Recipient,
  ThreadItem,
} from "@/modules/notifications/shared/notifications-view-types";

type DirectoryEntry = Recipient;

type ThreadSummaryRow = {
  peer_user_id: string;
  last_message_id: string;
  last_message: string;
  last_message_at: string | Date;
  last_sender_user_id: string;
  unread_count: number | string;
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

async function loadThreads(
  access: Awaited<ReturnType<typeof resolveAccess>>,
  directoryData: Awaited<ReturnType<typeof loadDirectory>>
) {
  const summaryResult = await db.execute(sql<ThreadSummaryRow>`
    with visible_notifications as (
      select
        n.id,
        n.sender_user_id,
        n.recipient_user_id,
        n.message,
        n.is_read,
        n.created_at,
        case
          when n.sender_user_id = ${access.userId} then n.recipient_user_id
          else n.sender_user_id
        end as peer_user_id
      from internal_notification n
      where
        n.company_id = ${access.companyId}
        and (
          (n.sender_user_id = ${access.userId} and n.deleted_by_sender = false)
          or
          (n.recipient_user_id = ${access.userId} and n.deleted_by_recipient = false)
        )
    ),
    ranked_threads as (
      select
        peer_user_id,
        id as last_message_id,
        message as last_message,
        created_at as last_message_at,
        sender_user_id as last_sender_user_id,
        sum(
          case
            when sender_user_id = peer_user_id
              and recipient_user_id = ${access.userId}
              and is_read = false
            then 1
            else 0
          end
        ) over (partition by peer_user_id) as unread_count,
        row_number() over (
          partition by peer_user_id
          order by created_at desc, id desc
        ) as row_number
      from visible_notifications
    )
    select
      peer_user_id,
      last_message_id,
      last_message,
      last_message_at,
      last_sender_user_id,
      unread_count
    from ranked_threads
    where row_number = 1
    order by last_message_at desc, last_message_id desc
  `);

  const summaryRows = (
    Array.isArray(summaryResult)
      ? summaryResult
      : "rows" in summaryResult
        ? summaryResult.rows
        : []
  ) as ThreadSummaryRow[];

  const items: ThreadItem[] = summaryRows.slice(0, 20).map((thread) => {
    const peer = directoryData.byUserId.get(thread.peer_user_id);
    return {
      peerUserId: thread.peer_user_id,
      peerName: peer?.name ?? "Unknown User",
      peerEmail: peer?.email ?? "",
      peerHandle: directoryData.mentionByUserId.get(thread.peer_user_id) ?? "user",
      lastMessageId: thread.last_message_id,
      lastMessage: thread.last_message,
      lastMessageAt: new Date(thread.last_message_at).toISOString(),
      lastSenderUserId: thread.last_sender_user_id,
      unreadCount: Number(thread.unread_count ?? 0),
    };
  });

  return {
    items,
    totalCount: summaryRows.length,
    unreadCount: summaryRows.reduce((sum, row) => sum + Number(row.unread_count ?? 0), 0),
  };
}

async function loadConversation(
  access: Awaited<ReturnType<typeof resolveAccess>>,
  directoryData: Awaited<ReturnType<typeof loadDirectory>>,
  peerUserId: string
) {
  if (!peerUserId) {
    return {
      peer: null,
      items: [] as ConversationMessage[],
      hasMoreOlder: false,
      unreadFromPeer: 0,
    };
  }

  const peer = directoryData.byUserId.get(peerUserId);
  if (!peer || peer.id === access.userId) {
    return {
      peer: null,
      items: [] as ConversationMessage[],
      hasMoreOlder: false,
      unreadFromPeer: 0,
    };
  }

  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

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
    .where(
      and(
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
        gte(internalNotification.createdAt, monthAgo)
      )
    )
    .orderBy(desc(internalNotification.createdAt))
    .limit(26);

  const unreadRows = await db
    .select({ id: internalNotification.id })
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

  return {
    peer: {
      id: peer.id,
      name: peer.name,
      email: peer.email,
      mentionHandle: directoryData.mentionByUserId.get(peer.id) ?? "user",
      isActive: peer.isActive,
    } satisfies ConversationPeer,
    items: rows
      .slice(0, 25)
      .reverse()
      .map((row) => ({
        id: row.id,
        senderUserId: row.senderUserId,
        recipientUserId: row.recipientUserId,
        message: row.message,
        isRead: row.isRead,
        deliveredAt: row.deliveredAt.toISOString(),
        readAt: row.readAt ? row.readAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
      })),
    hasMoreOlder: rows.length > 25,
    unreadFromPeer: unreadRows.length,
  };
}

export async function loadNotificationsViewInitialData(): Promise<NotificationsViewInitialData | null> {
  try {
    const requestHeaders = await headers();
    const access = await resolveAccess(requestHeaders);
    const directoryData = await loadDirectory(access.companyId);
    const recipients = directoryData.directory.filter((entry) => entry.id !== access.userId);
    const threadsResult = await loadThreads(access, directoryData);
    const selectedPeerId = threadsResult.items[0]?.peerUserId ?? "";
    const conversation = await loadConversation(access, directoryData, selectedPeerId);

    return {
      threads: threadsResult.items,
      threadsUnreadCount: threadsResult.unreadCount,
      totalThreads: threadsResult.totalCount,
      recipients,
      selectedPeerId,
      conversationPeer: conversation.peer,
      messages: conversation.items,
      hasMoreOlder: conversation.hasMoreOlder,
      conversationUnreadFromPeer: conversation.unreadFromPeer,
    };
  } catch {
    return null;
  }
}
