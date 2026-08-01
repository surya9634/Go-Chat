export type UserRole = 'owner' | 'admin' | 'member';
export type ConversationType = 'private' | 'group';
export type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';
export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  status_text?: string;
  status_emoji?: string;
  status_presence?: PresenceStatus;
  last_seen?: string;
  online?: boolean;
  created: string;
  updated: string;
}

export interface StoryItem {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string;
  seen?: boolean;
}

export interface CallSession {
  id: string;
  conversationId: string;
  caller: User;
  receiver: User;
  type: CallType;
  status: CallStatus;
  startedAt?: number;
  durationSeconds: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;
  image?: string;
  created_by?: string;
  created: string;
  updated: string;
  expand?: {
    created_by?: User;
    'conversation_members(conversation)'?: ConversationMember[];
  };
  // UI computed fields
  unreadCount?: number;
  lastMessage?: Message;
  otherUser?: User;
}

export interface ConversationMember {
  id: string;
  conversation: string;
  user: string;
  role: UserRole;
  created: string;
  updated: string;
  expand?: {
    user?: User;
    conversation?: Conversation;
  };
}

export interface Message {
  id: string;
  conversation: string;
  sender: string;
  text?: string;
  attachment?: string | string[];
  reply_to?: string;
  edited?: boolean;
  deleted?: boolean;
  pinned?: boolean;
  created: string;
  updated: string;
  expand?: {
    sender?: User;
    reply_to?: Message & { expand?: { sender?: User } };
    reactions?: Reaction[];
    read_receipts?: ReadReceipt[];
  };
}

export interface Reaction {
  id: string;
  message: string;
  user: string;
  emoji: string;
  created: string;
  updated: string;
  expand?: {
    user?: User;
  };
}

export interface ReadReceipt {
  id: string;
  message: string;
  user: string;
  read_at: string;
  created: string;
  updated: string;
  expand?: {
    user?: User;
  };
}

export interface FileRecord {
  id: string;
  file: string;
  uploaded_by: string;
  type?: string;
  size?: number;
  created: string;
  updated: string;
  expand?: {
    uploaded_by?: User;
  };
}

export interface TypingState {
  [conversationId: string]: {
    [userId: string]: {
      username: string;
      timestamp: number;
    };
  };
}

export interface FileUploadItem {
  id: string;
  file: File;
  previewUrl?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}
