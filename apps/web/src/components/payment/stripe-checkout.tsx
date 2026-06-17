import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

/**
 * Payment step for booking checkout.
 * Stripe hosted checkout is the only supported flow.
 */
export function PaymentStep({
  bookingId,
  onCancel,
}: {
  bookingId: string;
  packageName?: string;
  amount?: number;
  billingCycle?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(true);

  useEffect(() => {
    const createCheckout = async () => {
      try {
        const response = await api.post(
          `coaching/payments/bookings/${bookingId}/pay`,
        );
        const data = response.data;

        if (data.success && data.data?.checkoutUrl) {
          setIsRedirecting(true);
          window.location.assign(data.data.checkoutUrl);
          return;
        }

        setError(
          data.error?.message ||
            'Unable to initialize Stripe checkout for this booking.',
        );
      } catch (err) {
        console.error('Payment init error:', err);
        setError('Failed to connect to payment service');
      } finally {
        setIsCreating(false);
      }
    };

    createCheckout();
  }, [bookingId]);

  if (isCreating || isRedirecting) {
    return (
      <div className="p-4 text-center">
        <svg
          className="mx-auto mb-2 h-6 w-6 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-sm text-muted-foreground">
          {isRedirecting
            ? 'Redirecting to secure Stripe checkout...'
            : 'Initializing payment...'}
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Error</CardTitle>
        <CardDescription>
          {error || 'Unable to initialize payment. Please try again.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onCancel}>Go Back</Button>
      </CardContent>
    </Card>
  );
}
