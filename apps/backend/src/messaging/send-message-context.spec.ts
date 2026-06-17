import { resolveSendMessageContext } from './send-message-context';

describe('send-message-context', () => {
  const conversation = {
    participantOneId: 'user-a',
    participantTwoId: 'user-b',
    participantOne: {
      profile: { displayName: 'Alice' },
    },
    participantTwo: {
      profile: { displayName: 'Bob' },
    },
  };

  it('resolves recipient and unread update when sender is participant one', () => {
    const ctx = resolveSendMessageContext(conversation, 'user-a');

    expect(ctx.senderIsParticipantOne).toBe(true);
    expect(ctx.recipientUserId).toBe('user-b');
    expect(ctx.senderName).toBe('Alice');
    expect(ctx.unreadCountUpdate).toEqual({
      participantTwoUnreadCount: { increment: 1 },
    });
  });

  it('resolves recipient and unread update when sender is participant two', () => {
    const ctx = resolveSendMessageContext(conversation, 'user-b');

    expect(ctx.senderIsParticipantOne).toBe(false);
    expect(ctx.recipientUserId).toBe('user-a');
    expect(ctx.senderName).toBe('Bob');
    expect(ctx.unreadCountUpdate).toEqual({
      participantOneUnreadCount: { increment: 1 },
    });
  });

  it('falls back to default sender name when profile display name is missing', () => {
    const ctx = resolveSendMessageContext(
      {
        participantOneId: 'user-a',
        participantTwoId: 'user-b',
        participantOne: { profile: null },
        participantTwo: { profile: null },
      },
      'user-a',
    );

    expect(ctx.senderName).toBe('Someone');
  });
});
