import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import { StripeService } from '../payment/services/stripe.service';
import { NotificationService } from '../notification/notification.service';
import { Prisma } from '@generated/prisma';
import type {
  CheckoutAddress,
  CreateBrand,
  CreateReferralCode,
  CreateCheckoutSession,
  CreateDiscountCode,
  CreateProductReview,
  CreateProduct,
  ErrorResponse,
  ProductOptionInput,
  SuccessResponse,
  UpdateBrand,
  UpdateDiscountCode,
  UpdateProduct,
} from '@varaperformance/core';
import {
  brandSelect,
  discountCodeWithCreatorSelect,
  productWithAdminSelect,
  productWithCatalogSelect,
  referralCodeWithRelationsSelect,
  shopOrderItemSelect,
  shopOrderWithRelationsSelect,
} from './selectors';

const SHOP_FREE_SHIPPING_MESSAGE_KEY =
  'commerce.shop.header.free_shipping_message';
const SHOP_NAV_LINKS_KEY = 'commerce.shop.header.nav_links';

type ShopHeaderNavLink = {
  label: string;
  to: string;
  hasDropdown?: boolean;
};

const DEFAULT_SHOP_NAV_LINKS: ShopHeaderNavLink[] = [
  { to: '/shop?category=All', label: 'All Products' },
  {
    to: '/shop?category=Pre-Workout',
    label: 'Pre-Workouts',
    hasDropdown: true,
  },
  { to: '/shop?category=Protein', label: 'Protein', hasDropdown: true },
  {
    to: '/shop?category=Performance',
    label: 'Performance',
    hasDropdown: true,
  },
  { to: '/shop?category=Recovery', label: 'Recovery', hasDropdown: true },
  { to: '/shop?category=Gear', label: 'Apparel', hasDropdown: true },
  { to: '/shop#stacks', label: 'Stack & Save' },
];

@Injectable()
export class CommerceService {
  private readonly logger = new Logger(CommerceService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
    private readonly stripeService: StripeService,
    private readonly notificationService: NotificationService,
  ) {}

  private buildOrderNumber(): string {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `VP-${Date.now()}-${random}`;
  }

  private asMetadataRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private normalizeCheckoutAddress(address: CheckoutAddress) {
    return {
      recipientName: address.recipientName.trim(),
      phone: address.phone?.trim() || null,
      line1: address.line1.trim(),
      line2: address.line2?.trim() || null,
      city: address.city.trim(),
      state: address.state?.trim() || null,
      postalCode: address.postalCode.trim(),
      country: address.country.trim().toUpperCase(),
    };
  }

  private encryptAddress(address: {
    label: string | null;
    recipientName: string;
    phone: string | null;
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
  }) {
    return this.encryption.encrypt(JSON.stringify(address));
  }

  private decryptAddress(address: {
    eAddress: Uint8Array | null;
    addressIv: Uint8Array | null;
    addressAuthTag: Uint8Array | null;
    addressWrappedKey: Uint8Array | null;
  }) {
    if (
      !address.eAddress ||
      !address.addressIv ||
      !address.addressAuthTag ||
      !address.addressWrappedKey
    ) {
      return null;
    }

    try {
      const decrypted = this.encryption.decrypt({
        encryptedContent: Buffer.from(address.eAddress),
        contentIv: Buffer.from(address.addressIv),
        contentAuthTag: Buffer.from(address.addressAuthTag),
        wrappedKey: Buffer.from(address.addressWrappedKey),
      });
      return JSON.parse(decrypted.toString()) as {
        label?: string | null;
        recipientName?: string;
        phone?: string | null;
        line1?: string;
        line2?: string | null;
        city?: string;
        state?: string | null;
        postalCode?: string;
        country?: string;
      };
    } catch {
      return null;
    }
  }

