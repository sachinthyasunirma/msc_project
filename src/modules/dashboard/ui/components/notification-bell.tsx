"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Check, ChevronDown, Forward, Loader2, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notify";
import { useConfirm } from "@/components/app-confirm-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { subscribeToNotificationRealtime } from "@/modules/notifications/lib/realtime-client";

type NotificationItem = {
  id: string;
  senderUserId: string;
  senderName: string;
  senderEmail: string;
  senderHandle: string;
  message: string;
  contextTitle: string | null;
  contextUrl: string | null;
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

export function NotificationBell() {
  const confirm = useConfirm();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientUserId, setRecipientUserId] = useState<string>("");
  const [recipientHandleInput, setRecipientHandleInput] = useState("");
  const [message, setMessage] = useState("");
  const [hasLoadedList, setHasLoadedList] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications?limit=8", {
        cache: "no-store",
      });
      const body = (await response.json()) as {
        items?: NotificationItem[];
        unreadCount?: number;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(body.message || "Failed to load notifications.");
      }
      setItems(Array.isArray(body.items) ? body.items : []);
      setUnreadCount(Number(body.unreadCount ?? 0));
      setHasLoadedList(true);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/unread-count", {
        cache: "no-store",
      });
      const body = (await response.json()) as {
        unreadCount?: number;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(body.message || "Failed to load unread notifications.");
      }
      setUnreadCount(Number(body.unreadCount ?? 0));
    } catch {
      // Avoid noisy global errors for a lightweight badge refresh.
    }
  }, []);

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

  useEffect(() => {
    void loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadUnreadCount();
    }, 120000);
    return () => window.clearInterval(interval);
  }, [loadUnreadCount]);

  useEffect(() => {
    if (!open) return;
    if (!hasLoadedList) {
      void loadNotifications();
      return;
    }
    void loadNotifications();
  }, [hasLoadedList, loadNotifications, open]);

  useEffect(() => {
    if (!open) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadNotifications();
    }, 60000);
    return () => window.clearInterval(interval);
  }, [loadNotifications, open]);

  useEffect(() => {
    if (!open) return;
    return subscribeToNotificationRealtime(
      () => {
        void Promise.all([loadNotifications(), loadUnreadCount()]);
      },
      () => {
        void Promise.all([loadNotifications(), loadUnreadCount()]);
      }
    );
  }, [loadNotifications, loadUnreadCount, open]);

  useEffect(() => {
    if (!composeOpen) return;
    void loadRecipients();
  }, [composeOpen, loadRecipients]);

  const wordCount = useMemo(() => countWords(message), [message]);
  const canSend = (recipientUserId || recipientHandleInput.trim()) && wordCount > 0 && wordCount <= 200;

  const onMarkRead = async (item: NotificationItem) => {
    if (item.isRead || markingReadId === item.id) return;
    setMarkingReadId(item.id);
    try {
      const response = await fetch(`/api/notifications/${item.id}/read`, {
        method: "PATCH",
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(body.message || "Failed to mark notification as read.");
      }
      setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, isRead: true } : row)));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
      void loadUnreadCount();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to mark notification as read.");
    } finally {
      setMarkingReadId(null);
    }
  };

  const onDelete = async (item: NotificationItem) => {
    if (deletingId === item.id) return;
    const approved = await confirm({
      title: "Delete Message",
      description: "Delete this message from your list?",
      confirmText: "Delete",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!approved) return;

    setDeletingId(item.id);
    try {
      const response = await fetch(`/api/notifications/${item.id}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(body.message || "Failed to delete message.");
      }
      if (expandedId === item.id) {
        setExpandedId(null);
      }
      await Promise.all([loadNotifications(), loadUnreadCount()]);
      notify.success("Message deleted.");
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to delete message.");
    } finally {
      setDeletingId(null);
    }
  };

  const onForward = (item: NotificationItem) => {
    setRecipientUserId("");
    setRecipientHandleInput("");
    setMessage(`FWD from @${item.senderHandle} (${formatDateTime(item.createdAt)}):\n${item.message}`);
    setComposeOpen(true);
  };

  const onSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const selected = recipients.find((entry) => entry.id === recipientUserId);
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientUserId: recipientUserId || undefined,
          recipientHandle: recipientUserId ? undefined : recipientHandleInput,
          message,
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(body.message || "Failed to send notification.");
      }
      notify.success(
        selected
          ? `Message sent to @${selected.mentionHandle}.`
          : "Message sent successfully."
      );
      setComposeOpen(false);
      setRecipientUserId("");
      setRecipientHandleInput("");
      setMessage("");
      await Promise.all([loadNotifications(), loadUnreadCount()]);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to send notification.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button className="relative size-9" variant="outline">
            <Bell className="size-4" />
            {unreadCount > 0 ? (
              <Badge className="absolute -top-2 -right-2 h-5 min-w-5 px-1 text-[10px]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[min(96vw,460px)] p-0">
          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">
                Internal communication with @username
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{unreadCount} unread</Badge>
              <Button size="sm" variant="outline" onClick={() => setComposeOpen(true)}>
                <Send className="mr-1 size-3.5" />
                Message
              </Button>
            </div>
          </div>
          <Separator />
          <ScrollArea className="h-[430px]">
            <div className="p-2">
              {loading ? (
                <div className="flex items-center justify-center p-5 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading notifications...
                </div>
              ) : items.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </div>
              ) : (
                <div className="rounded-md border">
                  {items.map((item) => {
                    const expanded = expandedId === item.id;
                    return (
                      <div key={item.id} className="border-b last:border-b-0">
                        <button
                          type="button"
                          onClick={() => setExpandedId((current) => (current === item.id ? null : item.id))}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-muted/40",
                            expanded && "bg-muted/35"
                          )}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {!item.isRead ? <span className="size-2 rounded-full bg-primary" /> : null}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {item.senderName}
                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                  @{item.senderHandle}
                                </span>
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{item.message}</p>
                            </div>
                          </div>
                          <p className="shrink-0 text-[11px] text-muted-foreground">
                            {formatDateTime(item.createdAt)}
                          </p>
                          <ChevronDown
                            className={cn(
                              "size-3.5 shrink-0 text-muted-foreground transition-transform",
                              expanded && "rotate-180"
                            )}
                          />
                        </button>
                        {expanded ? (
                          <div className="space-y-3 border-t bg-background px-4 py-3">
                            <p className="whitespace-pre-wrap text-sm leading-6">{item.message}</p>
                            <div className="flex items-center justify-end gap-1.5">
                              {!item.isRead ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 rounded-md border bg-background shadow-sm"
                                  title="Mark as read"
                                  disabled={markingReadId === item.id}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void onMarkRead(item);
                                  }}
                                >
                                  <Check className="size-3.5" />
                                </Button>
                              ) : null}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 rounded-md border bg-background shadow-sm"
                                title="Forward message"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onForward(item);
                                }}
                              >
                                <Forward className="size-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 rounded-md border bg-background shadow-sm text-destructive hover:text-destructive"
                                title="Delete message"
                                disabled={deletingId === item.id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void onDelete(item);
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
          <Separator />
          <div className="p-2">
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                setOpen(false);
                router.push("/notifications");
              }}
            >
              More Notifications
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Internal Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Recipient</Label>
              <Select value={recipientUserId} onValueChange={setRecipientUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user by @username" />
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
            <div className="space-y-1">
              <Label>Or type @username</Label>
              <Input
                value={recipientHandleInput}
                disabled={Boolean(recipientUserId)}
                onChange={(event) => setRecipientHandleInput(event.target.value)}
                placeholder="@username"
              />
            </div>
            <div className="space-y-1">
              <Label>Message (max 200 words)</Label>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Type a short internal update..."
                className="min-h-28"
              />
              <p className={`text-xs ${wordCount > 200 ? "text-destructive" : "text-muted-foreground"}`}>
                {wordCount}/200 words
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onSend()} disabled={!canSend || sending}>
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
