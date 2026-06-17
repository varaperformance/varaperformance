import {
  mapConversationResponse,
  sumConversationUnread,
} from './conversation-mapper';

describe('conversation-mapper', () => {
  const now = new Date('2026-03-24T12:00:00.000Z');

  const conversation = {
    id: 'conv-1',
    participantOneId: 'user-a',
    participantTwoId: 'user-b',
    bookingId: 'booking-1',
    status: 'ACTIVE',
    lastMessageAt: now,
    lastMessageText: 'Hello',
    participantOneUnreadCount: 2,
    participantTwoUnreadCount: 5,
    participantOne: {
      id: 'user-a',
      profile: { displayName: 'User A', avatarUrl: 'a.png' },
      coach: null,
    },
    participantTwo: {
      id: 'user-b',
      profile: { displayName: 'User B', avatarUrl: 'b.png' },
      coach: { id: 'coach-1' },
    },
    createdAt: now,
    updatedAt: now,
  };

  it('maps conversation for participant one perspective', () => {
    const mapped = mapConversationResponse(conversation, 'user-a');

    expect(mapped.id).toBe('conv-1');
    expect(mapped.unreadCount).toBe(2);
    expect(mapped.participant.userId).toBe('user-b');
    expect(mapped.participant.displayName).toBe('User B');
    expect(mapped.participant.isCoach).toBe(true);
    expect(mapped.lastMessageAt).toBe(now.toISOString());
  });

  it('maps conversation for participant two perspective', () => {
    const mapped = mapConversationResponse(conversation, 'user-b');

    expect(mapped.unreadCount).toBe(5);
    expect(mapped.participant.userId).toBe('user-a');
    expect(mapped.participant.displayName).toBe('User A');
    expect(mapped.participant.isCoach).toBe(false);
  });

  it('sums unread by user perspective across conversations', () => {
    const secondConversation = {
      ...conversation,
      id: 'conv-2',
      participantOneUnreadCount: 1,
      participantTwoUnreadCount: 7,
    };

    expect(
      sumConversationUnread([conversation, secondConversation], 'user-a'),
    ).toBe(3);
    expect(
      sumConversationUnread([conversation, secondConversation], 'user-b'),
    ).toBe(12);
  });
});
