import { useMemo, useState } from 'react';
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAdminCancelShopOrder,
  useAdminRefundShopOrder,
  useAdminShopOrders,
  type AdminShopOrder,
} from '@/hooks/use-admin';

const formatCurrency = (valueInCents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(valueInCents / 100);

export default function AdminShopOrdersPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [activeOrder, setActiveOrder] = useState<AdminShopOrder | null>(null);
  const [cancelTargetOrder, setCancelTargetOrder] =
    useState<AdminShopOrder | null>(null);
  const [cancelReasonCode, setCancelReasonCode] = useState<
    | 'OUT_OF_STOCK'
    | 'CUSTOMER_REQUEST'
    | 'FRAUD_RISK'
    | 'PRICING_ERROR'
    | 'OTHER'
  >('OUT_OF_STOCK');
  const [cancelReasonNote, setCancelReasonNote] = useState('');
  const [refundTargetOrder, setRefundTargetOrder] =
    useState<AdminShopOrder | null>(null);
  const [refundReasonCode, setRefundReasonCode] = useState<
    | 'CUSTOMER_REQUEST'
    | 'DEFECTIVE_PRODUCT'
    | 'WRONG_ITEM'
    | 'NOT_AS_DESCRIBED'
    | 'OTHER'
  >('CUSTOMER_REQUEST');
  const [refundReasonNote, setRefundReasonNote] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'PENDING' | 'PAID' | 'PARTIAL_REFUNDED' | 'CANCELLED' | 'REFUNDED'
  >('ALL');
  const { data, isLoading } = useAdminShopOrders({ page, limit: 20 });
  const cancelOrder = useAdminCancelShopOrder();
  const refundOrder = useAdminRefundShopOrder();

  const items = data?.data?.items ?? [];
  const totalPages = data?.data?.totalPages ?? 1;
  const getPartialRefundInfo = (order: AdminShopOrder) => {
    const metadata = order.metadata;
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    const refund = (metadata as Record<string, unknown>).refund;
    if (!refund || typeof refund !== 'object') {
      return null;
    }

    const partial = (refund as Record<string, unknown>).partial;
    if (partial !== true) {
      return null;
    }

    return {
      amountRefundedInCents:
        typeof (refund as Record<string, unknown>).amountRefundedInCents ===
        'number'
          ? ((refund as Record<string, unknown>)
              .amountRefundedInCents as number)
          : null,
      chargeAmountInCents:
        typeof (refund as Record<string, unknown>).chargeAmountInCents ===
        'number'
          ? ((refund as Record<string, unknown>).chargeAmountInCents as number)
          : null,
    };
  };

  const filteredItems = items.filter((item) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      item.orderNumber.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      (item.user?.profile?.displayName || '').toLowerCase().includes(q);
    const isPartialRefund = Boolean(getPartialRefundInfo(item));
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'PARTIAL_REFUNDED'
          ? isPartialRefund
          : item.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const paidCount = items.filter((item) => item.status === 'PAID').length;
  const pendingCount = items.filter((item) => item.status === 'PENDING').length;
  const totalRevenueInCents = items
    .filter((item) => item.status === 'PAID')
    .reduce((sum, item) => sum + item.totalInCents, 0);

  const statusVariant = (
    status: string,
  ): 'default' | 'secondary' | 'destructive' => {
    if (status === 'PAID') return 'default';
    if (status === 'CANCELLED') return 'destructive';
    return 'secondary';
  };

  const shippingDetails = useMemo(() => {
    if (!activeOrder?.metadata || typeof activeOrder.metadata !== 'object') {
      return null;
    }

    const metadata = activeOrder.metadata as {
      shippingDetails?: {
        name?: string | null;
        phone?: string | null;
        address?: {
          line1?: string | null;
          line2?: string | null;
          city?: string | null;
          state?: string | null;
          postalCode?: string | null;
          country?: string | null;
        };
      };
      checkoutAddress?: {
        shipping?: {
          recipientName?: string | null;
          phone?: string | null;
          line1?: string | null;
          line2?: string | null;
          city?: string | null;
          state?: string | null;
          postalCode?: string | null;
          country?: string | null;
        };
      };
    };

    const checkoutShipping = metadata.checkoutAddress?.shipping;
    if (checkoutShipping) {
      return {
        name: checkoutShipping.recipientName ?? null,
        phone: checkoutShipping.phone ?? null,
        address: {
          line1: checkoutShipping.line1 ?? null,
          line2: checkoutShipping.line2 ?? null,
          city: checkoutShipping.city ?? null,
          state: checkoutShipping.state ?? null,
          postalCode: checkoutShipping.postalCode ?? null,
          country: checkoutShipping.country ?? null,
        },
      };
    }

    return metadata.shippingDetails ?? null;
  }, [activeOrder]);

  const openCancelModal = (order: AdminShopOrder) => {
    setCancelTargetOrder(order);
    setCancelReasonCode('OUT_OF_STOCK');
    setCancelReasonNote('');
  };

  const handleCancel = async () => {
    if (!cancelTargetOrder) {
      return;
    }

    const reasonByCode: Record<typeof cancelReasonCode, string> = {
      OUT_OF_STOCK: 'Out of stock',
      CUSTOMER_REQUEST: 'Customer requested cancellation',
      FRAUD_RISK: 'Flagged for fraud risk',
      PRICING_ERROR: 'Pricing error',
      OTHER: 'Other',
    };

    if (cancelReasonCode === 'OTHER' && !cancelReasonNote.trim()) {
      toast.error('Please provide cancellation details');
      return;
    }

    const composedReason =
      cancelReasonCode === 'OTHER'
        ? cancelReasonNote.trim()
        : cancelReasonNote.trim()
          ? `${reasonByCode[cancelReasonCode]} - ${cancelReasonNote.trim()}`
          : reasonByCode[cancelReasonCode];

    try {
      await cancelOrder.mutateAsync({
        orderId: cancelTargetOrder.id,
        reason: composedReason,
      });
      toast.success(`Order ${cancelTargetOrder.orderNumber} cancelled`);
      setCancelTargetOrder(null);
    } catch {
      toast.error('Unable to cancel this order');
    }
  };

  const openRefundModal = (order: AdminShopOrder) => {
    setRefundTargetOrder(order);
    setRefundReasonCode('CUSTOMER_REQUEST');
    setRefundReasonNote('');
  };

  const handleRefund = async () => {
    if (!refundTargetOrder) return;

    const reasonByCode: Record<typeof refundReasonCode, string> = {
      CUSTOMER_REQUEST: 'Customer requested refund',
      DEFECTIVE_PRODUCT: 'Defective or damaged product',
      WRONG_ITEM: 'Wrong item shipped',
      NOT_AS_DESCRIBED: 'Item not as described',
      OTHER: 'Other',
    };

    if (refundReasonCode === 'OTHER' && !refundReasonNote.trim()) {
      toast.error('Please provide refund details');
      return;
    }

    const composedReason =
      refundReasonCode === 'OTHER'
        ? refundReasonNote.trim()
        : refundReasonNote.trim()
          ? `${reasonByCode[refundReasonCode]} - ${refundReasonNote.trim()}`
          : reasonByCode[refundReasonCode];

    try {
      await refundOrder.mutateAsync({
        orderId: refundTargetOrder.id,
        reason: composedReason,
      });
      toast.success(`Order ${refundTargetOrder.orderNumber} refunded`);
      setRefundTargetOrder(null);
    } catch {
      toast.error('Unable to refund this order');
    }
  };

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shop Orders</h1>
        <p className="mt-1 text-muted-foreground">
          Monitor order lifecycle, discounts, and checkout conversion.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Orders (Page)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Paid / Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {paidCount} / {pendingCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Paid Revenue (Page)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(totalRevenueInCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              placeholder="Search by order number, customer email, or display name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | 'ALL'
                    | 'PENDING'
                    | 'PAID'
                    | 'PARTIAL_REFUNDED'
                    | 'CANCELLED'
                    | 'REFUNDED',
                )
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL_REFUNDED">Partial refunded</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fulfillment</TableHead>
                  <TableHead>Discount / Referral</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No orders found for the current search and status filters.
                    </TableCell>
                  </TableRow>
                )}
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.user?.profile?.displayName ||
                        item.user?.email ||
                        'Guest'}
                    </TableCell>
                    <TableCell>
                      {item.items.reduce(
                        (acc, orderItem) => acc + orderItem.quantity,
                        0,
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(item.totalInCents)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(item.status)}>
                        {item.status}
                      </Badge>
                      {getPartialRefundInfo(item) && (
                        <div className="mt-1">
                          <Badge variant="outline">PARTIAL REFUND</Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {item.fulfillmentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {item.discountCode?.code || '-'} /{' '}
                        {item.referralCode?.code || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setActiveOrder(item)}
                          aria-label={`View ${item.orderNumber}`}
                          title={`View ${item.orderNumber}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          disabled={
                            item.status !== 'PENDING' || cancelOrder.isPending
                          }
                          onClick={() => openCancelModal(item)}
                          aria-label={`Cancel ${item.orderNumber}`}
                          title={`Cancel ${item.orderNumber}`}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          disabled={
                            item.status !== 'PAID' || refundOrder.isPending
                          }
                          onClick={() => openRefundModal(item)}
                          aria-label={`Refund ${item.orderNumber}`}
                          title={`Refund ${item.orderNumber}`}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Prev
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
        >
          Next <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <Dialog
        open={Boolean(activeOrder)}
        onOpenChange={(open) => !open && setActiveOrder(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              {activeOrder?.orderNumber} • {activeOrder?.email}
            </DialogDescription>
          </DialogHeader>

          {activeOrder && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">Payment</p>
                  <p className="mt-1 text-muted-foreground">
                    Status: {activeOrder.status}
                  </p>
                  <p className="text-muted-foreground">
                    Total: {formatCurrency(activeOrder.totalInCents)}
                  </p>
                  {getPartialRefundInfo(activeOrder) && (
                    <p className="text-muted-foreground">
                      Partial refund:{' '}
                      {formatCurrency(
                        getPartialRefundInfo(activeOrder)
                          ?.amountRefundedInCents ?? 0,
                      )}
                      {typeof getPartialRefundInfo(activeOrder)
                        ?.chargeAmountInCents === 'number'
                        ? ` / ${formatCurrency(getPartialRefundInfo(activeOrder)?.chargeAmountInCents ?? 0)}`
                        : ''}
                    </p>
                  )}
                </div>
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">Fulfillment</p>
                  <p className="mt-1 text-muted-foreground">
                    {activeOrder.fulfillmentStatus}
                  </p>
                </div>
              </div>

              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">Shipping Address</p>
                {shippingDetails?.address ? (
                  <div className="mt-1 space-y-0.5 text-muted-foreground">
                    <p>{shippingDetails.name || 'No name'}</p>
                    <p>{shippingDetails.phone || 'No phone'}</p>
                    <p>{shippingDetails.address.line1 || '-'}</p>
                    {shippingDetails.address.line2 && (
                      <p>{shippingDetails.address.line2}</p>
                    )}
                    <p>
                      {shippingDetails.address.city || ''}
                      {shippingDetails.address.city ? ', ' : ''}
                      {shippingDetails.address.state || ''}{' '}
                      {shippingDetails.address.postalCode || ''}
                    </p>
                    <p>{shippingDetails.address.country || ''}</p>
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground">
                    No shipping details were captured for this order.
                  </p>
                )}
              </div>

              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">Line Items</p>
                <div className="mt-2 space-y-2">
                  {activeOrder.items.map((orderItem) => (
                    <div
                      key={orderItem.id}
                      className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium">{orderItem.name}</p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {orderItem.sku || '-'} • Qty:{' '}
                          {orderItem.quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatCurrency(orderItem.totalInCents)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(cancelTargetOrder)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTargetOrder(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              {cancelTargetOrder?.orderNumber} • choose a cancellation reason
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cancellation reason</label>
              <select
                value={cancelReasonCode}
                onChange={(event) =>
                  setCancelReasonCode(
                    event.target.value as
                      | 'OUT_OF_STOCK'
                      | 'CUSTOMER_REQUEST'
                      | 'FRAUD_RISK'
                      | 'PRICING_ERROR'
                      | 'OTHER',
                  )
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="OUT_OF_STOCK">Out of stock</option>
                <option value="CUSTOMER_REQUEST">
                  Customer requested cancellation
                </option>
                <option value="FRAUD_RISK">Flagged for fraud risk</option>
                <option value="PRICING_ERROR">Pricing error</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {cancelReasonCode === 'OTHER'
                  ? 'Cancellation details'
                  : 'Additional details (optional)'}
              </label>
              <Input
                value={cancelReasonNote}
                onChange={(event) => setCancelReasonNote(event.target.value)}
                placeholder={
                  cancelReasonCode === 'OTHER'
                    ? 'Add required cancellation details'
                    : 'Add optional context'
                }
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancelTargetOrder(null)}
                disabled={cancelOrder.isPending}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleCancel()}
                disabled={cancelOrder.isPending}
              >
                {cancelOrder.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling
                  </>
                ) : (
                  'Confirm Cancel'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(refundTargetOrder)}
        onOpenChange={(open) => {
          if (!open) setRefundTargetOrder(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Refund Order</DialogTitle>
            <DialogDescription>
              {refundTargetOrder?.orderNumber} •{' '}
              {refundTargetOrder
                ? formatCurrency(refundTargetOrder.totalInCents)
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Refund reason</Label>
              <select
                value={refundReasonCode}
                onChange={(event) =>
                  setRefundReasonCode(
                    event.target.value as typeof refundReasonCode,
                  )
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="CUSTOMER_REQUEST">
                  Customer requested refund
                </option>
                <option value="DEFECTIVE_PRODUCT">
                  Defective or damaged product
                </option>
                <option value="WRONG_ITEM">Wrong item shipped</option>
                <option value="NOT_AS_DESCRIBED">Item not as described</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>
                {refundReasonCode === 'OTHER'
                  ? 'Refund details'
                  : 'Additional details (optional)'}
              </Label>
              <Textarea
                value={refundReasonNote}
                onChange={(event) => setRefundReasonNote(event.target.value)}
                placeholder={
                  refundReasonCode === 'OTHER'
                    ? 'Provide required refund details'
                    : 'Add optional context'
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRefundTargetOrder(null)}
              disabled={refundOrder.isPending}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleRefund()}
              disabled={refundOrder.isPending}
            >
              {refundOrder.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing
                </>
              ) : (
                'Confirm Refund'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