  private async saveAddressForUser(
    userId: string,
    address: CheckoutAddress,
    options?: { makeDefault?: boolean },
  ) {
    const normalized = this.normalizeCheckoutAddress(address);
    const addressForStorage = {
      label: 'Shipping',
      ...normalized,
    };
    const encryptedAddress = this.encryptAddress(addressForStorage);
    const makeDefault = Boolean(options?.makeDefault);

    await this.db.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.profileAddress.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const existingAddresses = await tx.profileAddress.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });

      const existing = existingAddresses.find((row) => {
        const decrypted = this.decryptAddress(row);
        if (!decrypted) {
          return false;
        }

        return (
          decrypted.recipientName === normalized.recipientName &&
          decrypted.line1 === normalized.line1 &&
          (decrypted.line2 ?? null) === normalized.line2 &&
          decrypted.city === normalized.city &&
          (decrypted.state ?? null) === normalized.state &&
          decrypted.postalCode === normalized.postalCode &&
          decrypted.country === normalized.country
        );
      });

      if (existing) {
        await tx.profileAddress.update({
          where: { id: existing.id },
          data: {
            eAddress: encryptedAddress.encryptedContent,
            addressIv: encryptedAddress.contentIv,
            addressAuthTag: encryptedAddress.contentAuthTag,
            addressWrappedKey: encryptedAddress.wrappedKey,
            ...(makeDefault ? { isDefault: true } : {}),
          },
        });
        return;
      }

      await tx.profileAddress.create({
        data: {
          userId,
          eAddress: encryptedAddress.encryptedContent,
          addressIv: encryptedAddress.contentIv,
          addressAuthTag: encryptedAddress.contentAuthTag,
          addressWrappedKey: encryptedAddress.wrappedKey,
          isDefault: makeDefault,
        },
      });
    });
  }

  private toCategorySlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private serializeProduct<
    T extends { category: { id: string; name: string; slug: string } },
  >(product: T) {
    return {
      ...product,
      categoryId: product.category.id,
      category: product.category.name,
      categorySlug: product.category.slug,
    };
  }

  private async resolveDiscount(
    code: string | undefined,
    subtotalInCents: number,
  ): Promise<{ discountCodeId?: string; amount: number }> {
    if (!code) {
      return { amount: 0 };
    }

    const discount = await this.db.discountCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!discount || !discount.isActive) {
      return { amount: 0 };
    }

    const now = new Date();
    if (discount.startsAt && discount.startsAt > now) {
      return { amount: 0 };
    }
    if (discount.endsAt && discount.endsAt < now) {
      return { amount: 0 };
    }
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return { amount: 0 };
    }
    if (
      discount.minSubtotalInCents &&
      subtotalInCents < discount.minSubtotalInCents
    ) {
      return { amount: 0 };
    }

    if (discount.type === 'PERCENT' && discount.percentOff) {
      return {
        discountCodeId: discount.id,
        amount: Math.round((subtotalInCents * discount.percentOff) / 100),
      };
    }

    if (discount.type === 'FIXED' && discount.amountOffInCents) {
      return {
        discountCodeId: discount.id,
        amount: Math.min(subtotalInCents, discount.amountOffInCents),
      };
    }

    return { amount: 0 };
  }

  private normalizeShopNavLinks(value: string | null): ShopHeaderNavLink[] {
    if (!value) return DEFAULT_SHOP_NAV_LINKS;

    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        return DEFAULT_SHOP_NAV_LINKS;
      }

      const normalized = parsed
        .map((entry) => {
          const candidate = entry as {
            label?: unknown;
            to?: unknown;
            hasDropdown?: unknown;
          };

          const label =
            typeof candidate.label === 'string' ? candidate.label.trim() : '';
          const to =
            typeof candidate.to === 'string' ? candidate.to.trim() : '';
          const hasDropdown = Boolean(candidate.hasDropdown);

          if (!label || !to) {
            return null;
          }

          return {
            label,
            to,
            hasDropdown,
          };
        })
        .filter((item) => item !== null);

      return normalized.length ? normalized : DEFAULT_SHOP_NAV_LINKS;
    } catch {
      return DEFAULT_SHOP_NAV_LINKS;
    }
  }

  private validateShopNavLinks(navLinks: ShopHeaderNavLink[]) {
    if (navLinks.length === 0) {
      throw new BadRequestException('At least one shop nav link is required');
    }

    if (navLinks.length > 12) {
      throw new BadRequestException('Maximum 12 shop nav links allowed');
    }

    for (const [index, link] of navLinks.entries()) {
      if (!link.label || link.label.length > 40) {
        throw new BadRequestException(
          `Link ${index + 1}: label is required and must be <= 40 chars`,
        );
      }

      if (!link.to.startsWith('/shop')) {
        throw new BadRequestException(
          `Link ${index + 1}: only /shop routes are allowed`,
        );
      }

      if (link.hasDropdown) {
        const [path, query = ''] = link.to.split('?');
        const params = new URLSearchParams(query);
        const category = params.get('category')?.trim();

        if (path !== '/shop' || !category || category === 'All') {
          throw new BadRequestException(
            `Link ${index + 1}: dropdown links must be /shop?category=<Category>`,
          );
        }
      }
    }
  }

  async getShopHeaderSettings() {
    const [freeShippingSetting, navLinksSetting] = await Promise.all([
      this.db.platformSetting.findUnique({
        where: { key: SHOP_FREE_SHIPPING_MESSAGE_KEY },
        select: { value: true },
      }),
      this.db.platformSetting.findUnique({
        where: { key: SHOP_NAV_LINKS_KEY },
        select: { value: true },
      }),
    ]);

    return {
      success: true,
      data: {
        freeShippingMessage:
          freeShippingSetting?.value?.trim() || 'Free Shipping on Orders $75+',
        navLinks: this.normalizeShopNavLinks(navLinksSetting?.value ?? null),
      },
    };
  }

  async listShopCategories(options?: { includeInactive?: boolean }) {
    const includeInactive = Boolean(options?.includeInactive);
    const items = await this.db.shopCategory.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          where: includeInactive ? undefined : { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });

    return { success: true, data: { items } };
  }

  async createShopCategory(input: {
    name: string;
    slug?: string;
    parentId?: string;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    const name = input.name.trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }

    const slug = (input.slug?.trim() || this.toCategorySlug(name)).slice(
      0,
      120,
    );
    if (!slug) {
      throw new BadRequestException('Category slug is required');
    }

    const existing = await this.db.shopCategory.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { slug: { equals: slug, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        'A category with this name or slug already exists',
      );
    }

    const category = await this.db.shopCategory.create({
      data: {
        name,
        slug,
        parentId: input.parentId ?? null,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    return { success: true, data: { category } };
  }

  async updateShopCategory(
    categoryId: string,
    input: {
      name?: string;
      slug?: string;
      parentId?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    const existing = await this.db.shopCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!existing) {
      throw new BadRequestException('Category not found');
    }

    const normalizedName =
      typeof input.name === 'string' ? input.name.trim() : undefined;
    const derivedSlug =
      typeof input.slug === 'string'
        ? input.slug.trim()
        : normalizedName
          ? this.toCategorySlug(normalizedName)
          : undefined;

    if (typeof normalizedName === 'string' && !normalizedName) {
      throw new BadRequestException('Category name cannot be empty');
    }

    if (typeof derivedSlug === 'string' && !derivedSlug) {
      throw new BadRequestException('Category slug cannot be empty');
    }

    const duplicate = await this.db.shopCategory.findFirst({
      where: {
        id: { not: categoryId },
        OR: [
          ...(normalizedName
            ? [
                {
                  name: {
                    equals: normalizedName,
                    mode: 'insensitive' as const,
                  },
                },
              ]
            : []),
          ...(derivedSlug
            ? [{ slug: { equals: derivedSlug, mode: 'insensitive' as const } }]
            : []),
        ],
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException(
        'A category with this name or slug already exists',
      );
    }

    const category = await this.db.shopCategory.update({
      where: { id: categoryId },
      data: {
        name: normalizedName,
        slug: derivedSlug,
        parentId: input.parentId !== undefined ? input.parentId : undefined,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
    });

    return { success: true, data: { category } };
  }

  async deleteShopCategory(categoryId: string) {
    const existing = await this.db.shopCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true },
    });

    if (!existing) {
      throw new BadRequestException('Category not found');
    }

    const productCount = await this.db.product.count({
      where: { categoryId },
    });

    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${productCount} assigned product${productCount === 1 ? '' : 's'}`,
      );
    }

    await this.db.shopCategory.delete({ where: { id: categoryId } });

    return { success: true, data: { id: categoryId } };
  }

  async updateShopHeaderSettings(
    input: {
      freeShippingMessage?: string;
      navLinks?: ShopHeaderNavLink[];
    },
    userId?: string,
  ) {
    const updates: Array<Promise<unknown>> = [];

    if (typeof input.freeShippingMessage === 'string') {
      updates.push(
        this.db.platformSetting.upsert({
          where: { key: SHOP_FREE_SHIPPING_MESSAGE_KEY },
          update: {
            value: input.freeShippingMessage.trim(),
            updatedBy: userId,
          },
          create: {
            key: SHOP_FREE_SHIPPING_MESSAGE_KEY,
            value: input.freeShippingMessage.trim(),
            updatedBy: userId,
          },
        }),
      );
    }

    if (Array.isArray(input.navLinks)) {
      const normalized = input.navLinks
        .map((item) => ({
          label: item.label?.trim() ?? '',
          to: item.to?.trim() ?? '',
          hasDropdown: Boolean(item.hasDropdown),
        }))
        .filter((item) => item.label && item.to);

      this.validateShopNavLinks(normalized);

      updates.push(
        this.db.platformSetting.upsert({
          where: { key: SHOP_NAV_LINKS_KEY },
          update: {
            value: JSON.stringify(normalized),
            updatedBy: userId,
          },
          create: {
            key: SHOP_NAV_LINKS_KEY,
            value: JSON.stringify(normalized),
            updatedBy: userId,
          },
        }),
      );
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    return this.getShopHeaderSettings();
  }

  // ── Brands ───────────────────────────────────────────────

  async listBrands(options?: { includeInactive?: boolean }) {
    const includeInactive = Boolean(options?.includeInactive);
    const items = await this.db.brand.findMany({
      where: includeInactive ? undefined : { isActive: true },
      select: brandSelect,
      orderBy: { name: 'asc' },
    });
    return { success: true, data: { items } };
  }

  async createBrand(payload: CreateBrand) {
    const name = payload.name.trim();
    if (!name) throw new BadRequestException('Brand name is required');

    const slug = payload.slug.trim();
    if (!slug) throw new BadRequestException('Brand slug is required');

    const existing = await this.db.brand.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { slug: { equals: slug, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        'A brand with this name or slug already exists',
      );
    }

    const brand = await this.db.brand.create({
      data: {
        name,
        slug,
        logoUrl: payload.logoUrl ?? null,
        isActive: payload.isActive ?? true,
      },
      select: brandSelect,
    });

    return { success: true, data: { brand } };
  }

  async updateBrand(brandId: string, payload: UpdateBrand) {
    const existing = await this.db.brand.findUnique({
      where: { id: brandId },
      select: { id: true },
    });
    if (!existing) throw new BadRequestException('Brand not found');

    const normalizedName =
      typeof payload.name === 'string' ? payload.name.trim() : undefined;
    const normalizedSlug =
      typeof payload.slug === 'string' ? payload.slug.trim() : undefined;

    if (normalizedName || normalizedSlug) {
      const duplicate = await this.db.brand.findFirst({
        where: {
          id: { not: brandId },
          OR: [
            ...(normalizedName
              ? [
                  {
                    name: {
                      equals: normalizedName,
                      mode: 'insensitive' as const,
                    },
                  },
                ]
              : []),
            ...(normalizedSlug
              ? [
                  {
                    slug: {
                      equals: normalizedSlug,
                      mode: 'insensitive' as const,
                    },
                  },
                ]
              : []),
          ],
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new BadRequestException(
          'A brand with this name or slug already exists',
        );
      }
    }

    const brand = await this.db.brand.update({
      where: { id: brandId },
      data: {
        name: normalizedName,
        slug: normalizedSlug,
        logoUrl: payload.logoUrl,
        isActive: payload.isActive,
      },
      select: brandSelect,
    });

    return { success: true, data: { brand } };
  }

  async deleteBrand(brandId: string) {
    const existing = await this.db.brand.findUnique({
      where: { id: brandId },
      select: { id: true },
    });
    if (!existing) throw new BadRequestException('Brand not found');

    const productCount = await this.db.product.count({
      where: { brandId },
    });
    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete brand with ${productCount} assigned product${productCount === 1 ? '' : 's'}`,
      );
    }

    await this.db.brand.delete({ where: { id: brandId } });
    return { success: true, data: { id: brandId } };
  }

  // ── Product Options ─────────────────────────────────────

  async addProductOption(productId: string, input: ProductOptionInput) {
    const product = await this.db.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new BadRequestException('Product not found');

    const option = await this.db.productOption.create({
      data: {
        productId,
        name: input.name.trim(),
        sortOrder: input.sortOrder ?? 0,
        values: {
          create: input.values.map((v, i) => ({
            label: v.label.trim(),
            hexColor: v.hexColor ?? null,
            sortOrder: v.sortOrder ?? i,
          })),
        },
      },
      include: {
        values: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return { success: true, data: { option } };
  }

  async updateProductOption(
    productId: string,
    optionId: string,
    input: Partial<ProductOptionInput>,
  ) {
    const option = await this.db.productOption.findFirst({
      where: { id: optionId, productId },
      select: { id: true },
    });
    if (!option) throw new BadRequestException('Option not found');

    const updated = await this.db.productOption.update({
      where: { id: optionId },
      data: {
        name: input.name?.trim(),
        sortOrder: input.sortOrder,
        ...(input.values
          ? {
              values: {
                deleteMany: {},
                create: input.values.map((v, i) => ({
                  label: v.label.trim(),
                  hexColor: v.hexColor ?? null,
                  sortOrder: v.sortOrder ?? i,
                })),
              },
            }
          : {}),
      },
      include: {
        values: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return { success: true, data: { option: updated } };
  }

  async deleteProductOption(productId: string, optionId: string) {
    const option = await this.db.productOption.findFirst({
      where: { id: optionId, productId },
      select: { id: true },
    });
    if (!option) throw new BadRequestException('Option not found');

    await this.db.productOption.delete({ where: { id: optionId } });
    return { success: true, data: { id: optionId } };
  }

  async addProductOptionValue(
    productId: string,
    optionId: string,
    input: { label: string; hexColor?: string; sortOrder?: number },
  ) {
    const option = await this.db.productOption.findFirst({
      where: { id: optionId, productId },
      select: { id: true },
    });
    if (!option) throw new BadRequestException('Option not found');

    const value = await this.db.productOptionValue.create({
      data: {
        optionId,
        label: input.label.trim(),
        hexColor: input.hexColor ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    return { success: true, data: { value } };
  }

  // ── Catalog ─────────────────────────────────────────────

  async getCatalog(query: {
    category?: string;
    search?: string;
    inStockOnly?: boolean;
    sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc';
    limit?: number;
    offset?: number;
  }): Promise<SuccessResponse> {
    const limit = query.limit ?? 24;
    const offset = query.offset ?? 0;

    const normalizedCategorySlug = query.category
      ? this.toCategorySlug(query.category)
      : null;

    const products = await this.db.product.findMany({
      where: {
        isActive: true,
        ...(query.category && query.category !== 'All'
          ? {
              category: {
                OR: [
                  { name: { equals: query.category, mode: 'insensitive' } },
                  ...(normalizedCategorySlug
                    ? [{ slug: normalizedCategorySlug }]
                    : []),
                ],
              },
            }
          : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                {
                  description: { contains: query.search, mode: 'insensitive' },
                },
              ],
            }
          : {}),
      },
      select: productWithCatalogSelect,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });

    const withComputed = products
      .map((product) => {
        const availableVariants = product.variants.filter(
          (variant) => variant.inventoryQuantity - variant.reservedQuantity > 0,
        );
        const minPrice =
          product.variants.length > 0
            ? Math.min(
                ...product.variants.map((variant) => variant.priceInCents),
              )
            : 0;
        return {
          ...this.serializeProduct(product),
          inStock: availableVariants.length > 0,
          minPriceInCents: minPrice,
        };
      })
      .filter((product) => (query.inStockOnly ? product.inStock : true));

    const sorted = [...withComputed].sort((a, b) => {
      if (query.sort === 'price-asc')
        return a.minPriceInCents - b.minPriceInCents;
      if (query.sort === 'price-desc')
        return b.minPriceInCents - a.minPriceInCents;
      if (query.sort === 'newest')
        return b.createdAt.getTime() - a.createdAt.getTime();
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return {
      success: true,
      data: {
        items: sorted.slice(offset, offset + limit),
        total: sorted.length,
        limit,
        offset,
      },
    };
  }

  async getProduct(
    productId: string,
  ): Promise<SuccessResponse | ErrorResponse> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
      select: productWithCatalogSelect,
    });

    if (!product || !product.isActive) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found',
        },
      };
    }

    return { success: true, data: { product: this.serializeProduct(product) } };
  }

  async getProductBySlug(
    slug: string,
  ): Promise<SuccessResponse | ErrorResponse> {
    const product = await this.db.product.findUnique({
      where: { slug },
      select: productWithCatalogSelect,
    });

    if (!product || !product.isActive) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found',
        },
      };
    }

    return { success: true, data: { product: this.serializeProduct(product) } };
  }

  async getProductReviews(
    productId: string,
    page = 1,
    limit = 10,
  ): Promise<SuccessResponse | ErrorResponse> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true },
    });

    if (!product || !product.isActive) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found',
        },
      };
    }

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const [rows, totals] = await Promise.all([
      this.db.$queryRaw<
        Array<{
          id: string;
          productId: string;
          userId: string;
          rating: number;
          title: string | null;
          content: string | null;
          isVerified: boolean;
          createdAt: Date;
          updatedAt: Date;
          displayName: string | null;
          avatarUrl: string | null;
        }>
      >`
        SELECT
          r."id",
          r."productId",
          r."userId",
          r."rating",
          r."title",
          r."content",
          r."isVerified",
          r."createdAt",
          r."updatedAt",
          p."displayName",
          p."avatarUrl"
        FROM "ShopProductReview" r
        LEFT JOIN "Profile" p ON p."userId" = r."userId"
        WHERE r."productId" = ${productId}
        ORDER BY r."createdAt" DESC
        LIMIT ${safeLimit}
        OFFSET ${offset}
      `,
      this.db.$queryRaw<
        Array<{ reviewCount: bigint; averageRating: number | null }>
      >`
        SELECT
          COUNT(*)::bigint AS "reviewCount",
          AVG(r."rating")::float AS "averageRating"
        FROM "ShopProductReview" r
        WHERE r."productId" = ${productId}
      `,
    ]);

    const summary = totals[0] ?? {
      reviewCount: BigInt(0),
      averageRating: null,
    };
    const reviewCount = Number(summary.reviewCount);
    const averageRating = summary.averageRating ?? 0;

    return {
      success: true,
      data: {
        items: rows.map((row) => ({
          id: row.id,
          productId: row.productId,
          userId: row.userId,
          rating: row.rating,
          title: row.title,
          content: row.content,
          isVerified: row.isVerified,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          user: {
            displayName: row.displayName,
            avatarUrl: row.avatarUrl,
          },
        })),
        total: reviewCount,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(1, Math.ceil(reviewCount / safeLimit)),
        averageRating,
        reviewCount,
      },
    };
  }

  async createProductReview(
    userId: string,
    productId: string,
    input: CreateProductReview,
  ): Promise<SuccessResponse | ErrorResponse> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true },
    });

    if (!product || !product.isActive) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found',
        },
      };
    }

    const normalizedTitle = input.title?.trim() || null;
    const normalizedContent = input.content?.trim() || null;

    const purchaseCheck = await this.db.$queryRaw<
      Array<{ hasPurchased: boolean }>
    >`
      SELECT EXISTS (
        SELECT 1
        FROM "ShopOrderItem" item
        INNER JOIN "ShopOrder" ord ON ord."id" = item."orderId"
        WHERE item."productId" = ${productId}
          AND ord."userId" = ${userId}
          AND ord."status" = 'PAID'
      ) AS "hasPurchased"
    `;
    const hasPurchased = purchaseCheck[0]?.hasPurchased ?? false;

    const review = await this.db.shopProductReview.upsert({
      where: {
        productId_userId: { productId, userId },
      },
      create: {
        productId,
        userId,
        rating: input.rating,
        title: normalizedTitle,
        content: normalizedContent,
        isVerified: hasPurchased,
      },
      update: {
        rating: input.rating,
        title: normalizedTitle,
        content: normalizedContent,
        isVerified: hasPurchased,
      },
    });

    return {
      success: true,
      data: {
        review: {
          id: review.id,
          productId: review.productId,
          userId: review.userId,
          rating: review.rating,
          title: review.title,
          content: review.content,
          isVerified: review.isVerified,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
        },
      },
      message: 'Review saved',
    };
  }

  async updateProductReview(
    reviewId: string,
    input: { rating?: number; title?: string; content?: string },
  ): Promise<SuccessResponse | ErrorResponse> {
    const existing = await this.db.$queryRaw<
      Array<{ id: string }>
    >`SELECT "id" FROM "ShopProductReview" WHERE "id" = ${reviewId}`;

    if (existing.length === 0) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review not found' },
      };
    }

    const updated = await this.db.$queryRaw<
      Array<{
        id: string;
        productId: string;
        userId: string;
        rating: number;
        title: string | null;
        content: string | null;
        isVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`
      UPDATE "ShopProductReview"
      SET
        "rating" = COALESCE(${input.rating ?? null}::int, "rating"),
        "title" = COALESCE(${input.title?.trim() ?? null}, "title"),
        "content" = COALESCE(${input.content?.trim() ?? null}, "content"),
        "updatedAt" = NOW()
      WHERE "id" = ${reviewId}
      RETURNING
        "id", "productId", "userId", "rating", "title",
        "content", "isVerified", "createdAt", "updatedAt"
    `;

    const review = updated[0];

    return {
      success: true,
      data: {
        review: {
          id: review.id,
          productId: review.productId,
          userId: review.userId,
          rating: review.rating,
          title: review.title,
          content: review.content,
          isVerified: review.isVerified,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
        },
      },
      message: 'Review updated',
    };
  }

  async deleteProductReview(
    reviewId: string,
  ): Promise<SuccessResponse | ErrorResponse> {
    const existing = await this.db.$queryRaw<
      Array<{ id: string }>
    >`SELECT "id" FROM "ShopProductReview" WHERE "id" = ${reviewId}`;

    if (existing.length === 0) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review not found' },
      };
    }

    await this.db.$queryRaw`
      DELETE FROM "ShopProductReview" WHERE "id" = ${reviewId}
    `;

    return { success: true, data: null, message: 'Review deleted' };
  }

  async getActivePromotions() {
    const now = new Date();
    const items = await this.db.discountCode.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      select: {
        id: true,
        code: true,
        description: true,
        type: true,
        percentOff: true,
        amountOffInCents: true,
        startsAt: true,
        endsAt: true,
      },
      orderBy: [{ percentOff: 'desc' }, { amountOffInCents: 'desc' }],
      take: 3,
    });

    return { success: true, data: { items } };
  }

  async createCheckoutSession(
    input: CreateCheckoutSession,
    options?: { userId?: string; emailOverride?: string },
  ): Promise<SuccessResponse | ErrorResponse> {
    if (!this.stripeService.isConfigured()) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Stripe is not configured',
        },
      };
    }

    const variants = await this.db.productVariant.findMany({
      where: {
        id: { in: input.items.map((item) => item.variantId) },
        isActive: true,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (variants.length !== input.items.length) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'One or more variants are invalid',
        },
      };
    }

    const quantityByVariant = new Map(
      input.items.map((item) => [item.variantId, item.quantity]),
    );

    for (const variant of variants) {
      const requested = quantityByVariant.get(variant.id) ?? 0;
      const available = variant.inventoryQuantity - variant.reservedQuantity;
      if (requested > available) {
        return {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: `${variant.sku} does not have enough stock`,
          },
        };
      }
    }

    const subtotalInCents = variants.reduce((total, variant) => {
      const qty = quantityByVariant.get(variant.id) ?? 0;
      return total + variant.priceInCents * qty;
    }, 0);

    const discount = await this.resolveDiscount(
      input.discountCode,
      subtotalInCents,
    );
    const discountInCents = discount.amount;
    const totalInCents = Math.max(0, subtotalInCents - discountInCents);

    let referralCodeId: string | undefined;
    if (input.referralCode) {
      const referral = await this.db.referralCode.findUnique({
        where: { code: input.referralCode.toUpperCase() },
      });
      if (referral?.isActive) {
        referralCodeId = referral.id;
      }
    }

    const orderEmail = options?.emailOverride ?? input.email;
    const shippingAddress = input.shippingAddress
      ? this.normalizeCheckoutAddress(input.shippingAddress)
      : null;
    const billingAddress = input.billingAddress
      ? this.normalizeCheckoutAddress(input.billingAddress)
      : input.billingSameAsShipping !== false && shippingAddress
        ? shippingAddress
        : null;

    const metadata: Record<string, string> = {
      source: 'SHOP',
      orderId: '',
    };

    const order = await this.db.shopOrder.create({
      data: {
        orderNumber: this.buildOrderNumber(),
        email: orderEmail,
        ...this.encryptOrderEmail(orderEmail),
        userId: options?.userId,
        status: 'PENDING',
        subtotalInCents,
        discountInCents,
        totalInCents,
        discountCodeId: discount.discountCodeId,
        referralCodeId,
        metadata:
          shippingAddress || billingAddress
            ? {
                checkoutAddress: {
                  shipping: shippingAddress,
                  billing: billingAddress,
                  billingSameAsShipping: input.billingSameAsShipping !== false,
                },
              }
            : undefined,
        items: {
          create: variants.map((variant) => {
            const quantity = quantityByVariant.get(variant.id) ?? 0;
            return {
              productId: variant.productId,
              variantId: variant.id,
              name: variant.product.name,
              sku: variant.sku,
              quantity,
              unitPriceInCents: variant.priceInCents,
              totalInCents: variant.priceInCents * quantity,
              attributes: variant.attributes ?? undefined,
            };
          }),
        },
      },
      include: {
        items: {
          select: shopOrderItemSelect,
        },
      },
    });

    await Promise.all(
      variants.map((variant) =>
        this.db.productVariant.update({
          where: { id: variant.id },
          data: {
            reservedQuantity: {
              increment: quantityByVariant.get(variant.id) ?? 0,
            },
          },
        }),
      ),
    );

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

    metadata.orderId = order.id;
    if (options?.userId) {
      metadata.userId = options.userId;
    }

    const session = await this.stripeService
      .getClient()
      .checkout.sessions.create({
        mode: 'payment',
        customer_email: orderEmail,
        success_url:
          input.successUrl ??
          `${frontendUrl}/shop/checkout/confirmation?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:
          input.cancelUrl ??
          `${frontendUrl}/shop/checkout/review?status=cancelled&orderId=${order.id}`,
        line_items: variants.map((variant) => ({
          quantity: quantityByVariant.get(variant.id) ?? 0,
          price_data: {
            currency: 'usd',
            unit_amount: variant.priceInCents,
            product_data: {
              name: variant.product.name,
              description: variant.product.description ?? undefined,
              metadata: {
                variantId: variant.id,
                productId: variant.productId,
              },
            },
          },
        })),
        metadata,
        payment_intent_data: {
          metadata,
        },
      });

    await this.db.shopOrder.update({
      where: { id: order.id },
      data: {
        stripeCheckoutSessionId: session.id,
      },
    });

    if (
      options?.userId &&
      input.saveAddressToProfile &&
      input.shippingAddress
    ) {
      await this.saveAddressForUser(options.userId, input.shippingAddress, {
        makeDefault: input.saveAsDefaultAddress,
      });
    }

    return {
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    };
  }

  async listAdminCatalog() {
    const items = await this.db.product.findMany({
      select: productWithAdminSelect,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: { items: items.map((item) => this.serializeProduct(item)) },
    };
  }

  async createProduct(payload: CreateProduct) {
    const category = await this.db.shopCategory.findUnique({
      where: { id: payload.categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new BadRequestException('Category not found');
    }

    if (payload.brandId) {
      const brand = await this.db.brand.findUnique({
        where: { id: payload.brandId },
        select: { id: true },
      });
      if (!brand) throw new BadRequestException('Brand not found');
    }

    const product = await this.db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: payload.name,
          slug: payload.slug,
          description: payload.description,
          categoryId: payload.categoryId,
          brandId: payload.brandId ?? null,
          isActive: payload.isActive ?? true,
          isFeatured: payload.isFeatured ?? false,
          images: {
            create: (payload.images ?? []).map((image, index) => ({
              url: image.url,
              alt: image.alt,
              sortOrder: image.sortOrder ?? index,
            })),
          },
          ...(payload.options?.length
            ? {
                options: {
                  create: payload.options.map((opt, oi) => ({
                    name: opt.name.trim(),
                    sortOrder: opt.sortOrder ?? oi,
                    values: {
                      create: opt.values.map((v, vi) => ({
                        label: v.label.trim(),
                        hexColor: v.hexColor ?? null,
                        sortOrder: v.sortOrder ?? vi,
                      })),
                    },
                  })),
                },
              }
            : {}),
          variants: {
            create: payload.variants.map((variant) => ({
              title: variant.title,
              sku: variant.sku,
              priceInCents: variant.priceInCents,
              compareAtPriceInCents: variant.compareAtPriceInCents,
              weight: variant.weight ?? null,
              weightUnit: variant.weightUnit ?? null,
              inventoryQuantity: variant.inventoryQuantity ?? 0,
              attributes: variant.attributes,
            })),
          },
        },
        select: { id: true, variants: { select: { id: true } } },
      });

      // Create InventoryRecord for each variant
      if (created.variants.length > 0) {
        await tx.inventoryRecord.createMany({
          data: created.variants.map((v) => ({
            variantId: v.id,
            quantityOnHand:
              payload.variants.find((_, i) => created.variants[i]?.id === v.id)
                ?.inventoryQuantity ?? 0,
          })),
        });
      }

      // Build option name+label → ID lookup for optionSelections resolution
      let optionValueLookup: Map<string, string> | undefined;
      const hasAnySelections = payload.variants.some(
        (v) => v.optionSelections?.length,
      );
      if (hasAnySelections) {
        const createdOptions = await tx.productOption.findMany({
          where: { productId: created.id },
          select: {
            name: true,
            values: { select: { id: true, label: true } },
          },
        });
        optionValueLookup = new Map();
        for (const opt of createdOptions) {
          for (const val of opt.values) {
            optionValueLookup.set(
              `${opt.name.toLowerCase()}::${val.label.toLowerCase()}`,
              val.id,
            );
          }
        }
      }

      // Link variant option values and images
      for (let i = 0; i < payload.variants.length; i++) {
        const variantInput = payload.variants[i];
        const createdVariant = created.variants[i];
        if (!createdVariant) continue;

        // Resolve optionSelections to IDs
        const resolvedIds: string[] = [...(variantInput.optionValueIds ?? [])];
        if (variantInput.optionSelections?.length && optionValueLookup) {
          for (const sel of variantInput.optionSelections) {
            const key = `${sel.optionName.toLowerCase()}::${sel.value.toLowerCase()}`;
            const id = optionValueLookup.get(key);
            if (id) resolvedIds.push(id);
          }
        }

        if (resolvedIds.length > 0) {
          await tx.productVariantOptionValue.createMany({
            data: resolvedIds.map((ovId) => ({
              variantId: createdVariant.id,
              optionValueId: ovId,
            })),
          });
        }

        if (variantInput.images?.length) {
          await tx.variantImage.createMany({
            data: variantInput.images.map((img, imgIdx) => ({
              variantId: createdVariant.id,
              url: img.url,
              alt: img.alt ?? null,
              sortOrder: img.sortOrder ?? imgIdx,
            })),
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id: created.id },
        select: productWithAdminSelect,
      });
    });

    return { success: true, data: { product: this.serializeProduct(product) } };
  }

  async updateProduct(productId: string, payload: UpdateProduct) {
    if (payload.categoryId) {
      const category = await this.db.shopCategory.findUnique({
        where: { id: payload.categoryId },
        select: { id: true },
      });
      if (!category) throw new BadRequestException('Category not found');
    }

    if (payload.brandId) {
      const brand = await this.db.brand.findUnique({
        where: { id: payload.brandId },
        select: { id: true },
      });
      if (!brand) throw new BadRequestException('Brand not found');
    }

    const product = await this.db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          name: payload.name,
          slug: payload.slug,
          description: payload.description,
          categoryId: payload.categoryId,
          brandId: payload.brandId,
          isActive: payload.isActive,
          isFeatured: payload.isFeatured,
        },
      });

      if (payload.variants) {
        const existingVariants = await tx.productVariant.findMany({
          where: { productId },
          select: { id: true },
        });
        const existingIds = new Set(existingVariants.map((v) => v.id));
        const incomingIds = new Set(
          payload.variants.filter((v) => v.id).map((v) => v.id!),
        );

        // Delete variants that are no longer in the payload
        const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
        if (toDelete.length > 0) {
          await tx.inventoryRecord.deleteMany({
            where: { variantId: { in: toDelete } },
          });
          await tx.productVariant.deleteMany({
            where: { id: { in: toDelete } },
          });
        }

        for (const variantInput of payload.variants) {
          if (variantInput.id && existingIds.has(variantInput.id)) {
            await tx.productVariant.update({
              where: { id: variantInput.id },
              data: {
                title: variantInput.title,
                sku: variantInput.sku,
                priceInCents: variantInput.priceInCents,
                compareAtPriceInCents: variantInput.compareAtPriceInCents,
                weight: variantInput.weight ?? undefined,
                weightUnit: variantInput.weightUnit ?? undefined,
                attributes: variantInput.attributes,
              },
            });

            // Sync option values
            if (variantInput.optionValueIds) {
              await tx.productVariantOptionValue.deleteMany({
                where: { variantId: variantInput.id },
              });
              if (variantInput.optionValueIds.length > 0) {
                await tx.productVariantOptionValue.createMany({
                  data: variantInput.optionValueIds.map((ovId) => ({
                    variantId: variantInput.id!,
                    optionValueId: ovId,
                  })),
                });
              }
            }

            // Replace variant images when provided
            if (variantInput.images) {
              await tx.variantImage.deleteMany({
                where: { variantId: variantInput.id },
              });
              if (variantInput.images.length > 0) {
                await tx.variantImage.createMany({
                  data: variantInput.images.map((img, imgIdx) => ({
                    variantId: variantInput.id!,
                    url: img.url,
                    alt: img.alt ?? null,
                    sortOrder: img.sortOrder ?? imgIdx,
                  })),
                });
              }
            }
          } else {
            const created = await tx.productVariant.create({
              data: {
                productId,
                title: variantInput.title,
                sku: variantInput.sku,
                priceInCents: variantInput.priceInCents,
                compareAtPriceInCents: variantInput.compareAtPriceInCents,
                weight: variantInput.weight ?? null,
                weightUnit: variantInput.weightUnit ?? null,
                inventoryQuantity: variantInput.inventoryQuantity ?? 0,
                attributes: variantInput.attributes,
              },
            });

            await tx.inventoryRecord.create({
              data: {
                variantId: created.id,
                quantityOnHand: variantInput.inventoryQuantity ?? 0,
              },
            });

            if (variantInput.optionValueIds?.length) {
              await tx.productVariantOptionValue.createMany({
                data: variantInput.optionValueIds.map((ovId) => ({
                  variantId: created.id,
                  optionValueId: ovId,
                })),
              });
            }

            if (variantInput.images?.length) {
              await tx.variantImage.createMany({
                data: variantInput.images.map((img, imgIdx) => ({
                  variantId: created.id,
                  url: img.url,
                  alt: img.alt ?? null,
                  sortOrder: img.sortOrder ?? imgIdx,
                })),
              });
            }
          }
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id: productId },
        select: productWithAdminSelect,
      });
    });

    return { success: true, data: { product: this.serializeProduct(product) } };
  }

  async deleteProduct(productId: string) {
    const existing = await this.db.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!existing) {
      throw new BadRequestException('Product not found');
    }

    await this.db.product.delete({ where: { id: productId } });

    return { success: true, data: { id: productId } };
  }

  async getInventory(search?: string) {
    const variants = await this.db.productVariant.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { sku: { contains: search, mode: 'insensitive' } },
                { title: { contains: search, mode: 'insensitive' } },
                {
                  product: {
                    name: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        inventoryRecord: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      success: true,
      data: {
        items: variants.map((variant) => {
          const onHand =
            variant.inventoryRecord?.quantityOnHand ??
            variant.inventoryQuantity;
          const reserved =
            variant.inventoryRecord?.quantityReserved ??
            variant.reservedQuantity;
          return {
            ...variant,
            product: {
              ...variant.product,
              category: variant.product.category.name,
            },
            inventoryQuantity: onHand,
            reservedQuantity: reserved,
            availableQuantity: onHand - reserved,
            inventoryRecord: variant.inventoryRecord,
          };
        }),
      },
    };
  }

  async adjustInventory(input: {
    variantId: string;
    delta: number;
    reason: 'RESTOCK' | 'SALE' | 'REFUND' | 'MANUAL';
    note?: string;
    userId: string;
  }): Promise<SuccessResponse | ErrorResponse> {
    const variant = await this.db.productVariant.findUnique({
      where: { id: input.variantId },
      include: { inventoryRecord: true },
    });

    if (!variant) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Variant not found' },
      };
    }

    const currentQty =
      variant.inventoryRecord?.quantityOnHand ?? variant.inventoryQuantity;
    const nextQuantity = currentQty + input.delta;
    if (nextQuantity < 0) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Inventory cannot go below zero',
        },
      };
    }

    const result = await this.db.$transaction(async (tx) => {
      const updatedVariant = await tx.productVariant.update({
        where: { id: input.variantId },
        data: { inventoryQuantity: nextQuantity },
      });

      const inventoryRecord = await tx.inventoryRecord.upsert({
        where: { variantId: input.variantId },
        update: { quantityOnHand: nextQuantity },
        create: {
          variantId: input.variantId,
          quantityOnHand: nextQuantity,
        },
      });

      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          variantId: input.variantId,
          inventoryRecordId: inventoryRecord.id,
          delta: input.delta,
          reason: input.reason,
          note: input.note,
          createdById: input.userId,
        },
      });

      return { variant: updatedVariant, adjustment, inventoryRecord };
    });

    return {
      success: true,
      data: result,
    };
  }

  async listDiscountCodes() {
    const items = await this.db.discountCode.findMany({
      select: discountCodeWithCreatorSelect,
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: { items } };
  }

  async createDiscountCode(
    payload: CreateDiscountCode,
    userId: string,
  ): Promise<SuccessResponse | ErrorResponse> {
    const code = payload.code.toUpperCase().trim();

    const existing = await this.db.discountCode.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existing) {
      return {
        success: false,
        error: { code: 'CONFLICT', message: 'Code already exists' },
      };
    }

    if (payload.type === 'PERCENT' && payload.percentOff == null) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'percentOff is required for percent discounts',
        },
      };
    }

    if (payload.type === 'FIXED' && payload.amountOffInCents == null) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'amountOffInCents is required for fixed discounts',
        },
      };
    }

    const discountCode = await this.db.discountCode.create({
      data: {
        code,
        description: payload.description,
        type: payload.type,
        percentOff: payload.percentOff,
        amountOffInCents: payload.amountOffInCents,
        minSubtotalInCents: payload.minSubtotalInCents,
        usageLimit: payload.usageLimit,
        startsAt: payload.startsAt ? new Date(payload.startsAt) : undefined,
        endsAt: payload.endsAt ? new Date(payload.endsAt) : undefined,
        isActive: payload.isActive ?? true,
        createdById: userId,
      },
    });

    return { success: true, data: { discountCode } };
  }

  async updateDiscountCode(
    discountCodeId: string,
    payload: UpdateDiscountCode,
  ) {
    const discountCode = await this.db.discountCode.update({
      where: { id: discountCodeId },
      data: {
        description: payload.description,
        type: payload.type,
        percentOff: payload.percentOff,
        amountOffInCents: payload.amountOffInCents,
        minSubtotalInCents: payload.minSubtotalInCents,
        usageLimit: payload.usageLimit,
        startsAt: payload.startsAt ? new Date(payload.startsAt) : undefined,
        endsAt: payload.endsAt ? new Date(payload.endsAt) : undefined,
        isActive: payload.isActive,
      },
    });

    return { success: true, data: { discountCode } };
  }

  async deleteDiscountCode(discountCodeId: string) {
    const existing = await this.db.discountCode.findUnique({
      where: { id: discountCodeId },
      select: { id: true },
    });

    if (!existing) {
      throw new BadRequestException('Discount code not found');
    }

    await this.db.discountCode.delete({ where: { id: discountCodeId } });

    return { success: true, data: { id: discountCodeId } };
  }

  async listReferrals() {
    const items = await this.db.referralCode.findMany({
      select: referralCodeWithRelationsSelect,
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: { items } };
  }

  async createReferralCode(payload: CreateReferralCode) {
    const code =
      payload.code?.toUpperCase().trim() ??
      `VARA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const referralCode = await this.db.referralCode.create({
      data: {
        userId: payload.userId,
        code,
      },
    });

    return { success: true, data: { referralCode } };
  }

  async deleteReferralCode(referralCodeId: string) {
    const existing = await this.db.referralCode.findUnique({
      where: { id: referralCodeId },
      select: { id: true },
    });

    if (!existing) {
      throw new BadRequestException('Referral code not found');
    }

    await this.db.referralCode.delete({ where: { id: referralCodeId } });

    return { success: true, data: { id: referralCodeId } };
  }

  async listOrders(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.db.shopOrder.findMany({
        skip,
        take: limit,
        select: shopOrderWithRelationsSelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.shopOrder.count(),
    ]);

    return {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderSummary() {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const [
      totalOrders,
      paidOrders,
      pendingOrders,
      cancelledOrders,
      refundedOrders,
      ordersLast30Days,
      paidRevenue,
      paidRevenueLast30Days,
    ] = await Promise.all([
      this.db.shopOrder.count(),
      this.db.shopOrder.count({ where: { status: 'PAID' } }),
      this.db.shopOrder.count({ where: { status: 'PENDING' } }),
      this.db.shopOrder.count({ where: { status: 'CANCELLED' } }),
      this.db.shopOrder.count({ where: { status: 'REFUNDED' } }),
      this.db.shopOrder.count({ where: { createdAt: { gte: last30Days } } }),
      this.db.shopOrder.aggregate({
        where: { status: 'PAID' },
        _sum: { totalInCents: true },
      }),
      this.db.shopOrder.aggregate({
        where: {
          status: 'PAID',
          paidAt: { gte: last30Days },
        },
        _sum: { totalInCents: true },
      }),
    ]);

    return {
      success: true,
      data: {
        totalOrders,
        paidOrders,
        pendingOrders,
        cancelledOrders,
        refundedOrders,
        ordersLast30Days,
        paidRevenueInCents: paidRevenue._sum.totalInCents ?? 0,
        paidRevenueLast30DaysInCents:
          paidRevenueLast30Days._sum.totalInCents ?? 0,
      },
    };
  }

  async listMyOrders(userId: string, email: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { userId },
        { email: { equals: email, mode: 'insensitive' as const } },
      ],
    };

    const [items, total] = await Promise.all([
      this.db.shopOrder.findMany({
        where,
        skip,
        take: limit,
        select: shopOrderWithRelationsSelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.shopOrder.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listCustomers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where = {
      shopOrders: { some: {} },
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              {
                profile: {
                  displayName: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          createdAt: true,
          profile: { select: { displayName: true, avatarUrl: true } },
          shopOrders: {
            select: {
              id: true,
              totalInCents: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.user.count({ where }),
    ]);

    const transformed = items.map((item) => {
      const completedOrders = item.shopOrders.filter(
        (order) => order.status === 'PAID',
      );
      const totalSpentInCents = completedOrders.reduce(
        (total, order) => total + order.totalInCents,
        0,
      );
      return {
        id: item.id,
        email: item.email,
        createdAt: item.createdAt,
        profile: item.profile,
        orderCount: item.shopOrders.length,
        totalSpentInCents,
        lastOrderAt: item.shopOrders[0]?.createdAt ?? null,
      };
    });

    return {
      success: true,
      data: {
        items: transformed,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async handleShopOrderPaid(params: {
    orderId: string;
    paymentIntentId?: string | null;
    shippingDetails?: Record<string, unknown> | null;
  }) {
    const order = await this.db.shopOrder.findUnique({
      where: { id: params.orderId },
      include: {
        items: {
          select: shopOrderItemSelect,
        },
      },
    });

    if (!order || order.status === 'PAID') {
      return;
    }

    const metadata = this.asMetadataRecord(order.metadata);

    await this.db.$transaction(async (tx) => {
      await tx.shopOrder.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          stripePaymentIntentId: params.paymentIntentId ?? undefined,
          metadata: {
            ...metadata,
            ...(params.shippingDetails
              ? { shippingDetails: params.shippingDetails }
              : {}),
          } as Prisma.InputJsonValue,
        },
      });

      for (const item of order.items) {
        if (!item.variantId) continue;
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            reservedQuantity: { decrement: item.quantity },
            inventoryQuantity: { decrement: item.quantity },
          },
        });

        await tx.inventoryAdjustment.create({
          data: {
            variantId: item.variantId,
            delta: -item.quantity,
            reason: 'SALE',
            note: `Order ${order.orderNumber}`,
          },
        });
      }

      if (order.discountCodeId) {
        await tx.discountCode.update({
          where: { id: order.discountCodeId },
          data: { usedCount: { increment: 1 } },
        });
      }

      if (order.referralCodeId) {
        await tx.referralCode.update({
          where: { id: order.referralCodeId },
          data: {
            conversionCount: { increment: 1 },
          },
        });
      }
    });

    this.logger.log(`Marked shop order ${order.id} as PAID`);

    // Notify buyer their order is confirmed
    if (order.userId) {
      void this.notificationService.create({
        userId: order.userId,
        type: 'ORDER_CONFIRMED',
        title: 'Order confirmed',
        body: `Your order #${order.orderNumber} has been confirmed.`,
        actionUrl: `/shop/orders/${order.id}`,
        data: { orderId: order.id, orderNumber: order.orderNumber },
      });
    }
  }

  async cancelOrder(orderId: string, reason?: string) {
    const order = await this.db.shopOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: shopOrderItemSelect,
        },
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.status === 'CANCELLED') {
      return {
        success: true,
        data: { order },
      };
    }

    if (order.status === 'PAID') {
      throw new BadRequestException(
        'Paid orders cannot be cancelled. Issue a refund instead.',
      );
    }

    if (order.status === 'REFUNDED') {
      throw new BadRequestException('Refunded orders cannot be cancelled');
    }

    const metadata = this.asMetadataRecord(order.metadata);

    const updatedOrder = await this.db.$transaction(async (tx) => {
      for (const item of order.items) {
        if (!item.variantId) continue;
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            reservedQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      return tx.shopOrder.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          metadata: {
            ...metadata,
            cancellation: {
              reason: reason?.trim() || null,
              cancelledAt: new Date().toISOString(),
            },
          } as Prisma.InputJsonValue,
        },
        select: shopOrderWithRelationsSelect,
      });
    });

    this.logger.log(`Cancelled shop order ${order.id}`);

    return {
      success: true,
      data: { order: updatedOrder },
    };
  }

  async refundOrder(orderId: string, reason?: string) {
    const order = await this.db.shopOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: shopOrderItemSelect,
        },
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.status === 'REFUNDED') {
      return {
        success: true,
        data: { order, alreadyRefunded: true },
      };
    }

    if (order.status !== 'PAID') {
      throw new BadRequestException('Only paid orders can be refunded');
    }

    if (!order.stripePaymentIntentId) {
      throw new BadRequestException(
        'Order has no Stripe payment intent and cannot be refunded automatically',
      );
    }

    if (!this.stripeService.isConfigured()) {
      throw new BadRequestException('Stripe is not configured');
    }

    const refund = await this.stripeService.getClient().refunds.create({
      payment_intent: order.stripePaymentIntentId,
      reason: 'requested_by_customer',
      metadata: {
        source: 'SHOP',
        orderId: order.id,
        ...(reason?.trim() ? { reason: reason.trim() } : {}),
      },
    });

    const metadata = this.asMetadataRecord(order.metadata);

    const updatedOrder = await this.db.$transaction(async (tx) => {
      for (const item of order.items) {
        if (!item.variantId) continue;

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            inventoryQuantity: {
              increment: item.quantity,
            },
          },
        });

        await tx.inventoryAdjustment.create({
          data: {
            variantId: item.variantId,
            delta: item.quantity,
            reason: 'REFUND',
            note: `Refund ${refund.id} for order ${order.orderNumber}`,
          },
        });
      }

      return tx.shopOrder.update({
        where: { id: order.id },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
          metadata: {
            ...metadata,
            refund: {
              id: refund.id,
              status: refund.status,
              reason: reason?.trim() || null,
              refundedAt: new Date().toISOString(),
            },
          } as Prisma.InputJsonValue,
        },
        select: shopOrderWithRelationsSelect,
      });
    });

    this.logger.log(
      `Refunded shop order ${order.id} via Stripe refund ${refund.id}`,
    );

    return {
      success: true,
      data: {
        order: updatedOrder,
        refund: {
          id: refund.id,
          status: refund.status,
        },
      },
    };
  }

  async updateOrderFulfillment(
    orderId: string,
    input: {
      fulfillmentStatus?: 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'FULFILLED';
      trackingNumber?: string;
      carrier?: string;
      notes?: string;
    },
  ) {
    const order = await this.db.shopOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        orderNumber: true,
        shippedAt: true,
        userId: true,
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      throw new BadRequestException(
        `Cannot update fulfillment for ${order.status.toLowerCase()} orders`,
      );
    }

    const data: Record<string, unknown> = {};

    if (input.fulfillmentStatus) {
      data.fulfillmentStatus = input.fulfillmentStatus;
    }

    if (input.trackingNumber !== undefined) {
      data.trackingNumber = input.trackingNumber || null;
    }

    if (input.carrier !== undefined) {
      data.carrier = input.carrier || null;
    }

    if (input.notes !== undefined) {
      data.notes = input.notes || null;
    }

    if (
      input.fulfillmentStatus === 'FULFILLED' ||
      input.fulfillmentStatus === 'PARTIALLY_FULFILLED'
    ) {
      if (!order.shippedAt) {
        data.shippedAt = new Date();
      }
    }

    const updated = await this.db.shopOrder.update({
      where: { id: orderId },
      data,
      select: shopOrderWithRelationsSelect,
    });

    this.logger.log(
      `Updated fulfillment for order ${order.orderNumber}: ${JSON.stringify(input)}`,
    );

    // Notify buyer when order is shipped
    if (input.fulfillmentStatus === 'FULFILLED' && order.userId) {
      void this.notificationService.create({
        userId: order.userId,
        type: 'ORDER_SHIPPED',
        title: 'Order shipped',
        body: `Your order #${order.orderNumber} has been shipped.${input.trackingNumber ? ` Tracking: ${input.trackingNumber}` : ''}`,
        actionUrl: `/shop/orders/${order.id}`,
        data: { orderId: order.id, orderNumber: order.orderNumber },
      });
    }

    return { success: true, data: updated };
  }

  async handleShopOrderRefunded(params: {
    paymentIntentId: string;
    refundId?: string | null;
    amountRefundedInCents?: number | null;
    chargeAmountInCents?: number | null;
    reason?: string | null;
    status?: string | null;
  }) {
    const order = await this.db.shopOrder.findFirst({
      where: { stripePaymentIntentId: params.paymentIntentId },
      include: {
        items: {
          select: shopOrderItemSelect,
        },
      },
    });

    if (!order) {
      this.logger.warn(
        `No shop order found for refunded payment intent ${params.paymentIntentId}`,
      );
      return;
    }

    if (order.status === 'REFUNDED') {
      return;
    }

    const metadata = this.asMetadataRecord(order.metadata);

    const isFullRefund =
      typeof params.chargeAmountInCents === 'number' &&
      Number.isFinite(params.chargeAmountInCents)
        ? (params.amountRefundedInCents ?? 0) >= params.chargeAmountInCents
        : true;

    if (!isFullRefund) {
      await this.db.shopOrder.update({
        where: { id: order.id },
        data: {
          metadata: {
            ...metadata,
            refund: {
              id: params.refundId ?? null,
              status: params.status ?? null,
              reason: params.reason ?? null,
              partial: true,
              amountRefundedInCents: params.amountRefundedInCents ?? null,
              chargeAmountInCents: params.chargeAmountInCents ?? null,
              refundedAt: new Date().toISOString(),
              source: 'stripe-webhook',
            },
          } as Prisma.InputJsonValue,
        },
      });

      this.logger.log(
        `Synchronized partial refund for order ${order.id} (${params.amountRefundedInCents}/${params.chargeAmountInCents})`,
      );
      return;
    }

    if (order.status !== 'PAID') {
      this.logger.log(
        `Skipping refund sync for order ${order.id} in status ${order.status}`,
      );
      return;
    }

    await this.db.$transaction(async (tx) => {
      for (const item of order.items) {
        if (!item.variantId) continue;

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            inventoryQuantity: {
              increment: item.quantity,
            },
          },
        });

        await tx.inventoryAdjustment.create({
          data: {
            variantId: item.variantId,
            delta: item.quantity,
            reason: 'REFUND',
            note: `Webhook refund ${params.refundId ?? '-'} for order ${order.orderNumber}`,
          },
        });
      }

      await tx.shopOrder.update({
        where: { id: order.id },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
          metadata: {
            ...metadata,
            refund: {
              id: params.refundId ?? null,
              status: params.status ?? null,
              reason: params.reason ?? null,
              partial: false,
              amountRefundedInCents: params.amountRefundedInCents ?? null,
              chargeAmountInCents: params.chargeAmountInCents ?? null,
              refundedAt: new Date().toISOString(),
              source: 'stripe-webhook',
            },
          } as Prisma.InputJsonValue,
        },
      });
    });

    this.logger.log(
      `Synchronized shop order ${order.id} as REFUNDED from Stripe webhook`,
    );

    // Notify buyer about the refund
    if (order.userId) {
      void this.notificationService.create({
        userId: order.userId,
        type: 'ORDER_REFUNDED',
        title: 'Order refunded',
        body: `Your order #${order.orderNumber} has been refunded.`,
        actionUrl: `/shop/orders/${order.id}`,
        data: { orderId: order.id, orderNumber: order.orderNumber },
      });
    }
  }

  async handleShopOrderCancelled(params: { orderId: string }) {
    const order = await this.db.shopOrder.findUnique({
      where: { id: params.orderId },
      include: {
        items: {
          select: shopOrderItemSelect,
        },
      },
    });

    if (!order || order.status !== 'PENDING') {
      return;
    }

    await this.db.$transaction(async (tx) => {
      await tx.shopOrder.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });

      for (const item of order.items) {
        if (!item.variantId) continue;
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            reservedQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }
    });

    this.logger.log(`Marked shop order ${order.id} as CANCELLED`);
  }

  // ── Bundles ───────────────────────────────────────────────

  private toBundleSlug(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 120);
  }

  async listBundles(options?: { includeInactive?: boolean }) {
    const includeInactive = Boolean(options?.includeInactive);
    const items = await this.db.productBundle.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                variants: { where: { isActive: true } },
              },
            },
          },
        },
      },
    });

    return { success: true, data: { items } };
  }

  async getBundleBySlug(slug: string) {
    const bundle = await this.db.productBundle.findFirst({
      where: { slug, isActive: true },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' } },
                variants: { where: { isActive: true } },
              },
            },
          },
        },
      },
    });

    if (!bundle) {
      throw new BadRequestException('Bundle not found');
    }

    return { success: true, data: bundle };
  }

  async createBundle(input: {
    name: string;
    slug?: string;
    description?: string;
    priceInCents: number;
    imageUrl?: string;
    isActive?: boolean;
    sortOrder?: number;
    items: Array<{ productId: string; variantId?: string; quantity?: number }>;
  }) {
    const name = input.name.trim();
    if (!name) throw new BadRequestException('Bundle name is required');

    const slug = input.slug?.trim() || this.toBundleSlug(name);
    if (!slug) throw new BadRequestException('Bundle slug is required');

    if (typeof input.priceInCents !== 'number' || input.priceInCents < 0) {
      throw new BadRequestException(
        'Bundle price must be a non-negative number',
      );
    }

    if (!input.items?.length) {
      throw new BadRequestException('A bundle must have at least one item');
    }

    const existing = await this.db.productBundle.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { slug: { equals: slug, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        'A bundle with this name or slug already exists',
      );
    }

    const bundle = await this.db.productBundle.create({
      data: {
        name,
        slug,
        description: input.description?.trim() || null,
        priceInCents: input.priceInCents,
        imageUrl: input.imageUrl || null,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity ?? 1,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                variants: { where: { isActive: true } },
              },
            },
          },
        },
      },
    });

    return { success: true, data: { bundle } };
  }

  async updateBundle(
    bundleId: string,
    input: {
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
    },
  ) {
    const existing = await this.db.productBundle.findUnique({
      where: { id: bundleId },
      select: { id: true },
    });
    if (!existing) throw new BadRequestException('Bundle not found');

    const normalizedName =
      typeof input.name === 'string' ? input.name.trim() : undefined;
    const derivedSlug =
      typeof input.slug === 'string'
        ? input.slug.trim()
        : normalizedName
          ? this.toBundleSlug(normalizedName)
          : undefined;

    if (typeof normalizedName === 'string' && !normalizedName) {
      throw new BadRequestException('Bundle name cannot be empty');
    }

    if (typeof input.priceInCents === 'number' && input.priceInCents < 0) {
      throw new BadRequestException(
        'Bundle price must be a non-negative number',
      );
    }

    // Replace items if provided
    if (input.items) {
      if (input.items.length === 0) {
        throw new BadRequestException('A bundle must have at least one item');
      }
      await this.db.productBundleItem.deleteMany({
        where: { bundleId },
      });
      await this.db.productBundleItem.createMany({
        data: input.items.map((item) => ({
          bundleId,
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity ?? 1,
        })),
      });
    }

    const bundle = await this.db.productBundle.update({
      where: { id: bundleId },
      data: {
        name: normalizedName,
        slug: derivedSlug,
        description:
          input.description !== undefined
            ? input.description?.trim() || null
            : undefined,
        priceInCents: input.priceInCents,
        imageUrl: input.imageUrl !== undefined ? input.imageUrl : undefined,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                variants: { where: { isActive: true } },
              },
            },
          },
        },
      },
    });

    return { success: true, data: { bundle } };
  }

  async deleteBundle(bundleId: string) {
    const existing = await this.db.productBundle.findUnique({
      where: { id: bundleId },
      select: { id: true },
    });
    if (!existing) throw new BadRequestException('Bundle not found');

    await this.db.productBundle.delete({ where: { id: bundleId } });
    return { success: true };
  }

  // ── Hero Banners ────────────────────────────────────────────

  async listHeroBanners(options?: { includeInactive?: boolean }) {
    const includeInactive = Boolean(options?.includeInactive);
    const items = await this.db.shopHeroBanner.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return { success: true, data: { items } };
  }

  async createHeroBanner(input: {
    imageUrl: string;
    linkUrl: string;
    alt?: string;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    const imageUrl = input.imageUrl?.trim();
    const linkUrl = input.linkUrl?.trim();
    if (!imageUrl)
      throw new BadRequestException('Banner image URL is required');
    if (!linkUrl) throw new BadRequestException('Banner link URL is required');

    const banner = await this.db.shopHeroBanner.create({
      data: {
        imageUrl,
        linkUrl,
        alt: input.alt?.trim() || null,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    return { success: true, data: { banner } };
  }

  async updateHeroBanner(
    bannerId: string,
    input: {
      imageUrl?: string;
      linkUrl?: string;
      alt?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    const existing = await this.db.shopHeroBanner.findUnique({
      where: { id: bannerId },
      select: { id: true },
    });
    if (!existing) throw new BadRequestException('Banner not found');

    const data: Record<string, unknown> = {};
    if (typeof input.imageUrl === 'string') {
      const trimmed = input.imageUrl.trim();
      if (!trimmed)
        throw new BadRequestException('Banner image URL cannot be empty');
      data.imageUrl = trimmed;
    }
    if (typeof input.linkUrl === 'string') {
      const trimmed = input.linkUrl.trim();
      if (!trimmed)
        throw new BadRequestException('Banner link URL cannot be empty');
      data.linkUrl = trimmed;
    }
    if (input.alt !== undefined) {
      data.alt =
        typeof input.alt === 'string' ? input.alt.trim() || null : null;
    }
    if (typeof input.isActive === 'boolean') data.isActive = input.isActive;
    if (typeof input.sortOrder === 'number') data.sortOrder = input.sortOrder;

    const banner = await this.db.shopHeroBanner.update({
      where: { id: bannerId },
      data,
    });

    return { success: true, data: { banner } };
  }

  async deleteHeroBanner(bannerId: string) {
    const existing = await this.db.shopHeroBanner.findUnique({
      where: { id: bannerId },
      select: { id: true },
    });
    if (!existing) throw new BadRequestException('Banner not found');

    await this.db.shopHeroBanner.delete({ where: { id: bannerId } });
    return { success: true };
  }

  private encryptOrderEmail(email: string) {
    const enc = this.encryption.encrypt(email);
    return {
      eEmail: enc.encryptedContent,
      emailIv: enc.contentIv,
      emailAuthTag: enc.contentAuthTag,
      emailWrappedKey: enc.wrappedKey,
    };
  }
}
