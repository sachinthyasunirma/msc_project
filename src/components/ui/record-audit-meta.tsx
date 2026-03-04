"use client";

import { authClient } from "@/lib/auth-client";

type Props = {
  row?: object | null;
  className?: string;
};

function readString(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function formatDateTime(value: unknown) {
  const text = readString(value);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function RecordAuditMeta({ row, className }: Props) {
  const { data: session } = authClient.useSession();
  if (!row) return null;
  const value = row as Record<string, unknown>;
  const sessionUser = session?.user as
    | { name?: string | null; email?: string | null; id?: string | null }
    | undefined;

  const sessionName = readString(sessionUser?.name) || readString(sessionUser?.email);

  const updatedBy =
    readString(value.updatedByName) ||
    readString(value.updatedByUserName) ||
    readString(value.updatedByDisplayName) ||
    readString(value.updatedBy) ||
    readString(value.updatedByEmail) ||
    readString(value.updatedByUserEmail) ||
    readString(value.updated_by_name) ||
    readString(value.updated_by_user_name) ||
    readString(value.updated_by) ||
    readString(value.updated_by_email) ||
    readString(value.createdByName) ||
    readString(value.createdByUserName) ||
    readString(value.createdByDisplayName) ||
    readString(value.createdBy) ||
    readString(value.createdByEmail) ||
    readString(value.created_by_name) ||
    readString(value.created_by_user_name) ||
    readString(value.created_by) ||
    readString(value.created_by_email) ||
    sessionName ||
    "System";

  const updatedAt =
    formatDateTime(value.updatedAt) ||
    formatDateTime(value.updated_at) ||
    formatDateTime(value.createdAt) ||
    formatDateTime(value.created_at);

  if (!updatedAt) return null;

  return (
    <p className={`text-xs text-muted-foreground ${className ?? ""}`.trim()}>
      Updated By: {updatedBy} | Updated At: {updatedAt}
    </p>
  );
}
