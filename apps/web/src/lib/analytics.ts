const GA_MEASUREMENT_ID = 'G-7VPXRQXJFS';

const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(
  window.location.hostname,
);

let gaLoaded = false;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/**
 * Load Google Analytics only after COOKIES consent is granted.
 * GDPR Art. 6 + ePrivacy Directive: No tracking scripts before consent.
 */
export function loadGoogleAnalytics(): void {
  if (gaLoaded || isLocalHost) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);

  gaLoaded = true;
}

/**
 * Remove GA cookies and stop tracking when consent is revoked.
 */
export function removeGoogleAnalytics(): void {
  if (!gaLoaded) return;

  // Disable GA tracking
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });

  // Clear GA cookies
  const cookiePrefixes = ['_ga', '_gid', '_gat'];
  const hostname = window.location.hostname;
  const domains = [hostname, `.${hostname}`];

  for (const prefix of cookiePrefixes) {
    for (const domain of domains) {
      document.cookie = `${prefix}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`;
    }
  }

  gaLoaded = false;
}
