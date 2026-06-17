import { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMyShopOrders } from '@/features/commerce';

const formatCurrency = (valueInCents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(valueInCents / 100);

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  PAID: 'default',
  PENDING: 'secondary',
  CANCELLED: 'destructive',
  REFUNDED: 'secondary',
};

export default function ShopOrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyShopOrders({ page, limit: 20 });

  const items = data?.data?.items ?? [];
  const totalPages = data?.data?.totalPages ?? 1;

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shop Orders</h1>
        <p className="mt-1 text-muted-foreground">
          Track your purchases and order status updates.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              No shop orders yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fulfillment</TableHead>
                  <TableHead>Tracking</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium">{order.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {order.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {order.items.reduce(
                        (total, item) => total + item.quantity,
                        0,
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(order.totalInCents)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={statusVariant[order.status] ?? 'secondary'}
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {order.fulfillmentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.trackingNumber ? (
                        <div className="flex items-start gap-1.5">
                          <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="text-xs">
                            <div className="font-medium">
                              {order.carrier ?? ''}
                            </div>
                            <div className="text-muted-foreground">
                              {order.trackingNumber}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
    </div>
  );
}
