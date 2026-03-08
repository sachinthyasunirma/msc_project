"use client";

import { sanitizeForLog } from "@/lib/logging/redaction";

type ClientLevel = "debug" | "info" | "warn" | "error";

type ClientLogPayload = {
  level: ClientLevel;
  message: string;
  feature?: string;
  metadata?: Record<string, unknown>;
  route?: string;
};

function sendToServer(payload: ClientLogPayload) {
  const body = JSON.stringify(sanitizeForLog(payload));
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/logs/client", body);
    return;
  }
  void fetch("/api/logs/client", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}

export const clientLogger = {
  debug(message: string, metadata?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(message, metadata ?? {});
    }
  },
  info(message: string, metadata?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      console.info(message, metadata ?? {});
    }
  },
  warn(message: string, metadata?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(message, metadata ?? {});
      return;
    }
    sendToServer({ level: "warn", message, metadata, route: window.location.pathname });
  },
  error(message: string, metadata?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      console.error(message, metadata ?? {});
      return;
    }
    sendToServer({ level: "error", message, metadata, route: window.location.pathname });
  },
};

export function initClientErrorLogging(feature = "ui") {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (event) => {
    clientLogger.error("client_runtime_error", {
      feature,
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    clientLogger.error("client_unhandled_rejection", {
      feature,
      reason:
        event.reason instanceof Error
          ? { name: event.reason.name, message: event.reason.message }
          : String(event.reason),
    });
  });
}
