import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, ShoppingCart, Truck } from 'lucide-react';
import { toast } from 'sonner';
import {
  useShopBundleBySlug,
  type ShopBundleItem,
  type ShopProduct,
  type ShopProductVariant,
} from '@/features/commerce';
import {
  loadShopCart,
  saveShopCart,
  type ShopCartItem,
} from '@/lib/shop-checkout-state';

type BundleVariant = ShopBundleItem['product']['variants'][number];

function toShopVariant(v: BundleVariant): ShopProductVariant {
  return {
    ...v,
    weight: null,
    weightUnit: null,
    optionValues: [],
    variantImages: [],
    inventoryRecord: null,
  };
}

function toShopProduct(
  item: ShopBundleItem,
  selectedVariant: ShopProductVariant,
): ShopProduct {
  return {
    id: item.product.id,
    name: item.product.name,
    slug: item.product.slug,
    description: null,
    categoryId: '',
    category: '',
    categorySlug: '',
    brandId: null,
    brand: null,
    isActive: true,
    isFeatured: false,
    inStock: true,
    minPriceInCents: selectedVariant.priceInCents,
    options: [],
    images: item.product.images.map((img, i) => ({
      id: `${item.product.id}-img-${i}`,
      url: img.url,
      alt: img.alt,
      sortOrder: i,
    })),
    variants: item.product.variants.map(toShopVariant),
  };
}

