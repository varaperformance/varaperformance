import { transformMessageForResponse } from './message-transformer';

describe('message-transformer', () => {
  const now = new Date('2026-03-24T12:00:00.000Z');

  const baseMessage = {
    id: 'm1',
    conversationId: 'c1',
    senderId: 'u1',
    sender: { profile: { displayName: 'User One', avatarUrl: 'u1.png' } },
    encryptedContent: 'enc',
    contentIv: 'iv',
    contentAuthTag: 'tag',
    wrappedKey: 'wk',
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
  };

  it('decrypts text and maps a normal message', () => {
    const decrypt = jest
      .fn()
      .mockReturnValue(
        Buffer.from(JSON.stringify({ text: 'hello', attachments: [] })),
      );
    const logger = { error: jest.fn() };

    const transformed = transformMessageForResponse(
      baseMessage,
      { decrypt } as any,
      logger as any,
    );

    expect(transformed.id).toBe('m1');
    expect(transformed.text).toBe('hello');
    expect(transformed.senderDisplayName).toBe('User One');
    expect(transformed.createdAt).toBe(now.toISOString());
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('extracts gif metadata from decrypted attachments', () => {
    const decrypt = jest.fn().mockReturnValue(
      Buffer.from(
        JSON.stringify({
          text: 'gif text',
          attachments: [
            {
              type: 'gif',
              url: 'https://gif',
              previewUrl: 'https://gif-preview',
              width: 100,
              height: 80,
              title: 'Cool gif',
              giphyId: 'g1',
            },
          ],
        }),
      ),
    );
    const logger = { error: jest.fn() };

    const transformed = transformMessageForResponse(
      baseMessage,
      { decrypt } as any,
      logger as any,
    );

    expect(transformed.gif).toEqual(
      expect.objectContaining({
        title: 'Cool gif',
        giphyId: 'g1',
      }),
    );
  });

  it('returns placeholder text and logs when decryption fails', () => {
    const decrypt = jest.fn().mockImplementation(() => {
      throw new Error('boom');
    });
    const logger = { error: jest.fn() };

    const transformed = transformMessageForResponse(
      baseMessage,
      { decrypt } as any,
      logger as any,
    );

    expect(transformed.text).toBe('[Unable to decrypt message]');
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('returns deleted placeholder without decrypting', () => {
    const decrypt = jest.fn();
    const logger = { error: jest.fn() };

    const transformed = transformMessageForResponse(
      {
        ...baseMessage,
        isDeleted: true,
      },
      { decrypt } as any,
      logger as any,
    );

    expect(transformed.text).toBe('[Message deleted]');
    expect(decrypt).not.toHaveBeenCalled();
  });

  it('maps reply preview when reply exists and decrypt succeeds', () => {
    const decrypt = jest
      .fn()
      .mockReturnValueOnce(
        Buffer.from(JSON.stringify({ text: 'main text', attachments: [] })),
      )
      .mockReturnValueOnce(
        Buffer.from(
          JSON.stringify({
            text: 'reply text that should be previewed',
            attachments: [],
          }),
        ),
      );

    const logger = { error: jest.fn() };

    const transformed = transformMessageForResponse(
      {
        ...baseMessage,
        replyToId: 'r1',
        replyTo: {
          id: 'r1',
          encryptedContent: 'enc-r',
          contentIv: 'iv-r',
          contentAuthTag: 'tag-r',
          wrappedKey: 'wk-r',
          isDeleted: false,
          sender: { profile: { displayName: 'Reply User' } },
        },
      },
      { decrypt } as any,
      logger as any,
    );

    expect(transformed.replyTo).toEqual(
      expect.objectContaining({
        id: 'r1',
        senderDisplayName: 'Reply User',
      }),
    );
  });
});
