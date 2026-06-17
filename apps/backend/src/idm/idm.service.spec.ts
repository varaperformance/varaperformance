import { ConflictException, ForbiddenException } from '@nestjs/common';
import { IdmService } from './idm.service';
import type { ConfigType } from '@nestjs/config';
import jwtConfig from './config/jwt.config';

const mockPrisma = {
  $transaction: jest.fn((callback) => callback(mockPrisma)),
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  profile: {
    findUnique: jest.fn(),
  },
  loginAttempt: {
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  passwordHistory: {
    findMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
  },
  userRole: {
    upsert: jest.fn(),
  },
  siteAccessMode: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  registrationCode: {
    updateMany: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
};

const hashService = {
  hash: jest.fn(),
  verify: jest.fn(),
};

const avatarService = {
  generateAvatar: jest.fn(),
};

const mailService = {
  sendMail: jest.fn(),
  sendVerificationEmail: jest.fn(),
};

const jwtService = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
};

const authorizationService = {
  getUserPermissions: jest.fn(),
};

const tokenStorage = {
  insert: jest.fn(),
  validate: jest.fn(),
  invalidate: jest.fn(),
  invalidateAllSessions: jest.fn(),
};

const consentService = {
  validateRequiredConsents: jest.fn(),
  recordConsents: jest.fn(),
};

const jwtConfiguration = {
  audience: 'aud',
  issuer: 'iss',
  secret: 'secret',
  accessTokenTtl: 3600,
  refreshTokenTtl: 86400,
} as ConfigType<typeof jwtConfig>;

describe('IdmService', () => {
  let service: IdmService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IdmService(
      mockPrisma,
      hashService as any,
      jwtService as any,
      avatarService as any,
      mailService as any,
      authorizationService as any,
      jwtConfiguration,
      tokenStorage as any,
      consentService as any,
      {} as any,
      {} as any,
    );
  });

  describe('register', () => {
    it('throws when user already exists', async () => {
      mockPrisma.siteAccessMode.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'u1' });

      await expect(
        service.register({ email: 'a@b.com', password: 'Passw0rd!' } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates user when email is free', async () => {
      mockPrisma.siteAccessMode.findUnique.mockResolvedValueOnce({
        privateModeEnabled: false,
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.profile.findUnique.mockResolvedValueOnce(null);
      mockPrisma.passwordHistory.findMany.mockResolvedValueOnce([]);
      mockPrisma.role.findUnique.mockResolvedValueOnce({ id: 'role-user' });
      mockPrisma.userRole.upsert.mockResolvedValueOnce({});
      hashService.hash.mockResolvedValue('hashed');
      avatarService.generateAvatar.mockResolvedValue('avatar-url');
      mockPrisma.user.create.mockResolvedValue({ id: 'u1', email: 'a@b.com' });

      const result = await service.register({
        email: 'a@b.com',
        password: 'Passw0rd!',
      } as any);

      expect(result.success).toBe(true);
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(hashService.hash).toHaveBeenCalledWith('Passw0rd!');
    });
  });

  describe('verifyEmail', () => {
    it('throws when code is invalid', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.verifyEmail({ verificationCode: '123' } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('regenerates code when expired', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: 'u1',
        isVerified: false,
        expiresAt: new Date(Date.now() - 1000),
        verificationCode: '123',
      });
      mockPrisma.user.update.mockResolvedValueOnce({ id: 'u1' });

      await expect(
        service.verifyEmail({ verificationCode: '123' } as any),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('verifies user when code valid', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: 'u1',
        isVerified: false,
        expiresAt: new Date(Date.now() + 10000),
        verificationCode: '123',
      });
      mockPrisma.user.update.mockResolvedValueOnce({ id: 'u1', email: 'a@b' });

      const result = await service.verifyEmail({
        verificationCode: '123',
      } as any);

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({ isVerified: true }),
        select: expect.any(Object),
      });
    });
  });

  describe('login', () => {
    it('rejects locked accounts', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'a@b',
        password: 'hashed',
        lockedUntil: new Date(Date.now() + 10000),
      });

      await expect(
        service.login({ email: 'a@b', password: 'p' } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(mockPrisma.loginAttempt.create).toHaveBeenCalled();
    });

    it('rejects invalid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'a@b',
        password: 'hashed',
        lockedUntil: null,
        failedLoginAttempts: 0,
        isVerified: true,
      });
      hashService.verify.mockResolvedValue(false);

      await expect(
        service.login({ email: 'a@b', password: 'wrong' } as any),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.loginAttempt.create).toHaveBeenCalled();
    });

    it('returns tokens on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'a@b',
        password: 'hashed',
        lockedUntil: null,
        failedLoginAttempts: 0,
        isActive: true,
        deletedAt: null,
        isVerified: true,
      });
      hashService.verify.mockResolvedValue(true);
      authorizationService.getUserPermissions.mockResolvedValue({
        success: true,
        data: {
          roles: ['admin'],
          permissions: [{ resource: 'blog', action: 'read' }],
        },
      });
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      tokenStorage.insert.mockResolvedValue(undefined);

      const result = await service.login({
        email: 'a@b',
        password: 'p',
      } as any);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ accessToken: 'access-token' });
      expect(tokenStorage.insert).toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('creates new tokens when refresh token valid', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'u1',
        refreshTokenId: 'r1',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b' });
      tokenStorage.validate.mockResolvedValue(true);
      authorizationService.getUserPermissions.mockResolvedValue({
        success: true,
        data: { roles: [], permissions: [] },
      });
      jwtService.signAsync
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce('new-refresh');
      tokenStorage.insert.mockResolvedValue(undefined);

      const result = await service.refreshTokens({
        refreshToken: 'token',
      } as any);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ refreshToken: 'new-refresh' });
      expect(tokenStorage.invalidate).toHaveBeenCalledWith('u1');
    });
  });
});