const formatCurrency = (valueInCents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(valueInCents / 100);

export default function ShopBundlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [cart, setCart] = useState<ShopCartItem[]>(() => loadShopCart());

  const { data: bundleData, isLoading } = useShopBundleBySlug(slug);
  const bundle = bundleData?.data ?? null;

  const defaultVariants = useMemo(() => {
    if (!bundle) return {};
    const defaults: Record<string, string> = {};
    for (const item of bundle.items) {
      const activeVars = item.product.variants.filter((v) => v.isActive);
      const inStock = activeVars.find(
        (v) => v.inventoryQuantity - v.reservedQuantity > 0,
      );
      defaults[item.id] = inStock?.id ?? activeVars[0]?.id ?? '';
    }
    return defaults;
  }, [bundle]);

  const [variantOverrides, setVariantOverrides] = useState<
    Record<string, string>
  >({});

  const selectedVariants = useMemo(
    () => ({ ...defaultVariants, ...variantOverrides }),
    [defaultVariants, variantOverrides],
  );

  useEffect(() => {
    saveShopCart(cart);
  }, [cart]);

  const fullPrice = useMemo(() => {
    if (!bundle) return 0;
    return bundle.items.reduce((sum, item) => {
      const variantId = selectedVariants[item.id] ?? item.variantId;
      const variant = item.product.variants.find((v) => v.id === variantId);
      return sum + (variant?.priceInCents ?? 0) * item.quantity;
    }, 0);
  }, [bundle, selectedVariants]);

  const savings = bundle ? fullPrice - bundle.priceInCents : 0;

  const allSelectionsValid = useMemo(() => {
    if (!bundle) return false;
    return bundle.items.every((item) => {
      const variantId = selectedVariants[item.id];
      if (!variantId) return false;
      const variant = item.product.variants.find((v) => v.id === variantId);
      return (
        variant && variant.inventoryQuantity - variant.reservedQuantity > 0
      );
    });
  }, [bundle, selectedVariants]);

  const addBundleToCart = () => {
    if (!bundle) return;

    for (const item of bundle.items) {
      const variantId = selectedVariants[item.id];
      const variant = item.product.variants.find((v) => v.id === variantId);
      if (!variant) {
        toast.error(`No variant selected for ${item.product.name}`);
        return;
      }
      if (variant.inventoryQuantity - variant.reservedQuantity <= 0) {
        toast.error(`${item.product.name} – ${variant.title} is out of stock`);
        return;
      }
    }

    setCart((prev) => {
      let next = [...prev];
      for (const item of bundle.items) {
        const variantId = selectedVariants[item.id];
        const bundleVariant = item.product.variants.find(
          (v) => v.id === variantId,
        )!;
        const shopVariant = toShopVariant(bundleVariant);
        const existingIndex = next.findIndex(
          (c) => c.variant.id === shopVariant.id,
        );
        if (existingIndex >= 0) {
          next[existingIndex] = {
            ...next[existingIndex],
            quantity: next[existingIndex].quantity + item.quantity,
          };
        } else {
          next = [
            ...next,
            {
              product: toShopProduct(item, shopVariant),
              variant: shopVariant,
              quantity: item.quantity,
            },
          ];
        }
      }
      return next;
    });

    toast.success(`${bundle.name} added to cart!`);
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-10 w-48" />
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Skeleton className="h-96 w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold">Bundle not found</h1>
        <p className="mt-2 text-muted-foreground">
          This bundle may be unavailable or no longer active.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/shop">Back to Shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link to="/shop">Back to Shop</Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left – hero image */}
        <section>
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
            {bundle.imageUrl ? (
              <img
                src={bundle.imageUrl}
                alt={bundle.name}
                className="h-128 w-full object-cover"
              />
            ) : (
              <div className="grid h-128 grid-cols-2 gap-3 bg-muted p-6">
                {bundle.items.map((item) => {
                  const imgUrl = item.product.images[0]?.url;
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-border/50 bg-card p-3"
                    >
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={item.product.name}
                          className="h-full max-h-48 w-full rounded-lg object-cover"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="h-10 w-10 text-muted-foreground" />
                      )}
                      <p className="text-center text-xs font-medium text-muted-foreground">
                        {item.product.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Right – details & selectors */}
        <section>
          <Card className="sticky top-20 border-border/70 bg-card">
            <CardContent className="space-y-6 p-6">
              {/* Bundle name */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Stack & Save
                </p>
                <h1 className="text-3xl font-black leading-tight tracking-tight">
                  {bundle.name}
                </h1>
                {bundle.description && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {bundle.description}
                  </p>
                )}
              </div>

              {/* Price block */}
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-black">
                    {formatCurrency(bundle.priceInCents)}
                  </p>
                  {savings > 0 && (
                    <>
                      <p className="pb-1 text-lg text-muted-foreground line-through">
                        {formatCurrency(fullPrice)}
                      </p>
                      <Badge className="mb-1 bg-green-600 text-xs">
                        Save {formatCurrency(savings)}
                      </Badge>
                    </>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bundle price for {bundle.items.length} product
                  {bundle.items.length === 1 ? '' : 's'}
                </p>
              </div>

              {/* Per-product variant selectors */}
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Choose Your Variants
                </p>
                {bundle.items.map((item, index) => (
                  <BundleItemSelector
                    key={item.id}
                    item={item}
                    index={index}
                    selectedVariantId={selectedVariants[item.id] ?? ''}
                    onSelectVariant={(variantId) =>
                      setVariantOverrides((prev) => ({
                        ...prev,
                        [item.id]: variantId,
                      }))
                    }
                  />
                ))}
              </div>

              {/* Add to cart */}
              <Button
                className="h-12 w-full text-base font-bold"
                onClick={addBundleToCart}
                disabled={!allSelectionsValid}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add Stack to Cart · {formatCurrency(bundle.priceInCents)}
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
    </div>
  );
}

/* ── Per-product variant picker ─────────────────────────── */

function BundleItemSelector({
  item,
  index,
  selectedVariantId,
  onSelectVariant,
}: {
  item: ShopBundleItem;
  index: number;
  selectedVariantId: string;
  onSelectVariant: (variantId: string) => void;
}) {
  const activeVariants = item.product.variants.filter((v) => v.isActive);

  // Group by attribute keys to render either button-style pickers or a dropdown
  const flavorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          activeVariants
            .map((v) => v.attributes?.color?.trim() ?? v.title)
            .filter(Boolean),
        ),
      ),
    [activeVariants],
  );

  const selectedVariant = activeVariants.find(
    (v) => v.id === selectedVariantId,
  );

  return (
    <div className="rounded-lg border border-border/60 bg-muted/15 p-4">
      <div className="mb-3 flex items-center gap-3">
        {item.product.images[0]?.url && (
          <img
            src={item.product.images[0].url}
            alt={item.product.name}
            className="h-12 w-12 rounded-lg object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            #{index + 1}
          </p>
          <Link
            to={`/shop/product/${item.product.slug}`}
            className="font-semibold hover:text-primary transition-colors"
          >
            {item.product.name}
          </Link>
        </div>
        {item.quantity > 1 && (
          <Badge variant="secondary" className="text-xs">
            ×{item.quantity}
          </Badge>
        )}
      </div>

      {activeVariants.length <= 1 ? (
        <p className="text-sm text-muted-foreground">
          {selectedVariant?.title ?? 'Default'}
        </p>
      ) : flavorOptions.length <= 6 ? (
        <div className="flex flex-wrap gap-2">
          {activeVariants.map((variant) => {
            const label = variant.attributes?.color?.trim() || variant.title;
            const inStock =
              variant.inventoryQuantity - variant.reservedQuantity > 0;
            return (
              <button
                key={variant.id}
                type="button"
                disabled={!inStock}
                className={[
                  'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                  selectedVariantId === variant.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : inStock
                      ? 'border-input hover:border-primary/50'
                      : 'cursor-not-allowed border-input/50 text-muted-foreground/50 line-through',
                ].join(' ')}
                onClick={() => onSelectVariant(variant.id)}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : (
        <select
          value={selectedVariantId}
          onChange={(e) => onSelectVariant(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {activeVariants.map((variant) => {
            const inStock =
              variant.inventoryQuantity - variant.reservedQuantity > 0;
            return (
              <option key={variant.id} value={variant.id} disabled={!inStock}>
                {variant.title} · {formatCurrency(variant.priceInCents)}
                {inStock ? '' : ' (Out of stock)'}
              </option>
            );
          })}
        </select>
      )}
    </div>
  );
}
