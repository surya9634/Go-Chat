import React from 'react';
import { getPocketBaseFileUrl } from '../../utils/formatters';
import { User } from '../../types';

interface AvatarProps {
  user?: User;
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const dotSizes = {
  xs: 'w-1.5 h-1.5 bottom-0 right-0 ring-1',
  sm: 'w-2.5 h-2.5 bottom-0 right-0 ring-2',
  md: 'w-3 h-3 bottom-0 right-0 ring-2',
  lg: 'w-3.5 h-3.5 bottom-0.5 right-0.5 ring-2',
  xl: 'w-4 h-4 bottom-1 right-1 ring-2',
};

export const Avatar: React.FC<AvatarProps> = ({
  user,
  src,
  name,
  size = 'md',
  showOnlineStatus = false,
  isOnline,
  className = '',
}) => {
  const avatarUrl = src || (user?.avatar ? getPocketBaseFileUrl(user, user.avatar) : '');
  const displayName = name || user?.username || 'User';
  const onlineState = isOnline !== undefined ? isOnline : user?.online;

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className={`${sizeClasses[size]} rounded-full object-cover border border-dark-border/40 shadow-sm`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-brand-600 to-indigo-700 font-semibold text-white flex items-center justify-center border border-white/10 shadow-sm`}
        >
          {initials}
        </div>
      )}

      {showOnlineStatus && (
        <span
          className={`absolute ${dotSizes[size]} rounded-full ring-dark-bg ${
            onlineState ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-gray-500'
          }`}
          title={onlineState ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};
