import type {
  ConversationResponse,
  ConversationStatus,
} from '@varaperformance/core';

type ConversationParticipant = {
  id: string;
  profile?: {
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
  coach?: {
    id?: string | null;
  } | null;
};

type ConversationWithParticipants = {
  id: string;
  participantOneId: string;
  participantTwoId: string;
  bookingId?: string | null;
  status: string;
  lastMessageAt?: Date | null;
  lastMessageText?: string | null;
  participantOneUnreadCount: number;
  participantTwoUnreadCount: number;
  participantOne: ConversationParticipant;
  participantTwo: ConversationParticipant;
  createdAt: Date;
  updatedAt: Date;
};

export const mapConversationResponse = (
  conversation: ConversationWithParticipants,
  userId: string,
): ConversationResponse => {
  const userIsParticipantOne = conversation.participantOneId === userId;
  const unreadCount = userIsParticipantOne
    ? conversation.participantOneUnreadCount
    : conversation.participantTwoUnreadCount;

  const otherParticipant = userIsParticipantOne
    ? conversation.participantTwo
    : conversation.participantOne;

  return {
    id: conversation.id,
    participantOneId: conversation.participantOneId,
    participantTwoId: conversation.participantTwoId,
    coachId: undefined,
    clientId: undefined,
    bookingId: conversation.bookingId ?? undefined,
    status: conversation.status as ConversationStatus,
    lastMessageAt: conversation.lastMessageAt?.toISOString(),
    lastMessageText: conversation.lastMessageText ?? undefined,
    unreadCount,
    participant: {
      userId: otherParticipant.id,
      displayName: otherParticipant.profile?.displayName ?? undefined,
      avatarUrl: otherParticipant.profile?.avatarUrl ?? undefined,
      isCoach: Boolean(otherParticipant.coach?.id),
    },
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
};

export const sumConversationUnread = (
  conversations: ConversationWithParticipants[],
  userId: string,
): number =>
  conversations.reduce(
    (sum, conversation) =>
      sum +
      (conversation.participantOneId === userId
        ? conversation.participantOneUnreadCount
        : conversation.participantTwoUnreadCount),
    0,
  );
