"use client"

// ** Imports: React & Hooks **
import React, { useState } from "react"

// ** PocketBase Hooks & Context **
import { useChat } from "@/hooks/useChat"
import { useAuth } from "@/hooks/useAuth"
import { useCall } from "@/context/CallContext"
import { useStory } from "@/context/StoryContext"
import { useTheme } from "@/context/ThemeContext"
import { getPocketBaseFileUrl, formatMessageTime } from "@/utils/formatters"

// ** UI Components **
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { SidebarProvider } from "@/components/blocks/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ** Modals & Drawers **
import { NewChatModal } from "@/components/modals/NewChatModal"
import { CreateGroupModal } from "@/components/modals/CreateGroupModal"
import { ProfileModal } from "@/components/modals/ProfileModal"
import { ProfileViewDrawer } from "@/components/modals/ProfileViewDrawer"
import { MessageList } from "@/components/chat/MessageList"
import { MessageInput } from "@/components/chat/MessageInput"
import { TypingIndicator } from "@/components/chat/TypingIndicator"
import { StatusPage } from "@/components/status/StatusPage"

// ** Icons **
import {
  CircleFadingPlus,
  MessageCircle,
  MessageSquareDashed,
  Phone,
  PhoneCall,
  PhoneOff,
  Search,
  Settings,
  Users,
  UserPlus,
  Video,
  LogOut,
  Plus,
  MoreVertical,
  ChevronLeft,
  Sun,
  Moon,
  CheckCheck,
  Eye,
  EyeOff,
  Eraser,
  Shield,
  ShieldOff,
  Trash2,
} from "lucide-react"

