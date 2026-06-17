import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown } from 'lucide-react';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';
import {
  onKeyboardShow,
  onKeyboardHide,
  setAccessoryBarVisible,
} from '@/lib/keyboard';
import type { MessageResponse, TypingState } from '@/features/messaging';
import type { GiphyGif } from '@/hooks/use-giphy';

interface MessageThreadProps {
  conversationId?: string;
  messages: MessageResponse[];
  currentUserId: string;
  typingUsers?: TypingState[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSend: (text: string, replyToId?: string) => void;
  onSendGif?: (gif: GiphyGif, replyToId?: string) => void;
  onTyping?: () => void;
  onEditMessage?: (messageId: string, text: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  onMarkRead?: (messageId: string) => void;
}

export function MessageThread({
  conversationId,
  messages,
  currentUserId,
  typingUsers = [],
  isLoading,
  hasMore,
  onLoadMore,
  onSend,
  onSendGif,
  onTyping,
  onEditMessage,
  onDelete,
  onReact,
  onRemoveReaction,
  onMarkRead,
}: MessageThreadProps) {
  const [replyTo, setReplyTo] = useState<MessageResponse | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageResponse | null>(
    null,
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const prevMessagesLengthRef = useRef(messages.length);
  const lastConversationIdRef = useRef<string | undefined>(conversationId);
  const shouldSnapToBottomOnLoadRef = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const handleGifLoad = useCallback(() => {
    if (isAtBottom) {
      scrollToBottom('smooth');
    }
  }, [isAtBottom, scrollToBottom]);

  // Handle edit button click on a message
  const handleEditClick = (message: MessageResponse) => {
    setEditingMessage(message);
    setReplyTo(null); // Can't reply while editing
  };

  // Handle edit submit
  const handleEditSubmit = (messageId: string, text: string) => {
    onEditMessage?.(messageId, text);
    setEditingMessage(null);
  };

  // Track scroll position
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      50;
    setIsAtBottom(atBottom);

    // Load more when scrolling to top
    if (container.scrollTop < 100 && hasMore && !isLoading) {
      onLoadMore?.();
    }
  }, [hasMore, isLoading, onLoadMore]);

  // Scroll to bottom on new messages (only if already at bottom)
  useEffect(() => {
    // Only auto-scroll if new messages arrived and user was at bottom
    if (messages.length > prevMessagesLengthRef.current && isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, isAtBottom]);

  // Always jump to latest message when opening a different conversation.
  useEffect(() => {
    if (conversationId === lastConversationIdRef.current) {
      return;
    }

    lastConversationIdRef.current = conversationId;
    shouldSnapToBottomOnLoadRef.current = true;
    prevMessagesLengthRef.current = 0;

    // Wait for message rows to render before jumping.
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    });
  }, [conversationId]);

  // If messages load after selecting a conversation, snap once to the newest.
  useEffect(() => {
    if (!conversationId || messages.length === 0) {
      return;
    }

    if (!shouldSnapToBottomOnLoadRef.current && !isAtBottom) {
      return;
    }

    shouldSnapToBottomOnLoadRef.current = false;
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [conversationId, messages.length, isAtBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (messages.length > 0 && prevMessagesLengthRef.current === 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
      prevMessagesLengthRef.current = messages.length;
    }
  }, [messages.length]);

  // Mark last message as read when viewing
  useEffect(() => {
    if (messages.length > 0 && isAtBottom) {
      const lastMessage = messages[messages.length - 1];
      if (
        lastMessage.senderId !== currentUserId &&
        lastMessage.status !== 'READ'
      ) {
        onMarkRead?.(lastMessage.id);
      }
    }
  }, [messages, isAtBottom, currentUserId, onMarkRead]);

  // Scroll to bottom when native keyboard appears so latest messages stay visible
  useEffect(() => {
    let cleanupShow: (() => void) | undefined;
    let cleanupHide: (() => void) | undefined;

    void onKeyboardShow(() => {
      if (isAtBottom) {
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
      }
    }).then((fn) => {
      cleanupShow = fn;
    });

    void onKeyboardHide(() => {
      if (isAtBottom) {
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
      }
    }).then((fn) => {
      cleanupHide = fn;
    });

    return () => {
      cleanupShow?.();
      cleanupHide?.();
    };
  }, [isAtBottom]);

  // Show keyboard accessory bar in chat so users can access the toolbar
  useEffect(() => {
    void setAccessoryBarVisible(true);
    return () => {
      void setAccessoryBarVisible(false);
    };
  }, []);

  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`flex gap-2 ${i % 2 === 0 ? '' : 'justify-end'}`}
            >
              {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
              <Skeleton className="h-16 w-48 rounded-2xl" />
            </div>
          ))}
        </div>
        <div className="shrink-0 border-t bg-background p-4">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full min-h-0">
      {/* Messages area - scrollable */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 bg-background/20"
      >
        <div className="py-4 pb-3">
          {/* Load more indicator */}
          {hasMore && (
            <div className="text-center py-2">
              {isLoading ? (
                <span className="text-sm text-muted-foreground">
                  Loading...
                </span>
              ) : (
                <button
                  onClick={onLoadMore}
                  className="text-sm text-primary hover:underline"
                >
                  Load older messages
                </button>
              )}
            </div>
          )}

          {/* Messages grouped by date */}
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-4 py-4 px-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{date}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Messages for this date */}
              {msgs.map((message) => {
                if (!message?.id) return null;
                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.senderId === currentUserId}
                    currentUserId={currentUserId}
                    onReply={setReplyTo}
                    onEdit={handleEditClick}
                    onDelete={onDelete}
                    onReact={onReact}
                    onRemoveReaction={onRemoveReaction}
                    onGifLoad={handleGifLoad}
                  />
                );
              })}
            </div>
          ))}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                />
                <span
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {typingUsers.map((u) => u.displayName || 'Someone').join(', ')}{' '}
                {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Scroll to bottom FAB */}
      {!isAtBottom && (
        <div className="absolute bottom-28 right-6">
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 rounded-full shadow-lg"
            onClick={() => scrollToBottom('smooth')}
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Message input - fixed at bottom */}
      <div className="shrink-0 border-t bg-background/95 backdrop-blur">
        <MessageInput
          onSend={onSend}
          onSendGif={onSendGif}
          onEdit={handleEditSubmit}
          onTyping={onTyping}
          replyTo={replyTo}
          editingMessage={editingMessage}
          onCancelReply={() => setReplyTo(null)}
          onCancelEdit={() => setEditingMessage(null)}
        />
      </div>
    </div>
  );
}

function groupMessagesByDate(
  messages: MessageResponse[],
): Record<string, MessageResponse[]> {
  const groups: Record<string, MessageResponse[]> = {};

  if (!messages || !Array.isArray(messages)) {
    return groups;
  }

  for (const message of messages) {
    if (!message?.sentAt) continue;

    const date = new Date(message.sentAt);
    const dateKey = formatDateKey(date);

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
  }

  return groups;
}

function formatDateKey(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) {
    return 'Today';
  }
  if (isSameDay(date, yesterday)) {
    return 'Yesterday';
  }
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
