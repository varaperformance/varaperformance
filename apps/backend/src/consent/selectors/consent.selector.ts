/**
 * Prisma select for consent
 */
export const consentSelect = {
  id: true,
  userId: true,
  type: true,
  status: true,
  version: true,
  ipAddress: true,
  userAgent: true,
  grantedAt: true,
  revokedAt: true,
  expiresAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
};
export type ConsentSelect = typeof consentSelect;

/**
 * Prisma select for legal document - public fields (excludes content for list views)
 */
export const legalDocumentListSelect = {
  id: true,
  type: true,
  version: true,
  title: true,
  effectiveAt: true,
  expiresAt: true,
  isActive: true,
};
export type LegalDocumentListSelect = typeof legalDocumentListSelect;

/**
 * Prisma select for legal document - full (includes content)
 */
export const legalDocumentFullSelect = {
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
};
export type LegalDocumentFullSelect = typeof legalDocumentFullSelect;

/**
 * Prisma select for legal document versions (audit view)
 */
export const legalDocumentVersionSelect = {
  id: true,
  version: true,
  title: true,
  hashValue: true,
  effectiveAt: true,
  expiresAt: true,
  isActive: true,
  createdAt: true,
};
export type LegalDocumentVersionSelect = typeof legalDocumentVersionSelect;