export const Home = () => {
  const { logout } = useAuth()
  const { initiateCall } = useCall()
  const { storyGroups } = useStory()
  const { theme, toggleTheme } = useTheme()
  const {
    conversations,
    activeConversation,
    selectConversation,
    isLoadingConversations,
    allUsers,
    startPrivateChat,
  } = useChat()

  const [activeNavTab, setActiveNavTab] = useState<"chats" | "calls" | "contacts" | "groups" | "saved" | "status">("chats")
  const [searchFilter, setSearchFilter] = useState("")

  // Hidden Chats State (Persisted in LocalStorage)
  const [hiddenChatIds, setHiddenChatIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("hidden_chat_ids")
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      return []
    }
  })

  // Toggle Hide / Unhide Chat
  const toggleHideChat = (convId: string) => {
    setHiddenChatIds((prev) => {
      const next = prev.includes(convId)
        ? prev.filter((id) => id !== convId)
        : [...prev, convId]
      localStorage.setItem("hidden_chat_ids", JSON.stringify(next))
      return next
    })
  }

  // Modals & Drawer State
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false)

  // Filter conversations based on Hidden Chats & Search query
  const filteredConversations = conversations.filter((conv) => {
    const isHidden = hiddenChatIds.includes(conv.id)
    if (activeNavTab === "saved") {
      if (!isHidden) return false
    } else {
      if (isHidden) return false
    }

    if (!searchFilter) return true
    const s = searchFilter.toLowerCase()
    if (conv.type === "group") return conv.name?.toLowerCase().includes(s)
    return (
      conv.otherUser?.username?.toLowerCase().includes(s) ||
      conv.otherUser?.email?.toLowerCase().includes(s)
    )
  })

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-background text-foreground overflow-hidden select-none">
      {/* 1. Desktop Leftmost Navigation Sidebar */}
      <aside className="hidden md:flex w-16 bg-sidebar border-r border-sidebar-border flex-col justify-between items-center py-4 px-2 shrink-0 z-20">
        {/* Top Icon Group */}
        <div className="space-y-4 flex flex-col items-center w-full">
          {/* Main Chats Badge - Green ONLY when activeNavTab === "chats" */}
          <button
            onClick={() => setActiveNavTab("chats")}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeNavTab === "chats"
                ? "bg-muted text-emerald-500 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
            }`}
            title="Chats"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
          </button>

          {/* Status & Stories Icon - Green ONLY when activeNavTab === "status" */}
          <button
            onClick={() => setActiveNavTab("status")}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative ${
              activeNavTab === "status"
                ? "bg-muted text-emerald-500 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
            }`}
            title="Status & Stories"
          >
            <CircleFadingPlus className="w-5 h-5" />
            {storyGroups.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          {/* Create Group Icon */}
          <button
            onClick={() => setIsCreateGroupOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-emerald-500 hover:bg-sidebar-accent transition-colors"
            title="Create New Group"
          >
            <UserPlus className="w-5 h-5" />
          </button>

          {/* Phone Calls Button - Green ONLY when activeNavTab === "calls" */}
          <button
            onClick={() => {
              setActiveNavTab("calls");
              selectConversation(null);
            }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeNavTab === "calls"
                ? "bg-muted text-emerald-500 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
            }`}
            title="Calls"
          >
            <Phone className="w-5 h-5" />
          </button>

          {/* Contacts Icon - Green ONLY when activeNavTab === "contacts" */}
          <button
            onClick={() => {
              setActiveNavTab("contacts");
              selectConversation(null);
            }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeNavTab === "contacts"
                ? "bg-muted text-emerald-500 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
            }`}
            title="Contacts"
          >
            <Users className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Icon Group */}
        <div className="space-y-3 flex flex-col items-center w-full">
          {/* Hidden Chats Vault Icon - Green ONLY when activeNavTab === "saved" */}
          <button
            onClick={() => setActiveNavTab("saved")}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative ${
              activeNavTab === "saved"
                ? "bg-muted text-emerald-500 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
            }`}
            title="Hidden Chats Vault"
          >
            <EyeOff className="w-5 h-5" />
            {hiddenChatIds.length > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold text-[9px]">
                {hiddenChatIds.length}
              </span>
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Settings Icon */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            title="Settings & Profile"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Sign Out Icon */}
          <button
            onClick={logout}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:bg-sidebar-accent transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* 2. Main Body Container */}
      <div className="flex-1 flex flex-col md:flex-row h-full min-w-0 pb-14 md:pb-0">
        {activeNavTab === "status" ? (
          <StatusPage />
        ) : activeNavTab === "calls" ? (
          <CallsLogPanel conversations={conversations} onInitiateCall={initiateCall} />
        ) : activeNavTab === "contacts" ? (
          <ContactsPanel allUsers={allUsers} onStartChat={startPrivateChat} onSelectConversation={selectConversation} />
        ) : (
          <div className="flex-1 flex h-full w-full">
            {/* Middle Panel: Chats Directory */}
            <div
              className={`${
                activeConversation ? "hidden md:flex md:w-[360px] shrink-0" : "flex w-full md:w-[360px] shrink-0"
              } flex-col h-full border-r border-border bg-card`}
            >
              {/* Header */}
              <div className="p-4 border-b border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                    {activeNavTab === "saved" ? (
                      <>
                        <EyeOff className="w-5 h-5 text-muted-foreground" />
                        <span>Hidden Chats</span>
                      </>
                    ) : (
                      <span>Chats</span>
                    )}
                  </h2>

                  {/* Neutral Header Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-emerald-500 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                      title="Create New Group"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Group</span>
                    </button>
                    <button
                      onClick={() => setIsNewChatOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                      title="New Direct Message"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder={activeNavTab === "saved" ? "Search hidden chats..." : "Chats search..."}
                    className="pl-9 bg-background border-border text-xs text-foreground rounded-lg placeholder:text-muted-foreground h-9 focus-visible:ring-1 focus-visible:ring-emerald-500"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                </div>
              </div>

              {/* Conversations List */}
              <ScrollArea className="flex-grow divide-y divide-border/40">
                {isLoadingConversations ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Loading chats...
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                    {activeNavTab === "saved" ? (
                      <>
                        <EyeOff className="h-8 w-8 opacity-40 text-muted-foreground" />
                        <span className="font-semibold text-foreground">No hidden chats</span>
                        <span className="text-[11px] text-muted-foreground">
                          Hide any conversation from the list options to move it to your Hidden Vault!
                        </span>
                      </>
                    ) : (
                      <>
                        <MessageSquareDashed className="h-8 w-8 opacity-40 text-muted-foreground" />
                        <span>No chats found</span>
                        <div className="flex gap-2 mt-1">
                          <Button
                            variant="outline"
                            className="text-xs border-border text-muted-foreground hover:text-emerald-500"
                            onClick={() => setIsCreateGroupOpen(true)}
                          >
                            + Create Group
                          </Button>
                          <Button
                            variant="link"
                            className="text-emerald-500 text-xs"
                            onClick={() => setIsNewChatOpen(true)}
                          >
                            Start a chat
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <ConversationListItem
                      key={conv.id}
                      conv={conv}
                      isSelected={activeConversation?.id === conv.id}
                      isHidden={hiddenChatIds.includes(conv.id)}
                      onSelect={() => selectConversation(conv)}
                      onToggleHide={() => toggleHideChat(conv.id)}
                    />
                  ))
                )}
              </ScrollArea>
            </div>

            {/* Right Main Panel - Active Chat Window */}
            <div
              className={`${
                activeConversation ? "flex w-full" : "hidden md:flex flex-1"
              } flex-col h-full bg-background relative overflow-hidden`}
            >
              {activeConversation ? (
                <div className="flex flex-col h-full w-full bg-background relative">
                  {/* Chat Header */}
                  <div className="h-16 border-b border-border flex items-center px-4 md:px-6 justify-between shrink-0 bg-card">
                    <div
                      onClick={() => setIsProfileDrawerOpen(true)}
                      className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity min-w-0"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectConversation(null);
                        }}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground md:hidden shrink-0"
                        title="Back to Chats List"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <div className="relative shrink-0">
                        <Avatar className="h-9 w-9 md:h-10 md:w-10 border border-border">
                          <AvatarImage
                            src={
                              activeConversation.type === "group"
                                ? activeConversation.image
                                  ? getPocketBaseFileUrl(activeConversation, activeConversation.image)
                                  : undefined
                                : activeConversation.otherUser?.avatar
                                ? getPocketBaseFileUrl(
                                    activeConversation.otherUser,
                                    activeConversation.otherUser.avatar
                                  )
                                : undefined
                            }
                          />
                          <AvatarFallback>
                            {(activeConversation.name || activeConversation.otherUser?.username || "CH")
                              .substring(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {activeConversation.type !== "group" && activeConversation.otherUser?.online && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-card" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <CardTitle className="text-sm md:text-base font-bold text-foreground flex items-center gap-1.5 truncate">
                          <span className="truncate">
                            {activeConversation.type === "group"
                              ? activeConversation.name || "Group Chat"
                              : activeConversation.otherUser?.username || "Direct Message"}
                          </span>
                          {hiddenChatIds.includes(activeConversation.id) && (
                            <span className="px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground border border-border text-[9px] font-semibold shrink-0">
                              Hidden
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="text-[11px] text-muted-foreground font-medium truncate">
                          {activeConversation.type === "group"
                            ? `${activeConversation.expand?.["conversation_members(conversation)"]?.length || 0} members`
                            : activeConversation.otherUser?.online
                            ? "Online"
                            : "Offline"}
                        </CardDescription>
                      </div>
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleHideChat(activeConversation.id)}
                        className={`p-2 rounded-xl border border-border transition-colors active:scale-95 cursor-pointer ${
                          hiddenChatIds.includes(activeConversation.id)
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                            : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                        title={
                          hiddenChatIds.includes(activeConversation.id)
                            ? "Unhide Chat"
                            : "Hide Chat"
                        }
                      >
                        {hiddenChatIds.includes(activeConversation.id) ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>

                      {activeConversation.type !== "group" && activeConversation.otherUser && (
                        <>
                          <button
                            onClick={() =>
                              initiateCall(activeConversation.otherUser!, activeConversation.id, "video")
                            }
                            className="p-2 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer"
                            title="Start Video Call"
                          >
                            <Video className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              initiateCall(activeConversation.otherUser!, activeConversation.id, "audio")
                            }
                            className="p-2 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer"
                            title="Start Audio Call"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setIsProfileDrawerOpen(true)}
                        className="p-2 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer"
                        title="Contact Information"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Message Feed */}
                  <MessageList />
                  <TypingIndicator />

                  {/* Message Composer Input */}
                  <MessageInput />

                  {/* Contact Profile Drawer Inspector */}
                  <ProfileViewDrawer
                    isOpen={isProfileDrawerOpen}
                    onClose={() => setIsProfileDrawerOpen(false)}
                    conversation={activeConversation}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-muted text-muted-foreground flex items-center justify-center mb-4">
                    <MessageCircle className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">No Chat Selected</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    Select a conversation from the list or click + New to start messaging!
                  </p>
                </div>
              )}
            </div>
          </div>
        ) /* end calls/contacts/chats else */}
      </div>

      {/* 3. Mobile Bottom Navigation Bar - ONLY active tab icon turns emerald! */}
      <div className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-card border-t border-border flex items-center justify-around z-30 px-2">
        <button
          onClick={() => {
            setActiveNavTab("chats");
            selectConversation(null);
          }}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg transition-colors ${
            activeNavTab === "chats" ? "text-emerald-500 font-bold" : "text-muted-foreground"
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-[10px]">Chats</span>
        </button>

        <button
          onClick={() => setIsCreateGroupOpen(true)}
          className="flex flex-col items-center gap-0.5 p-1 rounded-lg text-muted-foreground hover:text-emerald-500 font-semibold"
          title="Create New Group"
        >
          <UserPlus className="w-5 h-5" />
          <span className="text-[10px]">New Group</span>
        </button>

        <button
          onClick={() => {
            setActiveNavTab("status");
            selectConversation(null);
          }}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg transition-colors relative ${
            activeNavTab === "status" ? "text-emerald-500 font-bold" : "text-muted-foreground"
          }`}
        >
          <CircleFadingPlus className="w-5 h-5" />
          <span className="text-[10px]">Status</span>
          {storyGroups.length > 0 && (
            <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => {
            setActiveNavTab("saved");
            selectConversation(null);
          }}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg transition-colors relative ${
            activeNavTab === "saved" ? "text-emerald-500 font-bold" : "text-muted-foreground"
          }`}
        >
          <EyeOff className="w-5 h-5" />
          <span className="text-[10px]">Hidden</span>
        </button>

        <button
          onClick={() => setIsProfileOpen(true)}
          className="flex flex-col items-center gap-0.5 p-1 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">Settings</span>
        </button>
      </div>

      {/* Modals & Dialogs */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
      />
      <CreateGroupModal isOpen={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  )
}

