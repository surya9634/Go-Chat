import React, { useEffect } from 'react';
import { useStory } from '../../context/StoryContext';
import { Avatar } from '../common/Avatar';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export const StoryViewerModal: React.FC = () => {
  const {
    isViewerOpen,
    activeStoryGroup,
    activeStoryIndex,
    closeStoryViewer,
    nextStory,
    prevStory,
  } = useStory();

  useEffect(() => {
    if (!isViewerOpen || !activeStoryGroup) return;

    // Auto-advance timer (5s per slide)
    const timer = setTimeout(() => {
      nextStory();
    }, 5000);

    return () => clearTimeout(timer);
  }, [isViewerOpen, activeStoryGroup, activeStoryIndex, nextStory]);

  if (!isViewerOpen || !activeStoryGroup) return null;

  const currentStory = activeStoryGroup.stories[activeStoryIndex];
  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-md h-[90vh] rounded-3xl overflow-hidden bg-black flex flex-col justify-between shadow-2xl border border-white/10">
        {/* Top Progress Bars */}
        <div className="absolute top-3 inset-x-3 z-30 flex gap-1.5">
          {activeStoryGroup.stories.map((s, idx) => (
            <div key={s.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full bg-white transition-all duration-300 ${
                  idx < activeStoryIndex
                    ? 'w-full'
                    : idx === activeStoryIndex
                    ? 'animate-[storyProgress_5s_linear_forwards]'
                    : 'w-0'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Top User Bar */}
        <div className="absolute top-6 inset-x-4 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar user={activeStoryGroup.user} size="sm" showOnlineStatus />
            <div>
              <div className="text-sm font-semibold text-white leading-tight">
                {activeStoryGroup.user.username}
              </div>
              <div className="text-[10px] text-gray-300">{currentStory.createdAt}</div>
            </div>
          </div>
          <button
            onClick={closeStoryViewer}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Click Areas for Navigation */}
        <button
          onClick={prevStory}
          className="absolute left-0 inset-y-0 w-1/3 z-20 focus:outline-none flex items-center justify-start pl-2 text-white/40 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        <button
          onClick={nextStory}
          className="absolute right-0 inset-y-0 w-1/3 z-20 focus:outline-none flex items-center justify-end pr-2 text-white/40 hover:text-white transition-colors"
        >
          <ChevronRight className="w-8 h-8" />
        </button>

        {/* Story Media */}
        <div className="w-full h-full flex items-center justify-center bg-black">
          {currentStory.mediaType === 'video' ? (
            <video
              src={currentStory.mediaUrl}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt="Status Story"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Caption Overlay */}
        {currentStory.caption && (
          <div className="absolute bottom-6 inset-x-4 z-30 p-4 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md text-center text-white text-sm font-medium animate-slide-up">
            {currentStory.caption}
          </div>
        )}
      </div>
    </div>
  );
};
