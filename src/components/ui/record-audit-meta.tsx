"use client";

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
  if (!row) return null;
  const value = row as Record<string, unknown>;

  const updatedBy =
    readString(value.updatedByName) ||
    readString(value.updatedBy) ||
    readString(value.updatedByEmail) ||
    readString(value.updated_by_name) ||
    readString(value.updated_by) ||
    readString(value.createdByName) ||
    readString(value.createdBy) ||
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
