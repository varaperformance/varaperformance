import { Link, NavLink, useLocation } from 'react-router';
import type { MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Users,
  Shield,
  KeyRound,
  FileText,
  AlertTriangle,
  Building2,
  UserCheck,
  FolderOpen,
  Tag,
  Dumbbell,
  UtensilsCrossed,
  CreditCard,
  Store,
  Boxes,
  TicketPercent,
  Handshake,
  Receipt,
  Users2,
  Scale,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Flag,
  Sparkles,
  Megaphone,
  ScrollText,
  Layers,
  Settings,
  Truck,
  Rocket,
  Mail,
  Newspaper,
  Swords,
  ChefHat,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { prefetchRoute } from '@/lib/route-prefetch';
import logo from '@/assets/images/logo.png';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

type AdminNavItemType = {
  title: string;
  icon: typeof LayoutDashboard;
  href: string;
  requiredPermission?: string | string[];
};

// Admin navigation structure
const adminNavItems = [
  {
    title: 'Overview',
    icon: LayoutDashboard,
    href: '/admin',
    requiredPermission: 'admin:read',
  },
];

const userManagementItems: AdminNavItemType[] = [
  {
    title: 'Users',
    icon: Users,
    href: '/admin/users',
    requiredPermission: 'admin:read',
  },
  {
    title: 'Roles & Permissions',
    icon: Shield,
    href: '/admin/roles',
    requiredPermission: 'admin:read',
  },
  {
    title: 'Private Mode',
    icon: KeyRound,
    href: '/admin/private-mode',
    requiredPermission: 'admin:update',
  },
];

const moderationItems: AdminNavItemType[] = [
  {
    title: 'Reported Posts',
    icon: Flag,
    href: '/admin/reports',
    requiredPermission: 'elevate:moderate',
  },
];

const contentItems: AdminNavItemType[] = [
  {
    title: 'Blog Posts',
    icon: FileText,
    href: '/admin/blogs',
    requiredPermission: 'blog:create',
  },
  {
    title: 'Exercises',
    icon: Dumbbell,
    href: '/admin/exercises',
    requiredPermission: 'exercise:read',
  },
  {
    title: 'Foods',
    icon: UtensilsCrossed,
    href: '/admin/foods',
    requiredPermission: 'nutrition:read',
  },
  {
    title: 'Recipe Categories',
    icon: UtensilsCrossed,
    href: '/admin/recipe-categories',
    requiredPermission: 'recipe:read',
  },
  {
    title: 'Recipes',
    icon: ChefHat,
    href: '/admin/recipes',
    requiredPermission: 'recipe:read',
  },
  {
    title: 'Spotlight',
    icon: Sparkles,
    href: '/admin/spotlight',
    requiredPermission: 'spotlight:read',
  },
  {
    title: 'Categories',
    icon: FolderOpen,
    href: '/admin/categories',
    requiredPermission: 'blog:read',
  },
  {
    title: 'Tags',
    icon: Tag,
    href: '/admin/tags',
    requiredPermission: 'blog:read',
  },
  {
    title: 'FAQs',
    icon: HelpCircle,
    href: '/admin/faqs',
    requiredPermission: 'faq:read',
  },
  {
    title: 'Release Notes',
    icon: Rocket,
    href: '/admin/release-notes',
    requiredPermission: 'release-note:read',
  },
  {
    title: 'Challenges',
    icon: Swords,
    href: '/admin/challenges',
    requiredPermission: 'challenge:read',
  },
];

const businessItems: AdminNavItemType[] = [
  {
    title: 'Team Members',
    icon: Users,
    href: '/admin/teams',
    requiredPermission: 'team:read',
  },
  {
    title: 'Ambassadors',
    icon: Megaphone,
    href: '/admin/ambassadors',
    requiredPermission: 'team:read',
  },
  {
    title: 'Coaches',
    icon: UserCheck,
    href: '/admin/coaches',
    requiredPermission: 'coach:read',
  },
  {
    title: 'Payments',
    icon: CreditCard,
    href: '/admin/payments',
    requiredPermission: 'payment:read',
  },
  {
    title: 'Gyms',
    icon: Building2,
    href: '/admin/gyms',
    requiredPermission: 'gym:create',
  },
];

const marketingItems: AdminNavItemType[] = [
  {
    title: 'Subscribers',
    icon: Mail,
    href: '/admin/marketing/subscribers',
    requiredPermission: 'marketing:read',
  },
  {
    title: 'Newsletters',
    icon: Newspaper,
    href: '/admin/marketing/newsletters',
    requiredPermission: 'marketing:read',
  },
];

const shopItems: AdminNavItemType[] = [
  {
    title: 'Categories',
    icon: FolderOpen,
    href: '/admin/shop/categories',
    requiredPermission: 'shop:catalog-read',
  },
  {
    title: 'Brands',
    icon: Tag,
    href: '/admin/shop/brands',
    requiredPermission: 'shop:catalog-read',
  },
  {
    title: 'Catalog',
    icon: Store,
    href: '/admin/shop/catalog',
    requiredPermission: 'shop:catalog-read',
  },
  {
    title: 'Stacks',
    icon: Layers,
    href: '/admin/shop/stacks',
    requiredPermission: 'shop:catalog-read',
  },
  {
    title: 'Hero Banners',
    icon: Flag,
    href: '/admin/shop/hero',
    requiredPermission: 'shop:catalog-read',
  },
  {
    title: 'Inventory',
    icon: Boxes,
    href: '/admin/shop/inventory',
    requiredPermission: 'shop:inventory-read',
  },
  {
    title: 'Discount Codes',
    icon: TicketPercent,
    href: '/admin/shop/discount-codes',
    requiredPermission: 'shop:discount-read',
  },
  {
    title: 'Referrals',
    icon: Handshake,
    href: '/admin/shop/referrals',
    requiredPermission: 'shop:referral-read',
  },
  {
    title: 'Orders',
    icon: Receipt,
    href: '/admin/shop/orders',
    requiredPermission: ['payment:read', 'shop:order-read'],
  },
  {
    title: 'Fulfillment',
    icon: Truck,
    href: '/admin/shop/fulfillment',
    requiredPermission: ['payment:read', 'shop:order-read'],
  },
  {
    title: 'Customers',
    icon: Users2,
    href: '/admin/shop/customers',
    requiredPermission: ['payment:read', 'shop:customer-read'],
  },
  {
    title: 'Settings',
    icon: Settings,
    href: '/admin/shop/settings',
    requiredPermission: 'shop:catalog-read',
  },
];

const systemItems: AdminNavItemType[] = [
  {
    title: 'Performance Metrics',
    icon: BarChart3,
    href: '/admin/performance-metrics',
    requiredPermission: 'performance-metric:read',
  },
  {
    title: 'Compliance',
    icon: Shield,
    href: '/admin/compliance',
    requiredPermission: 'legal:read',
  },
  {
    title: 'Status & Incidents',
    icon: AlertTriangle,
    href: '/admin/status',
    requiredPermission: 'incident:create',
  },
  {
    title: 'Legal Documents',
    icon: Scale,
    href: '/admin/legal',
    requiredPermission: 'legal:read',
  },
  {
    title: 'Audit Logs',
    icon: ScrollText,
    href: '/admin/audit-logs',
    requiredPermission: 'admin:read',
  },
];

// Extracted outside component to avoid creating during render
function NavItem({
  item,
  collapsed,
  isActive,
  onNavigate,
}: {
  item: AdminNavItemType;
  collapsed: boolean;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  const content = (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      className={cn(
        'w-full justify-start gap-3 rounded-xl',
        collapsed && 'justify-center px-2',
        isActive && 'bg-primary text-primary-foreground hover:bg-primary/90',
      )}
      asChild
    >
      <NavLink
        to={item.href}
        onClick={onNavigate}
        onMouseEnter={() => prefetchRoute(item.href)}
        onFocus={() => prefetchRoute(item.href)}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.title}</span>}
      </NavLink>
    </Button>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-4">
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

function SectionLabel({
  children,
  collapsed,
}: {
  children: React.ReactNode;
  collapsed: boolean;
}) {
  if (collapsed) {
    return <Separator className="my-3" />;
  }
  return (
    <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/90">
      {children}
    </p>
  );
}

export default function AdminSidebar({
  collapsed,
  onToggle,
  onNavigate,
}: AdminSidebarProps) {
  const location = useLocation();
  const { hasPermission, hasAllPermissions } = useAuth();

  const canAccess = (requiredPermission?: string | string[]) => {
    if (!requiredPermission) return true;
    if (Array.isArray(requiredPermission)) {
      return hasAllPermissions(requiredPermission);
    }
    return hasPermission(requiredPermission);
  };

  const visibleAdminNavItems = adminNavItems.filter((item) =>
    canAccess(item.requiredPermission),
  );
  const visibleUserManagementItems = userManagementItems.filter((item) =>
    canAccess(item.requiredPermission),
  );
  const visibleModerationItems = moderationItems.filter((item) =>
    canAccess(item.requiredPermission),
  );
  const visibleContentItems = contentItems.filter((item) =>
    canAccess(item.requiredPermission),
  );
  const visibleBusinessItems = businessItems.filter((item) =>
    canAccess(item.requiredPermission),
  );
  const visibleMarketingItems = marketingItems.filter((item) =>
    canAccess(item.requiredPermission),
  );
  const visibleShopItems = shopItems.filter((item) =>
    canAccess(item.requiredPermission),
  );
  const visibleSystemItems = systemItems.filter((item) =>
    canAccess(item.requiredPermission),
  );

  const checkActive = (href: string) => {
    if (href === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  const handleNavClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!onNavigate) return;
    const target = event.target as HTMLElement | null;
    const link = target?.closest('a[href]');
    if (link) {
      onNavigate();
    }
  };

  return (
    <TooltipProvider>
      <aside
        onClickCapture={handleNavClickCapture}
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border/60 bg-card/85 backdrop-blur-xl transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Logo */}
        <div className="flex h-18 items-center justify-between border-b border-border/50 px-4">
          <Link
            to="/admin"
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 transition-opacity hover:opacity-80',
              collapsed && 'justify-center',
            )}
          >
            <img src={logo} alt="Vara" className="h-8 w-8 rounded-lg" />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight">
                  Admin Panel
                </span>
                <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  Vara Performance
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="min-h-0 flex-1 px-3 py-4">
          <div className="space-y-6">
            {/* Main */}
            {visibleAdminNavItems.length > 0 && (
              <div className="space-y-1">
                {visibleAdminNavItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    isActive={checkActive(item.href)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}

            {/* User Management */}
            {visibleUserManagementItems.length > 0 && (
              <div className="space-y-1">
                <SectionLabel collapsed={collapsed}>Users</SectionLabel>
                {visibleUserManagementItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    isActive={checkActive(item.href)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}

            {/* Moderation */}
            {visibleModerationItems.length > 0 && (
              <div className="space-y-1">
                <SectionLabel collapsed={collapsed}>Moderation</SectionLabel>
                {visibleModerationItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    isActive={checkActive(item.href)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}

            {/* Content */}
            {visibleContentItems.length > 0 && (
              <div className="space-y-1">
                <SectionLabel collapsed={collapsed}>Content</SectionLabel>
                {visibleContentItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    isActive={checkActive(item.href)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}

            {/* Business */}
            {visibleBusinessItems.length > 0 && (
              <div className="space-y-1">
                <SectionLabel collapsed={collapsed}>Business</SectionLabel>
                {visibleBusinessItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    isActive={checkActive(item.href)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}

            {/* Marketing */}
            {visibleMarketingItems.length > 0 && (
              <div className="space-y-1">
                <SectionLabel collapsed={collapsed}>Marketing</SectionLabel>
                {visibleMarketingItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    isActive={checkActive(item.href)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}

            {/* Shop */}
            {visibleShopItems.length > 0 && (
              <div className="space-y-1">
                <SectionLabel collapsed={collapsed}>Shop</SectionLabel>
                {visibleShopItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    isActive={checkActive(item.href)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}

            {/* System */}
            {visibleSystemItems.length > 0 && (
              <div className="space-y-1">
                <SectionLabel collapsed={collapsed}>System</SectionLabel>
                {visibleSystemItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    isActive={checkActive(item.href)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Bottom section */}
        <div className="shrink-0 border-t border-border/50 p-3">
          {/* Collapse toggle */}
          <Separator className="my-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              'w-full rounded-xl',
              collapsed ? 'justify-center' : 'justify-start gap-3',
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
