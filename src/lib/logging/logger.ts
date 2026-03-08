import { loggingConfig, shouldLog } from "@/lib/logging/config";
import { getRequestContext } from "@/lib/logging/context";
import { sanitizeForLog } from "@/lib/logging/redaction";
import type { LogLevel, LogRecord, LoggerBindings, RuntimeKind } from "@/lib/logging/types";

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\u001b[90m",
  info: "\u001b[36m",
  warn: "\u001b[33m",
  error: "\u001b[31m",
  fatal: "\u001b[35m",
};
const RESET = "\u001b[0m";

function nowIso() {
  return new Date().toISOString();
}

function writeLine(line: string) {
  const stdout = (globalThis as { process?: { stdout?: { write?: (chunk: string) => void } } })
    .process?.stdout;
  if (stdout && typeof stdout.write === "function") {
    stdout.write(`${line}\n`);
    return;
  }
  // Edge/instrumentation/browser-safe fallback.
  console.log(line);
}

function formatPretty(record: LogRecord) {
  const levelColor = LEVEL_COLORS[record.level] ?? "";
  const levelText = `${levelColor}${record.level.toUpperCase()}${RESET}`;
  const base = `${record.timestamp} ${levelText} ${record.message}`;
  const context = {
    requestId: record.requestId,
    traceId: record.traceId,
    companyId: record.companyId,
    userId: record.userId,
    route: record.route,
    method: record.method,
    feature: record.feature,
  };
  return `${base} ${JSON.stringify(sanitizeForLog(context))}`;
}

function buildRecord(
  level: LogLevel,
  message: string,
  bindings: LoggerBindings,
  runtime?: RuntimeKind
): LogRecord {
  const requestContext = getRequestContext();
  const record: LogRecord = {
    timestamp: nowIso(),
    level,
    message,
    appName: loggingConfig.appName,
    serviceName: loggingConfig.serviceName,
    environment: loggingConfig.environment,
    release: loggingConfig.release,
    buildId: loggingConfig.buildId,
    runtime: runtime || requestContext?.runtime || loggingConfig.runtime,
    requestId: requestContext?.requestId,
    traceId: requestContext?.traceId,
    spanId: requestContext?.spanId,
    tenantId: requestContext?.tenantId,
    workspaceId: requestContext?.workspaceId,
    organizationId: requestContext?.organizationId,
    accountId: requestContext?.accountId,
    companyId: requestContext?.companyId,
    userId: requestContext?.userId,
    sessionId: requestContext?.sessionId,
    route: requestContext?.route,
    method: requestContext?.method,
    feature: requestContext?.feature,
    ...bindings,
  };
  return sanitizeForLog(record);
}

class BaseLogger {
  constructor(private readonly bindings: LoggerBindings = {}) {}

  child(bindings: LoggerBindings) {
    return new BaseLogger({ ...this.bindings, ...bindings });
  }

  log(level: LogLevel, message: string, data?: LoggerBindings, runtime?: RuntimeKind) {
    if (!shouldLog(level)) return;
    const record = buildRecord(level, message, { ...this.bindings, ...(data ?? {}) }, runtime);
    if (loggingConfig.pretty) {
      writeLine(formatPretty(record));
      return;
    }
    writeLine(JSON.stringify(record));
  }

  debug(message: string, data?: LoggerBindings) {
    this.log("debug", message, data);
  }

  info(message: string, data?: LoggerBindings) {
    this.log("info", message, data);
  }

  warn(message: string, data?: LoggerBindings) {
    this.log("warn", message, data);
  }

  error(message: string, data?: LoggerBindings) {
    this.log("error", message, data);
  }

  fatal(message: string, data?: LoggerBindings) {
    this.log("fatal", message, data);
  }
}

export const logger = new BaseLogger();
