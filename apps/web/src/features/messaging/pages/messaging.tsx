import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isNativeApp } from '@/lib/capacitor';
import { showNativeActionSheet } from '@/lib/action-sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  MessageSquare,
  ArrowLeft,
  MoreVertical,
  Archive,
  Ban,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth';
import {
  useConversations,
  useMessages,
  useSearchMessages,
  useMessagingSocket,
  useSendMessage,
  useDeleteMessage,
  useEditMessage,
  useUpdateConversationStatus,
  type ConversationResponse,
} from '@/features/messaging';
import { useDebounce } from '@/hooks/use-debounce';
import { useIsMobile } from '@/hooks/use-is-mobile';
import type { GiphyGif } from '@/hooks/use-giphy';
import {
  ConversationList,
  MessageThread,
  NewConversationDialog,
} from '@/components/messaging';
import { TrustBadge } from '@/components/trust-badge';

export default function MessagingPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('conversation');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const debouncedMessageSearch = useDebounce(messageSearch, 300);

  // Fetch conversations
  const { data: conversationsData, isLoading: conversationsLoading } =
    useConversations();
  const conversations = conversationsData?.data?.items ?? [];

  // Find selected conversation
  const selectedConversation = conversations.find((c) => c.id === selectedId);

  // Fetch messages for selected conversation
  const { data: messagesData, isLoading: messagesLoading } = useMessages(
    selectedId ?? undefined,
  );
  const messages = messagesData?.data?.items ?? [];

  const { data: searchData, isLoading: searchLoading } = useSearchMessages(
    selectedId ?? undefined,
    debouncedMessageSearch,
  );
  const searchMessages = searchData?.data?.items ?? [];
  const isSearching = debouncedMessageSearch.trim().length > 0;
  const displayedMessages = isSearching ? searchMessages : messages;

  // Real-time socket connection
  const {
    isConnected,
    typingUsers,
    onlineUsers,
    sendMessage,
    markRead,
    startTyping,
    addReaction,
    removeReaction,
  } = useMessagingSocket(selectedId ?? undefined);

  // Mutations for REST fallback
  const sendMessageMutation = useSendMessage();
  const deleteMessageMutation = useDeleteMessage(selectedId ?? '');
  const editMessageMutation = useEditMessage();
  const updateStatusMutation = useUpdateConversationStatus();

  // Select a conversation
  const handleSelectConversation = (conversation: ConversationResponse) => {
    setSearchParams({ conversation: conversation.id });
    setMobileMenuOpen(false);
  };

  // Handle send message
  const handleSendMessage = (text: string, replyToId?: string) => {
    if (!selectedId) return;
    if (isConnected) {
      sendMessage(text, replyToId);
    } else {
      sendMessageMutation.mutate({
        conversationId: selectedId,
        text,
        replyToId,
      });
    }
  };

  // Handle send GIF message
  const handleSendGif = (gif: GiphyGif, replyToId?: string) => {
    if (!selectedId) return;
    const gifPayload = {
      url: gif.url,
      previewUrl: gif.previewUrl,
      width: gif.width,
      height: gif.height,
      title: gif.title,
      giphyId: gif.id,
    };
    if (isConnected) {
      sendMessage('', replyToId, gifPayload);
    } else {
      sendMessageMutation.mutate({
        conversationId: selectedId,
        text: '',
        gif: gifPayload,
        replyToId,
      });
    }
  };

  // Handle edit message
  const handleEditMessage = (messageId: string, text: string) => {
    if (selectedId) {
      editMessageMutation.mutate({
        conversationId: selectedId,
        messageId,
        text,
      });
    }
  };

  // Handle archive/block
  const handleArchive = () => {
    if (selectedId) {
      updateStatusMutation.mutate(
        { conversationId: selectedId, status: 'ARCHIVED' },
        { onSuccess: () => setSearchParams({}) },
      );
    }
    setArchiveConfirmOpen(false);
  };

  const handleBlock = () => {
    if (selectedId) {
      updateStatusMutation.mutate(
        { conversationId: selectedId, status: 'BLOCKED' },
        { onSuccess: () => setSearchParams({}) },
      );
    }
    setBlockConfirmOpen(false);
  };

  const handleArchiveConversation = (conversationId: string) => {
    updateStatusMutation.mutate(
      { conversationId, status: 'ARCHIVED' },
      {
        onSuccess: () => {
          if (selectedId === conversationId) setSearchParams({});
        },
      },
    );
  };

  return (
    <div className="h-[calc(100vh-4rem)] py-4 px-4 sm:px-6 lg:px-8 xl:px-10">
      <div className="h-full flex overflow-hidden rounded-2xl border bg-card shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
        {/* Mobile: full-screen conversation list when nothing selected */}
        {isMobile && !selectedConversation && (
          <div className="flex w-full flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Messages
                </h1>
                <NewConversationDialog
                  onConversationCreated={(id) =>
                    setSearchParams({ conversation: id })
                  }
                />
              </div>
              <TrustBadge
                label="Private by default. Stored securely."
                tooltip="Messages are private to conversation participants and stored securely."
                className="mt-2"
              />
            </div>
            <ConversationList
              conversations={conversations}
              selectedId={selectedId ?? undefined}
              onSelect={handleSelectConversation}
              isLoading={conversationsLoading}
              onlineUsers={onlineUsers}
              onArchive={handleArchiveConversation}
              isMobile={isMobile}
            />
          </div>
        )}

        {/* Desktop: Sidebar - Conversation List */}
        {!isMobile && (
          <aside className="hidden md:flex md:w-80 lg:w-96 flex-col border-r bg-background/60">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Messages
                </h1>
                <NewConversationDialog
                  onConversationCreated={(id) =>
                    setSearchParams({ conversation: id })
                  }
                />
              </div>
              <TrustBadge
                label="Private by default. Stored securely."
                tooltip="Messages are private to conversation participants and stored securely."
                className="mt-2"
              />
            </div>
            <ConversationList
              conversations={conversations}
              selectedId={selectedId ?? undefined}
              onSelect={handleSelectConversation}
              isLoading={conversationsLoading}
              onlineUsers={onlineUsers}
              onArchive={handleArchiveConversation}
              isMobile={isMobile}
            />
          </aside>
        )}

        {/* Mobile Sheet for conversation list (legacy fallback — kept for deep link) */}
        {!isMobile && (
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <SheetTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Messages
                  </SheetTitle>
                  <NewConversationDialog
                    onConversationCreated={(id) => {
                      setSearchParams({ conversation: id });
                      setMobileMenuOpen(false);
                    }}
                  />
                </div>
                <TrustBadge
                  label="Private by default. Stored securely."
                  tooltip="Messages are private to conversation participants and stored securely."
                  className="mt-2"
                />
              </SheetHeader>
              <ConversationList
                conversations={conversations}
                selectedId={selectedId ?? undefined}
                onSelect={handleSelectConversation}
                isLoading={conversationsLoading}
                onlineUsers={onlineUsers}
                onArchive={handleArchiveConversation}
                isMobile={isMobile}
              />
            </SheetContent>
          </Sheet>
        )}

        {/* Main content area */}
        {(!isMobile || selectedConversation) && (
          <main className="flex-1 flex flex-col min-w-0 bg-background/40">
            {selectedConversation ? (
              <>
                {/* Conversation header */}
                <header className="flex items-center gap-3 p-4 border-b">
                  {/* Back button (mobile — returns to full-screen list) */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSearchParams({})}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>

                  {/* Participant info */}
                  <div className="relative">
                    <Avatar>
                      <AvatarImage
                        src={selectedConversation.participant?.avatarUrl}
                        alt={
                          selectedConversation.participant?.displayName ||
                          'User'
                        }
                      />
                      <AvatarFallback>
                        {getInitials(
                          selectedConversation.participant?.displayName,
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {isConnected &&
                      onlineUsers.has(
                        selectedConversation.participant?.userId,
                      ) && (
                        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-card" />
                      )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-medium truncate">
                      {selectedConversation.participant?.displayName ||
                        'Unknown User'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {!isConnected
                        ? 'Reconnecting...'
                        : onlineUsers.has(
                              selectedConversation.participant?.userId,
                            )
                          ? 'Online'
                          : 'Offline'}
                    </p>
                  </div>

                  {/* Conversation actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onPointerDown={(e) => {
                          if (!isNativeApp()) return;
                          e.preventDefault();
                          showNativeActionSheet('Conversation', [
                            {
                              title: 'Archive conversation',
                              handler: () => setArchiveConfirmOpen(true),
                            },
                            {
                              title: 'Block user',
                              destructive: true,
                              handler: () => setBlockConfirmOpen(true),
                            },
                          ]);
                        }}
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setArchiveConfirmOpen(true)}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive conversation
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setBlockConfirmOpen(true)}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Block user
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </header>

                <div className="border-b px-4 py-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={messageSearch}
                      onChange={(event) => setMessageSearch(event.target.value)}
                      placeholder="Search messages in this conversation"
                      className="h-9 pl-8"
                    />
                  </div>
                </div>

                {/* Message thread */}
                <TooltipProvider>
                  <MessageThread
                    conversationId={selectedId ?? undefined}
                    messages={displayedMessages}
                    currentUserId={user?.sub ?? ''}
                    typingUsers={typingUsers}
                    isLoading={isSearching ? searchLoading : messagesLoading}
                    hasMore={isSearching ? false : messagesData?.data?.hasMore}
                    onSend={handleSendMessage}
                    onSendGif={handleSendGif}
                    onTyping={startTyping}
                    onEditMessage={handleEditMessage}
                    onDelete={(messageId) =>
                      deleteMessageMutation.mutate({
                        conversationId: selectedId!,
                        messageId,
                      })
                    }
                    onReact={addReaction}
                    onRemoveReaction={removeReaction}
                    onMarkRead={markRead}
                  />
                </TooltipProvider>
              </>
            ) : (
              /* No conversation selected — desktop only (mobile shows full-screen list instead) */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-medium mb-2">Your Messages</h2>
                <p className="text-muted-foreground max-w-sm">
                  Select a conversation to start messaging or start a new
                  conversation with a coach, client, or gym partner.
                </p>
              </div>
            )}
          </main>
        )}
      </div>

      {/* Archive confirmation */}
      <AlertDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This conversation will be moved to your archive. You can restore
              it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block confirmation */}
      <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block this user?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer receive messages from this user. This action
              can be reversed from settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBlock}
            >
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
