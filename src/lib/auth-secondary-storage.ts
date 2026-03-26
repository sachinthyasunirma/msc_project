import Redis from "ioredis";

type SecondaryStorage = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

type MemoryEntry = {
  value: string;
  expiresAt: number | null;
};

const MEMORY_MAX_ENTRIES = 5_000;
const REDIS_RETRY_COOLDOWN_MS = 60_000;
const memoryStore = new Map<string, MemoryEntry>();
const redisUrl = process.env.REDIS_URL?.trim();

let redisClient: Redis | null | undefined;
let redisConnectPromise: Promise<Redis | null> | null = null;
let redisDisabledUntil = 0;

function pruneMemoryStore(now = Date.now()) {
  if (memoryStore.size <= MEMORY_MAX_ENTRIES) return;

  for (const [key, entry] of memoryStore) {
    if ((entry.expiresAt !== null && entry.expiresAt <= now) || memoryStore.size > MEMORY_MAX_ENTRIES) {
      memoryStore.delete(key);
    }
    if (memoryStore.size <= MEMORY_MAX_ENTRIES) {
      break;
    }
  }
}

function getMemoryValue(key: string) {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

function setMemoryValue(key: string, value: string, ttl?: number) {
  const expiresAt = typeof ttl === "number" && ttl > 0 ? Date.now() + ttl * 1_000 : null;
  memoryStore.set(key, { value, expiresAt });
  pruneMemoryStore();
}

async function getRedisClient() {
  if (!redisUrl) return null;
  if (redisDisabledUntil > Date.now()) return null;
  if (redisClient) return redisClient;
  if (!redisConnectPromise) {
    const client = new Redis(redisUrl, {
      lazyConnect: true,
      connectTimeout: 500,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
    client.on("error", () => {
      if (redisClient === client) {
        redisClient = null;
      }
    });
    redisConnectPromise = client
      .connect()
      .then(() => {
        redisClient = client;
        return client;
      })
      .catch(() => {
        try {
          client.disconnect();
        } catch {
          // no-op
        }
        redisClient = null;
        redisDisabledUntil = Date.now() + REDIS_RETRY_COOLDOWN_MS;
        return null;
      })
      .finally(() => {
        redisConnectPromise = null;
      });
  }
  return redisConnectPromise;
}

const authSecondaryStorage: SecondaryStorage = {
  async get(key) {
    const client = await getRedisClient();
    if (client) {
      try {
        return await client.get(key);
      } catch {
        // fall back to in-memory storage
      }
    }
    return getMemoryValue(key);
  },
  async set(key, value, ttl) {
    setMemoryValue(key, value, ttl);

    const client = await getRedisClient();
    if (!client) return;

    try {
      if (typeof ttl === "number" && ttl > 0) {
        await client.set(key, value, "EX", ttl);
        return;
      }
      await client.set(key, value);
    } catch {
      // keep in-memory storage as fallback
    }
  },
  async delete(key) {
    memoryStore.delete(key);

    const client = await getRedisClient();
    if (!client) return;

    try {
      await client.del(key);
    } catch {
      // no-op
    }
  },
};

export function getAuthSecondaryStorage() {
  return authSecondaryStorage;
}
