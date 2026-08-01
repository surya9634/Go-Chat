import PocketBase from 'pocketbase';
import { POCKETBASE_URL } from '../utils/constants';
import { User, Conversation, Message, Reaction, ReadReceipt, ConversationMember, StoryItem } from '../types';

export const pb = new PocketBase(POCKETBASE_URL);

// Disable auto cancellation for parallel queries
pb.autoCancellation(false);

export const authService = {
  async signUp(username: string, email: string, password: string, passwordConfirm: string): Promise<User> {
    const record = await pb.collection('users').create<User>({
      username,
      email,
      password,
      passwordConfirm,
      emailVisibility: true,
      online: true,
      last_seen: new Date().toISOString(),
    });
    // Auto login after signup
    await pb.collection('users').authWithPassword(email, password);
    return record;
  },

  async login(email: string, password: string): Promise<User> {
    const authData = await pb.collection('users').authWithPassword<User>(email, password);
    // Update presence
    await this.updatePresence(true);
    return authData.record;
  },

  logout(): void {
    const currentUser = pb.authStore.model as unknown as User;
    if (currentUser?.id) {
      this.updatePresence(false).catch(() => {});
    }
    pb.authStore.clear();
  },

  async requestPasswordReset(email: string): Promise<boolean> {
    return await pb.collection('users').requestPasswordReset(email);
  },

  async requestVerification(email: string): Promise<boolean> {
    return await pb.collection('users').requestVerification(email);
  },

  async updateProfile(userId: string, data: Partial<User> | FormData): Promise<User> {
    const updatedUser = await pb.collection('users').update<User>(userId, data);
    // Refresh auth store model
    if (pb.authStore.model?.id === userId) {
      pb.authStore.save(pb.authStore.token, updatedUser);
    }
    return updatedUser;
  },

  async updatePresence(online: boolean): Promise<void> {
    const currentUser = pb.authStore.model as unknown as User;
    if (!currentUser?.id) return;
    try {
      await pb.collection('users').update(currentUser.id, {
        online,
        last_seen: new Date().toISOString(),
      });
    } catch (e) {
      // ignore non-critical presence update error
    }
  }
};

export const userService = {
  async getAllUsers(): Promise<User[]> {
    return await pb.collection('users').getFullList<User>({
      sort: 'username',
    });
  },

  async getUserById(id: string): Promise<User> {
    return await pb.collection('users').getOne<User>(id);
  }
};

