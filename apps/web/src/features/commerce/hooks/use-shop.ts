import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SuccessResponse } from '@varaperformance/core';
import api from '@/lib/api';
import { useAuth } from '@/features/auth';

export interface ShopVariantOptionMapping {
  id: string;
  optionValue: {
    id: string;
    label: string;
    hexColor: string | null;
    option: { id: string; name: string };
  };
}

export interface ShopVariantImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

export interface ShopInventoryRecord {
  id: string;
  quantityOnHand: number;
  quantityReserved: number;
}

export interface ShopProductVariant {
  id: string;
  title: string;
  sku: string;
  attributes: Record<string, string> | null;
  priceInCents: number;
  compareAtPriceInCents: number | null;
  weight: number | null;
  weightUnit: 'OZ' | 'LB' | 'G' | 'KG' | null;
  inventoryQuantity: number;
  reservedQuantity: number;
  isActive: boolean;
  optionValues: ShopVariantOptionMapping[];
  variantImages: ShopVariantImage[];
  inventoryRecord: ShopInventoryRecord | null;
}

export interface ShopProductImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

export interface ShopProductOptionValue {
  id: string;
  label: string;
  hexColor: string | null;
  sortOrder: number;
}

export interface ShopProductOption {
  id: string;
  name: string;
  sortOrder: number;
  values: ShopProductOptionValue[];
}

export interface ShopBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface ShopProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  category: string;
  categorySlug: string;
  brandId: string | null;
  brand: ShopBrand | null;
  isActive: boolean;
  isFeatured: boolean;
  inStock: boolean;
  minPriceInCents: number;
  options: ShopProductOption[];
  images: ShopProductImage[];
  variants: ShopProductVariant[];
}

export interface ShopOrder {
  id: string;
  orderNumber: string;
  email: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  fulfillmentStatus: 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'FULFILLED';
  totalInCents: number;
  discountInCents: number;
  trackingNumber: string | null;
  carrier: string | null;
  shippedAt: string | null;
  createdAt: string;
  paidAt: string | null;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    totalInCents: number;
  }>;
}

export interface ActivePromotion {
  id: string;
  code: string;
  description: string | null;
  type: 'PERCENT' | 'FIXED';
  percentOff: number | null;
  amountOffInCents: number | null;
  startsAt: string | null;
  endsAt: string | null;
}

export interface ShopHeaderNavLink {
  label: string;
  to: string;
  hasDropdown?: boolean;
}

export interface ShopHeaderSettings {
  freeShippingMessage: string;
  navLinks: ShopHeaderNavLink[];
}

export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  children?: ShopCategory[];
}

export interface ShopCheckoutAddress {
  recipientName: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface ShopProductReview {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  content: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface ShopProductReviewsData {
  items: ShopProductReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  averageRating: number;
  reviewCount: number;
}

export const shopKeys = {
  all: ['shop'] as const,
  catalog: (params?: {
    category?: string;
    search?: string;
    inStockOnly?: boolean;
    sort?: string;
    limit?: number;
    offset?: number;
  }) => [...shopKeys.all, 'catalog', params] as const,
  product: (productId?: string) =>
    [...shopKeys.all, 'product', productId] as const,
  productBySlug: (slug?: string) =>
    [...shopKeys.all, 'product', 'slug', slug] as const,
  productReviews: (
    productId?: string,
    params?: { page?: number; limit?: number },
  ) => [...shopKeys.all, 'product', productId, 'reviews', params] as const,
  promotions: () => [...shopKeys.all, 'promotions', 'active'] as const,
  categories: () => [...shopKeys.all, 'categories'] as const,
  headerSettings: () => [...shopKeys.all, 'header-settings'] as const,
  myOrders: (params?: { page?: number; limit?: number }) =>
    [...shopKeys.all, 'orders', 'my', params] as const,
  bundles: () => [...shopKeys.all, 'bundles'] as const,
  bundle: (slug: string | undefined) =>
    [...shopKeys.all, 'bundle', slug] as const,
  heroBanners: () => [...shopKeys.all, 'hero-banners'] as const,
};

export function useShopCatalog(params?: {
  category?: string;
  search?: string;
  inStockOnly?: boolean;
  sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc';
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: shopKeys.catalog(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.category && params.category !== 'All') {
        searchParams.set('category', params.category);
      }
      if (params?.search) searchParams.set('search', params.search);
      if (params?.inStockOnly) searchParams.set('inStockOnly', 'true');
      if (params?.sort) searchParams.set('sort', params.sort);
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.offset) searchParams.set('offset', String(params.offset));

      const response = await api.get<
        SuccessResponse<{
          items: ShopProduct[];
          total: number;
          limit: number;
          offset: number;
        }>
      >(`/commerce/catalog?${searchParams.toString()}`);
      return response.data;
    },
  });
}

