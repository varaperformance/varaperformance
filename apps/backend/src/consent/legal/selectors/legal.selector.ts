import { Prisma } from '@generated/prisma';

/**
 * Legal Document Selectors
 * SOC2/HIPAA: Consistent field selection for legal documents
 */

// Full document (includes content)
export const legalDocumentSelector = {
  id: true,
  type: true,
  version: true,
  title: true,
  content: true,
  hashValue: true,
  effectiveAt: true,
  expiresAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LegalDocumentSelect;

// List item (excludes content for performance)
export const legalDocumentListSelector = {
  id: true,
  type: true,
  version: true,
  title: true,
  hashValue: true,
  effectiveAt: true,
  expiresAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LegalDocumentSelect;

// Version history (minimal fields)
export const legalDocumentVersionSelector = {
  id: true,
  version: true,
  title: true,
  hashValue: true,
  effectiveAt: true,
  expiresAt: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.LegalDocumentSelect;

export type LegalDocumentFull = Prisma.LegalDocumentGetPayload<{
  select: typeof legalDocumentSelector;
}>;

export type LegalDocumentListItem = Prisma.LegalDocumentGetPayload<{
  select: typeof legalDocumentListSelector;
}>;

export type LegalDocumentVersionItem = Prisma.LegalDocumentGetPayload<{
  select: typeof legalDocumentVersionSelector;
}>;
