import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  ShoppingCart,
  Star,
  Truck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useActiveShopPromotions,
  useShopBundles,
  useShopCatalog,
  useShopCategories,
  useShopHeroBanners,
  type ShopProduct,
  type ShopProductVariant,
} from '@/features/commerce';
import {
  getShopCartSubtotalInCents,
  loadShopCart,
  saveShopCart,
  type ShopCartItem,
} from '@/lib/shop-checkout-state';

const formatCurrency = (valueInCents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(valueInCents / 100);

function formatDiscountLabel(promo: {
  type: 'PERCENT' | 'FIXED';
  percentOff: number | null;
  amountOffInCents: number | null;
}) {
  if (promo.type === 'PERCENT') {
    return `${promo.percentOff ?? 0}% OFF`;
  }
  return `${formatCurrency(promo.amountOffInCents ?? 0)} OFF`;
}

export default function ShopPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') || '';
  const isMobile = useIsMobile();
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<
    'featured' | 'newest' | 'price-asc' | 'price-desc'
  >('featured');
  const [cart, setCart] = useState<ShopCartItem[]>(() => loadShopCart());
  const [showCart, setShowCart] = useState(false);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [quickViewProduct, setQuickViewProduct] = useState<ShopProduct | null>(
    null,
  );
  const [quickViewVariantId, setQuickViewVariantId] = useState('');
  const [quickViewColor, setQuickViewColor] = useState('');
  const [quickViewSize, setQuickViewSize] = useState('');

  const category = searchParams.get('category') || 'All';

  const setCategory = (nextCategory: string) => {
    const next = new URLSearchParams(searchParams);
    if (!nextCategory || nextCategory === 'All') {
      next.delete('category');
    } else {
      next.set('category', nextCategory);
    }
    setSearchParams(next, { replace: true });
  };

  const { data: catalogData, isLoading: isCatalogLoading } = useShopCatalog({
    search: search || undefined,
    category,
    inStockOnly,
    sort,
    limit: 60,
    offset: 0,
  });
  const { data: categoriesData } = useShopCategories();
  const { data: promotionData } = useActiveShopPromotions();
  const { data: bundlesData } = useShopBundles();
  const { data: heroBannersData } = useShopHeroBanners();

  const products = useMemo(() => catalogData?.data?.items ?? [], [catalogData]);
  const bundles = bundlesData?.data?.items ?? [];
  const featuredProducts = useMemo(
    () => products.filter((item) => item.isFeatured),
    [products],
  );
  const categories = useMemo(() => {
    const dbCategoryNames = (categoriesData?.data?.items ?? []).map(
      (item) => item.name,
    );
    if (dbCategoryNames.length > 0) {
      return ['All', ...dbCategoryNames];
    }

    const set = new Set(products.map((item) => item.category));
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [categoriesData, products]);

  const featuredPromotion = promotionData?.data?.items?.[0] ?? null;

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

  const getActiveVariants = (product: ShopProduct) =>
    product.variants.filter((variant) => variant.isActive);

  const getSelectedVariant = (product: ShopProduct) => {
    const activeVariants = getActiveVariants(product);
    return (
      activeVariants.find((variant) => isVariantInStock(variant)) ??
      activeVariants[0] ??
      null
    );
  };

  const addToCart = (product: ShopProduct, variantId?: string) => {
    const activeVariants = getActiveVariants(product);
    const variant = variantId
      ? activeVariants.find((item) => item.id === variantId)
      : getSelectedVariant(product);

    if (!variant) {
      toast.error('This product is currently out of stock');
      return;
    }

    if (!isVariantInStock(variant)) {
      toast.error('Selected variant is out of stock');
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.variant.id === variant.id,
      );
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        };
        return next;
      }
      return [...prev, { product, variant, quantity: 1 }];
    });
    toast.success('Added to cart');
  };

  const getVariantAttribute = (
    variant: ShopProductVariant,
    key: 'color' | 'size',
  ) => variant.attributes?.[key]?.trim() ?? '';

  const openQuickView = (product: ShopProduct) => {
    const initialVariant =
      getSelectedVariant(product) ?? getActiveVariants(product)[0] ?? null;

    setQuickViewProduct(product);
    setQuickViewVariantId(initialVariant?.id ?? '');
    setQuickViewColor(
      initialVariant ? getVariantAttribute(initialVariant, 'color') : '',
    );
    setQuickViewSize(
      initialVariant ? getVariantAttribute(initialVariant, 'size') : '',
    );
  };

  const quickViewVariants = quickViewProduct
    ? getActiveVariants(quickViewProduct)
    : [];
  const quickViewSelectedVariant =
    quickViewVariants.find((variant) => variant.id === quickViewVariantId) ??
    quickViewVariants[0] ??
    null;

  const quickViewColorOptions = Array.from(
    new Set(
      quickViewVariants
        .map((variant) => getVariantAttribute(variant, 'color'))
        .filter(Boolean),
    ),
  );

  const quickViewSizeOptions = Array.from(
    new Set(
      quickViewVariants
        .map((variant) => getVariantAttribute(variant, 'size'))
        .filter(Boolean),
    ),
  );

  const syncQuickViewVariantByAttributes = (
    nextColor: string,
    nextSize: string,
  ) => {
    const match = quickViewVariants.find((variant) => {
      const variantColor = getVariantAttribute(variant, 'color');
      const variantSize = getVariantAttribute(variant, 'size');

      const colorMatch = nextColor ? variantColor === nextColor : true;
      const sizeMatch = nextSize ? variantSize === nextSize : true;
      return colorMatch && sizeMatch;
    });

    if (match) {
      setQuickViewVariantId(match.id);
    }
  };

  const addQuickViewToCart = () => {
    if (!quickViewProduct || !quickViewSelectedVariant) {
      toast.error('Please select a variant');
      return;
    }

    addToCart(quickViewProduct, quickViewSelectedVariant.id);
    setQuickViewProduct(null);
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variant.id !== variantId));
  };

  const updateQty = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.variant.id === variantId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const cartTotalInCents = useMemo(
    () => getShopCartSubtotalInCents(cart),
    [cart],
  );

  const goToCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    setShowCart(false);
    navigate('/shop/checkout');
  };

  const heroSlides = useMemo(() => {
    const apiBanners = heroBannersData?.data?.items ?? [];
    return apiBanners.map((b) => ({
      image: b.imageUrl,
      link: b.linkUrl,
      alt: b.alt || 'Banner',
    }));
  }, [heroBannersData]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setHeroSlideIndex((current) => (current + 1) % heroSlides.length);
    }, 6000);
    return () => window.clearInterval(intervalId);
  }, [heroSlides.length]);

  useEffect(() => {
    saveShopCart(cart);
  }, [cart]);

  return (
    <div className="w-full pb-8">
      {featuredPromotion && (
        <section className="relative left-1/2 right-1/2 mb-0 ml-[-50vw] mr-[-50vw] w-screen overflow-hidden border-y border-primary/30 bg-primary">
          <div className="mx-auto flex h-9 w-full max-w-7xl items-center justify-center gap-3 px-4 text-xs font-semibold tracking-wide text-primary-foreground sm:text-sm">
            <span>FLASH SALE:</span>
            <span>{formatDiscountLabel(featuredPromotion)}</span>
            <span className="hidden opacity-70 sm:inline">|</span>
            <span className="hidden sm:inline">
              Code {featuredPromotion.code}
            </span>
          </div>
        </section>
      )}

      <section className="relative left-1/2 right-1/2 mb-8 ml-[-50vw] mr-[-50vw] w-screen overflow-hidden bg-background">
        <div className="relative h-80 w-full sm:h-96 md:h-112 lg:h-128">
          {heroSlides.length === 0 ? (
            <div className="h-full w-full animate-pulse bg-muted" />
          ) : (
            <>
              <Link to={heroSlides[heroSlideIndex].link}>
                <img
                  src={heroSlides[heroSlideIndex].image}
                  alt={heroSlides[heroSlideIndex].alt}
                  className="h-full w-full object-cover"
                />
              </Link>

              {/* Left / Right arrows */}
              {heroSlides.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                    onClick={() =>
                      setHeroSlideIndex(
                        (heroSlideIndex - 1 + heroSlides.length) %
                          heroSlides.length,
                      )
                    }
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                    onClick={() =>
                      setHeroSlideIndex(
                        (heroSlideIndex + 1) % heroSlides.length,
                      )
                    }
                    aria-label="Next slide"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Dot indicators */}
              {heroSlides.length > 1 && (
                <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
                  {heroSlides.map((_, index) => (
                    <button
                      key={`hero-dot-${index}`}
                      type="button"
                      className={[
                        'h-2 rounded-full transition-all',
                        heroSlideIndex === index
                          ? 'w-8 bg-white'
                          : 'w-2 bg-white/50 hover:bg-white/70',
                      ].join(' ')}
                      onClick={() => setHeroSlideIndex(index)}
                      aria-label={`Show slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <div className="w-full px-4 sm:px-6 lg:px-8">
        {!isCatalogLoading && featuredProducts.length > 0 && (
          <section className="mb-8 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">
                Featured Picks
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSort('featured');
                  setCategory('All');
                }}
              >
                View All Featured
              </Button>
            </div>
            <div
              className={cn(
                'grid gap-4',
                isMobile
                  ? 'grid-cols-1'
                  : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
              )}
            >
              {featuredProducts.slice(0, 3).map((product) => {
                const selectedVariant = getSelectedVariant(product);
                return (
                  <Card
                    key={`featured-${product.id}`}
                    className="overflow-hidden"
                  >
                    <div className="group/image relative">
                      <Link to={`/shop/product/${product.slug}`}>
                        {product.images[0]?.url ? (
                          <img
                            src={product.images[0].url}
                            alt={product.images[0]?.alt ?? product.name}
                            className="h-48 w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="flex h-48 items-center justify-center bg-muted text-sm text-muted-foreground">
                            No image
                          </div>
                        )}
                      </Link>
                      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover/image:opacity-100" />
                      <div className="absolute inset-x-0 bottom-3 flex justify-center opacity-0 transition-opacity duration-200 group-hover/image:opacity-100">
                        <Button
                          type="button"
                          className="h-9 min-w-56 rounded-full bg-background text-foreground hover:bg-background/90"
                          onClick={() => openQuickView(product)}
                        >
                          Quick View
                        </Button>
                      </div>
                    </div>
                    <CardContent className="space-y-3 p-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {product.category}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-semibold">
                            <Link
                              to={`/shop/product/${product.slug}`}
                              className="hover:text-primary"
                            >
                              {product.name}
                            </Link>
                          </h3>
                          <Badge variant="secondary">Featured</Badge>
                        </div>
                        {product.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {product.description}
                          </p>
                        )}
                      </div>
                      <p className="text-lg font-bold">
                        {selectedVariant
                          ? formatCurrency(selectedVariant.priceInCents)
                          : formatCurrency(product.minPriceInCents)}
                      </p>
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => addToCart(product, selectedVariant?.id)}
                        disabled={
                          !selectedVariant || !isVariantInStock(selectedVariant)
                        }
                      >
                        Add to Cart
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(event) =>
              setSort(
                event.target.value as
                  | 'featured'
                  | 'newest'
                  | 'price-asc'
                  | 'price-desc',
              )
            }
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
          <label className="inline-flex items-center gap-2 rounded-md border border-input px-3 text-sm">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(event) => setInStockOnly(event.target.checked)}
            />
            In stock only
          </label>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">All Products</h2>
          <p className="text-sm text-muted-foreground">
            {products.length} items
          </p>
        </div>

        {isCatalogLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div
            className={cn(
              'grid gap-4',
              isMobile
                ? 'grid-cols-1'
                : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
            )}
          >
            {products.map((product) => {
              const imageUrl = product.images[0]?.url;
              const selectedVariant = getSelectedVariant(product);
              return (
                <Card key={product.id} className="overflow-hidden">
                  <div className="group/image relative">
                    <Link to={`/shop/product/${product.slug}`}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.images[0]?.alt ?? product.name}
                          className="h-48 w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center bg-muted text-sm text-muted-foreground">
                          No image
                        </div>
                      )}
                    </Link>
                    <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/55 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover/image:opacity-100" />
                    <div className="absolute inset-x-0 bottom-3 flex justify-center opacity-0 transition-opacity duration-200 group-hover/image:opacity-100">
                      <Button
                        type="button"
                        className="h-9 min-w-56 rounded-full bg-background text-foreground hover:bg-background/90"
                        onClick={() => openQuickView(product)}
                      >
                        Quick View
                      </Button>
                    </div>
                  </div>
                  <CardContent className="space-y-3 p-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {product.brand?.name
                          ? `${product.brand.name} · ${product.category}`
                          : product.category}
                      </p>
                      <h3 className="text-base font-semibold">
                        <Link
                          to={`/shop/product/${product.slug}`}
                          className="hover:text-primary"
                        >
                          {product.name}
                        </Link>
                      </h3>
                      {product.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {product.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold">
                        {selectedVariant
                          ? formatCurrency(selectedVariant.priceInCents)
                          : formatCurrency(product.minPriceInCents)}
                      </p>
                      {(!selectedVariant ||
                        !isVariantInStock(selectedVariant)) && (
                        <Badge variant="secondary">Out of stock</Badge>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => addToCart(product, selectedVariant?.id)}
                      disabled={
                        !selectedVariant || !isVariantInStock(selectedVariant)
                      }
                    >
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Stacks & Bundles */}
        {bundles.length > 0 && (
          <section id="stacks" className="mt-10 space-y-4 scroll-mt-24">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">
                <Package className="mr-2 inline-block h-5 w-5 text-primary" />
                Stack & Save
              </h2>
              <p className="text-sm text-muted-foreground">
                Grab a pre-built bundle and save versus buying individually.
              </p>
            </div>
            <div
              className={cn(
                'grid gap-4',
                isMobile ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3',
              )}
            >
              {bundles.map((bundle) => {
                const fullPrice = bundle.items.reduce((sum, item) => {
                  const variant = item.product.variants.find(
                    (v) => v.id === item.variantId,
                  );
                  return sum + (variant?.priceInCents ?? 0) * item.quantity;
                }, 0);
                const savings = fullPrice - bundle.priceInCents;
                return (
                  <Card
                    key={bundle.id}
                    className="overflow-hidden transition-shadow hover:shadow-lg"
                  >
                    <Link to={`/shop/bundle/${bundle.slug}`}>
                      {bundle.imageUrl ? (
                        <img
                          src={bundle.imageUrl}
                          alt={bundle.name}
                          className="h-40 w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex h-40 items-center justify-center bg-muted">
                          <Package className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </Link>
                    <CardContent className="space-y-3 p-4">
                      <div>
                        <h3 className="text-lg font-semibold">{bundle.name}</h3>
                        {bundle.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {bundle.description}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        {bundle.items.map((item) => (
                          <Link
                            key={item.id}
                            to={`/shop/product/${item.product.slug}`}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            {item.product.images[0]?.url && (
                              <img
                                src={item.product.images[0].url}
                                alt={item.product.name}
                                className="h-6 w-6 rounded object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            )}
                            {item.quantity}× {item.product.name}
                          </Link>
                        ))}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold">
                          {formatCurrency(bundle.priceInCents)}
                        </span>
                        {savings > 0 && (
                          <>
                            <span className="text-sm text-muted-foreground line-through">
                              {formatCurrency(fullPrice)}
                            </span>
                            <Badge className="bg-green-600 text-xs">
                              Save {formatCurrency(savings)}
                            </Badge>
                          </>
                        )}
                      </div>
                      <Button className="w-full" asChild>
                        <Link to={`/shop/bundle/${bundle.slug}`}>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          View Stack & Choose Variants
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        <Dialog
          open={Boolean(quickViewProduct)}
          onOpenChange={(open) => {
            if (!open) {
              setQuickViewProduct(null);
            }
          }}
        >
          <DialogContent className="border-primary/20 bg-background sm:max-w-4xl">
            {quickViewProduct && (
              <div
                className={cn(
                  'grid gap-5',
                  !isMobile && 'lg:grid-cols-[1.05fr_0.95fr]',
                )}
              >
                <div className="overflow-hidden rounded-lg border border-border/60">
                  {quickViewProduct.images[0]?.url ? (
                    <img
                      src={quickViewProduct.images[0].url}
                      alt={
                        quickViewProduct.images[0]?.alt ?? quickViewProduct.name
                      }
                      className="h-full min-h-96 w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-96 items-center justify-center bg-muted text-sm text-muted-foreground">
                      No image available
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <DialogHeader>
                    <DialogTitle className="text-3xl font-black tracking-tight uppercase">
                      {quickViewProduct.name}
                    </DialogTitle>
                    <DialogDescription>
                      {quickViewProduct.description ||
                        'Premium training gear built for performance.'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="text-4xl font-black">
                    {formatCurrency(
                      quickViewSelectedVariant?.priceInCents ??
                        quickViewProduct.minPriceInCents,
                    )}
                  </div>

                  {quickViewColorOptions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Color: {quickViewColor || 'Any'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {quickViewColorOptions.map((color) => (
                          <button
                            key={`color-${color}`}
                            type="button"
                            className={[
                              'rounded-md border px-3 py-1.5 text-sm font-medium',
                              quickViewColor === color
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-input hover:border-primary/50',
                            ].join(' ')}
                            onClick={() => {
                              setQuickViewColor(color);
                              syncQuickViewVariantByAttributes(
                                color,
                                quickViewSize,
                              );
                            }}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {quickViewSizeOptions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Size: {quickViewSize || 'Any'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {quickViewSizeOptions.map((size) => (
                          <button
                            key={`size-${size}`}
                            type="button"
                            className={[
                              'min-w-12 rounded-md border px-3 py-1.5 text-sm font-semibold',
                              quickViewSize === size
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-input hover:border-primary/50',
                            ].join(' ')}
                            onClick={() => {
                              setQuickViewSize(size);
                              syncQuickViewVariantByAttributes(
                                quickViewColor,
                                size,
                              );
                            }}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Variant
                    </p>
                    <select
                      value={quickViewSelectedVariant?.id ?? ''}
                      onChange={(event) => {
                        const nextVariant = quickViewVariants.find(
                          (variant) => variant.id === event.target.value,
                        );

                        setQuickViewVariantId(event.target.value);
                        setQuickViewColor(
                          nextVariant
                            ? getVariantAttribute(nextVariant, 'color')
                            : '',
                        );
                        setQuickViewSize(
                          nextVariant
                            ? getVariantAttribute(nextVariant, 'size')
                            : '',
                        );
                      }}
                      className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                      disabled={quickViewVariants.length === 0}
                    >
                      {quickViewVariants.length === 0 ? (
                        <option value="">No variants available</option>
                      ) : (
                        quickViewVariants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.title} ·{' '}
                            {formatCurrency(variant.priceInCents)}
                            {isVariantInStock(variant) ? '' : ' (Out of stock)'}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <Button
                    className="h-12 w-full text-base font-bold"
                    onClick={addQuickViewToCart}
                    disabled={
                      !quickViewSelectedVariant ||
                      !isVariantInStock(quickViewSelectedVariant)
                    }
                  >
                    Add to Cart ·{' '}
                    {formatCurrency(
                      quickViewSelectedVariant?.priceInCents ??
                        quickViewProduct.minPriceInCents,
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    className="h-11 w-full text-sm font-semibold"
                    onClick={() => {
                      navigate(`/shop/product/${quickViewProduct.slug}`);
                      setQuickViewProduct(null);
                    }}
                  >
                    View Full Product Page
                  </Button>

                  <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5" /> Free shipping $75+
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5" /> 30-day returns
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {showCart && (
          <div className="fixed inset-0 z-50 bg-black/70 p-4">
            <div className="ml-auto flex h-full w-full max-w-xl flex-col rounded-lg border bg-background shadow-lg">
              <div className="flex items-center justify-between border-b p-4">
                <h2 className="text-lg font-semibold">Your Cart</h2>
                <button onClick={() => setShowCart(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Your cart is empty.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item) => (
                        <TableRow key={item.variant.id}>
                          <TableCell>
                            <div className="font-medium">
                              {item.product.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.variant.title}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQty(item.variant.id, -1)}
                              >
                                -
                              </Button>
                              <span>{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQty(item.variant.id, 1)}
                              >
                                +
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(
                              item.variant.priceInCents * item.quantity,
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFromCart(item.variant.id)}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                <div className="mt-4 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  Checkout details are collected on the next page.
                </div>
              </div>
              <div className="border-t p-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span>Subtotal</span>
                  <span className="font-semibold">
                    {formatCurrency(cartTotalInCents)}
                  </span>
                </div>
                <Button
                  className="w-full"
                  onClick={goToCheckout}
                  disabled={cart.length === 0}
                >
                  Checkout
                </Button>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
          aria-label="Open cart"
        >
          <ShoppingCart className="h-6 w-6" />
          {cart.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
              {cart.length > 99 ? '99+' : cart.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
