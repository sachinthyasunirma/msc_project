export type ThreadItem = {
  peerUserId: string;
  peerName: string;
  peerEmail: string;
  peerHandle: string;
  lastMessageId: string;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderUserId: string;
  unreadCount: number;
};

export type ConversationMessage = {
  id: string;
  senderUserId: string;
  recipientUserId: string;
  message: string;
  isRead: boolean;
  deliveredAt: string;
  readAt: string | null;
  createdAt: string;
};

export type Recipient = {
  id: string;
  name: string;
  email: string;
  mentionHandle: string;
  isActive: boolean;
};

export type ConversationPeer = {
  id: string;
  name: string;
  email: string;
  mentionHandle: string;
  isActive: boolean;
};

export type NotificationsViewInitialData = {
  threads: ThreadItem[];
  threadsUnreadCount: number;
  totalThreads: number;
  recipients: Recipient[];
  selectedPeerId: string;
  conversationPeer: ConversationPeer | null;
  messages: ConversationMessage[];
  hasMoreOlder: boolean;
  conversationUnreadFromPeer: number;
};
