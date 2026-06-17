import { z } from 'zod';
import { ConsentTypeSchema } from './consent.schema';

// =============================================================================
// Legal Document Schemas
// SOC2/HIPAA: WORM (Write Once Read Many) compliant legal document management
// =============================================================================

// Legal document ID params
export const LegalDocumentIdParamsSchema = z.object({
  id: z.string().uuid('Invalid legal document ID'),
});

// Legal document type params (for version history)
export const LegalDocumentTypeParamsSchema = z.object({
  type: ConsentTypeSchema,
});

// Query parameters for listing legal documents
export const LegalDocumentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  type: ConsentTypeSchema.optional(),
  activeOnly: z.coerce.boolean().default(false),
});

// Version type for semantic versioning
export const VersionTypeSchema = z.enum(['major', 'minor', 'patch']);

// Create a new legal document
export const CreateLegalDocumentSchema = z.object({
  type: ConsentTypeSchema,
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().min(1, 'Content is required'),
  effectiveAt: z.iso.datetime().optional(),
});

// Create a new version of an existing legal document (WORM compliant)
export const CreateLegalDocumentVersionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1, 'Content is required'),
  effectiveAt: z.iso.datetime().optional(),
  versionType: VersionTypeSchema.default('patch'),
});

// Legal document response
export const LegalDocumentResponseSchema = z.object({
  id: z.uuid(),
  type: ConsentTypeSchema,
  version: z.string(),
  title: z.string(),
  content: z.string(),
  hashValue: z.string().nullable(),
  effectiveAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// Legal document list item (without full content for performance)
export const LegalDocumentListItemSchema = z.object({
  id: z.uuid(),
  type: ConsentTypeSchema,
  version: z.string(),
  title: z.string(),
  hashValue: z.string().nullable(),
  effectiveAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// Version history item
export const LegalDocumentVersionSchema = z.object({
  id: z.uuid(),
  version: z.string(),
  title: z.string(),
  hashValue: z.string().nullable(),
  effectiveAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
});

// Integrity verification result
export const LegalDocumentIntegritySchema = z.object({
  isValid: z.boolean(),
  message: z.string(),
});

// =============================================================================
// Inferred Types
// =============================================================================
export type LegalDocumentIdParams = z.infer<typeof LegalDocumentIdParamsSchema>;
export type LegalDocumentTypeParams = z.infer<
  typeof LegalDocumentTypeParamsSchema
>;
export type LegalDocumentQuery = z.infer<typeof LegalDocumentQuerySchema>;
export type VersionType = z.infer<typeof VersionTypeSchema>;
export type CreateLegalDocument = z.infer<typeof CreateLegalDocumentSchema>;
export type CreateLegalDocumentVersion = z.infer<
  typeof CreateLegalDocumentVersionSchema
>;
export type LegalDocumentResponse = z.infer<typeof LegalDocumentResponseSchema>;
export type LegalDocumentListItem = z.infer<typeof LegalDocumentListItemSchema>;
export type LegalDocumentVersion = z.infer<typeof LegalDocumentVersionSchema>;
export type LegalDocumentIntegrity = z.infer<
  typeof LegalDocumentIntegritySchema
>;
