import { describe, expect, it } from 'vitest';
import { createRoutesFromElements } from 'react-router';
import {
  AdminRoutes,
  CalculatorsRoutes,
  ProtectedAppRoutes,
  PublicProfileRoutes,
  PublicRoutes,
  ShopRoutes,
} from './route-sections';

const Layout = () => null;

const collectPaths = (
  routes: ReturnType<typeof createRoutesFromElements>,
): string[] => {
  const result: string[] = [];

  const visit = (items: typeof routes) => {
    for (const route of items) {
      if (typeof route.path === 'string') {
        result.push(route.path);
      }
      if (route.children && route.children.length > 0) {
        visit(route.children);
      }
    }
  };

  visit(routes);
  return result;
};

describe('route sections', () => {
  it('includes key calculator and shop paths', () => {
    const calculatorPaths = collectPaths(
      createRoutesFromElements(
        <>{CalculatorsRoutes({ CalculatorsLayout: Layout })}</>,
      ),
    );

    expect(calculatorPaths).toContain('/calculators');
    expect(calculatorPaths).toContain('/calculators/bmi');
    expect(calculatorPaths).toContain('/calculators/weight-goal');

    const shopPaths = collectPaths(
      createRoutesFromElements(<>{ShopRoutes()}</>),
    );

    expect(shopPaths).toContain('/shop');
    expect(shopPaths).toContain('/shop/checkout');
    expect(shopPaths).toContain('/shop/checkout/confirmation');
  });

  it('includes protected app paths for messaging and coaching', () => {
    const appPaths = collectPaths(
      createRoutesFromElements(<>{ProtectedAppRoutes()}</>),
    );

    expect(appPaths).toContain('/dashboard');
    expect(appPaths).toContain('/messages');
    expect(appPaths).toContain('/coaches/dashboard');
    expect(appPaths).toContain('/calendar');
  });

  it('includes public and fallback routes', () => {
    const publicPaths = collectPaths(
      createRoutesFromElements(<>{PublicRoutes()}</>),
    );

    expect(publicPaths).toContain('/');
    expect(publicPaths).toContain('/blog');
    expect(publicPaths).toContain('/login');
    expect(publicPaths).toContain('*');
  });

  it('includes admin and public profile paths', () => {
    const adminPaths = collectPaths(
      createRoutesFromElements(<>{AdminRoutes()}</>),
    );
    const publicProfilePaths = collectPaths(
      createRoutesFromElements(
        <>{PublicProfileRoutes({ PublicElevateProfileLayout: Layout })}</>,
      ),
    );

    expect(adminPaths).toContain('/admin');
    expect(adminPaths).toContain('/admin/users');
    expect(adminPaths).toContain('/admin/shop/orders');
    expect(publicProfilePaths).toContain('/elevate/:displayName');
    expect(publicProfilePaths).toContain('/profile/:displayName');
  });
});
