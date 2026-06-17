import { z } from 'zod';

// Enums
export const ChallengeStatusSchema = z.enum([
  'DRAFT',
  'UPCOMING',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
]);
export type ChallengeStatus = z.infer<typeof ChallengeStatusSchema>;

export const ChallengeTypeSchema = z.enum([
  'WORKOUT_COUNT',
  'STREAK_DAYS',
  'WEIGHT_LOSS',
  'STEPS_TOTAL',
  'PR_COUNT',
  'CUSTOM',
]);
export type ChallengeType = z.infer<typeof ChallengeTypeSchema>;

export const ChallengeVisibilitySchema = z.enum([
  'PUBLIC',
  'INVITE',
  'PRIVATE',
]);
export type ChallengeVisibility = z.infer<typeof ChallengeVisibilitySchema>;

export const ChallengeParticipantStatusSchema = z.enum([
  'REGISTERED',
  'ACTIVE',
  'COMPLETED',
  'WITHDRAWN',
]);
export type ChallengeParticipantStatus = z.infer<
  typeof ChallengeParticipantStatusSchema
>;

// Create challenge
export const CreateChallengeSchema = z
  .object({
    title: z.string().min(3).max(150),
    description: z.string().min(10).max(5000),
    type: ChallengeTypeSchema,
    visibility: ChallengeVisibilitySchema.optional().default('PUBLIC'),
    goalValue: z.number().int().positive(),
    goalUnit: z.string().min(1).max(50),
    startDate: z.iso.datetime(),
    endDate: z.iso.datetime(),
    maxParticipants: z.number().int().positive().optional(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });
export type CreateChallenge = z.infer<typeof CreateChallengeSchema>;

// Update challenge
export const UpdateChallengeSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  description: z.string().min(10).max(5000).optional(),
  visibility: ChallengeVisibilitySchema.optional(),
  goalValue: z.number().int().positive().optional(),
  goalUnit: z.string().min(1).max(50).optional(),
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
  maxParticipants: z.number().int().positive().nullable().optional(),
  status: ChallengeStatusSchema.optional(),
});
export type UpdateChallenge = z.infer<typeof UpdateChallengeSchema>;

// Admin update (can set official, force status)
export const AdminUpdateChallengeSchema = UpdateChallengeSchema.extend({
  isOfficial: z.boolean().optional(),
});
export type AdminUpdateChallenge = z.infer<typeof AdminUpdateChallengeSchema>;

// Update progress
export const UpdateChallengeProgressSchema = z.object({
  progress: z.number().int().min(0),
});
export type UpdateChallengeProgress = z.infer<
  typeof UpdateChallengeProgressSchema
>;

// Query params
export const ChallengeQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  status: ChallengeStatusSchema.optional(),
  type: ChallengeTypeSchema.optional(),
  isOfficial: z.coerce.boolean().optional(),
});
export type ChallengeQuery = z.infer<typeof ChallengeQuerySchema>;

// Response types
export interface ChallengeCreatorResponse {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface ChallengeResponse {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  type: ChallengeType;
  status: ChallengeStatus;
  visibility: ChallengeVisibility;
  isOfficial: boolean;
  goalValue: number;
  goalUnit: string;
  startDate: string;
  endDate: string;
  maxParticipants: number | null;
  participantCount: number;
  creator: ChallengeCreatorResponse;
  isParticipant?: boolean;
  myProgress?: number;
  createdAt: string;
}

export interface ChallengeParticipantResponse {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: ChallengeParticipantStatus;
  progress: number;
  completedAt: string | null;
  joinedAt: string;
}

export interface ChallengeLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  progress: number;
  completedAt: string | null;
}
