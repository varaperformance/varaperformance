import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  getMessagingSocket,
  connectMessagingSocket,
} from '@/lib/messaging-socket';
import type {
  SuccessResponse,
  ConversationResponse,
  ConversationsListData,
  MessageResponse,
  MessagesListData,
  MessageSearchData,
  MessageReactionResponse,
  TypingState,
  ConversationStatus,
} from '@varaperformance/core';

// Re-export types for convenience
export type {
  ConversationResponse,
  ConversationsListData,
  MessageResponse,
  MessagesListData,
  MessageReactionResponse,
  TypingState,
};

export const messagingKeys = {
  conversations: ['conversations'] as const,
  conversationsList: (params?: {
    status?: ConversationStatus;
    page?: number;
    limit?: number;
  }) => [...messagingKeys.conversations, params] as const,
  conversation: (id: string | undefined) => ['conversation', id] as const,
  messages: (
    conversationId: string | undefined,
    params?: { before?: string; limit?: number },
  ) => ['messages', conversationId, params] as const,
  messageSearch: (
    conversationId: string | undefined,
    query: string,
    limit: number,
  ) => ['message-search', conversationId, query, limit] as const,
};

// ============================================
// API Functions
// ============================================

const getConversations = async (params?: {
  status?: ConversationStatus;
  page?: number;
  limit?: number;
}) => {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const response = await api.get<SuccessResponse<ConversationsListData>>(
    `messaging/conversations${query ? `?${query}` : ''}`,
  );
  return response.data;
};

const getConversation = async (conversationId: string) => {
  const response = await api.get<SuccessResponse<ConversationResponse>>(
    `messaging/conversations/${conversationId}`,
  );
  return response.data;
};

const startConversation = async (params: {
  coachId?: string;
  clientId?: string;
  recipientUserId?: string;
  bookingId?: string;
  initialMessage?: string;
}) => {
  const response = await api.post<SuccessResponse<ConversationResponse>>(
    'messaging/conversations',
    params,
  );
  return response.data;
};

const getMessages = async (
  conversationId: string,
  params?: { before?: string; limit?: number },
) => {
  const searchParams = new URLSearchParams();
  if (params?.before) searchParams.set('before', params.before);
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const response = await api.get<SuccessResponse<MessagesListData>>(
    `messaging/conversations/${conversationId}/messages${query ? `?${query}` : ''}`,
  );
  return response.data;
};

const searchMessages = async (
  conversationId: string,
  params: { q: string; limit?: number },
) => {
  const searchParams = new URLSearchParams();
  searchParams.set('q', params.q);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const response = await api.get<SuccessResponse<MessageSearchData>>(
    `messaging/conversations/${conversationId}/search?${searchParams.toString()}`,
  );
  return response.data;
};

const sendMessageApi = async (params: {
  conversationId: string;
  text: string;
  gif?: {
    url: string;
    previewUrl?: string;
    width?: number;
    height?: number;
    title?: string;
    giphyId?: string;
  };
  replyToId?: string;
}) => {
  const response = await api.post<SuccessResponse<MessageResponse>>(
    'messaging/messages',
    params,
  );
  return response.data;
};

const editMessage = async (params: {
  conversationId: string;
  messageId: string;
  text: string;
}) => {
  const response = await api.patch<SuccessResponse<MessageResponse>>(
    `messaging/conversations/${params.conversationId}/messages/${params.messageId}`,
    { text: params.text },
  );
  return response.data;
};

const deleteMessage = async (params: {
  conversationId: string;
  messageId: string;
}) => {
  const response = await api.delete<SuccessResponse<{ messageId: string }>>(
    `messaging/conversations/${params.conversationId}/messages/${params.messageId}`,
  );
  return response.data;
};

const markAsRead = async (params: {
  conversationId: string;
  messageId: string;
}) => {
  const response = await api.post<SuccessResponse<{ messageId: string }>>(
    `messaging/conversations/${params.conversationId}/messages/${params.messageId}/read`,
  );
  return response.data;
};

const addReaction = async (params: { messageId: string; emoji: string }) => {
  const response = await api.post<SuccessResponse<MessageReactionResponse>>(
    `messaging/messages/${params.messageId}/reactions`,
    { emoji: params.emoji },
  );
  return response.data;
};

