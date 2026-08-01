export const getPocketBaseUrl = (): string => {
  if (import.meta.env.VITE_POCKETBASE_URL) {
    return import.meta.env.VITE_POCKETBASE_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    // If running in Vite dev server (port 5173 / 3000), target local PocketBase at 8090
    if (window.location.port === '5173' || window.location.port === '3000') {
      return `http://${window.location.hostname}:8090`;
    }
    // When deployed (e.g. on Render), PocketBase serves the frontend from same origin
    return window.location.origin;
  }
  return 'http://127.0.0.1:8090';
};

export const POCKETBASE_URL = getPocketBaseUrl();

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '🚀'];

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a'];
export const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip'
];
