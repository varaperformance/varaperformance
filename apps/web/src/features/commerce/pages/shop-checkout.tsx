import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, Minus, Plus, Trash2 } from 'lucide-react';
import { PrivacyNotice } from '@/components/common/privacy-notice';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useAuth } from '@/features/auth';
import { useProfileAddresses } from '@/features/profile';
import type { ShopCheckoutAddress } from '@/features/commerce';
import {
  getShopCartSubtotalInCents,
  loadShopCart,
  loadShopCheckoutDraft,
  saveShopCart,
  saveShopCheckoutDraft,
  type ShopCartItem,
  type ShopCheckoutDraft,
} from '@/lib/shop-checkout-state';

const formatCurrency = (valueInCents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(valueInCents / 100);

const hasRequiredAddressFields = (address: ShopCheckoutAddress) =>
  Boolean(
    address.recipientName.trim() &&
    address.line1.trim() &&
    address.city.trim() &&
    address.postalCode.trim() &&
    address.country.trim(),
  );

export default function ShopCheckoutPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const { data: addressesData } = useProfileAddresses({
    enabled: isAuthenticated,
  });
  const [cart, setCart] = useState<ShopCartItem[]>(() => loadShopCart());

  const [draft, setDraft] = useState<ShopCheckoutDraft>(() =>
    loadShopCheckoutDraft(),
  );
  const [editingAddress, setEditingAddress] = useState(false);

  const savedAddresses = addressesData?.data?.items ?? [];
  const defaultAddress = savedAddresses.find((item) => item.isDefault) ?? null;

  const mapSavedAddress = (address: {
    recipientName: string;
    phone: string | null;
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
  }): ShopCheckoutAddress => ({
    recipientName: address.recipientName,
    phone: address.phone ?? '',
    line1: address.line1,
    line2: address.line2 ?? '',
    city: address.city,
    state: address.state ?? '',
    postalCode: address.postalCode,
    country: address.country,
  });

  useEffect(() => {
    saveShopCheckoutDraft(draft);
  }, [draft]);

  useEffect(() => {
    saveShopCart(cart);
  }, [cart]);

  const subtotalInCents = getShopCartSubtotalInCents(cart);

  const updateQuantity = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.variant.id === variantId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variant.id !== variantId));
  };

  const continueToReview = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      navigate('/shop');
      return;
    }

    if (!isAuthenticated && !draft.guestEmail.trim()) {
      toast.error('Please provide an email for checkout');
      return;
    }

    const shouldUseSavedDefault =
      isAuthenticated && !editingAddress && Boolean(defaultAddress);
    const selectedShippingAddress =
      shouldUseSavedDefault && defaultAddress
        ? mapSavedAddress(defaultAddress)
        : draft.shippingAddress;
    const selectedBillingAddress = draft.billingSameAsShipping
      ? selectedShippingAddress
      : draft.billingAddress;

    if (!hasRequiredAddressFields(selectedShippingAddress)) {
      toast.error('Please add a shipping address before continuing');
      setEditingAddress(true);
      return;
    }

    if (
      !draft.billingSameAsShipping &&
      !hasRequiredAddressFields(selectedBillingAddress)
    ) {
      toast.error('Please add a billing address or use shipping for billing');
      return;
    }

    setDraft((prev) => ({
      ...prev,
      shippingAddress: selectedShippingAddress,
      billingAddress: selectedBillingAddress,
      guestEmail: prev.guestEmail.trim(),
      discountCode: prev.discountCode.trim().toUpperCase(),
      referralCode: prev.referralCode.trim().toUpperCase(),
    }));

    navigate('/shop/checkout/review');
  };

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="mb-2 text-2xl font-bold">Your Cart</h1>
        <p className="mb-6 text-muted-foreground">
          Your cart is currently empty.
        </p>
        <Button asChild>
          <Link to="/shop">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link to="/shop">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Continue Shopping
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Step 1 of 2</p>
      </div>

      {/* ── Cart Items ── */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>
            Your Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {cart.map((item) => {
            const image = item.product.images?.[0];
            return (
              <div
                key={item.variant.id}
                className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
              >
                {/* Product image */}
                {image?.url ? (
                  <Link to={`/shop/product/${item.product.slug}`}>
                    <img
                      src={image.url}
                      alt={image.alt ?? item.product.name}
                      className="h-20 w-20 rounded-lg object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </Link>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                    No img
                  </div>
                )}

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/shop/product/${item.product.slug}`}
                    className="font-semibold hover:underline"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {item.variant.title}
                  </p>
                  <p className="text-sm font-medium">
                    {formatCurrency(item.variant.priceInCents)}
                  </p>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.variant.id, -1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.variant.id, 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {/* Line total + remove */}
                <div className="flex flex-col items-end gap-1">
                  <span className="font-semibold">
                    {formatCurrency(item.variant.priceInCents * item.quantity)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.variant.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Subtotal row */}
          <div className="flex items-center justify-between pt-4">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="text-lg font-bold">
              {formatCurrency(subtotalInCents)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Checkout Details ── */}
      <div
        className={cn('grid gap-6', !isMobile && 'lg:grid-cols-[1fr_360px]')}
      >
        <div className="space-y-6">
          {!isAuthenticated && (
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="email"
                  value={draft.guestEmail}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      guestEmail: event.target.value,
                    }))
                  }
                  placeholder="Email for receipt"
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Shipping Address</CardTitle>
                {isAuthenticated && defaultAddress && !editingAddress && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingAddress(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isAuthenticated && defaultAddress && !editingAddress ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {defaultAddress.recipientName}
                  </p>
                  <p>{defaultAddress.line1}</p>
                  {defaultAddress.line2 && <p>{defaultAddress.line2}</p>}
                  <p>
                    {defaultAddress.city}, {defaultAddress.state || ''}{' '}
                    {defaultAddress.postalCode}
                  </p>
                  <p>{defaultAddress.country}</p>
                </div>
              ) : (
                <div
                  className={cn('grid gap-2', !isMobile && 'sm:grid-cols-2')}
                >
                  <Input
                    value={draft.shippingAddress.recipientName}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        shippingAddress: {
                          ...prev.shippingAddress,
                          recipientName: event.target.value,
                        },
                      }))
                    }
                    placeholder="Recipient name"
                  />
                  <Input
                    value={draft.shippingAddress.phone || ''}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        shippingAddress: {
                          ...prev.shippingAddress,
                          phone: event.target.value,
                        },
                      }))
                    }
                    placeholder="Phone (optional)"
                  />
                  <Input
                    className="sm:col-span-2"
                    value={draft.shippingAddress.line1}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        shippingAddress: {
                          ...prev.shippingAddress,
                          line1: event.target.value,
                        },
                      }))
                    }
                    placeholder="Address line 1"
                  />
                  <Input
                    className="sm:col-span-2"
                    value={draft.shippingAddress.line2 || ''}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        shippingAddress: {
                          ...prev.shippingAddress,
                          line2: event.target.value,
                        },
                      }))
                    }
                    placeholder="Address line 2 (optional)"
                  />
                  <Input
                    value={draft.shippingAddress.city}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        shippingAddress: {
                          ...prev.shippingAddress,
                          city: event.target.value,
                        },
                      }))
                    }
                    placeholder="City"
                  />
                  <Input
                    value={draft.shippingAddress.state || ''}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        shippingAddress: {
                          ...prev.shippingAddress,
                          state: event.target.value,
                        },
                      }))
                    }
                    placeholder="State/Province"
                  />
                  <Input
                    value={draft.shippingAddress.postalCode}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        shippingAddress: {
                          ...prev.shippingAddress,
                          postalCode: event.target.value,
                        },
                      }))
                    }
                    placeholder="Postal code"
                  />
                  <Input
                    value={draft.shippingAddress.country}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        shippingAddress: {
                          ...prev.shippingAddress,
                          country: event.target.value.toUpperCase(),
                        },
                      }))
                    }
                    placeholder="Country code (e.g. US)"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing and Codes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="billing-same-as-shipping"
                  checked={draft.billingSameAsShipping}
                  onCheckedChange={(checked) =>
                    setDraft((prev) => ({
                      ...prev,
                      billingSameAsShipping: checked === true,
                      billingAddress:
                        checked === true
                          ? prev.shippingAddress
                          : prev.billingAddress,
                    }))
                  }
                />
                <label htmlFor="billing-same-as-shipping" className="text-sm">
                  Billing address is the same as shipping
                </label>
              </div>

              {!draft.billingSameAsShipping && (
                <div
                  className={cn('grid gap-2', !isMobile && 'sm:grid-cols-2')}
                >
                  <Input
                    value={draft.billingAddress.recipientName}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        billingAddress: {
                          ...prev.billingAddress,
                          recipientName: event.target.value,
                        },
                      }))
                    }
                    placeholder="Recipient name"
                  />
                  <Input
                    value={draft.billingAddress.phone || ''}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        billingAddress: {
                          ...prev.billingAddress,
                          phone: event.target.value,
                        },
                      }))
                    }
                    placeholder="Phone (optional)"
                  />
                  <Input
                    className="sm:col-span-2"
                    value={draft.billingAddress.line1}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        billingAddress: {
                          ...prev.billingAddress,
                          line1: event.target.value,
                        },
                      }))
                    }
                    placeholder="Address line 1"
                  />
                  <Input
                    className="sm:col-span-2"
                    value={draft.billingAddress.line2 || ''}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        billingAddress: {
                          ...prev.billingAddress,
                          line2: event.target.value,
                        },
                      }))
                    }
                    placeholder="Address line 2 (optional)"
                  />
                  <Input
                    value={draft.billingAddress.city}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        billingAddress: {
                          ...prev.billingAddress,
                          city: event.target.value,
                        },
                      }))
                    }
                    placeholder="City"
                  />
                  <Input
                    value={draft.billingAddress.state || ''}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        billingAddress: {
                          ...prev.billingAddress,
                          state: event.target.value,
                        },
                      }))
                    }
                    placeholder="State/Province"
                  />
                  <Input
                    value={draft.billingAddress.postalCode}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        billingAddress: {
                          ...prev.billingAddress,
                          postalCode: event.target.value,
                        },
                      }))
                    }
                    placeholder="Postal code"
                  />
                  <Input
                    value={draft.billingAddress.country}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        billingAddress: {
                          ...prev.billingAddress,
                          country: event.target.value.toUpperCase(),
                        },
                      }))
                    }
                    placeholder="Country code (e.g. US)"
                  />
                </div>
              )}

              {isAuthenticated && editingAddress && (
                <div className="space-y-3 rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="save-address-to-profile"
                      checked={draft.saveAddressToProfile}
                      onCheckedChange={(checked) =>
                        setDraft((prev) => ({
                          ...prev,
                          saveAddressToProfile: checked === true,
                          saveAsDefaultAddress:
                            checked === true
                              ? prev.saveAsDefaultAddress
                              : false,
                        }))
                      }
                    />
                    <label
                      htmlFor="save-address-to-profile"
                      className="text-sm"
                    >
                      Save shipping address to profile
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="save-as-default-address"
                      checked={draft.saveAsDefaultAddress}
                      disabled={!draft.saveAddressToProfile}
                      onCheckedChange={(checked) =>
                        setDraft((prev) => ({
                          ...prev,
                          saveAsDefaultAddress: checked === true,
                        }))
                      }
                    />
                    <label
                      htmlFor="save-as-default-address"
                      className="text-sm"
                    >
                      Set as default address
                    </label>
                  </div>
                </div>
              )}

              <Input
                value={draft.discountCode}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    discountCode: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="Promo / Discount code (optional)"
              />
              <Input
                value={draft.referralCode}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    referralCode: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="Referral code (optional)"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar summary */}
        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.map((item) => (
              <div
                key={item.variant.id}
                className="flex items-start justify-between gap-2 text-sm"
              >
                <div>
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-muted-foreground">
                    {item.variant.title} &times; {item.quantity}
                  </p>
                </div>
                <p className="font-medium">
                  {formatCurrency(item.variant.priceInCents * item.quantity)}
                </p>
              </div>
            ))}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-semibold">
                  {formatCurrency(subtotalInCents)}
                </span>
              </div>
            </div>
            <PrivacyNotice variant="payment" />
            <Button className="w-full" onClick={continueToReview}>
              Continue to Review
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
