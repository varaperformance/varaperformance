import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import {
  useAdminUsers,
  useAdminShopReferrals,
  useCreateAdminShopReferralCode,
  useDeleteAdminShopReferralCode,
  type AdminUser,
} from '@/hooks/use-admin';
import { useDebounce } from '@/hooks/use-debounce';

export default function AdminShopReferralsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 300);

  const { data, isLoading } = useAdminShopReferrals();
  const { data: usersData, isLoading: isUsersLoading } = useAdminUsers({
    page: 1,
    limit: 8,
    search: debouncedUserSearch || undefined,
  });
  const createReferral = useCreateAdminShopReferralCode();
  const deleteReferral = useDeleteAdminShopReferralCode();
  const users = usersData?.data?.items ?? [];

  const items = data?.data?.items ?? [];
  const filteredItems = items.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.code.toLowerCase().includes(q) ||
      item.user.email.toLowerCase().includes(q) ||
      (item.user.profile?.displayName || '').toLowerCase().includes(q)
    );
  });

  const activeCount = items.filter((item) => item.isActive).length;
  const conversionCount = items.reduce(
    (sum, item) => sum + item.conversionCount,
    0,
  );
  const orderCount = items.reduce((sum, item) => sum + item._count.orders, 0);

  const create = async () => {
    if (!userId.trim()) {
      toast.error('User ID is required');
      return;
    }

    try {
      await createReferral.mutateAsync({
        userId,
        code: code.trim() || undefined,
      });
      setCode('');
      setUserId('');
      setUserSearch('');
      setSelectedUser(null);
      setCreateOpen(false);
      toast.success('Referral code created');
    } catch {
      toast.error('Failed to create referral code');
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteReferral.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
      toast.success('Referral code deleted');
    } catch {
      toast.error('Failed to delete referral code');
    }
  };

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Referrals</h1>
          <p className="mt-1 text-muted-foreground">
            Manage creator and affiliate referral codes with conversion
            visibility.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Referral
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
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{conversionCount}</p>
            <p className="text-xs text-muted-foreground">
              {orderCount} tracked referral orders
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Referral Code</DialogTitle>
            <DialogDescription>
              Assign a referral to a user. Leave code blank for auto-generated.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              placeholder="Search by display name or email"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
            />
            {selectedUser ? (
              <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
                <div className="font-medium">
                  {selectedUser.profile?.displayName || 'No display name'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedUser.email}
                </div>
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(null);
                      setUserId('');
                    }}
                  >
                    Clear selection
                  </Button>
                </div>
              </div>
            ) : (
              <div className="max-h-48 overflow-auto rounded-md border">
                {isUsersLoading ? (
                  <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching users...
                  </div>
                ) : users.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground">
                    No matching users found.
                  </div>
                ) : (
                  users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="w-full border-b px-3 py-2 text-left transition-colors hover:bg-accent"
                      onClick={() => {
                        setSelectedUser(user);
                        setUserId(user.id);
                        setUserSearch(user.profile?.displayName || user.email);
                      }}
                    >
                      <div className="text-sm font-medium">
                        {user.profile?.displayName || 'No display name'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
            <Input
              placeholder="Code (optional)"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={create} disabled={createReferral.isPending}>
              {createReferral.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Referral Codes</CardTitle>
            <Input
              className="md:w-80"
              placeholder="Search code, email, or display name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
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
                  <TableHead>User</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No referral codes found for your current filter.
                    </TableCell>
                  </TableRow>
                )}
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.code}</TableCell>
                    <TableCell>
                      <div>
                        {item.user.profile?.displayName || 'No display name'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.user.email}
                      </div>
                    </TableCell>
                    <TableCell>{item.clickCount}</TableCell>
                    <TableCell>{item.conversionCount}</TableCell>
                    <TableCell>{item._count.orders}</TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? 'default' : 'secondary'}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmId(item.id)}
                        aria-label={`Delete referral ${item.code}`}
                        title={`Delete referral ${item.code}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Referral Code</DialogTitle>
            <DialogDescription>
              This permanently deletes this referral code.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteReferral.isPending}
            >
              {deleteReferral.isPending && (
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
