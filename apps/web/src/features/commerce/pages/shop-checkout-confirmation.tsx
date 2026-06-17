import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle2, ReceiptText, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth';
import {
  clearShopCheckoutState,
  loadShopCheckoutLastOrder,
} from '@/lib/shop-checkout-state';

const formatCurrency = (valueInCents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(valueInCents / 100);

export default function ShopCheckoutConfirmationPage() {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') ?? '';
  const sessionId = searchParams.get('session_id') ?? '';
  const lastOrder = useMemo(() => loadShopCheckoutLastOrder(), []);

  useEffect(() => {
    clearShopCheckoutState();
  }, []);

  const matchesLastOrder = Boolean(
    lastOrder && orderId && lastOrder.orderId === orderId,
  );
  const confirmedOrder = matchesLastOrder ? lastOrder : null;

  return (
    <div className="container py-12">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">Payment Confirmed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Thank you for your order. Your payment was completed successfully.
          </p>

          <div className="space-y-2 rounded-md border p-4 text-sm">
            {confirmedOrder && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Order number</span>
                <span className="font-semibold">
                  {confirmedOrder.orderNumber}
                </span>
              </div>
            )}

            {confirmedOrder && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Order subtotal</span>
                <span className="font-semibold">
                  {formatCurrency(confirmedOrder.subtotalInCents)}
                </span>
              </div>
            )}

            {orderId && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono text-xs">{orderId}</span>
              </div>
            )}

            {sessionId && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Stripe session</span>
                <span className="font-mono text-xs">{sessionId}</span>
              </div>
            )}

            {confirmedOrder && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Receipt email</span>
                <span className="font-medium">{confirmedOrder.email}</span>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild>
              <Link to="/shop">
                <Store className="mr-2 h-4 w-4" />
                Continue Shopping
              </Link>
            </Button>

            {isAuthenticated ? (
              <Button variant="outline" asChild>
                <Link to="/shop/orders">
                  <ReceiptText className="mr-2 h-4 w-4" />
                  View My Orders
                </Link>
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link to="/login">
                  <ReceiptText className="mr-2 h-4 w-4" />
                  Sign In for Order History
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
