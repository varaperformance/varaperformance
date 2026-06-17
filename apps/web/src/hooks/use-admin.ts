import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  PaginatedResponse,
  CoachDesignation,
  CreateFood,
  UpdateFood,
  FoodResponse,
  FoodListItem,
  ChallengeResponse,
  CreateChallenge,
  RecipeSearchResult,
} from '@varaperformance/core';

// Types
export interface AdminUser {
  id: string;
  email: string;
  isVerified: boolean;
  isActive: boolean;
  authProvider: string;
  createdAt: string;
  lastLoginAt: string | null;
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  roles: {
    role: {
      id: string;
      name: string;
    };
  }[];
  permissions: {
    permission: {
      id: string;
      resource: string;
      action: string;
    };
  }[];
}

export interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  _count: {
    users: number;
    permissions: number;
  };
  permissions: {
    permission: {
      id: string;
      resource: string;
      action: string;
    };
  }[];
}

export interface AdminPermission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

export interface CreateAdminUserPayload {
  email: string;
  password: string;
  displayName?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface UserGrowthData {
  month: string;
  users: number;
}

export interface RevenueData {
  month: string;
  revenue: number;
}

export interface DailyActiveUsersData {
  date: string;
  users: number;
}

export interface RecentActivityItem {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  createdAt: string;
  user: { email: string; displayName: string | null } | null;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalCoaches: number;
  verifiedCoaches: number;
  totalBlogPosts: number;
  publishedBlogPosts: number;
  openIncidents: number;
  totalGyms: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  userGrowth: UserGrowthData[];
  revenueData: RevenueData[];
  dau: DailyActiveUsersData[];
  coaching: {
    activeBookings: number;
    totalPackages: number;
    contractSignatures: number;
  };
  foodDatabase: {
    totalFoods: number;
    bySource: Record<string, number>;
  };
  recentActivity: RecentActivityItem[];
  compliance?: {
    legalDocuments: {
      total: number;
      active: number;
      types: string[];
    };
    auditLogging: {
      active: boolean;
      recentEntries: number;
    };
    dataEncryption: {
      active: boolean;
      encryptedProfiles: number;
      totalProfiles: number;
      encryptedSessions: number;
    };
    consentTracking: {
      enabled: boolean;
      totalConsents: number;
    };
    wormStorage: {
      active: boolean;
      legalDocuments: { total: number; withHash: number };
      coachingContracts: { total: number; withHash: number };
    };
    gdpr?: {
      dataExports: number;
      accountDeletions: number;
      pendingRetentions: number;
    };
  };
}

export interface AdminBlog {
  id: string;
  title: string;
  slug: string;
  status: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    profile: {
      displayName: string | null;
    } | null;
  } | null;
  category: {
    name: string;
  } | null;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    posts: number;
  };
}

export interface AdminRecipeCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    recipes: number;
  };
}

export interface AdminTag {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    posts: number;
  };
}

export interface AdminExercise {
  id: string;
  slug: string;
  name: string;
  category: string;
  difficulty: string;
  description: string;
  instructions: string[];
  tips: string[];
  variations: string[];
  videoUrl: string | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  muscleGroups: { muscleGroup: string }[];
  equipment: { equipment: string }[];
}

export type AdminFood = FoodListItem;

export interface AdminCoach {
  id: string;
  userId: string;
  title: string;
  bio: string;
  location: string;
  experienceYears: number;
  certifications: string[];
  designation: CoachDesignation;
  influencerSocialLinks?: string[];
  certificationEvidence?:
    | Array<{
        name: string;
        lookupUrl?: string;
        photoUrl?: string;
        certId?: string;
      }>
    | Record<string, unknown>
    | null;
  specialties: string[];
  isAvailable: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  rating: string;
  reviewCount: number;
  clientCount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    email: string;
    profile: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export interface AdminSubscription {
  id: string;
  bookingId: string;
  packageId: string;
  status: string;
  paymentProvider: 'STRIPE';
  stripeSubscriptionId: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  scheduledCancellationAt: string | null;
  createdAt: string;
  updatedAt: string;
  booking: {
    referenceCode: string;
    user: {
      email: string;
      profile: { displayName: string | null } | null;
    };
    coach: {
      user: {
        profile: { displayName: string | null } | null;
      };
    };
  };
  package: {
    name: string;
    priceInCents: number;
    billingCycle: string;
  };
}

export interface AdminPayment {
  id: string;
  customerId: string;
  provider: 'STRIPE';
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeSubscriptionId: string | null;
  stripeInvoiceId: string | null;
  amountInCents: number;
  currency: string;
  feeInCents: number | null;
  status: string;
  type: string;
  bookingId: string | null;
  orderId: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    stripeCustomerId: string;
    user: {
      email: string;
      profile: { displayName: string | null } | null;
    };
  };
}

export interface AdminPricingPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  audience: 'FREE' | 'COACH' | 'GYM';
  priceInCents: number;
  periodLabel: string | null;
  cta: string;
  ctaLink: string;
  highlighted: boolean;
  isActive: boolean;
  sortOrder: number;
  features: Array<{
    id: string;
    text: string;
    sortOrder: number;
  }>;
}

export interface PaymentStats {
  totalPayments: number;
  successfulPayments: number;
  totalRevenueInCents: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  pastDueSubscriptions: number;
}

export interface AdminRegistrationCode {
  id: string;
  code: string;
  createdById: string | null;
  ownerUserId: string | null;
  usedByUserId: string | null;
  usedAt: string | null;
  createdAt: string;
}

export interface AdminPrivateModeData {
  privateModeEnabled: boolean;
  codes: AdminRegistrationCode[];
}

export interface AdminAuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  } | null;
}

export interface AdminShopProductImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

export interface AdminBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductOptionValue {
  id: string;
  label: string;
  hexColor: string | null;
  sortOrder: number;
}

export interface AdminProductOption {
  id: string;
  name: string;
  sortOrder: number;
  values: AdminProductOptionValue[];
}

export interface AdminVariantOptionMapping {
  id: string;
  optionValue: {
    id: string;
    label: string;
    hexColor: string | null;
    option: { id: string; name: string };
  };
}

export interface AdminVariantImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface AdminInventoryRecord {
  id: string;
  variantId: string;
  quantityOnHand: number;
  quantityReserved: number;
  reorderPoint: number | null;
  updatedAt: string;
}

export interface AdminShopProductVariant {
  id: string;
  title: string;
  sku: string;
  priceInCents: number;
  compareAtPriceInCents: number | null;
  weight: number | null;
  weightUnit: 'OZ' | 'LB' | 'G' | 'KG' | null;
  inventoryQuantity: number;
  reservedQuantity: number;
  attributes: Record<string, string> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  optionValues: AdminVariantOptionMapping[];
  variantImages: AdminVariantImage[];
  inventoryRecord: AdminInventoryRecord | null;
}

export interface AdminShopProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  category: string;
  brandId: string | null;
  brand: AdminBrand | null;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  options: AdminProductOption[];
  images: AdminShopProductImage[];
  variants: AdminShopProductVariant[];
}

