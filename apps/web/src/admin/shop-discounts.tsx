import { useState } from 'react';
import { Edit, Loader2, Plus, Trash2 } from 'lucide-react';
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
  useAdminShopDiscountCodes,
  useCreateAdminShopDiscountCode,
  useDeleteAdminShopDiscountCode,
  useUpdateAdminShopDiscountCode,
} from '@/hooks/use-admin';

export default function AdminShopDiscountsPage() {
  const { data, isLoading } = useAdminShopDiscountCodes();
  const createDiscount = useCreateAdminShopDiscountCode();
  const updateDiscount = useUpdateAdminShopDiscountCode();
  const deleteDiscount = useDeleteAdminShopDiscountCode();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    description: '',
    type: 'PERCENT' as 'PERCENT' | 'FIXED',
    amount: '10',
    minSubtotalInCents: '',
    usageLimit: '',
    startsAt: '',
    endsAt: '',
    isActive: true,
  });
  const [editForm, setEditForm] = useState({
    description: '',
    type: 'PERCENT' as 'PERCENT' | 'FIXED',
    amount: '10',
    minSubtotalInCents: '',
    usageLimit: '',
    startsAt: '',
    endsAt: '',
    isActive: true,
  });

  const items = data?.data?.items ?? [];
  const activeCount = items.filter((item) => item.isActive).length;
  const scheduledCount = items.filter(
    (item) => Boolean(item.startsAt) || Boolean(item.endsAt),
  ).length;

  const create = async () => {
    if (!form.code.trim()) {
      toast.error('Discount code is required');
      return;
    }

    try {
      await createDiscount.mutateAsync({
        code: form.code,
        description: form.description || undefined,
        type: form.type,
        percentOff: form.type === 'PERCENT' ? Number(form.amount) : undefined,
        amountOffInCents:
          form.type === 'FIXED' ? Number(form.amount) : undefined,
        minSubtotalInCents: form.minSubtotalInCents
          ? Number(form.minSubtotalInCents)
          : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        startsAt: form.startsAt
          ? new Date(form.startsAt).toISOString()
          : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        isActive: form.isActive,
      });
      setForm((prev) => ({
        ...prev,
        code: '',
        description: '',
        startsAt: '',
        endsAt: '',
        minSubtotalInCents: '',
        usageLimit: '',
      }));
      setCreateOpen(false);
      toast.success('Discount code created');
    } catch {
      toast.error('Failed to create discount code');
    }
  };

  const toDatetimeLocal = (value: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offsetDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000,
    );
    return offsetDate.toISOString().slice(0, 16);
  };

  const openEdit = (item: (typeof items)[number]) => {
    setEditingId(item.id);
    setEditForm({
      description: item.description || '',
      type: item.type,
      amount: String(
        item.type === 'PERCENT'
          ? (item.percentOff ?? 0)
          : (item.amountOffInCents ?? 0),
      ),
      minSubtotalInCents: item.minSubtotalInCents
        ? String(item.minSubtotalInCents)
        : '',
      usageLimit: item.usageLimit ? String(item.usageLimit) : '',
      startsAt: toDatetimeLocal(item.startsAt),
      endsAt: toDatetimeLocal(item.endsAt),
      isActive: item.isActive,
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      await updateDiscount.mutateAsync({
        discountCodeId: editingId,
        description: editForm.description || undefined,
        type: editForm.type,
        percentOff:
          editForm.type === 'PERCENT' ? Number(editForm.amount) : undefined,
        amountOffInCents:
          editForm.type === 'FIXED' ? Number(editForm.amount) : undefined,
        minSubtotalInCents: editForm.minSubtotalInCents
          ? Number(editForm.minSubtotalInCents)
          : undefined,
        usageLimit: editForm.usageLimit
          ? Number(editForm.usageLimit)
          : undefined,
        startsAt: editForm.startsAt
          ? new Date(editForm.startsAt).toISOString()
          : undefined,
        endsAt: editForm.endsAt
          ? new Date(editForm.endsAt).toISOString()
          : undefined,
        isActive: editForm.isActive,
      });

      setEditOpen(false);
      setEditingId(null);
      toast.success('Discount code updated');
    } catch {
      toast.error('Failed to update discount code');
    }
  };

  const getScheduleLabel = (item: (typeof items)[number]) => {
    if (!item.startsAt && !item.endsAt) {
      return 'Always on';
    }
    if (item.startsAt && item.endsAt) {
      return `${new Date(item.startsAt).toLocaleString()} -> ${new Date(item.endsAt).toLocaleString()}`;
    }
    if (item.startsAt) {
      return `Starts ${new Date(item.startsAt).toLocaleString()}`;
    }
    return `Ends ${new Date(item.endsAt as string).toLocaleString()}`;
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteDiscount.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
      toast.success('Discount code deleted');
    } catch {
      toast.error('Failed to delete discount code');
    }
  };

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discount Codes</h1>
          <p className="mt-1 text-muted-foreground">
            Configure promotional pricing controls for the shop.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{items.length}</p>
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
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{scheduledCount}</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Discount</DialogTitle>
            <DialogDescription>
              Create a campaign and optionally schedule start/end windows.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Code"
              value={form.code}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  code: event.target.value.toUpperCase(),
                }))
              }
            />
            <Input
              placeholder="Description (optional)"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />
            <Select
              value={form.type}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  type: value as 'PERCENT' | 'FIXED',
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENT">Percent</SelectItem>
                <SelectItem value="FIXED">Fixed (cents)</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={
                form.type === 'PERCENT' ? 'Percent off' : 'Amount in cents'
              }
              value={form.amount}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, amount: event.target.value }))
              }
            />
            <Input
              placeholder="Min subtotal in cents (optional)"
              value={form.minSubtotalInCents}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  minSubtotalInCents: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Usage limit (optional)"
              value={form.usageLimit}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, usageLimit: event.target.value }))
              }
            />
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, startsAt: event.target.value }))
              }
            />
            <Input
              type="datetime-local"
              value={form.endsAt}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, endsAt: event.target.value }))
              }
            />
            <label className="inline-flex items-center gap-2 rounded-md border border-input px-3 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isActive: event.target.checked,
                  }))
                }
              />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={create} disabled={createDiscount.isPending}>
              {createDiscount.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Existing Codes</CardTitle>
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
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No discount codes yet. Create one to start campaigns.
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.code}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>
                      {item.type === 'PERCENT'
                        ? `${item.percentOff ?? 0}%`
                        : `${item.amountOffInCents ?? 0} cents`}
                    </TableCell>
                    <TableCell>
                      {item.usedCount}
                      {item.usageLimit ? ` / ${item.usageLimit}` : ''}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? 'default' : 'secondary'}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {getScheduleLabel(item)}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.createdBy?.profile?.displayName ||
                        item.createdBy?.email ||
                        'System'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => openEdit(item)}
                          aria-label={`Edit discount ${item.code}`}
                          title={`Edit discount ${item.code}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(item.id)}
                          aria-label={`Delete discount ${item.code}`}
                          title={`Delete discount ${item.code}`}
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Discount</DialogTitle>
            <DialogDescription>
              Update pricing, usage limits, schedule, and status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Description (optional)"
              value={editForm.description}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />
            <Select
              value={editForm.type}
              onValueChange={(value) =>
                setEditForm((prev) => ({
                  ...prev,
                  type: value as 'PERCENT' | 'FIXED',
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENT">Percent</SelectItem>
                <SelectItem value="FIXED">Fixed (cents)</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={
                editForm.type === 'PERCENT' ? 'Percent off' : 'Amount in cents'
              }
              value={editForm.amount}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, amount: event.target.value }))
              }
            />
            <Input
              placeholder="Min subtotal in cents (optional)"
              value={editForm.minSubtotalInCents}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  minSubtotalInCents: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Usage limit (optional)"
              value={editForm.usageLimit}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  usageLimit: event.target.value,
                }))
              }
            />
            <label className="inline-flex items-center gap-2 rounded-md border border-input px-3 text-sm">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    isActive: event.target.checked,
                  }))
                }
              />
              Active
            </label>
            <Input
              type="datetime-local"
              value={editForm.startsAt}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  startsAt: event.target.value,
                }))
              }
            />
            <Input
              type="datetime-local"
              value={editForm.endsAt}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, endsAt: event.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={updateDiscount.isPending}>
              {updateDiscount.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Discount Code</DialogTitle>
            <DialogDescription>
              This permanently deletes this discount code.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteDiscount.isPending}
            >
              {deleteDiscount.isPending && (
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
