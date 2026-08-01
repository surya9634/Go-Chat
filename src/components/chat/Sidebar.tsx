import React, { useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../common/Avatar';
import { getPocketBaseFileUrl, formatMessageTime } from '../../utils/formatters';
import { Search, Plus, MessageSquare, Users, Settings, LogOut, MessageCircleCode } from 'lucide-react';
import { NewChatModal } from '../modals/NewChatModal';
import { CreateGroupModal } from '../modals/CreateGroupModal';
import { ProfileModal } from '../modals/ProfileModal';

export const Sidebar: React.FC = () => {
  const { conversations, activeConversation, selectConversation, isLoadingConversations } = useChat();
  const { currentUser, logout } = useAuth();

  const [filterTab, setFilterTab] = useState<'all' | 'private' | 'group'>('all');
  const [search, setSearch] = useState('');

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const filteredConversations = conversations.filter((conv) => {
    if (filterTab !== 'all' && conv.type !== filterTab) return false;
    if (!search) return true;
    const searchLower = search.toLowerCase();
    if (conv.type === 'group') {
      return conv.name?.toLowerCase().includes(searchLower);
    }
    return conv.otherUser?.username?.toLowerCase().includes(searchLower) ||
           conv.otherUser?.email?.toLowerCase().includes(searchLower);
  });

  return (
    <aside className="w-80 md:w-96 bg-dark-panel border-r border-dark-border flex flex-col h-full shrink-0 select-none">
      {/* Header / Brand */}
      <div className="p-4 border-b border-dark-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-600/30">
            <MessageCircleCode className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">Go-Chat</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsNewChatOpen(true)}
            className="p-2 rounded-xl hover:bg-dark-surface text-dark-subtext hover:text-white transition-colors"
            title="New Direct Message"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCreateGroupOpen(true)}
            className="p-2 rounded-xl hover:bg-dark-surface text-dark-subtext hover:text-white transition-colors"
            title="Create Group"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-dark-surface border border-dark-border text-white text-xs focus:outline-none focus:border-brand-500 transition-colors placeholder:text-gray-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mt-3 p-1 bg-dark-surface/60 rounded-xl border border-dark-border/40">
          <button
            onClick={() => setFilterTab('all')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterTab === 'all'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-dark-subtext hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterTab('private')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterTab === 'private'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-dark-subtext hover:text-white'
            }`}
          >
            Direct
          </button>
          <button
            onClick={() => setFilterTab('group')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterTab === 'group'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-dark-subtext hover:text-white'
            }`}
          >
            Groups
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 divide-y divide-dark-border/20">
        {isLoadingConversations ? (
          <div className="p-6 text-center text-xs text-dark-subtext">Loading chats...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-dark-subtext flex flex-col items-center gap-2">
            <Users className="w-8 h-8 opacity-40" />
            <span>No conversations found</span>
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="mt-2 text-brand-500 font-semibold hover:underline"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = activeConversation?.id === conv.id;
            const title =
              conv.type === 'group'
                ? conv.name || 'Group Chat'
                : conv.otherUser?.username || 'Direct Message';
            const subtitle = conv.lastMessage
              ? conv.lastMessage.deleted
                ? '[Deleted message]'
                : conv.lastMessage.text || (conv.lastMessage.attachment ? '📷 Media' : '')
              : 'No messages yet';
            const timestamp = conv.lastMessage?.created || conv.created;

            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  isActive
                    ? 'bg-dark-active border border-brand-500/40 text-white shadow-md'
                    : 'hover:bg-dark-surface/80 text-dark-subtext hover:text-white'
                }`}
              >
                {conv.type === 'group' ? (
                  <Avatar
                    src={conv.image ? getPocketBaseFileUrl(conv, conv.image) : undefined}
                    name={title}
                    size="md"
                  />
                ) : (
                  <Avatar user={conv.otherUser} size="md" showOnlineStatus />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-sm text-white truncate">{title}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {formatMessageTime(timestamp)}
                    </span>
                  </div>
                  <div className="text-xs truncate text-dark-subtext">{subtitle}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* User Footer Profile Card */}
      {currentUser && (
        <div className="p-3 border-t border-dark-border/60 bg-dark-bg/40 flex items-center justify-between">
          <div
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-dark-surface cursor-pointer transition-colors flex-1 min-w-0"
          >
            <Avatar user={currentUser} size="sm" showOnlineStatus isOnline={true} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{currentUser.username}</div>
              <div className="text-[10px] text-emerald-400 font-medium">Online</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="p-2 rounded-lg hover:bg-dark-surface text-dark-subtext hover:text-white transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-dark-surface text-red-400 hover:text-red-300 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
      <CreateGroupModal isOpen={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </aside>
  );
};
