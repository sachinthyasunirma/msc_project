# Production Hardening Notes

## What this pass hardened

- Added `Server-Timing`, `x-request-id`, and `x-trace-id` headers to API responses wrapped by `withApiLogging`.
- Added opt-in operation profiling with slow-path logs via `LOG_PROFILE_OPERATIONS` and `LOG_SLOW_OPERATION_MS`.
- Instrumented critical server paths:
  - dashboard shell loading
  - access-control base resolution
  - pre-tour list reads
- Tightened one broad accommodation invalidation path so room-type batch refresh no longer refetches season master data unnecessarily.
- Normalized the hotel system-location query onto the shared `accommodationKeys` factory.
- Added composite access-control indexes for the hottest authorization lookups.

## Remaining bottlenecks

### 1. Nested pre-tour records are still mostly unpaginated

The main `pre-tours` and `pre-tour-bins` list screens now have server-driven cursor pagination. The nested pre-tour editor is also lighter than before because it now fetches only the active plan header and stages guide/totals/technical sections after the day/item/addon data is ready. The next unresolved issue is that day/item/addon editor reads still pull large bounded arrays for a selected plan.

Recommended next step:

- add cursor-based or segmented loading for large `pre-tour-items`, `pre-tour-item-addons`, and related editor reads
- reduce `limit: 400/500/2000` usage in the plan management and clone flows

### 2. Legacy lint debt still blocks a clean production build

`src/modules/pre-tour/server/pre-tour-service.ts` still contains longstanding `no-explicit-any` violations. This hardening pass did not widen that debt, but it still needs to be resolved for a fully clean build pipeline.

### 3. Access resolution still depends on live database reads

The hot auth path is now safer and more observable, but each protected request still depends on user/company/role data from the database. That is acceptable for now, but long-term scale will benefit from a short-lived access snapshot or better edge/cache-aware access metadata strategy.

### 4. Realtime auth still uses internal HTTP session verification

The socket handshake is cached and time-bounded now, but the architecture still relies on an internal HTTP call for session verification. That is workable for current scale, but a signed socket token flow would be more efficient later.

## Suggested rollout checks

- enable `LOG_PROFILE_OPERATIONS=true` in staging
- set `LOG_SLOW_OPERATION_MS=150` or `200` temporarily for hotspot discovery
- run `drizzle-kit push` or the project’s normal migration flow to apply the new access-control indexes
- load test both the pre-tour list screens and the nested plan-management editor, because the editor is now the clearer remaining hotspot
