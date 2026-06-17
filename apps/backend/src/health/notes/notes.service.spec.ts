import { NotesService } from './notes.service';
import type { SuccessResponse, ErrorResponse } from '@varaperformance/core';

const mockDb = {
  note: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockEncryption = {
  encrypt: jest.fn(),
  decrypt: jest.fn(),
};

describe('NotesService', () => {
  let service: NotesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotesService(mockDb as any, mockEncryption as any);
  });

  it('creates a note with encrypted payload', async () => {
    const now = new Date();
    mockEncryption.encrypt.mockReturnValue({
      encryptedContent: Buffer.from('enc'),
      contentIv: Buffer.from('iv'),
      contentAuthTag: Buffer.from('tag'),
      wrappedKey: Buffer.from('wrap'),
    });
    mockDb.note.create.mockResolvedValue({
      id: 'n1',
      createdAt: now,
      updatedAt: now,
    });

    const result = (await service.create('user-1', {
      title: 'Note',
      content: 'Content',
    })) as SuccessResponse<{ title: string }>;

    expect(result.success).toBe(true);
    expect(result.data.title).toBe('Note');
    expect(mockDb.note.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'user-1' }),
    });
  });

  it('findAll decrypts notes', async () => {
    const now = new Date();
    const encrypted = {
      encryptedData: Buffer.from('enc'),
      dataIv: Buffer.from('iv'),
      dataAuthTag: Buffer.from('tag'),
      wrappedKey: Buffer.from('wrap'),
      id: 'n1',
      createdAt: now,
      updatedAt: now,
      userId: 'user-1',
    } as any;
    mockDb.note.findMany.mockResolvedValue([encrypted]);
    mockDb.note.count.mockResolvedValue(1);
    mockEncryption.decrypt.mockReturnValue(
      Buffer.from(JSON.stringify({ title: 'Note', content: 'Body' })),
    );

    const result = (await service.findAll('user-1', { page: 1, limit: 10 }))
      .data;

    expect(result.items[0].title).toBe('Note');
    expect(result.total).toBe(1);
    expect(mockDb.note.findMany).toHaveBeenCalled();
    const callArg = mockDb.note.findMany.mock.calls[0][0];
    expect(callArg.where).toEqual({ userId: 'user-1' });
    expect(callArg.orderBy).toEqual({ updatedAt: 'desc' });
    expect(callArg.skip).toBe(0);
    expect(callArg.take).toBe(10);
  });

  it('findOne returns error when missing', async () => {
    mockDb.note.findFirst.mockResolvedValue(null);

    const result = (await service.findOne(
      'user-1',
      'missing',
    )) as ErrorResponse;

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NOT_FOUND');
  });

  it('findOne returns decrypted note when found', async () => {
    const now = new Date();
    const encrypted = {
      encryptedData: Buffer.from('enc'),
      dataIv: Buffer.from('iv'),
      dataAuthTag: Buffer.from('tag'),
      wrappedKey: Buffer.from('wrap'),
      id: 'n1',
      createdAt: now,
      updatedAt: now,
    } as any;
    mockDb.note.findFirst.mockResolvedValue(encrypted);
    mockEncryption.decrypt.mockReturnValue(
      Buffer.from(JSON.stringify({ title: 'Note', content: 'Body' })),
    );

    const result = (await service.findOne('user-1', 'n1')) as SuccessResponse;

    expect(result.data).toMatchObject({ title: 'Note', content: 'Body' });
  });

  it('update returns error when note missing', async () => {
    mockDb.note.findFirst.mockResolvedValue(null);

    const result = (await service.update('user-1', 'missing', {
      title: 'New',
    })) as ErrorResponse;

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NOT_FOUND');
  });

  it('update merges existing data and saves encrypted note', async () => {
    const now = new Date();
    const encrypted = {
      encryptedData: Buffer.from('enc'),
      dataIv: Buffer.from('iv'),
      dataAuthTag: Buffer.from('tag'),
      wrappedKey: Buffer.from('wrap'),
      id: 'n1',
      createdAt: now,
      updatedAt: now,
    } as any;
    mockDb.note.findFirst.mockResolvedValue(encrypted);
    mockEncryption.decrypt.mockReturnValue(
      Buffer.from(JSON.stringify({ title: 'Old', content: 'Old body' })),
    );
    mockEncryption.encrypt.mockReturnValue({
      encryptedContent: Buffer.from('new-enc'),
      contentIv: Buffer.from('iv2'),
      contentAuthTag: Buffer.from('tag2'),
      wrappedKey: Buffer.from('wrap2'),
    });
    mockDb.note.update.mockResolvedValue({ ...encrypted });

    const result = (await service.update('user-1', 'n1', {
      content: 'Updated',
    })) as SuccessResponse;

    expect(result.success).toBe(true);
    expect(mockDb.note.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: expect.objectContaining({
        encryptedData: Buffer.from('new-enc'),
      }),
    });
  });

  it('remove returns error when note missing', async () => {
    mockDb.note.findFirst.mockResolvedValue(null);

    const result = (await service.remove('user-1', 'missing')) as ErrorResponse;

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NOT_FOUND');
  });

  it('remove deletes note when present', async () => {
    mockDb.note.findFirst.mockResolvedValue({ id: 'n1' });
    mockDb.note.delete.mockResolvedValue(undefined);

    const result = (await service.remove('user-1', 'n1')) as SuccessResponse;

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ message: 'Note deleted successfully' });
  });
});
