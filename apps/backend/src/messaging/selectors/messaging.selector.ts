import { Prisma } from '../../generated/prisma/client';

/**
 * Conversation list select - for listing conversations
 */
export const conversationListSelect = {
  id: true,
  participantOneId: true,
  participantTwoId: true,
  bookingId: true,
  status: true,
  lastMessageAt: true,
  lastMessageText: true,
  participantOneUnreadCount: true,
  participantTwoUnreadCount: true,
  createdAt: true,
  updatedAt: true,
  participantOne: {
    select: {
      id: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
      coach: {
        select: {
          id: true,
        },
      },
    },
  },
  participantTwo: {
    select: {
      id: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
      coach: {
        select: {
          id: true,
        },
      },
    },
  },
} satisfies Prisma.ConversationSelect;

/**
 * Message select - for listing messages
 */
export const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  status: true,
  sentAt: true,
  deliveredAt: true,
  readAt: true,
  isEdited: true,
  editedAt: true,
  isDeleted: true,
  replyToId: true,
  createdAt: true,
  updatedAt: true,
  // Encryption fields (need to decrypt)
  encryptedContent: true,
  contentIv: true,
  contentAuthTag: true,
  wrappedKey: true,
  sender: {
    select: {
      id: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
  replyTo: {
    select: {
      id: true,
      senderId: true,
      encryptedContent: true,
      contentIv: true,
      contentAuthTag: true,
      wrappedKey: true,
      sender: {
        select: {
          profile: {
            select: {
              displayName: true,
            },
          },
        },
      },
    },
  },
  reactions: {
    select: {
      id: true,
      emoji: true,
      userId: true,
      createdAt: true,
      user: {
        select: {
          profile: {
            select: {
              displayName: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.MessageSelect;

/**
 * Message reaction select
 */
export const reactionSelect = {
  id: true,
  emoji: true,
  userId: true,
  createdAt: true,
  user: {
    select: {
      profile: {
        select: {
          displayName: true,
        },
      },
    },
  },
} satisfies Prisma.MessageReactionSelect;
