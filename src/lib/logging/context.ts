import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestContext } from "@/lib/logging/types";
import { createUuid } from "@/lib/runtime/uuid";

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

function ensureId(value: string | undefined) {
  return value && value.trim().length > 0 ? value.trim() : createUuid();
}

export function createRequestContext(seed?: Partial<RequestContext>): RequestContext {
  return {
    requestId: ensureId(seed?.requestId),
    traceId: ensureId(seed?.traceId),
    spanId: seed?.spanId,
    method: seed?.method,
    route: seed?.route,
    tenantId: seed?.tenantId,
    workspaceId: seed?.workspaceId,
    organizationId: seed?.organizationId,
    accountId: seed?.accountId,
    companyId: seed?.companyId,
    userId: seed?.userId,
    sessionId: seed?.sessionId,
    feature: seed?.feature,
    runtime: seed?.runtime || "server",
  };
}

export function runWithRequestContext<T>(
  seed: Partial<RequestContext> | undefined,
  fn: () => Promise<T> | T
) {
  const context = createRequestContext(seed);
  return requestContextStorage.run(context, fn);
}

export function getRequestContext() {
  return requestContextStorage.getStore();
}

export function appendRequestContext(patch: Partial<RequestContext>) {
  const current = requestContextStorage.getStore();
  if (!current) return;
  Object.assign(current, patch);
}
