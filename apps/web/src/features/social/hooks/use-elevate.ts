import { useCallback, useEffect, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import api from '@/lib/api';
import {
  connectElevateSocket,
  disconnectElevateSocket,
} from '@/lib/elevate-socket';
import type {
  SuccessResponse,
  ElevateFeedResponse,
  ElevatePostResponse,
  CreateElevatePost,
  UpdateElevatePost,
  CreateElevateComment,
  UpdateElevateComment,
  ElevateFeedQuery,
  ElevateCommentResponse,
  CreateElevateReport,
  ElevateReportResponse,
  CreateElevateStory,
  ElevateStoryResponse,
  ElevateStoriesFeedResponse,
  StoryMediaType,
  SendGymPartnerRequest,
  GymPartnersQuery,
  GymPartnerResponse,
  GymPartnerSuggestion,
  ElevateFeedMode,
  ElevateFeedQueryExtended,
  SearchUserResult,
  GymStatsResponse,
  ElevateFeedRefreshEvent,
} from '@varaperformance/core';

// Re-export types for convenience
export type {
  ElevatePostResponse,
  ElevateFeedResponse,
  CreateElevatePost,
  UpdateElevatePost,
  CreateElevateComment,
  UpdateElevateComment,
  ElevateFeedQuery,
  ElevateCommentResponse,
  ElevateAuthor,
  ElevateWorkoutSummary,
  ElevateMilestoneData,
  ElevatePRData,
  ElevatePostType,
  MilestoneType,
  PostPrivacy,
  CreateElevateReport,
  ElevateReportResponse,
  ElevateReportReason,
  CreateElevateStory,
  ElevateStoryResponse,
  ElevateStoriesFeedResponse,
  ElevateStoryGroup,
  StoryMediaType,
  SendGymPartnerRequest,
  RespondGymPartnerRequest,
  GymPartnersQuery,
  GymPartnerResponse,
  GymPartnerSuggestion,
  ElevateFeedMode,
  ElevateFeedQueryExtended,
  SearchUserResult,
  GymStatsResponse,
  TrainingUser,
  TrendingExercise,
  PeakHours,
} from '@varaperformance/core';

// Query key factory
const elevateKeys = {
  all: ['elevate'] as const,
  feed: (query?: ElevateFeedQuery) =>
    [...elevateKeys.all, 'feed', query] as const,
  feedWithMode: (query?: Partial<ElevateFeedQueryExtended>) =>
    [...elevateKeys.all, 'feedWithMode', query] as const,
  post: (id: string) => [...elevateKeys.all, 'post', id] as const,
  comments: (postId: string) =>
    [...elevateKeys.all, 'comments', postId] as const,
  stories: () => [...elevateKeys.all, 'stories'] as const,
  partners: (query?: Partial<GymPartnersQuery>) =>
    [...elevateKeys.all, 'partners', query] as const,
  pendingRequests: () => [...elevateKeys.all, 'partners', 'pending'] as const,
  partnerSuggestions: () =>
    [...elevateKeys.all, 'partners', 'suggestions'] as const,
  partnerSearch: (query: string) =>
    [...elevateKeys.all, 'partners', 'search', query] as const,
  profileStats: () => [...elevateKeys.all, 'profile-stats'] as const,
  gymStats: () => [...elevateKeys.all, 'gym-stats'] as const,
};

const elevateFeedRootKey = [...elevateKeys.all, 'feed'] as const;
const elevateFeedWithModeRootKey = [
  ...elevateKeys.all,
  'feedWithMode',
] as const;

// Polling now acts as a resilience fallback to realtime socket pushes.
const FEED_FALLBACK_POLL_MS = 2 * 60 * 1000;
const GYM_STATS_FALLBACK_POLL_MS = 60 * 1000;

const updatePostInFeedCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  updater: (post: ElevatePostResponse) => ElevatePostResponse,
) => {
  const applyUpdate = (old?: SuccessResponse<ElevateFeedResponse>) => {
    if (!old?.success) return old;
    return {
      ...old,
      data: {
        ...old.data,
        posts: old.data.posts.map((post) =>
          post.id === postId ? updater(post) : post,
        ),
      },
    };
  };

  queryClient.setQueriesData<SuccessResponse<ElevateFeedResponse>>(
    { queryKey: elevateFeedRootKey },
    applyUpdate,
  );
  queryClient.setQueriesData<SuccessResponse<ElevateFeedResponse>>(
    { queryKey: elevateFeedWithModeRootKey },
    applyUpdate,
  );
};

