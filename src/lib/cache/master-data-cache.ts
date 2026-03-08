import Redis from "ioredis";

type CacheEntry = {
  value: string;
  expiresAt: number;
};

const DEFAULT_TTL_SECONDS = 60;
const KEY_PREFIX = "md:v1";
const localCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

let redisClient: Redis | null = null;
let redisDisabled = false;

function nowMs() {
  return Date.now();
}

function toKey(key: string) {
  return `${KEY_PREFIX}:${key}`;
}

function encodeSegment(value: unknown) {
  return Buffer.from(JSON.stringify(value ?? null), "utf8").toString("base64url");
}

async function getRedisClient() {
  if (redisDisabled) return null;
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    redisDisabled = true;
    return null;
  }

  const client = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  });
  try {
    await client.connect();
    redisClient = client;
    return redisClient;
  } catch {
    redisDisabled = true;
    try {
      client.disconnect();
    } catch {
      // no-op
    }
    return null;
  }
}

function getLocal<T>(key: string): T | null {
  const entry = localCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= nowMs()) {
    localCache.delete(key);
    return null;
  }
  try {
    return JSON.parse(entry.value) as T;
  } catch {
    localCache.delete(key);
    return null;
  }
}

function setLocal<T>(key: string, value: T, ttlSeconds: number) {
  localCache.set(key, {
    value: JSON.stringify(value),
    expiresAt: nowMs() + ttlSeconds * 1000,
  });
}

function deleteLocalByPrefix(prefix: string) {
  for (const key of localCache.keys()) {
    if (key.startsWith(prefix)) {
      localCache.delete(key);
    }
  }
}

export function masterDataCachePrefix(moduleName: string, companyId: string) {
  return toKey(`${moduleName}:c:${companyId}:`);
}

export function masterDataListCacheKey(
  moduleName: string,
  companyId: string,
  resourceName: string,
  query: unknown
) {
  return `${masterDataCachePrefix(moduleName, companyId)}list:${resourceName}:q:${encodeSegment(query)}`;
}

export async function getOrSetMasterDataCache<T>(
  key: string,
  loader: () => Promise<T>,
  ttlSeconds = DEFAULT_TTL_SECONDS
) {
  const pending = inflight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const task = (async () => {
    const redis = await getRedisClient();
    if (redis) {
      try {
        const raw = await redis.get(key);
        if (raw !== null) {
          const parsed = JSON.parse(raw) as T;
          setLocal(key, parsed, ttlSeconds);
          return parsed;
        }
      } catch {
        // fall through to local/db path
      }
    }

    const local = getLocal<T>(key);
    if (local !== null) return local;

    const loaded = await loader();
    setLocal(key, loaded, ttlSeconds);
    if (redis) {
      try {
        await redis.set(key, JSON.stringify(loaded), "EX", ttlSeconds);
      } catch {
        // ignore cache write failures
      }
    }
    return loaded;
  })();

  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}

export async function invalidateMasterDataCacheByPrefixes(prefixes: string[]) {
  if (prefixes.length === 0) return;

  for (const prefix of prefixes) {
    deleteLocalByPrefix(prefix);
  }

  const redis = await getRedisClient();
  if (!redis) return;

  for (const prefix of prefixes) {
    let cursor = "0";
    do {
      try {
        const result = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 200);
        cursor = result[0] ?? "0";
        const keys = result[1] ?? [];
        if (keys.length > 0) {
          await redis.del(keys);
        }
      } catch {
        // ignore cache invalidation failures
        cursor = "0";
      }
    } while (cursor !== "0");
  }
}
