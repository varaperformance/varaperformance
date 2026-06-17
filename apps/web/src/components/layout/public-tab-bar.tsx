import { NavLink, useLocation } from 'react-router';
import {
  Home,
  Sparkles,
  Tags,
  ShoppingBag,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticsLight } from '@/lib/haptics';

interface PublicTabBarProps {
  onMoreClick: () => void;
}

const tabs = [
  { label: 'Home', icon: Home, href: '/' },
  { label: 'Features', icon: Sparkles, href: '/features' },
  { label: 'Pricing', icon: Tags, href: '/pricing' },
  { label: 'Shop', icon: ShoppingBag, href: '/shop' },
] as const;

export default function PublicTabBar({ onMoreClick }: PublicTabBarProps) {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return (
      location.pathname === href || location.pathname.startsWith(`${href}/`)
    );
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-14 items-center justify-around">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;

          return (
            <NavLink
              key={tab.href}
              to={tab.href}
              onClick={() => void hapticsLight()}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
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