const removeReaction = async (params: { messageId: string; emoji: string }) => {
  const response = await api.delete<SuccessResponse<{ reactionId: string }>>(
    `messaging/messages/${params.messageId}/reactions/${encodeURIComponent(params.emoji)}`,
  );
  return response.data;
};

const updateConversationStatus = async (params: {
  conversationId: string;
  status: ConversationStatus;
}) => {
  const response = await api.patch<
    SuccessResponse<{ conversationId: string; status: ConversationStatus }>
  >(`messaging/conversations/${params.conversationId}/status`, {
    status: params.status,
  });
  return response.data;
};

// ============================================
// Hooks
// ============================================

/**
 * Fetch paginated conversations
 */
export function useConversations(params?: {
  status?: ConversationStatus;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: messagingKeys.conversationsList(params),
    queryFn: () => getConversations(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch a single conversation
 */
export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: messagingKeys.conversation(conversationId),
    queryFn: () => getConversation(conversationId!),
    enabled: !!conversationId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch messages for a conversation
 */
export function useMessages(
  conversationId: string | undefined,
  params?: { before?: string; limit?: number },
) {
  return useQuery({
    queryKey: messagingKeys.messages(conversationId, params),
    queryFn: () => getMessages(conversationId!, params),
    enabled: !!conversationId,
    staleTime: 10 * 1000,
  });
}

/**
 * Search messages within a conversation
 */
export function useSearchMessages(
  conversationId: string | undefined,
  query: string,
  limit = 20,
) {
  return useQuery({
    queryKey: messagingKeys.messageSearch(conversationId, query, limit),
    queryFn: () =>
      searchMessages(conversationId!, {
        q: query,
        limit,
      }),
    enabled: !!conversationId && query.trim().length > 0,
    staleTime: 10 * 1000,
  });
}

/**
 * Start a conversation with a coach
 */
export function useStartConversation(options?: {
  onSuccess?: (data: SuccessResponse<ConversationResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startConversation,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Send a message (REST API fallback)
 */
export function useSendMessage(options?: {
  onSuccess?: (data: SuccessResponse<MessageResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessageApi,
    onSuccess: (data) => {
      if (data.success) {
        const message = {
          ...data.data,
          reactions: data.data.reactions ?? [],
        };

        queryClient.setQueryData<SuccessResponse<MessagesListData>>(
          messagingKeys.messages(message.conversationId, undefined),
          (old) => {
            if (!old?.data?.items) {
              return {
                success: true,
                data: {
                  items: [message],
                  hasMore: false,
                },
              };
            }

            return {
              ...old,
              data: {
                ...old.data,
                items: [...old.data.items, message],
              },
            };
          },
        );

        queryClient.setQueriesData<SuccessResponse<ConversationsListData>>(
          { queryKey: messagingKeys.conversations },
          (old) => {
            if (!old?.data?.items) return old;

            const nextItems = old.data.items
              .map((conversation) =>
                conversation.id === message.conversationId
                  ? {
                      ...conversation,
                      lastMessageAt: message.createdAt,
                      lastMessageText:
                        message.text || (message.gif ? 'Sent a GIF' : ''),
                    }
                  : conversation,
              )
              .sort((a, b) => {
                const aTime = a.lastMessageAt
                  ? new Date(a.lastMessageAt).getTime()
                  : 0;
                const bTime = b.lastMessageAt
                  ? new Date(b.lastMessageAt).getTime()
                  : 0;
                return bTime - aTime;
              });

            return {
              ...old,
              data: {
                ...old.data,
                items: nextItems,
              },
            };
          },
        );
      }
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Edit a message
 */
export function useEditMessage(options?: {
  onSuccess?: (data: SuccessResponse<MessageResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: editMessage,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({
          queryKey: ['messages', data.data.conversationId] as const,
        });
      }
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Delete a message
 */
export function useDeleteMessage(
  conversationId: string,
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMessage,
    onSuccess: (data) => {
      queryClient.setQueryData<SuccessResponse<MessagesListData>>(
        messagingKeys.messages(conversationId, undefined),
        (old) => {
          if (!old?.data?.items) return old;
          return {
            ...old,
            data: {
              ...old.data,
              items: old.data.items.map((m) =>
                m.id === data.data.messageId
                  ? { ...m, isDeleted: true, text: '[Message deleted]' }
                  : m,
              ),
            },
          };
        },
      );
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * Mark message as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations });
    },
  });
}

/**
 * Add reaction to a message
 */
export function useAddReaction(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addReaction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['messages', conversationId] as const,
      });
    },
  });
}

/**
 * Remove reaction from a message
 */
export function useRemoveReaction(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeReaction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['messages', conversationId] as const,
      });
    },
  });
}

