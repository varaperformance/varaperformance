# Web App Optimization Strategy

This document outlines the current optimization approach and identifies opportunities for performance improvements in the Vara Performance web application.

## Current Optimization State

### Build Configuration (vite.config.ts)

**Strengths:**
- Manual chunk splitting for vendor libraries (react, router, query, charts, etc.)
- Pre-compression with gzip and brotli
- Bundle analysis tool integration (rollup-plugin-visualizer)
- Tailwind CSS via Vite plugin for optimal CSS handling
- Proper alias configuration (@/ -> src/)

**Current Chunk Strategy:**
- `vendor-react` - React, ReactDOM, scheduler
- `vendor-router` - React Router
- `vendor-query` - TanStack Query
- `vendor-socket` - socket.io-client
- `vendor-charts` - Recharts, D3
- `vendor-date` - date-fns
- `vendor-icons` - lucide-react
- `vendor-editor` - TipTap, lowlight, highlight.js
- `vendor-dnd` - @dnd-kit
- `vendor-mapbox` - Mapbox
- `vendor-syntax` - react-syntax-highlighter
- `vendor-sheet` - react-modal-sheet

### Data Fetching (TanStack Query)

**Current Configuration (main.tsx):**
```typescript
{
  staleTime: 30 * 1000,        // 30 seconds
  gcTime: 10 * 60 * 1000,      // 10 minutes
  retry: 1,                     // Retry once on failure
  refetchOnWindowFocus: false,  // Don't refetch on tab switch
  refetchOnReconnect: true,     // Refetch on network reconnect
}
```

**Strengths:**
- Sensible default caching to reduce API calls
- No aggressive refetching on focus (good for UX)
- Network-aware refetching
- Offline queue integration for mutations

**Opportunities:**
- Query-specific stale times based on data volatility
- Prefetching strategies for frequently accessed data
- Optimistic updates for better perceived performance

### Mobile Optimizations

**Current Implementation:**
- Capacitor integration with native plugins
- Biometric authentication with cooldown (60s)
- Health data sync on app resume
- Offline mutation queueing
- Native route prefetching
- Chunk reload handling for deployments

**Strengths:**
- Native platform detection and conditional behavior
- Biometric gating with smart cooldown
- Offline-first approach for critical mutations
- Health sync deferred to avoid blocking render

### Asset Handling

**Current State:**
- Vite handles asset optimization automatically
- Tailwind CSS for styling (purged in production)
- Media proxy for native app image handling

## Optimization Opportunities

### 1. Image Optimization (High Priority)

**Current Issue:**
- No systematic image optimization strategy
- Large bundle analysis output (stats.html at 3MB suggests large assets)

**Recommendations:**
```bash
# Add image optimization dependencies
pnpm add -D vite-plugin-imagemin @squoosh/lib
```

**Implementation:**
- Convert images to WebP/AVIF where supported
- Implement responsive images with `<picture>` tags
- Add lazy loading for below-fold images
- Consider CDN for static assets

**Expected Impact:**
- 30-50% reduction in image payload size
- Faster initial page load
- Reduced bandwidth usage

### 2. Component Memoization (Medium Priority)

**Current State:**
- React 19 with automatic optimizations
- No explicit memoization patterns visible

**Recommendations:**
- Profile component re-renders using React DevTools
- Add `useMemo` for expensive computations
- Add `useCallback` for event handlers passed to children
- Consider `React.memo` for expensive pure components

**Focus Areas:**
- Dashboard components with complex calculations
- Chart components (Recharts can be expensive)
- List components with many items

### 3. Query Optimization (Medium Priority)

**Current State:**
- Global query defaults
- No query-specific optimizations

**Recommendations:**
```typescript
// Example: Query-specific configurations
useQuery({
  queryKey: ['workout-sessions'],
  queryFn: fetchWorkoutSessions,
  staleTime: 5 * 60 * 1000,  // 5 minutes for workout data
  gcTime: 30 * 60 * 1000,     // 30 minutes cache
});

// Static data rarely changes
useQuery({
  queryKey: ['exercises'],
  queryFn: fetchExercises,
  staleTime: 24 * 60 * 60 * 1000,  // 24 hours
  gcTime: 7 * 24 * 60 * 60 * 1000,  // 7 days
});
```

**Benefits:**
- Reduced API calls for stable data
- Better cache hit rates
- Improved perceived performance

### 4. Bundle Size Analysis (High Priority)

**Action Required:**
```bash
# Run bundle analysis
pnpm build:analyze
```

**Review Checklist:**
- Identify largest chunks and their contents
- Check for duplicate dependencies
- Look for unused code (tree shaking opportunities)
- Review vendor chunk sizes for optimization

**Potential Actions:**
- Remove unused dependencies
- Replace heavy libraries with lighter alternatives
- Further split large vendor chunks
- Implement dynamic imports for rarely used features

### 5. Performance Monitoring (High Priority)

**Recommendation:**
```typescript
// Add performance monitoring
import { PerformanceObserver } from 'perf_hooks';

// Measure key metrics:
// - First Contentful Paint (FCP)
// - Largest Contentful Paint (LCP)
// - Time to Interactive (TTI)
// - Cumulative Layout Shift (CLS)
```

**Implementation:**
- Add Web Vitals monitoring
- Track API response times
- Monitor query cache hit rates
- Set up performance budgets

