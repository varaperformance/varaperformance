import type {
  ShopCheckoutAddress,
  ShopProduct,
  ShopProductVariant,
} from '@/features/commerce';

export interface ShopCartItem {
  product: ShopProduct;
  variant: ShopProductVariant;
  quantity: number;
}

export interface ShopCheckoutDraft {
  guestEmail: string;
  discountCode: string;
  referralCode: string;
  billingSameAsShipping: boolean;
  saveAddressToProfile: boolean;
  saveAsDefaultAddress: boolean;
  shippingAddress: ShopCheckoutAddress;
  billingAddress: ShopCheckoutAddress;
}

export interface ShopCheckoutLastOrder {
  orderId: string;
  orderNumber: string;
  email: string;
  subtotalInCents: number;
  sessionId: string;
}

export const EMPTY_SHOP_ADDRESS: ShopCheckoutAddress = {
  recipientName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
};

const SHOP_CART_STORAGE_KEY = 'shop.cart.items.v1';
const SHOP_CHECKOUT_DRAFT_STORAGE_KEY = 'shop.checkout.draft.v1';
const SHOP_CHECKOUT_LAST_ORDER_STORAGE_KEY = 'shop.checkout.last-order.v1';

export const createEmptyShopAddress = (): ShopCheckoutAddress => ({
  ...EMPTY_SHOP_ADDRESS,
});

export const createInitialCheckoutDraft = (): ShopCheckoutDraft => ({
  guestEmail: '',
  discountCode: '',
  referralCode: '',
  billingSameAsShipping: true,
  saveAddressToProfile: true,
  saveAsDefaultAddress: false,
  shippingAddress: createEmptyShopAddress(),
  billingAddress: createEmptyShopAddress(),
});

const isBrowser = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const parseJson = <T>(value: string | null): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const loadShopCart = (): ShopCartItem[] => {
  if (!isBrowser()) {
    return [];
  }

  const parsed = parseJson<ShopCartItem[]>(
    window.localStorage.getItem(SHOP_CART_STORAGE_KEY),
  );

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(
    (item) =>
      Boolean(item?.product?.id) &&
      Boolean(item?.variant?.id) &&
      Number.isFinite(item?.quantity) &&
      item.quantity > 0,
  );
};

export const saveShopCart = (items: ShopCartItem[]) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(SHOP_CART_STORAGE_KEY, JSON.stringify(items));
};

export const clearShopCart = () => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(SHOP_CART_STORAGE_KEY);
};

export const loadShopCheckoutDraft = (): ShopCheckoutDraft => {
  if (!isBrowser()) {
    return createInitialCheckoutDraft();
  }

  const parsed = parseJson<Partial<ShopCheckoutDraft>>(
    window.localStorage.getItem(SHOP_CHECKOUT_DRAFT_STORAGE_KEY),
  );

  const initial = createInitialCheckoutDraft();
  if (!parsed) {
    return initial;
  }

  return {
    ...initial,
    ...parsed,
    shippingAddress: {
      ...initial.shippingAddress,
      ...(parsed.shippingAddress ?? {}),
    },
    billingAddress: {
      ...initial.billingAddress,
      ...(parsed.billingAddress ?? {}),
    },
  };
};

export const saveShopCheckoutDraft = (draft: ShopCheckoutDraft) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    SHOP_CHECKOUT_DRAFT_STORAGE_KEY,
    JSON.stringify(draft),
  );
};

export const clearShopCheckoutDraft = () => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(SHOP_CHECKOUT_DRAFT_STORAGE_KEY);
};

export const loadShopCheckoutLastOrder = (): ShopCheckoutLastOrder | null => {
  if (!isBrowser()) {
    return null;
  }

  return parseJson<ShopCheckoutLastOrder>(
    window.localStorage.getItem(SHOP_CHECKOUT_LAST_ORDER_STORAGE_KEY),
  );
};

export const saveShopCheckoutLastOrder = (order: ShopCheckoutLastOrder) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    SHOP_CHECKOUT_LAST_ORDER_STORAGE_KEY,
    JSON.stringify(order),
  );
};

export const clearShopCheckoutLastOrder = () => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(SHOP_CHECKOUT_LAST_ORDER_STORAGE_KEY);
};

export const clearShopCheckoutState = () => {
  clearShopCart();
  clearShopCheckoutDraft();
};

export const getShopCartSubtotalInCents = (items: ShopCartItem[]) =>
  items.reduce(
    (total, item) => total + item.variant.priceInCents * item.quantity,
    0,
  );
