import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  Loader2,
  Minus,
  Pencil,
  Plus,
  Star,
  Trash2,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { hapticsMedium } from '@/lib/haptics';
import {
  useCreateShopProductReview,
  useDeleteShopProductReview,
  useUpdateShopProductReview,
  useShopCatalog,
  useShopProductBySlug,
  useShopProductReviews,
  type ShopProduct,
  type ShopProductVariant,
} from '@/features/commerce';
import { useAuth } from '@/features/auth';
import { useRequirePermission } from '@/features/auth';
import {
  loadShopCart,
  saveShopCart,
  type ShopCartItem,
} from '@/lib/shop-checkout-state';

const formatCurrency = (valueInCents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(valueInCents / 100);

const isVariantInStock = (variant: ShopProductVariant) => {
  if (variant.inventoryRecord) {
    return (
      variant.inventoryRecord.quantityOnHand -
        variant.inventoryRecord.quantityReserved >
      0
    );
  }
  return variant.inventoryQuantity - variant.reservedQuantity > 0;
};

const getVariantAttribute = (
  variant: ShopProductVariant,
  key: 'color' | 'size',
) => variant.attributes?.[key]?.trim() ?? '';

function getVariantOptionValueId(
  variant: ShopProductVariant,
  optionId: string,
): string | null {
  const mapping = variant.optionValues?.find(
    (ov) => ov.optionValue.option.id === optionId,
  );
  return mapping?.optionValue.id ?? null;
}

function findVariantBySelections(
  variants: ShopProductVariant[],
  selections: Record<string, string>,
): ShopProductVariant | null {
  const optionIds = Object.keys(selections);
  return (
    variants.find((variant) =>
      optionIds.every(
        (optionId) =>
          getVariantOptionValueId(variant, optionId) === selections[optionId],
      ),
    ) ?? null
  );
}

function findVariantByAttributes(
  variants: ShopProductVariant[],
  color: string,
  size: string,
) {
  return (
    variants.find((variant) => {
      const variantColor = getVariantAttribute(variant, 'color');
      const variantSize = getVariantAttribute(variant, 'size');
      const colorMatch = color ? variantColor === color : true;
      const sizeMatch = size ? variantSize === size : true;
      return colorMatch && sizeMatch;
    }) ?? null
  );
}

export default function ShopProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const isMobile = useIsMobile();
  const [cart, setCart] = useState<ShopCartItem[]>(() => loadShopCart());
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const { isAuthenticated } = useAuth();
  const canModerateReviews = useRequirePermission('shop:review-moderate');
  const createReview = useCreateShopProductReview();
  const updateReview = useUpdateShopProductReview();
  const deleteReview = useDeleteShopProductReview();

  const { data: productData, isLoading: isProductLoading } =
    useShopProductBySlug(slug);
  const product = productData?.data?.product ?? null;
  const { data: reviewsData, isLoading: isReviewsLoading } =
    useShopProductReviews(product?.id, { page: 1, limit: 10 });
  const reviews = reviewsData?.data;

  const [optionSelections, setOptionSelections] = useState<
    Record<string, string>
  >({});

  const activeVariants = useMemo(
    () => (product?.variants ?? []).filter((variant) => variant.isActive),
    [product],
  );

  const hasStructuredOptions = Boolean(
    product?.options && product.options.length > 0,
  );

  const availableOptionValueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const variant of activeVariants) {
      for (const ov of variant.optionValues ?? []) {
        ids.add(ov.optionValue.id);
      }
    }
    return ids;
  }, [activeVariants]);

  const getCompatibleValueIds = (
    forOptionId: string,
    currentSelections: Record<string, string>,
  ): Set<string> => {
    const otherSelections = Object.entries(currentSelections).filter(
      ([optId, val]) => optId !== forOptionId && val,
    );
    const compatible = new Set<string>();
    for (const variant of activeVariants) {
      const matchesOthers = otherSelections.every(
        ([optId, valId]) => getVariantOptionValueId(variant, optId) === valId,
      );
      if (matchesOthers) {
        const thisValue = getVariantOptionValueId(variant, forOptionId);
        if (thisValue) compatible.add(thisValue);
      }
    }
    return compatible;
  };

  const colorOptions = useMemo(
    () =>
      hasStructuredOptions
        ? []
        : Array.from(
            new Set(
              activeVariants
                .map((variant) => getVariantAttribute(variant, 'color'))
                .filter(Boolean),
            ),
          ),
    [activeVariants, hasStructuredOptions],
  );

  const sizeOptions = useMemo(
    () =>
      hasStructuredOptions
        ? []
        : Array.from(
            new Set(
              activeVariants
                .map((variant) => getVariantAttribute(variant, 'size'))
                .filter(Boolean),
            ),
          ),
    [activeVariants, hasStructuredOptions],
  );

  const selectedVariant =
    activeVariants.find((variant) => variant.id === selectedVariantId) ??
    activeVariants.find((variant) => isVariantInStock(variant)) ??
    activeVariants[0] ??
    null;

  const { data: relatedData } = useShopCatalog({
    category: product?.category,
    limit: 8,
    sort: 'featured',
  });

  const relatedProducts = useMemo(
    () =>
      (relatedData?.data?.items ?? [])
        .filter((item) => item.id !== product?.id)
        .slice(0, 4),
    [relatedData, product?.id],
  );

  useEffect(() => {
    saveShopCart(cart);
  }, [cart]);

  const syncVariant = (nextColor: string, nextSize: string) => {
    const found = findVariantByAttributes(activeVariants, nextColor, nextSize);
    if (found) {
      setSelectedVariantId(found.id);
    }
  };

  const selectOption = (optionId: string, valueId: string) => {
    const next = { ...optionSelections, [optionId]: valueId };
    const exact = findVariantBySelections(activeVariants, next);
    if (exact) {
      setOptionSelections(next);
      setSelectedVariantId(exact.id);
      return;
    }
    const candidates = activeVariants.filter(
      (v) => getVariantOptionValueId(v, optionId) === valueId,
    );
    const match = candidates.find((v) => isVariantInStock(v)) ?? candidates[0];
    if (match) {
      const resolved: Record<string, string> = {};
      for (const opt of product?.options ?? []) {
        const val = getVariantOptionValueId(match, opt.id);
        if (val) resolved[opt.id] = val;
      }
      setOptionSelections(resolved);
      setSelectedVariantId(match.id);
    } else {
      setOptionSelections(next);
    }
  };

  const addToCart = () => {
    if (!product || !selectedVariant) {
      toast.error('No purchasable variant selected');
      return;
    }

    if (!isVariantInStock(selectedVariant)) {
      toast.error('Selected variant is out of stock');
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.variant.id === selectedVariant.id,
      );
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
        };
        return next;
      }

      return [...prev, { product, variant: selectedVariant, quantity }];
    });

    void hapticsMedium();
    toast.success('Added to cart');
  };

  const submitReview = () => {
    if (!product) {
      return;
    }

    if (!isAuthenticated) {
      toast.error('Log in to leave a review');
      return;
    }

    createReview.mutate(
      {
        productId: product.id,
        data: {
          rating: reviewRating,
          title: reviewTitle.trim() || undefined,
          content: reviewContent.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Review saved');
          setReviewTitle('');
          setReviewContent('');
        },
        onError: (error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to save your review';
          toast.error(message);
        },
      },
    );
  };

  if (isProductLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div
          className={cn(
            'grid gap-6',
            !isMobile && 'lg:grid-cols-[1.1fr_0.9fr]',
          )}
        >
          <Skeleton className="h-128 w-full rounded-xl" />
          <Skeleton className="h-128 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <p className="mt-2 text-muted-foreground">
          This product may be unavailable or no longer active.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/shop">Back to Shop</Link>
        </Button>
      </div>
    );
  }

  const displayImages = selectedVariant?.variantImages?.length
    ? selectedVariant.variantImages
    : product.images;
  const imageUrl =
    displayImages[selectedImageIndex]?.url ?? displayImages[0]?.url;
  const comparePrice = selectedVariant?.compareAtPriceInCents ?? null;
  const selectedColor = selectedVariant
    ? getVariantAttribute(selectedVariant, 'color')
    : '';
  const selectedSize = selectedVariant
    ? getVariantAttribute(selectedVariant, 'size')
    : '';
  const averageRating = reviews?.averageRating ?? 0;
  const reviewCount = reviews?.reviewCount ?? 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link to="/shop">Back to Shop</Link>
        </Button>
      </div>

      <div
        className={cn('grid gap-6', !isMobile && 'lg:grid-cols-[1.1fr_0.9fr]')}
      >
        <section className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={displayImages[selectedImageIndex]?.alt ?? product.name}
                className="h-128 w-full object-cover"
              />
            ) : (
              <div className="flex h-128 items-center justify-center bg-muted text-sm text-muted-foreground">
                No image available
              </div>
            )}
          </div>

          {displayImages.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {displayImages.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className={[
                    'overflow-hidden rounded-lg border transition',
                    selectedImageIndex === index
                      ? 'border-primary'
                      : 'border-border/70 hover:border-primary/45',
                  ].join(' ')}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <img
                    src={image.url}
                    alt={image.alt ?? product.name}
                    className="h-20 w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <Card className="sticky top-20 border-border/70 bg-card">
            <CardContent className="space-y-6 p-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {product.category}
                </p>
                {product.brand && (
                  <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                    {product.brand.name}
                  </p>
                )}
                <h1 className="text-4xl font-black leading-tight tracking-tight">
                  {product.name}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-primary" />
                    {reviewCount > 0
                      ? `${Number.isInteger(averageRating) ? averageRating : averageRating.toFixed(1)} / 5 from ${reviewCount} review${reviewCount === 1 ? '' : 's'}`
                      : 'No reviews yet'}
                  </span>
                  <span>•</span>
                  <span>
                    In-stock variants:{' '}
                    {activeVariants.filter(isVariantInStock).length}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-black">
                    {formatCurrency(
                      selectedVariant?.priceInCents ?? product.minPriceInCents,
                    )}
                  </p>
                  {comparePrice &&
                    comparePrice > (selectedVariant?.priceInCents ?? 0) && (
                      <p className="pb-1 text-lg text-muted-foreground line-through">
                        {formatCurrency(comparePrice)}
                      </p>
                    )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Price shown for selected variant.
                </p>
              </div>

              {product.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              )}

              {hasStructuredOptions &&
                product.options.map((option) => {
                  const stocked = option.values.filter((v) =>
                    availableOptionValueIds.has(v.id),
                  );
                  if (stocked.length === 0) return null;

                  const compatible = getCompatibleValueIds(
                    option.id,
                    optionSelections,
                  );
                  const selectedValueId =
                    optionSelections[option.id] ??
                    (selectedVariant
                      ? getVariantOptionValueId(selectedVariant, option.id)
                      : null);
                  const selectedLabel =
                    stocked.find((v) => v.id === selectedValueId)?.label ??
                    'Any';
                  return (
                    <div key={option.id} className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {option.name}: {selectedLabel}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {stocked.map((value) => {
                          const isSelected = selectedValueId === value.id;
                          const isCompatible = compatible.has(value.id);
                          return (
                            <button
                              key={value.id}
                              type="button"
                              className={cn(
                                'relative rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                                isSelected &&
                                  'border-primary bg-primary/10 text-primary',
                                !isSelected &&
                                  isCompatible &&
                                  'border-input hover:border-primary/50',
                                !isSelected &&
                                  !isCompatible &&
                                  'border-muted text-muted-foreground/50 line-through hover:border-muted-foreground/30',
                              )}
                              onClick={() => selectOption(option.id, value.id)}
                            >
                              {value.hexColor && (
                                <span
                                  className={cn(
                                    'mr-1.5 inline-block h-3 w-3 rounded-full border',
                                    !isSelected &&
                                      !isCompatible &&
                                      'opacity-40',
                                  )}
                                  style={{
                                    backgroundColor: value.hexColor,
                                  }}
                                />
                              )}
                              {value.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

              {!hasStructuredOptions && colorOptions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Color: {selectedColor || 'Any'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={cn(
                          'rounded-md border px-3 py-1.5 text-sm font-medium',
                          selectedColor === color
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-input hover:border-primary/50',
                        )}
                        onClick={() => {
                          syncVariant(color, selectedSize);
                        }}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!hasStructuredOptions && sizeOptions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Size: {selectedSize || 'Any'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sizeOptions.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={cn(
                          'rounded-md border px-3 py-1.5 text-sm font-medium',
                          selectedSize === size
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-input hover:border-primary/50',
                        )}
                        onClick={() => {
                          syncVariant(selectedColor, size);
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Variant
                </p>
                <select
                  value={selectedVariant?.id ?? ''}
                  onChange={(event) => {
                    const nextVariant = activeVariants.find(
                      (variant) => variant.id === event.target.value,
                    );
                    setSelectedVariantId(event.target.value);
                    if (!nextVariant) {
                      return;
                    }
                  }}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {activeVariants.length === 0 ? (
                    <option value="">No variants available</option>
                  ) : (
                    activeVariants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.title} · {formatCurrency(variant.priceInCents)}
                        {isVariantInStock(variant) ? '' : ' (Out of stock)'}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Quantity
                </p>
                <div className="inline-flex items-center gap-2 rounded-lg border border-input bg-background p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-8 w-8"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center text-sm font-semibold">
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    className="h-8 w-8"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button
                className="h-12 w-full text-base font-bold"
                onClick={addToCart}
                disabled={
                  !selectedVariant || !isVariantInStock(selectedVariant)
                }
              >
                {!selectedVariant ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading variant
                  </>
                ) : !isVariantInStock(selectedVariant) ? (
                  'Out of Stock'
                ) : (
                  <>
                    Add to Cart ·{' '}
                    {formatCurrency(selectedVariant.priceInCents * quantity)}
                  </>
                )}
              </Button>

              <div className="rounded-lg border border-border/60 bg-muted/25 p-3 text-xs text-muted-foreground">
                <p className="inline-flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-primary" /> Free shipping
                  on orders over $75
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Ratings & Reviews
        </h2>
        <Card className="border-border/70">
          <CardContent className="space-y-4 p-5">
            <div className="space-y-1">
              <p className="text-sm font-medium">Write a review</p>
              {!isAuthenticated && (
                <p className="text-sm text-muted-foreground">
                  Log in to submit a rating and review.
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className="rounded p-1"
                  onClick={() => setReviewRating(value)}
                  disabled={!isAuthenticated || createReview.isPending}
                  aria-label={`Rate ${value} stars`}
                >
                  <Star
                    className={`h-5 w-5 ${
                      value <= reviewRating
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>

            <Input
              placeholder="Review title (optional)"
              value={reviewTitle}
              onChange={(event) => setReviewTitle(event.target.value)}
              disabled={!isAuthenticated || createReview.isPending}
            />

            <Textarea
              placeholder="Share your experience with this product (optional)"
              value={reviewContent}
              onChange={(event) => setReviewContent(event.target.value)}
              rows={4}
              disabled={!isAuthenticated || createReview.isPending}
            />

            <div className="flex justify-end">
              <Button onClick={submitReview} disabled={createReview.isPending}>
                {isAuthenticated
                  ? createReview.isPending
                    ? 'Saving...'
                    : 'Submit Review'
                  : 'Log In to Review'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="space-y-4 p-5">
            {isReviewsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))}
              </div>
            ) : reviews && reviews.items.length > 0 ? (
              reviews.items.map((review) => (
                <div
                  key={review.id}
                  className="border-b pb-4 last:border-0 last:pb-0"
                >
                  {editingReviewId === review.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            className="rounded p-1"
                            onClick={() => setEditRating(value)}
                            disabled={updateReview.isPending}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                value <= editRating
                                  ? 'fill-primary text-primary'
                                  : 'text-muted-foreground'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <Input
                        placeholder="Review title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        disabled={updateReview.isPending}
                      />
                      <Textarea
                        placeholder="Review content"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        disabled={updateReview.isPending}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingReviewId(null)}
                          disabled={updateReview.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={updateReview.isPending}
                          onClick={() => {
                            if (!product) return;
                            updateReview.mutate(
                              {
                                reviewId: review.id,
                                productId: product.id,
                                data: {
                                  rating: editRating,
                                  title: editTitle.trim() || undefined,
                                  content: editContent.trim() || undefined,
                                },
                              },
                              {
                                onSuccess: () => {
                                  toast.success('Review updated');
                                  setEditingReviewId(null);
                                },
                                onError: () =>
                                  toast.error('Failed to update review'),
                              },
                            );
                          }}
                        >
                          {updateReview.isPending ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">
                          {review.user.displayName || 'Anonymous'}
                        </p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Star
                              key={value}
                              className={`h-4 w-4 ${
                                value <= review.rating
                                  ? 'fill-primary text-primary'
                                  : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.title && (
                        <p className="mt-1 text-sm font-medium">
                          {review.title}
                        </p>
                      )}
                      {review.content && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {review.content}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                          {review.isVerified && ' · Verified purchase'}
                        </p>
                        {canModerateReviews && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingReviewId(review.id);
                                setEditRating(review.rating);
                                setEditTitle(review.title ?? '');
                                setEditContent(review.content ?? '');
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              disabled={deleteReview.isPending}
                              onClick={() => {
                                if (!product) return;
                                deleteReview.mutate(
                                  {
                                    reviewId: review.id,
                                    productId: product.id,
                                  },
                                  {
                                    onSuccess: () =>
                                      toast.success('Review deleted'),
                                    onError: () =>
                                      toast.error('Failed to delete review'),
                                  },
                                );
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Be the first to rate and review this product.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {relatedProducts.length > 0 && (
        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            You may also like
          </h2>
          <div
            className={cn(
              'grid gap-4',
              isMobile ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-4',
            )}
          >
            {relatedProducts.map((item: ShopProduct) => (
              <Card key={item.id} className="overflow-hidden border-border/70">
                {item.images[0]?.url ? (
                  <img
                    src={item.images[0].url}
                    alt={item.images[0]?.alt ?? item.name}
                    className="h-44 w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-muted text-sm text-muted-foreground">
                    No image
                  </div>
                )}
                <CardContent className="space-y-2 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {item.category}
                  </p>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-lg font-bold">
                    {formatCurrency(item.minPriceInCents)}
                  </p>
                  <Button className="w-full" variant="outline" asChild>
                    <Link to={`/shop/product/${item.slug}`}>View Product</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
