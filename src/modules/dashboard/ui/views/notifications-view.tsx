"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Check, CheckCheck, Loader2, RefreshCw, Send, Trash2, Users } from "lucide-react";
import { notify } from "@/lib/notify";
import { useConfirm } from "@/components/app-confirm-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { subscribeToNotificationRealtime } from "@/modules/notifications/lib/realtime-client";

type ThreadItem = {
  peerUserId: string;
  peerName: string;
  peerEmail: string;
  peerHandle: string;
  lastMessageId: string;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderUserId: string;
  unreadCount: number;
};

type ConversationMessage = {
  id: string;
  senderUserId: string;
  recipientUserId: string;
  message: string;
  isRead: boolean;
  deliveredAt: string;
  readAt: string | null;
  createdAt: string;
};

type Recipient = {
  id: string;
  name: string;
  email: string;
  mentionHandle: string;
  isActive: boolean;
};

type ConversationPeer = {
  id: string;
  name: string;
  email: string;
  mentionHandle: string;
  isActive: boolean;
};

function countWords(text: string) {
  const normalized = text.trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).length;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDayLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function NotificationsView() {
  const confirm = useConfirm();
  const THREAD_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [threadQuery, setThreadQuery] = useState("");
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [threadsUnreadCount, setThreadsUnreadCount] = useState(0);
  const [totalThreads, setTotalThreads] = useState(0);
  const [threadPage, setThreadPage] = useState(1);
  const [threadPageSize, setThreadPageSize] = useState<number>(20);
  const [selectedPeerId, setSelectedPeerId] = useState<string>("");
  const [chatOpen, setChatOpen] = useState(false);

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [conversationPeer, setConversationPeer] = useState<ConversationPeer | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [conversationUnreadFromPeer, setConversationUnreadFromPeer] = useState(0);

  const [message, setMessage] = useState("");

  const selectedThread = useMemo(
    () => threads.find((item) => item.peerUserId === selectedPeerId) ?? null,
    [threads, selectedPeerId]
  );
  const threadTotalPages = Math.max(1, Math.ceil(totalThreads / threadPageSize));
  const threadFrom = totalThreads === 0 ? 0 : (threadPage - 1) * threadPageSize + 1;
  const threadTo = Math.min(threadPage * threadPageSize, totalThreads);
  const wordCount = useMemo(() => countWords(message), [message]);
  const canSend = Boolean(selectedPeerId) && wordCount > 0 && wordCount <= 200;

  const loadRecipients = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/recipients", {
        cache: "no-store",
      });
      const body = (await response.json()) as { recipients?: Recipient[]; message?: string };
      if (!response.ok) {
        throw new Error(body.message || "Failed to load recipients.");
      }
      setRecipients(Array.isArray(body.recipients) ? body.recipients : []);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load recipients.");
    }
  }, []);

  const loadThreads = useCallback(async () => {
    setThreadsLoading(true);
    try {
      const params = new URLSearchParams({
        view: "threads",
        limit: String(threadPageSize),
        offset: String((threadPage - 1) * threadPageSize),
      });
      if (threadQuery.trim()) params.set("q", threadQuery.trim());

      const response = await fetch(`/api/notifications?${params.toString()}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as {
        items?: ThreadItem[];
        unreadCount?: number;
        totalCount?: number;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(body.message || "Failed to load conversations.");
      }

      const threadItems = Array.isArray(body.items) ? body.items : [];
      setThreads(threadItems);
      setThreadsUnreadCount(Number(body.unreadCount ?? 0));
      setTotalThreads(Number(body.totalCount ?? 0));

      setSelectedPeerId((current) => {
        if (current) return current;
        if (threadItems[0]) return threadItems[0].peerUserId;
        return "";
      });
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load conversations.");
    } finally {
      setThreadsLoading(false);
    }
  }, [threadPage, threadPageSize, threadQuery]);

  const loadConversation = useCallback(
    async (peerUserId: string, options?: { older?: boolean; before?: string }) => {
      if (!peerUserId) return;
      const older = Boolean(options?.older);
      const beforeCursor = options?.before;

      if (older) {
        setLoadingOlder(true);
      } else {
        setConversationLoading(true);
      }

      try {
        const params = new URLSearchParams({
          view: "conversation",
          peerUserId,
          limit: "25",
        });
        if (older && beforeCursor) {
          params.set("older", "true");
          params.set("before", beforeCursor);
        }

        const response = await fetch(`/api/notifications?${params.toString()}`, {
          cache: "no-store",
        });
        const body = (await response.json()) as {
          peer?: ConversationPeer;
          items?: ConversationMessage[];
          hasMoreOlder?: boolean;
          unreadFromPeer?: number;
          message?: string;
        };
        if (!response.ok) {
          throw new Error(body.message || "Failed to load message history.");
        }

        const incoming = Array.isArray(body.items) ? body.items : [];
        const ascending = [...incoming].reverse();
        setConversationPeer(body.peer ?? null);
        setHasMoreOlder(Boolean(body.hasMoreOlder));
        setConversationUnreadFromPeer(Number(body.unreadFromPeer ?? 0));

        if (older) {
          setMessages((prev) => [...ascending, ...prev]);
        } else {
          setMessages(ascending);
        }

        if (!older && Number(body.unreadFromPeer ?? 0) > 0) {
          await fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ peerUserId }),
          });
        }
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to load message history.");
      } finally {
        if (older) {
          setLoadingOlder(false);
        } else {
          setConversationLoading(false);
        }
      }
    },
    []
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([loadThreads(), loadRecipients()]);
  }, [loadRecipients, loadThreads]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!selectedPeerId) {
      setConversationPeer(null);
      setMessages([]);
      setHasMoreOlder(false);
      setConversationUnreadFromPeer(0);
      return;
    }
    void loadConversation(selectedPeerId);
  }, [selectedPeerId, loadConversation]);

  useEffect(() => {
    setThreadPage(1);
  }, [threadQuery, threadPageSize]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadThreads();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [threadQuery, loadThreads]);

  useEffect(() => {
    return subscribeToNotificationRealtime(
      () => {
        void loadThreads();
        if (selectedPeerId) {
          void loadConversation(selectedPeerId);
        }
      },
      () => {
        void loadThreads();
        if (selectedPeerId) {
          void loadConversation(selectedPeerId);
        }
      }
    );
  }, [loadConversation, loadThreads, selectedPeerId]);

  const onSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientUserId: selectedPeerId,
          message: message.trim(),
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message || "Failed to send message.");
      setMessage("");
      await Promise.all([loadThreads(), loadConversation(selectedPeerId)]);
      notify.success("Message sent.");
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const onDelete = async (id: string) => {
    const approved = await confirm({
      title: "Delete Message",
      description: "Delete this message from your list?",
      confirmText: "Delete",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!approved) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message || "Failed to delete message.");
      if (selectedPeerId) {
        await Promise.all([loadThreads(), loadConversation(selectedPeerId)]);
      } else {
        await loadThreads();
      }
      notify.success("Message deleted.");
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete message.");
    } finally {
      setDeletingId(null);
    }
  };

  const openChatForPeer = (peerUserId: string) => {
    setSelectedPeerId(peerUserId);
    setChatOpen(true);
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-4" />
              Internal Messages
            </CardTitle>
            <CardDescription>
              Person-wise messaging. Chat history starts with the last month, and older messages load on demand.
            </CardDescription>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">Unread: {threadsUnreadCount}</Badge>
              <Badge variant="outline">Conversations: {totalThreads}</Badge>
              <Badge variant="secondary">Word Limit: 200</Badge>
            </div>
          </div>
          <Button
            variant="outline"
            className="master-refresh-btn"
            onClick={() => void refreshAll()}
            disabled={threadsLoading || conversationLoading}
          >
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4" />
                People Messages
              </CardTitle>
              <CardDescription>
                Full list view. Open a chat from any row to continue in the right-side messenger panel.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
              <Input
                value={threadQuery}
                onChange={(event) => setThreadQuery(event.target.value)}
                placeholder="Search person or message..."
                className="md:w-72"
              />
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">Start New Chat</Label>
                <Select
                  value={selectedPeerId}
                  onValueChange={(value) => {
                    openChatForPeer(value);
                  }}
                >
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Select @username" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipients
                      .filter((entry) => entry.isActive)
                      .map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          @{entry.mentionHandle} - {entry.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {threadsLoading ? (
            <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading conversations...
            </div>
          ) : threads.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No conversations found.</p>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border">
                <div className="grid grid-cols-[minmax(0,230px)_minmax(0,1fr)_110px_90px] gap-3 border-b bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <p>Person</p>
                  <p>Last Message</p>
                  <p>Time</p>
                  <p className="text-right">Unread</p>
                </div>
                <div className="max-h-[560px] overflow-y-auto">
                  {threads.map((thread) => (
                    <button
                      key={thread.peerUserId}
                      type="button"
                      onClick={() => openChatForPeer(thread.peerUserId)}
                      className={cn(
                        "grid w-full grid-cols-[minmax(0,230px)_minmax(0,1fr)_110px_90px] gap-3 border-b px-3 py-2 text-left transition hover:bg-muted/40 last:border-b-0",
                        selectedPeerId === thread.peerUserId && "bg-muted/50"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{thread.peerName}</p>
                        <p className="truncate text-xs text-muted-foreground">@{thread.peerHandle}</p>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{thread.lastMessage}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDateTime(thread.lastMessageAt)}</p>
                      <div className="flex items-center justify-end">
                        {thread.unreadCount > 0 ? (
                          <Badge className="h-5 min-w-5 px-1 text-[10px]">{thread.unreadCount}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Showing {threadFrom}-{threadTo} of {totalThreads}
                  </p>
                  <Select
                    value={String(threadPageSize)}
                    onValueChange={(value) => {
                      setThreadPageSize(Number(value));
                    }}
                  >
                    <SelectTrigger className="h-8 w-[78px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {THREAD_PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={threadPage <= 1}
                    onClick={() => setThreadPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {threadPage}/{threadTotalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={threadPage >= threadTotalPages}
                    onClick={() => setThreadPage((prev) => Math.min(threadTotalPages, prev + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="right" className="w-[min(96vw,560px)] sm:max-w-[540px] gap-0 p-0">
          {!selectedPeerId ? (
            <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
              Select a person to open chat.
            </div>
          ) : (
            <>
              <SheetHeader className="border-b bg-background pr-12">
                <SheetTitle>{conversationPeer?.name ?? selectedThread?.peerName ?? "Conversation"}</SheetTitle>
                <SheetDescription>
                  @{conversationPeer?.mentionHandle ?? selectedThread?.peerHandle ?? "user"} •{" "}
                  {conversationPeer?.email ?? selectedThread?.peerEmail ?? ""}
                </SheetDescription>
                {conversationUnreadFromPeer > 0 ? (
                  <div>
                    <Badge variant="outline">{conversationUnreadFromPeer} new from this person</Badge>
                  </div>
                ) : null}
              </SheetHeader>

              <div className="flex min-h-0 flex-1 flex-col p-4">
                <div className="min-h-0 flex-1 rounded-md border">
                  <div className="h-full overflow-y-auto p-3">
                    <div className="mb-3 flex justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!hasMoreOlder || loadingOlder || conversationLoading}
                        onClick={() => {
                          if (selectedPeerId) {
                            void loadConversation(selectedPeerId, {
                              older: true,
                              before: messages[0]?.createdAt,
                            });
                          }
                        }}
                      >
                        {loadingOlder ? "Loading..." : hasMoreOlder ? "Load Older Messages" : "No Older Messages"}
                      </Button>
                    </div>
                    {conversationLoading ? (
                      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Loading messages...
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="p-8 text-center text-sm text-muted-foreground">
                        No messages in the last month. Use Load Older Messages if you need previous history.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((item, index) => {
                          const previous = messages[index - 1];
                          const isNewDay =
                            !previous ||
                            new Date(previous.createdAt).toDateString() !==
                              new Date(item.createdAt).toDateString();
                          const isOwn = item.recipientUserId === selectedPeerId;

                          return (
                            <div key={item.id} className="space-y-1">
                              {isNewDay ? (
                                <p className="py-1 text-center text-xs text-muted-foreground">
                                  {formatDayLabel(item.createdAt)}
                                </p>
                              ) : null}
                              <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                                <div
                                  className={cn(
                                    "group max-w-[82%] rounded-lg border px-3 py-2",
                                    isOwn
                                      ? "border-primary/20 bg-primary/10 text-foreground"
                                      : "border-border bg-background"
                                  )}
                                >
                                  <p className="whitespace-pre-wrap text-sm leading-6">{item.message}</p>
                                  <div className="mt-1 flex items-center justify-between gap-2">
                                    <p className="text-[11px] text-muted-foreground">
                                      {formatDateTime(item.createdAt)}
                                    </p>
                                    <div className="flex items-center gap-1">
                                      {isOwn ? (
                                        item.isRead ? (
                                          <CheckCheck className="size-3.5 text-sky-600" />
                                        ) : (
                                          <Check className="size-3.5 text-muted-foreground" />
                                        )
                                      ) : null}
                                      {isOwn && !item.isRead ? (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="size-6 rounded-md border bg-background opacity-0 shadow-sm transition group-hover:opacity-100"
                                          title="Delete message"
                                          disabled={deletingId === item.id}
                                          onClick={() => {
                                            void onDelete(item.id);
                                          }}
                                        >
                                          <Trash2 className="size-3.5" />
                                        </Button>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-2 rounded-md border bg-background p-3">
                  <Label>Message</Label>
                  <Textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={`Message @${conversationPeer?.mentionHandle ?? selectedThread?.peerHandle ?? "user"}...`}
                    className="min-h-24"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-xs ${wordCount > 200 ? "text-destructive" : "text-muted-foreground"}`}>
                      {wordCount}/200 words
                    </p>
                    <Button onClick={() => void onSend()} disabled={!canSend || sending}>
                      <Send className="mr-2 size-4" />
                      {sending ? "Sending..." : "Send Message"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
