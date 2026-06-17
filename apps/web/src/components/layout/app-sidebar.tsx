import { Link, NavLink, useLocation } from 'react-router';
import type { MouseEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  StickyNote,
  Pill,
  Rss,
  Calculator,
  Users,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Heart,
  Activity,
  Scale,
  Droplets,
  Trophy,
  GraduationCap,
  MessageCircle,
  FileText,
  Utensils,
  Target,
  ClipboardList,
  Package,
  CalendarDays,
  CreditCard,
  Mountain,
  Syringe,
  Plug,
  ChefHat,
  ListChecks,
  BarChart3,
  Award,
  Swords,
  Ruler,
  Footprints,
  Moon,
  ChevronDown,
  ShoppingBasket,
} from 'lucide-react';
import { useRequirePermission } from '@/features/auth';
import { useTotalUnread } from '@/features/messaging';
import { prefetchRoute } from '@/lib/route-prefetch';
import { useHealthNavGroupOpen } from '@/hooks/use-health-nav-group-open';
import logo from '@/assets/images/logo.png';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  mobileSheet?: boolean;
}

// Navigation structure
export const mainNavItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    title: 'Integrations',
    icon: Plug,
    href: '/integrations',
  },
];

// Client-only navigation items
export const clientNavItems = [
  {
    title: 'My Coaching',
    icon: GraduationCap,
    href: '/my-coaching',
  },
];

export const shopOrdersNavItem = {
  title: 'Shop Orders',
  icon: Package,
  href: '/shop/orders',
};

// Messaging - accessible by User, Client, and Coach
export const messagingNavItem = {
  title: 'Messages',
  icon: MessageCircle,
  href: '/messages',
};

export const calendarNavItem = {
  title: 'Calendar',
  icon: CalendarDays,
  href: '/calendar',
};

export type AppSidebarNavItem = {
  title: string;
  icon: LucideIcon;
  href: string;
};

export type HealthNavGroupDef = {
  id: string;
  label: string;
  items: AppSidebarNavItem[];
};

/** Grouped health navigation — flattened as `healthNavItems` for search / legacy consumers. */
export const healthNavGroups: HealthNavGroupDef[] = [
  {
    id: 'overview',
    label: 'Overview & habits',
    items: [
      { title: 'Goals', icon: Target, href: '/goals' },
      { title: 'Habits', icon: ListChecks, href: '/habits' },
      { title: 'Weekly Report', icon: BarChart3, href: '/weekly-report' },
    ],
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    items: [
      { title: 'Food Diary', icon: Utensils, href: '/food-diary' },
      { title: 'Recipes', icon: ChefHat, href: '/recipes' },
      { title: 'Meal Plans', icon: CalendarDays, href: '/meal-plans' },
      { title: 'Grocery Lists', icon: ShoppingBasket, href: '/grocery-lists' },
    ],
  },
  {
    id: 'vitals',
    label: 'Body & vitals',
    items: [
      { title: 'Water Intake', icon: Droplets, href: '/water' },
      { title: 'Step Tracking', icon: Footprints, href: '/steps' },
      { title: 'Sleep Tracking', icon: Moon, href: '/sleep' },
      { title: 'Heart Rate', icon: Heart, href: '/heart-rate' },
      { title: 'Weight Tracking', icon: Scale, href: '/weight' },
      { title: 'Body Measurements', icon: Ruler, href: '/measurements' },
    ],
  },
  {
    id: 'training',
    label: 'Training',
    items: [
      { title: 'Workout Log', icon: Activity, href: '/workouts' },
      { title: 'Workout Plans', icon: ClipboardList, href: '/workout-plans' },
      { title: 'Personal Records', icon: Trophy, href: '/personal-records' },
      { title: 'Exercises', icon: Dumbbell, href: '/exercises' },
    ],
  },
  {
    id: 'tools',
    label: 'Health tools',
    items: [
      { title: 'Stack Management', icon: Pill, href: '/stack' },
      { title: 'Injection Tracker', icon: Syringe, href: '/injections' },
      { title: 'Personal Notes', icon: StickyNote, href: '/notes' },
      { title: 'Calculators', icon: Calculator, href: '/calculators' },
    ],
  },
];

