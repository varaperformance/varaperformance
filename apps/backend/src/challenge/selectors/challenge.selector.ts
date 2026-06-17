export const challengeSelect = {
  id: true,
  title: true,
  description: true,
  coverImage: true,
  type: true,
  status: true,
  visibility: true,
  isOfficial: true,
  goalValue: true,
  goalUnit: true,
  startDate: true,
  endDate: true,
  maxParticipants: true,
  participantCount: true,
  createdAt: true,
  creator: {
    select: {
      id: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
} as const;

export const challengeParticipantSelect = {
  id: true,
  userId: true,
  status: true,
  progress: true,
  completedAt: true,
  joinedAt: true,
  user: {
    select: {
      id: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
} as const;
