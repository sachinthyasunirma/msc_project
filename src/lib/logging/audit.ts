import { getRequestContext } from "@/lib/logging/context";
import { logger } from "@/lib/logging/logger";
import { sanitizeForLog } from "@/lib/logging/redaction";
import type { AuditEvent } from "@/lib/logging/types";

export function logAuditEvent(event: AuditEvent) {
  const context = getRequestContext();
  logger.info("audit_event", {
    eventType: "audit",
    eventName: event.eventName,
    action: event.action,
    outcome: event.outcome,
    actorUserId: event.actorUserId || context?.userId,
    tenantId: event.tenantId || context?.tenantId,
    workspaceId: event.workspaceId || context?.workspaceId,
    organizationId: event.organizationId || context?.organizationId,
    accountId: event.accountId || context?.accountId,
    companyId: event.companyId || context?.companyId,
    targetResourceType: event.targetResourceType,
    targetResourceId: event.targetResourceId,
    metadata: sanitizeForLog(event.metadata || {}),
  });
}
