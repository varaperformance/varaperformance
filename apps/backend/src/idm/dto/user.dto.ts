import { createZodDto } from 'nestjs-zod';
import {
  AdminCreateUserSchema,
  RegisterUserSchema,
  RegisterUserWithConsentsSchema,
  UpdateUserSchema,
  VerifyUserSchema,
  LoginUserSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  TotpVerifySchema,
  TotpDisableSchema,
} from '@varaperformance/core';

export class RegisterUserDto extends createZodDto(RegisterUserSchema) {}

// SOC2/HIPAA: Registration with consent tracking
export class RegisterUserWithConsentsDto extends createZodDto(
  RegisterUserWithConsentsSchema,
) {}

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}

export class VerifyUserDto extends createZodDto(VerifyUserSchema) {}

export class LoginUserDto extends createZodDto(LoginUserSchema) {}

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}

export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {}

export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}

export class TotpVerifyDto extends createZodDto(TotpVerifySchema) {}

export class TotpDisableDto extends createZodDto(TotpDisableSchema) {}

export class AdminCreateUserDto extends createZodDto(AdminCreateUserSchema) {}
