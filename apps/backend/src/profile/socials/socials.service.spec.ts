import { Test, TestingModule } from '@nestjs/testing';
import { SocialsService } from './socials.service';
import { DatabaseService } from '@app/database';

const now = new Date('2024-01-01T00:00:00.000Z');

const baseSocials = {
  id: 'socials-1',
  profileId: 'profile-1',
  twitter: 'https://twitter.com/testuser',
  facebook: null,
  instagram: null,
  threads: null,
  linkedin: null,
  github: null,
  createdAt: now,
  updatedAt: now,
};

const baseProfile = {
  id: 'profile-1',
  userId: 'user-1',
  displayName: 'TestUser',
  bio: null,
  avatarUrl: null,
  createdAt: now,
  updatedAt: now,
};

describe('SocialsService', () => {
  let service: SocialsService;
  const mockDb = {
    profile: {
      findUnique: jest.fn(),
    },
    socials: {
      delete: jest.fn(),
      upsert: jest.fn(),
    },
  } satisfies {
    profile: { findUnique: jest.Mock };
    socials: {
      delete: jest.Mock;
      upsert: jest.Mock;
    };
  };

  const mockDbService = mockDb as unknown as DatabaseService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialsService,
        { provide: DatabaseService, useValue: mockDbService },
      ],
    }).compile();

    service = module.get<SocialsService>(SocialsService);
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

    it('returns null data when profile has no socials', async () => {
      mockDb.profile.findUnique.mockResolvedValue({
        ...baseProfile,
        socials: null,
      });

      const result = await service.findByUserId('user-1');

      expect(result).toEqual({
        success: true,
        data: null,
      });
    });

    it('returns socials when they exist', async () => {
      mockDb.profile.findUnique.mockResolvedValue({
        ...baseProfile,
        socials: baseSocials,
      });

      const result = await service.findByUserId('user-1');

      expect(result).toEqual({
        success: true,
        data: {
          ...baseSocials,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      });
    });
  });

  describe('upsert', () => {
    it('returns NOT_FOUND when profile does not exist', async () => {
      mockDb.profile.findUnique.mockResolvedValue(null);

      const result = await service.upsert('user-1', {
        twitter: 'https://twitter.com/test',
      });

      expect(result).toEqual({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      });
    });

    it('upserts socials successfully', async () => {
      mockDb.profile.findUnique.mockResolvedValue(baseProfile);
      mockDb.socials.upsert.mockResolvedValue(baseSocials);

      const result = await service.upsert('user-1', {
        twitter: 'https://twitter.com/testuser',
      });

      expect(mockDb.socials.upsert).toHaveBeenCalledWith({
        where: { profileId: 'profile-1' },
        create: {
          twitter: 'https://twitter.com/testuser',
          profileId: 'profile-1',
        },
        update: { twitter: 'https://twitter.com/testuser' },
      });
      expect(result).toEqual({
        success: true,
        data: {
          ...baseSocials,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      });
    });
  });

  describe('remove', () => {
    it('returns NOT_FOUND when profile does not exist', async () => {
      mockDb.profile.findUnique.mockResolvedValue(null);

      const result = await service.remove('user-1');

      expect(result).toEqual({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      });
    });

    it('returns NOT_FOUND when socials do not exist', async () => {
      mockDb.profile.findUnique.mockResolvedValue({
        ...baseProfile,
        socials: null,
      });

      const result = await service.remove('user-1');

      expect(result).toEqual({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Socials not found' },
      });
    });

    it('deletes socials successfully', async () => {
      mockDb.profile.findUnique.mockResolvedValue({
        ...baseProfile,
        socials: baseSocials,
      });
      mockDb.socials.delete.mockResolvedValue(baseSocials);

      const result = await service.remove('user-1');

      expect(mockDb.socials.delete).toHaveBeenCalledWith({
        where: { id: 'socials-1' },
      });
      expect(result).toEqual({
        success: true,
        data: { message: 'Socials deleted successfully' },
      });
    });
  });
});
