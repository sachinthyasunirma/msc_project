# Production Performance Checklist

## Targets

- Authenticated API p95 under 300 ms for common list/count endpoints
- Authenticated API p99 under 800 ms during normal business load
- Dashboard route interactive within 2.5 s on warm cache
- Cache-backed master-data lookups should avoid duplicate mount-time fetches
- No critical route should require more than one initial request burst for first paint

## Health Endpoints

- `GET /api/health/live`
  - Process liveness
- `GET /api/health/ready`
  - Database readiness probe

## Smoke Load Test

Run against a logged-in local or staging session:

```bash
PERF_BASE_URL=http://localhost:3000 \
PERF_COOKIE='better-auth.session_token=...' \
npm run perf:smoke
```

Optional overrides:

```bash
PERF_CONCURRENCY=16 \
PERF_REQUESTS=200 \
PERF_TARGETS='/api/notifications/unread-count,/api/accommodation/hotels?limit=20' \
npm run perf:smoke
```

## Database

- Add composite indexes for inbox, sent, and thread pair notification queries
- Run `EXPLAIN ANALYZE` on the highest-traffic list endpoints
- Confirm pagination queries use indexed order columns
- Avoid wide row selects for list views when detail data is not needed

## Caching

- Keep access-control and session reads dynamic
- Keep master-data lists cache-backed with explicit invalidation on writes
- Prefer server-side hydration over client mount fetches for first render
- Monitor Redis hit rate and invalidation behavior after writes

## Application

- Keep large dialogs and infrequent tools lazy-loaded
- Avoid internal API hops for initial data when a server component can read directly
- Use targeted refresh/invalidation after mutations instead of broad page reloads
- Add request logging to hot API routes for latency tracking

## Infrastructure

- Put static assets behind a CDN
- Use connection pooling for Postgres
- Configure autoscaling on CPU, memory, and request concurrency
- Set alerts for elevated API p95, DB CPU, and cache error rate

## Observability

- Capture per-route latency, status, and request volume
- Track DB query duration for hot endpoints
- Track cache hit/miss rate
- Track websocket connection count and notification fan-out volume

## Next Validation Pass

- Run smoke tests against staging with production-like data volume
- Compare latency before and after index deployment
- Review top 10 slowest API routes from request logs
- Profile any remaining large dashboard route chunks after deploy
