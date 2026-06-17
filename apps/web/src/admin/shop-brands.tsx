import { useState } from 'react';
import { Edit, Loader2, Plus, Power, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  useAdminBrands,
  useCreateAdminBrand,
  useUpdateAdminBrand,
  useDeleteAdminBrand,
  type AdminBrand,
} from '@/hooks/use-admin';

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export default function AdminShopBrandsPage() {
  const { data, isLoading } = useAdminBrands();
  const createBrand = useCreateAdminBrand();
  const updateBrand = useUpdateAdminBrand();
  const deleteBrand = useDeleteAdminBrand();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmBrand, setDeleteConfirmBrand] =
    useState<AdminBrand | null>(null);
  const [editingBrand, setEditingBrand] = useState<AdminBrand | null>(null);

  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');

  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editActive, setEditActive] = useState(true);

  const brands = data?.data?.items ?? [];
  const activeCount = brands.filter((b) => b.isActive).length;

  const openEdit = (brand: AdminBrand) => {
    setEditingBrand(brand);
    setEditName(brand.name);
    setEditSlug(brand.slug);
    setEditLogoUrl(brand.logoUrl ?? '');
    setEditActive(brand.isActive);
    setEditOpen(true);
  };

  const submitCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error('Brand name is required');
      return;
    }

    const slug = newSlug.trim() || toSlug(name);
    try {
      await createBrand.mutateAsync({
        name,
        slug,
        logoUrl: newLogoUrl.trim() || undefined,
        isActive: true,
      });
      setNewName('');
      setNewSlug('');
      setNewLogoUrl('');
      setCreateOpen(false);
      toast.success('Brand created');
    } catch {
      toast.error('Failed to create brand');
    }
  };

  const submitEdit = async () => {
    if (!editingBrand) return;

    const name = editName.trim();
    if (!name) {
      toast.error('Brand name is required');
      return;
    }

    try {
      await updateBrand.mutateAsync({
        brandId: editingBrand.id,
        name,
        slug: editSlug.trim() || toSlug(name),
        logoUrl: editLogoUrl.trim() || undefined,
        isActive: editActive,
      });
      setEditOpen(false);
      setEditingBrand(null);
      toast.success('Brand updated');
    } catch {
      toast.error('Failed to update brand');
    }
  };

  const toggleBrand = async (brand: AdminBrand) => {
    try {
      await updateBrand.mutateAsync({
        brandId: brand.id,
        isActive: !brand.isActive,
      });
      toast.success(`Brand ${!brand.isActive ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to update brand status');
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmBrand) return;

    try {
      await deleteBrand.mutateAsync(deleteConfirmBrand.id);
      setDeleteConfirmBrand(null);
      toast.success('Brand deleted');
    } catch {
      toast.error('Failed to delete brand');
    }
  };

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brands</h1>
          <p className="mt-1 text-muted-foreground">
            Manage product brands displayed across the storefront.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Brand
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{brands.length}</p>
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
            <p className="text-2xl font-bold">{brands.length - activeCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brand List</CardTitle>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Logo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No brands found. Create your first brand.
                    </TableCell>
                  </TableRow>
                )}
                {brands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {brand.slug}
                    </TableCell>
                    <TableCell>
                      {brand.logoUrl ? (
                        <img
                          src={brand.logoUrl}
                          alt={brand.name}
                          className="h-8 w-8 rounded object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={brand.isActive ? 'default' : 'secondary'}>
                        {brand.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => openEdit(brand)}
                          aria-label={`Edit ${brand.name}`}
                          title={`Edit ${brand.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleBrand(brand)}
                          disabled={updateBrand.isPending}
                          aria-label={
                            brand.isActive
                              ? `Deactivate ${brand.name}`
                              : `Activate ${brand.name}`
                          }
                          title={
                            brand.isActive
                              ? `Deactivate ${brand.name}`
                              : `Activate ${brand.name}`
                          }
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmBrand(brand)}
                          aria-label={`Delete ${brand.name}`}
                          title={`Delete ${brand.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Brand</DialogTitle>
            <DialogDescription>
              Add a brand that can be assigned to products in the catalog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Brand name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
            <div className="flex gap-2">
              <Input
                placeholder="Slug (auto-generated if empty)"
                value={newSlug}
                onChange={(event) => setNewSlug(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNewSlug(toSlug(newName))}
              >
                Generate
              </Button>
            </div>
            <Input
              placeholder="Logo URL (optional)"
              value={newLogoUrl}
              onChange={(event) => setNewLogoUrl(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={createBrand.isPending}>
              {createBrand.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
            <DialogDescription>
              Update brand details and visibility.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Brand name"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
            />
            <div className="flex gap-2">
              <Input
                placeholder="Slug"
                value={editSlug}
                onChange={(event) => setEditSlug(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditSlug(toSlug(editName))}
              >
                Generate
              </Button>
            </div>
            <Input
              placeholder="Logo URL (optional)"
              value={editLogoUrl}
              onChange={(event) => setEditLogoUrl(event.target.value)}
            />
            <label className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(event) => setEditActive(event.target.checked)}
              />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={updateBrand.isPending}>
              {updateBrand.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteConfirmBrand !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmBrand(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Brand</DialogTitle>
            <DialogDescription>
              This permanently deletes {deleteConfirmBrand?.name}. Products
              using this brand will have their brand unset.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmBrand(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteBrand.isPending}
            >
              {deleteBrand.isPending && (
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