// Sub-component for list item
const ConversationListItem: React.FC<{
  conv: any;
  isSelected: boolean;
  isHidden?: boolean;
  onSelect: () => void;
  onToggleHide: () => void;
}> = ({ conv, isSelected, isHidden, onSelect, onToggleHide }) => {
  const { clearChat, deleteConversation } = useChat()
  const { currentUser } = useAuth()

  const isGroup = conv.type === "group"
  const name = isGroup
    ? conv.name || "Group Chat"
    : conv.otherUser?.username || "Direct Message"
  const avatarSrc = isGroup
    ? conv.image
      ? getPocketBaseFileUrl(conv, conv.image)
      : undefined
    : conv.otherUser?.avatar
    ? getPocketBaseFileUrl(conv.otherUser, conv.otherUser.avatar)
    : undefined
  let messageText = conv.lastMessage?.text || (conv.lastMessage?.attachment?.length ? "📷 Attachment" : "No messages yet")
  if (messageText.startsWith('[CALL_SIGNAL:')) {
    messageText = messageText.includes(':video:') ? "📹 Video Call" : "📞 Voice Call"
  }
  const isOwnMessage = conv.lastMessage?.sender === currentUser?.id
  const timestamp = conv.lastMessage?.created || conv.created
  const unreadCount = (typeof conv.unreadCount === 'number' ? conv.unreadCount : 0)
  const otherUserId = conv.otherUser?.id

  // Blocked user state from localStorage
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('blocked_users') || '[]'); } catch { return []; }
  })
  const isBlocked = otherUserId ? blockedUsers.includes(otherUserId) : false

  const toggleBlock = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!otherUserId) return
    const next = isBlocked
      ? blockedUsers.filter((id) => id !== otherUserId)
      : [...blockedUsers, otherUserId]
    setBlockedUsers(next)
    localStorage.setItem('blocked_users', JSON.stringify(next))
  }

  return (
    <div
      onClick={onSelect}
      className={`group px-4 py-3.5 w-full cursor-pointer text-left transition-colors flex items-center justify-between gap-2 ${
        isSelected
          ? "bg-secondary border-l-2 border-emerald-500"
          : "hover:bg-muted/50"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative shrink-0">
          <Avatar className="h-11 w-11 border border-border/80 shadow-sm ring-1 ring-border/20">
            <AvatarImage src={avatarSrc} className="object-cover" />
            <AvatarFallback className="font-bold text-xs bg-emerald-500/10 text-emerald-500">
              {name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!isGroup && conv.otherUser?.online && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card shadow-sm" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-foreground truncate">{name}</span>
            <span className="text-[10px] text-muted-foreground font-medium">
              {formatMessageTime(timestamp)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
            <div className="flex items-center gap-1 min-w-0 truncate">
              {conv.lastMessage && isOwnMessage && (
                <CheckCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              )}
              <span className="truncate text-xs text-muted-foreground">{messageText}</span>
            </div>
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-sm">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Permanent Three Dots Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          asChild
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="p-1.5 rounded-lg border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0"
            title="Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 z-50">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              onToggleHide()
            }}
            className="cursor-pointer text-xs flex items-center gap-2"
          >
            {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isHidden ? "Unhide Chat" : "Hide Chat"}</span>
          </DropdownMenuItem>

          {!isGroup && otherUserId && (
            <DropdownMenuItem
              onClick={toggleBlock}
              className={`cursor-pointer text-xs flex items-center gap-2 ${
                isBlocked ? "text-rose-400 font-semibold" : ""
              }`}
            >
              {isBlocked ? <Shield className="w-3.5 h-3.5 text-rose-400" /> : <ShieldOff className="w-3.5 h-3.5" />}
              <span>{isBlocked ? "Unblock User" : "Block User"}</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              if (window.confirm(`Clear chat history with ${name}?`)) {
                clearChat(conv.id)
              }
            }}
            className="cursor-pointer text-xs flex items-center gap-2 text-amber-500 hover:text-amber-400 focus:text-amber-500"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              if (window.confirm(`Delete conversation with ${name}?`)) {
                deleteConversation(conv.id)
              }
            }}
            className="cursor-pointer text-xs flex items-center gap-2 text-rose-500 hover:text-rose-400 focus:text-rose-500 font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Chat</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function ChatTemplateDemo() {
  return (
    <SidebarProvider>
      <Home />
    </SidebarProvider>
  )
}

// ─── Calls Log Panel ──────────────────────────────────────────────────────────
const CallsLogPanel: React.FC<{
  conversations: any[];
  onInitiateCall: (user: any, convId: string, type: "audio" | "video") => void;
}> = ({ conversations, onInitiateCall }) => {
  const [search, setSearch] = useState("")
  const privatConvs = conversations
    .filter((c) => c.type === "private" && c.otherUser)
    .filter((c) =>
      search ? c.otherUser?.username?.toLowerCase().includes(search.toLowerCase()) : true
    )

  return (
    <div className="flex flex-col h-full w-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3 shrink-0">
        <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Phone className="w-5 h-5 text-muted-foreground" />
          Calls
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-9 bg-background border-border text-xs text-foreground rounded-lg placeholder:text-muted-foreground h-9 focus-visible:ring-1 focus-visible:ring-emerald-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-grow">
        {privatConvs.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <PhoneOff className="h-8 w-8 opacity-40" />
            <span>No recent calls</span>
            <span className="text-[11px]">Start a conversation and hit the call button!</span>
          </div>
        ) : (
          privatConvs.map((conv) => (
            <div
              key={conv.id}
              className="px-4 py-3 flex items-center gap-3 hover:bg-muted/50 border-b border-border/40 transition-colors"
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <Avatar className="h-11 w-11 border border-border/80 shadow-sm ring-1 ring-border/20">
                  <AvatarImage
                    src={
                      conv.otherUser?.avatar
                        ? getPocketBaseFileUrl(conv.otherUser, conv.otherUser.avatar)
                        : undefined
                    }
                    className="object-cover"
                  />
                  <AvatarFallback className="font-bold text-xs bg-emerald-500/10 text-emerald-500">
                    {(conv.otherUser?.username || "U").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {conv.otherUser?.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card shadow-sm" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{conv.otherUser?.username}</p>
                <p className="text-xs text-muted-foreground">
                  {conv.otherUser?.online ? "Online" : "Offline"}
                </p>
              </div>

              {/* Call buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => onInitiateCall(conv.otherUser, conv.id, "audio")}
                  className="p-2 rounded-xl bg-background border border-border hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/40 text-muted-foreground transition-all active:scale-95"
                  title="Audio Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onInitiateCall(conv.otherUser, conv.id, "video")}
                  className="p-2 rounded-xl bg-background border border-border hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/40 text-muted-foreground transition-all active:scale-95"
                  title="Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  )
}

// ─── Contacts Panel ───────────────────────────────────────────────────────────
const ContactsPanel: React.FC<{
  allUsers: any[];
  onStartChat: (userId: string) => Promise<any>;
  onSelectConversation: (conv: any) => void;
}> = ({ allUsers, onStartChat, onSelectConversation }) => {
  const [search, setSearch] = useState("")
  const [starting, setStarting] = useState<string | null>(null)

  const filtered = allUsers.filter((u) =>
    search
      ? u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
      : true
  )

  const handleStartChat = async (userId: string) => {
    setStarting(userId)
    try {
      const conv = await onStartChat(userId)
      onSelectConversation(conv)
    } catch (e) {}
    finally { setStarting(null) }
  }

  return (
    <div className="flex flex-col h-full w-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3 shrink-0">
        <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          Contacts
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            className="pl-9 bg-background border-border text-xs text-foreground rounded-lg placeholder:text-muted-foreground h-9 focus-visible:ring-1 focus-visible:ring-emerald-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-grow">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Users className="h-8 w-8 opacity-40" />
            <span>No contacts found</span>
          </div>
        ) : (
          filtered.map((user) => (
            <div
              key={user.id}
              className="px-4 py-3 flex items-center gap-3 hover:bg-muted/50 border-b border-border/40 transition-colors"
            >
              <div className="relative shrink-0">
                <Avatar className="h-11 w-11 border border-border/80 shadow-sm ring-1 ring-border/20">
                  <AvatarImage
                    src={
                      user.avatar
                        ? getPocketBaseFileUrl(user, user.avatar)
                        : undefined
                    }
                    className="object-cover"
                  />
                  <AvatarFallback className="font-bold text-xs bg-emerald-500/10 text-emerald-500">
                    {(user.username || "U").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {user.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card shadow-sm" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{user.username}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleStartChat(user.id)}
                  disabled={starting === user.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-background border border-border hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/40 text-muted-foreground text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {starting === user.id ? "Opening..." : "Message"}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-1.5 rounded-lg border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                      title="User Options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 z-50">
                    <DropdownMenuItem
                      onClick={() => handleStartChat(user.id)}
                      className="cursor-pointer text-xs flex items-center gap-2"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Send Message</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => {
                        const blocked: string[] = JSON.parse(localStorage.getItem('blocked_users') || '[]');
                        const isBlocked = blocked.includes(user.id);
                        const next = isBlocked ? blocked.filter(id => id !== user.id) : [...blocked, user.id];
                        localStorage.setItem('blocked_users', JSON.stringify(next));
                        window.location.reload();
                      }}
                      className="cursor-pointer text-xs flex items-center gap-2 text-rose-500 hover:text-rose-400"
                    >
                      <ShieldOff className="w-3.5 h-3.5" />
                      <span>Toggle Block</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  )
}
