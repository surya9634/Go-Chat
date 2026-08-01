import React, { useState } from 'react';
import { useStory, StoryGroup } from '../../context/StoryContext';
import { useAuth } from '../../hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { getPocketBaseFileUrl } from '../../utils/formatters';
import {
  Plus,
  CircleFadingPlus,
  X,
  Clock,
} from 'lucide-react';

const RING_GRADIENTS = [
  'from-emerald-500 to-teal-400',
  'from-teal-400 to-emerald-600',
  'from-emerald-400 to-cyan-500',
  'from-green-500 to-emerald-400',
];

export const StatusPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    storyGroups,
    openCreateStory,
    activeStoryGroup,
    activeStoryIndex,
  } = useStory();

  const [selectedGroup, setSelectedGroup] = useState<StoryGroup | null>(null);

  const myGroup = storyGroups.find((g) => g.user.id === currentUser?.id);
  const contactGroups = storyGroups.filter((g) => g.user.id !== currentUser?.id);

  const activeGroupToView = selectedGroup || activeStoryGroup;
  const currentStory = activeGroupToView?.stories[activeStoryIndex || 0];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Left Panel: Status List */}
      <div className="w-80 sm:w-96 border-r border-border bg-card flex flex-col h-full shrink-0">
        {/* Header */}
        <div className="h-16 px-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-xl text-foreground">Status & Stories</h2>
          <Button
            size="icon"
            onClick={openCreateStory}
            className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-white h-9 w-9 shadow-md"
            title="Add Status Story"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* My Status Card */}
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-3">
              My Status
            </span>
            <div
              onClick={() => {
                if (myGroup && myGroup.stories.length > 0) {
                  setSelectedGroup(myGroup);
                } else {
                  openCreateStory();
                }
              }}
              className="flex items-center gap-3.5 p-3 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/60 cursor-pointer transition-colors"
            >
              <div className="relative">
                <Avatar className="w-12 h-12 border-2 border-emerald-500">
                  <AvatarImage
                    src={
                      currentUser?.avatar
                        ? getPocketBaseFileUrl(currentUser, currentUser.avatar)
                        : undefined
                    }
                  />
                  <AvatarFallback>
                    {(currentUser?.username || 'U').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-background">
                  +
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground truncate">My Status</div>
                <div className="text-xs text-muted-foreground truncate">
                  {myGroup && myGroup.stories.length > 0
                    ? `${myGroup.stories.length} active updates (expires in 48h)`
                    : 'Tap to add status update'}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Contact Status Updates */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Recent Updates (Last 48 Hours)
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Auto-expires 48h
              </span>
            </div>

            {contactGroups.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2 border border-dashed border-border/60 rounded-2xl bg-muted/20">
                <CircleFadingPlus className="w-8 h-8 opacity-40 text-emerald-500" />
                <span>No recent status updates from contacts yet</span>
                <span className="text-[11px] opacity-75">
                  When contacts post photos or videos, they will appear here for 48 hours!
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {contactGroups.map((group, i) => {
                  const gradient = RING_GRADIENTS[i % RING_GRADIENTS.length];
                  const isSelected = selectedGroup?.user.id === group.user.id;

                  return (
                    <div
                      key={group.user.id}
                      onClick={() => setSelectedGroup(group)}
                      className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-muted border-emerald-500'
                          : 'bg-muted/20 border-border/40 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`p-0.5 rounded-full bg-gradient-to-tr ${gradient}`}>
                        <div className="p-0.5 bg-background rounded-full">
                          <Avatar className="w-11 h-11">
                            <AvatarImage src={group.user.avatar} />
                            <AvatarFallback>
                              {group.user.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {group.user.username}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {group.stories[0]?.createdAt || 'Recently'} • {group.stories.length} update
                          {group.stories.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Stage: Interactive Story Viewer / Preview */}
      <div className="flex-1 flex flex-col items-center justify-center bg-black/90 relative p-6">
        {activeGroupToView && currentStory ? (
          <div className="relative w-full max-w-lg h-[85vh] rounded-3xl overflow-hidden bg-black flex flex-col justify-between shadow-2xl border border-white/10">
            {/* Top Progress Bar */}
            <div className="absolute top-3 inset-x-3 z-30 flex gap-1.5">
              {activeGroupToView.stories.map((s, idx) => (
                <div key={s.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-white transition-all ${
                      idx < (activeStoryIndex || 0)
                        ? 'w-full'
                        : idx === (activeStoryIndex || 0)
                        ? 'w-full animate-pulse'
                        : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Top Header */}
            <div className="absolute top-6 inset-x-4 z-30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar className="w-9 h-9 border border-white/20">
                  <AvatarImage src={activeGroupToView.user.avatar} />
                  <AvatarFallback>
                    {activeGroupToView.user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-bold text-white leading-tight">
                    {activeGroupToView.user.username}
                  </div>
                  <div className="text-[10px] text-gray-300">
                    {currentStory.createdAt} • Expires in 48h
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Story Display Media */}
            <div className="w-full h-full flex items-center justify-center bg-black">
              {currentStory.mediaType === 'video' ? (
                <video
                  src={currentStory.mediaUrl}
                  autoPlay
                  controls
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

            {/* Bottom Caption Overlay */}
            {currentStory.caption && (
              <div className="absolute bottom-6 inset-x-4 z-30 p-4 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md text-center text-white text-sm font-medium">
                {currentStory.caption}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-6 max-w-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mb-4">
              <CircleFadingPlus className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Status Updates</h3>
            <p className="text-sm mt-1 text-muted-foreground">
              Select a contact from the left panel to view their photos & video stories, or click the plus button to share your own status update!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
