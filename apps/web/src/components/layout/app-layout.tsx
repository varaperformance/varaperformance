import { useState, useEffect } from 'react';
import { Outlet } from 'react-router';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import AppSidebar from './app-sidebar';
import AppHeader from './app-header';
import MobileHeader from './mobile-header';
import MobileTabBar from './mobile-tab-bar';
import MobileMoreSheet from './mobile-more-sheet';
import PullToRefresh from '@/components/pull-to-refresh';
import { SkipToContent } from '@/components/common/skip-to-content';
import { useBadgeSync } from '@/hooks/use-badge-sync';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useSwipeBack } from '@/hooks/use-swipe-back';

const SIDEBAR_COLLAPSED_KEY = 'vara-sidebar-collapsed';

export default function AppLayout() {
  useBadgeSync();
  useSwipeBack();

  const isMobile = useIsMobile();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-background">
      <SkipToContent />
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* Mobile Sidebar (legacy — hidden on md:hidden, replaced by tab bar) */}
      {!isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <AppSidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
              mobileSheet
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Main content area */}
      <div
        className={cn(
          'flex min-h-screen min-w-0 flex-col transition-all duration-300',
          'md:ml-64',
          collapsed && 'md:ml-16',
        )}
      >
        {/* Header: mobile gets compact header, desktop keeps full header */}
        {isMobile ? (
          <MobileHeader />
        ) : (
          <AppHeader onMenuClick={() => setMobileOpen(true)} />
        )}

        {/* Page content — add bottom padding on mobile for tab bar clearance */}
        <main
          id="main-content"
          className={cn('flex-1 min-w-0', isMobile && 'pb-20')}
        >
          <PullToRefresh>
            <Outlet />
          </PullToRefresh>
        </main>
      </div>

      {/* Mobile Tab Bar */}
      {isMobile && (
        <>
          <MobileTabBar onMoreClick={() => setMoreOpen(true)} />
          <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
        </>
      )}
    </div>
  );
}
