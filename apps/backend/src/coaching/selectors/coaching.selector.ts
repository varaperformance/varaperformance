/**
 * Prisma select for coach list items (minimal for listings)
 */
export const coachListSelect = {
  id: true,
  userId: true,
  title: true,
  bio: true,
  location: true,
  experienceYears: true,
  certifications: true,
  certificationEvidence: true,
  specialties: true,
  isAvailable: true,
  isFeatured: true,
  isVerified: true,
  rating: true,
  reviewCount: true,
  clientCount: true,
  user: {
    select: {
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
  packages: {
    where: { isActive: true },
    orderBy: { priceInCents: 'asc' as const },
    take: 1,
    select: {
      priceInCents: true,
    },
  },
};
export type CoachListSelect = typeof coachListSelect;

/**
 * Prisma select for full coach details
 */
export const coachDetailSelect = {
  id: true,
  userId: true,
  title: true,
  bio: true,
  location: true,
  experienceYears: true,
  certifications: true,
  certificationEvidence: true,
  specialties: true,
  isAvailable: true,
  isFeatured: true,
  isVerified: true,
  rating: true,
  reviewCount: true,
  clientCount: true,
  createdAt: true,
  user: {
    select: {
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
  packages: {
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      coachId: true,
      name: true,
      description: true,
      priceInCents: true,
      billingCycle: true,
      features: true,
      isActive: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  },
};
export type CoachDetailSelect = typeof coachDetailSelect;

/**
 * Prisma select for coach packages
 */
export const coachPackageSelect = {
  id: true,
  coachId: true,
  name: true,
  description: true,
  priceInCents: true,
  billingCycle: true,
  features: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
};
export type CoachPackageSelect = typeof coachPackageSelect;

/**
 * Prisma select for coach reviews
 */
export const coachReviewSelect = {
  id: true,
  coachId: true,
  userId: true,
  rating: true,
  title: true,
  content: true,
  isVerified: true,
  createdAt: true,
  user: {
    select: {
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
};
export type CoachReviewSelect = typeof coachReviewSelect;

/**
 * Prisma select for bookings
 */
export const bookingSelect = {
  id: true,
  referenceCode: true,
  userId: true,
  coachId: true,
  packageId: true,
  status: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
};
export type BookingSelect = typeof bookingSelect;

/**
 * Prisma select for coaching contracts (full with content)
 */
export const coachingContractSelect = {
  id: true,
  coachId: true,
  version: true,
  title: true,
  content: true,
  hashValue: true,
  effectiveAt: true,
  expiresAt: true,
  isActive: true,
  cancellationPolicy: true,
  refundPolicy: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Prisma select for coaching contracts list (without content for performance)
 */
export const coachingContractListSelect = {
  id: true,
  coachId: true,
  version: true,
  title: true,
  hashValue: true,
  effectiveAt: true,
  expiresAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Prisma select for contract version history
 */
export const coachingContractVersionSelect = {
  id: true,
  version: true,
  title: true,
  hashValue: true,
  effectiveAt: true,
  expiresAt: true,
  isActive: true,
  createdAt: true,
};

/**
 * Prisma select for contract signatures
 */
export const contractSignatureSelect = {
  id: true,
  contractId: true,
  bookingId: true,
  signedAt: true,
};
export type ContractSignatureSelect = typeof contractSignatureSelect;
