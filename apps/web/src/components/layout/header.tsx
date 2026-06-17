import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { useAuth, useRequirePermission } from '@/features/auth';
import {
  LayoutDashboard,
  LogOut,
  Shield,
  ChevronDown,
  User,
  Rss,
  Dumbbell,
  Utensils,
  Settings,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { NotificationBell } from '@/components/notification/notification-bell';
import { prefetchRoute } from '@/lib/route-prefetch';
import logo from '@/assets/images/logo.png';
import { toast } from 'sonner';

const calculatorCategories = [
  {
    title: 'Body Composition',
    items: [
      {
        to: '/calculators/bmi',
        label: 'BMI Calculator',
        description: 'Body Mass Index',
      },
      {
        to: '/calculators/body-fat',
        label: 'Body Fat %',
        description: 'US Navy method',
      },
      {
        to: '/calculators/ffmi',
        label: 'FFMI',
        description: 'Fat-Free Mass Index',
      },
      {
        to: '/calculators/lean-mass',
        label: 'Lean Body Mass',
        description: 'Calculate lean mass',
      },
      {
        to: '/calculators/waist-hip',
        label: 'Waist-to-Hip',
        description: 'Health risk indicator',
      },
    ],
  },
  {
    title: 'Caloric Needs',
    items: [
      {
        to: '/calculators/bmr',
        label: 'BMR Calculator',
        description: 'Basal Metabolic Rate',
      },
      {
        to: '/calculators/tdee',
        label: 'TDEE Calculator',
        description: 'Daily energy expenditure',
      },
      {
        to: '/calculators/calorie-goal',
        label: 'Calorie Goal',
        description: 'Weight loss/gain targets',
      },
      {
        to: '/calculators/weight-goal',
        label: 'Weight Timeline',
        description: 'Time to reach goal',
      },
    ],
  },
  {
    title: 'Strength & Training',
    items: [
      {
        to: '/calculators/one-rm',
        label: '1RM Calculator',
        description: 'One-rep max estimate',
      },
      {
        to: '/calculators/wilks',
        label: 'Wilks Score',
        description: 'Powerlifting coefficient',
      },
      {
        to: '/calculators/dots',
        label: 'DOTS Score',
        description: 'Modern Wilks alternative',
      },
      {
        to: '/calculators/volume-load',
        label: 'Volume Load',
        description: 'Training volume calculator',
      },
      {
        to: '/calculators/inol',
        label: 'INOL',
        description: 'Intensity Number of Lifts',
      },
    ],
  },
  {
    title: 'Cardiovascular',
    items: [
      {
        to: '/calculators/max-hr',
        label: 'Max Heart Rate',
        description: 'Calculate your max HR',
      },
      {
        to: '/calculators/hr-zones',
        label: 'HR Zones',
        description: 'Training heart rate zones',
      },
      {
        to: '/calculators/vo2-max',
        label: 'VO2 Max',
        description: 'Cardio fitness estimate',
      },
      {
        to: '/calculators/pace',
        label: 'Running Pace',
        description: 'Pace and speed calculator',
      },
      {
        to: '/calculators/met',
        label: 'MET Calories',
        description: 'Calories burned by activity',
      },
    ],
  },
  {
    title: 'Nutrition',
    items: [
      {
        to: '/calculators/macros',
        label: 'Macro Calculator',
        description: 'Protein, carbs, fat',
      },
      {
        to: '/calculators/protein',
        label: 'Protein Needs',
        description: 'Daily protein goals',
      },
      {
        to: '/calculators/water',
        label: 'Water Intake',
        description: 'Hydration calculator',
      },
    ],
  },
];

const Header = () => {
  const { isAuthenticated, isLoading, profile, logout, refreshPermissions } =
    useAuth();
  const location = useLocation();
  const hasAdminAccess = useRequirePermission('user:read');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isRefreshingPermissions, setIsRefreshingPermissions] = useState(false);

  const initials = profile?.displayName
    ? profile.displayName.slice(0, 2).toUpperCase()
    : 'U';

  const isPathActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return (
      location.pathname === to ||
      location.pathname.startsWith(`${to}/`) ||
      (to === '/calculators' && location.pathname.startsWith('/calculators'))
    );
  };

  const navItemClass = (isActive: boolean) =>
    [
      navigationMenuTriggerStyle(),
      'rounded-full bg-transparent hover:bg-background hover:shadow-sm',
      isActive ? 'bg-background text-foreground shadow-sm' : '',
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 shadow-sm backdrop-blur-lg supports-backdrop-filter:bg-background/80 pt-[env(safe-area-inset-top)]">
      <div className="container relative flex h-14 items-center justify-between md:h-16">
        {/* Mobile: logo left-aligned (no hamburger — bottom tab bar handles nav) */}
        <Link to="/" className="flex items-center gap-2 md:hidden">
          <img
            src={logo}
            alt="Vara Performance"
            className="h-8 w-8 rounded-lg"
          />
          <span className="text-base font-bold tracking-tight">Vara</span>
        </Link>

        {/* Desktop logo */}
        <Link
          to="/"
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

        {/* Navigation */}
        <NavigationMenu viewport={false} className="hidden md:flex">
          <NavigationMenuList className="gap-1 rounded-full border border-border/50 bg-muted/30 px-1 py-1">
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <NavLink
                  to="/features"
                  onMouseEnter={() => prefetchRoute('/features')}
                  onFocus={() => prefetchRoute('/features')}
                  className={({ isActive }) => navItemClass(isActive)}
                >
                  Features
                </NavLink>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <NavLink
                  to="/about"
                  onMouseEnter={() => prefetchRoute('/about')}
                  onFocus={() => prefetchRoute('/about')}
                  className={({ isActive }) => navItemClass(isActive)}
                >
                  About
                </NavLink>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <NavLink
                  to="/blog"
                  onMouseEnter={() => prefetchRoute('/blog')}
                  onFocus={() => prefetchRoute('/blog')}
                  className={({ isActive }) =>
                    navItemClass(isActive || isPathActive('/blog'))
                  }
                >
                  Blog
                </NavLink>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <NavLink
                  to="/shop"
                  onMouseEnter={() => prefetchRoute('/shop')}
                  onFocus={() => prefetchRoute('/shop')}
                  className={({ isActive }) =>
                    navItemClass(isActive || isPathActive('/shop'))
                  }
                >
                  Shop
                </NavLink>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger
                className={
                  'rounded-full bg-transparent hover:bg-background hover:shadow-sm ' +
                  (isPathActive('/calculators')
                    ? 'bg-background text-foreground shadow-sm'
                    : '')
                }
              >
                Calculators
              </NavigationMenuTrigger>
              <NavigationMenuContent className="left-1/2 -translate-x-1/2">
                <div className="grid w-187.5 grid-cols-3 gap-4 p-4">
                  {calculatorCategories.map((category) => (
                    <div key={category.title}>
                      <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                        {category.title}
                      </h4>
                      <ul className="space-y-1">
                        {category.items.map((item) => (
                          <li key={item.to}>
                            <NavigationMenuLink asChild>
                              <NavLink
                                to={item.to}
                                onMouseEnter={() => prefetchRoute(item.to)}
                                onFocus={() => prefetchRoute(item.to)}
                                className={({ isActive }) =>
                                  [
                                    'flex select-none flex-col gap-0.5 rounded-md p-2 leading-none no-underline outline-none transition-colors',
                                    isActive
                                      ? 'bg-accent text-accent-foreground'
                                      : 'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                                  ]
                                    .filter(Boolean)
                                    .join(' ')
                                }
                              >
                                <span className="text-sm font-medium">
                                  {item.label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {item.description}
                                </span>
                              </NavLink>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <div className="col-span-3 border-t pt-3">
                    <NavigationMenuLink asChild>
                      <NavLink
                        to="/calculators"
                        onMouseEnter={() => prefetchRoute('/calculators')}
                        onFocus={() => prefetchRoute('/calculators')}
                        className={({ isActive }) =>
                          [
                            'flex items-center gap-2 rounded-md p-2 text-sm font-medium',
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-primary hover:bg-accent',
                          ]
                            .filter(Boolean)
                            .join(' ')
                        }
                      >
                        View all calculators →
                      </NavLink>
                    </NavigationMenuLink>
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <NavLink
                  to="/spotlight"
                  onMouseEnter={() => prefetchRoute('/spotlight')}
                  onFocus={() => prefetchRoute('/spotlight')}
                  className={({ isActive }) => navItemClass(isActive)}
                >
                  Spotlight
                </NavLink>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <NavLink
                  to="/coaches"
                  onMouseEnter={() => prefetchRoute('/coaches')}
                  onFocus={() => prefetchRoute('/coaches')}
                  className={({ isActive }) =>
                    navItemClass(isActive || isPathActive('/coaches'))
                  }
                >
                  Coaches
                </NavLink>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Auth buttons */}
        <div className="relative z-20 flex items-center justify-end gap-2">
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
          ) : isAuthenticated ? (
            <>
              <NotificationBell />

              <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="touch-manipulation flex items-center gap-2 rounded-full border border-border/50 bg-muted/20 px-2 py-1.5 transition-colors hover:bg-muted/40"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage
                        src={profile?.avatarUrl ?? undefined}
                        alt={profile?.displayName ?? 'User'}
                      />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-32 truncate text-sm font-medium sm:inline-block">
                      {profile?.displayName ?? 'User'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>

                <PopoverContent align="end" className="w-56 p-1" sideOffset={8}>
                  <Link
                    to="/elevate/studio?section=profile"
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-semibold hover:bg-accent"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">
                      {profile?.displayName ?? 'Account'}
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setIsRefreshingPermissions(true);
                        await refreshPermissions();
                        toast.success('Permissions refreshed');
                      } catch {
                        toast.error('Failed to refresh permissions');
                      } finally {
                        setIsRefreshingPermissions(false);
                        setUserMenuOpen(false);
                      }
                    }}
                    disabled={isRefreshingPermissions}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {isRefreshingPermissions
                      ? 'Refreshing...'
                      : 'Refresh Permissions'}
                  </button>

                  <div className="bg-border -mx-1 my-1 h-px" />

                  <Link
                    to="/dashboard"
                    className="focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>

                  <Link
                    to="/workouts"
                    className="focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Dumbbell className="h-4 w-4" />
                    Workout Log
                  </Link>

                  <Link
                    to="/food-diary"
                    className="focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Utensils className="h-4 w-4" />
                    Food Diary
                  </Link>

                  <Link
                    to="/elevate"
                    className="focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Rss className="h-4 w-4" />
                    Elevate
                  </Link>

                  <Link
                    to="/elevate/studio?section=settings"
                    className="focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>

                  <Link
                    to="/shop"
                    className="focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Shop
                  </Link>

                  {hasAdminAccess && (
                    <Link
                      to="/admin"
                      className="focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Shield className="h-4 w-4" />
                      Admin
                    </Link>
                  )}

                  <div className="bg-border -mx-1 my-1 h-px" />
                  <button
                    type="button"
                    className="text-destructive focus:bg-destructive/10 relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none"
                    onClick={() => {
                      setUserMenuOpen(false);
                      void logout();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </PopoverContent>
              </Popover>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-foreground"
                asChild
              >
                <Link to="/login">Sign in</Link>
              </Button>
              <Button size="sm" className="shadow-md shadow-primary/25" asChild>
                <Link to="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
