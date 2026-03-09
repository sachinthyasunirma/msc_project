"use client";

import { io, type Socket } from "socket.io-client";
import { REALTIME_EVENTS } from "@/lib/realtime/events";

let socketRef: Socket | null = null;
let notificationSubscriberCount = 0;

function getSocket() {
  if (socketRef) return socketRef;
  socketRef = io({
    path: "/socket.io",
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 750,
    reconnectionDelayMax: 8000,
  });
  return socketRef;
}

export function subscribeToNotificationRealtime(
  onCreated: () => void,
  onRead: () => void
) {
  const socket = getSocket();
  notificationSubscriberCount += 1;
  if (!socket.connected) {
    socket.connect();
  }
  const createdHandler = () => onCreated();
  const readHandler = () => onRead();
  socket.on(REALTIME_EVENTS.NOTIFICATION_CREATED, createdHandler);
  socket.on(REALTIME_EVENTS.NOTIFICATION_READ, readHandler);

  return () => {
    socket.off(REALTIME_EVENTS.NOTIFICATION_CREATED, createdHandler);
    socket.off(REALTIME_EVENTS.NOTIFICATION_READ, readHandler);
    notificationSubscriberCount = Math.max(notificationSubscriberCount - 1, 0);
    if (notificationSubscriberCount === 0) {
      socket.disconnect();
    }
  };
}
