import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import api from '@/lib/api';
import type { SuccessResponse } from '@varaperformance/core';

type Status = 'loading' | 'success' | 'error';

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(
    token ? '' : 'No unsubscribe token provided.',
  );

  useEffect(() => {
    if (!token) return;

    api
      .post<SuccessResponse>(
        `consent/unsubscribe?token=${encodeURIComponent(token)}`,
      )
      .then(() => {
        setStatus('success');
        setMessage('You have been unsubscribed from marketing emails.');
      })
      .catch(() => {
        setStatus('error');
        setMessage(
          'This unsubscribe link is invalid or expired. Please manage your preferences from account settings.',
        );
      });
  }, [token]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-bold">Email Preferences</h1>

        {status === 'loading' && (
          <p className="text-muted-foreground">Processing your request...</p>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg
                className="h-6 w-6 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">
              You can re-enable marketing emails anytime from your{' '}
              <Link
                to="/elevate/studio?section=settings"
                className="text-primary hover:underline"
              >
                account settings
              </Link>
              .
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <svg
                className="h-6 w-6 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-muted-foreground">{message}</p>
            <Link
              to="/elevate/studio?section=settings"
              className="inline-block text-sm text-primary hover:underline"
            >
              Go to account settings
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
