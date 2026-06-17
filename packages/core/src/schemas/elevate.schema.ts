import { z } from 'zod';

// Enums
export const ElevatePostTypeSchema = z.enum([
  'TEXT',
  'WORKOUT',
  'MILESTONE',
  'PHOTO',
  'PR',
  'CHECK_IN',
  'ACHIEVEMENT',
  'CHALLENGE',
]);
export type ElevatePostType = z.infer<typeof ElevatePostTypeSchema>;

export const MilestoneTypeSchema = z.enum([
  'STREAK',
  'WORKOUT_COUNT',
  'WEIGHT_GOAL',
  'PR_COUNT',
  'CUSTOM',
]);
export type MilestoneType = z.infer<typeof MilestoneTypeSchema>;

export const PostPrivacySchema = z.enum(['PRIVATE', 'FRIENDS', 'PUBLIC']);
export type PostPrivacy = z.infer<typeof PostPrivacySchema>;

// Check-in data schema
export const ElevateCheckInDataSchema = z.object({
  gymId: z.uuid().optional(),
  gymName: z.string().min(1).max(200),
  timestamp: z.iso.datetime().optional(), // Check-in time
});
export type ElevateCheckInData = z.infer<typeof ElevateCheckInDataSchema>;

// Create post input
export const CreateElevatePostSchema = z.object({
  type: ElevatePostTypeSchema,
  content: z.string().min(1).max(2000),
  images: z.array(z.string().min(1)).max(10).optional().default([]),
  privacy: PostPrivacySchema.optional().default('PUBLIC'),

  // Optional workout link
  workoutSessionId: z.uuid().optional(),

  // Optional milestone data
  milestoneType: MilestoneTypeSchema.optional(),
  milestoneValue: z.number().int().positive().optional(),
  milestoneLabel: z.string().max(100).optional(),

  // Optional PR link
  personalRecordId: z.uuid().optional(),

  // Optional check-in data
  checkInData: ElevateCheckInDataSchema.optional(),
});
export type CreateElevatePost = z.infer<typeof CreateElevatePostSchema>;

// Update post input
export const UpdateElevatePostSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  images: z.array(z.url()).max(10).optional(),
  privacy: PostPrivacySchema.optional(),
});
export type UpdateElevatePost = z.infer<typeof UpdateElevatePostSchema>;

// Create comment input
export const CreateElevateCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.uuid().optional(), // For replies
});
export type CreateElevateComment = z.infer<typeof CreateElevateCommentSchema>;

// Update comment input
export const UpdateElevateCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});
export type UpdateElevateComment = z.infer<typeof UpdateElevateCommentSchema>;

// Query params for feed
export const ElevateFeedQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  type: ElevatePostTypeSchema.optional(),
  userId: z.uuid().optional(), // Filter by user
});
export type ElevateFeedQuery = z.infer<typeof ElevateFeedQuerySchema>;

// Post ID param
export const ElevatePostIdSchema = z.object({
  id: z.uuid(),
});
export type ElevatePostId = z.infer<typeof ElevatePostIdSchema>;

// Comment ID param
export const ElevateCommentIdSchema = z.object({
  commentId: z.uuid(),
});
export type ElevateCommentId = z.infer<typeof ElevateCommentIdSchema>;

// Author info (for responses)
export const ElevateAuthorSchema = z.object({
  id: z.uuid(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
});
export type ElevateAuthor = z.infer<typeof ElevateAuthorSchema>;

// Workout summary (for workout posts)
export const ElevateWorkoutSummarySchema = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  performed: z.iso.datetime(),
  exerciseCount: z.number().int(),
  totalSets: z.number().int(),
  totalVolume: z.number().nullable(), // kg*reps for strength
  totalDistance: z.number().nullable(), // meters for cardio
  duration: z.number().nullable(), // seconds for timed exercises
});
export type ElevateWorkoutSummary = z.infer<typeof ElevateWorkoutSummarySchema>;

