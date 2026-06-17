/**
 * Prisma select for profile - PUBLIC fields only
 * Excludes encryption fields (eProfile, profileIv, profileAuthTag, profileWrappedKey)
 */
export const profilePublicSelect = {
  id: true,
  userId: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  allowedAI: true,
  theme: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
};
export type ProfilePublicSelect = typeof profilePublicSelect;

/**
 * Prisma select for profile - includes encryption fields for decryption
 * Use this when you need to decrypt PII (firstName, lastName, dateOfBirth, etc.)
 */
export const profileWithPiiSelect = {
  id: true,
  userId: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  allowedAI: true,
  theme: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  // Encryption fields for PII decryption
  eProfile: true,
  profileIv: true,
  profileAuthTag: true,
  profileWrappedKey: true,
};
export type ProfileWithPiiSelect = typeof profileWithPiiSelect;

// Socials selector
export const socialsSelect = {
  id: true,
  twitter: true,
  facebook: true,
  instagram: true,
  threads: true,
  linkedin: true,
  github: true,
  createdAt: true,
  updatedAt: true,
};
export type SocialsSelect = typeof socialsSelect;

/**
 * Prisma select for profile with socials
 */
export const profileWithSocialsSelect = {
  ...profilePublicSelect,
  socials: { select: socialsSelect },
};
export type ProfileWithSocialsSelect = typeof profileWithSocialsSelect;

// Gym location selector for profile gyms
export const profileGymLocationSelect = {
  address: true,
  city: true,
  state: true,
  country: true,
};
export type ProfileGymLocationSelect = typeof profileGymLocationSelect;

// Gym selector for profile
export const profileGymSelect = {
  id: true,
  mapboxId: true,
  name: true,
  locations: {
    select: profileGymLocationSelect,
    take: 1,
  },
};
export type ProfileGymSelect = typeof profileGymSelect;

/**
 * Prisma select for profile with gyms (for profile/gyms endpoint)
 */
export const profileWithGymsSelect = {
  ...profilePublicSelect,
  gyms: { select: profileGymSelect },
};
export type ProfileWithGymsSelect = typeof profileWithGymsSelect;
