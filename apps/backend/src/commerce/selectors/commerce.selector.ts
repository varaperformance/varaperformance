export const productImageSelect = {
  id: true,
  url: true,
  alt: true,
  sortOrder: true,
  createdAt: true,
} as const;

export const variantImageSelect = {
  id: true,
  url: true,
  alt: true,
  sortOrder: true,
  createdAt: true,
} as const;

export const productOptionValueSelect = {
  id: true,
  label: true,
  hexColor: true,
  sortOrder: true,
} as const;

export const productOptionSelect = {
  id: true,
  name: true,
  sortOrder: true,
  values: {
    select: productOptionValueSelect,
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

export const inventoryRecordSelect = {
  id: true,
  variantId: true,
  quantityOnHand: true,
  quantityReserved: true,
  reorderPoint: true,
  updatedAt: true,
} as const;

export const productVariantSelect = {
  id: true,
  productId: true,
  title: true,
  sku: true,
  attributes: true,
  priceInCents: true,
  compareAtPriceInCents: true,
  currency: true,
  weight: true,
  weightUnit: true,
  inventoryQuantity: true,
  reservedQuantity: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  optionValues: {
    select: {
      id: true,
      optionValue: {
        select: {
          id: true,
          label: true,
          hexColor: true,
          option: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
  variantImages: {
    select: variantImageSelect,
    orderBy: { sortOrder: 'asc' as const },
  },
  inventoryRecord: {
    select: inventoryRecordSelect,
  },
} as const;

export const brandSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const productSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  categoryId: true,
  brandId: true,
  isActive: true,
  isFeatured: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const productWithCatalogSelect = {
  ...productSelect,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  brand: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
    },
  },
  options: {
    select: productOptionSelect,
    orderBy: { sortOrder: 'asc' as const },
  },
  images: {
    select: productImageSelect,
    orderBy: { sortOrder: 'asc' as const },
  },
  variants: {
    select: productVariantSelect,
    where: { isActive: true },
  },
} as const;

export const productWithAdminSelect = {
  ...productSelect,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      sortOrder: true,
    },
  },
  brand: {
    select: brandSelect,
  },
  options: {
    select: productOptionSelect,
    orderBy: { sortOrder: 'asc' as const },
  },
  images: {
    select: productImageSelect,
    orderBy: { sortOrder: 'asc' as const },
  },
  variants: {
    select: productVariantSelect,
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

export const shopOrderItemSelect = {
  id: true,
  orderId: true,
  productId: true,
  variantId: true,
  name: true,
  sku: true,
  quantity: true,
  unitPriceInCents: true,
  totalInCents: true,
  attributes: true,
} as const;

export const shopOrderSelect = {
  id: true,
  orderNumber: true,
  userId: true,
  email: true,
  status: true,
  fulfillmentStatus: true,
  currency: true,
  subtotalInCents: true,
  discountInCents: true,
  shippingInCents: true,
  taxInCents: true,
  totalInCents: true,
  stripeCheckoutSessionId: true,
  stripePaymentIntentId: true,
  discountCodeId: true,
  referralCodeId: true,
  paidAt: true,
  refundedAt: true,
  trackingNumber: true,
  carrier: true,
  shippedAt: true,
  notes: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const shopOrderWithRelationsSelect = {
  ...shopOrderSelect,
  items: {
    select: shopOrderItemSelect,
  },
  discountCode: {
    select: {
      id: true,
      code: true,
      type: true,
      percentOff: true,
      amountOffInCents: true,
    },
  },
  referralCode: {
    select: {
      id: true,
      code: true,
      userId: true,
    },
  },
  user: {
    select: {
      id: true,
      email: true,
      profile: { select: { displayName: true } },
    },
  },
} as const;

export const discountCodeSelect = {
  id: true,
  code: true,
  description: true,
  type: true,
  percentOff: true,
  amountOffInCents: true,
  minSubtotalInCents: true,
  usageLimit: true,
  usedCount: true,
  startsAt: true,
  endsAt: true,
  isActive: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const discountCodeWithCreatorSelect = {
  ...discountCodeSelect,
  createdBy: {
    select: {
      id: true,
      email: true,
      profile: { select: { displayName: true } },
    },
  },
} as const;

export const referralCodeSelect = {
  id: true,
  userId: true,
  code: true,
  clickCount: true,
  conversionCount: true,
  rewardAmountInCents: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const referralCodeWithRelationsSelect = {
  ...referralCodeSelect,
  user: {
    select: {
      id: true,
      email: true,
      profile: { select: { displayName: true } },
    },
  },
  _count: {
    select: {
      orders: true,
    },
  },
} as const;