export interface AdminShopCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  children?: AdminShopCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminInventoryItem {
  id: string;
  productId: string;
  title: string;
  sku: string;
  priceInCents: number;
  inventoryQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  product: {
    id: string;
    name: string;
    category: string;
  };
  inventoryRecord: AdminInventoryRecord | null;
}

export interface AdminShopDiscountCode {
  id: string;
  code: string;
  description: string | null;
  type: 'PERCENT' | 'FIXED';
  percentOff: number | null;
  amountOffInCents: number | null;
  minSubtotalInCents: number | null;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
    profile: {
      displayName: string | null;
    } | null;
  } | null;
}

export interface AdminShopReferralCode {
  id: string;
  userId: string;
  code: string;
  clickCount: number;
  conversionCount: number;
  rewardAmountInCents: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    profile: {
      displayName: string | null;
    } | null;
  };
  _count: {
    orders: number;
  };
}

export interface AdminShopOrder {
  id: string;
  orderNumber: string;
  email: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  fulfillmentStatus: 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'FULFILLED';
  currency: string;
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  createdAt: string;
  paidAt: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  shippedAt: string | null;
  notes: string | null;
  items: Array<{
    id: string;
    name: string;
    sku: string | null;
    quantity: number;
    unitPriceInCents: number;
    totalInCents: number;
    attributes: Record<string, string> | null;
  }>;
  discountCode: { code: string } | null;
  referralCode: { code: string } | null;
  metadata: Record<string, unknown> | null;
  user: {
    id: string;
    email: string;
    profile: { displayName: string | null } | null;
  } | null;
}

export interface AdminShopCustomer {
  id: string;
  email: string;
  createdAt: string;
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  orderCount: number;
  totalSpentInCents: number;
  lastOrderAt: string | null;
}

export interface AdminShopOrderSummary {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  ordersLast30Days: number;
  paidRevenueInCents: number;
  paidRevenueLast30DaysInCents: number;
}

export interface AdminShopHeaderNavLink {
  label: string;
  to: string;
  hasDropdown?: boolean;
}

export interface AdminShopHeaderSettings {
  freeShippingMessage: string;
  navLinks: AdminShopHeaderNavLink[];
}

// Query keys
export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  users: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }) => [...adminKeys.all, 'users', params] as const,
  user: (id: string) => [...adminKeys.all, 'user', id] as const,
  roles: () => [...adminKeys.all, 'roles'] as const,
  role: (id: string) => [...adminKeys.all, 'role', id] as const,
  permissions: () => [...adminKeys.all, 'permissions'] as const,
  blogs: (params?: { page?: number; limit?: number; status?: string }) =>
    [...adminKeys.all, 'blogs', params] as const,
  categories: (params?: { page?: number; limit?: number; search?: string }) =>
    [...adminKeys.all, 'categories', params] as const,
  tags: (params?: { page?: number; limit?: number; search?: string }) =>
    [...adminKeys.all, 'tags', params] as const,
  exercises: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }) => [...adminKeys.all, 'exercises', params] as const,
  foods: (params?: {
    page?: number;
    limit?: number;
    query?: string;
    verified?: boolean;
  }) => [...adminKeys.all, 'foods', params] as const,
  coaches: (params?: { page?: number; limit?: number; status?: string }) =>
    [...adminKeys.all, 'coaches', params] as const,
  coach: (id: string) => [...adminKeys.all, 'coach', id] as const,
  subscriptions: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => [...adminKeys.all, 'subscriptions', params] as const,
  payments: (params?: { page?: number; limit?: number; status?: string }) =>
    [...adminKeys.all, 'payments', params] as const,
  paymentStats: () => [...adminKeys.all, 'payment-stats'] as const,
  pricingPlans: () => [...adminKeys.all, 'pricing-plans'] as const,
  platformFee: () => [...adminKeys.all, 'platform-fee'] as const,
  privateMode: () => [...adminKeys.all, 'private-mode'] as const,
  dau: (days?: number) => [...adminKeys.all, 'dau', days] as const,
  dauToday: () => [...adminKeys.all, 'dau', 'today'] as const,
  auditLogs: (params?: {
    page?: number;
    limit?: number;
    action?: string;
    resource?: string;
    userId?: string;
    search?: string;
    from?: string;
    to?: string;
  }) => [...adminKeys.all, 'audit-logs', params] as const,
  legal: (params?: { page?: number; limit?: number; type?: string }) =>
    [...adminKeys.all, 'legal', params] as const,
  legalDocument: (id: string) => [...adminKeys.all, 'legal', id] as const,
  legalVersions: (type: string) =>
    [...adminKeys.all, 'legal', 'versions', type] as const,
  teamMembers: (params?: { page?: number; limit?: number }) =>
    [...adminKeys.all, 'team-members', params] as const,
  ambassadorApplications: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => [...adminKeys.all, 'ambassador-applications', params] as const,
  shopCatalog: () => [...adminKeys.all, 'shop-catalog'] as const,
  shopCategories: () => [...adminKeys.all, 'shop-categories'] as const,
  shopBrands: () => [...adminKeys.all, 'shop-brands'] as const,
  shopBundles: () => [...adminKeys.all, 'shop-bundles'] as const,
  shopHeroBanners: () => [...adminKeys.all, 'shop-hero-banners'] as const,
  shopHeaderSettings: () => [...adminKeys.all, 'shop-header-settings'] as const,
  shopInventory: (params?: { search?: string }) =>
    [...adminKeys.all, 'shop-inventory', params] as const,
  shopDiscountCodes: () => [...adminKeys.all, 'shop-discount-codes'] as const,
  shopReferrals: () => [...adminKeys.all, 'shop-referrals'] as const,
  shopOrders: (params?: { page?: number; limit?: number }) =>
    [...adminKeys.all, 'shop-orders', params] as const,
  shopOrderSummary: () => [...adminKeys.all, 'shop-order-summary'] as const,
  shopCustomers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => [...adminKeys.all, 'shop-customers', params] as const,
  subscribers: (params?: { page?: number; limit?: number; search?: string }) =>
    [...adminKeys.all, 'subscribers', params] as const,
  subscriberStats: () => [...adminKeys.all, 'subscriber-stats'] as const,
  newsletters: (params?: { page?: number; limit?: number; status?: string }) =>
    [...adminKeys.all, 'newsletters', params] as const,
  newsletter: (id: string) => [...adminKeys.all, 'newsletter', id] as const,
  challenges: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    isOfficial?: boolean;
  }) => [...adminKeys.all, 'challenges', params] as const,
  recipeCategories: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => [...adminKeys.all, 'recipe-categories', params] as const,
  recipes: (params?: {
    page?: number;
    limit?: number;
    query?: string;
    verified?: boolean;
  }) => [...adminKeys.all, 'recipes', params] as const,
};

// Hooks

/**
 * Get admin dashboard statistics
 */
export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: async () => {
      const response =
        await api.get<SuccessResponse<AdminStats>>('/admin/stats');
      return response.data;
    },
  });
}

/**
 * Get worker queue health (DLQ depths)
 */
export function useQueueHealth() {
  return useQuery({
    queryKey: [...adminKeys.all, 'queue-health'] as const,
    queryFn: async () => {
      const response = await api.get<Record<string, number>>('health/dlq');
      return response.data;
    },
    refetchInterval: 30_000,
  });
}

