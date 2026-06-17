import { Suspense } from 'react';
import { Routes, Route } from 'react-router';
import MasterLayout from '@/components/layout/master';
import AppLayout from '@/components/layout/app-layout';
import AdminLayout from '@/components/layout/admin-layout';
import ShopLayout from '@/components/layout/shop-layout';
import ScrollToTop from '@/components/common/scroll-to-top';
import { ProtectedRoute } from '@/components/common/protected-route';
import { RouteErrorBoundary } from '@/components/common/route-error-boundary';
import { useAuth } from '@/features/auth';
import {
  AdminRoutes,
  CalculatorsRoutes,
  ProtectedAppRoutes,
  PublicProfileRoutes,
  PublicRoutes,
  ShopRoutes,
} from '@/routes/route-sections';

const RouteLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const CalculatorsLayout = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppLayout /> : <MasterLayout />;
};

const PublicElevateProfileLayout = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppLayout /> : <MasterLayout />;
};

const AppRoutes = () => {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          {CalculatorsRoutes({ CalculatorsLayout })}

          <Route
            element={
              <RouteErrorBoundary section="Shop">
                <ShopLayout />
              </RouteErrorBoundary>
            }
          >
            {ShopRoutes()}
          </Route>

          {PublicProfileRoutes({ PublicElevateProfileLayout })}

          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <RouteErrorBoundary section="App">
                  <AppLayout />
                </RouteErrorBoundary>
              }
            >
              {ProtectedAppRoutes()}
            </Route>
          </Route>

          <Route element={<ProtectedRoute requiredPermission="user:read" />}>
            <Route
              element={
                <RouteErrorBoundary section="Admin">
                  <AdminLayout />
                </RouteErrorBoundary>
              }
            >
              {AdminRoutes()}
            </Route>
          </Route>

          <Route
            element={
              <RouteErrorBoundary section="Public">
                <MasterLayout />
              </RouteErrorBoundary>
            }
          >
            {PublicRoutes()}
          </Route>
        </Routes>
      </Suspense>
    </>
  );
};

export default AppRoutes;
