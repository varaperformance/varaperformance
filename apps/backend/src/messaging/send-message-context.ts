type SendMessageConversation = {
  participantOneId: string;
  participantTwoId: string;
  participantOne: {
    profile?: {
      displayName?: string | null;
    } | null;
  };
  participantTwo: {
    profile?: {
      displayName?: string | null;
    } | null;
  };
};

export const resolveSendMessageContext = (
  conversation: SendMessageConversation,
  userId: string,
) => {
  const senderIsParticipantOne = conversation.participantOneId === userId;
  const recipientUserId = senderIsParticipantOne
    ? conversation.participantTwoId
    : conversation.participantOneId;

  const senderName = senderIsParticipantOne
    ? (conversation.participantOne.profile?.displayName ?? 'Someone')
    : (conversation.participantTwo.profile?.displayName ?? 'Someone');

  const unreadCountUpdate = senderIsParticipantOne
    ? { participantTwoUnreadCount: { increment: 1 as const } }
    : { participantOneUnreadCount: { increment: 1 as const } };

  return {
    senderIsParticipantOne,
    recipientUserId,
    senderName,
    unreadCountUpdate,
  };
};