/**
 * Get daily active users for the last N days
 */
export function useAdminDAU(days = 30) {
  return useQuery({
    queryKey: adminKeys.dau(days),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<DailyActiveUsersData[]>>(
        `/admin/dau?days=${days}`,
      );
      return response.data;
    },
  });
}

/**
 * Get today's active users (up to 10) with display names
 */
export function useAdminDAUToday() {
  return useQuery({
    queryKey: adminKeys.dauToday(),
    queryFn: async () => {
      const response =
        await api.get<
          SuccessResponse<{ id: string; displayName: string | null }[]>
        >('/admin/dau/today');
      return response.data;
    },
    refetchInterval: 60_000,
  });
}

/**
 * Get audit logs for admin review
 */
export function useAdminAuditLogs(params?: {
  page?: number;
  limit?: number;
  action?: string;
  resource?: string;
  userId?: string;
  search?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: adminKeys.auditLogs(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.action) searchParams.set('action', params.action);
      if (params?.resource) searchParams.set('resource', params.resource);
      if (params?.userId) searchParams.set('userId', params.userId);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.from) searchParams.set('from', params.from);
      if (params?.to) searchParams.set('to', params.to);

      const response = await api.get<PaginatedResponse<AdminAuditLog>>(
        `/admin/audit-logs?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

/**
 * Get paginated list of users
 */
export function useAdminUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.search) searchParams.set('search', params.search);
      if (params?.role) searchParams.set('role', params.role);

      const response = await api.get<PaginatedResponse<AdminUser>>(
        `/idm/admin/users?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

/**
 * Get single user details
 */
export function useAdminUser(id: string) {
  return useQuery({
    queryKey: adminKeys.user(id),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<AdminUser>>(
        `/idm/admin/users/${id}`,
      );
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Update user status (activate/deactivate)
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) => {
      const response = await api.patch<
        SuccessResponse<{ id: string; isActive: boolean }>
      >(`/idm/admin/users/${userId}/status`, { isActive });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

/**
 * Create user manually from admin
 */
export function useCreateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAdminUserPayload) => {
      const response = await api.post<SuccessResponse<AdminUser>>(
        '/idm/admin/users',
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

/**
 * Assign role to user
 */
export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: string;
    }) => {
      const response = await api.post<
        SuccessResponse<{ userId: string; roleId: string }>
      >(`/idm/admin/users/${userId}/roles/${roleId}`);
      return response.data;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.user(userId) });
    },
  });
}

/**
 * Remove role from user
 */
export function useRemoveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: string;
    }) => {
      const response = await api.delete<
        SuccessResponse<{ userId: string; roleId: string }>
      >(`/idm/admin/users/${userId}/roles/${roleId}`);
      return response.data;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.user(userId) });
    },
  });
}

/**
 * Assign direct permission to user
 */
export function useAssignPermissionToUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      permissionId,
    }: {
      userId: string;
      permissionId: string;
    }) => {
      const response = await api.post<
        SuccessResponse<{ userId: string; permissionId: string }>
      >(`/idm/admin/users/${userId}/permissions/${permissionId}`);
      return response.data;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.user(userId) });
    },
  });
}

/**
 * Remove direct permission from user
 */
export function useRemovePermissionFromUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      permissionId,
    }: {
      userId: string;
      permissionId: string;
    }) => {
      const response = await api.delete<
        SuccessResponse<{ userId: string; permissionId: string }>
      >(`/idm/admin/users/${userId}/permissions/${permissionId}`);
      return response.data;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.user(userId) });
    },
  });
}

/**
 * Get all roles
 */
export function useAdminRoles() {
  return useQuery({
    queryKey: adminKeys.roles(),
    queryFn: async () => {
      const response =
        await api.get<SuccessResponse<AdminRole[]>>('/idm/admin/roles');
      return response.data;
    },
  });
}

/**
 * Get single role details
 */
export function useAdminRole(id: string) {
  return useQuery({
    queryKey: adminKeys.role(id),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<AdminRole>>(
        `/idm/admin/roles/${id}`,
      );
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Get all permissions
 */
export function useAdminPermissions() {
  return useQuery({
    queryKey: adminKeys.permissions(),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<AdminPermission[]>>(
        '/idm/admin/permissions',
      );
      return response.data;
    },
  });
}

/**
 * Assign permission to role
 */
export function useAssignPermissionToRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roleId,
      permissionId,
    }: {
      roleId: string;
      permissionId: string;
    }) => {
      const response = await api.post<
        SuccessResponse<{ roleId: string; permissionId: string }>
      >(`/idm/admin/roles/${roleId}/permissions/${permissionId}`);
      return response.data;
    },
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.roles() });
      queryClient.invalidateQueries({ queryKey: adminKeys.role(roleId) });
    },
  });
}

/**
 * Remove permission from role
 */
export function useRemovePermissionFromRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roleId,
      permissionId,
    }: {
      roleId: string;
      permissionId: string;
    }) => {
      const response = await api.delete<
        SuccessResponse<{ roleId: string; permissionId: string }>
      >(`/idm/admin/roles/${roleId}/permissions/${permissionId}`);
      return response.data;
    },
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.roles() });
      queryClient.invalidateQueries({ queryKey: adminKeys.role(roleId) });
    },
  });
}

/**
 * Get blogs for management
 */
export function useAdminBlogs(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: adminKeys.blogs(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.status) searchParams.set('status', params.status);

      const response = await api.get<PaginatedResponse<AdminBlog>>(
        `/blogs/admin?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

export function useDeleteBlog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slug: string) => {
      const response = await api.delete<SuccessResponse<{ id: string }>>(
        `/blogs/${slug}`,
      );
      return response.data;
    },
    onSuccess: (_data, slug) => {
      // Optimistically remove from every cached blogs page so the row
      // disappears immediately without waiting for a refetch.
      // Use the bare prefix key so it matches all param variants cached by useAdminBlogs.
      queryClient.setQueriesData<{ data?: { items?: AdminBlog[] } }>(
        { queryKey: [...adminKeys.all, 'blogs'] },
        (old) => {
          if (!old?.data?.items) return old;
          return {
            ...old,
            data: {
              ...old.data,
              items: old.data.items.filter((b) => b.slug !== slug),
            },
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: adminKeys.blogs() });
    },
  });
}

// ==================== Category Hooks ====================

/**
 * Get categories for management
 */
export function useAdminCategories(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: adminKeys.categories(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.search) searchParams.set('search', params.search);

      const response = await api.get<PaginatedResponse<AdminCategory>>(
        `/categories?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

/**
 * Create a category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      slug: string;
      description?: string;
    }) => {
      const response = await api.post<SuccessResponse<AdminCategory>>(
        '/categories',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categories() });
    },
  });
}

/**
 * Update a category
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      slug?: string;
      description?: string;
    }) => {
      const response = await api.patch<SuccessResponse<AdminCategory>>(
        `/categories/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categories() });
    },
  });
}

/**
 * Delete a category
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<{ id: string }>>(
        `/categories/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categories() });
    },
  });
}

// ==================== Tag Hooks ====================

/**
 * Get tags for management
 */
export function useAdminTags(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: adminKeys.tags(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.search) searchParams.set('search', params.search);

      const response = await api.get<PaginatedResponse<AdminTag>>(
        `/tags?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

/**
 * Create a tag
 */
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; slug: string }) => {
      const response = await api.post<SuccessResponse<AdminTag>>('/tags', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.tags() });
    },
  });
}

/**
 * Update a tag
 */
export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      slug?: string;
    }) => {
      const response = await api.patch<SuccessResponse<AdminTag>>(
        `/tags/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.tags() });
    },
  });
}

