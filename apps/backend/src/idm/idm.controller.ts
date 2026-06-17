import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  Param,
  Patch,
  Delete,
  Query,
  Inject,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Permissions } from './decorators/permissions.decorator';
import { IdmService } from './idm.service';
import { AuthorizationService } from './authorization.service';
import {
  LoginUserDto,
  RegisterUserWithConsentsDto,
  VerifyUserDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  TotpVerifyDto,
  TotpDisableDto,
  AdminCreateUserDto,
} from './dto/user.dto';
import { Public } from './decorators/public.decorator';
import { AllowRestricted } from './decorators/allow-restricted.decorator';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ActiveUser } from './decorators/active-user.decorator';
import type { JwtPayload } from './interfaces/jwt.interface';
import type { Request, Response } from 'express';
import { OAuthService } from './oauth.service';
import { TotpService } from './totp.service';
import {
  GoogleLoginDto,
  AppleLoginDto,
  OAuthTotpVerifyDto,
} from './dto/oauth.dto';
import type { SuccessResponse } from '@varaperformance/core';
import { ClientMeta, type ClientMetadata } from '@app/common/decorators';
import type { ConfigType } from '@nestjs/config';
import jwtConfig from './config/jwt.config';

@ApiTags('idm')
@Throttle({ default: { ttl: 1000, limit: 10 } })
@Controller({
  path: 'idm',
  version: '1',
})
export class IdmController {
  constructor(
    private readonly idmService: IdmService,
    private readonly oauthService: OAuthService,
    private readonly authorizationService: AuthorizationService,
    private readonly totpService: TotpService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}
  // logout
  @ApiOperation({ summary: 'Register a new user with consent tracking' })
  @ApiOkResponse({ description: 'User registered with consents recorded' })
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('register')
  register(
    @Body() registerUserDto: RegisterUserWithConsentsDto,
    @ClientMeta() ctx: ClientMetadata,
  ) {
    return this.idmService.register(registerUserDto, ctx);
  }

  @ApiOperation({ summary: 'Verify email with code' })
  @ApiOkResponse({ description: 'Email verified' })
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('verify')
  verify(@Body() verifyUserDto: VerifyUserDto) {
    return this.idmService.verifyEmail(verifyUserDto);
  }

  @ApiOperation({ summary: 'Resend verification code email' })
  @ApiOkResponse({ description: 'Verification code email sent when eligible' })
  @Public()
  @Post('resend-verification')
  resendVerification(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.idmService.resendVerificationEmail(forgotPasswordDto.email);
  }

  @ApiOperation({ summary: 'Get registration access status' })
  @ApiOkResponse({ description: 'Private mode registration status' })
  @Public()
  @Get('registration/access')
  getRegistrationAccessStatus() {
    return this.idmService.getRegistrationAccessStatus();
  }

  @ApiOperation({ summary: 'Validate registration code' })
  @ApiOkResponse({ description: 'Registration code validation result' })
  @Public()
  @Post('registration/validate-code')
  validateRegistrationCode(@Body('code') code: string) {
    return this.idmService.validateRegistrationCode(code);
  }

  @ApiOperation({ summary: 'Log in with credentials' })
  @ApiOkResponse({ description: 'User logged in' })
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  async login(
    @Body() loginUserDto: LoginUserDto,
    @ClientMeta() ctx: ClientMetadata,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const response = await this.idmService.login(
      loginUserDto,
      ctx.ipAddress,
      ctx.userAgent,
    );
    return this.handleAuthResponse(req, res, response);
  }

