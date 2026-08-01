import React from 'react';
import { useChat } from '../../hooks/useChat';

export const TypingIndicator: React.FC = () => {
  const { typingUsers } = useChat();

  const names = Object.values(typingUsers);
  if (names.length === 0) return null;

  const label =
    names.length === 1
      ? `${names[0]} is typing...`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing...`
      : 'Multiple people are typing...';

  return (
    <div className="px-6 py-1.5 flex items-center gap-2 animate-fade-in select-none">
      <div className="px-3.5 py-2 rounded-2xl bg-[#1f2937] border border-slate-700/60 flex items-center gap-2 text-xs text-emerald-400 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-slate-300 text-xs font-medium">{label}</span>
      </div>
    </div>
  );
};
