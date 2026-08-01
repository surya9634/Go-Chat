import React from 'react';
import { useChat } from '../../hooks/useChat';
import { Avatar } from '../common/Avatar';
import { getPocketBaseFileUrl, formatLastSeen } from '../../utils/formatters';
import { Search, Pin, Users, MoreVertical, X } from 'lucide-react';

interface ChatHeaderProps {
  onToggleSearch: () => void;
  isSearchActive: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onToggleSearch, isSearchActive }) => {
  const { activeConversation, searchQuery, setSearchQuery, messages } = useChat();

  if (!activeConversation) return null;

  const isGroup = activeConversation.type === 'group';
  const title = isGroup
    ? activeConversation.name || 'Group Chat'
    : activeConversation.otherUser?.username || 'Direct Message';

  const pinnedCount = messages.filter((m) => m.pinned && !m.deleted).length;

  return (
    <header className="h-16 px-6 bg-dark-panel border-b border-dark-border/80 flex items-center justify-between shrink-0 select-none z-10">
      <div className="flex items-center gap-3.5 min-w-0">
        {isGroup ? (
          <Avatar
            src={
              activeConversation.image
                ? getPocketBaseFileUrl(activeConversation, activeConversation.image)
                : undefined
            }
            name={title}
            size="md"
          />
        ) : (
          <Avatar user={activeConversation.otherUser} size="md" showOnlineStatus />
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white truncate">{title}</h2>
            {isGroup && (
              <span className="px-2 py-0.5 rounded-full bg-brand-600/10 border border-brand-500/30 text-brand-400 text-[10px] font-semibold">
                Group
              </span>
            )}
          </div>
          <div className="text-xs text-dark-subtext truncate flex items-center gap-2">
            {isGroup ? (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {activeConversation.expand?.['conversation_members(conversation)']?.length || 0} members
              </span>
            ) : (
              <span>
                {formatLastSeen(
                  activeConversation.otherUser?.last_seen,
                  activeConversation.otherUser?.online
                )}
              </span>
            )}

            {pinnedCount > 0 && (
              <span className="flex items-center gap-1 text-amber-400 font-medium border-l border-dark-border/80 pl-2">
                <Pin className="w-3 h-3 fill-amber-400" /> {pinnedCount} pinned
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isSearchActive ? (
          <div className="relative flex items-center">
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in conversation..."
              className="w-48 sm:w-64 px-3 py-1.5 rounded-xl bg-dark-surface border border-dark-border text-white text-xs focus:outline-none focus:border-brand-500 transition-all"
            />
            <button
              onClick={() => {
                setSearchQuery('');
                onToggleSearch();
              }}
              className="p-1 text-gray-400 hover:text-white ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onToggleSearch}
            className="p-2 rounded-xl hover:bg-dark-surface text-dark-subtext hover:text-white transition-colors"
            title="Search Messages"
          >
            <Search className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
};
