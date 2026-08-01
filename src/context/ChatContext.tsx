import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Conversation, Message, User, TypingState, FileUploadItem, Reaction, ReadReceipt } from '../types';
import { conversationService, messageService, reactionService, readReceiptService, userService, pb } from '../services/pocketbase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { NotificationService } from '../services/notifications';
import { getPocketBaseFileUrl } from '../utils/formatters';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  allUsers: User[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  hasMoreMessages: boolean;
  replyToMessage: Message | null;
  editingMessage: Message | null;
  searchQuery: string;
  typingUsers: { [userId: string]: string }; // userId -> username typing in active conv
  uploadProgressQueue: FileUploadItem[];

  // Actions
  selectConversation: (conv: Conversation | null) => void;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (text?: string, files?: File[]) => Promise<void>;
  editMessage: (messageId: string, text: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  togglePinMessage: (messageId: string, currentPinned?: boolean) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  startPrivateChat: (otherUserId: string) => Promise<Conversation>;
  createGroupChat: (name: string, memberUserIds: string[], imageFile?: File) => Promise<Conversation>;
  setReplyToMessage: (msg: Message | null) => void;
  setEditingMessage: (msg: Message | null) => void;
  setSearchQuery: (query: string) => void;
  broadcastTyping: () => void;
  clearChat: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(false);

  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [typingState, setTypingState] = useState<TypingState>({});
  const [uploadProgressQueue, setUploadProgressQueue] = useState<FileUploadItem[]>([]);

  const activeConvRef = useRef<Conversation | null>(null);
  activeConvRef.current = activeConversation;

  // Load user directory
  const loadUsers = useCallback(async () => {
    try {
      const users = await userService.getAllUsers();
      setAllUsers(users.filter(u => u.id !== currentUser?.id));
    } catch (e) {}
  }, [currentUser?.id]);

  // Load conversations list
  const refreshConversations = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      setIsLoadingConversations(true);
      const list = await conversationService.getConversations();
      setConversations(list);
    } catch (err: any) {
      showToast('Failed to load conversations', 'error');
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentUser?.id, showToast]);

  useEffect(() => {
    if (currentUser?.id) {
      refreshConversations();
      loadUsers();
      // Register SW & request notification permission
      NotificationService.registerServiceWorker();
      NotificationService.requestPermission();
    } else {
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
    }
  }, [currentUser?.id, refreshConversations, loadUsers]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversation?.id) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);
    setPage(1);

    messageService.getMessages(activeConversation.id, 1, 40)
      .then((res) => {
        if (!isMounted) return;
        setMessages(res.items);
        setHasMoreMessages(res.totalPages > 1);

        // Mark last message as read
        if (res.items.length > 0) {
          const last = res.items[res.items.length - 1];
          if (last.sender !== currentUser?.id) {
            readReceiptService.markAsRead(last.id).catch(() => {});
          }
        }
      })
      .catch((err) => {
        if (isMounted) showToast('Failed to load message history', 'error');
      })
      .finally(() => {
        if (isMounted) setIsLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeConversation?.id, currentUser?.id, showToast]);

  // Load older messages (infinite scroll pagination)
  const loadMoreMessages = async () => {
    if (!activeConversation?.id || isLoadingMessages || !hasMoreMessages) return;

    try {
      const nextPage = page + 1;
      const res = await messageService.getMessages(activeConversation.id, nextPage, 40);
      setMessages((prev) => [...res.items, ...prev]);
      setPage(nextPage);
      setHasMoreMessages(nextPage < res.totalPages);
    } catch (e) {
      showToast('Failed to load older messages', 'error');
    }
  };

  // Realtime subscriptions setup
  useEffect(() => {
    if (!currentUser?.id) return;

    // 1. Subscribe to messages collection
    const unbindMessages = pb.collection('messages').subscribe('*', async (e) => {
      const record = e.record as unknown as Message;
      const action = e.action;

      // Update active conversation message stream if matches
      if (activeConvRef.current?.id === record.conversation) {
        if (action === 'create') {
          // Expand sender & reply_to
          try {
            const expanded = await pb.collection('messages').getOne<Message>(record.id, {
              expand: 'sender,reply_to,reply_to.sender',
            });
            setMessages((prev) => {
              if (prev.some((m) => m.id === expanded.id)) return prev;
              return [...prev, expanded];
            });
            // Mark read if from another user
            if (record.sender !== currentUser.id) {
              readReceiptService.markAsRead(record.id).catch(() => {});
            }
          } catch (err) {
            setMessages((prev) => [...prev, record]);
          }
        } else if (action === 'update') {
          try {
            const expanded = await pb.collection('messages').getOne<Message>(record.id, {
              expand: 'sender,reply_to,reply_to.sender',
            });
            setMessages((prev) => prev.map((m) => (m.id === expanded.id ? { ...m, ...expanded } : m)));
          } catch (err) {
            setMessages((prev) => prev.map((m) => (m.id === record.id ? { ...m, ...record } : m)));
          }
        } else if (action === 'delete') {
          setMessages((prev) => prev.filter((m) => m.id !== record.id));
        }
      }

      // Notify for messages from other users when the app might be backgrounded
      if (action === 'create' && record.sender !== currentUser.id) {
        // Only notify if this conversation is NOT the one currently open
        const isActiveConv = activeConvRef.current?.id === record.conversation;
        if (!isActiveConv || document.hidden) {
          // Find sender info from conversations list for avatar
          const conv = conversations.find((c) => c.id === record.conversation);
          const senderName = conv?.otherUser?.username ||
            conv?.name ||
            record.expand?.sender?.username ||
            'New message';
          const avatarSrc = conv?.otherUser?.avatar
            ? getPocketBaseFileUrl(conv.otherUser, conv.otherUser.avatar)
            : undefined;
          NotificationService.notifyMessage(
            senderName,
            record.text || '',
            avatarSrc,
          );
        }
      }

      // Refresh side list to update last message preview & unread counts
      refreshConversations();
    });

    // 2. Subscribe to reactions collection
    const unbindReactions = pb.collection('reactions').subscribe('*', async (e) => {
      const rec = e.record;
      if (!rec?.message) return;
      const msgId = rec.message;

      // Fetch fresh reactions for target message
      try {
        const reactions = await pb.collection('reactions').getFullList<Reaction>({
          filter: `message = "${msgId}"`,
          expand: 'user',
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, expand: { ...m.expand, reactions } }
              : m
          )
        );
      } catch (err) {}
    });

    // 3. Subscribe to read receipts
    const unbindReceipts = pb.collection('read_receipts').subscribe('*', async (e) => {
      const rec = e.record;
      if (!rec?.message) return;
      const msgId = rec.message;

      try {
        const read_receipts = await pb.collection('read_receipts').getFullList<ReadReceipt>({
          filter: `message = "${msgId}"`,
          expand: 'user',
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, expand: { ...m.expand, read_receipts } }
              : m
          )
        );
      } catch (err) {}
    });

    // 4. Subscribe to users collection for online/presence status
    const unbindUsers = pb.collection('users').subscribe('*', (e) => {
      const updatedUser = e.record as unknown as User;
      setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u)));
      setConversations((prev) =>
        prev.map((c) => {
          if (c.otherUser?.id === updatedUser.id) {
            return { ...c, otherUser: { ...c.otherUser, ...updatedUser } };
          }
          return c;
        })
      );
      if (activeConvRef.current?.otherUser?.id === updatedUser.id) {
        setActiveConversation((prev) => prev ? { ...prev, otherUser: { ...prev.otherUser!, ...updatedUser } } : null);
      }
    });

    return () => {
      unbindMessages.then((unsub) => unsub().catch(() => {})).catch(() => {});
      unbindReactions.then((unsub) => unsub().catch(() => {})).catch(() => {});
      unbindReceipts.then((unsub) => unsub().catch(() => {})).catch(() => {});
      unbindUsers.then((unsub) => unsub().catch(() => {})).catch(() => {});
    };
  }, [currentUser?.id, refreshConversations]);

  // Typing indicators logic
  const typingTimerRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const broadcastTyping = useCallback(() => {
    if (!activeConversation?.id || !currentUser?.id) return;
    const convId = activeConversation.id;
    const uId = currentUser.id;
    const uName = currentUser.username || 'Someone';

    setTypingState((prev) => ({
      ...prev,
      [convId]: {
        ...(prev[convId] || {}),
        [uId]: { username: uName, timestamp: Date.now() },
      },
    }));

    if (typingTimerRef.current[uId]) clearTimeout(typingTimerRef.current[uId]);

    typingTimerRef.current[uId] = setTimeout(() => {
      setTypingState((prev) => {
        const convMap = { ...(prev[convId] || {}) };
        delete convMap[uId];
        return { ...prev, [convId]: convMap };
      });
    }, 3000);
  }, [activeConversation?.id, currentUser?.id, currentUser?.username]);

  // Compute active conversation typing users list
  const activeTypingUsers: { [userId: string]: string } = {};
  if (activeConversation?.id && typingState[activeConversation.id]) {
    const convMap = typingState[activeConversation.id];
    Object.entries(convMap).forEach(([uId, val]) => {
      if (uId !== currentUser?.id && Date.now() - val.timestamp < 3500) {
        activeTypingUsers[uId] = val.username;
      }
    });
  }

  // Action methods
  const selectConversation = (conv: Conversation | null) => {
    setActiveConversation(conv);
    setReplyToMessage(null);
    setEditingMessage(null);
    // Immediately zero out unread count for this conversation in the list
    if (conv?.id) {
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
      );
    }
  };

  const sendMessage = async (text?: string, files?: File[]) => {
    if (!activeConversation?.id) return;

    // Track upload progress if files exist
    const uploadId = Math.random().toString(36).substring(2, 9);
    if (files && files.length > 0) {
      setUploadProgressQueue((prev) => [
        ...prev,
        {
          id: uploadId,
          file: files[0],
          progress: 10,
          status: 'uploading',
        },
      ]);
    }

    try {
      await messageService.sendMessage(
        activeConversation.id,
        text,
        files,
        replyToMessage?.id,
        (progress) => {
          setUploadProgressQueue((prev) =>
            prev.map((item) => (item.id === uploadId ? { ...item, progress } : item))
          );
        }
      );
      setReplyToMessage(null);
      setUploadProgressQueue((prev) => prev.filter((i) => i.id !== uploadId));
    } catch (err: any) {
      setUploadProgressQueue((prev) =>
        prev.map((item) =>
          item.id === uploadId ? { ...item, status: 'error', error: err.message } : item
        )
      );
      showToast(err.message || 'Failed to send message', 'error');
    }
  };

  const editMessage = async (messageId: string, text: string) => {
    try {
      await messageService.editMessage(messageId, text);
      setEditingMessage(null);
      showToast('Message updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to edit message', 'error');
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await messageService.deleteMessage(messageId);
      showToast('Message deleted', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete message', 'error');
    }
  };

  const togglePinMessage = async (messageId: string, currentPinned?: boolean) => {
    try {
      await messageService.togglePinMessage(messageId, currentPinned);
      showToast(currentPinned ? 'Message unpinned' : 'Message pinned', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to update pin state', 'error');
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    try {
      await reactionService.toggleReaction(messageId, emoji);
    } catch (err: any) {
      showToast('Failed to toggle reaction', 'error');
    }
  };

  const startPrivateChat = async (otherUserId: string): Promise<Conversation> => {
    try {
      const conv = await conversationService.createPrivateConversation(otherUserId);
      await refreshConversations();
      selectConversation(conv);
      return conv;
    } catch (err: any) {
      showToast(err.message || 'Failed to initiate private chat', 'error');
      throw err;
    }
  };

  const createGroupChat = async (name: string, memberUserIds: string[], imageFile?: File): Promise<Conversation> => {
    try {
      const conv = await conversationService.createGroupConversation(name, memberUserIds, imageFile);
      await refreshConversations();
      selectConversation(conv);
      showToast(`Group "${name}" created!`, 'success');
      return conv;
    } catch (err: any) {
      showToast(err.message || 'Failed to create group chat', 'error');
      throw err;
    }
  };

  const clearChat = async (conversationId: string) => {
    try {
      const currentUserId = currentUser?.id || '';
      const clearKey = `cleared_at_${conversationId}_${currentUserId}`;
      const nowIso = new Date().toISOString();
      localStorage.setItem(clearKey, nowIso);

      if (activeConversation?.id === conversationId) {
        const clearedTime = new Date(nowIso).getTime();
        setMessages((prev) => prev.filter((m) => new Date(m.created).getTime() > clearedTime));
      }
      await refreshConversations();
      showToast('Chat history cleared for you', 'info');
    } catch (err: any) {
      showToast('Failed to clear chat history', 'error');
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      await conversationService.deleteConversation(conversationId);
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
      await refreshConversations();
      showToast('Conversation deleted', 'info');
    } catch (err: any) {
      showToast('Failed to delete conversation', 'error');
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        allUsers,
        isLoadingConversations,
        isLoadingMessages,
        hasMoreMessages,
        replyToMessage,
        editingMessage,
        searchQuery,
        typingUsers: activeTypingUsers,
        uploadProgressQueue,
        selectConversation,
        loadMoreMessages,
        sendMessage,
        editMessage,
        deleteMessage,
        togglePinMessage,
        toggleReaction,
        startPrivateChat,
        createGroupChat,
        clearChat,
        deleteConversation,
        setReplyToMessage,
        setEditingMessage,
        setSearchQuery,
        broadcastTyping,
        refreshConversations,
        refreshUsers: loadUsers,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};