/**
 * Delete a tag
 */
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<{ id: string }>>(
        `/tags/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.tags() });
    },
  });
}

// ==================== Exercise Hooks ====================

/**
 * Get exercises for management
 */
export function useAdminExercises(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}) {
  return useQuery({
    queryKey: adminKeys.exercises(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.search) searchParams.set('search', params.search);
      if (params?.category) searchParams.set('category', params.category);

      const response = await api.get<PaginatedResponse<AdminExercise>>(
        `/exercises/admin?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

/**
 * Create an exercise
 */
export function useCreateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<AdminExercise>) => {
      const response = await api.post<SuccessResponse<AdminExercise>>(
        '/exercises',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'exercises'] });
    },
  });
}

/**
 * Update an exercise
 */
export function useUpdateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: { id: string } & Partial<AdminExercise>) => {
      const response = await api.patch<SuccessResponse<AdminExercise>>(
        `/exercises/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'exercises'] });
    },
  });
}

/**
 * Toggle exercise active status
 */
export function useToggleExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<SuccessResponse<AdminExercise>>(
        `/exercises/${id}/toggle`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'exercises'] });
    },
  });
}

/**
 * Delete an exercise
 */
export function useDeleteExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<{ id: string }>>(
        `/exercises/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'exercises'] });
    },
  });
}

// ==================== Food Hooks ====================

/**
 * Get foods for admin management
 */
export function useAdminFoods(params?: {
  page?: number;
  limit?: number;
  query?: string;
  verified?: boolean;
  source?: string;
}) {
  return useQuery({
    queryKey: adminKeys.foods(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.query) searchParams.set('query', params.query);
      if (params?.verified !== undefined) {
        searchParams.set('verified', String(params.verified));
      }
      if (params?.source) searchParams.set('source', params.source);

      const response = await api.get<PaginatedResponse<AdminFood>>(
        `/nutrition/admin/foods?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

/**
 * Get single food details
 */
export function useAdminFood(id: string) {
  return useQuery({
    queryKey: [...adminKeys.all, 'food', id],
    queryFn: async () => {
      const response = await api.get<SuccessResponse<FoodResponse>>(
        `/nutrition/foods/${id}`,
      );
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Create a food from admin
 */
export function useAdminCreateFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFood) => {
      const response = await api.post<SuccessResponse<FoodResponse>>(
        '/nutrition/admin/foods',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'foods'] });
    },
  });
}

/**
 * Update any food as admin
 */
export function useAdminUpdateFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFood }) => {
      const response = await api.put<SuccessResponse<FoodResponse>>(
        `/nutrition/admin/foods/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'foods'] });
    },
  });
}

/**
 * Delete food as admin
 */
export function useAdminDeleteFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<{ message: string }>>(
        `/nutrition/admin/foods/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'foods'] });
    },
  });
}

/**
 * Verify/unverify food as admin
 */
export function useAdminVerifyFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const response = await api.put<SuccessResponse<{ message: string }>>(
        `/nutrition/admin/foods/${id}/verify?verified=${verified}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'foods'] });
    },
  });
}

// ==================== Coach Hooks ====================

/**
 * Get coaches for management
 */
export function useAdminCoaches(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: adminKeys.coaches(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.status) searchParams.set('status', params.status);

      const response = await api.get<PaginatedResponse<AdminCoach>>(
        `/coaches/admin?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

/**
 * Get single coach details
 */
export function useAdminCoach(id: string) {
  return useQuery({
    queryKey: adminKeys.coach(id),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<AdminCoach>>(
        `/coaches/admin/${id}`,
      );
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Approve a coach application
 */
export function useApproveCoach() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<SuccessResponse<AdminCoach>>(
        `/coaches/admin/${id}/approve`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'coaches'],
      });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
}

/**
 * Reject a coach application
 */
export function useRejectCoach() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await api.post<SuccessResponse<AdminCoach>>(
        `/coaches/admin/${id}/reject`,
        { reason },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'coaches'],
      });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
}

/**
 * Delete a coach account
 */
export function useDeleteCoach() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<{ id: string }>>(
        `/coaches/admin/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'coaches'],
      });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
}

/**
 * Toggle coach featured status
 */
export function useToggleCoachFeatured() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<SuccessResponse<AdminCoach>>(
        `/coaches/admin/${id}/featured`,
      );
      return response.data;
    },
    onMutate: async (id: string) => {
      const coachesQueryKey = [...adminKeys.all, 'coaches'] as const;

      await queryClient.cancelQueries({ queryKey: coachesQueryKey });

      const previousCoachQueries = queryClient.getQueriesData({
        queryKey: coachesQueryKey,
      });

      for (const [queryKey, queryData] of previousCoachQueries) {
        const data = queryData as PaginatedResponse<AdminCoach> | undefined;
        if (!data?.data?.items) {
          continue;
        }

        queryClient.setQueryData<PaginatedResponse<AdminCoach>>(queryKey, {
          ...data,
          data: {
            ...data.data,
            items: data.data.items.map((coach) =>
              coach.id === id
                ? { ...coach, isFeatured: !coach.isFeatured }
                : coach,
            ),
          },
        });
      }

      return { previousCoachQueries };
    },
    onError: (_error, _id, context) => {
      if (!context?.previousCoachQueries) {
        return;
      }

      for (const [queryKey, queryData] of context.previousCoachQueries) {
        queryClient.setQueryData(queryKey, queryData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'coaches'],
      });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
}

// ==================== Subscription/Payment Hooks ====================

/**
 * Get subscriptions for management
 */
export function useAdminSubscriptions(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: adminKeys.subscriptions(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.status) searchParams.set('status', params.status);

      const response = await api.get<PaginatedResponse<AdminSubscription>>(
        `/payments/admin/subscriptions?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

/**
 * Get payments for management
 */
export function useAdminPayments(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: adminKeys.payments(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.status) searchParams.set('status', params.status);

      const response = await api.get<PaginatedResponse<AdminPayment>>(
        `/payments/admin/payments?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

/**
 * Get payment statistics
 */
export function usePaymentStats() {
  return useQuery({
    queryKey: adminKeys.paymentStats(),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<PaymentStats>>(
        '/payments/admin/stats',
      );
      return response.data;
    },
  });
}

/**
 * Get admin pricing plans
 */
export function useAdminPricingPlans() {
  return useQuery({
    queryKey: adminKeys.pricingPlans(),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{ plans: AdminPricingPlan[] }>
      >('/payments/admin/pricing/plans');
      return response.data;
    },
  });
}

/**
 * Create pricing plan
 */