// Milestone data (for milestone posts)
export const ElevateMilestoneDataSchema = z.object({
  type: MilestoneTypeSchema,
  value: z.number(),
  label: z.string(),
});
export type ElevateMilestoneData = z.infer<typeof ElevateMilestoneDataSchema>;

// PR data (for PR posts)
export const ElevatePRDataSchema = z.object({
  id: z.uuid(),
  exerciseName: z.string(),
  type: z.string(),
  value: z.number(),
  reps: z.number().nullable(),
  weight: z.number().nullable(),
});
export type ElevatePRData = z.infer<typeof ElevatePRDataSchema>;

// Achievement data (for achievement posts)
export const ElevateAchievementDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  slug: z.string(),
});
export type ElevateAchievementData = z.infer<
  typeof ElevateAchievementDataSchema
>;

// Challenge data (for challenge posts)
export const ElevateChallengeDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.string(),
  goalValue: z.number(),
  goalUnit: z.string(),
  participantCount: z.number(),
  isOfficial: z.boolean(),
  status: z.string(),
});
export type ElevateChallengeData = z.infer<typeof ElevateChallengeDataSchema>;

// Comment response (base, without replies to avoid recursive type issues)
export const ElevateCommentBaseSchema = z.object({
  id: z.uuid(),
  content: z.string(),
  author: ElevateAuthorSchema,
  parentId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ElevateCommentBase = z.infer<typeof ElevateCommentBaseSchema>;

// Comment response with optional replies (one level deep)
export const ElevateCommentResponseSchema = ElevateCommentBaseSchema.extend({
  replies: z.array(ElevateCommentBaseSchema).optional(),
});
export type ElevateCommentResponse = z.infer<
  typeof ElevateCommentResponseSchema
>;

// Full post response
export const ElevatePostResponseSchema = z.object({
  id: z.uuid(),
  type: ElevatePostTypeSchema,
  content: z.string(),
  images: z.array(z.string()),
  privacy: PostPrivacySchema,
  author: ElevateAuthorSchema,

  // Engagement
  highFiveCount: z.number().int(),
  commentCount: z.number().int(),
  hasHighFived: z.boolean(), // Current user has high-fived
  hasSaved: z.boolean(), // Current user has saved/bookmarked

  // Moderation
  moderationLocked: z.boolean(), // Post locked due to reports

  // Optional embedded data
  workout: ElevateWorkoutSummarySchema.nullable(),
  milestone: ElevateMilestoneDataSchema.nullable(),
  personalRecord: ElevatePRDataSchema.nullable(),
  checkIn: ElevateCheckInDataSchema.nullable(),
  achievement: ElevateAchievementDataSchema.nullable(),
  challenge: ElevateChallengeDataSchema.nullable(),

  // Recent comments preview
  recentComments: z.array(ElevateCommentResponseSchema).optional(),

  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ElevatePostResponse = z.infer<typeof ElevatePostResponseSchema>;

// Feed pagination
export const ElevateFeedPaginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
  hasMore: z.boolean(),
});
export type ElevateFeedPagination = z.infer<typeof ElevateFeedPaginationSchema>;

// Feed response (paginated)
export const ElevateFeedResponseSchema = z.object({
  posts: z.array(ElevatePostResponseSchema),
  pagination: ElevateFeedPaginationSchema,
});
export type ElevateFeedResponse = z.infer<typeof ElevateFeedResponseSchema>;

// ============ Report Schemas ============

// Report reasons enum
export const ElevateReportReasonSchema = z.enum([
  'SPAM',
  'HARASSMENT',
  'HATE_SPEECH',
  'VIOLENCE',
  'NUDITY',
  'FALSE_INFO',
  'SCAM',
  'OTHER',
]);
export type ElevateReportReason = z.infer<typeof ElevateReportReasonSchema>;

// Report status enum
export const ElevateReportStatusSchema = z.enum([
  'PENDING',
  'REVIEWED',
  'RESOLVED',
  'DISMISSED',
]);
export type ElevateReportStatus = z.infer<typeof ElevateReportStatusSchema>;

// Create report input
export const CreateElevateReportSchema = z.object({
  reason: ElevateReportReasonSchema,
  details: z.string().max(1000).optional(),
});
export type CreateElevateReport = z.infer<typeof CreateElevateReportSchema>;

// Update report status (for moderators)
export const UpdateElevateReportSchema = z.object({
  status: ElevateReportStatusSchema,
  reviewNote: z.string().max(1000).optional(),
});
export type UpdateElevateReport = z.infer<typeof UpdateElevateReportSchema>;

// Report response (for users who submitted)
export const ElevateReportResponseSchema = z.object({
  id: z.uuid(),
  postId: z.uuid(),
  reason: ElevateReportReasonSchema,
  details: z.string().nullable(),
  status: ElevateReportStatusSchema,
  createdAt: z.iso.datetime(),
});
export type ElevateReportResponse = z.infer<typeof ElevateReportResponseSchema>;

// Admin report response (includes post and reporter info)
export const AdminElevateReportResponseSchema = z.object({
  id: z.uuid(),
  postId: z.uuid(),
  post: z.object({
    id: z.uuid(),
    type: ElevatePostTypeSchema,
    content: z.string(),
    images: z.array(z.string()),
    author: ElevateAuthorSchema,
    createdAt: z.iso.datetime(),
  }),
  reporter: ElevateAuthorSchema,
  reason: ElevateReportReasonSchema,
  details: z.string().nullable(),
  status: ElevateReportStatusSchema,
  createdAt: z.iso.datetime(),
  reviewedAt: z.iso.datetime().nullable(),
  reviewedBy: ElevateAuthorSchema.nullable(),
  reviewNote: z.string().nullable(),
});
export type AdminElevateReportResponse = z.infer<
  typeof AdminElevateReportResponseSchema
>;

// Admin reports query params
export const AdminElevateReportsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: ElevateReportStatusSchema.optional(),
  reason: ElevateReportReasonSchema.optional(),
});
export type AdminElevateReportsQuery = z.infer<
  typeof AdminElevateReportsQuerySchema
