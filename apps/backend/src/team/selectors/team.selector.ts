/**
 * Prisma select for public team members
 */
const teamSocialsSelect = {
  twitter: true,
  facebook: true,
  instagram: true,
  threads: true,
  linkedin: true,
  github: true,
};

export const publicTeamMemberSelect = {
  id: true,
  userId: true,
  role: true,
  title: true,
  bio: true,
  photoUrl: true,
  sortOrder: true,
  isVisible: true,
  createdAt: true,
  user: {
    select: {
      email: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
          socials: {
            select: teamSocialsSelect,
          },
        },
      },
    },
  },
};
export type PublicTeamMemberSelect = typeof publicTeamMemberSelect;

/**
 * Prisma select for admin team members
 */
export const adminTeamMemberSelect = {
  id: true,
  userId: true,
  role: true,
  title: true,
  bio: true,
  photoUrl: true,
  sortOrder: true,
  isVisible: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      email: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
};
export type AdminTeamMemberSelect = typeof adminTeamMemberSelect;

/**
 * Prisma select for admin ambassador applications
 */
export const adminAmbassadorApplicationSelect = {
  id: true,
  userId: true,
  status: true,
  reason: true,
  contribution: true,
  audience: true,
  reviewedBy: true,
  reviewedAt: true,
  denyReason: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      email: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
          socials: {
            select: teamSocialsSelect,
          },
        },
      },
    },
  },
};
export type AdminAmbassadorApplicationSelect =
  typeof adminAmbassadorApplicationSelect;

/**
 * Prisma select for approval workflow lookups
 */
export const ambassadorApprovalLookupSelect = {
  id: true,
  userId: true,
  user: {
    select: {
      profile: {
        select: {
          displayName: true,
        },
      },
    },
  },
};
export type AmbassadorApprovalLookupSelect =
  typeof ambassadorApprovalLookupSelect;
