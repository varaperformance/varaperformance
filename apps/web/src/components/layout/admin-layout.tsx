import { useState, useEffect } from 'react';
import { Outlet } from 'react-router';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import AdminSidebar from './admin-sidebar';
import AdminHeader from './admin-header';
import PullToRefresh from '@/components/pull-to-refresh';
import { SkipToContent } from '@/components/common/skip-to-content';

const ADMIN_SIDEBAR_COLLAPSED_KEY = 'vara-admin-sidebar-collapsed';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === 'true';
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <div className="admin-shell min-h-screen w-full min-w-0 overflow-x-clip bg-background">
      <SkipToContent />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="admin-orb admin-orb-1" />
        <div className="admin-orb admin-orb-2" />
        <div className="admin-grid" />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AdminSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <AdminSidebar
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div
        className={cn(
          'flex min-h-screen min-w-0 flex-col transition-all duration-300',
          'md:ml-64',
          collapsed && 'md:ml-16',
        )}
      >
        {/* Header */}
        <AdminHeader onMenuClick={() => setMobileOpen(true)} />

        {/* Page content */}
        <main id="main-content" className="admin-main flex-1 min-w-0">
          <div className="admin-main-inner">
            <PullToRefresh>
              <Outlet />
            </PullToRefresh>
          </div>
        </main>
      </div>
    </div>
  );
}