export function useCreatePricingPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      slug: string;
      name: string;
      description?: string;
      audience: 'FREE' | 'COACH' | 'GYM';
      priceInCents: number;
      periodLabel?: string;
      cta: string;
      ctaLink: string;
      highlighted?: boolean;
      isActive?: boolean;
      sortOrder?: number;
      features: string[];
    }) => {
      const response = await api.post<
        SuccessResponse<{ plan: AdminPricingPlan }>
      >('/payments/admin/pricing/plans', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pricingPlans() });
    },
  });
}

/**
 * Update pricing plan
 */
export function useUpdatePricingPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      description?: string;
      audience?: 'FREE' | 'COACH' | 'GYM';
      priceInCents?: number;
      periodLabel?: string;
      cta?: string;
      ctaLink?: string;
      highlighted?: boolean;
      isActive?: boolean;
      sortOrder?: number;
      features?: string[];
    }) => {
      const response = await api.patch<
        SuccessResponse<{ plan: AdminPricingPlan }>
      >(`/payments/admin/pricing/plans/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pricingPlans() });
    },
  });
}

/**
 * Get platform fee setting
 */
export function usePlatformFeeSetting() {
  return useQuery({
    queryKey: adminKeys.platformFee(),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<{ percent: number }>>(
        '/payments/admin/settings/platform-fee',
      );
      return response.data;
    },
  });
}

/**
 * Update platform fee setting
 */
export function useUpdatePlatformFeeSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (percent: number) => {
      const response = await api.patch<SuccessResponse<{ percent: number }>>(
        '/payments/admin/settings/platform-fee',
        { percent },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.platformFee() });
    },
  });
}

/**
 * Get private mode and registration codes
 */
export function useAdminPrivateMode() {
  return useQuery({
    queryKey: adminKeys.privateMode(),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<AdminPrivateModeData>>(
        '/idm/admin/private-mode',
      );
      return response.data;
    },
  });
}

/**
 * Update private mode state
 */
export function useUpdateAdminPrivateMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await api.patch<
        SuccessResponse<{ privateModeEnabled: boolean }>
      >('/idm/admin/private-mode', { enabled });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.privateMode() });
    },
  });
}

/**
 * Generate registration codes from admin
 */
export function useGenerateAdminRegistrationCodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (count: number) => {
      const response = await api.post<
        SuccessResponse<{
          codes: Array<{ id: string; code: string; createdAt: string }>;
        }>
      >('/idm/admin/private-mode/codes', { count });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.privateMode() });
    },
  });
}

// ==================== Legal Document Hooks (WORM Compliant) ====================

export interface AdminLegalDocument {
  id: string;
  type: string;
  version: string;
  title: string;
  content?: string;
  hashValue: string | null;
  effectiveAt: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get legal documents for management
 */
export function useAdminLegalDocuments(params?: {
  page?: number;
  limit?: number;
  type?: string;
}) {
  return useQuery({
    queryKey: adminKeys.legal(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.type) searchParams.set('type', params.type);

      const response = await api.get<PaginatedResponse<AdminLegalDocument>>(
        `/legal/admin?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

/**
 * Get a single legal document with full content
 */
export function useAdminLegalDocument(id: string) {
  return useQuery({
    queryKey: adminKeys.legalDocument(id),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<AdminLegalDocument>>(
        `/legal/admin/${id}`,
      );
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Get version history for a document type
 */
export function useLegalDocumentVersions(type: string) {
  return useQuery({
    queryKey: adminKeys.legalVersions(type),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<AdminLegalDocument[]>>(
        `/legal/admin/type/${type}/versions`,
      );
      return response.data;
    },
    enabled: !!type,
  });
}

/**
 * Create a new legal document
 */
export function useCreateLegalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      type: string;
      title: string;
      content: string;
      effectiveAt?: string;
    }) => {
      const response = await api.post<SuccessResponse<AdminLegalDocument>>(
        '/legal/admin',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'legal'] });
    },
  });
}

/**
 * Create a new version of a legal document (WORM compliant - never modifies existing)
 */
export function useCreateLegalDocumentVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      content: string;
      effectiveAt?: string;
      versionType?: 'major' | 'minor' | 'patch';
    }) => {
      const response = await api.post<
        SuccessResponse<{
          document: AdminLegalDocument;
          previousVersion: string;
          message: string;
        }>
      >(`/legal/admin/${id}/version`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'legal'] });
    },
  });
}

/**
 * Verify document integrity
 */
export function useVerifyLegalDocumentIntegrity(id: string) {
  return useQuery({
    queryKey: [...adminKeys.legalDocument(id), 'verify'],
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{ isValid: boolean; message: string }>
      >(`/legal/admin/${id}/verify`);
      return response.data;
    },
    enabled: false, // Manual trigger only
  });
}

// ==================== Elevate Reports ====================

export interface AdminElevateReport {
  id: string;
  postId: string;
  post: {
    id: string;
    type: string;
    content: string;
    images: string[];
    author: {
      id: string;
      displayName: string | null;
      avatarUrl: string | null;
      coverUrl: string | null;
    };
    createdAt: string;
  };
  reporter: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
  };
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
  } | null;
  reviewNote: string | null;
}

const elevateReportKeys = {
  all: ['admin', 'elevate-reports'] as const,
  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    reason?: string;
  }) => [...elevateReportKeys.all, params] as const,
};

/**
 * Fetch paginated Elevate reports
 */
export function useAdminElevateReports(params?: {
  page?: number;
  limit?: number;
  status?: string;
  reason?: string;
}) {
  return useQuery({
    queryKey: elevateReportKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.status) searchParams.set('status', params.status);
      if (params?.reason) searchParams.set('reason', params.reason);

      const query = searchParams.toString();
      const response = await api.get<
        SuccessResponse<{
          reports: AdminElevateReport[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasMore: boolean;
          };
        }>
      >(`/elevate/admin/reports${query ? `?${query}` : ''}`);
      return response.data;
    },
  });
}

/**
 * Update a report status
 */
export function useUpdateElevateReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      status,
      reviewNote,
    }: {
      reportId: string;
      status: string;
      reviewNote?: string;
    }) => {
      const response = await api.put<SuccessResponse<{ updated: true }>>(
        `/elevate/admin/reports/${reportId}`,
        { status, reviewNote },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: elevateReportKeys.all });
    },
  });
}

/**
 * Delete a post as admin (moderator action)
 */
export function useAdminDeleteElevatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await api.delete<SuccessResponse<{ deleted: true }>>(
        `/elevate/admin/posts/${postId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: elevateReportKeys.all });
      queryClient.invalidateQueries({ queryKey: ['elevate'] });
    },
  });
}

// ==================== Team & Ambassador Hooks ====================

export interface AdminTeamMember {
  id: string;
  userId: string;
  role: 'CORE' | 'AMBASSADOR';
  title: string;
  bio: string | null;
  photoUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  user: {
    email: string;
    profile: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export interface AdminAmbassadorApplication {
  id: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  reason: string;
  contribution: string;
  audience: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  denyReason: string | null;
  createdAt: string;
  user: {
    email: string;
    profile: {
      displayName: string | null;
      avatarUrl: string | null;
      socials: Record<string, string | null> | null;
    } | null;
  };
}

export function useAdminTeamMembers(params?: {
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: adminKeys.teamMembers(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      const response = await api.get<PaginatedResponse<AdminTeamMember>>(
        `/team/admin/members?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      userId: string;
      role: 'CORE' | 'AMBASSADOR';
      title: string;
      bio?: string;
      photoUrl?: string;
      sortOrder?: number;
      isVisible?: boolean;
    }) => {
      const response = await api.post<SuccessResponse<AdminTeamMember>>(
        '/team/admin/members',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'team-members'],
      });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      bio?: string;
      photoUrl?: string;
      sortOrder?: number;
      isVisible?: boolean;
    }) => {
      const response = await api.patch<SuccessResponse<AdminTeamMember>>(
        `/team/admin/members/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'team-members'],
      });
    },
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<{ id: string }>>(
        `/team/admin/members/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'team-members'],
      });
    },
  });
}

