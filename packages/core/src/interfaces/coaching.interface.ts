/**
 * Coaching Interfaces
 * Coach profiles, packages, bookings, and reviews
 */

// Import shared types from schemas
import type {
  CoachSpecialty,
  CoachDesignation,
} from '../schemas/coaching.schema';
import type {
  BillingCycle,
  BookingStatus,
  SubscriptionStatus,
  CoachPackageResponse,
  BookingResponse,
} from '../schemas/payment.schema';

// Re-export the imported types for convenience
export type {
  CoachSpecialty,
  CoachDesignation,
  BillingCycle,
  BookingStatus,
  SubscriptionStatus,
};
export type { CoachPackageResponse, BookingResponse };

/**
 * Coach profile info for the user (connected to their profile)
 */
export interface CoachProfileInfo {
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * Coach response (public listing)
 */
export interface CoachResponse {
  id: string;
  slug: string; // Profile displayName for URL routing
  userId: string;
  title: string;
  bio: string;
  location: string;
  experienceYears: number;
  certifications: string[];
  designation: CoachDesignation;
  influencerSocialLinks: string[];
  specialties: CoachSpecialty[];
  isAvailable: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  clientCount: number;
  createdAt: string;
  // Related data
  profile: CoachProfileInfo | null;
  packages: CoachPackageResponse[];
}

/**
 * Coach list item (minimal for listings)
 */
export interface CoachListItem {
  id: string;
  slug: string; // Profile displayName for URL routing
  userId: string;
  title: string;
  bio: string;
  location: string;
  experienceYears: number;
  certifications: string[];
  designation: CoachDesignation;
  influencerSocialLinks: string[];
  specialties: CoachSpecialty[];
  isAvailable: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  clientCount: number;
  profile: CoachProfileInfo | null;
  // Minimal package info for listings
  startingPrice: number | null;
}

/**
 * Coach list response with pagination
 */
export interface CoachListData {
  items: CoachListItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Coach review response
 */
export interface CoachReviewResponse {
  id: string;
  coachId: string;
  rating: number;
  title: string | null;
  content: string | null;
  isVerified: boolean;
  createdAt: string;
  // User info (from profile)
  user: {
    displayName: string | null;
    avatarUrl: string | null;
  };
}

/**
 * Coach reviews list
 */
export interface CoachReviewsData {
  items: CoachReviewResponse[];
  total: number;
  averageRating: number;
}

/**
 * Coach filters for queries
 */
export interface CoachFilters {
  specialty?: CoachSpecialty;
  designation?: CoachDesignation;
  available?: boolean;
  featured?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'rating' | 'reviewCount' | 'clientCount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Coaching contract response
 */
export interface CoachingContractResponse {
  id: string;
  coachId: string;
  version: string;
  title: string;
  content: string;
  hashValue: string | null;
  effectiveAt: string;
  expiresAt: string | null;
  cancellationPolicy: string | null;
  refundPolicy: string | null;
}

/**
 * Contract signature response
 */
export interface ContractSignatureResponse {
  id: string;
  contractId: string;
  bookingId: string;
  signedAt: string;
  signature: string;
}
