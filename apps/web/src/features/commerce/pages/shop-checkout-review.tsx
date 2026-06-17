import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { isNativeApp } from '@/lib/capacitor';
import { openUrl } from '@/lib/browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth';
import { useCreateShopCheckoutSession } from '@/features/commerce';
import {
  getShopCartSubtotalInCents,
  loadShopCart,
  loadShopCheckoutDraft,
  saveShopCheckoutLastOrder,
} from '@/lib/shop-checkout-state';

const formatCurrency = (valueInCents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(valueInCents / 100);

const hasRequiredAddressFields = (address: {
  recipientName: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
}) =>
  Boolean(
    address.recipientName.trim() &&
    address.line1.trim() &&
    address.city.trim() &&
    address.postalCode.trim() &&
    address.country.trim(),
  );

export default function ShopCheckoutReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const cart = useMemo(() => loadShopCart(), []);
  const draft = useMemo(() => loadShopCheckoutDraft(), []);
  const checkoutMutation = useCreateShopCheckoutSession();

  const subtotalInCents = getShopCartSubtotalInCents(cart);

  useEffect(() => {
    if (searchParams.get('status') === 'cancelled') {
      toast.message('Stripe checkout was canceled. Your cart is still saved.');
    }
  }, [searchParams]);

  const submitPayment = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      navigate('/shop');
      return;
    }

    const email = isAuthenticated ? user?.email : draft.guestEmail;
    if (!email?.trim()) {
      toast.error('Please provide an email for checkout');
      navigate('/shop/checkout');
      return;
    }

    if (!hasRequiredAddressFields(draft.shippingAddress)) {
      toast.error('Shipping address is incomplete');
      navigate('/shop/checkout');
      return;
    }

    if (
      !draft.billingSameAsShipping &&
      !hasRequiredAddressFields(draft.billingAddress)
    ) {
      toast.error('Billing address is incomplete');
      navigate('/shop/checkout');
      return;
    }

    try {
      const result = await checkoutMutation.mutateAsync({
        email,
        discountCode: draft.discountCode.trim() || undefined,
        referralCode: draft.referralCode.trim() || undefined,
        shippingAddress: draft.shippingAddress,
        billingAddress: draft.billingSameAsShipping
          ? undefined
          : draft.billingAddress,
        billingSameAsShipping: draft.billingSameAsShipping,
        saveAddressToProfile: isAuthenticated
          ? draft.saveAddressToProfile
          : false,
        saveAsDefaultAddress:
          isAuthenticated && draft.saveAddressToProfile
            ? draft.saveAsDefaultAddress
            : false,
        items: cart.map((item) => ({
          variantId: item.variant.id,
          quantity: item.quantity,
        })),
      });

      const checkoutUrl = result.data?.checkoutUrl;
      const orderId = result.data?.orderId;
      const orderNumber = result.data?.orderNumber;
      const sessionId = result.data?.sessionId;

      if (checkoutUrl && orderId && orderNumber && sessionId) {
        saveShopCheckoutLastOrder({
          orderId,
          orderNumber,
          sessionId,
          email,
          subtotalInCents,
        });
        if (isNativeApp()) {
          await openUrl(checkoutUrl);
        } else {
          window.location.assign(checkoutUrl);
        }
        return;
      }

      toast.error('Checkout URL was not returned');
    } catch {
      toast.error('Checkout failed. Please verify your details and try again.');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Review & Pay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <Button asChild>
              <Link to="/shop">Return to Shop</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link to="/shop/checkout">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Checkout
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Step 2 of 2</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.variant.id}
                  className="flex items-start justify-between gap-3 border-b pb-3 text-sm last:border-b-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-muted-foreground">
                      {item.variant.title} · Qty {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatCurrency(item.variant.priceInCents * item.quantity)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {draft.shippingAddress.recipientName}
              </p>
              <p>{draft.shippingAddress.line1}</p>
              {draft.shippingAddress.line2 && (
                <p>{draft.shippingAddress.line2}</p>
              )}
              <p>
                {draft.shippingAddress.city},{' '}
                {draft.shippingAddress.state || ''}{' '}
                {draft.shippingAddress.postalCode}
              </p>
              <p>{draft.shippingAddress.country}</p>
              {draft.shippingAddress.phone && (
                <p>{draft.shippingAddress.phone}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              {draft.billingSameAsShipping ? (
                <p>Same as shipping address</p>
              ) : (
                <>
                  <p className="font-medium text-foreground">
                    {draft.billingAddress.recipientName}
                  </p>
                  <p>{draft.billingAddress.line1}</p>
                  {draft.billingAddress.line2 && (
                    <p>{draft.billingAddress.line2}</p>
                  )}
                  <p>
                    {draft.billingAddress.city},{' '}
                    {draft.billingAddress.state || ''}{' '}
                    {draft.billingAddress.postalCode}
                  </p>
                  <p>{draft.billingAddress.country}</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Final Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Contact</span>
              <span className="font-medium">
                {isAuthenticated ? user?.email : draft.guestEmail}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Promo code</span>
              <span className="font-medium">{draft.discountCode || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Referral code</span>
              <span className="font-medium">{draft.referralCode || '-'}</span>
            </div>
            <div className="border-t pt-3">
              <div className="mb-3 flex items-center justify-between">
                <span>Subtotal</span>
                <span className="text-base font-semibold">
                  {formatCurrency(subtotalInCents)}
                </span>
              </div>
              <p className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure payment handled by Stripe
              </p>
              <Button
                className="w-full"
                onClick={submitPayment}
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting to Stripe
                  </>
                ) : (
                  'Submit & Pay'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
