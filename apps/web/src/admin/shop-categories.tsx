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
  useAdminShopCategories,
  useCreateAdminShopCategory,
  useDeleteAdminShopCategory,
  useUpdateAdminShopCategory,
  type AdminShopCategory,
} from '@/hooks/use-admin';

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export default function AdminShopCategoriesPage() {
  const { data, isLoading } = useAdminShopCategories();
  const createCategory = useCreateAdminShopCategory();
  const updateCategory = useUpdateAdminShopCategory();
  const deleteCategory = useDeleteAdminShopCategory();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmCategory, setDeleteConfirmCategory] =
    useState<AdminShopCategory | null>(null);
  const [editingCategory, setEditingCategory] =
    useState<AdminShopCategory | null>(null);

  const [newName, setNewName] = useState('');
  const [newSortOrder, setNewSortOrder] = useState('0');
  const [newParentId, setNewParentId] = useState('');

  const [editName, setEditName] = useState('');
  const [editSortOrder, setEditSortOrder] = useState('0');
  const [editActive, setEditActive] = useState(true);
  const [editParentId, setEditParentId] = useState('');

  const categories = data?.data?.items ?? [];
  const activeCount = categories.filter((item) => item.isActive).length;
  const topLevelCategories = categories.filter((c) => !c.parentId);

  // Build a tree-ordered flat list: parent → its children → next parent → …
  const orderedCategories = topLevelCategories.flatMap((parent) => {
    const children = categories
      .filter((c) => c.parentId === parent.id)
      .sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      );
    return [parent, ...children];
  });

  const openEdit = (category: AdminShopCategory) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditSortOrder(String(category.sortOrder));
    setEditActive(category.isActive);
    setEditParentId(category.parentId ?? '');
    setEditOpen(true);
  };

  const submitCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error('Category name is required');
      return;
    }

    const parsedSort = Number(newSortOrder || '0');
    if (!Number.isFinite(parsedSort)) {
      toast.error('Sort order must be a number');
      return;
    }

    try {
      await createCategory.mutateAsync({
        name,
        slug: toSlug(name),
        sortOrder: parsedSort,
        parentId: newParentId || undefined,
        isActive: true,
      });
      setNewName('');
      setNewSortOrder('0');
      setNewParentId('');
      setCreateOpen(false);
      toast.success('Shop category created');
    } catch {
      toast.error('Failed to create category');
    }
  };

  const submitEdit = async () => {
    if (!editingCategory) return;

    const name = editName.trim();
    if (!name) {
      toast.error('Category name is required');
      return;
    }

    const parsedSort = Number(editSortOrder || '0');
    if (!Number.isFinite(parsedSort)) {
      toast.error('Sort order must be a number');
      return;
    }

    try {
      await updateCategory.mutateAsync({
        categoryId: editingCategory.id,
        name,
        slug: toSlug(name),
        sortOrder: parsedSort,
        parentId: editParentId || null,
        isActive: editActive,
      });
      setEditOpen(false);
      setEditingCategory(null);
      toast.success('Shop category updated');
    } catch {
      toast.error('Failed to update category');
    }
  };

  const toggleCategory = async (category: AdminShopCategory) => {
    try {
      await updateCategory.mutateAsync({
        categoryId: category.id,
        isActive: !category.isActive,
      });
      toast.success(
        `Category ${!category.isActive ? 'activated' : 'deactivated'}`,
      );
    } catch {
      toast.error('Failed to update category status');
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmCategory) return;

    try {
      await deleteCategory.mutateAsync(deleteConfirmCategory.id);
      setDeleteConfirmCategory(null);
      toast.success('Category deleted');
    } catch {
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shop Categories</h1>
          <p className="mt-1 text-muted-foreground">
            Manage catalog categories used by product assignment and storefront
            navigation.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Category
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{categories.length}</p>
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
            <p className="text-2xl font-bold">
              {categories.length - activeCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category List</CardTitle>
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
                  <TableHead>Parent</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Sort</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedCategories.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No categories found.
                    </TableCell>
                  </TableRow>
                )}
                {orderedCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.parentId && (
                        <span className="mr-1 text-muted-foreground">└</span>
                      )}
                      {category.name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {categories.find((c) => c.id === category.parentId)
                        ?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {category.slug}
                    </TableCell>
                    <TableCell>{category.sortOrder}</TableCell>
                    <TableCell>
                      <Badge
                        variant={category.isActive ? 'default' : 'secondary'}
                      >
                        {category.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => openEdit(category)}
                          aria-label={`Edit ${category.name}`}
                          title={`Edit ${category.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleCategory(category)}
                          disabled={updateCategory.isPending}
                          aria-label={
                            category.isActive
                              ? `Deactivate ${category.name}`
                              : `Activate ${category.name}`
                          }
                          title={
                            category.isActive
                              ? `Deactivate ${category.name}`
                              : `Activate ${category.name}`
                          }
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmCategory(category)}
                          aria-label={`Delete ${category.name}`}
                          title={`Delete ${category.name}`}
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
            <DialogTitle>Create Shop Category</DialogTitle>
            <DialogDescription>
              Add a category that can be assigned to products and shown in shop.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
            <Select
              value={newParentId || 'none'}
              onValueChange={(v) => setNewParentId(v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Parent category (none)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (top-level)</SelectItem>
                {topLevelCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Sort order"
              value={newSortOrder}
              onChange={(event) => setNewSortOrder(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={createCategory.isPending}>
              {createCategory.isPending && (
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
            <DialogTitle>Edit Shop Category</DialogTitle>
            <DialogDescription>
              Update category metadata and visibility for storefront use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Name"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
            />
            <Select
              value={editParentId || 'none'}
              onValueChange={(v) => setEditParentId(v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Parent category (none)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (top-level)</SelectItem>
                {topLevelCategories
                  .filter((c) => c.id !== editingCategory?.id)
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Sort order"
              value={editSortOrder}
              onChange={(event) => setEditSortOrder(event.target.value)}
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
            <Button onClick={submitEdit} disabled={updateCategory.isPending}>
              {updateCategory.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteConfirmCategory !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmCategory(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              This permanently deletes {deleteConfirmCategory?.name}. Categories
              with assigned products cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmCategory(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteCategory.isPending}
            >
              {deleteCategory.isPending && (
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
