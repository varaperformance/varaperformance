import { z } from 'zod';
import { WeightUnitSchema } from './weight.schema';

export const ShopSortSchema = z.enum([
  'featured',
  'newest',
  'price-asc',
  'price-desc',
]);

export const CatalogQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  inStockOnly: z.coerce.boolean().optional().default(false),
  sort: ShopSortSchema.optional().default('featured'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(24),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const ProductIdParamsSchema = z.object({
  productId: z.uuid(),
});

export const ProductSlugParamsSchema = z.object({
  slug: z.string().min(1).max(200),
});

export const ProductReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const CreateProductReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  content: z.string().trim().max(2000).optional(),
});

export const CheckoutItemSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().min(1).max(20),
});

export const CheckoutAddressSchema = z.object({
  recipientName: z.string().min(1).max(120),
  phone: z
    .unknown()
    .transform((value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    )
    .pipe(z.string().trim().min(7).max(30).optional()),
  line1: z.string().min(1).max(120),
  line2: z.string().max(120).optional(),
  city: z.string().min(1).max(80),
  state: z.string().max(80).optional(),
  postalCode: z.string().min(2).max(20),
  country: z
    .string()
    .min(2)
    .max(2)
    .transform((value) => value.toUpperCase()),
});

export const CreateCheckoutSessionSchema = z.object({
  email: z.email(),
  successUrl: z.url().optional(),
  cancelUrl: z.url().optional(),
  discountCode: z.string().optional(),
  referralCode: z.string().optional(),
  shippingAddress: CheckoutAddressSchema.optional(),
  billingAddress: CheckoutAddressSchema.optional(),
  billingSameAsShipping: z.boolean().optional().default(true),
  saveAddressToProfile: z.boolean().optional().default(false),
  saveAsDefaultAddress: z.boolean().optional().default(false),
  items: z.array(CheckoutItemSchema).min(1),
});

export const AdminPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
});

/** Absolute http(s) URLs or app media proxy paths from StorageService.uploadBuffer */
export const StoredMediaUrlSchema = z.union([
  z.url(),
  z.string().regex(/^\/v1\/media\/file\/.+/),
]);

export const ProductImageInputSchema = z.object({
  url: StoredMediaUrlSchema,
  alt: z.string().max(200).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const VariantImageInputSchema = z.object({
  url: StoredMediaUrlSchema,
  alt: z.string().max(200).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const VariantOptionSelectionSchema = z.object({
  optionName: z.string().min(1),
  value: z.string().min(1),
});

export const ProductVariantInputSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().min(1).max(160),
  sku: z.string().min(2).max(120),
  priceInCents: z.number().int().min(0),
  compareAtPriceInCents: z.number().int().min(0).optional(),
  weight: z.number().min(0).optional(),
  weightUnit: WeightUnitSchema.optional(),
  inventoryQuantity: z.number().int().min(0).optional(),
  optionValueIds: z.array(z.uuid()).optional(),
  optionSelections: z.array(VariantOptionSelectionSchema).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  images: z.array(VariantImageInputSchema).optional(),
});

export const ProductOptionValueInputSchema = z.object({
  id: z.uuid().optional(),
  label: z.string().min(1).max(80),
  hexColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const ProductOptionInputSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(1).max(80),
  sortOrder: z.number().int().min(0).optional(),
  values: z.array(ProductOptionValueInputSchema).min(1),
});

export const CreateBrandSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120),
  logoUrl: StoredMediaUrlSchema.optional(),
  isActive: z.boolean().optional(),
});

export const UpdateBrandSchema = CreateBrandSchema.partial();

export const BrandIdParamsSchema = z.object({
  brandId: z.uuid(),
});

export const OptionIdParamsSchema = z.object({
  productId: z.uuid(),
  optionId: z.uuid(),
});

export const CreateProductSchema = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().min(2).max(160),
  description: z.string().max(4000).optional(),
  categoryId: z.uuid(),
  brandId: z.uuid().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  images: z.array(ProductImageInputSchema).optional().default([]),
  options: z.array(ProductOptionInputSchema).optional(),
  variants: z.array(ProductVariantInputSchema).min(1),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const AdjustInventoryReasonSchema = z.enum([
  'RESTOCK',
  'SALE',
  'REFUND',
  'MANUAL',
]);

export const AdjustInventorySchema = z.object({
  variantId: z.uuid(),
  delta: z.number().int(),
  reason: AdjustInventoryReasonSchema,
  note: z.string().max(500).optional(),
});

export const DiscountCodeIdParamSchema = z.object({
  discountCodeId: z.uuid(),
});

export const DiscountTypeSchema = z.enum(['PERCENT', 'FIXED']);

export const CreateDiscountCodeSchema = z.object({
  code: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  type: DiscountTypeSchema,
  percentOff: z.number().min(0).max(100).optional(),
  amountOffInCents: z.number().int().min(0).optional(),
  minSubtotalInCents: z.number().int().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  startsAt: z.iso.datetime().optional(),
  endsAt: z.iso.datetime().optional(),
  isActive: z.boolean().optional(),
});

export const UpdateDiscountCodeSchema = CreateDiscountCodeSchema.partial();

export const CreateReferralCodeSchema = z.object({
  userId: z.uuid(),
  code: z.string().min(3).max(80).optional(),
});

export type CatalogQuery = z.infer<typeof CatalogQuerySchema>;
export type ProductIdParams = z.infer<typeof ProductIdParamsSchema>;
export type ProductSlugParams = z.infer<typeof ProductSlugParamsSchema>;
export type ProductReviewsQuery = z.infer<typeof ProductReviewsQuerySchema>;
export type CreateProductReview = z.infer<typeof CreateProductReviewSchema>;
export type CheckoutItem = z.infer<typeof CheckoutItemSchema>;
export type CheckoutAddress = z.infer<typeof CheckoutAddressSchema>;
export type CreateCheckoutSession = z.infer<typeof CreateCheckoutSessionSchema>;
export type AdminPaginationQuery = z.infer<typeof AdminPaginationQuerySchema>;
export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;
export type CreateBrand = z.infer<typeof CreateBrandSchema>;
export type UpdateBrand = z.infer<typeof UpdateBrandSchema>;
export type BrandIdParams = z.infer<typeof BrandIdParamsSchema>;
export type OptionIdParams = z.infer<typeof OptionIdParamsSchema>;
export type ProductOptionInput = z.infer<typeof ProductOptionInputSchema>;
export type ProductOptionValueInput = z.infer<
  typeof ProductOptionValueInputSchema
>;
export type AdjustInventory = z.infer<typeof AdjustInventorySchema>;
export type DiscountCodeIdParam = z.infer<typeof DiscountCodeIdParamSchema>;
export type CreateDiscountCode = z.infer<typeof CreateDiscountCodeSchema>;
export type UpdateDiscountCode = z.infer<typeof UpdateDiscountCodeSchema>;
export type CreateReferralCode = z.infer<typeof CreateReferralCodeSchema>;