### 6. Virtual Scrolling (Low Priority - Use Case Dependent)

**When to Implement:**
- Lists with 100+ items
- Complex list items
- Performance issues on mobile

**Recommendation:**
```bash
pnpm add @tanstack/react-virtual
```

**Use Cases:**
- Exercise lists
- Workout history
- Food database search results

### 7. Service Worker for Caching (Medium Priority)

**Current State:**
- Offline queue for mutations
- No service worker for static asset caching

**Recommendation:**
```bash
pnpm add -D vite-plugin-pwa
```

**Benefits:**
- Cache static assets (JS, CSS, images)
- Improve repeat visit performance
- Better offline experience
- Reduced server load

### 8. Font Optimization (Low Priority)

**Current State:**
- System fonts likely used (good)
- Need to verify custom font usage

**Recommendations:**
- Use system fonts where possible
- If custom fonts: subset, woff2, preload critical fonts
- Use `font-display: swap` for custom fonts

### 9. CSS Optimization (Low Priority)

**Current State:**
- Tailwind CSS (already optimized)
- Purged in production

**Recommendations:**
- Review Tailwind configuration for unused utilities
- Consider critical CSS inlining for above-fold content
- Minimize custom CSS

### 10. Code Splitting Improvements (Medium Priority)

**Current State:**
- Route-based code splitting
- Manual vendor chunking

**Recommendations:**
- Split large feature modules further
- Dynamic import heavy components (charts, editors)
- Preload critical chunks
- Implement prefetch hints for likely next routes

## Implementation Priority

### Phase 1 (Immediate - High Impact) ✅ COMPLETED
1. ✅ Run bundle analysis and address largest chunks
   - Largest chunks identified: vendor-syntax (638kb), vendor-editor (583kb), vendor-charts (390kb)
   - Existing chunking strategy is already well-optimized
2. ✅ Implement image optimization
   - Added vite-plugin-imagemin with mozjpeg, optipng, pngquant, gifsicle, svgo
   - Build results: 34-69% image size reduction (e.g., logo.png -69%, gym images -34-39%)
3. ✅ Add performance monitoring
   - Added web-vitals library
   - Created performance.ts utility for monitoring LCP, CLS, TTFB, INP
   - Integrated into main.tsx with initPerformanceMonitoring()
   - Created backend module (performance-metrics) with Prisma schema, service, controller
   - Added RBAC permission (performance-metric:read) for admin access
   - Created admin dashboard page at /admin/performance-metrics
   - Metrics are now sent to backend API and stored in database
   - Admin can view aggregated statistics (avg, median, P95, P99) by metric and date range

### Phase 2 (Short-term - Medium Impact) ✅ COMPLETED
1. ✅ Optimize query caching strategies
   - Created query-optimization.ts with CACHE_TIMES and STALE_TIMES constants
   - Added prefetchCommonData() to prefetch exercises and user profile on app startup
   - Integrated prefetching into main.tsx bootstrap function
2. ✅ Implement service worker for caching
   - Added vite-plugin-pwa with Workbox
   - Configured runtime caching for images (CacheFirst, 30 days) and API (NetworkFirst, 5 min)
   - Generated service worker successfully (dist/sw.js)
3. ⏳ Add component memoization where needed
   - Deferred - requires profiling to identify specific components

### Phase 3 (Long-term - Use Case Dependent) ⏳ PENDING
1. ⏳ Virtual scrolling for long lists
   - Use @tanstack/react-virtual for lists with 100+ items
2. ⏳ Further code splitting
   - Consider dynamic imports for rarely used features
3. ⏳ Advanced caching strategies
   - Implement optimistic updates for better perceived performance

## Monitoring & Metrics

### Key Performance Indicators
- Bundle size (target: <500KB initial load)
- First Contentful Paint (target: <1.5s)
- Time to Interactive (target: <3s)
- Lighthouse score (target: 90+)
- API response times (target: <200ms p95)

### Tools to Use
- Lighthouse CI
- WebPageTest
- Bundle analyzer (already integrated)
- React DevTools Profiler
- Chrome DevTools Performance tab

## Mobile-Specific Optimizations

### Current Strengths
- Capacitor integration
- Biometric auth
- Health sync
- Offline queue

### Additional Opportunities
- Implement background sync for health data
- Optimize Capacitor plugin loading
- Reduce initial native bridge calls
- Implement native image caching

## Testing Strategy

### Performance Testing
1. Run Lighthouse audits on key pages
2. Test on slow 3G networks
3. Test on low-end devices
4. Monitor real user metrics (RUM)

### Regression Testing
- Set up performance budgets in CI
- Alert on bundle size increases
- Monitor Lighthouse score regressions
- Track API performance over time

## Conclusion

The Vara Performance web application has a solid foundation with good build configuration, sensible data fetching defaults, and thoughtful mobile integration. The optimization opportunities identified focus on:

1. **Asset optimization** - Largest potential impact
2. **Bundle size management** - Already good, can be better
3. **Query strategy refinement** - Low effort, good impact
4. **Performance monitoring** - Essential for ongoing optimization

The recommended phased approach allows for incremental improvements while maintaining stability. Regular performance audits and monitoring will ensure the app continues to perform optimally as it grows.
