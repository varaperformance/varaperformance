import { useState, useRef, useCallback } from 'react';
import { hapticsMedium, hapticsLight } from '@/lib/haptics';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Check,
  CheckCheck,
  MoreVertical,
  Pencil,
  Reply,
  Smile,
  Trash2,
} from 'lucide-react';
import type { MessageResponse } from '@/features/messaging';

// Common emoji reactions
const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

interface MessageBubbleProps {
  message: MessageResponse;
  isOwn: boolean;
  onReply?: (message: MessageResponse) => void;
  onEdit?: (message: MessageResponse) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  currentUserId?: string;
  onGifLoad?: () => void;
}

export function MessageBubble({
  message,
  isOwn,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onRemoveReaction,
  currentUserId,
  onGifLoad,
}: MessageBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => {
      void hapticsMedium();
      setMobileMenuOpen(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Guard against undefined message
  if (!message) {
    return null;
  }

  // Group reactions by emoji (with defensive check)
  const reactions = message.reactions ?? [];
  const groupedReactions = reactions.reduce(
    (acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = [];
      }
      acc[r.emoji].push(r);
      return acc;
    },
    {} as Record<string, typeof reactions>,
  );

  return (
    <div
      className={cn(
        'group flex gap-2 px-4 py-1',
        isOwn ? 'flex-row-reverse' : 'flex-row',
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      {/* Avatar (only for others) */}
      {!isOwn && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage
            src={message.senderAvatarUrl}
            alt={message.senderDisplayName || 'User'}
          />
          <AvatarFallback className="text-xs">
            {getInitials(message.senderDisplayName)}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'flex flex-col gap-1',
          isOwn ? 'items-end' : 'items-start',
        )}
      >
        {/* Reply preview */}
        {message.replyTo && (
          <div
            className={cn(
              'text-xs text-muted-foreground border-l-2 pl-2 ml-1 max-w-48 truncate',
              isOwn ? 'border-primary/50' : 'border-muted-foreground/50',
            )}
          >
            <span className="font-medium">
              {message.replyTo.senderDisplayName}:
            </span>{' '}
            {message.replyTo.text}
          </div>
        )}

        {/* Message bubble */}
        <div className="flex items-end gap-1">
          {/* Action buttons (show on hover) */}
          <div
            className={cn(
              'flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity',
              isOwn ? 'order-first' : 'order-last',
            )}
          >
            {/* Emoji reaction button */}
            <DropdownMenu
              open={showEmojiPicker}
              onOpenChange={setShowEmojiPicker}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Smile className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={isOwn ? 'end' : 'start'}
                className="p-2"
              >
                <div className="flex gap-1">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        void hapticsLight();
                        onReact?.(message.id, emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-lg hover:scale-125 transition-transform p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Reply button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onReply?.(message)}
                >
                  <Reply className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reply</TooltipContent>
            </Tooltip>

            {/* More options (edit/delete for own messages) */}
            {isOwn && !message.isDeleted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit?.(message)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile long-press context menu */}
          <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <DropdownMenuTrigger className="hidden" />
            <DropdownMenuContent
              align={isOwn ? 'end' : 'start'}
              className="md:hidden"
            >
              <DropdownMenuItem onClick={() => onReply?.(message)}>
                <Reply className="h-4 w-4 mr-2" />
                Reply
              </DropdownMenuItem>
              {isOwn && !message.isDeleted && (
                <DropdownMenuItem onClick={() => onEdit?.(message)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {isOwn && !message.isDeleted && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setShowEmojiPicker(true)}>
                <Smile className="h-4 w-4 mr-2" />
                React
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Bubble content */}
          <div
            className={cn(
              'rounded-2xl px-3 py-2 max-w-md',
              isOwn
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted rounded-bl-md',
              message.isDeleted && 'italic opacity-60',
            )}
          >
            {/* GIF attachment */}
            {message.gif && (
              <div className="mb-2">
                <img
                  src={message.gif.url}
                  alt={message.gif.title || 'GIF'}
                  className="rounded-lg max-w-full h-auto"
                  style={{
                    maxHeight: '200px',
                    width: message.gif.width
                      ? Math.min(message.gif.width, 300)
                      : 'auto',
                  }}
                  loading="lazy"
                  decoding="async"
                  onLoad={onGifLoad}
                />
                {/* Giphy attribution */}
                <div className="flex items-center gap-1 mt-1 opacity-60">
                  <span className="text-[10px]">via GIPHY</span>
                </div>
              </div>
            )}
            <p className="text-sm whitespace-pre-wrap wrap-break-word">
              {message.text}
            </p>
          </div>
        </div>

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {Object.entries(groupedReactions).map(([emoji, reactions]) => {
              const hasOwnReaction = reactions.some(
                (r) => r.userId === currentUserId,
              );
              return (
                <button
                  key={emoji}
                  onClick={() => {
                    if (hasOwnReaction) {
                      onRemoveReaction?.(message.id, emoji);
                    } else {
                      onReact?.(message.id, emoji);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                    hasOwnReaction
                      ? 'bg-primary/20 border border-primary/30'
                      : 'bg-muted hover:bg-muted/80',
                  )}
                >
                  <span>{emoji}</span>
                  <span className="text-muted-foreground">
                    {reactions.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Message meta (time, status) */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground px-1">
          <span>{formatMessageTime(message.sentAt)}</span>
          {message.isEdited && <span>(edited)</span>}
          {isOwn && <MessageStatus status={message.status} />}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be permanently deleted for all participants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete?.(message.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MessageStatus({ status }: { status: string }) {
  switch (status) {
    case 'SENT':
      return <Check className="h-3 w-3" />;
    case 'DELIVERED':
      return <CheckCheck className="h-3 w-3" />;
    case 'READ':
      return <CheckCheck className="h-3 w-3 text-primary" />;
    default:
      return null;
  }
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

function formatMessageTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
