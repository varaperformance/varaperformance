import { useState } from 'react';
import { Loader2, Package, Truck, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  useAdminShopOrders,
  useUpdateAdminShopOrderFulfillment,
  type AdminShopOrder,
} from '@/hooks/use-admin';

const formatCurrency = (valueInCents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(valueInCents / 100);

const CARRIERS = [
  'USPS',
  'UPS',
  'FedEx',
  'DHL',
  'Amazon Logistics',
  'OnTrac',
  'Other',
] as const;

function getShippingAddress(order: AdminShopOrder) {
  const metadata = order.metadata;
  if (!metadata || typeof metadata !== 'object') return null;

  const checkoutAddress = (metadata as Record<string, unknown>)
    .checkoutAddress as Record<string, unknown> | undefined;
  const shipping = checkoutAddress?.shipping as
    | Record<string, unknown>
    | undefined;
  if (shipping) {
    return {
      name: (shipping.recipientName as string) ?? null,
      line1: (shipping.line1 as string) ?? null,
      line2: (shipping.line2 as string) ?? null,
      city: (shipping.city as string) ?? null,
      state: (shipping.state as string) ?? null,
      postalCode: (shipping.postalCode as string) ?? null,
      country: (shipping.country as string) ?? null,
    };
  }

  const shippingDetails = (metadata as Record<string, unknown>)
    .shippingDetails as Record<string, unknown> | undefined;
  if (shippingDetails) {
    const address = shippingDetails.address as
      | Record<string, unknown>
      | undefined;
    return {
      name: (shippingDetails.name as string) ?? null,
      line1: (address?.line1 as string) ?? null,
      line2: (address?.line2 as string) ?? null,
      city: (address?.city as string) ?? null,
      state: (address?.state as string) ?? null,
      postalCode: (address?.postalCode as string) ?? null,
      country: (address?.country as string) ?? null,
    };
  }

  return null;
}

function formatAddress(addr: ReturnType<typeof getShippingAddress>): string[] {
  if (!addr) return ['No address on file'];
  const lines: string[] = [];
  if (addr.name) lines.push(addr.name);
  if (addr.line1) lines.push(addr.line1);
  if (addr.line2) lines.push(addr.line2);
  const cityState = [addr.city, addr.state].filter(Boolean).join(', ');
  if (cityState || addr.postalCode) {
    lines.push([cityState, addr.postalCode].filter(Boolean).join(' '));
  }
  if (addr.country && addr.country !== 'US') lines.push(addr.country);
  return lines.length > 0 ? lines : ['No address on file'];
}

type FulfillmentFilter =
  | 'ALL'
  | 'UNFULFILLED'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED';

export default function AdminShopFulfillmentPage() {
  const [page, setPage] = useState(1);
  const [fulfillmentFilter, setFulfillmentFilter] =
    useState<FulfillmentFilter>('UNFULFILLED');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOrder, setActiveOrder] = useState<AdminShopOrder | null>(null);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<
    'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'FULFILLED'
  >('UNFULFILLED');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useAdminShopOrders({ page, limit: 50 });
  const updateFulfillment = useUpdateAdminShopOrderFulfillment();

  const allOrders = data?.data?.items ?? [];
  const totalPages = data?.data?.totalPages ?? 1;

  // Only show PAID orders on fulfillment page (cancelled/refunded are irrelevant)
  const fulfillableOrders = allOrders.filter(
    (o) => o.status === 'PAID' || o.status === 'PENDING',
  );

  const filtered = fulfillableOrders.filter((order) => {
    const matchesStatus =
      fulfillmentFilter === 'ALL' ||
      order.fulfillmentStatus === fulfillmentFilter;

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      order.orderNumber.toLowerCase().includes(q) ||
      order.email.toLowerCase().includes(q) ||
      (order.user?.profile?.displayName ?? '').toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  const unfulfilledCount = fulfillableOrders.filter(
    (o) => o.fulfillmentStatus === 'UNFULFILLED',
  ).length;
  const partialCount = fulfillableOrders.filter(
    (o) => o.fulfillmentStatus === 'PARTIALLY_FULFILLED',
  ).length;
  const fulfilledCount = fulfillableOrders.filter(
    (o) => o.fulfillmentStatus === 'FULFILLED',
  ).length;

  const openFulfillment = (order: AdminShopOrder) => {
    setActiveOrder(order);
    setFulfillmentStatus(order.fulfillmentStatus);
    setTrackingNumber(order.trackingNumber ?? '');
    setCarrier(order.carrier ?? '');
    setNotes(order.notes ?? '');
  };

  const handleSave = async () => {
    if (!activeOrder) return;

    if (
      (fulfillmentStatus === 'FULFILLED' ||
        fulfillmentStatus === 'PARTIALLY_FULFILLED') &&
      !trackingNumber.trim()
    ) {
      toast.error('Tracking number is required when marking as shipped');
      return;
    }

    if (
      (fulfillmentStatus === 'FULFILLED' ||
        fulfillmentStatus === 'PARTIALLY_FULFILLED') &&
      !carrier.trim()
    ) {
      toast.error('Carrier is required when marking as shipped');
      return;
    }

    try {
      await updateFulfillment.mutateAsync({
        orderId: activeOrder.id,
        fulfillmentStatus,
        trackingNumber: trackingNumber.trim(),
        carrier: carrier.trim(),
        notes: notes.trim(),
      });
      toast.success(`Order ${activeOrder.orderNumber} fulfillment updated`);
      setActiveOrder(null);
    } catch {
      toast.error('Failed to update fulfillment');
    }
  };

  const fulfillmentBadge = (status: string) => {
    switch (status) {
      case 'FULFILLED':
        return (
          <Badge className="bg-green-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Fulfilled
          </Badge>
        );
      case 'PARTIALLY_FULFILLED':
        return (
          <Badge className="bg-amber-600">
            <Package className="mr-1 h-3 w-3" />
            Partial
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            Unfulfilled
          </Badge>
        );
    }
  };

  const address = activeOrder ? getShippingAddress(activeOrder) : null;

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fulfillment</h1>
        <p className="mt-1 text-muted-foreground">
          Process orders, update shipping status, and add tracking information.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className={
            fulfillmentFilter === 'UNFULFILLED'
              ? 'ring-2 ring-primary'
              : 'cursor-pointer'
          }
          onClick={() => setFulfillmentFilter('UNFULFILLED')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Awaiting Shipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{unfulfilledCount}</p>
          </CardContent>
        </Card>
        <Card
          className={
            fulfillmentFilter === 'PARTIALLY_FULFILLED'
              ? 'ring-2 ring-primary'
              : 'cursor-pointer'
          }
          onClick={() => setFulfillmentFilter('PARTIALLY_FULFILLED')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Partially Shipped
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{partialCount}</p>
          </CardContent>
        </Card>
        <Card
          className={
            fulfillmentFilter === 'FULFILLED'
              ? 'ring-2 ring-primary'
              : 'cursor-pointer'
          }
          onClick={() => setFulfillmentFilter('FULFILLED')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Shipped</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fulfilledCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              placeholder="Search by order number, email, or customer name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              value={fulfillmentFilter}
              onChange={(e) =>
                setFulfillmentFilter(e.target.value as FulfillmentFilter)
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">All statuses</option>
              <option value="UNFULFILLED">Awaiting shipment</option>
              <option value="PARTIALLY_FULFILLED">Partially shipped</option>
              <option value="FULFILLED">Shipped</option>
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
                  <TableHead>Tracking</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No orders match the current filters.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium">{order.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {order.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.user?.profile?.displayName ||
                        order.user?.email ||
                        'Guest'}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {order.items.map((item) => (
                          <div key={item.id} className="text-xs">
                            {item.quantity}× {item.name}
                            {item.sku && (
                              <span className="ml-1 text-muted-foreground">
                                ({item.sku})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(order.totalInCents)}</TableCell>
                    <TableCell>
                      {fulfillmentBadge(order.fulfillmentStatus)}
                    </TableCell>
                    <TableCell>
                      {order.trackingNumber ? (
                        <div className="text-xs">
                          <div className="font-medium">
                            {order.carrier ?? ''}
                          </div>
                          <div className="text-muted-foreground">
                            {order.trackingNumber}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        onClick={() => openFulfillment(order)}
                        aria-label={
                          order.fulfillmentStatus === 'UNFULFILLED'
                            ? `Ship ${order.orderNumber}`
                            : `Update shipment for ${order.orderNumber}`
                        }
                        title={
                          order.fulfillmentStatus === 'UNFULFILLED'
                            ? `Ship ${order.orderNumber}`
                            : `Update shipment for ${order.orderNumber}`
                        }
                      >
                        <Truck className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog
        open={Boolean(activeOrder)}
        onOpenChange={(open) => {
          if (!open) setActiveOrder(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fulfill Order</DialogTitle>
            <DialogDescription>
              {activeOrder?.orderNumber} •{' '}
              {activeOrder ? formatCurrency(activeOrder.totalInCents) : ''}
            </DialogDescription>
          </DialogHeader>

          {activeOrder && (
            <div className="space-y-5">
              {/* Shipping address */}
              <div className="rounded-md border p-4">
                <p className="mb-2 text-sm font-medium">Ship To</p>
                <div className="text-sm text-muted-foreground">
                  {formatAddress(address).map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>

              {/* Order contents */}
              <div className="rounded-md border p-4">
                <p className="mb-2 text-sm font-medium">
                  Order Contents (
                  {activeOrder.items.reduce((s, i) => s + i.quantity, 0)} items)
                </p>
                <div className="space-y-2">
                  {activeOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.sku || '—'} • Qty: {item.quantity}
                          {item.attributes &&
                            Object.entries(item.attributes).map(
                              ([key, value]) => (
                                <span key={key} className="ml-2">
                                  • {key}: {value}
                                </span>
                              ),
                            )}
                        </p>
                      </div>
                      <p className="text-sm font-medium">
                        {formatCurrency(item.totalInCents)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fulfillment form */}
              <div className="space-y-4 rounded-md border p-4">
                <p className="text-sm font-medium">Shipping Details</p>

                <div className="space-y-2">
                  <Label>Fulfillment Status</Label>
                  <select
                    value={fulfillmentStatus}
                    onChange={(e) =>
                      setFulfillmentStatus(
                        e.target.value as typeof fulfillmentStatus,
                      )
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="UNFULFILLED">Unfulfilled</option>
                    <option value="PARTIALLY_FULFILLED">
                      Partially Fulfilled
                    </option>
                    <option value="FULFILLED">Fulfilled</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Carrier</Label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select carrier</option>
                    {CARRIERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Tracking Number</Label>
                  <Input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g. 1Z999AA10123456784"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Internal Notes (optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes visible to staff only"
                    rows={3}
                  />
                </div>
              </div>

              {activeOrder.shippedAt && (
                <p className="text-xs text-muted-foreground">
                  First shipped:{' '}
                  {new Date(activeOrder.shippedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveOrder(null)}
              disabled={updateFulfillment.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={updateFulfillment.isPending}
            >
              {updateFulfillment.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                'Save & Update'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
