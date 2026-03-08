# Production Logging Architecture

## Overview
This project uses a structured, tenant-aware logging architecture designed for SaaS production operations:

- `operational logs`: request lifecycle, external calls, DB operations.
- `error logs`: validation/auth/permission/business/infrastructure/internal failures.
- `audit logs`: security/business events with actor/tenant/target context.

All logs are correlation-aware (`requestId`, `traceId`) and redact sensitive values.

## Modules

- `src/lib/logging/logger.ts`
  - Central JSON logger (pretty in dev, JSON in production).
  - Levels: `debug | info | warn | error | fatal`.
- `src/lib/logging/context.ts`
  - Request-scoped context via `AsyncLocalStorage`.
  - Carries request + tenant + user context through services.
- `src/lib/logging/redaction.ts`
  - Redacts secrets (`password`, `token`, `authorization`, `cookie`, etc.).
  - Truncates oversized fields and nested objects.
- `src/lib/logging/request.ts`
  - Route wrapper `withApiLogging` for request start/end/failure with duration.
- `src/lib/logging/audit.ts`
  - `logAuditEvent(...)` schema for audit/business events.
- `src/lib/logging/external.ts`
  - `loggedFetch(...)` for third-party integration calls.
- `src/lib/logging/db.ts`
  - `withDbLogging(...)` wrapper for DB operation duration/failures.
- `src/lib/logging/client.ts`
  - Client-safe logger + runtime error capture.
- `src/app/api/logs/client/route.ts`
  - Receives sanitized client warn/error logs.

## Tenant-aware Context

`resolveAccess(...)` enriches request context with:

- `tenantId`
- `organizationId`
- `companyId`
- `userId`

So downstream logs automatically include tenant/user scope, enabling safe per-tenant incident investigation.

## Correlation IDs

- `src/middleware.ts` sets/propagates:
  - `x-request-id`
  - `x-trace-id`
- Route wrapper initializes request context from those headers.
- Response includes same IDs for client-side correlation.

## Redaction Rules

Automatic key-based redaction applies to fields containing:

- `password`
- `secret`
- `token`
- `authorization`
- `cookie`
- `api-key`
- `session`

Plus size controls:

- max field string length
- max array length
- max object keys
- max depth

## Environment Variables

See `.env.example`.

Important:

- `LOG_LEVEL` default is `info`.
- `LOG_PRETTY=true` is recommended only in development.
- Production should use structured JSON.

## Usage

### Route handler

Use `withApiLogging(...)`:

```ts
const getHandler = withApiLogging(
  { route: "/api/transports/[resource]", method: "GET", feature: "master-transport" },
  async (request, context) => {
    // business code
  }
);
```

### Service log

```ts
import { logger } from "@/lib/logging/logger";
logger.info("cache_refresh_started", { feature: "billing", eventType: "operational" });
```

### Audit log

```ts
import { logAuditEvent } from "@/lib/logging/audit";
logAuditEvent({
  eventName: "role.changed",
  action: "UPDATE_ROLE",
  outcome: "success",
  actorUserId: "usr_123",
  companyId: "cmp_456",
  targetResourceType: "role",
  targetResourceId: "role_1",
});
```

### External integration

```ts
await loggedFetch(url, init, {
  integration: "stripe",
  operation: "create-checkout-session",
});
```

### DB operation

```ts
const rows = await withDbLogging(
  { operation: "select", entity: "pre_tour_plan", feature: "pre-tour" },
  () => db.select().from(schema.preTourPlan)
);
```

## Rollout Guidance

1. Keep wrappers mandatory for new route handlers.
2. Add `withDbLogging(...)` for expensive queries only (avoid noisy logs).
3. Emit audit logs for auth/role/billing/admin/resource lifecycle events.
4. Keep metadata minimal and sanitized.
5. Track:
   - error rate
   - p95 request duration
   - cache hit/miss
   - tenant-specific incident patterns

## Vendor Integration

This architecture is vendor-neutral JSON logging.
You can ship stdout logs to Datadog/ELK/Loki, and layer Sentry/OpenTelemetry without changing app-level logging calls.
