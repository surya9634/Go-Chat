import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { Avatar } from '../common/Avatar';
import { Plus, Upload, X, CircleFadingPlus, Sparkles, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '../../context/ToastContext';

interface StatusStoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatusStoriesModal: React.FC<StatusStoriesModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateProfile } = useAuth();
  const { allUsers } = useChat();
  const { showToast } = useToast();

  const [statusText, setStatusText] = useState(currentUser?.status_text || '');
  const [selectedEmoji, setSelectedEmoji] = useState(currentUser?.status_emoji || '🚀');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusEmojis = ['🚀', '☕', '💻', '🌴', '🎧', '🎯', '⚡', '🎉', '🔥', '😴'];

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await updateProfile({
        status_text: statusText,
        status_emoji: selectedEmoji,
      });
      showToast('Status updated!', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Status & Story Updates" maxWidth="md">
      <div className="space-y-6">
        {/* Your Current Status Card */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex items-center gap-3">
          <Avatar user={currentUser || undefined} size="lg" showOnlineStatus />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 font-semibold text-white text-sm">
              <span>{currentUser?.status_emoji || '🚀'}</span>
              <span className="truncate">{currentUser?.status_text || 'Set a custom status...'}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Your status is visible to all contacts</p>
          </div>
        </div>

        {/* Update Custom Status Form */}
        <form onSubmit={handleSaveStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Choose Emoji Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {statusEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`p-2 rounded-xl text-lg border transition-all ${
                    selectedEmoji === emoji
                      ? 'bg-primary/20 border-primary text-primary scale-110'
                      : 'bg-muted/40 border-border hover:bg-muted'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Status Message
            </label>
            <input
              type="text"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="e.g. In a meeting until 4 PM..."
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-white text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              Save Status
            </Button>
          </div>
        </form>

        {/* Contact Status Updates List */}
        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Recent Contact Statuses
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {allUsers.filter((u) => u.status_text).length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-3">
                No recent contact status updates.
              </div>
            ) : (
              allUsers
                .filter((u) => u.status_text)
                .map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20 border border-border/40"
                  >
                    <Avatar user={contact} size="md" showOnlineStatus />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white">{contact.username}</div>
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <span>{contact.status_emoji || '💬'}</span>
                        <span>{contact.status_text}</span>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
