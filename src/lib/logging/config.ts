import type { LogLevel, RuntimeKind } from "@/lib/logging/types";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

function readLevel(value: string | undefined): LogLevel {
  if (!value) return "info";
  const normalized = value.trim().toLowerCase();
  if (normalized in LEVEL_ORDER) return normalized as LogLevel;
  return "info";
}

export const loggingConfig = {
  appName: process.env.LOG_APP_NAME?.trim() || process.env.NEXT_PUBLIC_APP_NAME?.trim() || "msc-saas",
  serviceName: process.env.LOG_SERVICE_NAME?.trim() || "web",
  environment: process.env.NODE_ENV?.trim() || "development",
  release:
    process.env.LOG_RELEASE?.trim() ||
    process.env.NEXT_PUBLIC_RELEASE?.trim() ||
    process.env.npm_package_version?.trim() ||
    "dev",
  buildId: process.env.NEXT_BUILD_ID?.trim() || process.env.VERCEL_GIT_COMMIT_SHA?.trim(),
  level: readLevel(process.env.LOG_LEVEL),
  pretty:
    process.env.LOG_PRETTY?.trim().toLowerCase() === "true" ||
    process.env.NODE_ENV !== "production",
  runtime: (process.env.NEXT_RUNTIME?.trim() as RuntimeKind | undefined) || "server",
  maxFieldLength: Number(process.env.LOG_MAX_FIELD_LENGTH ?? "500"),
  maxArrayLength: Number(process.env.LOG_MAX_ARRAY_LENGTH ?? "20"),
  maxObjectKeys: Number(process.env.LOG_MAX_OBJECT_KEYS ?? "50"),
};

export function shouldLog(level: LogLevel) {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[loggingConfig.level];
}
