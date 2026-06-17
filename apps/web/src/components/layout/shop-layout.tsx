import { Outlet } from 'react-router';
import ShopHeader from './shop-header';
import Footer from './footer';
import { SkipToContent } from '@/components/common/skip-to-content';

const ShopLayout = () => {
  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-clip bg-background">
      <SkipToContent />
      <ShopHeader />
      <main id="main-content" className="flex-1 min-w-0">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default ShopLayout;
