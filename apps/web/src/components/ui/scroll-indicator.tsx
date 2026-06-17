import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

interface ScrollIndicatorProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a horizontally scrollable container and shows fade indicators
 * on left/right edges when there's more content to scroll.
 */
export function ScrollIndicator({ children, className }: ScrollIndicatorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();

    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  return (
    <div className={cn('relative', className)}>
      {/* Left fade */}
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-linear-to-r from-background to-transparent transition-opacity duration-200',
          canScrollLeft ? 'opacity-100' : 'opacity-0',
        )}
      />
      {/* Right fade */}
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-linear-to-l from-background to-transparent transition-opacity duration-200',
          canScrollRight ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div ref={scrollRef} className="no-scrollbar overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
