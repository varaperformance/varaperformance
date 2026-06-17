import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import {
  ChevronLeft,
  RefreshCw,
  Shield,
  LogOut,
  Globe,
  LayoutDashboard,
  Plug,
  Rss,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { NotificationBell } from '@/components/notification/notification-bell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth, useRequirePermission } from '@/features/auth';
import { hapticsLight } from '@/lib/haptics';
import { toast } from 'sonner';
import logo from '@/assets/images/logo.png';

// Top-level routes that should NOT show a back button
const rootPaths = ['/dashboard', '/workouts', '/food-diary', '/messages'];

export default function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, logout, refreshPermissions } = useAuth();
  const hasAdminAccess = useRequirePermission('user:read');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isRoot = rootPaths.some(
    (p) => location.pathname === p || location.pathname === '/',
  );

  const getInitials = () => {
    if (profile?.displayName) {
      return profile.displayName.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const handleNav = () => {
    void hapticsLight();
    setMenuOpen(false);
  };

  return (
    <>
      <header
        className="sticky top-0 z-50 flex h-12 items-center border-b border-border/50 bg-background/95 backdrop-blur-lg px-3 md:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Left: back button or logo */}
        <div className="flex w-10 items-center">
          {isRoot ? (
            <Link to="/dashboard" className="flex items-center">
              <img src={logo} alt="Vara" className="h-6 w-6" />
            </Link>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Center: page title — handled via document.title in each page */}
        <div className="flex-1" />

        {/* Right: notifications + avatar (opens user menu) */}
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            type="button"
            onClick={() => {
              void hapticsLight();
              setMenuOpen(true);
            }}
            className="touch-manipulation rounded-full"
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={profile?.avatarUrl ?? undefined} />
              <AvatarFallback className="text-xs">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </header>

      {/* User menu bottom sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]"
        >
          <SheetHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatarUrl ?? undefined} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <SheetTitle className="text-left truncate">
                  @{profile?.displayName ?? 'Account'}
                </SheetTitle>
              </div>
            </div>
          </SheetHeader>

          <nav className="space-y-1 pb-4">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Quick links
            </p>
            <Link
              to="/dashboard"
              onClick={handleNav}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors active:bg-accent"
            >
              <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
              Dashboard
            </Link>
            <Link
              to="/integrations"
              onClick={handleNav}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors active:bg-accent"
            >
              <Plug className="h-5 w-5 text-muted-foreground" />
              Integrations
            </Link>
            <Link
              to="/elevate"
              onClick={handleNav}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors active:bg-accent"
            >
              <Rss className="h-5 w-5 text-muted-foreground" />
              Elevate
            </Link>
            <Link
              to="/elevate/studio?section=settings"
              onClick={handleNav}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors active:bg-accent"
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
              Settings
            </Link>

            <div className="mx-3 my-2 h-px bg-border" />

            <button
              type="button"
              onClick={async () => {
                try {
                  setIsRefreshing(true);
                  await refreshPermissions();
                  toast.success('Permissions refreshed');
                } catch {
                  toast.error('Failed to refresh permissions');
                } finally {
                  setIsRefreshing(false);
                  setMenuOpen(false);
                }
              }}
              disabled={isRefreshing}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors active:bg-accent disabled:opacity-60"
            >
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
              {isRefreshing ? 'Refreshing…' : 'Refresh Permissions'}
            </button>

            {hasAdminAccess && (
              <Link
                to="/admin"
                onClick={handleNav}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors active:bg-accent"
              >
                <Shield className="h-5 w-5 text-muted-foreground" />
                Admin
              </Link>
            )}

            <Link
              to="/"
              onClick={handleNav}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors active:bg-accent"
            >
              <Globe className="h-5 w-5 text-muted-foreground" />
              Public Site
            </Link>

            <div className="mx-3 my-1 h-px bg-border" />

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                void logout();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors active:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
