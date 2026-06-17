/**
 * Socials database record (matches Prisma model)
 */
export interface SocialsRecord {
  id: string;
  profileId: string;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  threads: string | null;
  linkedin: string | null;
  github: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Socials response returned from API
 */
export interface SocialsResponse {
  id: string;
  profileId: string;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  threads: string | null;
  linkedin: string | null;
  github: string | null;
  createdAt: string;
  updatedAt: string;
}
