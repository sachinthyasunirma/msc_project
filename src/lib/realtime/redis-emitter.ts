import { Emitter } from "@socket.io/redis-emitter";
import Redis from "ioredis";
import { REALTIME_EVENTS, type RealtimeNotificationCreatedPayload, type RealtimeNotificationReadPayload } from "@/lib/realtime/events";

type NotificationRealtimeEmitter = {
  emitCreated: (payload: RealtimeNotificationCreatedPayload) => void;
  emitRead: (payload: RealtimeNotificationReadPayload) => void;
};

let cachedEmitter: NotificationRealtimeEmitter | null | undefined;

function createEmitter(): NotificationRealtimeEmitter | null {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) return null;

  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  const emitter = new Emitter(redis);

  return {
    emitCreated(payload) {
      emitter.to(`user:${payload.recipientUserId}`).emit(REALTIME_EVENTS.NOTIFICATION_CREATED, payload);
    },
    emitRead(payload) {
      emitter.to(`user:${payload.recipientUserId}`).emit(REALTIME_EVENTS.NOTIFICATION_READ, payload);
    },
  };
}

export function getNotificationRealtimeEmitter(): NotificationRealtimeEmitter | null {
  if (cachedEmitter !== undefined) return cachedEmitter;
  cachedEmitter = createEmitter();
  return cachedEmitter;
}