>;

// Admin reports list response
export const AdminElevateReportsResponseSchema = z.object({
  reports: z.array(AdminElevateReportResponseSchema),
  pagination: ElevateFeedPaginationSchema,
});
export type AdminElevateReportsResponse = z.infer<
  typeof AdminElevateReportsResponseSchema
>;

// ============ Story Schemas ============

// Story media type
export const StoryMediaTypeSchema = z.enum(['IMAGE', 'VIDEO']);
export type StoryMediaType = z.infer<typeof StoryMediaTypeSchema>;

// Create story input
export const CreateElevateStorySchema = z.object({
  mediaType: StoryMediaTypeSchema,
  mediaUrl: z.string().min(1),
  thumbnail: z.string().optional(),
  duration: z.number().int().positive().optional(), // For videos
  caption: z.string().max(500).optional(),
});
export type CreateElevateStory = z.infer<typeof CreateElevateStorySchema>;

// Story author (simplified user info)
export const StoryAuthorSchema = z.object({
  id: z.uuid(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});
export type StoryAuthor = z.infer<typeof StoryAuthorSchema>;

// Story response
export const ElevateStoryResponseSchema = z.object({
  id: z.uuid(),
  author: StoryAuthorSchema,
  mediaType: StoryMediaTypeSchema,
  mediaUrl: z.string(),
  thumbnail: z.string().nullable(),
  duration: z.number().nullable(),
  caption: z.string().nullable(),
  viewCount: z.number().int(),
  hasViewed: z.boolean(), // Current user has viewed
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});
export type ElevateStoryResponse = z.infer<typeof ElevateStoryResponseSchema>;

// Story group (all stories from one user)
export const ElevateStoryGroupSchema = z.object({
  user: StoryAuthorSchema,
  stories: z.array(ElevateStoryResponseSchema),
  hasUnviewed: z.boolean(), // Has stories the current user hasn't viewed
  latestAt: z.iso.datetime(), // Most recent story timestamp
});
export type ElevateStoryGroup = z.infer<typeof ElevateStoryGroupSchema>;

// Stories feed response
export const ElevateStoriesFeedResponseSchema = z.object({
  groups: z.array(ElevateStoryGroupSchema),
});
export type ElevateStoriesFeedResponse = z.infer<
  typeof ElevateStoriesFeedResponseSchema
>;

// ============ Gym Partners ============

// Gym partner status enum
export const GymPartnerStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'BLOCKED',
]);
export type GymPartnerStatus = z.infer<typeof GymPartnerStatusSchema>;

