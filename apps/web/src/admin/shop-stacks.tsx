import { useRef, useState } from 'react';
import {
  Edit,
  Loader2,
  Package,
  Plus,
  Power,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAdminBundles,
  useAdminShopCatalog,
  useCreateAdminBundle,
  useUpdateAdminBundle,
  useDeleteAdminBundle,
  useUploadAdminShopProductImage,
  type AdminBundle,
} from '@/hooks/use-admin';

const formatCurrency = (valueInCents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(valueInCents / 100);

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

type BundleItemForm = {
  productId: string;
  variantId: string;
  quantity: string;
};

export default function AdminShopStacksPage() {
  const { data, isLoading } = useAdminBundles();
  const { data: catalogData } = useAdminShopCatalog();
  const createBundle = useCreateAdminBundle();
  const updateBundle = useUpdateAdminBundle();
  const deleteBundle = useDeleteAdminBundle();
  const uploadImage = useUploadAdminShopProductImage();

  const createFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<AdminBundle | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriceInCents, setNewPriceInCents] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newItems, setNewItems] = useState<BundleItemForm[]>([
    { productId: '', variantId: '', quantity: '1' },
  ]);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriceInCents, setEditPriceInCents] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editItems, setEditItems] = useState<BundleItemForm[]>([]);

  const bundles = data?.data?.items ?? [];
  const products = catalogData?.data?.items ?? [];
  const activeCount = bundles.filter((b) => b.isActive).length;

  const resetCreateForm = () => {
    setNewName('');
    setNewDescription('');
    setNewPriceInCents('');
    setNewImageUrl('');
    setNewItems([{ productId: '', variantId: '', quantity: '1' }]);
  };

  const openEdit = (bundle: AdminBundle) => {
    setEditingBundle(bundle);
    setEditName(bundle.name);
    setEditDescription(bundle.description ?? '');
    setEditPriceInCents(String(bundle.priceInCents));
    setEditImageUrl(bundle.imageUrl ?? '');
    setEditActive(bundle.isActive);
    setEditItems(
      bundle.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? '',
        quantity: String(item.quantity),
      })),
    );
    setEditOpen(true);
  };

  const itemTotalInCents = (items: BundleItemForm[]) => {
    let total = 0;
    for (const item of items) {
      if (!item.productId) continue;
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      const variant = (
        product as unknown as {
          variants?: Array<{ id: string; priceInCents: number }>;
        }
      ).variants?.find((v) => v.id === item.variantId);
      if (variant) {
        total += variant.priceInCents * (Number(item.quantity) || 1);
      }
    }
    return total;
  };

  const submitCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error('Bundle name is required');
      return;
    }
    const price = Number(newPriceInCents);
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Enter a valid price in cents');
      return;
    }
    const validItems = newItems.filter((item) => item.productId);
    if (validItems.length === 0) {
      toast.error('Add at least one product to the bundle');
      return;
    }

    try {
      await createBundle.mutateAsync({
        name,
        slug: toSlug(name),
        description: newDescription.trim() || undefined,
        priceInCents: price,
        imageUrl: newImageUrl.trim() || undefined,
        items: validItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || undefined,
          quantity: Number(item.quantity) || 1,
        })),
      });
      resetCreateForm();
      setCreateOpen(false);
      toast.success('Stack created');
    } catch {
      toast.error('Failed to create stack');
    }
  };

  const submitEdit = async () => {
    if (!editingBundle) return;
    const name = editName.trim();
    if (!name) {
      toast.error('Bundle name is required');
      return;
    }
    const price = Number(editPriceInCents);
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Enter a valid price in cents');
      return;
    }
    const validItems = editItems.filter((item) => item.productId);
    if (validItems.length === 0) {
      toast.error('Add at least one product to the bundle');
      return;
    }

    try {
      await updateBundle.mutateAsync({
        bundleId: editingBundle.id,
        name,
        slug: toSlug(name),
        description: editDescription.trim() || undefined,
        priceInCents: price,
        imageUrl: editImageUrl.trim() || null,
        isActive: editActive,
        items: validItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || undefined,
          quantity: Number(item.quantity) || 1,
        })),
      });
      setEditOpen(false);
      setEditingBundle(null);
      toast.success('Stack updated');
    } catch {
      toast.error('Failed to update stack');
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteBundle.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
      toast.success('Stack deleted');
    } catch {
      toast.error('Failed to delete stack');
    }
  };

  const toggleActive = async (bundle: AdminBundle) => {
    try {
      await updateBundle.mutateAsync({
        bundleId: bundle.id,
        isActive: !bundle.isActive,
      });
      toast.success(`Stack ${!bundle.isActive ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to update stack status');
    }
  };

  const renderItemsEditor = (
    items: BundleItemForm[],
    setItems: React.Dispatch<React.SetStateAction<BundleItemForm[]>>,
  ) => (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Products in Stack</p>
          <p className="text-xs text-muted-foreground">
            Select products and quantities for this bundle.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setItems((prev) => [
              ...prev,
              { productId: '', variantId: '', quantity: '1' },
            ])
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => {
          const selectedProduct = products.find((p) => p.id === item.productId);
          const variants =
            (
              selectedProduct as unknown as {
                variants?: Array<{
                  id: string;
                  title: string;
                  priceInCents: number;
                }>;
              }
            )?.variants ?? [];
          return (
            <div
              key={index}
              className="grid gap-2 rounded-md border p-3 md:grid-cols-12"
            >
              <div className="md:col-span-5">
                <Select
                  value={item.productId}
                  onValueChange={(value) =>
                    setItems((prev) =>
                      prev.map((it, i) =>
                        i === index
                          ? { ...it, productId: value, variantId: '' }
                          : it,
                      ),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-4">
                <Select
                  value={item.variantId}
                  onValueChange={(value) =>
                    setItems((prev) =>
                      prev.map((it, i) =>
                        i === index ? { ...it, variantId: value } : it,
                      ),
                    )
                  }
                  disabled={variants.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        variants.length === 0
                          ? 'Select product first'
                          : 'Select variant'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.title} · {formatCurrency(variant.priceInCents)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Input
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(event) =>
                    setItems((prev) =>
                      prev.map((it, i) =>
                        i === index
                          ? { ...it, quantity: event.target.value }
                          : it,
                      ),
                    )
                  }
                />
              </div>
              <div className="flex items-center justify-center md:col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setItems((prev) => prev.filter((_, i) => i !== index))
                  }
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {items.some((it) => it.productId) && (
        <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            Individual total (full price)
          </span>
          <span className="font-semibold">
            {formatCurrency(itemTotalInCents(items))}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Stacks & Bundles
          </h1>
          <p className="mt-1 text-muted-foreground">
            Create product bundles with custom pricing for the storefront.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Stack
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Stacks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{bundles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{bundles.length - activeCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stack List</CardTitle>
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
                  <TableHead>Stack</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Bundle Price</TableHead>
                  <TableHead>Savings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bundles.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No stacks created yet.
                    </TableCell>
                  </TableRow>
                )}
                {bundles.map((bundle) => {
                  const fullPrice = bundle.items.reduce((sum, item) => {
                    const variant = item.product.variants.find(
                      (v) => v.id === item.variantId,
                    );
                    return sum + (variant?.priceInCents ?? 0) * item.quantity;
                  }, 0);
                  const savings = fullPrice - bundle.priceInCents;
                  return (
                    <TableRow key={bundle.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {bundle.imageUrl ? (
                            <img
                              src={bundle.imageUrl}
                              alt={bundle.name}
                              className="h-10 w-10 rounded-md object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{bundle.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {bundle.slug}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {bundle.items.map((item) => (
                            <p
                              key={item.id}
                              className="text-xs text-muted-foreground"
                            >
                              {item.quantity}× {item.product.name}
                            </p>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(bundle.priceInCents)}
                      </TableCell>
                      <TableCell>
                        {savings > 0 ? (
                          <span className="text-sm font-medium text-green-600">
                            Save {formatCurrency(savings)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={bundle.isActive ? 'default' : 'secondary'}
                        >
                          {bundle.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => openEdit(bundle)}
                            aria-label={`Edit ${bundle.name}`}
                            title={`Edit ${bundle.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => toggleActive(bundle)}
                            disabled={updateBundle.isPending}
                            aria-label={
                              bundle.isActive
                                ? `Deactivate ${bundle.name}`
                                : `Activate ${bundle.name}`
                            }
                            title={
                              bundle.isActive
                                ? `Deactivate ${bundle.name}`
                                : `Activate ${bundle.name}`
                            }
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(bundle.id)}
                            aria-label={`Delete ${bundle.name}`}
                            title={`Delete ${bundle.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Stack</DialogTitle>
            <DialogDescription>
              Bundle products together with a custom price. The savings are
              calculated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bundle-name">Stack Name</Label>
                <Input
                  id="bundle-name"
                  placeholder="e.g. Energy Stack"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bundle-price">Bundle Price (cents)</Label>
                <Input
                  id="bundle-price"
                  placeholder="e.g. 7999"
                  value={newPriceInCents}
                  onChange={(event) => setNewPriceInCents(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bundle-description">Description</Label>
              <Textarea
                id="bundle-description"
                placeholder="Describe what's included and the value"
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Stack Image (optional)</Label>
              {newImageUrl ? (
                <div className="relative w-fit">
                  <img
                    src={newImageUrl}
                    alt="Stack preview"
                    className="h-32 w-48 rounded-md border object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <button
                    type="button"
                    className="absolute -right-2 -top-2 rounded-full border bg-background p-1 hover:bg-muted"
                    onClick={() => setNewImageUrl('')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => createFileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload Image
                  </Button>
                  <input
                    ref={createFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      try {
                        const res = await uploadImage.mutateAsync(file);
                        if (res.data?.url) setNewImageUrl(res.data.url);
                      } catch {
                        toast.error('Failed to upload image');
                      } finally {
                        setUploading(false);
                        if (createFileInputRef.current)
                          createFileInputRef.current.value = '';
                      }
                    }}
                  />
                </div>
              )}
            </div>
            {renderItemsEditor(newItems, setNewItems)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={createBundle.isPending}>
              {createBundle.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Stack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Stack</DialogTitle>
            <DialogDescription>
              Update the bundle products, pricing, and status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-bundle-name">Stack Name</Label>
                <Input
                  id="edit-bundle-name"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bundle-price">Bundle Price (cents)</Label>
                <Input
                  id="edit-bundle-price"
                  value={editPriceInCents}
                  onChange={(event) => setEditPriceInCents(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bundle-description">Description</Label>
              <Textarea
                id="edit-bundle-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Stack Image</Label>
              {editImageUrl ? (
                <div className="relative w-fit">
                  <img
                    src={editImageUrl}
                    alt="Stack preview"
                    className="h-32 w-48 rounded-md border object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <button
                    type="button"
                    className="absolute -right-2 -top-2 rounded-full border bg-background p-1 hover:bg-muted"
                    onClick={() => setEditImageUrl('')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload Image
                  </Button>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      try {
                        const res = await uploadImage.mutateAsync(file);
                        if (res.data?.url) setEditImageUrl(res.data.url);
                      } catch {
                        toast.error('Failed to upload image');
                      } finally {
                        setUploading(false);
                        if (editFileInputRef.current)
                          editFileInputRef.current.value = '';
                      }
                    }}
                  />
                </div>
              )}
            </div>
            <label className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(event) => setEditActive(event.target.checked)}
              />
              Active
            </label>
            {renderItemsEditor(editItems, setEditItems)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={updateBundle.isPending}>
              {updateBundle.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Stack</DialogTitle>
            <DialogDescription>
              This will permanently remove this stack. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteBundle.isPending}
            >
              {deleteBundle.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
