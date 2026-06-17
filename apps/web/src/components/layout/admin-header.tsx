import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/features/auth';
import {
  Menu,
  Globe,
  LayoutDashboard,
  ChevronDown,
  User,
  Rss,
  Dumbbell,
  Utensils,
  Settings,
  Shield,
  LogOut,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { NotificationBell } from '@/components/notification/notification-bell';
import { toast } from 'sonner';

interface AdminHeaderProps {
  onMenuClick: () => void;
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { profile, logout, refreshPermissions } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isRefreshingPermissions, setIsRefreshingPermissions] = useState(false);

  const getInitials = () => {
    if (profile?.displayName) {
      return profile.displayName.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="admin-header sticky top-0 z-50 flex h-18 min-w-0 items-center gap-3 border-b border-border/50 bg-background px-3 shadow-sm sm:gap-4 sm:px-6">
      {/* Mobile menu button */}
      <Button
        variant="outline"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Title */}
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Operations
        </p>
        <h1 className="truncate text-lg font-semibold tracking-tight">
          Control Room
        </h1>
      </div>

      {/* Right side */}
      <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
        {/* Notifications */}
        <NotificationBell />

        {/* User menu */}
        <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="touch-manipulation flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-2 py-1.5 transition-colors hover:bg-muted"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={profile?.avatarUrl ?? undefined}
                  alt={profile?.displayName ?? 'User'}
                />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              {profile?.displayName && (
                <span className="hidden text-sm font-medium sm:inline-block">
                  @{profile.displayName}
                </span>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-56 p-1" sideOffset={8}>
            <Link
              to="/elevate/studio?section=profile"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-semibold hover:bg-accent"
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
              onClick={() => setUserMenuOpen(false)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>

            <Link
              to="/workouts"
              onClick={() => setUserMenuOpen(false)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Dumbbell className="h-4 w-4" />
              Workout Log
            </Link>

            <Link
              to="/food-diary"
              onClick={() => setUserMenuOpen(false)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Utensils className="h-4 w-4" />
              Food Diary
            </Link>

            <Link
              to="/admin"
              onClick={() => setUserMenuOpen(false)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>

            <Link
              to="/elevate"
              onClick={() => setUserMenuOpen(false)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Rss className="h-4 w-4" />
              Elevate
            </Link>

            <Link
              to="/elevate/studio?section=settings"
              onClick={() => setUserMenuOpen(false)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>

            <Link
              to="/shop"
              onClick={() => setUserMenuOpen(false)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <ShoppingBag className="h-4 w-4" />
              Shop
            </Link>

            <Link
              to="/"
              onClick={() => setUserMenuOpen(false)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Globe className="h-4 w-4" />
              Public Site
            </Link>

            <div className="bg-border -mx-1 my-1 h-px" />
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen(false);
                void logout();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