// Send gym partner request
export const SendGymPartnerRequestSchema = z.object({
  receiverId: z.uuid(),
});
export type SendGymPartnerRequest = z.infer<typeof SendGymPartnerRequestSchema>;

// Respond to gym partner request
export const RespondGymPartnerRequestSchema = z.object({
  action: z.enum(['ACCEPT', 'REJECT', 'BLOCK']),
});
export type RespondGymPartnerRequest = z.infer<
  typeof RespondGymPartnerRequestSchema
>;

// Gym partner user info (for responses)
export const GymPartnerUserSchema = z.object({
  id: z.uuid(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  gym: z
    .object({
      id: z.uuid(),
      name: z.string(),
    })
    .nullable(), // Primary gym if set
});
export type GymPartnerUser = z.infer<typeof GymPartnerUserSchema>;

// Gym partner response
export const GymPartnerResponseSchema = z.object({
  id: z.uuid(),
  user: GymPartnerUserSchema,
  status: GymPartnerStatusSchema,
  isRequester: z.boolean(), // Did current user send the request
  respondedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type GymPartnerResponse = z.infer<typeof GymPartnerResponseSchema>;

// Gym partner suggestions (people from same gym)
export const GymPartnerSuggestionSchema = z.object({
  user: GymPartnerUserSchema,
  sharedGyms: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
    }),
  ),
  mutualPartners: z.number().int(), // Count of shared gym partners
});
export type GymPartnerSuggestion = z.infer<typeof GymPartnerSuggestionSchema>;

// Query params for gym partners list
export const GymPartnersQuerySchema = z.object({
  status: GymPartnerStatusSchema.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
export type GymPartnersQuery = z.infer<typeof GymPartnersQuerySchema>;

// Search users query (for finding partners outside gym)
export const SearchUsersQuerySchema = z.object({
  query: z.string().min(2).max(100), // Search term (displayName or email)
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
export type SearchUsersQuery = z.infer<typeof SearchUsersQuerySchema>;

// Search user result
export const SearchUserResultSchema = z.object({
  user: GymPartnerUserSchema,
  isPartner: z.boolean(), // Already a gym partner
  hasPendingRequest: z.boolean(), // Has pending request from/to
  mutualPartners: z.number().int(), // Count of shared gym partners
});
export type SearchUserResult = z.infer<typeof SearchUserResultSchema>;

// Feed mode enum
export const ElevateFeedModeSchema = z.enum([
  'PARTNERS',
  'PUBLIC',
  'MY_GYM',
  'MOMENTUM',
]);
export type ElevateFeedMode = z.infer<typeof ElevateFeedModeSchema>;

// Extended feed query with mode
export const ElevateFeedQueryExtendedSchema = ElevateFeedQuerySchema.extend({
  mode: ElevateFeedModeSchema.optional().default('PARTNERS'),
});
export type ElevateFeedQueryExtended = z.infer<
  typeof ElevateFeedQueryExtendedSchema
>;