  @ApiOperation({ summary: 'Request password reset' })
  @ApiOkResponse({ description: 'Password reset email sent' })
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.idmService.forgotPassword(forgotPasswordDto.email);
  }

  @ApiOperation({ summary: 'Reset password with code' })
  @ApiOkResponse({ description: 'Password reset' })
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('reset-password')
  resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @ClientMeta() ctx: ClientMetadata,
  ) {
    return this.idmService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.resetCode,
      resetPasswordDto.newPassword,
      ctx.ipAddress,
      ctx.userAgent,
    );
  }

  @ApiOperation({ summary: 'Change password for active user' })
  @ApiOkResponse({ description: 'Password changed' })
  @Post('change-password')
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @ActiveUser() user: JwtPayload,
    @ClientMeta() ctx: ClientMetadata,
  ) {
    return this.idmService.changePassword(
      user.sub,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
      ctx.ipAddress,
      ctx.userAgent,
    );
  }

  @ApiOperation({ summary: 'Refresh tokens' })
  @ApiOkResponse({ description: 'Tokens refreshed' })
  @Public()
  @SkipThrottle()
  @Post('refresh')
  async refresh(
    @Body() refreshTokenDto: { refreshToken?: string },
    @ClientMeta() ctx: ClientMetadata,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.isBrowserRequest(req)
      ? (req.cookies?.refresh_token as string)
      : refreshTokenDto.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    const response = await this.idmService.refreshTokens({ refreshToken }, ctx);
    return this.handleAuthResponse(req, res, response);
  }

  @ApiOperation({ summary: 'Log out from current session' })
  @ApiOkResponse({ description: 'User logged out' })
  @AllowRestricted()
  @Post('logout')
  async logout(
    @ActiveUser() user: JwtPayload,
    @ClientMeta() ctx: ClientMetadata,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.idmService.logout(user.sub, ctx.ipAddress, ctx.userAgent);

    // Clear cookies for browser clients
    if (this.isBrowserRequest(req)) {
      this.clearAuthCookies(res);
    }

    return { success: true };
  }

  @ApiOperation({ summary: 'Log out from all sessions' })
  @ApiOkResponse({ description: 'All sessions revoked' })
  @AllowRestricted()
  @Post('logout-all')
  async logoutAllDevices(
    @ActiveUser() user: JwtPayload,
    @ClientMeta() ctx: ClientMetadata,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.idmService.logoutAllDevices(
      user.sub,
      ctx.ipAddress,
      ctx.userAgent,
    );

    // Clear cookies for browser clients
    if (this.isBrowserRequest(req)) {
      this.clearAuthCookies(res);
    }

    return { success: true };
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'Active user info' })
  @AllowRestricted()
  @SkipThrottle()
  @Get('me')
  getActiveUser(@ActiveUser() user: JwtPayload) {
    return { success: true, data: { user } };
  }

  @ApiOperation({ summary: 'Get my registration codes' })
  @ApiOkResponse({ description: 'Codes assigned to active user' })
  @Get('registration/codes')
  getMyRegistrationCodes(@ActiveUser() user: JwtPayload) {
    return this.idmService.getMyRegistrationCodes(user.sub);
  }

  @ApiOperation({ summary: 'Log in with Google OAuth' })
  @ApiOkResponse({ description: 'Google login succeeded' })
  @Public()
  @Post('oauth/google')
  async googleLogin(
    @Body() googleLoginDto: GoogleLoginDto,
    @ClientMeta() ctx: ClientMetadata,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const response = await this.oauthService.googleLogin(
      googleLoginDto,
      ctx.ipAddress,
      ctx.userAgent,
    );
    return this.handleAuthResponse(req, res, response);
  }

  @ApiOperation({ summary: 'Log in with Apple OAuth' })
  @ApiOkResponse({ description: 'Apple login succeeded' })
  @Public()
  @Post('oauth/apple')
  async appleLogin(
    @Body() appleLoginDto: AppleLoginDto,
    @ClientMeta() ctx: ClientMetadata,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const response = await this.oauthService.appleLogin(
      appleLoginDto,
      ctx.ipAddress,
      ctx.userAgent,
    );
    return this.handleAuthResponse(req, res, response);
  }

  @ApiOperation({ summary: 'Verify TOTP for OAuth login' })
  @ApiOkResponse({ description: 'OAuth TOTP verified, tokens issued' })
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('oauth/verify-totp')
  async verifyOAuthTotp(
    @Body() dto: OAuthTotpVerifyDto,
    @ClientMeta() ctx: ClientMetadata,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const response = await this.idmService.verifyOAuthTotpAndLogin(
      dto.oauthSessionToken,
      dto.totpToken,
      dto.recoveryCode,
      ctx.ipAddress,
      ctx.userAgent,
    );
    return this.handleAuthResponse(req, res, response);
  }

  private isBrowserRequest(req: Request): boolean {
    const originHeader = req.headers.origin;
    if (!originHeader) {
      return false;
    }

    // Capacitor native requests originate from capacitor://localhost and must
    // receive token payloads, not cookie-only browser responses.
    return (
      originHeader.startsWith('http://') || originHeader.startsWith('https://')
    );
  }

  private setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ): void {
    const baseCookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      path: '/',
    };
    res.cookie('access_token', tokens.accessToken, {
      ...baseCookieOptions,
      maxAge: this.jwtConfiguration.accessTokenTtl * 1000,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...baseCookieOptions,
      maxAge: this.jwtConfiguration.refreshTokenTtl * 1000,
    });
  }

  private clearAuthCookies(res: Response): void {
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      path: '/',
    };
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
  }

  private handleAuthResponse(
    req: Request,
    res: Response,
    response: SuccessResponse,
  ): { ok: boolean } | SuccessResponse {
    const data = response.data as Record<string, unknown> | null;

    // When TOTP verification is pending, return the full response
    // (no tokens to set as cookies yet)
    if (data && 'totpRequired' in data) {
      return response;
    }

    const tokens = data as unknown as {
      accessToken: string;
      refreshToken: string;
    };
    if (this.isBrowserRequest(req)) {
      this.setAuthCookies(res, tokens);
      return { ok: true };
    }
    return response;
  }

  // ==========================================================================
  // Admin User Management
  // ==========================================================================

  @ApiOperation({ summary: 'Get paginated list of users' })
  @ApiOkResponse({ description: 'User list with roles' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiBearerAuth()
  @Permissions('admin:read')
  @Get('admin/users')
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.idmService.getUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
      role,
    );
  }

  @ApiOperation({ summary: 'Get single user details' })
  @ApiOkResponse({ description: 'User details with roles' })
  @ApiBearerAuth()
  @Permissions('admin:read')
  @Get('admin/users/:id')
  getUser(@Param('id') id: string) {
    return this.idmService.getUserAdmin(id);
  }

  @ApiOperation({ summary: 'Update user status (activate/deactivate)' })
  @ApiOkResponse({ description: 'User status updated' })
  @ApiBearerAuth()
  @Permissions('admin:update')
  @Patch('admin/users/:id/status')
  updateUserStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.idmService.updateUserStatus(id, isActive, user.sub);
  }

  @ApiOperation({ summary: 'Create user manually from admin' })
  @ApiOkResponse({ description: 'User created' })
  @ApiBearerAuth()
  @Permissions('admin:create')
  @Post('admin/users')
  createUserAdmin(@Body() dto: AdminCreateUserDto) {
    return this.idmService.createUserAdmin(dto);
  }

  @ApiOperation({ summary: 'Assign role to user' })
  @ApiOkResponse({ description: 'Role assigned' })
  @ApiBearerAuth()
  @Permissions('admin:create')
  @Post('admin/users/:userId/roles/:roleId')
  assignRole(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.idmService.assignRole(userId, roleId);
  }

  @ApiOperation({ summary: 'Remove role from user' })
  @ApiOkResponse({ description: 'Role removed' })
  @ApiBearerAuth()
  @Permissions('admin:delete')
  @Delete('admin/users/:userId/roles/:roleId')
  removeRole(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.idmService.removeRole(userId, roleId);
  }

  @ApiOperation({ summary: 'Assign direct permission to user' })
  @ApiOkResponse({ description: 'Permission assigned to user' })
  @ApiBearerAuth()
  @Permissions('admin:create')
  @Post('admin/users/:userId/permissions/:permissionId')
  assignPermissionToUser(
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.idmService.assignPermissionToUser(userId, permissionId);
  }

  @ApiOperation({ summary: 'Remove direct permission from user' })
  @ApiOkResponse({ description: 'Permission removed from user' })
  @ApiBearerAuth()
  @Permissions('admin:delete')
  @Delete('admin/users/:userId/permissions/:permissionId')
  removePermissionFromUser(
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.idmService.removePermissionFromUser(userId, permissionId);
  }

  // ==========================================================================
  // Admin Role Management
  // ==========================================================================

  @ApiOperation({ summary: 'Get all roles with permission counts' })
  @ApiOkResponse({ description: 'Role list' })
  @ApiBearerAuth()
  @Permissions('admin:read')
  @Get('admin/roles')
  getRoles() {
    return this.idmService.getRoles();
  }

  @ApiOperation({ summary: 'Get single role with permissions' })
  @ApiOkResponse({ description: 'Role details with permissions' })
  @ApiBearerAuth()
  @Permissions('admin:read')
  @Get('admin/roles/:id')
  getRole(@Param('id') id: string) {
    return this.idmService.getRole(id);
  }

  @ApiOperation({ summary: 'Assign permission to role' })
  @ApiOkResponse({ description: 'Permission assigned to role' })
  @ApiBearerAuth()
  @Permissions('admin:create')
  @Post('admin/roles/:roleId/permissions/:permissionId')
  assignPermissionToRole(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.idmService.assignPermissionToRole(roleId, permissionId);
  }

  @ApiOperation({ summary: 'Remove permission from role' })
  @ApiOkResponse({ description: 'Permission removed from role' })
  @ApiBearerAuth()
  @Permissions('admin:delete')
  @Delete('admin/roles/:roleId/permissions/:permissionId')
  removePermissionFromRole(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.idmService.removePermissionFromRole(roleId, permissionId);
  }

  // ==========================================================================
  // Admin Permission Management
  // ==========================================================================

  @ApiOperation({ summary: 'Get all permissions' })
  @ApiOkResponse({ description: 'Permission list' })
  @ApiBearerAuth()
  @Permissions('admin:read')
  @Get('admin/permissions')
  getPermissions() {
    return this.idmService.getPermissions();
  }

  @ApiOperation({ summary: 'Get private mode admin data' })
  @ApiOkResponse({ description: 'Private mode state and codes' })
  @ApiBearerAuth()
  @Permissions('admin:read')
  @Get('admin/private-mode')
  getPrivateModeAdmin() {
    return this.idmService.getPrivateModeAdmin();
  }

  @ApiOperation({ summary: 'Toggle private mode' })
  @ApiOkResponse({ description: 'Private mode updated' })
  @ApiBearerAuth()
  @Permissions('admin:update')
  @Patch('admin/private-mode')
  updatePrivateModeAdmin(
    @Body('enabled') enabled: boolean,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.idmService.updatePrivateMode(Boolean(enabled), user.sub);
  }

  @ApiOperation({ summary: 'Generate registration codes' })
  @ApiOkResponse({ description: 'Codes generated' })
  @ApiBearerAuth()
  @Permissions('admin:update')
  @Post('admin/private-mode/codes')
  generateRegistrationCodesAdmin(
    @Body('count') count: number,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.idmService.generateRegistrationCodesAdmin(
      Math.max(1, Number(count || 1)),
      user.sub,
    );
  }

  // ==========================================================================
  // TOTP Two-Factor Authentication
  // ==========================================================================

  @ApiOperation({ summary: 'Check TOTP 2FA status' })
  @ApiOkResponse({ description: 'TOTP status returned' })
  @ApiBearerAuth()
  @Get('totp/status')
  async getTotpStatus(@ActiveUser() user: JwtPayload) {
    const status = await this.totpService.getTotpStatus(user.sub);
    return { success: true, data: status };
  }

  @ApiOperation({ summary: 'Start TOTP setup — returns QR code and secret' })
  @ApiOkResponse({ description: 'TOTP setup data' })
  @ApiBearerAuth()
  @Post('totp/setup')
  async setupTotp(@ActiveUser() user: JwtPayload) {
    const data = await this.totpService.setupTotp(user.sub);
    return { success: true, data };
  }

  @ApiOperation({ summary: 'Verify TOTP code and enable 2FA' })
  @ApiOkResponse({ description: 'TOTP enabled with recovery codes' })
  @ApiBearerAuth()
  @Post('totp/verify')
  async verifyTotp(@Body() dto: TotpVerifyDto, @ActiveUser() user: JwtPayload) {
    const data = await this.totpService.verifyAndEnable(user.sub, dto.token);
    return { success: true, data };
  }

  @ApiOperation({ summary: 'Disable TOTP 2FA (password or TOTP code)' })
  @ApiOkResponse({ description: 'TOTP disabled' })
  @ApiBearerAuth()
  @Post('totp/disable')
  async disableTotp(
    @Body() dto: TotpDisableDto,
    @ActiveUser() user: JwtPayload,
  ) {
    if (dto.password) {
      await this.idmService.verifyUserPassword(user.sub, dto.password);
    } else if (dto.totpToken) {
      const valid = await this.totpService.verifyToken(user.sub, dto.totpToken);
      if (!valid) {
        throw new ConflictException('Invalid two-factor authentication code');
      }
    } else {
      throw new BadRequestException('Password or TOTP code required');
    }
    await this.totpService.disableTotp(user.sub);
    return { success: true, data: null };
  }
}
