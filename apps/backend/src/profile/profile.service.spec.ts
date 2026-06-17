import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';

const now = new Date('2024-01-01T00:00:00.000Z');

const baseProfile = {
  id: 'profile-1',
  userId: 'user-1',
  displayName: 'TestUser',
  bio: 'My bio',
  avatarUrl: 'https://example.com/avatar.png',
  coverUrl: null,
  allowedAI: false,
  timezone: null,
  theme: null,
  eProfile: Buffer.from('encrypted'),
  profileIv: Buffer.from('iv'),
  profileAuthTag: Buffer.from('tag'),
  profileWrappedKey: Buffer.from('key'),
  completedAt: null,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

const decryptedPii = {
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1990-01-15',
};

describe('ProfileService', () => {
  let service: ProfileService;

  const mockDb = {
    profile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    profileAddress: {
      findMany: jest.fn(),
    },
    socials: {
      upsert: jest.fn(),
    },
  };

  const mockEncryption = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDb.profileAddress.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: EncryptionService, useValue: mockEncryption },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  describe('findByUserId', () => {
    it('returns NOT_FOUND when profile does not exist', async () => {
      mockDb.profile.findUnique.mockResolvedValue(null);

      const result = await service.findByUserId('user-1');

      expect(result).toEqual({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      });
    });

    it('returns minimal profile (data minimization)', async () => {
      mockDb.profile.findUnique.mockResolvedValue(baseProfile);

      const result = await service.findByUserId('user-1');

      // findByUserId now returns minimal profile per SOC2/HIPAA data minimization
      expect(result).toEqual({
        success: true,
        data: {
          userId: 'user-1',
          displayName: 'TestUser',
          avatarUrl: 'https://example.com/avatar.png',
          coverUrl: null,
          allowedAI: false,
          completedAt: null,
          timezone: null,
          unit: null,
          theme: null,
        },
      });
    });

    it('returns minimal profile when PII not encrypted', async () => {
      mockDb.profile.findUnique.mockResolvedValue({
        ...baseProfile,
        eProfile: null,
        profileIv: null,
        profileAuthTag: null,
        profileWrappedKey: null,
      });

      const result = await service.findByUserId('user-1');

      // findByUserId returns minimal profile regardless of encryption state
      expect(result).toEqual({
        success: true,
        data: {
          userId: 'user-1',
          displayName: 'TestUser',
          avatarUrl: 'https://example.com/avatar.png',
          coverUrl: null,
          allowedAI: false,
          completedAt: null,
          timezone: null,
          unit: null,
          theme: null,
        },
      });
    });
  });

  describe('upsert', () => {
    it('returns NOT_FOUND when profile does not exist', async () => {
      mockDb.profile.findUnique.mockResolvedValue(null);

      const result = await service.upsert('user-1', { displayName: 'NewName' });

      expect(result).toEqual({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      });
    });

    it('updates public fields only', async () => {
      mockDb.profile.findUnique.mockResolvedValue(baseProfile);
      mockDb.profile.update.mockResolvedValue({
        ...baseProfile,
        displayName: 'newname',
        bio: 'New bio',
      });
      mockEncryption.decrypt.mockReturnValue(
        Buffer.from(JSON.stringify(decryptedPii)),
      );

      const result = await service.upsert('user-1', {
        displayName: 'NewName',
        bio: 'New bio',
      });

      // Display name should be normalized to lowercase
      expect(mockDb.profile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { displayName: 'newname', bio: 'New bio' },
      });
      expect(result.success).toBe(true);
    });

    it('encrypts PII when provided', async () => {
      mockDb.profile.findUnique.mockResolvedValue(baseProfile);
      mockEncryption.decrypt.mockReturnValue(
        Buffer.from(JSON.stringify(decryptedPii)),
      );
      mockEncryption.encrypt.mockReturnValue({
        encryptedContent: Buffer.from('new-encrypted'),
        contentIv: Buffer.from('new-iv'),
        contentAuthTag: Buffer.from('new-tag'),
        wrappedKey: Buffer.from('new-key'),
      });
      mockDb.profile.update.mockResolvedValue({
        ...baseProfile,
        eProfile: Buffer.from('new-encrypted'),
      });

      await service.upsert('user-1', { firstName: 'Jane' });

      expect(mockEncryption.encrypt).toHaveBeenCalledWith(
        JSON.stringify({
          firstName: 'Jane',
          lastName: 'Doe',
          dateOfBirth: '1990-01-15',
          unit: undefined,
          height: undefined,
        }),
      );
      expect(mockDb.profile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: {
          eProfile: Buffer.from('new-encrypted'),
          profileIv: Buffer.from('new-iv'),
          profileAuthTag: Buffer.from('new-tag'),
          profileWrappedKey: Buffer.from('new-key'),
        },
      });
    });

    it('upserts socials when provided', async () => {
      mockDb.profile.findUnique.mockResolvedValue(baseProfile);
      mockDb.profile.update.mockResolvedValue(baseProfile);
      mockEncryption.decrypt.mockReturnValue(
        Buffer.from(JSON.stringify(decryptedPii)),
      );

      await service.upsert('user-1', {
        socials: { twitter: 'https://twitter.com/test' },
      });

      expect(mockDb.socials.upsert).toHaveBeenCalledWith({
        where: { profileId: 'profile-1' },
        create: {
          twitter: 'https://twitter.com/test',
          profileId: 'profile-1',
        },
        update: { twitter: 'https://twitter.com/test' },
      });
    });
  });

  describe('complete', () => {
    it('returns NOT_FOUND when profile does not exist', async () => {
      mockDb.profile.findUnique.mockResolvedValue(null);

      const result = await service.complete('user-1');

      expect(result).toEqual({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      });
    });

    it('marks profile as completed', async () => {
      const completedAt = new Date('2024-01-02T00:00:00.000Z');
      mockDb.profile.findUnique.mockResolvedValue(baseProfile);
      mockDb.profile.update.mockResolvedValue({
        ...baseProfile,
        completedAt,
      });
      mockEncryption.decrypt.mockReturnValue(
        Buffer.from(JSON.stringify(decryptedPii)),
      );

      const result = await service.complete('user-1');

      expect(mockDb.profile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { completedAt: expect.any(Date) },
      });
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          completedAt: completedAt.toISOString(),
        }),
      });
    });
  });

  describe('checkDisplayNameAvailability', () => {
    it('returns available when no profile has the display name', async () => {
      mockDb.profile.findFirst.mockResolvedValue(null);

      const result = await service.checkDisplayNameAvailability(
        'NewName',
        'user-1',
      );

      expect(result).toEqual({
        success: true,
        data: { available: true },
      });
      // Should use case-insensitive search
      expect(mockDb.profile.findFirst).toHaveBeenCalledWith({
        where: {
          displayName: {
            equals: 'NewName',
            mode: 'insensitive',
          },
        },
        select: { userId: true },
      });
    });

    it('returns available when current user owns the display name', async () => {
      mockDb.profile.findFirst.mockResolvedValue({ userId: 'user-1' });

      const result = await service.checkDisplayNameAvailability(
        'MyName',
        'user-1',
      );

      expect(result).toEqual({
        success: true,
        data: { available: true },
      });
    });

    it('returns not available when another user has the display name', async () => {
      mockDb.profile.findFirst.mockResolvedValue({ userId: 'other-user' });

      const result = await service.checkDisplayNameAvailability(
        'TakenName',
        'user-1',
      );

      expect(result).toEqual({
        success: true,
        data: { available: false },
      });
    });
  });
});
