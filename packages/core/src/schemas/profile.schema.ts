import { z } from 'zod';

const SOCIAL_USERNAME_REGEX = /^[a-zA-Z0-9_.-]+$/;

function normalizeSocialUsername(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  let normalized = trimmed;
  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) || /^[a-z0-9.-]+\.[a-z]{2,}\//i.test(trimmed);

  if (looksLikeUrl) {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    try {
      const parsed = new URL(withProtocol);
      const hostname = parsed.hostname.toLowerCase();
      const pathParts = parsed.pathname.split('/').filter(Boolean);

      if (hostname.endsWith('linkedin.com')) {
        const inIndex = pathParts.findIndex(
          (part) => part.toLowerCase() === 'in',
        );
        normalized =
          inIndex >= 0
            ? (pathParts[inIndex + 1] ?? '')
            : (pathParts[pathParts.length - 1] ?? '');
      } else {
        normalized = pathParts[pathParts.length - 1] ?? '';
      }
    } catch {
      normalized = trimmed;
    }
  }

  return normalized
    .replace(/^@+/, '')
    .replace(/[/?#].*$/, '')
    .trim();
}

// Social media username validation (stores handles, accepts common profile URL inputs)
const SocialUsernameSchema = z
  .unknown()
  .transform((input) => {
    if (typeof input !== 'string') return input;
    const normalized = normalizeSocialUsername(input);
    return normalized || undefined;
  })
  .pipe(
    z
      .string()
      .max(50)
      .regex(SOCIAL_USERNAME_REGEX, 'Invalid username format')
      .optional(),
  );

// Socials schemas - stores usernames, not full URLs
export const CreateSocialsSchema = z.object({
  twitter: SocialUsernameSchema,
  facebook: SocialUsernameSchema,
  instagram: SocialUsernameSchema,
  threads: SocialUsernameSchema,
  linkedin: SocialUsernameSchema,
  github: SocialUsernameSchema,
});

export const UpdateSocialsSchema = CreateSocialsSchema.partial();

export const SocialsParamsSchema = z.object({
  id: z.uuid(),
});

// Unit preference enum
export const UnitPreferenceSchema = z.enum(['imperial', 'metric']);
export const ThemePreferenceSchema = z.enum(['light', 'dark', 'system']);

export const ProfileAddressInputSchema = z.object({
  label: z.string().min(1).max(60).optional(),
  recipientName: z.string().min(1).max(120),
  phone: z
    .unknown()
    .transform((value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    )
    .pipe(z.string().trim().min(7).max(30).optional()),
  line1: z.string().min(1).max(120),
  line2: z.string().max(120).optional(),
  city: z.string().min(1).max(80),
  state: z.string().max(80).optional(),
  postalCode: z.string().min(2).max(20),
  country: z
    .string()
    .min(2)
    .max(2)
    .transform((value) => value.toUpperCase()),
  isDefault: z.boolean().optional(),
});

export const ProfileAddressIdParamsSchema = z.object({
  addressId: z.uuid(),
});

export const CreateProfileAddressSchema = ProfileAddressInputSchema;
export const UpdateProfileAddressSchema = ProfileAddressInputSchema.partial();

// Display name (Instagram-style username) validation
// Rules: letters, numbers, underscores, periods. No consecutive periods. Cannot start/end with period.
export const DisplayNameSchema = z
  .string()
  .min(3, 'Display name must be at least 3 characters')
  .max(30, 'Display name must be at most 30 characters')
  .regex(
    /^[a-zA-Z0-9_](?:[a-zA-Z0-9_.]*[a-zA-Z0-9_])?$|^[a-zA-Z0-9_]$/,
    'Display name can only contain letters, numbers, underscores, and periods. Cannot start or end with a period.',
  )
  .refine((val) => !val.includes('..'), {
    message: 'Display name cannot contain consecutive periods',
  })
  .transform((val) => val.toLowerCase());

// IANA timezone validation (e.g., 'America/New_York')
const TimezoneSchema = z.string().max(50).optional();

// Partial profile schema - for OAuth provisioning (all optional)
export const PartialProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  displayName: DisplayNameSchema.optional(),
  isProfilePublic: z.boolean().optional(),
  dateOfBirth: z.string().date().optional(),
  bio: z.string().max(255).optional(),
  unit: UnitPreferenceSchema.optional(),
  theme: ThemePreferenceSchema.optional(),
  height: z.number().min(50).max(300).optional(), // centimeters (50cm-300cm)
  timezone: TimezoneSchema,
  allowedAI: z.boolean().optional(),
  socials: CreateSocialsSchema.optional(),
});

// Complete profile schema - for profile wizard completion (required fields)
export const CreateProfileSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  displayName: DisplayNameSchema,
  isProfilePublic: z.boolean().optional(),
  dateOfBirth: z.string().date(),
  bio: z.string().max(255).optional(),
  unit: UnitPreferenceSchema.optional(),
  theme: ThemePreferenceSchema.optional(),
  height: z.number().min(50).max(300).optional(), // centimeters
  timezone: TimezoneSchema,
  allowedAI: z.boolean().optional(),
  socials: CreateSocialsSchema.optional(),
});

export const UpdateProfileSchema = CreateProfileSchema.partial();

// Types
export type PartialProfile = z.infer<typeof PartialProfileSchema>;
export type CreateProfile = z.infer<typeof CreateProfileSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
export type CreateSocials = z.infer<typeof CreateSocialsSchema>;
export type UpdateSocials = z.infer<typeof UpdateSocialsSchema>;
export type SocialsParams = z.infer<typeof SocialsParamsSchema>;
export type ProfileAddressInput = z.infer<typeof ProfileAddressInputSchema>;
export type ProfileAddressIdParams = z.infer<
  typeof ProfileAddressIdParamsSchema
>;
export type CreateProfileAddress = z.infer<typeof CreateProfileAddressSchema>;
export type UpdateProfileAddress = z.infer<typeof UpdateProfileAddressSchema>;
