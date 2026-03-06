import http from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const redisUrl = process.env.REDIS_URL?.trim();

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function resolveBaseUrl(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = typeof forwardedProto === "string" ? forwardedProto.split(",")[0] : "http";
  const host = req.headers.host || `localhost:${port}`;
  return `${proto}://${host}`;
}

async function resolveSession(req) {
  const cookie = req.headers.cookie || "";
  if (!cookie) return null;

  try {
    const response = await fetch(`${resolveBaseUrl(req)}/api/auth/get-session`, {
      method: "GET",
      headers: {
        cookie,
      },
    });
    if (!response.ok) return null;
    const body = await response.json();
    const user = body?.user ?? null;
    if (!user?.id || !user?.companyId) return null;
    return {
      userId: String(user.id),
      companyId: String(user.companyId),
    };
  } catch {
    return null;
  }
}

await app.prepare();

const server = http.createServer((req, res) => handle(req, res));
const io = new SocketIOServer(server, {
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

  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  const shutdownRedis = async () => {
    await Promise.allSettled([pubClient.quit(), subClient.quit()]);
  };
  process.on("SIGTERM", shutdownRedis);
  process.on("SIGINT", shutdownRedis);
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

server.listen(port, hostname, () => {
  // eslint-disable-next-line no-console
  console.log(`> Ready on http://${hostname}:${port}`);
});
