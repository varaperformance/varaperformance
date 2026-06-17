import { z } from 'zod';

// SOC2: Request metadata for compliance tracking (IP, user agent)
export const RequestMetadataSchema = z.object({
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export const RegisterUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const UpdateUserSchema = RegisterUserSchema.partial();

export const VerifyUserSchema = z.object({
  verificationCode: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'Must be a 6-digit code'),
});

export const LoginUserSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  totpToken: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'Must be a 6-digit code')
    .optional(),
  recoveryCode: z.string().min(1).optional(),
});

// SOC2: Login with compliance metadata
export const LoginUserWithMetadataSchema = LoginUserSchema.extend(
  RequestMetadataSchema.shape,
);

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// Password reset flow schemas
export const ForgotPasswordSchema = z.object({
  email: z.email(),
});

export const ResetPasswordSchema = z.object({
  email: z.email(),
  resetCode: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'Must be a 6-digit code'),
  newPassword: z.string().min(8),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

// SOC2: Password history check (prevent reuse)
export const PasswordHistorySchema = z.object({
  id: z.uuid().optional(),
  userId: z.uuid(),
  passwordHash: z.string(),
  createdAt: z.iso.datetime().optional(),
});

// TOTP Two-Factor Authentication
export const TotpVerifySchema = z.object({
  token: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'Must be a 6-digit code'),
});

export const TotpDisableSchema = z.object({
  password: z.string().min(1).optional(),
  totpToken: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'Must be a 6-digit code')
    .optional(),
});

export const AdminCreateUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  displayName: z.string().trim().min(2).max(50).optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

// Inferred types
export type RequestMetadata = z.infer<typeof RequestMetadataSchema>;
export type RegisterUser = z.infer<typeof RegisterUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type VerifyUser = z.infer<typeof VerifyUserSchema>;
export type LoginUser = z.infer<typeof LoginUserSchema>;
export type LoginUserWithMetadata = z.infer<typeof LoginUserWithMetadataSchema>;
export type RefreshToken = z.infer<typeof RefreshTokenSchema>;
export type ForgotPassword = z.infer<typeof ForgotPasswordSchema>;
export type ResetPassword = z.infer<typeof ResetPasswordSchema>;
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
export type PasswordHistory = z.infer<typeof PasswordHistorySchema>;
export type TotpVerify = z.infer<typeof TotpVerifySchema>;
export type TotpDisable = z.infer<typeof TotpDisableSchema>;
export type AdminCreateUser = z.infer<typeof AdminCreateUserSchema>;