export function useShopProduct(productId?: string) {
  return useQuery({
    queryKey: shopKeys.product(productId),
    enabled: Boolean(productId),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{
          product: ShopProduct;
        }>
      >(`/commerce/products/${productId}`);
      return response.data;
    },
  });
}

export function useShopProductBySlug(slug?: string) {
  return useQuery({
    queryKey: shopKeys.productBySlug(slug),
    enabled: Boolean(slug),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{
          product: ShopProduct;
        }>
      >(`/commerce/products/by-slug/${encodeURIComponent(slug!)}`);
      return response.data;
    },
  });
}

export function useShopProductReviews(
  productId?: string,
  params?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: shopKeys.productReviews(productId, params),
    enabled: Boolean(productId),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));

      const response = await api.get<SuccessResponse<ShopProductReviewsData>>(
        `/commerce/products/${productId}/reviews?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

export function useCreateShopProductReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      productId: string;
      data: { rating: number; title?: string; content?: string };
    }) => {
      const response = await api.post<SuccessResponse>(
        `/commerce/products/${payload.productId}/reviews`,
        payload.data,
      );
      return response.data;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: shopKeys.productReviews(variables.productId),
      });
    },
  });
}

export function useUpdateShopProductReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      reviewId: string;
      productId: string;
      data: { rating?: number; title?: string; content?: string };
    }) => {
      const response = await api.patch<SuccessResponse>(
        `/commerce/reviews/${payload.reviewId}`,
        payload.data,
      );
      return response.data;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: shopKeys.productReviews(variables.productId),
      });
    },
  });
}

export function useDeleteShopProductReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { reviewId: string; productId: string }) => {
      const response = await api.delete<SuccessResponse>(
        `/commerce/reviews/${payload.reviewId}`,
      );
      return response.data;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: shopKeys.productReviews(variables.productId),
      });
    },
  });
}

export function useActiveShopPromotions() {
  return useQuery({
    queryKey: shopKeys.promotions(),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{ items: ActivePromotion[] }>
      >('/commerce/promotions/active');
      return response.data;
    },
  });
}

export function useShopCategories() {
  return useQuery({
    queryKey: shopKeys.categories(),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{ items: ShopCategory[] }>
      >('/commerce/categories');
      return response.data;
    },
  });
}

export function useCreateShopCheckoutSession() {
  const { isAuthenticated, user } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      email?: string;
      discountCode?: string;
      referralCode?: string;
      shippingAddress?: ShopCheckoutAddress;
      billingAddress?: ShopCheckoutAddress;
      billingSameAsShipping?: boolean;
      saveAddressToProfile?: boolean;
      saveAsDefaultAddress?: boolean;
      items: Array<{ variantId: string; quantity: number }>;
    }) => {
      const endpoint = isAuthenticated
        ? '/commerce/checkout/session/auth'
        : '/commerce/checkout/session';

      const requestBody = {
        ...payload,
        email: payload.email ?? user?.email,
      };

      const response = await api.post<
        SuccessResponse<{
          orderId: string;
          orderNumber: string;
          checkoutUrl: string | null;
          sessionId: string;
        }>
      >(endpoint, requestBody);
      return response.data;
    },
  });
}

export function useShopHeaderSettings() {
  return useQuery({
    queryKey: shopKeys.headerSettings(),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<ShopHeaderSettings>>(
        '/commerce/settings/header',
      );
      return response.data;
    },
  });
}

export function useMyShopOrders(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: shopKeys.myOrders(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));

      const response = await api.get<
        SuccessResponse<{
          items: ShopOrder[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>
      >(`/commerce/orders/my?${searchParams.toString()}`);
      return response.data;
    },
  });
}

// ── Bundles ─────────────────────────────────────────────────

export interface ShopBundleItem {
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
      sku: string;
      attributes: Record<string, string> | null;
      priceInCents: number;
      compareAtPriceInCents: number | null;
      inventoryQuantity: number;
      reservedQuantity: number;
      isActive: boolean;
    }>;
  };
}

export interface ShopBundle {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceInCents: number;
  imageUrl: string | null;
  items: ShopBundleItem[];
}

export function useShopBundles() {
  return useQuery({
    queryKey: shopKeys.bundles(),
    queryFn: async () => {
      const response =
        await api.get<SuccessResponse<{ items: ShopBundle[] }>>(
          '/commerce/bundles',
        );
      return response.data;
    },
  });
}

export function useShopBundleBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: shopKeys.bundle(slug),
    enabled: Boolean(slug),
    queryFn: async () => {
      const response = await api.get<SuccessResponse<ShopBundle>>(
        `/commerce/bundles/${slug}`,
      );
      return response.data;
    },
  });
}

// ── Hero Banners ──────────────────────────────────────────

export interface ShopHeroBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  alt: string | null;
  sortOrder: number;
}

export function useShopHeroBanners() {
  return useQuery({
    queryKey: shopKeys.heroBanners(),
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{ items: ShopHeroBanner[] }>
      >('/commerce/hero-banners');
      return response.data;
    },
  });
}