export const healthNavItems: AppSidebarNavItem[] = healthNavGroups.flatMap(
  (g) => g.items,
);

export const socialNavItems = [
  {
    title: 'Elevate',
    icon: Rss,
    href: '/elevate',
  },
  {
    title: 'Climb',
    icon: Mountain,
    href: '/climb',
  },
  {
    title: 'Achievements',
    icon: Award,
    href: '/achievements',
  },
  {
    title: 'Challenges',
    icon: Swords,
    href: '/challenges',
  },
];

export const coachNavItems = [
  {
    title: 'Coach Dashboard',
    icon: Users,
    href: '/coaches/dashboard',
  },
  {
    title: 'Clients',
    icon: Users,
    href: '/coaches/clients',
  },
  {
    title: 'Workout Plans',
    icon: ClipboardList,
    href: '/coaches/workout-plans',
  },
  {
    title: 'Contracts',
    icon: FileText,
    href: '/coaches/contracts',
  },
  {
    title: 'Packages',
    icon: Package,
    href: '/coaches/packages',
  },
  {
    title: 'Availability',
    icon: CalendarDays,
    href: '/coaches/availability',
  },
  {
    title: 'Subscription',
    icon: CreditCard,
    href: '/coaches/subscription',
  },
];

/** Top-level section title — left-aligned with a horizontal rule to the right edge. */
export function SidebarCategoryLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2.5 flex min-w-0 items-center gap-2.5 px-0.5">
      <h2 className="m-0 shrink-0 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {children}
      </h2>
      <span className="h-px min-w-0 flex-1 bg-border" aria-hidden />
    </div>
  );
}

/** Collapsible subgroup row (Health, etc.) — shared with mobile More sheet. */
export const sidebarSubgroupTriggerClass =
  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium leading-snug text-muted-foreground transition-colors hover:bg-muted/35 hover:text-foreground [&[data-state=open]>svg]:rotate-180';

/** Stack of nav rows; same surface as the sidebar — no inner borders or fills. */
function SidebarNavBlock({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: ReactNode;
}) {
  return (
    <div className={collapsed ? 'space-y-1' : 'space-y-0.5'}>{children}</div>
  );
}

