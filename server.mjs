import { createHash } from "node:crypto";
import http from "node:http";
import next from "next";
import { neon } from "@neondatabase/serverless";
import { getCookieCache, getSessionCookie } from "better-auth/cookies";
import { constantTimeEqual, makeSignature } from "better-auth/crypto";
import { Server as SocketIOServer } from "socket.io";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const redisUrl = process.env.REDIS_URL?.trim();
const enableRealtime = !dev || process.env.ENABLE_DEV_REALTIME === "true";
const logMemoryUsage = process.env.LOG_MEMORY_USAGE === "1";
const authSecret = process.env.BETTER_AUTH_SECRET?.trim() || "";
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
const SOCKET_SESSION_CACHE_TTL_MS = 15_000;
const SOCKET_SESSION_CACHE_MAX_ENTRIES = 512;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const socketSessionCache = new Map();
let shuttingDown = false;
let io = null;
let shutdownPromise = null;
let redisClients = [];
let realtimeReady = !enableRealtime;
let redisReady = !redisUrl;

function hashCookie(cookie) {
  return createHash("sha1").update(cookie).digest("hex");
}

function pruneSocketSessionCache(now = Date.now()) {
  if (socketSessionCache.size <= SOCKET_SESSION_CACHE_MAX_ENTRIES) return;

  for (const [key, entry] of socketSessionCache) {
    if (entry.expiresAt <= now || socketSessionCache.size > SOCKET_SESSION_CACHE_MAX_ENTRIES) {
      socketSessionCache.delete(key);
    }
    if (socketSessionCache.size <= SOCKET_SESSION_CACHE_MAX_ENTRIES) {
      break;
    }
  }
}

async function verifySignedSessionToken(requestHeaders) {
  if (!authSecret) return null;

  const rawSignedCookie = getSessionCookie(requestHeaders);
  if (!rawSignedCookie) return null;

  let signedCookie;
  try {
    signedCookie = decodeURIComponent(rawSignedCookie);
  } catch {
    signedCookie = rawSignedCookie;
  }

  if (!signedCookie) return null;

  const separatorIndex = signedCookie.lastIndexOf(".");
  if (separatorIndex <= 0) return null;

  const token = signedCookie.slice(0, separatorIndex);
  const signature = signedCookie.slice(separatorIndex + 1);
  if (!token || !signature) return null;

  const expectedSignature = await makeSignature(token, authSecret);
  return constantTimeEqual(signature, expectedSignature) ? token : null;
}

async function resolveSessionFromCookieCache(req) {
  if (!authSecret) return null;

  try {
    const payload = await getCookieCache(req.headers, {
      secret: authSecret,
      strategy: "jwe",
    });
    const session = payload?.session ?? null;
    const user = payload?.user ?? null;
    if (!user?.id || !user?.companyId || user?.isActive === false) {
      return null;
    }

    const expiresAt = session?.expiresAt ? new Date(String(session.expiresAt)) : null;
    if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())) {
      return null;
    }

    return {
      userId: String(user.id),
      companyId: String(user.companyId),
    };
  } catch {
    return null;
  }
}

async function resolveSessionFromDatabase(req) {
  if (!sql) return null;

  const sessionToken = await verifySignedSessionToken(req.headers);
  if (!sessionToken) return null;

  try {
    const rows = await sql`
      select
        s.expires_at as "expiresAt",
        u.id as "userId",
        u.company_id as "companyId",
        u.is_active as "isActive"
      from "session" as s
      inner join "user" as u on u.id = s.user_id
      where s.token = ${sessionToken}
      limit 1
    `;
    const row = rows[0];
    if (!row?.userId || !row?.companyId || row.isActive === false) {
      return null;
    }

    const expiresAt = row.expiresAt instanceof Date ? row.expiresAt : new Date(String(row.expiresAt));
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      return null;
    }

    return {
      userId: String(row.userId),
      companyId: String(row.companyId),
    };
  } catch {
    return null;
  }
}

