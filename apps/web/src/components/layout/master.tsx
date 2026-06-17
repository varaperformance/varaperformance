import { useState } from 'react';
import { Outlet } from 'react-router';
import { cn } from '@/lib/utils';
import Header from './header';
import Footer from './footer';
import PublicTabBar from './public-tab-bar';
import PublicMoreSheet from './public-more-sheet';
import MobileTabBar from './mobile-tab-bar';
import MobileMoreSheet from './mobile-more-sheet';
import { SkipToContent } from '@/components/common/skip-to-content';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useAuth } from '@/features/auth';

const MasterLayout = () => {
  const isMobile = useIsMobile();
  const { isAuthenticated } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-clip pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <SkipToContent />
      <Header />
      <main
        id="main-content"
        className={cn('flex-1 min-w-0', isMobile && 'pb-20')}
      >
        <Outlet />
      </main>
      {!isMobile && <Footer />}

      {/* Mobile: bottom tab bar + more sheet */}
      {isMobile && (
        <>
          {isAuthenticated ? (
            <>
              <MobileTabBar onMoreClick={() => setMoreOpen(true)} />
              <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
            </>
          ) : (
            <>
              <PublicTabBar onMoreClick={() => setMoreOpen(true)} />
              <PublicMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MasterLayout;