// NavItem component - must be defined outside main component to avoid re-creation during render
function NavItem({
  item,
  active,
  collapsed,
  onNavigate,
  showLabel = true,
  showIndicator = false,
  nested = false,
}: {
  item: AppSidebarNavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
  showLabel?: boolean;
  showIndicator?: boolean;
  /** Indented link row (e.g. under a health sub-group). */
  nested?: boolean;
}) {
  const Icon = item.icon;

  const content = (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      className={cn(
        'w-full justify-start gap-3',
        collapsed && 'justify-center px-2',
        nested && !collapsed && 'pl-3',
        active && 'bg-primary/10 text-primary hover:bg-primary/15',
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
        {showLabel && !collapsed && (
          <span className="flex min-w-0 items-center gap-2 truncate">
            <span className="truncate">{item.title}</span>
            {showIndicator && (
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            )}
          </span>
        )}
        {collapsed && showIndicator && (
          <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
        )}
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

export default function AppSidebar({
  collapsed,
  onToggle,
  onNavigate,
  mobileSheet = false,
}: AppSidebarProps) {
  const location = useLocation();
  const canReadMessaging = useRequirePermission('messaging:read');
  const canReadCalendar = useRequirePermission('calendar:read');
  const canReadCoaching = useRequirePermission('coaching:read');
  const canUpdateCoaching = useRequirePermission('coaching:update');
  const canAccessCoachSection = canReadCoaching || canUpdateCoaching;
  const unreadMessagesCount = useTotalUnread();
  const { openById, setGroupOpen } = useHealthNavGroupOpen();

  const isActive = (href: string) => {
    const [hrefPath, hrefSearch = ''] = href.split('?');

    if (hrefPath === '/dashboard') {
      return location.pathname === '/dashboard';
    }

    const pathMatches =
      location.pathname === hrefPath ||
      location.pathname.startsWith(`${hrefPath}/`);

    if (!hrefSearch) {
      return pathMatches;
    }

    if (!pathMatches) {
      return false;
    }

    const targetParams = new URLSearchParams(hrefSearch);
    const currentParams = new URLSearchParams(location.search);
    return Array.from(targetParams.entries()).every(
      ([key, value]) => currentParams.get(key) === value,
    );
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
          mobileSheet
            ? 'relative z-auto flex h-full w-full flex-col bg-background'
            : 'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border/50 bg-background transition-all duration-300',
          mobileSheet ? 'border-0' : 'border-r border-border/50',
          mobileSheet ? 'w-full' : collapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border/50 px-4">
          <Link
            to="/"
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 transition-opacity hover:opacity-80',
              collapsed && 'justify-center',
            )}
          >
            <img src={logo} alt="Vara" className="h-8 w-8 rounded-lg" />
            {!collapsed && (
              <span className="font-bold tracking-tight">Vara Performance</span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="min-h-0 flex-1 px-3 py-4">
          <div className="space-y-6">
            {/* Main */}
            <div>
              {!collapsed && <SidebarCategoryLabel>Main</SidebarCategoryLabel>}
              {collapsed && <Separator className="mb-2" />}
              <SidebarNavBlock collapsed={collapsed}>
                {mainNavItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                ))}
                {clientNavItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                ))}
                {canReadMessaging && (
                  <NavItem
                    item={messagingNavItem}
                    active={isActive(messagingNavItem.href)}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                    showIndicator={unreadMessagesCount > 0}
                  />
                )}
                {canReadCalendar && (
                  <NavItem
                    item={calendarNavItem}
                    active={isActive(calendarNavItem.href)}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                )}
                <NavItem
                  item={shopOrdersNavItem}
                  active={isActive(shopOrdersNavItem.href)}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              </SidebarNavBlock>
            </div>

            {/* Health — category vs sub-groups clearly separated */}
            <div>
              {!collapsed && (
                <SidebarCategoryLabel>Health</SidebarCategoryLabel>
              )}
              {collapsed && <Separator className="mb-2" />}
              {collapsed ? (
                <div className="space-y-1">
                  {healthNavGroups.map((group, gi) => (
                    <div key={group.id}>
                      {gi > 0 && <Separator className="my-2" />}
                      {group.items.map((item) => (
                        <NavItem
                          key={item.href}
                          item={item}
                          active={isActive(item.href)}
                          collapsed
                          onNavigate={onNavigate}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  {healthNavGroups.map((group, index) => (
                    <div key={group.id} className={cn(index > 0 && 'mt-3.5')}>
                      <Collapsible
                        open={openById[group.id] ?? true}
                        onOpenChange={(open) => setGroupOpen(group.id, open)}
                      >
                        <CollapsibleTrigger
                          type="button"
                          className={sidebarSubgroupTriggerClass}
                        >
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-45 transition-transform duration-200" />
                          <span className="min-w-0 flex-1 truncate">
                            {group.label}
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-0.5 pb-1 pt-0.5">
                            {group.items.map((item) => (
                              <NavItem
                                key={item.href}
                                item={item}
                                active={isActive(item.href)}
                                collapsed={false}
                                onNavigate={onNavigate}
                              />
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Social */}
            <div>
              {!collapsed && (
                <SidebarCategoryLabel>Social</SidebarCategoryLabel>
              )}
              {collapsed && <Separator className="mb-2" />}
              <SidebarNavBlock collapsed={collapsed}>
                {socialNavItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                ))}
              </SidebarNavBlock>
            </div>

            {canAccessCoachSection && (
              <div>
                {!collapsed && (
                  <SidebarCategoryLabel>Coaching</SidebarCategoryLabel>
                )}
                {collapsed && <Separator className="mb-2" />}
                <SidebarNavBlock collapsed={collapsed}>
                  {coachNavItems.map((item) => (
                    <NavItem
                      key={item.href}
                      item={item}
                      active={isActive(item.href)}
                      collapsed={collapsed}
                      onNavigate={onNavigate}
                    />
                  ))}
                </SidebarNavBlock>
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
              'w-full',
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
