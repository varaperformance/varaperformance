import { z } from 'zod';
import { RequestMetadataSchema } from './user.schema';
import { ConsentsArraySchema } from './consent.schema';

export const GoogleLoginSchema = z.object({
  idToken: z.string(),
  platform: z.enum(['web', 'ios', 'android']).default('web'),
  registrationCode: z.string().trim().min(6).max(64).optional(),
  // GDPR Art. 8: Date of birth for age verification on new registrations
  dateOfBirth: z.string().date().optional(),
  // SOC2/HIPAA: Optional consents for new user registration via OAuth
  consents: ConsentsArraySchema.optional(),
});

// SOC2: Google login with compliance metadata
export const GoogleLoginWithMetadataSchema = GoogleLoginSchema.extend(
  RequestMetadataSchema.shape,
);

export const AppleLoginSchema = z.object({
  identityToken: z.string(),
  authorizationCode: z.string().optional(),
  user: z
    .object({
      email: z.email().optional(),
      name: z
        .object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  registrationCode: z.string().trim().min(6).max(64).optional(),
  // GDPR Art. 8: Date of birth for age verification on new registrations
  dateOfBirth: z.string().date().optional(),
  // SOC2/HIPAA: Optional consents for new user registration via OAuth
  consents: ConsentsArraySchema.optional(),
});

// SOC2: Apple login with compliance metadata
export const AppleLoginWithMetadataSchema = AppleLoginSchema.extend(
  RequestMetadataSchema.shape,
);

export type GoogleLogin = z.infer<typeof GoogleLoginSchema>;
export type GoogleLoginWithMetadata = z.infer<
  typeof GoogleLoginWithMetadataSchema
>;
export const OAuthTotpVerifySchema = z.object({
  oauthSessionToken: z.string().min(1),
  totpToken: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'Must be a 6-digit code')
    .optional(),
  recoveryCode: z.string().min(1).optional(),
});

export type AppleLogin = z.infer<typeof AppleLoginSchema>;
export type AppleLoginWithMetadata = z.infer<
  typeof AppleLoginWithMetadataSchema
>;
export type OAuthTotpVerify = z.infer<typeof OAuthTotpVerifySchema>;
