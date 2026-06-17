import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Send, X, Smile, Pencil, ImagePlay } from 'lucide-react';
import type { MessageResponse } from '@/features/messaging';
import type { GiphyGif } from '@/hooks/use-giphy';
import { GifPicker } from './gif-picker';

// Common emoji categories
const EMOJI_CATEGORIES = {
  Smileys: [
    '😀',
    '😃',
    '😄',
    '😁',
    '😅',
    '😂',
    '🤣',
    '😊',
    '😇',
    '🙂',
    '😉',
    '😍',
    '🥰',
    '😘',
    '😋',
    '😜',
    '🤪',
    '😎',
    '🤩',
    '🥳',
  ],
  Gestures: [
    '👍',
    '👎',
    '👌',
    '✌️',
    '🤞',
    '🤟',
    '🤘',
    '🤙',
    '👋',
    '🙌',
    '👏',
    '🤝',
    '🙏',
    '💪',
    '🦵',
    '🦶',
    '👂',
    '👀',
    '🫶',
    '❤️',
  ],
  Activities: [
    '⚽',
    '🏀',
    '🏈',
    '⚾',
    '🎾',
    '🏐',
    '🏉',
    '🎱',
    '🏓',
    '🏸',
    '🥊',
    '🥋',
    '🏋️',
    '🚴',
    '🏃',
    '🧘',
    '🏊',
    '🎯',
    '🏆',
    '🥇',
  ],
  Objects: [
    '💡',
    '📱',
    '💻',
    '⌨️',
    '🖥️',
    '📷',
    '🎥',
    '📺',
    '🔔',
    '⏰',
    '📅',
    '📝',
    '✏️',
    '📎',
    '📌',
    '🔑',
    '🔒',
    '💰',
    '💎',
    '🎁',
  ],
};

interface MessageInputProps {
  onSend: (text: string, replyToId?: string) => void;
  onSendGif?: (gif: GiphyGif, replyToId?: string) => void;
  onEdit?: (messageId: string, text: string) => void;
  onTyping?: () => void;
  replyTo?: MessageResponse | null;
  editingMessage?: MessageResponse | null;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  onSendGif,
  onEdit,
  onTyping,
  replyTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
  disabled,
  placeholder = 'Type a message...',
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevEditingIdRef = useRef<string | null>(null);

  // Auto-focus when replying
  useEffect(() => {
    if (replyTo) {
      textareaRef.current?.focus();
    }
  }, [replyTo]);

  // Populate text when starting to edit a NEW message
  useEffect(() => {
    const currentEditingId = editingMessage?.id ?? null;
    if (currentEditingId && currentEditingId !== prevEditingIdRef.current) {
      // Schedule state update for next frame to avoid cascading render warning
      requestAnimationFrame(() => {
        setText(editingMessage?.text ?? '');
        textareaRef.current?.focus();
      });
    }
    prevEditingIdRef.current = currentEditingId;
  }, [editingMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (editingMessage) {
      // Edit existing message
      onEdit?.(editingMessage.id, trimmed);
      onCancelEdit?.();
    } else {
      // Send new message
      onSend(trimmed, replyTo?.id);
      onCancelReply?.();
    }

    setText('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (value: string) => {
    setText(value);

    // Debounced typing indicator
    if (onTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping();
      typingTimeoutRef.current = setTimeout(() => {
        // Typing stopped
      }, 1000);
    }
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      // Set cursor position after emoji
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setText(text + emoji);
    }
    setEmojiPickerOpen(false);
  };

  return (
    <div className="border-t bg-background p-4">
      {/* Reply preview */}
      {replyTo && !editingMessage && (
        <div className="flex items-center justify-between mb-2 px-3 py-2 bg-muted rounded-md">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              Replying to {replyTo.senderDisplayName}
            </p>
            <p className="text-sm truncate">{replyTo.text}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onCancelReply}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit preview */}
      {editingMessage && (
        <div className="flex items-center justify-between mb-2 px-3 py-2 bg-primary/10 rounded-md border border-primary/20">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Pencil className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-primary font-medium">
                Editing message
              </p>
              <p className="text-sm truncate text-muted-foreground">
                {editingMessage.text}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onCancelEdit}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 rounded-xl border bg-card/60 p-2">
        {/* Emoji picker */}
        <DropdownMenu open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={disabled}
            >
              <Smile className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 p-2" side="top" align="start">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                <div key={category}>
                  <p className="text-xs text-muted-foreground mb-1 font-medium">
                    {category}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="text-xl hover:bg-muted p-1 rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* GIF picker button */}
        {onSendGif && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={disabled || !!editingMessage}
            onClick={() => setGifPickerOpen(true)}
            title="Send a GIF"
          >
            <ImagePlay className="h-5 w-5" />
          </Button>
        )}

        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[40px] max-h-[150px] resize-none border-0 bg-transparent focus-visible:ring-0"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <p className="mt-2 px-1 text-[11px] text-muted-foreground">
        Enter to send, Shift+Enter for a new line.
      </p>

      {/* GIF Picker Dialog */}
      {onSendGif && (
        <GifPicker
          open={gifPickerOpen}
          onOpenChange={setGifPickerOpen}
          onSelect={(gif) => {
            onSendGif(gif, replyTo?.id);
            onCancelReply?.();
          }}
        />
      )}
    </div>
  );
}