async function resolveSession(req) {
  const cookie = req.headers.cookie || "";
  if (!cookie) return null;

  const now = Date.now();
  const cacheKey = hashCookie(cookie);
  const cached = socketSessionCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  pruneSocketSessionCache(now);

  const sessionPromise = (async () => {
    try {
      const cachedSession = await resolveSessionFromCookieCache(req);
      if (cachedSession) return cachedSession;

      return await resolveSessionFromDatabase(req);
    } catch {
      return null;
    }
  })();

  socketSessionCache.set(cacheKey, {
    expiresAt: now + SOCKET_SESSION_CACHE_TTL_MS,
    value: sessionPromise,
  });

  try {
    const session = await sessionPromise;
    socketSessionCache.set(cacheKey, {
      expiresAt: Date.now() + SOCKET_SESSION_CACHE_TTL_MS,
      value: session,
    });
    return session;
  } catch {
    socketSessionCache.delete(cacheKey);
    return null;
  }
}

function writeJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function isReady() {
  return !shuttingDown && realtimeReady && redisReady;
}

await app.prepare();

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    writeJson(res, 200, {
      status: shuttingDown ? "shutting_down" : "ok",
      realtime: enableRealtime,
    });
    return;
  }

  if (req.url === "/readyz") {
    writeJson(res, isReady() ? 200 : 503, {
      status: isReady() ? "ready" : "not_ready",
      realtime: enableRealtime,
      redis: redisReady,
      shuttingDown,
    });
    return;
  }

  handle(req, res);
});

server.keepAliveTimeout = 61_000;
server.headersTimeout = 65_000;
server.requestTimeout = 30_000;
server.maxRequestsPerSocket = 100;

if (enableRealtime) {
  io = new SocketIOServer(server, {
    path: "/socket.io",
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ["websocket", "polling"],
    serveClient: false,
  });

  if (redisUrl) {
    const pubClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    const subClient = pubClient.duplicate();
    redisClients = [pubClient, subClient];

    await Promise.all([pubClient.connect(), subClient.connect()]);
    redisReady = true;
    io.adapter(createAdapter(pubClient, subClient));
  }

  io.use(async (socket, nextMiddleware) => {
    const session = await resolveSession(socket.request);
    if (!session) {
      nextMiddleware(new Error("UNAUTHORIZED"));
      return;
    }
    socket.data.userId = session.userId;
    socket.data.companyId = session.companyId;
    nextMiddleware();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    const companyId = socket.data.companyId;

    socket.join(`user:${userId}`);
    socket.join(`company:${companyId}`);
  });

  realtimeReady = true;
}

if (logMemoryUsage) {
  const interval = setInterval(() => {
    const usage = process.memoryUsage();
    const formatMb = (value) => `${Math.round((value / 1024 / 1024) * 10) / 10} MB`;
    console.log(
      `[memory] rss=${formatMb(usage.rss)} heapUsed=${formatMb(usage.heapUsed)} heapTotal=${formatMb(usage.heapTotal)} external=${formatMb(usage.external)}`
    );
  }, 60_000);
  interval.unref();
}

async function shutdown(signal) {
  if (shutdownPromise) return shutdownPromise;

  shuttingDown = true;
  shutdownPromise = (async () => {
    const forceExitTimer = setTimeout(() => {
      process.exit(1);
    }, 10_000);
    forceExitTimer.unref();

    try {
      if (io) {
        await new Promise((resolve) => io.close(resolve));
      }

      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      if (redisClients.length > 0) {
        await Promise.allSettled(redisClients.map((client) => client.quit()));
      }
    } catch (error) {
      console.error(`> Graceful shutdown failed after ${signal}`, error);
      throw error;
    } finally {
      clearTimeout(forceExitTimer);
    }
  })();

  return shutdownPromise;
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    void shutdown(signal)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
}

server.listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
  if (dev && !enableRealtime) {
    console.log("> Realtime server disabled in development. Set ENABLE_DEV_REALTIME=true to opt in.");
  }
});
