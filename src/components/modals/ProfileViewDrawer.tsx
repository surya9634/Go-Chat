import React, { useState } from 'react';
import { User, Conversation } from '../../types';
import { Avatar } from '../common/Avatar';
import { getPocketBaseFileUrl, formatLastSeen } from '../../utils/formatters';
import { useCall } from '../../context/CallContext';
import { useChat } from '../../hooks/useChat';
import {
  X,
  Phone,
  Video,
  Mail,
  ShieldOff,
  Shield,
} from 'lucide-react';
import { Button } from '../ui/button';
import { MediaLightbox } from '../common/MediaLightbox';

interface ProfileViewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
  conversation?: Conversation;
}

export const ProfileViewDrawer: React.FC<ProfileViewDrawerProps> = ({
  isOpen,
  onClose,
  user,
  conversation,
}) => {
  const { initiateCall } = useCall();
  const { messages } = useChat();

  const [activeTab, setActiveTab] = useState<'info' | 'media'>('info');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Block user state — persisted in localStorage
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('blocked_users') || '[]');
    } catch { return []; }
  });

  const toggleBlock = (userId: string) => {
    setBlockedUsers((prev) => {
      const next = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      localStorage.setItem('blocked_users', JSON.stringify(next));
      return next;
    });
  };

  if (!isOpen) return null;

  const targetUser = user || conversation?.otherUser;
  const isGroup = conversation?.type === 'group';
  const title = isGroup ? conversation.name || 'Group Info' : targetUser?.username || 'Contact Info';

  const targetUserId = targetUser?.id || '';
  const isBlocked = blockedUsers.includes(targetUserId);

  // Filter media & files for this conversation
  const mediaMessages = messages.filter(
    (m) => m.attachment && !m.deleted
  );

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-card border-l border-border shadow-2xl flex flex-col animate-slide-up text-foreground">
      {/* Header */}
      <div className="h-16 px-4 border-b border-border flex items-center justify-between">
        <h3 className="font-bold text-foreground text-base">{title}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Top Profile Card */}
        <div className="flex flex-col items-center text-center">
          {isGroup ? (
            <Avatar
              src={
                conversation.image
                  ? getPocketBaseFileUrl(conversation, conversation.image)
                  : undefined
              }
              name={title}
              size="xl"
              className="mb-3 cursor-pointer hover:opacity-90 transition-opacity"
            />
          ) : (
            <Avatar
              user={targetUser}
              size="xl"
              showOnlineStatus
              className="mb-3 cursor-pointer hover:opacity-90 transition-opacity"
            />
          )}

          <h4 className="font-bold text-foreground text-lg">{title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isGroup
              ? `${conversation.expand?.['conversation_members(conversation)']?.length || 0} members`
              : formatLastSeen(targetUser?.last_seen, targetUser?.online)}
          </p>

          {/* Quick Call + Block Action Buttons */}
          {!isGroup && targetUser && (
            <div className="flex items-center gap-3 mt-4">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => initiateCall(targetUser, conversation?.id || '', 'audio')}
                className="rounded-full h-10 w-10 bg-muted hover:bg-emerald-500/20 text-foreground"
                title="Audio Call"
                disabled={isBlocked}
              >
                <Phone className="h-4 w-4 text-emerald-500" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => initiateCall(targetUser, conversation?.id || '', 'video')}
                className="rounded-full h-10 w-10 bg-muted hover:bg-emerald-500/20 text-foreground"
                title="Video Call"
                disabled={isBlocked}
              >
                <Video className="h-4 w-4 text-emerald-500" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => toggleBlock(targetUserId)}
                className={`rounded-full h-10 w-10 transition-all ${
                  isBlocked
                    ? 'bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-muted hover:bg-rose-500/20'
                }`}
                title={isBlocked ? 'Unblock User' : 'Block User'}
              >
                {isBlocked
                  ? <Shield className="h-4 w-4 text-rose-400" />
                  : <ShieldOff className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          )}

          {/* Blocked warning banner */}
          {isBlocked && (
            <div className="mt-3 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-medium flex items-center gap-2">
              <ShieldOff className="w-3.5 h-3.5 shrink-0" />
              You have blocked this user. They cannot send you messages.
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 p-1 bg-muted/40 rounded-xl border border-border/40">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'info' ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Info
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'media' ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Media
          </button>
        </div>

        {/* Tab 1: Profile Info */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            {targetUser?.bio && (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Bio / About
                </span>
                <p className="text-sm text-foreground">{targetUser.bio}</p>
              </div>
            )}

            {!isGroup && targetUser?.email && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border/40 text-sm">
                <Mail className="h-4 w-4 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-muted-foreground">Email</div>
                  <div className="text-xs font-medium text-foreground truncate">{targetUser.email}</div>
                </div>
              </div>
            )}

            {isGroup && conversation?.expand?.['conversation_members(conversation)'] && (
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Group Members
                </span>
                <div className="space-y-2">
                  {conversation.expand['conversation_members(conversation)'].map((mem) => (
                    <div key={mem.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/20">
                      <div className="flex items-center gap-2.5">
                        <Avatar user={mem.expand?.user} size="sm" showOnlineStatus />
                        <span className="text-xs font-semibold text-foreground">{mem.expand?.user?.username}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {mem.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Shared Media */}
        {activeTab === 'media' && (
          <div className="space-y-3">
            {mediaMessages.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No shared media yet.</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {mediaMessages.map((msg) => {
                  const attachments = Array.isArray(msg.attachment) ? msg.attachment : [msg.attachment];
                  return attachments.map((file, i) => {
                    const url = getPocketBaseFileUrl(msg, file);
                    return (
                      <div
                        key={i}
                        onClick={() => setLightboxUrl(url)}
                        className="aspect-square rounded-xl overflow-hidden bg-muted border border-border cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <img src={url} alt="Shared Media" className="w-full h-full object-cover" />
                      </div>
                    );
                  });
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {lightboxUrl && (
        <MediaLightbox isOpen={true} onClose={() => setLightboxUrl(null)} url={lightboxUrl} />
      )}
    </div>
  );
};
