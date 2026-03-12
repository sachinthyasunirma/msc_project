export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export type RuntimeKind = "server" | "client" | "edge";

export type RequestContext = {
  requestId: string;
  traceId: string;
  spanId?: string;
  method?: string;
  route?: string;
  tenantId?: string;
  workspaceId?: string;
  organizationId?: string;
  accountId?: string;
  companyId?: string;
  userId?: string;
  sessionId?: string;
  feature?: string;
  runtime?: RuntimeKind;
};

export type LogRecord = {
  timestamp: string;
  level: LogLevel;
  message: string;
  appName: string;
  serviceName: string;
  environment: string;
  release: string;
  buildId?: string;
  runtime: RuntimeKind;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  tenantId?: string;
  workspaceId?: string;
  organizationId?: string;
  accountId?: string;
  companyId?: string;
  userId?: string;
  sessionId?: string;
  method?: string;
  route?: string;
  feature?: string;
  eventType?: "operational" | "error" | "audit";
  [key: string]: unknown;
};

export type LoggerBindings = Partial<LogRecord>;

export type AuditOutcome = "success" | "failure" | "denied";

export type AuditEvent = {
  eventName: string;
  action: string;
  outcome: AuditOutcome;
  actorUserId?: string;
  tenantId?: string;
  workspaceId?: string;
  organizationId?: string;
  accountId?: string;
  companyId?: string;
  targetResourceType?: string;
  targetResourceId?: string;
  metadata?: Record<string, unknown>;
};