export function useAdminAmbassadorApplications(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: adminKeys.ambassadorApplications(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.status) searchParams.set('status', params.status);
      const response = await api.get<
        PaginatedResponse<AdminAmbassadorApplication>
      >(`/team/admin/applications?${searchParams.toString()}`);
      return response.data;
    },
  });
}

export function useApproveAmbassador() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<
        SuccessResponse<AdminAmbassadorApplication>
      >(`/team/admin/applications/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'ambassador-applications'],
      });
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'team-members'],
      });
    },
  });
}

export function useDenyAmbassador() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await api.post<
        SuccessResponse<AdminAmbassadorApplication>
      >(`/team/admin/applications/${id}/deny`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'ambassador-applications'],
      });
    },
  });
}

export function useDeleteAmbassadorApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<{ id: string }>>(
        `/team/admin/applications/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'ambassador-applications'],
      });
    },
  });
}

// ==================== Shop Commerce Admin Hooks ====================

export function useAdminShopCatalog() {
  return useQuery({
    queryKey: adminKeys.shopCatalog(),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{ items: AdminShopProduct[] }>
      >('/commerce/admin/catalog');
      return response.data;
    },
  });
}

export function useAdminShopCategories() {
  return useQuery({
    queryKey: adminKeys.shopCategories(),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{ items: AdminShopCategory[] }>
      >('/commerce/admin/categories');
      return response.data;
    },
  });
}

export function useCreateAdminShopCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      slug?: string;
      parentId?: string;
      isActive?: boolean;
      sortOrder?: number;
    }) => {
      const response = await api.post<
        SuccessResponse<{ category: AdminShopCategory }>
      >('/commerce/admin/categories', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopCategories() });
    },
  });
}

export function useUpdateAdminShopCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      ...payload
    }: {
      categoryId: string;
      name?: string;
      slug?: string;
      parentId?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    }) => {
      const response = await api.patch<
        SuccessResponse<{ category: AdminShopCategory }>
      >(`/commerce/admin/categories/${categoryId}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopCategories() });
      queryClient.invalidateQueries({ queryKey: adminKeys.shopCatalog() });
      queryClient.invalidateQueries({ queryKey: ['shop', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['shop', 'catalog'] });
    },
  });
}

export function useDeleteAdminShopCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      const response = await api.delete<SuccessResponse<{ id: string }>>(
        `/commerce/admin/categories/${categoryId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopCategories() });
      queryClient.invalidateQueries({ queryKey: adminKeys.shopCatalog() });
      queryClient.invalidateQueries({ queryKey: ['shop', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['shop', 'catalog'] });
    },
  });
}

// ── Brands ──────────────────────────────────────────────────

export function useAdminBrands() {
  return useQuery({
    queryKey: adminKeys.shopBrands(),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<{ items: AdminBrand[] }>>(
        '/commerce/admin/brands',
      );
      return response.data;
    },
  });
}

export function useCreateAdminBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      slug: string;
      logoUrl?: string;
      isActive?: boolean;
    }) => {
      const response = await api.post<SuccessResponse<{ brand: AdminBrand }>>(
        '/commerce/admin/brands',
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopBrands() });
    },
  });
}

export function useUpdateAdminBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      brandId,
      ...payload
    }: {
      brandId: string;
      name?: string;
      slug?: string;
      logoUrl?: string;
      isActive?: boolean;
    }) => {
      const response = await api.patch<SuccessResponse<{ brand: AdminBrand }>>(
        `/commerce/admin/brands/${brandId}`,
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopBrands() });
      queryClient.invalidateQueries({ queryKey: adminKeys.shopCatalog() });
    },
  });
}

export function useDeleteAdminBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (brandId: string) => {
      const response = await api.delete<SuccessResponse<{ id: string }>>(
        `/commerce/admin/brands/${brandId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopBrands() });
      queryClient.invalidateQueries({ queryKey: adminKeys.shopCatalog() });
    },
  });
}

export function useAdminShopHeaderSettings() {
  return useQuery({
    queryKey: adminKeys.shopHeaderSettings(),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<AdminShopHeaderSettings>>(
        '/commerce/admin/settings/header',
      );
      return response.data;
    },
  });
}

export function useUpdateAdminShopHeaderSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      freeShippingMessage: string;
      navLinks: AdminShopHeaderNavLink[];
    }) => {
      const response = await api.patch<
        SuccessResponse<AdminShopHeaderSettings>
      >('/commerce/admin/settings/header', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminKeys.shopHeaderSettings(),
      });
      queryClient.invalidateQueries({ queryKey: ['shop', 'header-settings'] });
    },
  });
}

export function useCreateAdminShopProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      slug: string;
      description?: string;
      categoryId: string;
      brandId?: string;
      isActive?: boolean;
      isFeatured?: boolean;
      images?: Array<{ url: string; alt?: string; sortOrder?: number }>;
      options?: Array<{
        name: string;
        sortOrder?: number;
        values: Array<{
          label: string;
          hexColor?: string;
          sortOrder?: number;
        }>;
      }>;
      variants: Array<{
        id?: string;
        title: string;
        sku: string;
        priceInCents: number;
        compareAtPriceInCents?: number;
        weight?: number;
        weightUnit?: 'OZ' | 'LB' | 'G' | 'KG';
        inventoryQuantity?: number;
        optionValueIds?: string[];
        optionSelections?: Array<{ optionName: string; value: string }>;
        attributes?: Record<string, string>;
        images?: Array<{ url: string; alt?: string; sortOrder?: number }>;
      }>;
    }) => {
      const response = await api.post<
        SuccessResponse<{ product: AdminShopProduct }>
      >('/commerce/admin/catalog', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopCatalog() });
    },
  });
}

export function useUploadAdminShopProductImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post<SuccessResponse<{ url: string }>>(
        '/commerce/admin/catalog/upload-image',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );
      return response.data;
    },
  });
}

export function useUpdateAdminShopProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      ...payload
    }: {
      productId: string;
      name?: string;
      slug?: string;
      description?: string;
      categoryId?: string;
      brandId?: string;
      isActive?: boolean;
      isFeatured?: boolean;
      variants?: Array<{
        id?: string;
        title: string;
        sku: string;
        priceInCents: number;
        compareAtPriceInCents?: number;
        weight?: number;
        weightUnit?: 'OZ' | 'LB' | 'G' | 'KG';
        inventoryQuantity?: number;
        optionValueIds?: string[];
        attributes?: Record<string, string>;
        images?: Array<{ url: string; alt?: string; sortOrder?: number }>;
      }>;
    }) => {
      const response = await api.patch<
        SuccessResponse<{ product: AdminShopProduct }>
      >(`/commerce/admin/catalog/${productId}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopCatalog() });
    },
  });
}

