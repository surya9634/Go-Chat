import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { MessageItem } from './MessageItem';
import { formatDateSeparator } from '../../utils/formatters';
import { ChevronDown, Pin, Loader2, MessageSquare } from 'lucide-react';
import { Message } from '../../types';

export const MessageList: React.FC = () => {
  const { messages, activeConversation, isLoadingMessages, hasMoreMessages, loadMoreMessages, searchQuery } = useChat();
  const { currentUser } = useAuth();
  const listRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    
    // Check if scrolled near top for infinite pagination
    if (scrollTop < 50 && hasMoreMessages && !isLoadingMessages) {
      loadMoreMessages();
    }

    // Toggle scroll to bottom button
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 300);
  };

  // Filter messages by cleared_at timestamp for single-sided clear
  const currentUserId = currentUser?.id || '';
  const clearedAtStr = activeConversation?.id
    ? localStorage.getItem(`cleared_at_${activeConversation.id}_${currentUserId}`)
    : null;
  const clearedAtTime = clearedAtStr ? new Date(clearedAtStr).getTime() : 0;

  const unclearedMessages = messages.filter(
    (m) => new Date(m.created).getTime() > clearedAtTime && !m.text?.startsWith('[CALL_SIGNAL:')
  );

  const pinnedMessages = unclearedMessages.filter((m) => m.pinned && !m.deleted);

  // Filter by search query if present
  const displayedMessages = searchQuery
    ? unclearedMessages.filter((m) => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : unclearedMessages;

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-background">
      {/* Pinned Messages Top Bar */}
      {pinnedMessages.length > 0 && !searchQuery && (
        <div className="bg-card/90 border-b border-border px-6 py-2 flex items-center justify-between text-xs text-amber-400 shrink-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2 font-medium truncate">
            <Pin className="w-3.5 h-3.5 fill-amber-400 shrink-0" />
            <span className="truncate">
              Pinned ({pinnedMessages.length}): "{pinnedMessages[pinnedMessages.length - 1].text}"
            </span>
          </div>
        </div>
      )}

      {/* Message Feed Container */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4 space-y-0.5 scroll-smooth"
      >
        {isLoadingMessages && messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" /> Loading messages...
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/40 border border-border flex items-center justify-center text-primary">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">No messages found</p>
              <p className="text-xs text-muted-foreground mt-1">Say hello to kickstart the conversation!</p>
            </div>
          </div>
        ) : (
          <>
            {hasMoreMessages && (
              <div className="text-center py-2">
                <button
                  onClick={loadMoreMessages}
                  disabled={isLoadingMessages}
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  {isLoadingMessages ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Load older messages'}
                </button>
              </div>
            )}

            {displayedMessages.map((msg, index) => {
              const prevMsg = displayedMessages[index - 1];
              const currentDate = formatDateSeparator(msg.created);
              const prevDate = prevMsg ? formatDateSeparator(prevMsg.created) : null;
              const showDateSeparator = currentDate !== prevDate;

              const nextMsg = displayedMessages[index + 1];
              const nextDate = nextMsg ? formatDateSeparator(nextMsg.created) : null;
              const isDateBreakAfter = nextDate !== currentDate;

              // Avatar shows only on the LAST message of a consecutive group
              const isLastInGroup =
                !nextMsg ||
                nextMsg.sender !== msg.sender ||
                isDateBreakAfter ||
                (new Date(nextMsg.created).getTime() - new Date(msg.created).getTime()) / 1000 / 60 >= 5;

              // Name shown only on the FIRST message of a consecutive group
              const isFirstInGroup =
                !prevMsg ||
                prevMsg.sender !== msg.sender ||
                showDateSeparator ||
                (new Date(msg.created).getTime() - new Date(prevMsg.created).getTime()) / 1000 / 60 >= 5;

              const isMatched = searchQuery
                ? msg.text?.toLowerCase().includes(searchQuery.toLowerCase())
                : false;

              return (
                <React.Fragment key={msg.id}>
                  {showDateSeparator && (
                    <div className="my-4 flex items-center justify-center">
                      <span className="px-3 py-1 rounded-full bg-card border border-border text-[11px] font-semibold text-muted-foreground shadow-sm">
                        {currentDate}
                      </span>
                    </div>
                  )}
                  <MessageItem
                    message={msg}
                    isHighlighted={isMatched}
                    showSenderName={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                  />
                </React.Fragment>
              );
            })}
          </>
        )}
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-6 p-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl border border-white/10 transition-all animate-fade-in z-20"
          title="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
