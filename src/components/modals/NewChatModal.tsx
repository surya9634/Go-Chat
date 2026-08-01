import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useChat } from '../../hooks/useChat';
import { Avatar } from '../common/Avatar';
import { Search, MessageSquare, Loader2, UserPlus, ChevronRight } from 'lucide-react';
import { User } from '../../types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateGroup?: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onOpenCreateGroup,
}) => {
  const { allUsers, startPrivateChat, refreshUsers } = useChat();
  const [search, setSearch] = useState('');
  const [isStarting, setIsStarting] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      refreshUsers();
    }
  }, [isOpen, refreshUsers]);

  const filteredUsers = allUsers.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectUser = async (user: User) => {
    try {
      setIsStarting(user.id);
      await startPrivateChat(user.id);
      onClose();
    } catch (e) {
      // Toast handled by context
    } finally {
      setIsStarting(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Direct Message & Group" maxWidth="md">
      <div className="space-y-4">
        {/* Neutral Create New Group Banner - Green ONLY on Hover */}
        {onOpenCreateGroup && (
          <div
            onClick={() => {
              onClose();
              onOpenCreateGroup();
            }}
            className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border text-foreground font-bold text-sm cursor-pointer hover:border-emerald-500/50 hover:bg-muted/50 transition-all active:scale-98 group/grp"
          >
            <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground group-hover/grp:bg-emerald-500 group-hover/grp:text-white flex items-center justify-center shrink-0 transition-colors">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground group-hover/grp:text-emerald-500 transition-colors">
                Create New Group
              </div>
              <div className="text-xs text-muted-foreground font-normal truncate">
                Add contacts & start a group discussion
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover/grp:text-emerald-500 shrink-0 transition-colors" />
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts by username or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Contact Picker List */}
        <div className="max-h-64 overflow-y-auto border border-border rounded-xl divide-y divide-border/40 bg-card">
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">No users found.</div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className="flex items-center justify-between p-3.5 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar user={user} size="md" showOnlineStatus />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{user.username}</div>
                    <div className="text-xs text-muted-foreground">{user.bio || user.email}</div>
                  </div>
                </div>
                {isStarting === user.id ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                ) : (
                  <MessageSquare className="w-4 h-4 text-muted-foreground hover:text-emerald-500 transition-colors" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
