import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import {
  Paperclip,
  Send,
  Smile,
  Mic,
  Square,
  X,
  FileText,
  CornerUpLeft,
  Loader2,
} from 'lucide-react';
import { QUICK_EMOJIS } from '../../utils/constants';

export const MessageInput: React.FC = () => {
  const {
    activeConversation,
    sendMessage,
    replyToMessage,
    setReplyToMessage,
    editingMessage,
    setEditingMessage,
    editMessage,
    broadcastTyping,
  } = useChat();

  const { isRecording, recordingTime, startRecording, stopRecording, audioBlob } = useVoiceRecorder();

  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ name: string; url?: string; type: string }[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Block check — read from localStorage (same source as ProfileViewDrawer)
  const blockedUsers: string[] = (() => {
    try { return JSON.parse(localStorage.getItem('blocked_users') || '[]'); } catch { return []; }
  })();
  const otherUserId = activeConversation?.otherUser?.id || '';
  const isBlocked = otherUserId ? blockedUsers.includes(otherUserId) : false;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || '');
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [editingMessage]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 80)}px`;
    }
  }, [text]);

  useEffect(() => {
    if (audioBlob && activeConversation) {
      const voiceFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, {
        type: 'audio/webm',
      });
      sendMessage('', [voiceFile]);
    }
  }, [audioBlob, activeConversation, sendMessage]);

  if (!activeConversation) return null;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    broadcastTyping();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);

      const previews = selectedFiles.map((file) => ({
        name: file.name,
        type: file.type,
        url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }));
      setFilePreviews((prev) => [...prev, ...previews]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!text.trim() && files.length === 0) || isSending) return;

    try {
      setIsSending(true);
      if (editingMessage) {
        await editMessage(editingMessage.id, text.trim());
        setEditingMessage(null);
      } else {
        await sendMessage(text.trim(), files);
      }

      setText('');
      setFiles([]);
      setFilePreviews([]);
      setReplyToMessage(null);
      setShowEmojiPicker(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      // Handled by context
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatRecordTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="shrink-0 p-2 px-4 bg-background z-20">
      {/* Blocked User Banner */}
      {isBlocked && (
        <div className="mb-2 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-medium text-center flex items-center justify-center gap-2">
          <span>🚫</span> You've blocked this user. Unblock them to send messages.
        </div>
      )}
      {/* Reply Banner */}
      {replyToMessage && (
        <div className="mb-1.5 p-1 px-2.5 rounded-md bg-card border-l-2 border-primary flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-1.5 min-w-0">
            <CornerUpLeft className="w-3 h-3 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-foreground text-[10px]">
                Replying to {replyToMessage.expand?.sender?.username || 'User'}
              </span>
              <p className="text-[10px] text-muted-foreground truncate">
                {replyToMessage.deleted ? '[Message deleted]' : replyToMessage.text || 'Media attachment'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setReplyToMessage(null)}
            className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Edit Banner */}
      {editingMessage && (
        <div className="mb-1.5 p-1 px-2.5 rounded-md bg-amber-500/10 border-l-2 border-amber-500 flex items-center justify-between text-xs animate-fade-in">
          <span className="font-semibold text-amber-400 text-[10px]">Editing Message</span>
          <button
            onClick={() => {
              setEditingMessage(null);
              setText('');
            }}
            className="p-0.5 rounded-full hover:bg-muted text-amber-400"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* File Previews List */}
      {filePreviews.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5 p-1 rounded-lg bg-card border border-border">
          {filePreviews.map((preview, i) => (
            <div key={i} className="relative group flex items-center gap-1 p-1 rounded bg-muted border border-border text-[10px]">
              {preview.url ? (
                <img src={preview.url} alt="Preview" className="w-5 h-5 rounded object-cover" />
              ) : (
                <FileText className="w-3 h-3 text-primary" />
              )}
              <span className="max-w-[90px] truncate text-foreground">{preview.name}</span>
              <button
                onClick={() => removeFile(i)}
                className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Compact Slim Floating Message Input Container */}
      {isRecording ? (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="font-mono font-semibold text-[11px]">Recording: {formatRecordTimer(recordingTime)}</span>
          </div>
          <button
            onClick={stopRecording}
            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[10px] flex items-center gap-1 shadow-sm transition-all active:scale-95"
          >
            <Square className="w-2 h-2 fill-white" /> Stop & Send
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-card border border-border shadow-sm min-h-[38px]">
          {/* Text Area */}
          <div className="flex-1 min-w-0 flex items-center">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              disabled={isBlocked}
              placeholder={isBlocked ? 'Unblock user to send messages' : editingMessage ? 'Edit message...' : 'Enter message...'}
              className="w-full bg-transparent border-0 text-foreground text-xs focus:outline-none placeholder:text-muted-foreground resize-none max-h-16 py-1 leading-normal disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />

          {/* Action Buttons: Emoji, Attach, Mic */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Emoji Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-amber-400 transition-colors active:scale-95"
                title="Add Emoji"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-full mb-1.5 right-0 bg-card border border-border p-1 rounded-lg shadow-xl flex gap-1 z-30 animate-fade-in">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setText((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="p-1 hover:bg-muted rounded text-sm transition-transform active:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Paperclip */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95"
              title="Attach Document"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>

            {/* Voice Record Mic */}
            <button
              onClick={startRecording}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-emerald-500 transition-colors active:scale-95"
              title="Voice Message"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>

            {/* Compact Send Button */}
            <button
              onClick={handleSend}
              disabled={isBlocked || (!text.trim() && files.length === 0) || isSending}
              className="px-2.5 py-1 rounded-md bg-[#18181b] dark:bg-[#262626] text-white hover:opacity-90 font-semibold text-[11px] transition-all active:scale-95 border border-border shadow-sm disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-1 ml-0.5"
              title="Send Message"
            >
              {isSending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span>Send</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
