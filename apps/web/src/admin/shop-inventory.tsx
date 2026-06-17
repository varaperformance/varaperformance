import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  useAdminShopInventory,
  useAdjustAdminShopInventory,
} from '@/hooks/use-admin';

export default function AdminShopInventoryPage() {
  const [search, setSearch] = useState('');
  const [deltaById, setDeltaById] = useState<Record<string, string>>({});

  const { data, isLoading } = useAdminShopInventory({
    search: search.trim() || undefined,
  });
  const adjustInventory = useAdjustAdminShopInventory();

  const items = data?.data?.items ?? [];

  const getAvailable = (item: (typeof items)[number]) =>
    item.inventoryRecord?.quantityOnHand ?? item.availableQuantity;
  const getReserved = (item: (typeof items)[number]) =>
    item.inventoryRecord?.quantityReserved ?? item.reservedQuantity;
  const getTotal = (item: (typeof items)[number]) =>
    getAvailable(item) + getReserved(item);

  const lowStockCount = items.filter(
    (item) => getAvailable(item) > 0 && getAvailable(item) <= 5,
  ).length;
  const outOfStockCount = items.filter(
    (item) => getAvailable(item) <= 0,
  ).length;
  const totalReserved = items.reduce((sum, item) => sum + getReserved(item), 0);

  const applyAdjustment = async (variantId: string) => {
    const delta = Number(deltaById[variantId] ?? '0');
    if (!Number.isInteger(delta) || delta === 0) {
      toast.error('Enter a non-zero integer adjustment');
      return;
    }

    try {
      await adjustInventory.mutateAsync({
        variantId,
        delta,
        reason: delta > 0 ? 'RESTOCK' : 'MANUAL',
      });
      setDeltaById((prev) => ({ ...prev, [variantId]: '' }));
      toast.success('Inventory updated');
    } catch {
      toast.error('Failed to update inventory');
    }
  };

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shop Inventory</h1>
          <p className="mt-1 text-muted-foreground">
            Track stock health, watch reserved units, and apply controlled
            adjustments.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            document
              .getElementById('inventory-adjustments')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Adjust Stock
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{outOfStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Reserved Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalReserved}</p>
          </CardContent>
        </Card>
      </div>

      <Card id="inventory-adjustments">
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-2 md:items-center">
            <Input
              placeholder="Search SKU, variant title, or product"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Tip: use positive values to restock and negative values to correct
              oversold inventory.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Variants</CardTitle>
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
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Adjust</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No inventory variants found for this query.
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.product.category}
                      </div>
                    </TableCell>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          getAvailable(item) > 0 ? 'default' : 'destructive'
                        }
                      >
                        {getAvailable(item)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getTotal(item)}</TableCell>
                    <TableCell>{getReserved(item)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          className="w-24"
                          placeholder="+/-"
                          value={deltaById[item.id] ?? ''}
                          onChange={(event) =>
                            setDeltaById((prev) => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => applyAdjustment(item.id)}
                          disabled={adjustInventory.isPending}
                        >
                          Apply
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
    </div>
  );
}