/**
 * Archive or block a conversation
 */
export function useUpdateConversationStatus(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateConversationStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

// ============================================
// Real-time Socket Hook
// ============================================

/**
 * Hook for real-time messaging with Socket.IO
 */
export function useMessagingSocket(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingState>>(
    new Map(),
  );
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connect and setup listeners
  useEffect(() => {
    if (!conversationId) return;

    const socket = connectMessagingSocket();

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('conversation:join', { conversationId });

      // Subscribe to presence for all conversation participants
      const convData = queryClient.getQueryData<
        SuccessResponse<ConversationsListData>
      >(messagingKeys.conversations);
      const participantIds =
        convData?.data?.items
          ?.map((c) => c.participant?.userId)
          .filter(Boolean) ?? [];
      if (participantIds.length > 0) {
        socket.emit('presence:subscribe', { userIds: participantIds });
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const updateConversationPreview = (message: MessageResponse) => {
      queryClient.setQueriesData<SuccessResponse<ConversationsListData>>(
        { queryKey: messagingKeys.conversations },
        (old) => {
          if (!old?.data?.items) return old;

          const previewText = message.isDeleted
            ? '[Message deleted]'
            : message.text || (message.gif ? 'Sent a GIF' : '');

          const nextItems = old.data.items.map((conversation) =>
            conversation.id === message.conversationId
              ? {
                  ...conversation,
                  lastMessageAt: message.createdAt,
                  lastMessageText: previewText,
                }
              : conversation,
          );

          // Keep conversation ordering aligned with latest activity.
          nextItems.sort((a, b) => {
            const aTime = a.lastMessageAt
              ? new Date(a.lastMessageAt).getTime()
              : 0;
            const bTime = b.lastMessageAt
              ? new Date(b.lastMessageAt).getTime()
              : 0;
            return bTime - aTime;
          });

          return {
            ...old,
            data: {
              ...old.data,
              items: nextItems,
            },
          };
        },
      );
    };

    const handleNewMessage = (message: MessageResponse) => {
      // Validate the message has required fields
      if (!message || !message.id) {
        console.error('Invalid message received:', message);
        return;
      }

      // Ensure reactions array exists
      const normalizedMessage = {
        ...message,
        reactions: message.reactions ?? [],
      };

      // Add message to cache
      queryClient.setQueryData<SuccessResponse<MessagesListData>>(
        messagingKeys.messages(conversationId, undefined),
        (old) => {
          if (!old?.data?.items) {
            // No existing cache, create new structure
            return {
              success: true,
              data: {
                items: [normalizedMessage],
                hasMore: false,
              },
            };
          }
          return {
            ...old,
            data: {
              ...old.data,
              items: [...old.data.items, normalizedMessage],
            },
          };
        },
      );
      updateConversationPreview(normalizedMessage);
    };

    const handleMessageUpdated = (message: MessageResponse) => {
      if (!message || !message.id) return;

      const normalizedMessage = {
        ...message,
        reactions: message.reactions ?? [],
      };

      queryClient.setQueryData<SuccessResponse<MessagesListData>>(
        messagingKeys.messages(conversationId, undefined),
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: {
              ...old.data,
              items: old.data.items.map((m) =>
                m.id === normalizedMessage.id ? normalizedMessage : m,
              ),
            },
          };
        },
      );
    };

    const handleMessageDeleted = (data: {
      messageId: string;
      conversationId: string;
    }) => {
      queryClient.setQueryData<SuccessResponse<MessagesListData>>(
        messagingKeys.messages(conversationId, undefined),
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: {
              ...old.data,
              items: old.data.items.map((m) =>
                m.id === data.messageId
                  ? { ...m, isDeleted: true, text: '[Message deleted]' }
                  : m,
              ),
            },
          };
        },
      );
    };

    const handleTypingUpdate = (data: {
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (data.isTyping) {
          next.set(data.userId, {
            conversationId: data.conversationId,
            userId: data.userId,
            isTyping: true,
            startedAt: new Date().toISOString(),
          });
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    };

    const handleReactionAdded = (data: {
      messageId: string;
      reaction: MessageReactionResponse;
    }) => {
      queryClient.setQueryData<SuccessResponse<MessagesListData>>(
        messagingKeys.messages(conversationId, undefined),
        (old) => {
          if (!old?.data?.items) return old;
          return {
            ...old,
            data: {
              ...old.data,
              items: old.data.items.map((m) =>
                m.id === data.messageId
                  ? { ...m, reactions: [...(m.reactions ?? []), data.reaction] }
                  : m,
              ),
            },
          };
        },
      );
    };

    const handleReactionRemoved = (data: {
      messageId: string;
      reactionId: string;
    }) => {
      queryClient.setQueryData<SuccessResponse<MessagesListData>>(
        messagingKeys.messages(conversationId, undefined),
        (old) => {
          if (!old?.data?.items) return old;
          return {
            ...old,
            data: {
              ...old.data,
              items: old.data.items.map((m) =>
                m.id === data.messageId
                  ? {
                      ...m,
                      reactions: (m.reactions ?? []).filter(
                        (r) => r.id !== data.reactionId,
                      ),
                    }
                  : m,
              ),
            },
          };
        },
      );
    };

    const handlePresenceUpdate = (data: {
      userId: string;
      isOnline: boolean;
    }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (data.isOnline) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('message:new', handleNewMessage);
    socket.on('message:updated', handleMessageUpdated);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('typing:update', handleTypingUpdate);
    socket.on('reaction:added', handleReactionAdded);
    socket.on('reaction:removed', handleReactionRemoved);
    socket.on('presence:update', handlePresenceUpdate);

    // If already connected, join room
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.emit('conversation:leave', { conversationId });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('message:new', handleNewMessage);
      socket.off('message:updated', handleMessageUpdated);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('typing:update', handleTypingUpdate);
      socket.off('reaction:added', handleReactionAdded);
      socket.off('reaction:removed', handleReactionRemoved);
      socket.off('presence:update', handlePresenceUpdate);
    };
  }, [conversationId, queryClient]);

  // Send message via socket
  const sendMessage = useCallback(
    (
      text: string,
      replyToId?: string,
      gif?: {
        url: string;
        previewUrl?: string;
        width?: number;
        height?: number;
        title?: string;
        giphyId?: string;
      },
    ) => {
      if (!conversationId) return;
      const socket = getMessagingSocket();
      socket.emit('message:send', { conversationId, text, gif, replyToId });
    },
    [conversationId],
  );

  // Mark message as read
  const markRead = useCallback(
    (messageId: string) => {
      if (!conversationId) return;
      const socket = getMessagingSocket();
      socket.emit('message:read', { conversationId, messageId });
    },
    [conversationId],
  );

  // Start typing indicator
  const startTyping = useCallback(() => {
    if (!conversationId) return;
    const socket = getMessagingSocket();
    socket.emit('typing:start', { conversationId });

    // Auto-stop after 5 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId });
    }, 5000);
  }, [conversationId]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (!conversationId) return;
    const socket = getMessagingSocket();
    socket.emit('typing:stop', { conversationId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [conversationId]);

  // Add reaction via socket
  const addReactionSocket = useCallback((messageId: string, emoji: string) => {
    const socket = getMessagingSocket();
    socket.emit('reaction:add', { messageId, emoji });
  }, []);

  // Remove reaction via socket
  const removeReactionSocket = useCallback(
    (messageId: string, emoji: string) => {
      const socket = getMessagingSocket();
      socket.emit('reaction:remove', { messageId, emoji });
    },
    [],
  );

  return {
    isConnected,
    typingUsers: Array.from(typingUsers.values()),
    onlineUsers,
    sendMessage,
    markRead,
    startTyping,
    stopTyping,
    addReaction: addReactionSocket,
    removeReaction: removeReactionSocket,
  };
}

/**
 * Global hook for total unread count badge
 */
export function useTotalUnread() {
  const { data } = useConversations();
  return data?.data?.totalUnread ?? 0;
}
