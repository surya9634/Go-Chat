import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useStory } from '../../context/StoryContext';
import { Image as ImageIcon, Send, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

export const CreateStoryModal: React.FC = () => {
  const { isCreateOpen, closeCreateStory, postStory } = useStory();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setIsSubmitting(true);
      await postStory(file, caption);
      setFile(null);
      setPreviewUrl('');
      setCaption('');
    } catch (err) {
      // Toast handles error
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isCreateOpen) return null;

  return (
    <Modal isOpen={isCreateOpen} onClose={closeCreateStory} title="Add Status Story" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Media Preview / Selector */}
        <div className="flex flex-col items-center justify-center">
          <label className="relative cursor-pointer group w-full h-64 rounded-2xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center overflow-hidden hover:border-emerald-500 transition-colors">
            {previewUrl ? (
              file?.type.startsWith('video/') ? (
                <video src={previewUrl} controls className="w-full h-full object-cover" />
              ) : (
                <img src={previewUrl} alt="Story Preview" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-2">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-foreground">Upload Photo or Video</span>
                <span className="text-xs text-muted-foreground mt-1">Click or drag file here</span>
              </div>
            )}
            <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        {/* Story Caption Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Add Caption (Optional)
          </label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption for your status story..."
            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={closeCreateStory} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!file || isSubmitting}
            className="flex-1 gap-2 bg-emerald-500 hover:bg-emerald-400 text-white"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" /> Share Story
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
