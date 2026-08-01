import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useChat } from '../../hooks/useChat';
import { Avatar } from '../common/Avatar';
import { Users, Upload, Check, Loader2, Camera, UserPlus } from 'lucide-react';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose }) => {
  const { allUsers, createGroupChat, refreshUsers } = useChat();
  const [name, setName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      refreshUsers();
    }
  }, [isOpen, refreshUsers]);

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || selectedUsers.length === 0) return;

    try {
      setIsSubmitting(true);
      await createGroupChat(name, selectedUsers, imageFile || undefined);
      setName('');
      setSelectedUsers([]);
      setImageFile(null);
      setImagePreview('');
      onClose();
    } catch (err) {
      // Toast handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Group Conversation" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Custom Group Logo / Photo Upload */}
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer group shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border-2 border-dashed border-emerald-500/40 flex items-center justify-center overflow-hidden group-hover:border-emerald-400 transition-all shadow-md relative">
              {imagePreview ? (
                <img src={imagePreview} alt="Group Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-emerald-400">
                  <UserPlus className="w-6 h-6" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-5 h-5" />
              </div>
            </div>
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>

          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Group Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Engineering Squad, Project Phoenix..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#1f2937] border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Member Selector List */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Select Members ({selectedUsers.length} selected)
          </label>
          <div className="max-h-60 overflow-y-auto border border-slate-700 rounded-xl divide-y divide-slate-700/50 bg-[#111827]">
            {allUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">No other users found.</div>
            ) : (
              allUsers.map((user) => {
                const isSelected = selectedUsers.includes(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className="flex items-center justify-between p-3 hover:bg-[#1f2937] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar user={user} size="sm" showOnlineStatus />
                      <div>
                        <div className="text-sm font-medium text-white">{user.username}</div>
                        <div className="text-xs text-slate-400">{user.email}</div>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-400 text-white'
                          : 'border-slate-700 bg-[#1f2937]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#1f2937] hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name || selectedUsers.length === 0}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Creating...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Create Group
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
