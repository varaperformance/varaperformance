import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SwipeToDelete } from '@/components/ui/swipe-to-delete';
import type { ConversationResponse } from '@/features/messaging';

const PINNED_CONVERSATIONS_STORAGE_KEY = 'vara.messaging.pinned-conversations';

const loadPinnedConversations = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(PINNED_CONVERSATIONS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
};

interface ConversationListProps {
  conversations: ConversationResponse[];
  selectedId?: string;
  onSelect: (conversation: ConversationResponse) => void;
  isLoading?: boolean;
  onlineUsers?: Set<string>;
  onArchive?: (conversationId: string) => void;
  isMobile?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  onlineUsers,
  onArchive,
  isMobile = false,
}: ConversationListProps) {
  const [query, setQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>(loadPinnedConversations);

  const togglePinned = (conversationId: string) => {
    setPinnedIds((currentPinnedIds) => {
      const nextPinnedIds = currentPinnedIds.includes(conversationId)
        ? currentPinnedIds.filter((id) => id !== conversationId)
        : [conversationId, ...currentPinnedIds];

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          PINNED_CONVERSATIONS_STORAGE_KEY,
          JSON.stringify(nextPinnedIds),
        );
      }

      return nextPinnedIds;
    });
  };

  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const filtered = conversations.filter((conversation) => {
      if (showUnreadOnly && conversation.unreadCount <= 0) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const displayName =
        conversation.participant.displayName?.toLowerCase() ?? '';
      const preview = conversation.lastMessageText?.toLowerCase() ?? '';
      return displayName.includes(normalized) || preview.includes(normalized);
    });

    return [...filtered].sort((left, right) => {
      const leftPinned = pinnedIds.includes(left.id);
      const rightPinned = pinnedIds.includes(right.id);

      if (leftPinned === rightPinned) {
        return 0;
      }

      return leftPinned ? -1 : 1;
    });
  }, [conversations, query, showUnreadOnly, pinnedIds]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <p>No conversations yet</p>
        <p className="text-sm">
          Start a conversation with a coach to get started
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations..."
            className="h-9 pl-8"
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filteredConversations.length} conversation
            {filteredConversations.length === 1 ? '' : 's'}
          </p>
          <Button
            type="button"
            variant={showUnreadOnly ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setShowUnreadOnly((prev) => !prev)}
          >
            <Filter className="h-3.5 w-3.5" />
            Unread
          </Button>
        </div>
      </div>

      {filteredConversations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-muted-foreground">
          <p className="text-sm font-medium">No matching conversations</p>
          <p className="mt-1 text-xs">Try a different name or keyword.</p>
        </div>
      ) : (
        <ScrollArea className="h-full">
          <div className="flex flex-col">
            {filteredConversations.map((conversation) => (
              <SwipeToDelete
                key={conversation.id}
                onDelete={() => onArchive?.(conversation.id)}
                disabled={!isMobile || !onArchive}
              >
                <button
                  onClick={() => onSelect(conversation)}
                  className={cn(
                    'group/conv flex w-full items-center gap-3 border-l-2 border-transparent p-4 text-left transition-colors hover:bg-muted/50',
                    selectedId === conversation.id &&
                      'border-l-primary bg-primary/10 hover:bg-primary/10',
                  )}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarImage
                        src={conversation.participant.avatarUrl}
                        alt={conversation.participant.displayName || 'User'}
                      />
                      <AvatarFallback>
                        {getInitials(conversation.participant.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    {onlineUsers?.has(conversation.participant.userId) && (
                      <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-card" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {conversation.participant.displayName || 'Unknown User'}
                      </span>
                      {conversation.lastMessageAt && (
                        <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                          {formatTimeAgo(conversation.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="truncate text-sm text-muted-foreground">
                        {conversation.lastMessageText || 'No messages yet'}
                      </p>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant={
                            pinnedIds.includes(conversation.id)
                              ? 'secondary'
                              : 'ghost'
                          }
                          size="icon"
                          className={cn(
                            'h-6 w-6',
                            !pinnedIds.includes(conversation.id) &&
                              'opacity-0 group-hover/conv:opacity-100 transition-opacity',
                          )}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            togglePinned(conversation.id);
                          }}
                          aria-label={
                            pinnedIds.includes(conversation.id)
                              ? 'Unpin conversation'
                              : 'Pin conversation'
                          }
                        >
                          <Pin
                            className={cn(
                              'h-3.5 w-3.5',
                              pinnedIds.includes(conversation.id) &&
                                'fill-current',
                            )}
                          />
                        </Button>
                        {conversation.unreadCount > 0 && (
                          <Badge
                            variant="default"
                            className="h-5 min-w-5 px-1.5 text-[11px]"
                          >
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </SwipeToDelete>
            ))}
          </div>
        </ScrollArea>
      )}
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

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}
