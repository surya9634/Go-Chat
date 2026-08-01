import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { getFileCategory } from '../../utils/formatters';

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  filename?: string;
  type?: string;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  isOpen,
  onClose,
  url,
  filename,
  type,
}) => {
  if (!isOpen || !url) return null;

  const category = getFileCategory(filename, type);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <a
          href={url}
          download={filename || 'download'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-2.5 rounded-xl bg-dark-panel/80 hover:bg-dark-surface border border-dark-border text-white transition-colors"
          title="Download File"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="p-2.5 rounded-xl bg-dark-panel/80 hover:bg-dark-surface border border-dark-border text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        className="max-w-4xl max-h-[85vh] w-full flex items-center justify-center overflow-hidden p-2"
        onClick={(e) => e.stopPropagation()}
      >
        {category === 'image' && (
          <img
            src={url}
            alt={filename || 'Media preview'}
            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
          />
        )}

        {category === 'video' && (
          <video
            src={url}
            controls
            autoPlay
            className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
          />
        )}

        {(category === 'doc' || category === 'audio') && (
          <div className="bg-dark-panel border border-dark-border p-8 rounded-2xl max-w-md w-full text-center">
            <h4 className="font-semibold text-lg text-white mb-2">{filename || 'Document'}</h4>
            <p className="text-sm text-dark-subtext mb-6">Click below to open or download the file.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Open File
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
