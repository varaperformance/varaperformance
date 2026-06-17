import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';
import { useAuth } from '@/features/auth';
import {
  useActiveLegalDocuments,
  useSubmitReconsent,
  useUserConsents,
  type ConsentType,
} from '@/features/auth';
import { loadGoogleAnalytics, removeGoogleAnalytics } from '@/lib/analytics';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_TYPE: ConsentType = 'COOKIES';
const COOKIE_BANNER_DISMISSED_KEY = 'vara-cookie-banner-dismissed';

/**
 * GDPR Art. 6 / ePrivacy Directive compliant cookie consent banner.
 * Gates Google Analytics behind explicit COOKIES consent.
 *
 * Behavior:
 * - Authenticated users: checks server-side consent records
 * - Unauthenticated users: uses localStorage preference, no tracking until consent
 * - On accept: loads GA, records consent (if authenticated)
 * - On decline: removes GA cookies, records revocation (if authenticated)
 */
export function CookieBanner() {
  const { isAuthenticated } = useAuth();
  const { data: legalDocsResponse } = useActiveLegalDocuments([
    COOKIE_CONSENT_TYPE,
  ]);
  const { data: userConsentsResponse, isLoading: consentsLoading } =
    useUserConsents({ enabled: isAuthenticated });
  const submitReconsent = useSubmitReconsent();

  const [dismissed, setDismissed] = useState(false);

  const cookieDoc = legalDocsResponse?.data?.find(
    (doc) => doc.type === COOKIE_CONSENT_TYPE,
  );

  // Determine current consent state
  const hasServerConsent =
    isAuthenticated && cookieDoc
      ? (userConsentsResponse?.data?.some(
          (c) =>
            c.type === COOKIE_CONSENT_TYPE && c.version === cookieDoc.version,
        ) ?? false)
      : false;

  const localDismissed = localStorage.getItem(COOKIE_BANNER_DISMISSED_KEY);

  // Compute visibility during render (no setState in effect)
  const visible = useMemo(() => {
    if (dismissed || consentsLoading) return false;

    if (isAuthenticated) {
      return !hasServerConsent && !!cookieDoc;
    }
    return !localDismissed;
  }, [
    dismissed,
    consentsLoading,
    isAuthenticated,
    hasServerConsent,
    cookieDoc,
    localDismissed,
  ]);

  // Gate GA based on consent
  useEffect(() => {
    if (isAuthenticated) {
      if (hasServerConsent) {
        loadGoogleAnalytics();
      }
    } else if (localDismissed === 'accepted') {
      loadGoogleAnalytics();
    }
  }, [isAuthenticated, hasServerConsent, localDismissed]);

  const handleAccept = useCallback(async () => {
    if (isAuthenticated && cookieDoc) {
      try {
        await submitReconsent.mutateAsync([
          { type: COOKIE_CONSENT_TYPE, version: cookieDoc.version },
        ]);
      } catch {
        // Still allow GA — consent attempt was made
      }
    }
    localStorage.setItem(COOKIE_BANNER_DISMISSED_KEY, 'accepted');
    loadGoogleAnalytics();
    setDismissed(true);
  }, [isAuthenticated, cookieDoc, submitReconsent]);

  const handleDecline = useCallback(() => {
    localStorage.setItem(COOKIE_BANNER_DISMISSED_KEY, 'declined');
    removeGoogleAnalytics();
    setDismissed(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="mx-auto max-w-2xl rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg p-4 md:p-6">
        <div className="flex items-start gap-3">
          <Cookie className="h-5 w-5 mt-0.5 text-primary shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Cookie Preferences</p>
              <p className="text-sm text-muted-foreground">
                We use cookies for analytics to improve your experience. No
                tracking cookies are set without your explicit consent.{' '}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={submitReconsent.isPending}
              >
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={handleDecline}>
                Decline
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDecline}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss cookie banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
