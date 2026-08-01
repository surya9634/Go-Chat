import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StoryItem, User } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ToastContext';
import { storyService, pb } from '../services/pocketbase';

export interface StoryGroup {
  user: User;
  stories: StoryItem[];
  hasUnseen: boolean;
}

interface StoryContextType {
  storyGroups: StoryGroup[];
  activeStoryGroup: StoryGroup | null;
  activeStoryIndex: number;
  isViewerOpen: boolean;
  isCreateOpen: boolean;
  isLoadingStories: boolean;
  openStoryViewer: (group: StoryGroup, index?: number) => void;
  closeStoryViewer: () => void;
  nextStory: () => void;
  prevStory: () => void;
  openCreateStory: () => void;
  closeCreateStory: () => void;
  postStory: (file: File, caption?: string) => Promise<void>;
  refreshStories: () => Promise<void>;
}

const StoryContext = createContext<StoryContextType | undefined>(undefined);

export const StoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [activeStoryGroup, setActiveStoryGroup] = useState<StoryGroup | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoadingStories, setIsLoadingStories] = useState(false);

  const refreshStories = useCallback(async () => {
    try {
      setIsLoadingStories(true);
      const realGroups = await storyService.getStories();
      setStoryGroups(realGroups);
    } catch (e) {
      // ignore non-critical load error
    } finally {
      setIsLoadingStories(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshStories();

      // Subscribe to realtime story file creations
      pb.collection('files').subscribe('*', (e) => {
        if (e.action === 'create') {
          refreshStories();
        }
      }).catch(() => {});

      return () => {
        pb.collection('files').unsubscribe('*').catch(() => {});
      };
    }
  }, [currentUser, refreshStories]);

  const openStoryViewer = (group: StoryGroup, index = 0) => {
    setActiveStoryGroup(group);
    setActiveStoryIndex(index);
    setIsViewerOpen(true);
  };

  const closeStoryViewer = () => {
    setIsViewerOpen(false);
    setActiveStoryGroup(null);
    setActiveStoryIndex(0);
  };

  const nextStory = () => {
    if (!activeStoryGroup) return;
    if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
    } else {
      const groupIdx = storyGroups.findIndex((g) => g.user.id === activeStoryGroup.user.id);
      if (groupIdx >= 0 && groupIdx < storyGroups.length - 1) {
        setActiveStoryGroup(storyGroups[groupIdx + 1]);
        setActiveStoryIndex(0);
      } else {
        closeStoryViewer();
      }
    }
  };

  const prevStory = () => {
    if (!activeStoryGroup) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1);
    } else {
      const groupIdx = storyGroups.findIndex((g) => g.user.id === activeStoryGroup.user.id);
      if (groupIdx > 0) {
        const prevGroup = storyGroups[groupIdx - 1];
        setActiveStoryGroup(prevGroup);
        setActiveStoryIndex(prevGroup.stories.length - 1);
      }
    }
  };

  const openCreateStory = () => setIsCreateOpen(true);
  const closeCreateStory = () => setIsCreateOpen(false);

  const postStory = async (file: File, caption?: string) => {
    if (!currentUser) return;
    try {
      await storyService.uploadStory(file);

      // Local optimistic update
      const mediaUrl = URL.createObjectURL(file);
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

      const newStory: StoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        userId: currentUser.id,
        username: currentUser.username,
        userAvatar: currentUser.avatar,
        mediaUrl,
        mediaType,
        caption,
        createdAt: 'Just now',
      };

      setStoryGroups((prev) => {
        const existingIdx = prev.findIndex((g) => g.user.id === currentUser.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx].stories.unshift(newStory);
          updated[existingIdx].hasUnseen = true;
          return updated;
        } else {
          return [
            {
              user: currentUser,
              hasUnseen: true,
              stories: [newStory],
            },
            ...prev,
          ];
        }
      });

      showToast('Status Story uploaded & published!', 'success');
      closeCreateStory();
      refreshStories();
    } catch (err: any) {
      showToast(`Failed to upload story: ${err.message}`, 'error');
    }
  };

  return (
    <StoryContext.Provider
      value={{
        storyGroups,
        activeStoryGroup,
        activeStoryIndex,
        isViewerOpen,
        isCreateOpen,
        isLoadingStories,
        openStoryViewer,
        closeStoryViewer,
        nextStory,
        prevStory,
        openCreateStory,
        closeCreateStory,
        postStory,
        refreshStories,
      }}
    >
      {children}
    </StoryContext.Provider>
  );
};

export const useStory = () => {
  const context = useContext(StoryContext);
  if (!context) {
    throw new Error('useStory must be used within StoryProvider');
  }
  return context;
};
