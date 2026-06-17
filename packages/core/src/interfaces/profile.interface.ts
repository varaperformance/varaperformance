export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Profile database record (matches Prisma model)
 */
export interface ProfileRecord {
  id: string;
  userId: string;
  displayName: string | null;
  isProfilePublic: boolean;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  allowedAI: boolean;
  timezone: string | null;
  theme: ThemePreference | null;
  eProfile: Uint8Array | null;
  profileIv: Uint8Array | null;
  profileAuthTag: Uint8Array | null;
  profileWrappedKey: Uint8Array | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Unit preference for measurements
 */
export type UnitPreference = 'imperial' | 'metric';

export interface ProfileAddress {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Decrypted profile PII data (stored encrypted in eProfile)
 */
export interface ProfilePii {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  unit?: UnitPreference;
  height?: number; // stored in centimeters
}

/**
 * Profile response returned from API
 */
export interface ProfileResponse {
  id: string;
  userId: string;
  displayName: string | null;
  isProfilePublic: boolean;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  allowedAI: boolean;
  timezone: string | null;
  theme: ThemePreference | null;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  unit: UnitPreference | null;
  height: number | null; // in centimeters
  addresses: ProfileAddress[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Minimal profile response - for auth checks and header display
 * Does not include PII - follows data minimization principle (SOC2, HIPAA)
 */
export interface MinimalProfileResponse {
  userId: string;
  displayName: string | null;
  isProfilePublic: boolean;
  avatarUrl: string | null;
  coverUrl: string | null;
  allowedAI: boolean;
  completedAt: string | null;
  timezone: string | null; // Not PII, used for date display formatting
  unit: 'imperial' | 'metric' | null; // User's unit preference
  theme: ThemePreference | null; // Display theme preference
}

export interface PublicProfileResponse {
  userId: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  isProfilePublic: boolean;
  socials: {
    twitter: string | null;
    facebook: string | null;
    instagram: string | null;
    threads: string | null;
    linkedin: string | null;
    github: string | null;
  };
  gyms: Array<{
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    country: string | null;
  }>;
  stats: {
    workouts: number;
    gymPartners: number;
    prsThisYear: number;
  };
}
