import { Test, TestingModule } from '@nestjs/testing';
import { IdmController } from './idm.controller';
import { IdmService } from './idm.service';
import { OAuthService } from './oauth.service';
import { AuthorizationService } from './authorization.service';
import { TotpService } from './totp.service';
import jwtConfig from './config/jwt.config';

describe('IdmController', () => {
  let controller: IdmController;
  const idmService = {
    register: jest.fn(),
    verifyEmail: jest.fn(),
    login: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    logoutAllDevices: jest.fn(),
  } as const;
  const oauthService = {
    googleLogin: jest.fn(),
    appleLogin: jest.fn(),
  } as const;
  const authorizationService = {} as AuthorizationService;
  const totpService = {
    setupTotp: jest.fn(),
    verifyAndEnable: jest.fn(),
    verifyToken: jest.fn(),
    disableTotp: jest.fn(),
    isTotpEnabled: jest.fn(),
  } as const;

  const res = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdmController],
      providers: [
        { provide: IdmService, useValue: idmService },
        { provide: OAuthService, useValue: oauthService },
        { provide: AuthorizationService, useValue: authorizationService },
        { provide: TotpService, useValue: totpService },
        {
          provide: jwtConfig.KEY,
          useValue: { accessTokenTtl: 3600, refreshTokenTtl: 86400 },
        },
        {
          provide: jwtConfig.KEY,
          useValue: { accessTokenTtl: 3600, refreshTokenTtl: 86400 },
        },
      ],
    }).compile();

    controller = module.get<IdmController>(IdmController);
  });

  it('sets cookies for browser login', async () => {
    idmService.login.mockResolvedValue({
      success: true,
      data: { accessToken: 'a', refreshToken: 'r' },
    });
    const req = { headers: { origin: 'http://app' } } as any;
    const ctx = { ipAddress: '1.1.1.1', userAgent: 'agent' } as any;

    const result = await controller.login(
      { email: 'a@b', password: 'p' } as any,
      ctx,
      req,
      res,
    );

    expect(result).toEqual({ ok: true });
    expect(res.cookie).toHaveBeenCalledTimes(2);
  });

  it('returns tokens for API login without cookies', async () => {
    idmService.login.mockResolvedValue({
      success: true,
      data: { accessToken: 'a', refreshToken: 'r' },
    });
    const req = { headers: {} } as any;
    const ctx = { ipAddress: '1.1.1.1', userAgent: 'agent' } as any;

    const result = await controller.login(
      { email: 'a@b', password: 'p' } as any,
      ctx,
      req,
      res,
    );

    expect(result).toMatchObject({ success: true });
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('refreshes tokens from browser cookies', async () => {
    idmService.refreshTokens.mockResolvedValue({
      success: true,
      data: { accessToken: 'a', refreshToken: 'r' },
    });
    const req = {
      headers: { origin: 'http://app' },
      cookies: { refresh_token: 'rt' },
    } as any;
    const ctx = { ipAddress: '1.1.1.1', userAgent: 'agent' } as any;

    const result = await controller.refresh({} as any, ctx, req, res);

    expect(result).toEqual({ ok: true });
    expect(idmService.refreshTokens).toHaveBeenCalledWith(
      { refreshToken: 'rt' },
      ctx,
    );
    expect(res.cookie).toHaveBeenCalledTimes(2);
  });

  it('logs out and clears cookies for browser', async () => {
    idmService.logout.mockResolvedValue({ success: true });
    const req = { headers: { origin: 'http://app' } } as any;
    const ctx = { ipAddress: '1.1.1.1', userAgent: 'agent' } as any;
    const user = { sub: 'u1' } as any;

    const result = await controller.logout(user, ctx, req, res);

    expect(result).toEqual({ success: true });
    expect(idmService.logout).toHaveBeenCalledWith('u1', '1.1.1.1', 'agent');
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
  });

  it('handles Google OAuth login and sets cookies for browser', async () => {
    oauthService.googleLogin.mockResolvedValue({
      success: true,
      data: { accessToken: 'a', refreshToken: 'r' },
    });
    const req = { headers: { origin: 'http://app' } } as any;
    const ctx = { ipAddress: '1.1.1.1', userAgent: 'agent' } as any;

    const result = await controller.googleLogin(
      { idToken: 't', platform: 'web' } as any,
      ctx,
      req,
      res,
    );

    expect(result).toEqual({ ok: true });
    expect(oauthService.googleLogin).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledTimes(2);
  });
});
