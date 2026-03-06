export const REALTIME_EVENTS = {
  NOTIFICATION_CREATED: "notification:created",
  NOTIFICATION_READ: "notification:read",
} as const;

export type RealtimeNotificationCreatedPayload = {
  recipientUserId: string;
  notificationId: string;
};

export type RealtimeNotificationReadPayload = {
  recipientUserId: string;
  notificationId: string;
};
