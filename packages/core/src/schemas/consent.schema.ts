import { z } from 'zod';

// SOC2/HIPAA: Consent types matching Prisma enum
export const ConsentTypeSchema = z.enum([
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'MARKETING',
  'DATA_PROCESSING',
  'AI_FEATURES_CONSENT',
  'HIPAA_AUTHORIZATION',
  'DATA_SHARING',
  'COOKIES',
  'HEALTH_DATA_CONSENT',
  'SECURITY_POLICY',
  'ACCESSIBILITY_STATEMENT',
]);

export const ConsentStatusSchema = z.enum([
  'PENDING',
  'GRANTED',
  'REVOKED',
  'EXPIRED',
]);

// Individual consent grant (used in registration and re-consent)
export const ConsentGrantSchema = z.object({
  type: ConsentTypeSchema,
  version: z.string().min(1),
});

// Array of consents for registration
export const ConsentsArraySchema = z.array(ConsentGrantSchema).min(1);

// GDPR Art. 8: Minimum age for data processing consent
export const MINIMUM_REGISTRATION_AGE = 16;

// Registration with consents (SOC2/HIPAA compliant)
export const RegisterUserWithConsentsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  dateOfBirth: z.string().date(),
  registrationCode: z.string().trim().min(6).max(64).optional(),
  consents: ConsentsArraySchema,
});

// Re-consent flow (for existing users)
export const ReconsentSchema = z.object({
  consents: ConsentsArraySchema,
});

// Revoke consent
export const RevokeConsentSchema = z.object({
  type: ConsentTypeSchema,
  version: z.string().min(1),
});

// Get active legal documents query
export const GetActiveLegalDocsSchema = z.object({
  types: z.array(ConsentTypeSchema).optional(),
});

// Legal document response
export const LegalDocumentSchema = z.object({
  id: z.uuid(),
  type: ConsentTypeSchema,
  version: z.string(),
  title: z.string(),
  content: z.string(),
  effectiveAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable().optional(),
  isActive: z.boolean(),
});

// Consent record response
export const ConsentRecordSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  type: ConsentTypeSchema,
  status: ConsentStatusSchema,
  version: z.string(),
  grantedAt: z.iso.datetime().nullable().optional(),
  revokedAt: z.iso.datetime().nullable().optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
});

// Check if user needs re-consent
export const ConsentCheckResultSchema = z.object({
  needsReconsent: z.boolean(),
  outdatedConsents: z.array(
    z.object({
      type: ConsentTypeSchema,
      currentVersion: z.string(),
      userVersion: z.string(),
    }),
  ),
  missingConsents: z.array(ConsentTypeSchema),
});

// Inferred types
export type ConsentType = z.infer<typeof ConsentTypeSchema>;
export type ConsentStatus = z.infer<typeof ConsentStatusSchema>;
export type ConsentGrant = z.infer<typeof ConsentGrantSchema>;
export type ConsentsArray = z.infer<typeof ConsentsArraySchema>;
export type RegisterUserWithConsents = z.infer<
  typeof RegisterUserWithConsentsSchema
>;
export type Reconsent = z.infer<typeof ReconsentSchema>;
export type RevokeConsent = z.infer<typeof RevokeConsentSchema>;
export type GetActiveLegalDocs = z.infer<typeof GetActiveLegalDocsSchema>;
export type LegalDocument = z.infer<typeof LegalDocumentSchema>;
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;
export type ConsentCheckResult = z.infer<typeof ConsentCheckResultSchema>;

// Email preferences (GDPR Art. 21 — right to object to marketing)
export const EmailPreferencesSchema = z.object({
  marketingOptIn: z.boolean(),
});

export type EmailPreferences = z.infer<typeof EmailPreferencesSchema>;

// Required consents for registration
export const REQUIRED_REGISTRATION_CONSENTS: ConsentType[] = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'HIPAA_AUTHORIZATION',
];