export const conversationService = {
  async getConversations(): Promise<Conversation[]> {
    const currentUser = pb.authStore.model as unknown as User;
    const userId = currentUser?.id;
    if (!userId) return [];

    // Fetch members for current user
    const memberRecords = await pb.collection('conversation_members').getFullList<ConversationMember>({
      filter: `user = "${userId}"`,
      expand: 'conversation,conversation.created_by',
    });

    const conversations: Conversation[] = [];
    for (const mem of memberRecords) {
      if (mem.expand?.conversation) {
        const conv = mem.expand.conversation;
        // Fetch all members of this conversation to display member list / direct message target user
        const allMembers = await pb.collection('conversation_members').getFullList<ConversationMember>({
          filter: `conversation = "${conv.id}"`,
          expand: 'user',
        });
        conv.expand = {
          ...conv.expand,
          'conversation_members(conversation)': allMembers,
        };

        if (conv.type === 'private') {
          const otherMember = allMembers.find(m => m.user !== userId);
          if (otherMember?.expand?.user) {
            conv.otherUser = otherMember.expand.user;
          }
        }

        // Fetch last message for summary preview
        try {
          const lastMsgs = await pb.collection('messages').getList<Message>(1, 1, {
            filter: `conversation = "${conv.id}"`,
            sort: '-created',
            expand: 'sender',
          });
          if (lastMsgs.items.length > 0) {
            conv.lastMessage = lastMsgs.items[0];
          }
        } catch (e) {}

        // Compute real unread count: messages not sent by current user that have no read receipt from current user
        try {
          const unreadResult = await pb.collection('messages').getList<Message>(1, 1, {
            filter: `conversation = "${conv.id}" && sender != "${userId}" && (read_receipts_via_message.user ?= "" || read_receipts_via_message !~ "${userId}")`,
            fields: 'id',
          });
          conv.unreadCount = unreadResult.totalItems;
        } catch (e) {
          // fallback: no unread count if query fails
          conv.unreadCount = 0;
        }

        conversations.push(conv);
      }
    }

    return conversations.sort((a, b) => {
      const timeA = a.lastMessage?.created || a.created;
      const timeB = b.lastMessage?.created || b.created;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
  },

  async createPrivateConversation(otherUserId: string): Promise<Conversation> {
    const currentUser = pb.authStore.model as unknown as User;
    const currentUserId = currentUser?.id;
    if (!currentUserId) throw new Error('Not authenticated');

    // Check if conversation already exists between currentUserId & otherUserId
    const myMemberships = await pb.collection('conversation_members').getFullList<ConversationMember>({
      filter: `user = "${currentUserId}"`,
      expand: 'conversation',
    });

    for (const mem of myMemberships) {
      if (mem.expand?.conversation?.type === 'private') {
        const convId = mem.expand.conversation.id;
        const otherMem = await pb.collection('conversation_members').getFirstListItem<ConversationMember>(
          `conversation = "${convId}" && user = "${otherUserId}"`
        ).catch(() => null);
        if (otherMem) {
          return mem.expand.conversation;
        }
      }
    }

    // Create new private conversation
    const conv = await pb.collection('conversations').create<Conversation>({
      type: 'private',
      created_by: currentUserId,
    });

    // Create member entries
    await pb.collection('conversation_members').create({
      conversation: conv.id,
      user: currentUserId,
      role: 'owner',
    });
    await pb.collection('conversation_members').create({
      conversation: conv.id,
      user: otherUserId,
      role: 'member',
    });

    return conv;
  },

  async createGroupConversation(name: string, memberUserIds: string[], imageFile?: File): Promise<Conversation> {
    const currentUser = pb.authStore.model as unknown as User;
    const currentUserId = currentUser?.id;
    if (!currentUserId) throw new Error('Not authenticated');

    const formData = new FormData();
    formData.append('type', 'group');
    formData.append('name', name);
    formData.append('created_by', currentUserId);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    const conv = await pb.collection('conversations').create<Conversation>(formData);

    // Add current user as owner
    await pb.collection('conversation_members').create({
      conversation: conv.id,
      user: currentUserId,
      role: 'owner',
    });

    // Add selected members
    for (const uId of memberUserIds) {
      if (uId !== currentUserId) {
        await pb.collection('conversation_members').create({
          conversation: conv.id,
          user: uId,
          role: 'member',
        });
      }
    }

    return conv;
  },

  async addMember(conversationId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<ConversationMember> {
    return await pb.collection('conversation_members').create<ConversationMember>({
      conversation: conversationId,
      user: userId,
      role,
    });
  },

  async removeMember(conversationId: string, userId: string): Promise<void> {
    const memberRecord = await pb.collection('conversation_members').getFirstListItem<ConversationMember>(
      `conversation = "${conversationId}" && user = "${userId}"`
    );
    if (memberRecord) {
      await pb.collection('conversation_members').delete(memberRecord.id);
    }
  },

  async clearConversationMessages(conversationId: string): Promise<void> {
    const msgs = await pb.collection('messages').getFullList({ filter: `conversation = "${conversationId}"` });
    for (const m of msgs) {
      await pb.collection('messages').delete(m.id).catch(() => {});
    }
  },

  async deleteConversation(conversationId: string): Promise<void> {
    const members = await pb.collection('conversation_members').getFullList({ filter: `conversation = "${conversationId}"` });
    for (const mem of members) {
      await pb.collection('conversation_members').delete(mem.id).catch(() => {});
    }
    await pb.collection('conversations').delete(conversationId).catch(() => {});
  }
};

export const messageService = {
  async getMessages(conversationId: string, page = 1, perPage = 50): Promise<{ items: Message[]; totalPages: number; totalItems: number }> {
    const result = await pb.collection('messages').getList<Message>(page, perPage, {
      filter: `conversation = "${conversationId}"`,
      sort: '-created', // Fetch newest first, UI will reverse for display
      expand: 'sender,reply_to,reply_to.sender',
    });

    // For each message, fetch reactions & read receipts
    const items = await Promise.all(
      result.items.map(async (msg) => {
        const [reactions, readReceipts] = await Promise.all([
          pb.collection('reactions').getFullList<Reaction>({
            filter: `message = "${msg.id}"`,
            expand: 'user',
          }).catch(() => []),
          pb.collection('read_receipts').getFullList<ReadReceipt>({
            filter: `message = "${msg.id}"`,
            expand: 'user',
          }).catch(() => []),
        ]);
        return {
          ...msg,
          expand: {
            ...msg.expand,
            reactions,
            read_receipts: readReceipts,
          },
        };
      })
    );

    return {
      items: items.reverse(), // chronologically ascending
      totalPages: result.totalPages,
      totalItems: result.totalItems,
    };
  },

  async sendMessage(
    conversationId: string,
    text?: string,
    files?: File[],
    replyToId?: string,
    onProgress?: (progress: number) => void
  ): Promise<Message> {
    const currentUser = pb.authStore.model as unknown as User;
    const senderId = currentUser?.id;
    if (!senderId) throw new Error('Not authenticated');

    const formData = new FormData();
    formData.append('conversation', conversationId);
    formData.append('sender', senderId);
    if (text) formData.append('text', text);
    if (replyToId) formData.append('reply_to', replyToId);
    formData.append('edited', 'false');
    formData.append('deleted', 'false');
    formData.append('pinned', 'false');

    if (files && files.length > 0) {
      for (const file of files) {
        formData.append('attachment', file);
      }
    }

    const msg = await pb.collection('messages').create<Message>(formData, {
      expand: 'sender,reply_to,reply_to.sender',
      $autoCancel: false,
      onUploadProgress: (e: any) => {
        if (onProgress && e.total) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onProgress(pct);
        }
      }
    });

    return msg;
  },

  async editMessage(messageId: string, text: string): Promise<Message> {
    return await pb.collection('messages').update<Message>(messageId, {
      text,
      edited: true,
    }, {
      expand: 'sender,reply_to,reply_to.sender',
    });
  },

  async deleteMessage(messageId: string): Promise<Message> {
    return await pb.collection('messages').update<Message>(messageId, {
      deleted: true,
      text: '[This message was deleted]',
    }, {
      expand: 'sender,reply_to,reply_to.sender',
    });
  },

  async togglePinMessage(messageId: string, currentPinned?: boolean): Promise<Message> {
    return await pb.collection('messages').update<Message>(messageId, {
      pinned: !currentPinned,
    }, {
      expand: 'sender,reply_to,reply_to.sender',
    });
  }
};

export const reactionService = {
  async toggleReaction(messageId: string, emoji: string): Promise<void> {
    const currentUser = pb.authStore.model as unknown as User;
    const userId = currentUser?.id;
    if (!userId) return;

    // Check if reaction exists
    try {
      const existing = await pb.collection('reactions').getFirstListItem<Reaction>(
        `message = "${messageId}" && user = "${userId}" && emoji = "${emoji}"`
      );
      if (existing) {
        await pb.collection('reactions').delete(existing.id);
        return;
      }
    } catch (e) {}

    // Add new reaction
    await pb.collection('reactions').create({
      message: messageId,
      user: userId,
      emoji,
    });
  }
};

export const readReceiptService = {
  async markAsRead(messageId: string): Promise<void> {
    const currentUser = pb.authStore.model as unknown as User;
    const userId = currentUser?.id;
    if (!userId) return;

    try {
      const existing = await pb.collection('read_receipts').getFirstListItem<ReadReceipt>(
        `message = "${messageId}" && user = "${userId}"`
      );
      if (!existing) {
        await pb.collection('read_receipts').create({
          message: messageId,
          user: userId,
          read_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      await pb.collection('read_receipts').create({
        message: messageId,
        user: userId,
        read_at: new Date().toISOString(),
      });
    }
  }
};

export const storyService = {
  async getStories(): Promise<{ user: User; stories: StoryItem[]; hasUnseen: boolean }[]> {
    try {
      // 48 hours expiration filter: only fetch records created in the last 48 hours!
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      const records = await pb.collection('files').getFullList({
        filter: `(type = "story_image" || type = "story_video") && created >= "${fortyEightHoursAgo}"`,
        sort: '-created',
        expand: 'uploaded_by',
      });

      const groupsMap: { [userId: string]: { user: User; stories: StoryItem[]; hasUnseen: boolean } } = {};

      for (const rec of records) {
        const u = rec.expand?.uploaded_by as unknown as User;
        if (!u) continue;

        const mediaUrl = `${POCKETBASE_URL}/api/files/files/${rec.id}/${rec.file}`;
        const createdDate = new Date(rec.created);
        const hoursAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60));

        const storyItem: StoryItem = {
          id: rec.id,
          userId: u.id,
          username: u.username,
          userAvatar: u.avatar ? `${POCKETBASE_URL}/api/files/_pb_users_auth_/${u.id}/${u.avatar}` : undefined,
          mediaUrl,
          mediaType: rec.type === 'story_video' ? 'video' : 'image',
          createdAt: hoursAgo === 0 ? 'Just now' : `${hoursAgo}h ago`,
        };

        if (!groupsMap[u.id]) {
          groupsMap[u.id] = {
            user: u,
            stories: [],
            hasUnseen: true,
          };
        }
        groupsMap[u.id].stories.push(storyItem);
      }

      return Object.values(groupsMap);
    } catch (e) {
      return [];
    }
  },

  async uploadStory(file: File): Promise<void> {
    const currentUser = pb.authStore.model as unknown as User;
    if (!currentUser?.id) throw new Error('Not authenticated');

    const isVideo = file.type.startsWith('video/');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploaded_by', currentUser.id);
    formData.append('type', isVideo ? 'story_video' : 'story_image');
    formData.append('size', file.size.toString());

    await pb.collection('files').create(formData);
  }
};