export function useDeleteAdminShopProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const response = await api.delete<SuccessResponse<{ id: string }>>(
        `/commerce/admin/catalog/${productId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopCatalog() });
      queryClient.invalidateQueries({ queryKey: ['shop', 'catalog'] });
      queryClient.invalidateQueries({ queryKey: adminKeys.shopBundles() });
      queryClient.invalidateQueries({ queryKey: ['shop', 'bundles'] });
    },
  });
}

export function useAdminShopInventory(params?: { search?: string }) {
  return useQuery({
    queryKey: adminKeys.shopInventory(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      const response = await api.get<
        SuccessResponse<{ items: AdminInventoryItem[] }>
      >(`/commerce/admin/inventory?${searchParams.toString()}`);
      return response.data;
    },
  });
}

export function useAdjustAdminShopInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      variantId: string;
      delta: number;
      reason: 'RESTOCK' | 'SALE' | 'REFUND' | 'MANUAL';
      note?: string;
    }) => {
      const response = await api.post<
        SuccessResponse<{ variant: AdminInventoryItem; adjustment: unknown }>
      >('/commerce/admin/inventory/adjust', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'shop-inventory'],
      });
    },
  });
}

export function useAdminShopDiscountCodes() {
  return useQuery({
    queryKey: adminKeys.shopDiscountCodes(),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{ items: AdminShopDiscountCode[] }>
      >('/commerce/admin/discount-codes');
      return response.data;
    },
  });
}

export function useCreateAdminShopDiscountCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      code: string;
      description?: string;
      type: 'PERCENT' | 'FIXED';
      percentOff?: number;
      amountOffInCents?: number;
      minSubtotalInCents?: number;
      usageLimit?: number;
      startsAt?: string;
      endsAt?: string;
      isActive?: boolean;
    }) => {
      const response = await api.post<
        SuccessResponse<{ discountCode: AdminShopDiscountCode }>
      >('/commerce/admin/discount-codes', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminKeys.shopDiscountCodes(),
      });
    },
  });
}

export function useUpdateAdminShopDiscountCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      discountCodeId,
      ...payload
    }: {
      discountCodeId: string;
      description?: string;
      type?: 'PERCENT' | 'FIXED';
      percentOff?: number;
      amountOffInCents?: number;
      minSubtotalInCents?: number;
      usageLimit?: number;
      startsAt?: string;
      endsAt?: string;
      isActive?: boolean;
    }) => {
      const response = await api.patch<
        SuccessResponse<{ discountCode: AdminShopDiscountCode }>
      >(`/commerce/admin/discount-codes/${discountCodeId}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminKeys.shopDiscountCodes(),
      });
    },
  });
}

export function useDeleteAdminShopDiscountCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (discountCodeId: string) => {
      const response = await api.delete<SuccessResponse<{ id: string }>>(
        `/commerce/admin/discount-codes/${discountCodeId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminKeys.shopDiscountCodes(),
      });
    },
  });
}

export function useAdminShopReferrals() {
  return useQuery({
    queryKey: adminKeys.shopReferrals(),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{ items: AdminShopReferralCode[] }>
      >('/commerce/admin/referrals');
      return response.data;
    },
  });
}

export function useCreateAdminShopReferralCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { userId: string; code?: string }) => {
      const response = await api.post<
        SuccessResponse<{ referralCode: AdminShopReferralCode }>
      >('/commerce/admin/referrals/codes', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopReferrals() });
    },
  });
}

export function useDeleteAdminShopReferralCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (referralCodeId: string) => {
      const response = await api.delete<SuccessResponse<{ id: string }>>(
        `/commerce/admin/referrals/codes/${referralCodeId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopReferrals() });
    },
  });
}

export function useAdminShopOrders(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: adminKeys.shopOrders(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      const response = await api.get<
        SuccessResponse<{
          items: AdminShopOrder[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>
      >(`/commerce/admin/orders?${searchParams.toString()}`);
      return response.data;
    },
  });
}

export function useAdminShopOrderSummary() {
  return useQuery({
    queryKey: adminKeys.shopOrderSummary(),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<AdminShopOrderSummary>>(
        '/commerce/admin/orders/summary',
      );
      return response.data;
    },
  });
}

export function useAdminCancelShopOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { orderId: string; reason?: string }) => {
      const response = await api.patch<
        SuccessResponse<{ order: AdminShopOrder }>
      >(`/commerce/admin/orders/${payload.orderId}/cancel`, {
        reason: payload.reason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'shop-orders'],
      });
    },
  });
}

export function useAdminRefundShopOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { orderId: string; reason?: string }) => {
      const response = await api.post<
        SuccessResponse<{
          order: AdminShopOrder;
          refund?: { id: string; status: string };
        }>
      >(`/commerce/admin/orders/${payload.orderId}/refund`, {
        reason: payload.reason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'shop-orders'],
      });
    },
  });
}

export function useUpdateAdminShopOrderFulfillment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      orderId: string;
      fulfillmentStatus?: 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'FULFILLED';
      trackingNumber?: string;
      carrier?: string;
      notes?: string;
    }) => {
      const { orderId, ...body } = payload;
      const response = await api.patch<SuccessResponse<AdminShopOrder>>(
        `/commerce/admin/orders/${orderId}/fulfillment`,
        body,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'shop-orders'],
      });
    },
  });
}

export function useAdminShopCustomers(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: adminKeys.shopCustomers(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.search) searchParams.set('search', params.search);
      const response = await api.get<
        SuccessResponse<{
          items: AdminShopCustomer[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>
      >(`/commerce/admin/customers?${searchParams.toString()}`);
      return response.data;
    },
  });
}

// ── Bundles ─────────────────────────────────────────────────

export interface AdminBundleItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    images: Array<{ url: string; alt: string | null }>;
    variants: Array<{
      id: string;
      title: string;
      priceInCents: number;
      isActive: boolean;
    }>;
  };
}

export interface AdminBundle {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceInCents: number;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  items: AdminBundleItem[];
  createdAt: string;
  updatedAt: string;
}

export function useAdminBundles() {
  return useQuery({
    queryKey: adminKeys.shopBundles(),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<{ items: AdminBundle[] }>>(
        '/commerce/admin/bundles',
      );
      return response.data;
    },
  });
}

export function useCreateAdminBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      slug?: string;
      description?: string;
      priceInCents: number;
      imageUrl?: string;
      isActive?: boolean;
      sortOrder?: number;
      items: Array<{
        productId: string;
        variantId?: string;
        quantity?: number;
      }>;
    }) => {
      const response = await api.post<SuccessResponse<{ bundle: AdminBundle }>>(
        '/commerce/admin/bundles',
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopBundles() });
      queryClient.invalidateQueries({ queryKey: ['shop', 'bundles'] });
    },
  });
}

