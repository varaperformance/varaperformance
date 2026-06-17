import { useCallback } from 'react';
import { useNavigate, type NavigateOptions, type To } from 'react-router';
import { useIsMobile } from '@/hooks/use-is-mobile';

/**
 * Wraps `useNavigate` with the View Transitions API for smooth
 * slide transitions between pages on mobile.
 * Falls back to normal navigation when the API is unavailable.
 */
export function useViewTransitionNavigate() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const transitionNavigate = useCallback(
    (to: To | number, options?: NavigateOptions) => {
      const go = () => {
        if (typeof to === 'number') {
          navigate(to);
        } else {
          navigate(to, options);
        }
      };

      if (
        isMobile &&
        'startViewTransition' in document &&
        typeof document.startViewTransition === 'function'
      ) {
        document.startViewTransition(go);
      } else {
        go();
      }
    },
    [navigate, isMobile],
  );

  return transitionNavigate;
}
