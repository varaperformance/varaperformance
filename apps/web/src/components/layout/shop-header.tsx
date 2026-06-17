import { useRef, useState, useSyncExternalStore } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { Search, ShoppingBag, Menu, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/features/auth';
import {
  useShopCatalog,
  useShopCategories,
  useShopHeaderSettings,
  useShopBundles,
} from '@/features/commerce';
import { NotificationBell } from '@/components/notification/notification-bell';
import { loadShopCart } from '@/lib/shop-checkout-state';
import logo from '@/assets/images/logo.png';

const CART_STORAGE_KEY = 'shop.cart.items.v1';

function useCartItemCount() {
  const count = useSyncExternalStore(
    (cb) => {
      const handler = (e: StorageEvent) => {
        if (e.key === CART_STORAGE_KEY) cb();
      };
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    },
    () => {
      const items = loadShopCart();
      return items.reduce((sum, i) => sum + i.quantity, 0);
    },
  );
  return count;
}

interface ShopCategoryNavLink {
  to: string;
  label: string;
  hasDropdown?: boolean;
}

const staticTailLinks: ShopCategoryNavLink[] = [
  { to: '/shop#stacks', label: 'Stack & Save', hasDropdown: true },
];

const normalizeCategory = (value: string | null | undefined) => {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .replace(/s$/, '');
};

const categoryAliases: Record<string, string[]> = {
  preworkout: ['preworkout', 'preworkouts'],
  protein: ['protein', 'proteins'],
  performance: ['performance', 'strength', 'training'],
  recovery: ['recovery', 'recover', 'hydration', 'electrolyte'],
  gear: ['gear', 'apparel', 'clothing'],
  apparel: ['apparel', 'gear', 'clothing'],
};

const ShopHeader = () => {
  const cartItemCount = useCartItemCount();
  const { isAuthenticated, profile } = useAuth();
  const { data: categoriesData } = useShopCategories();
  const { data: headerSettingsData } = useShopHeaderSettings();
  const { data: bundlesData } = useShopBundles();
  const { data: catalogData, isLoading: isCatalogLoading } = useShopCatalog({
    sort: 'featured',
    limit: 100,
    offset: 0,
  });
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [hoveredSubcategory, setHoveredSubcategory] = useState<string | null>(
    null,
  );
  const dropdownCloseTimeoutRef = useRef<number | null>(null);

  const clearDropdownCloseTimeout = () => {
    if (dropdownCloseTimeoutRef.current !== null) {
      window.clearTimeout(dropdownCloseTimeoutRef.current);
      dropdownCloseTimeoutRef.current = null;
    }
  };

  const openDropdown = (key: string | null) => {
    clearDropdownCloseTimeout();
    setActiveDropdown(key);
    setHoveredSubcategory(null);
  };

  const closeDropdownWithDelay = () => {
    clearDropdownCloseTimeout();
    dropdownCloseTimeoutRef.current = window.setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  const allCategories = categoriesData?.data?.items ?? [];

  const dbCategoryLinks: ShopCategoryNavLink[] = allCategories
    .filter((category) => !category.parentId)
    .map((category) => ({
      to: `/shop?category=${encodeURIComponent(category.name)}`,
      label: category.name,
      hasDropdown: true,
    }));

  const shopCategories: ShopCategoryNavLink[] = [
    { to: '/shop?category=All', label: 'All Products', hasDropdown: false },
    ...dbCategoryLinks,
    ...staticTailLinks,
  ];
  const freeShippingMessage =
    headerSettingsData?.data?.freeShippingMessage ||
    'Free Shipping on Orders $75+';
  const catalogProducts = catalogData?.data?.items ?? [];
  const bundles = bundlesData?.data?.items ?? [];

  const formatCurrency = (valueInCents: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(valueInCents / 100);

  const categoryFromLink = (to: string) => {
    const [, query = ''] = to.split('?');
    const params = new URLSearchParams(query);
    return params.get('category') || null;
  };

  const subcategoriesForCategory = (label: string) => {
    const parent = allCategories.find(
      (category) =>
        normalizeCategory(category.name) === normalizeCategory(label),
    );
    return parent?.children ?? [];
  };

  const fallbackCategoryFromLabel = (label: string) => {
    const matchingDbCategory = allCategories.find(
      (category) =>
        normalizeCategory(category.name) === normalizeCategory(label),
    );
    if (matchingDbCategory?.name) {
      return matchingDbCategory.name;
    }

    const normalized = normalizeCategory(label);
    const found = catalogProducts.find(
      (item) => normalizeCategory(item.category) === normalized,
    );
    return found?.category ?? null;
  };

  const productsForCategory = (to: string, label: string) => {
    const category = categoryFromLink(to);
    const resolvedCategory =
      category && category !== 'All'
        ? decodeURIComponent(category)
        : fallbackCategoryFromLabel(label);

    if (!resolvedCategory || resolvedCategory === 'All') return [];

    const normalizedTarget = normalizeCategory(resolvedCategory);
    const normalizedLabel = normalizeCategory(label);
    const normalizedTargets = new Set<string>([
      normalizedTarget,
      normalizedLabel,
      ...(categoryAliases[normalizedTarget] ?? []),
      ...(categoryAliases[normalizedLabel] ?? []),
    ]);

    // Also include subcategory names so parent dropdowns show child products
    const subs = subcategoriesForCategory(label);
    for (const sub of subs) {
      normalizedTargets.add(normalizeCategory(sub.name));
    }

    return catalogProducts
      .filter((item) => {
        const itemCategory = normalizeCategory(item.category);
        if (normalizedTargets.has(itemCategory)) return true;

        for (const target of normalizedTargets) {
          if (!target) continue;
          if (itemCategory.includes(target) || target.includes(itemCategory)) {
            return true;
          }
        }

        return false;
      })
      .slice(0, 6);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(`/shop?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/shop');
    }
    setSearchOpen(false);
    setMobileMenuOpen(false);
  };

  const isCategoryActive = (to: string) => {
    const [targetPath, targetSearch = ''] = to.split('?');
    if (targetPath && location.pathname !== targetPath) return false;
    if (!targetSearch) {
      return location.pathname === targetPath;
    }
    const targetParams = new URLSearchParams(targetSearch);
    const currentParams = new URLSearchParams(location.search);
    return Array.from(targetParams.entries()).every(
      ([key, value]) => currentParams.get(key) === value,
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background shadow-sm">
      <div className="container relative flex h-16 items-center justify-between gap-4">
        {/* Mobile menu button */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative z-20 md:hidden"
            aria-label="Open navigation menu"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <SheetContent
            side="left"
            className="w-[88vw] max-w-sm overflow-y-auto p-0"
          >
            <SheetTitle className="sr-only">Shop navigation</SheetTitle>
            <div className="border-b border-border/50 px-5 py-4">
              <Link
                to="/shop"
                onClick={() => setMobileMenuOpen(false)}
                className="mb-3 flex items-center gap-2 transition-opacity hover:opacity-80"
              >
                <img
                  src={logo}
                  alt="Vara Performance"
                  className="h-8 w-8 rounded-lg object-contain"
                />
                <span className="text-base font-bold tracking-tight">
                  Vara Performance
                </span>
              </Link>
              <p className="text-sm font-semibold text-foreground">Shop</p>
              <p className="text-xs text-muted-foreground">
                Browse categories and products
              </p>
            </div>

            {/* Mobile Search */}
            <div className="border-b border-border/50 p-4">
              <form onSubmit={handleSearchSubmit} className="flex">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 rounded-l-lg border border-input bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-r-lg bg-primary px-4 font-bold text-primary-foreground"
                >
                  <Search className="h-4 w-4" />
                </button>
              </form>
            </div>

            {/* Mobile Categories */}
            <div className="space-y-1 px-3 py-4">
              {shopCategories.map((category) => (
                <NavLink
                  key={category.to}
                  to={category.to}
                  className={({ isActive }) =>
                    [
                      'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive || isCategoryActive(category.to)
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted',
                    ]
                      .filter(Boolean)
                      .join(' ')
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {category.label}
                </NavLink>
              ))}
            </div>

            {/* Mobile Auth */}
            <div className="flex gap-2 border-t border-border/50 p-4">
              {isAuthenticated ? (
                <>
                  <Button variant="outline" className="flex-1" asChild>
                    <Link
                      to="/shop/orders"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Orders
                    </Link>
                  </Button>
                  <Button className="flex-1" asChild>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Account
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="flex-1" asChild>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                  <Button className="flex-1" asChild>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Join Now
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link
          to="/shop"
          className="hidden items-center gap-3 transition-opacity hover:opacity-80 md:flex"
        >
          <img
            src={logo}
            alt="Vara Performance"
            className="h-9 w-9 rounded-lg"
          />
          <span className="text-xl font-bold tracking-tight">
            Vara Performance
          </span>
        </Link>

        {/* Category Navigation — pill bar matching main site style */}
        <nav className="hidden md:flex">
          <ul className="flex items-center gap-1 rounded-full border border-border/50 bg-muted/30 px-1 py-1">
            {shopCategories.map((cat) => (
              <li
                key={cat.to}
                className="group relative"
                onMouseEnter={() =>
                  openDropdown(cat.hasDropdown ? cat.to : null)
                }
                onMouseLeave={() => {
                  if (cat.hasDropdown) closeDropdownWithDelay();
                }}
              >
                <NavLink
                  to={cat.to}
                  className={({ isActive }) =>
                    [
                      'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                      isActive || isCategoryActive(cat.to)
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm',
                    ]
                      .filter(Boolean)
                      .join(' ')
                  }
                >
                  {cat.label}
                  {cat.hasDropdown && (
                    <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />
                  )}
                </NavLink>

                {/* Dropdown panel */}
                {cat.hasDropdown && activeDropdown === cat.to && (
                  <div
                    className="absolute left-1/2 top-full z-50 w-lg -translate-x-1/2 pt-2"
                    onMouseEnter={() => openDropdown(cat.to)}
                    onMouseLeave={closeDropdownWithDelay}
                  >
                    <div className="overflow-hidden rounded-xl border border-border bg-background/95 shadow-xl backdrop-blur">
                      {(() => {
                        if (cat.to === '/shop#stacks') {
                          if (bundles.length === 0) {
                            return (
                              <p className="p-6 text-sm text-muted-foreground">
                                No stacks available yet.
                              </p>
                            );
                          }
                          return (
                            <div className="p-2">
                              {bundles.map((bundle) => (
                                <Link
                                  key={bundle.id}
                                  to={`/shop/bundle/${bundle.slug}`}
                                  className="flex items-center justify-between rounded-lg px-4 py-3 text-sm transition-colors hover:bg-accent"
                                >
                                  <div className="flex items-center gap-3">
                                    {bundle.imageUrl ? (
                                      <img
                                        src={bundle.imageUrl}
                                        alt={bundle.name}
                                        className="h-9 w-9 rounded-lg object-cover"
                                        loading="lazy"
                                        decoding="async"
                                      />
                                    ) : (
                                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                                        📦
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-semibold uppercase tracking-wide">
                                        {bundle.name}
                                      </span>
                                      <p className="text-xs text-muted-foreground">
                                        {bundle.items.length} product
                                        {bundle.items.length !== 1 ? 's' : ''}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="font-medium text-muted-foreground">
                                    {formatCurrency(bundle.priceInCents)}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          );
                        }

                        const dropdownProducts = productsForCategory(
                          cat.to,
                          cat.label,
                        );
                        const subcategories = subcategoriesForCategory(
                          cat.label,
                        );
                        const hasSubcategories = subcategories.length > 0;

                        if (isCatalogLoading) {
                          return (
                            <p className="p-6 text-sm text-muted-foreground">
                              Loading...
                            </p>
                          );
                        }

                        if (
                          dropdownProducts.length === 0 &&
                          !hasSubcategories
                        ) {
                          return (
                            <p className="p-6 text-sm text-muted-foreground">
                              No products in this category yet.
                            </p>
                          );
                        }

                        if (hasSubcategories) {
                          const subProducts = hoveredSubcategory
                            ? catalogProducts
                                .filter(
                                  (p) =>
                                    normalizeCategory(p.category) ===
                                    normalizeCategory(hoveredSubcategory),
                                )
                                .slice(0, 8)
                            : [];

                          return (
                            <div className="grid grid-cols-[auto_1fr]">
                              {/* Subcategories — left */}
                              <div className="min-w-48 p-2">
                                {subcategories.map((sub) => (
                                  <Link
                                    key={sub.id}
                                    to={`/shop?category=${encodeURIComponent(sub.name)}`}
                                    className={[
                                      'flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors',
                                      hoveredSubcategory === sub.name
                                        ? 'bg-accent'
                                        : 'hover:bg-accent',
                                    ].join(' ')}
                                    onMouseEnter={() =>
                                      setHoveredSubcategory(sub.name)
                                    }
                                  >
                                    {sub.name}
                                    <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
                                  </Link>
                                ))}
                              </div>

                              {/* Products for hovered subcategory — right */}
                              {subProducts.length > 0 && (
                                <div className="border-l border-border p-2">
                                  {subProducts.map((product) => (
                                    <Link
                                      key={product.id}
                                      to={`/shop/product/${product.slug}`}
                                      className="block rounded-lg px-4 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors hover:bg-accent"
                                    >
                                      {product.name}
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div className="p-2">
                            {dropdownProducts.map((product) => (
                              <Link
                                key={`${cat.to}-${product.id}`}
                                to={`/shop/product/${product.slug}`}
                                className="block rounded-lg px-4 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors hover:bg-accent"
                              >
                                {product.name}
                              </Link>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Right actions */}
        <div className="relative z-20 flex items-center gap-2">
          {/* Search toggle */}
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Search className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-2" sideOffset={8}>
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  autoFocus
                />
                <Button type="submit" size="sm">
                  Go
                </Button>
              </form>
            </PopoverContent>
          </Popover>

          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => navigate('/shop/checkout')}
          >
            <ShoppingBag className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {cartItemCount > 9 ? '9+' : cartItemCount}
              </span>
            )}
          </Button>

          {/* Auth area */}
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <Link
                to="/dashboard"
                className="flex items-center gap-2 rounded-full border border-border/50 bg-muted/20 px-2 py-1.5 transition-colors hover:bg-muted/40"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage
                    src={profile?.avatarUrl ?? undefined}
                    alt={profile?.displayName ?? 'User'}
                  />
                  <AvatarFallback>
                    {(profile?.displayName ?? 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-28 truncate text-sm font-medium sm:inline-block">
                  {profile?.displayName ?? 'Account'}
                </span>
              </Link>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Free shipping banner */}
      {freeShippingMessage && (
        <div className="border-t border-border/30 bg-primary/5">
          <p className="py-1 text-center text-xs font-medium text-primary">
            {freeShippingMessage}
          </p>
        </div>
      )}
    </header>
  );
};

export default ShopHeader;