export function useUpdateAdminBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bundleId,
      ...payload
    }: {
      bundleId: string;
      name?: string;
      slug?: string;
      description?: string;
      priceInCents?: number;
      imageUrl?: string | null;
      isActive?: boolean;
      sortOrder?: number;
      items?: Array<{
        productId: string;
        variantId?: string;
        quantity?: number;
      }>;
    }) => {
      const response = await api.patch<
        SuccessResponse<{ bundle: AdminBundle }>
      >(`/commerce/admin/bundles/${bundleId}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopBundles() });
      queryClient.invalidateQueries({ queryKey: ['shop', 'bundles'] });
    },
  });
}

export function useDeleteAdminBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bundleId: string) => {
      const response = await api.delete<SuccessResponse<void>>(
        `/commerce/admin/bundles/${bundleId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopBundles() });
      queryClient.invalidateQueries({ queryKey: ['shop', 'bundles'] });
    },
  });
}

// ── Hero Banners ────────────────────────────────────────────

export interface AdminHeroBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  alt: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function useAdminHeroBanners() {
  return useQuery({
    queryKey: adminKeys.shopHeroBanners(),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{ items: AdminHeroBanner[] }>
      >('/commerce/admin/hero-banners');
      return response.data;
    },
  });
}

export function useCreateAdminHeroBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      imageUrl: string;
      linkUrl: string;
      alt?: string;
      isActive?: boolean;
      sortOrder?: number;
    }) => {
      const response = await api.post<
        SuccessResponse<{ banner: AdminHeroBanner }>
      >('/commerce/admin/hero-banners', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopHeroBanners() });
      queryClient.invalidateQueries({ queryKey: ['shop', 'hero-banners'] });
    },
  });
}

export function useUpdateAdminHeroBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bannerId,
      ...payload
    }: {
      bannerId: string;
      imageUrl?: string;
      linkUrl?: string;
      alt?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    }) => {
      const response = await api.patch<
        SuccessResponse<{ banner: AdminHeroBanner }>
      >(`/commerce/admin/hero-banners/${bannerId}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopHeroBanners() });
      queryClient.invalidateQueries({ queryKey: ['shop', 'hero-banners'] });
    },
  });
}

export function useDeleteAdminHeroBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bannerId: string) => {
      const response = await api.delete<SuccessResponse<void>>(
        `/commerce/admin/hero-banners/${bannerId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shopHeroBanners() });
      queryClient.invalidateQueries({ queryKey: ['shop', 'hero-banners'] });
    },
  });
}

// ─── Marketing Types ─────────────────────────────────────────

export interface MarketingSubscriber {
  id: string;
  userId: string;
  grantedAt: string;
  user: {
    id: string;
    email: string;
    profile: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export interface Newsletter {
  id: string;
  subject: string;
  content: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED';
  scheduledAt: string | null;
  sentAt: string | null;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Marketing Hooks ─────────────────────────────────────────

export function useMarketingSubscribers(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: adminKeys.subscribers(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.search) searchParams.set('search', params.search);
      const response = await api.get<PaginatedResponse<MarketingSubscriber>>(
        `/marketing/subscribers?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

export function useSubscriberStats() {
  return useQuery({
    queryKey: adminKeys.subscriberStats(),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{ subscribers: number; unsubscribed: number }>
      >('/marketing/subscribers/stats');
      return response.data;
    },
  });
}

export function useNewsletters(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: adminKeys.newsletters(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.status) searchParams.set('status', params.status);
      const response = await api.get<PaginatedResponse<Newsletter>>(
        `/marketing/newsletters?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

export function useNewsletter(id: string) {
  return useQuery({
    queryKey: adminKeys.newsletter(id),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<Newsletter>>(
        `/marketing/newsletters/${id}`,
      );
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateNewsletter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      subject: string;
      content: string;
      scheduledAt?: string;
    }) => {
      const response = await api.post<SuccessResponse<Newsletter>>(
        '/marketing/newsletters',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'newsletters'],
      });
    },
  });
}

export function useUpdateNewsletter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      subject?: string;
      content?: string;
      scheduledAt?: string;
    }) => {
      const response = await api.put<SuccessResponse<Newsletter>>(
        `/marketing/newsletters/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'newsletters'],
      });
    },
  });
}

export function useDeleteNewsletter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<void>>(
        `/marketing/newsletters/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'newsletters'],
      });
    },
  });
}

export function useSendNewsletter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<SuccessResponse<Newsletter>>(
        `/marketing/newsletters/${id}/send`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'newsletters'],
      });
    },
  });
}

// ==================== Challenges (Admin) ====================

export function useAdminChallenges(params?: {
  page?: number;
  limit?: number;
  status?: string;
  isOfficial?: boolean;
}) {
  return useQuery({
    queryKey: adminKeys.challenges(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.status) searchParams.set('status', params.status);
      if (params?.isOfficial !== undefined)
        searchParams.set('isOfficial', String(params.isOfficial));
      const query = searchParams.toString();
      const response = await api.get<
        SuccessResponse<{
          items: ChallengeResponse[];
          total: number;
          page: number;
        }>
      >(query ? `/admin/challenges?${query}` : '/admin/challenges');
      return response.data;
    },
  });
}

export function useAdminCreateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateChallenge) => {
      const response = await api.post<SuccessResponse<ChallengeResponse>>(
        '/admin/challenges',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'challenges'],
      });
    },
  });
}

export function useAdminUpdateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const response = await api.put<SuccessResponse<ChallengeResponse>>(
        `/admin/challenges/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'challenges'],
      });
    },
  });
}

export function useAdminDeleteChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<{ deleted: boolean }>>(
        `/admin/challenges/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'challenges'],
      });
    },
  });
}

// ==================== Recipe Category Hooks ====================

export function useAdminRecipeCategories(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: adminKeys.recipeCategories(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.search) searchParams.set('search', params.search);

      const response = await api.get<PaginatedResponse<AdminRecipeCategory>>(
        `/recipe-categories?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

export function useCreateRecipeCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      slug: string;
      description?: string;
      sortOrder?: number;
    }) => {
      const response = await api.post<SuccessResponse<AdminRecipeCategory>>(
        '/recipe-categories',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'recipe-categories'],
      });
    },
  });
}

export function useUpdateRecipeCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      slug?: string;
      description?: string;
      sortOrder?: number;
    }) => {
      const response = await api.patch<SuccessResponse<AdminRecipeCategory>>(
        `/recipe-categories/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'recipe-categories'],
      });
    },
  });
}

export function useDeleteRecipeCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<{ id: string }>>(
        `/recipe-categories/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'recipe-categories'],
      });
    },
  });
}

// ==================== Admin Recipes ====================

export function useAdminRecipes(params?: {
  page?: number;
  limit?: number;
  query?: string;
  verified?: boolean;
}) {
  return useQuery({
    queryKey: adminKeys.recipes(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.query) searchParams.set('query', params.query);
      if (params?.verified !== undefined)
        searchParams.set('verified', String(params.verified));
      const response = await api.get<SuccessResponse<RecipeSearchResult>>(
        `/recipes/admin/list?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

export function useToggleRecipeVerified() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<
        SuccessResponse<{ id: string; isVerified: boolean }>
      >(`/recipes/admin/${id}/verify`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'recipes'],
      });
    },
  });
}