// API functions
const getFeed = async (query?: ElevateFeedQuery) => {
  const params = new URLSearchParams();

  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.type) params.set('type', query.type);
  if (query?.userId) params.set('userId', query.userId);

  const queryString = params.toString();
  const response = await api.get<SuccessResponse<ElevateFeedResponse>>(
    `elevate${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

const getPost = async (postId: string) => {
  const response = await api.get<SuccessResponse<ElevatePostResponse>>(
    `elevate/${postId}`,
  );
  return response.data;
};

const createPost = async (data: CreateElevatePost) => {
  const response = await api.post<SuccessResponse<ElevatePostResponse>>(
    'elevate',
    data,
  );
  return response.data;
};

const updatePost = async ({
  postId,
  data,
}: {
  postId: string;
  data: UpdateElevatePost;
}) => {
  const response = await api.patch<SuccessResponse<ElevatePostResponse>>(
    `elevate/${postId}`,
    data,
  );
  return response.data;
};

const deletePost = async (postId: string) => {
  const response = await api.delete<SuccessResponse<{ deleted: true }>>(
    `elevate/${postId}`,
  );
  return response.data;
};

const toggleHighFive = async (postId: string) => {
  const response = await api.post<
    SuccessResponse<{ highFived: boolean; highFiveCount: number }>
  >(`elevate/${postId}/high-five`);
  return response.data;
};

const toggleSave = async (postId: string) => {
  const response = await api.post<SuccessResponse<{ saved: boolean }>>(
    `elevate/${postId}/save`,
  );
  return response.data;
};

const getComments = async (postId: string) => {
  const response = await api.get<
    SuccessResponse<{ comments: ElevateCommentResponse[]; total: number }>
  >(`elevate/${postId}/comments`);
  return response.data;
};

const createComment = async ({
  postId,
  data,
}: {
  postId: string;
  data: CreateElevateComment;
}) => {
  const response = await api.post<SuccessResponse<ElevateCommentResponse>>(
    `elevate/${postId}/comments`,
    data,
  );
  return response.data;
};

const updateComment = async ({
  postId,
  commentId,
  data,
}: {
  postId: string;
  commentId: string;
  data: UpdateElevateComment;
}) => {
  const response = await api.patch<SuccessResponse<ElevateCommentResponse>>(
    `elevate/${postId}/comments/${commentId}`,
    data,
  );
  return response.data;
};

const deleteComment = async ({
  postId,
  commentId,
}: {
  postId: string;
  commentId: string;
}) => {
  const response = await api.delete<SuccessResponse<{ deleted: true }>>(
    `elevate/${postId}/comments/${commentId}`,
  );
  return response.data;
};

/**
 * Fetch paginated Elevate feed
 */
export function useElevateFeed(query?: ElevateFeedQuery) {
  return useQuery({
    queryKey: elevateKeys.feed(query),
    queryFn: () => getFeed(query),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch infinite Elevate feed (for infinite scroll)
 */
export function useInfiniteElevateFeed(
  query?: Omit<ElevateFeedQuery, 'page'>,
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: ['elevate', 'feed', 'infinite', query],
    queryFn: ({ pageParam = 1 }) =>
      getFeed({ page: pageParam, limit: query?.limit ?? 20, ...query }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage.success) return undefined;
      const { pagination } = lastPage.data;
      return pagination.hasMore ? pagination.page + 1 : undefined;
    },
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: FEED_FALLBACK_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch a single Elevate post by ID
 */
export function useElevatePost(
  postId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: elevateKeys.post(postId),
    queryFn: () => getPost(postId),
    enabled: options?.enabled ?? !!postId,
  });
}

/**
 * Create a new Elevate post
 */
export function useCreatePost(options?: {
  onSuccess?: (data: SuccessResponse<ElevatePostResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPost,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: elevateKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Update an Elevate post
 */
export function useUpdatePost(options?: {
  onSuccess?: (data: SuccessResponse<ElevatePostResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePost,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: elevateKeys.all });
      if (data.success) {
        queryClient.setQueryData(elevateKeys.post(data.data.id), data);
      }
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Delete an Elevate post
 */
export function useDeletePost(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: elevateKeys.all });
      // Also invalidate recent-workouts so the workout can be re-attached
      queryClient.invalidateQueries({ queryKey: ['recent-workouts-v2'] });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * Toggle high-five on a post
 */
export function useToggleHighFive(options?: {
  onSuccess?: (
    data: SuccessResponse<{ highFived: boolean; highFiveCount: number }>,
  ) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleHighFive,
    onMutate: async (postId) => {
      // Cancel in-flight queries so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: elevateKeys.post(postId) });

      const previousPost = queryClient.getQueryData<
        SuccessResponse<ElevatePostResponse>
      >(elevateKeys.post(postId));

      // Optimistically toggle before the server responds
      if (previousPost?.success) {
        const wasHighFived = previousPost.data.hasHighFived;
        queryClient.setQueryData<SuccessResponse<ElevatePostResponse>>(
          elevateKeys.post(postId),
          {
            ...previousPost,
            data: {
              ...previousPost.data,
              hasHighFived: !wasHighFived,
              highFiveCount:
                previousPost.data.highFiveCount + (wasHighFived ? -1 : 1),
            },
          },
        );
        updatePostInFeedCaches(queryClient, postId, (post) => ({
          ...post,
          hasHighFived: !wasHighFived,
          highFiveCount: post.highFiveCount + (wasHighFived ? -1 : 1),
        }));
      }

      return { previousPost };
    },
    onSuccess: (data, postId) => {
      // Reconcile with server state
      if (data.success) {
        queryClient.setQueryData<SuccessResponse<ElevatePostResponse>>(
          elevateKeys.post(postId),
          (old) => {
            if (!old?.success) return old;
            return {
              ...old,
              data: {
                ...old.data,
                hasHighFived: data.data.highFived,
                highFiveCount: data.data.highFiveCount,
              },
            };
          },
        );
        updatePostInFeedCaches(queryClient, postId, (post) => ({
          ...post,
          hasHighFived: data.data.highFived,
          highFiveCount: data.data.highFiveCount,
        }));
      }

      queryClient.invalidateQueries({ queryKey: elevateFeedRootKey });
      queryClient.invalidateQueries({ queryKey: elevateFeedWithModeRootKey });
      options?.onSuccess?.(data);
    },
    onError: (error, postId, context) => {
      // Roll back on failure
      if (context?.previousPost) {
        queryClient.setQueryData(
          elevateKeys.post(postId),
          context.previousPost,
        );
      }
      queryClient.invalidateQueries({ queryKey: elevateFeedRootKey });
      queryClient.invalidateQueries({ queryKey: elevateFeedWithModeRootKey });
      options?.onError?.(error);
    },
  });
}

/**
 * Toggle save/bookmark on a post
 */
export function useToggleSave(options?: {
  onSuccess?: (data: SuccessResponse<{ saved: boolean }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleSave,
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: elevateKeys.post(postId) });

      const previousPost = queryClient.getQueryData<
        SuccessResponse<ElevatePostResponse>
      >(elevateKeys.post(postId));

      if (previousPost?.success) {
        const wasSaved = previousPost.data.hasSaved;
        queryClient.setQueryData<SuccessResponse<ElevatePostResponse>>(
          elevateKeys.post(postId),
          {
            ...previousPost,
            data: { ...previousPost.data, hasSaved: !wasSaved },
          },
        );
        updatePostInFeedCaches(queryClient, postId, (post) => ({
          ...post,
          hasSaved: !wasSaved,
        }));
      }

      return { previousPost };
    },
    onSuccess: (data, postId) => {
      if (data.success) {
        queryClient.setQueryData<SuccessResponse<ElevatePostResponse>>(
          elevateKeys.post(postId),
          (old) => {
            if (!old?.success) return old;
            return {
              ...old,
              data: { ...old.data, hasSaved: data.data.saved },
            };
          },
        );
        updatePostInFeedCaches(queryClient, postId, (post) => ({
          ...post,
          hasSaved: data.data.saved,
        }));
      }

      queryClient.invalidateQueries({ queryKey: elevateFeedRootKey });
      queryClient.invalidateQueries({ queryKey: elevateFeedWithModeRootKey });
      options?.onSuccess?.(data);
    },
    onError: (error, postId, context) => {
      if (context?.previousPost) {
        queryClient.setQueryData(
          elevateKeys.post(postId),
          context.previousPost,
        );
      }
      queryClient.invalidateQueries({ queryKey: elevateFeedRootKey });
      queryClient.invalidateQueries({ queryKey: elevateFeedWithModeRootKey });
      options?.onError?.(error);
    },
  });
}

/**
 * Fetch comments for a post
 */
export function useElevateComments(
  postId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: elevateKeys.comments(postId),
    queryFn: () => getComments(postId),
    enabled: options?.enabled ?? !!postId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Create a comment on a post
 */
export function useCreateComment(options?: {
  onSuccess?: (
    data: SuccessResponse<ElevateCommentResponse>,
    variables: { postId: string; data: CreateElevateComment },
  ) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createComment,
    onSuccess: (data, variables) => {
      if (data.success) {
        const recentComment = {
          ...data.data,
          replies: data.data.replies ?? [],
        };

        queryClient.setQueryData<SuccessResponse<ElevatePostResponse>>(
          elevateKeys.post(variables.postId),
          (old) => {
            if (!old?.success) return old;
            const existingRecent = old.data.recentComments ?? [];
            return {
              ...old,
              data: {
                ...old.data,
                commentCount: old.data.commentCount + 1,
                recentComments: [recentComment, ...existingRecent]
                  .slice(0, 3)
                  .filter((comment) => comment.parentId === null),
              },
            };
          },
        );

        updatePostInFeedCaches(queryClient, variables.postId, (post) => ({
          ...post,
          commentCount: post.commentCount + 1,
          recentComments: [recentComment, ...(post.recentComments ?? [])]
            .slice(0, 3)
            .filter((comment) => comment.parentId === null),
        }));
      }

      queryClient.invalidateQueries({
        queryKey: elevateKeys.comments(variables.postId),
      });
      queryClient.invalidateQueries({
        queryKey: elevateKeys.post(variables.postId),
      });
      queryClient.invalidateQueries({ queryKey: elevateFeedRootKey });
      queryClient.invalidateQueries({ queryKey: elevateFeedWithModeRootKey });
      options?.onSuccess?.(data, variables);
    },
    onError: options?.onError,
  });
}

/**
 * Update a comment
 */
export function useUpdateComment(options?: {
  onSuccess?: (data: SuccessResponse<ElevateCommentResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateComment,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: elevateKeys.comments(variables.postId),
      });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Delete a comment
 */
export function useDeleteComment(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteComment,
    onSuccess: (_, variables) => {
      queryClient.setQueryData<SuccessResponse<ElevatePostResponse>>(
        elevateKeys.post(variables.postId),
        (old) => {
          if (!old?.success) return old;
          return {
            ...old,
            data: {
              ...old.data,
              commentCount: Math.max(0, old.data.commentCount - 1),
              recentComments: (old.data.recentComments ?? []).filter(
                (comment) => comment.id !== variables.commentId,
              ),
            },
          };
        },
      );

      updatePostInFeedCaches(queryClient, variables.postId, (post) => ({
        ...post,
        commentCount: Math.max(0, post.commentCount - 1),
        recentComments: (post.recentComments ?? []).filter(
          (comment) => comment.id !== variables.commentId,
        ),
      }));

      queryClient.invalidateQueries({
        queryKey: elevateKeys.comments(variables.postId),
      });
      queryClient.invalidateQueries({
        queryKey: elevateKeys.post(variables.postId),
      });
      queryClient.invalidateQueries({ queryKey: elevateFeedRootKey });
      queryClient.invalidateQueries({ queryKey: elevateFeedWithModeRootKey });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

// Report API function
const reportPost = async ({
  postId,
  data,
}: {
  postId: string;
  data: CreateElevateReport;
}) => {
  const response = await api.post<SuccessResponse<ElevateReportResponse>>(
    `elevate/${postId}/report`,
    data,
  );
  return response.data;
};

/**
 * Report a post
 */
export function useReportPost(options?: {
  onSuccess?: (data: SuccessResponse<ElevateReportResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportPost,
    onSuccess: (data) => {
      // Invalidate feed to update any locked status
      queryClient.invalidateQueries({ queryKey: elevateKeys.feed() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

// ============ Stories ============

// API functions for stories
const getStories = async () => {
  const response =
    await api.get<SuccessResponse<ElevateStoriesFeedResponse>>(
      'elevate/stories',
    );
  return response.data;
};

const createStory = async (data: CreateElevateStory) => {
  const response = await api.post<SuccessResponse<ElevateStoryResponse>>(
    'elevate/stories',
    data,
  );
  return response.data;
};

const viewStory = async (storyId: string) => {
  const response = await api.post<SuccessResponse<{ viewed: boolean }>>(
    `elevate/stories/${storyId}/view`,
  );
  return response.data;
};

const deleteStory = async (storyId: string) => {
  const response = await api.delete<SuccessResponse<{ deleted: true }>>(
    `elevate/stories/${storyId}`,
  );
  return response.data;
};

const uploadStoryMedia = async (
  file: File,
): Promise<{ url: string; mediaType: StoryMediaType }> => {
  const formData = new FormData();
  formData.append('files', file);

  const response = await api.post<
    SuccessResponse<{ url: string; mediaType: StoryMediaType }>
  >('elevate/stories/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

/**
 * Fetch stories feed (grouped by user)
 */
export function useStories() {
  return useQuery({
    queryKey: elevateKeys.stories(),
    queryFn: getStories,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Create a new story
 */
export function useCreateStory(options?: {
  onSuccess?: (data: SuccessResponse<ElevateStoryResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStory,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: elevateKeys.stories() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Mark a story as viewed
 */
export function useViewStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: viewStory,
    onSuccess: () => {
      // Optimistically update - or invalidate
      queryClient.invalidateQueries({ queryKey: elevateKeys.stories() });
    },
  });
}

/**
 * Delete own story
 */
export function useDeleteStory(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteStory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: elevateKeys.stories() });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * Upload story media (image or video)
 */
export function useUploadStoryMedia(options?: {
  onSuccess?: (data: { url: string; mediaType: StoryMediaType }) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: uploadStoryMedia,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

// ============ Profile Stats ============

export interface ProfileStats {
  workouts: number;
  gymPartners: number;
  prsThisYear: number;
}

const getProfileStats = async () => {
  const response = await api.get<SuccessResponse<ProfileStats>>(
    'elevate/profile-stats',
  );
  return response.data;
};

/**
 * Fetch profile stats for the social page
 */
export function useProfileStats() {
  return useQuery({
    queryKey: elevateKeys.profileStats(),
    queryFn: getProfileStats,
  });
}

// ============ Gym Stats ============

const getGymStats = async () => {
  const response =
    await api.get<SuccessResponse<GymStatsResponse>>('elevate/gym-stats');
  return response.data;
};

/**
 * Fetch gym stats (who's training, peak hours, trending exercises)
 */
export function useGymStats() {
  return useQuery({
    queryKey: elevateKeys.gymStats(),
    queryFn: getGymStats,
    staleTime: 20 * 1000,
    refetchInterval: GYM_STATS_FALLBACK_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

// ============ Gym Partners ============

// API functions for gym partners
const getGymPartners = async (query?: Partial<GymPartnersQuery>) => {
  const params = new URLSearchParams();
  if (query?.status) params.append('status', query.status);
  if (query?.page) params.append('page', String(query.page));
  if (query?.limit) params.append('limit', String(query.limit));

  const url = params.toString()
    ? `elevate/partners?${params}`
    : 'elevate/partners';
  const response = await api.get<
    SuccessResponse<{
      partners: GymPartnerResponse[];
      total: number;
      page: number;
      limit: number;
    }>
  >(url);
  return response.data;
};

const getPendingRequests = async () => {
  const response = await api.get<
    SuccessResponse<{ requests: GymPartnerResponse[] }>
  >('elevate/partners/pending');
  return response.data;
};

const getPartnerSuggestions = async () => {
  const response = await api.get<
    SuccessResponse<{ suggestions: GymPartnerSuggestion[] }>
  >('elevate/partners/suggestions');
  return response.data;
};

const searchUsers = async (query: string) => {
  const params = new URLSearchParams();
  params.set('query', query);
  const response = await api.get<
    SuccessResponse<{ results: SearchUserResult[] }>
  >(`elevate/partners/search?${params}`);
  return response.data;
};

const sendGymPartnerRequest = async (data: SendGymPartnerRequest) => {
  const response = await api.post<SuccessResponse<GymPartnerResponse>>(
    'elevate/partners/request',
    data,
  );
  return response.data;
};

const respondToGymPartnerRequest = async ({
  requestId,
  action,
}: {
  requestId: string;
  action: 'ACCEPT' | 'REJECT' | 'BLOCK';
}) => {
  const response = await api.post<SuccessResponse<GymPartnerResponse>>(
    `elevate/partners/request/${requestId}/respond`,
    { action },
  );
  return response.data;
};

const removeGymPartner = async (partnerId: string) => {
  const response = await api.delete<SuccessResponse<{ removed: true }>>(
    `elevate/partners/${partnerId}`,
  );
  return response.data;
};

const getFeedWithMode = async (query?: Partial<ElevateFeedQueryExtended>) => {
  const params = new URLSearchParams();
  if (query?.mode) params.append('mode', query.mode);
  if (query?.page) params.append('page', String(query.page));
  if (query?.limit) params.append('limit', String(query.limit));
  if (query?.type) params.append('type', query.type);
  if (query?.userId) params.append('userId', query.userId);

  const url = params.toString() ? `elevate/feed?${params}` : 'elevate/feed';
  const response = await api.get<SuccessResponse<ElevateFeedResponse>>(url);
  return response.data;
};

/**
 * Fetch gym partners list
 */
export function useGymPartners(
  query?: Partial<GymPartnersQuery>,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: elevateKeys.partners(query),
    queryFn: () => getGymPartners(query),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Fetch pending gym partner requests
 */
export function usePendingPartnerRequests() {
  return useQuery({
    queryKey: elevateKeys.pendingRequests(),
    queryFn: getPendingRequests,
  });
}

/**
 * Fetch gym partner suggestions
 */
export function usePartnerSuggestions() {
  return useQuery({
    queryKey: elevateKeys.partnerSuggestions(),
    queryFn: getPartnerSuggestions,
  });
}

/**
 * Search users by name or email to add as partners
 */
export function useSearchUsers(query: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: elevateKeys.partnerSearch(query),
    queryFn: () => searchUsers(query),
    enabled: options?.enabled !== false && query.length >= 2,
  });
}

/**
 * Send gym partner request
 */
export function useSendPartnerRequest(options?: {
  onSuccess?: (data: SuccessResponse<GymPartnerResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendGymPartnerRequest,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: elevateKeys.partners() });
      queryClient.invalidateQueries({
        queryKey: elevateKeys.partnerSuggestions(),
      });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Respond to gym partner request (accept/reject/block)
 */
export function useRespondToPartnerRequest(options?: {
  onSuccess?: (data: SuccessResponse<GymPartnerResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: respondToGymPartnerRequest,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: elevateKeys.partners() });
      queryClient.invalidateQueries({
        queryKey: elevateKeys.pendingRequests(),
      });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Remove gym partner
 */
export function useRemovePartner(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeGymPartner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: elevateKeys.partners() });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * Fetch feed with mode (partners/public/momentum)
 */
export function useFeedWithMode(query?: Partial<ElevateFeedQueryExtended>) {
  return useQuery({
    queryKey: elevateKeys.feedWithMode(query),
    queryFn: () => getFeedWithMode(query),
  });
}

/**
 * Fetch feed with mode using infinite scroll
 */
export function useInfiniteFeedWithMode(
  mode: ElevateFeedMode = 'PARTNERS',
  limit = 20,
) {
  return useInfiniteQuery({
    queryKey: elevateKeys.feedWithMode({ mode, limit }),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getFeedWithMode({ mode, page: pageParam, limit });
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.success) return undefined;
      const { pagination } = lastPage.data;
      if (pagination.hasMore) {
        return pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 30 * 1000,
    refetchInterval: FEED_FALLBACK_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

/**
 * Subscribe to Elevate realtime push updates and refresh feed caches.
 */
interface UseElevateRealtimeOptions {
  enabled?: boolean;
  onFeedRefresh?: (event: ElevateFeedRefreshEvent) => boolean | void;
}

export function useElevateRealtime(
  options: boolean | UseElevateRealtimeOptions = true,
) {
  const enabled =
    typeof options === 'boolean' ? options : (options.enabled ?? true);
  const onFeedRefresh =
    typeof options === 'boolean' ? undefined : options.onFeedRefresh;

  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  const refreshFeed = useCallback(
    (event?: ElevateFeedRefreshEvent) => {
      const postId = event?.postId;
      const reason = event?.reason;

      const invalidateFeedLists = () => {
        queryClient.invalidateQueries({ queryKey: elevateFeedRootKey });
        queryClient.invalidateQueries({ queryKey: elevateFeedWithModeRootKey });
      };

      if (!event) {
        invalidateFeedLists();
        return;
      }

      if (reason === 'post_created') {
        invalidateFeedLists();
        return;
      }

      if (reason === 'post_deleted') {
        invalidateFeedLists();
        if (postId) {
          queryClient.invalidateQueries({ queryKey: elevateKeys.post(postId) });
        }
        return;
      }

      if (reason === 'post_updated' || reason === 'post_reacted') {
        if (postId) {
          queryClient.invalidateQueries({ queryKey: elevateKeys.post(postId) });
        }
        invalidateFeedLists();
        return;
      }

      if (
        reason === 'comment_created' ||
        reason === 'comment_updated' ||
        reason === 'comment_deleted'
      ) {
        if (postId) {
          queryClient.invalidateQueries({ queryKey: elevateKeys.post(postId) });
          queryClient.invalidateQueries({
            queryKey: elevateKeys.comments(postId),
          });
        } else {
          invalidateFeedLists();
        }
        return;
      }

      invalidateFeedLists();
    },
    [queryClient],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const socket = connectElevateSocket();

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('elevate:ping');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleFeedRefresh = (event: ElevateFeedRefreshEvent) => {
      const shouldRefresh = onFeedRefresh
        ? onFeedRefresh(event) !== false
        : true;
      if (shouldRefresh) {
        refreshFeed(event);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('elevate:feed:refresh', handleFeedRefresh);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('elevate:feed:refresh', handleFeedRefresh);
      disconnectElevateSocket();
    };
  }, [enabled, onFeedRefresh, queryClient, refreshFeed]);

  return { isConnected, refreshFeed };
}
