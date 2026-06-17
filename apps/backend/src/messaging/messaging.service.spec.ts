import { MessagingService } from './messaging.service';

const mockDb = {
  conversation: {
    findUnique: jest.fn(),
  },
  message: {
    findMany: jest.fn(),
  },
};

const mockEncryption = {
  decrypt: jest.fn(),
};

describe('MessagingService.searchMessages', () => {
  let service: MessagingService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new MessagingService(
      mockDb as any,
      mockEncryption as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('returns access denied when user is not in the conversation', async () => {
    mockDb.conversation.findUnique.mockResolvedValueOnce({
      participantOneId: 'user-a',
      participantTwoId: 'user-b',
    });

    const result = await service.searchMessages('user-c', 'conv-1', {
      q: 'hello',
    });

    if (result.success) {
      throw new Error('Expected error response');
    }

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('MESSAGING_ERROR');
    expect(mockDb.message.findMany).not.toHaveBeenCalled();
  });

  it('finds matches from decrypted recent messages', async () => {
    mockDb.conversation.findUnique.mockResolvedValueOnce({
      participantOneId: 'user-a',
      participantTwoId: 'user-b',
    });

    const now = new Date();
    mockDb.message.findMany.mockResolvedValueOnce([
      {
        id: 'm1',
        conversationId: 'conv-1',
        senderId: 'user-a',
        sender: { profile: { displayName: 'User A', avatarUrl: null } },
        encryptedContent: 'enc-1',
        contentIv: 'iv-1',
        contentAuthTag: 'tag-1',
        wrappedKey: 'key-1',
        isDeleted: false,
        status: 'SENT',
        sentAt: now,
        deliveredAt: null,
        readAt: null,
        isEdited: false,
        editedAt: null,
        replyToId: null,
        replyTo: null,
        reactions: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'm2',
        conversationId: 'conv-1',
        senderId: 'user-b',
        sender: { profile: { displayName: 'User B', avatarUrl: null } },
        encryptedContent: 'enc-2',
        contentIv: 'iv-2',
        contentAuthTag: 'tag-2',
        wrappedKey: 'key-2',
        isDeleted: false,
        status: 'SENT',
        sentAt: now,
        deliveredAt: null,
        readAt: null,
        isEdited: false,
        editedAt: null,
        replyToId: null,
        replyTo: null,
        reactions: [],
        createdAt: now,
        updatedAt: now,
      },
    ]);

    mockEncryption.decrypt
      .mockReturnValueOnce(
        Buffer.from(JSON.stringify({ text: 'hello there', attachments: [] })),
      )
      .mockReturnValueOnce(
        Buffer.from(JSON.stringify({ text: 'unrelated', attachments: [] })),
      );

    const result = await service.searchMessages('user-a', 'conv-1', {
      q: 'HELLO',
      limit: 10,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected success response');
    }

    expect(result.data.total).toBe(1);
    expect(result.data.items[0]?.id).toBe('m1');
    expect(result.data.items[0]?.text).toBe('hello there');
    expect(mockDb.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          conversationId: 'conv-1',
          isDeleted: false,
        },
        take: 500,
      }),
    );
  });

  it('respects the requested result limit', async () => {
    mockDb.conversation.findUnique.mockResolvedValueOnce({
      participantOneId: 'user-a',
      participantTwoId: 'user-b',
    });

    const now = new Date();
    mockDb.message.findMany.mockResolvedValueOnce([
      {
        id: 'm1',
        conversationId: 'conv-1',
        senderId: 'user-a',
        sender: { profile: { displayName: 'User A', avatarUrl: null } },
        encryptedContent: 'enc-1',
        contentIv: 'iv-1',
        contentAuthTag: 'tag-1',
        wrappedKey: 'key-1',
        isDeleted: false,
        status: 'SENT',
        sentAt: now,
        deliveredAt: null,
        readAt: null,
        isEdited: false,
        editedAt: null,
        replyToId: null,
        replyTo: null,
        reactions: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'm2',
        conversationId: 'conv-1',
        senderId: 'user-b',
        sender: { profile: { displayName: 'User B', avatarUrl: null } },
        encryptedContent: 'enc-2',
        contentIv: 'iv-2',
        contentAuthTag: 'tag-2',
        wrappedKey: 'key-2',
        isDeleted: false,
        status: 'SENT',
        sentAt: now,
        deliveredAt: null,
        readAt: null,
        isEdited: false,
        editedAt: null,
        replyToId: null,
        replyTo: null,
        reactions: [],
        createdAt: now,
        updatedAt: now,
      },
    ]);

    mockEncryption.decrypt
      .mockReturnValueOnce(
        Buffer.from(JSON.stringify({ text: 'match one', attachments: [] })),
      )
      .mockReturnValueOnce(
        Buffer.from(JSON.stringify({ text: 'match two', attachments: [] })),
      );

    const result = await service.searchMessages('user-a', 'conv-1', {
      q: 'match',
      limit: 1,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected success response');
    }

    expect(result.data.total).toBe(1);
    expect(result.data.items).toHaveLength(1);
  });

  it('caps result limit to the configured maximum', async () => {
    mockDb.conversation.findUnique.mockResolvedValueOnce({
      participantOneId: 'user-a',
      participantTwoId: 'user-b',
    });

    mockDb.message.findMany.mockResolvedValueOnce([]);

    await service.searchMessages('user-a', 'conv-1', {
      q: 'hello',
      limit: 500,
    });

    expect(mockDb.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 500,
      }),
    );
  });
});
