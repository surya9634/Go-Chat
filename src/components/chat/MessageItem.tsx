import React, { useState } from 'react';
import { Message } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { Avatar } from '../common/Avatar';
import {
  getPocketBaseFileUrl,
  formatMessageTime,
  getFileCategory,
} from '../../utils/formatters';
import { QUICK_EMOJIS } from '../../utils/constants';
import {
  Reply,
  Edit2,
  Trash2,
  Pin,
  Check,
  CheckCheck,
  Smile,
  Copy,
  FileText,
  Volume2,
  CornerUpLeft,
  Download,
  Eye,
  Play,
} from 'lucide-react';
import { MediaLightbox } from '../common/MediaLightbox';

interface MessageItemProps {
  message: Message;
  isHighlighted?: boolean;
  showSenderName?: boolean;  // show sender name at top of a group
  isLastInGroup?: boolean;   // show avatar at bottom of a group
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isHighlighted,
  showSenderName = true,
  isLastInGroup = true,
}) => {
  const { currentUser } = useAuth();
  const {
    setReplyToMessage,
    setEditingMessage,
    deleteMessage,
    togglePinMessage,
    toggleReaction,
  } = useChat();

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const isOwn = message.sender === currentUser?.id;
  const senderUser = message.expand?.sender;
  const senderName = isOwn ? 'You' : senderUser?.username || 'User';

  const attachments: string[] = Array.isArray(message.attachment)
    ? message.attachment
    : message.attachment
    ? [message.attachment]
    : [];

  const reactions = message.expand?.reactions || [];
  const readReceipts = message.expand?.read_receipts || [];
  const isReadByOthers = readReceipts.some((rr) => rr.user !== currentUser?.id);

  // Group reactions by emoji
  const reactionCounts: { [emoji: string]: { count: number; userReacted: boolean } } = {};
  reactions.forEach((r) => {
    if (!reactionCounts[r.emoji]) {
      reactionCounts[r.emoji] = { count: 0, userReacted: false };
    }
    reactionCounts[r.emoji].count += 1;
    if (r.user === currentUser?.id) {
      reactionCounts[r.emoji].userReacted = true;
    }
  });

  const handleCopyText = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
    }
  };

  // Deleted Message Row
  if (message.deleted) {
    return (
      <div
        className={`flex items-center gap-2 px-4 md:px-6 py-0.5 select-none ${
          isOwn ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* spacer or avatar matching normal row */}
        {!isOwn && (
          isLastInGroup
            ? <Avatar user={senderUser} size="sm" className="shrink-0" />
            : <div className="w-8 h-8 shrink-0" />
        )}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border text-muted-foreground text-[11px] font-medium shadow-sm">
          <Trash2 className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="italic">Message deleted</span>
        </div>
      </div>
    );
  }

  // Filter image attachments for 2x2 grid rendering
  const imageFiles = attachments.filter((f) => getFileCategory(f) === 'image');
  const otherFiles = attachments.filter((f) => getFileCategory(f) !== 'image');

  return (
    <div
      className={`group relative flex items-end gap-2 px-4 md:px-6 transition-colors duration-150 ${
        isHighlighted ? 'bg-primary/10 border-l-2 border-primary' : ''
      } ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${
        isLastInGroup ? 'pb-1 pt-0.5' : 'pb-0 pt-0.5'
      }`}
    >
      {/* Avatar on last message of a group — own avatar right side, other avatar left side */}
      {isLastInGroup
        ? <Avatar user={isOwn ? currentUser : senderUser} size="sm" className="shrink-0 self-end mb-0.5" />
        : <div className="w-8 h-8 shrink-0" />
      }

      <div className={`flex flex-col max-w-[75%] sm:max-w-[60%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Message Bubble Container matching screenshot */}
        <div
          className={`relative px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed transition-all duration-150 w-fit ${
            isOwn
              ? 'bg-[#18181b] text-white dark:bg-[#18181b] dark:text-white rounded-br-xs shadow-sm border border-border/40'
              : 'bg-card border border-border text-foreground rounded-bl-xs shadow-sm'
          }`}
        >
          {/* Sender Name — only on the first message of a group */}
          {!isOwn && showSenderName && (
            <div className="text-[11px] font-bold text-primary mb-1 flex items-center gap-1.5">
              <span>{senderName}</span>
              {message.pinned && (
                <span className="flex items-center gap-0.5 text-[8px] font-medium text-amber-400 bg-amber-400/10 px-1 py-0.2 rounded border border-amber-400/20">
                  <Pin className="w-2.5 h-2.5 fill-amber-400" /> Pinned
                </span>
              )}
            </div>
          )}

          {/* Quoted Reply Snippet */}
          {message.expand?.reply_to && (
            <div className="mb-1.5 p-1.5 px-2 rounded-lg bg-muted/40 border-l-2 border-amber-400 text-xs text-foreground">
              <div className="flex items-center gap-1 font-semibold text-amber-400 mb-0.5 text-[10px]">
                <CornerUpLeft className="w-2.5 h-2.5" />
                <span>{message.expand.reply_to.expand?.sender?.username || 'Replying to message'}</span>
              </div>
              <div className="truncate text-muted-foreground text-[11px]">
                {message.expand.reply_to.deleted
                  ? '[Deleted message]'
                  : message.expand.reply_to.text || 'Media attachment'}
              </div>
            </div>
          )}

          {/* Text Content */}
          {message.text && (
            <div className="whitespace-pre-wrap break-words mb-1">{message.text}</div>
          )}

          {/* 2x2 Image Grid Layout matching Screenshot */}
          {imageFiles.length > 0 && (
            <div
              className={`grid gap-1.5 my-1.5 ${
                imageFiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
              }`}
            >
              {imageFiles.slice(0, 4).map((filename, i) => {
                const url = getPocketBaseFileUrl(message, filename);
                const isFourth = i === 3 && imageFiles.length > 4;
                const extraCount = imageFiles.length - 4;

                return (
                  <div
                    key={i}
                    onClick={() => setLightboxUrl(url)}
                    className="relative rounded-xl overflow-hidden cursor-pointer group/img max-h-48 border border-border"
                  >
                    <img
                      src={url}
                      alt="Attachment"
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                    />
                    {isFourth && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg">
                        +{extraCount}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Other File Attachments (Doc Cards & Audio Players matching Screenshot) */}
          {otherFiles.length > 0 && (
            <div className="space-y-2 my-1">
              {otherFiles.map((filename, i) => {
                const url = getPocketBaseFileUrl(message, filename);
                const category = getFileCategory(filename);

                if (category === 'video') {
                  return (
                    <video
                      key={i}
                      src={url}
                      controls
                      className="max-h-52 rounded-xl w-full border border-border"
                    />
                  );
                }

                if (category === 'audio') {
                  return (
                    <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 border border-border">
                      <audio src={url} controls className="h-8 max-w-full" />
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-background border border-border flex items-center justify-between gap-3 text-foreground"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate text-foreground">{filename}</div>
                        <div className="text-[10px] text-muted-foreground">Document File</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={url}
                        download={filename}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-md border border-border bg-card hover:bg-muted text-[11px] font-semibold text-foreground transition-colors cursor-pointer"
                      >
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(url)}
                        className="px-2.5 py-1 rounded-md border border-border bg-card hover:bg-muted text-[11px] font-semibold text-foreground transition-colors cursor-pointer"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Timestamp & Green Checkmark */}
          <div className="flex items-center justify-end gap-1 mt-1 select-none font-mono text-[10px] opacity-80">
            <span>{formatMessageTime(message.created)}</span>
            {message.edited && <span>(edited)</span>}
            {isOwn && (
              <span title={isReadByOthers ? 'Read' : 'Delivered'}>
                {isReadByOthers ? (
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-500 inline" />
                ) : (
                  <Check className="w-3.5 h-3.5 inline" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Reaction Badges */}
        {Object.keys(reactionCounts).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(reactionCounts).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(message.id, emoji)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 border transition-all duration-150 active:scale-95 ${
                  data.userReacted
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{emoji}</span>
                <span className="text-[10px] font-bold">{data.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover Action Bar */}
      <div
        className={`absolute -top-3 ${
          isOwn ? 'left-6' : 'right-6'
        } opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-card border border-border rounded-xl p-0.5 shadow-xl flex items-center gap-0.5 z-10`}
      >
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-amber-400 transition-colors active:scale-95"
            title="React"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-full mb-1 left-0 bg-card border border-border p-1.5 rounded-xl shadow-2xl flex gap-1 z-20 animate-fade-in">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    toggleReaction(message.id, emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="p-1 hover:bg-muted rounded text-base transition-transform active:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setReplyToMessage(message)}
          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors active:scale-95"
          title="Reply"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => togglePinMessage(message.id, message.pinned)}
          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-amber-400 transition-colors active:scale-95"
          title={message.pinned ? 'Unpin' : 'Pin'}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleCopyText}
          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95"
          title="Copy Text"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {isOwn && (
          <>
            <button
              onClick={() => setEditingMessage(message)}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors active:scale-95"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => deleteMessage(message.id)}
              className="p-1 rounded-lg hover:bg-muted text-red-400 hover:text-red-300 transition-colors active:scale-95"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <MediaLightbox isOpen={true} onClose={() => setLightboxUrl(null)} url={lightboxUrl} />
      )}
    </div>
  );
};
