import { loggingConfig } from "@/lib/logging/config";

const REDACTED = "[REDACTED]";

const SENSITIVE_KEY_PATTERNS = [
  "password",
  "passwd",
  "secret",
  "token",
  "authorization",
  "cookie",
  "set-cookie",
  "api-key",
  "apikey",
  "session",
  "privatekey",
  "creditcard",
  "ssn",
];

function isSensitiveKey(key: string) {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function truncateString(value: string) {
  if (value.length <= loggingConfig.maxFieldLength) return value;
  return `${value.slice(0, loggingConfig.maxFieldLength)}...[TRUNCATED]`;
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return truncateString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncateString(value.message),
      stack: value.stack ? truncateString(value.stack) : undefined,
    };
  }
  if (depth > 5) return "[MAX_DEPTH]";
  if (Array.isArray(value)) {
    return value.slice(0, loggingConfig.maxArrayLength).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, loggingConfig.maxObjectKeys);
    const out: Record<string, unknown> = {};
    for (const [key, entryValue] of entries) {
      if (isSensitiveKey(key)) {
        out[key] = REDACTED;
        continue;
      }
      out[key] = sanitizeValue(entryValue, depth + 1);
    }
    return out;
  }
  return String(value);
}

export function sanitizeForLog<T>(value: T): T {
  return sanitizeValue(value) as T;
}

export function sanitizeHeaders(headers: Headers | Record<string, string | undefined>) {
  const out: Record<string, string> = {};
  const headerEntries =
    headers instanceof Headers
      ? Array.from(headers.entries())
      : Object.entries(headers).map(([key, value]) => [key, String(value ?? "")]);

  for (const [key, value] of headerEntries) {
    if (isSensitiveKey(key)) {
      out[key] = REDACTED;
      continue;
    }
    out[key] = truncateString(String(value));
  }
  return out;
}
