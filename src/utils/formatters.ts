import { format, isToday, isYesterday, formatDistanceToNow, parseISO } from 'date-fns';
import { POCKETBASE_URL } from './constants';

export function getPocketBaseFileUrl(record: { id: string; collectionId?: string; collectionName?: string }, filename?: string): string {
  if (!record || !filename) return '';
  if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('blob:')) {
    return filename;
  }
  const collection = record.collectionName || record.collectionId || 'users';
  return `${POCKETBASE_URL}/api/files/${collection}/${record.id}/${filename}`;
}

export function formatMessageTime(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'h:mm a');
  } catch (e) {
    return '';
  }
}

export function formatDateSeparator(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';

    // Within the last 7 days → show weekday name (e.g. "Monday")
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) return format(date, 'EEEE'); // Monday, Tuesday …

    // Older → show full date (e.g. "25 Jan 2024")
    return format(date, 'd MMM yyyy');
  } catch (e) {
    return dateString;
  }
}


export function formatLastSeen(dateString?: string, isOnline?: boolean): string {
  if (isOnline) return 'Online';
  if (!dateString) return 'Offline';
  try {
    const date = parseISO(dateString);
    return `Last seen ${formatDistanceToNow(date, { addSuffix: true })}`;
  } catch (e) {
    return 'Offline';
  }
}

export function formatBytes(bytes?: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function getFileCategory(filename?: string, type?: string): 'image' | 'video' | 'audio' | 'doc' {
  if (!filename && !type) return 'doc';
  const mime = (type || '').toLowerCase();
  const name = (filename || '').toLowerCase();

  if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) return 'image';
  if (mime.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(name)) return 'video';
  if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|webm)$/i.test(name)) return 'audio';
  return 'doc';
}
