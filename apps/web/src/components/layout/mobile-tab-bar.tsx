import { NavLink, useLocation } from 'react-router';
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  MessageCircle,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticsLight } from '@/lib/haptics';
import { prefetchNativeMainTabHref } from '@/lib/native-route-prefetch';
import { useTotalUnread } from '@/features/messaging';

interface MobileTabBarProps {
  onMoreClick: () => void;
}

const tabs = [
  { label: 'Home', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Workouts', icon: Dumbbell, href: '/workouts' },
  { label: 'Food', icon: Utensils, href: '/food-diary' },
  { label: 'Messages', icon: MessageCircle, href: '/messages' },
] as const;

export default function MobileTabBar({ onMoreClick }: MobileTabBarProps) {
  const location = useLocation();
  const unreadCount = useTotalUnread();

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-14 items-center justify-around">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          const showBadge = tab.href === '/messages' && unreadCount > 0;

          return (
            <NavLink
              key={tab.href}
              to={tab.href}
              onPointerDown={() => prefetchNativeMainTabHref(tab.href)}
              onClick={() => void hapticsLight()}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground',
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium leading-tight">
                {tab.label}
              </span>
            </NavLink>
          );
        })}

        {/* More tab */}
        <button
          type="button"
          onClick={() => {
            void hapticsLight();
            onMoreClick();
          }}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-muted-foreground transition-colors active:text-foreground"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-tight">More</span>
        </button>
      </div>
    </nav>
  );
}
