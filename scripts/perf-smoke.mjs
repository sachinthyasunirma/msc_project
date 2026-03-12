import { performance } from "node:perf_hooks";

function getArg(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const index = Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1);
  return values[index];
}

async function main() {
  const baseUrl = (process.env.PERF_BASE_URL || getArg("base-url") || "http://localhost:3000").replace(/\/$/, "");
  const cookie = process.env.PERF_COOKIE || getArg("cookie");
  const concurrency = Math.max(Number(process.env.PERF_CONCURRENCY || getArg("concurrency") || 8), 1);
  const requests = Math.max(Number(process.env.PERF_REQUESTS || getArg("requests") || 80), 1);
  const targets = (process.env.PERF_TARGETS ||
    getArg("targets") ||
    "/api/notifications/unread-count,/api/transports/locations?limit=50,/api/activities/activities?limit=50,/api/accommodation/hotels?limit=20,/api/pre-tours/technical-visits?limit=20")
    .split(",")
    .map((target) => target.trim())
    .filter(Boolean);

  if (!cookie) {
    throw new Error("Missing session cookie. Provide PERF_COOKIE or --cookie=...");
  }

  const latencies = [];
  const statusCounts = new Map();
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= requests) return;

      const target = targets[current % targets.length];
      const url = `${baseUrl}${target}`;
      const startedAt = performance.now();
      const response = await fetch(url, {
        headers: {
          cookie,
        },
      });
      await response.arrayBuffer();
      const durationMs = performance.now() - startedAt;

      latencies.push(durationMs);
      completed += 1;
      statusCounts.set(response.status, (statusCounts.get(response.status) || 0) + 1);
    }
  }

  const startedAt = performance.now();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const totalDurationMs = performance.now() - startedAt;
  latencies.sort((a, b) => a - b);

  const result = {
    baseUrl,
    concurrency,
    requests,
    completed,
    durationMs: Math.round(totalDurationMs),
    requestsPerSecond: Number((completed / (totalDurationMs / 1000)).toFixed(2)),
    latencyMs: {
      min: Number((latencies[0] || 0).toFixed(2)),
      p50: Number(percentile(latencies, 0.5).toFixed(2)),
      p95: Number(percentile(latencies, 0.95).toFixed(2)),
      p99: Number(percentile(latencies, 0.99).toFixed(2)),
      max: Number((latencies[latencies.length - 1] || 0).toFixed(2)),
    },
    statuses: Object.fromEntries(Array.from(statusCounts.entries()).sort((a, b) => a[0] - b[0])),
    targets,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        error: error instanceof Error ? error.message : "Unknown perf smoke failure",
      },
      null,
      2
    )
  );
  process.exit(1);
});
