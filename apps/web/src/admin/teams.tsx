import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Users,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Crown,
  Megaphone,
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { format } from 'date-fns';
import {
  useAdminTeamMembers,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
  useAdminUsers,
  type AdminTeamMember,
  type AdminUser,
} from '@/hooks/use-admin';

export default function AdminTeamsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const debouncedUserSearch = useDebounce(userSearch, 300);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    userId: '',
    role: 'CORE' as 'CORE' | 'AMBASSADOR',
    title: '',
    bio: '',
    sortOrder: 0,
    isVisible: true,
  });

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<AdminTeamMember | null>(
    null,
  );
  const [editForm, setEditForm] = useState({
    title: '',
    bio: '',
    sortOrder: 0,
    isVisible: true,
  });

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingMember, setDeletingMember] = useState<AdminTeamMember | null>(
    null,
  );

  const { data, isLoading } = useAdminTeamMembers({ page, limit: 50 });
  const { data: usersData, isLoading: isUsersLoading } = useAdminUsers({
    page: 1,
    limit: 8,
    search: debouncedUserSearch || undefined,
  });
  const createMember = useCreateTeamMember();
  const updateMember = useUpdateTeamMember();
  const deleteMember = useDeleteTeamMember();

  const members = data?.data?.items ?? [];
  const availableUsers = usersData?.data?.items ?? [];
  const teamUserIds = new Set(members.map((m: AdminTeamMember) => m.userId));
  const total = data?.data?.total ?? 0;
  const totalPages = data?.data?.totalPages ?? 1;

  const filtered = debouncedSearch
    ? members.filter(
        (m: AdminTeamMember) =>
          m.user.profile?.displayName
            ?.toLowerCase()
            .includes(debouncedSearch.toLowerCase()) ||
          m.user.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          m.title.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : members;

  const coreCount = members.filter(
    (m: AdminTeamMember) => m.role === 'CORE',
  ).length;
  const ambassadorCount = members.filter(
    (m: AdminTeamMember) => m.role === 'AMBASSADOR',
  ).length;

  const handleCreate = () => {
    createMember.mutate(
      {
        userId: createForm.userId,
        role: createForm.role,
        title: createForm.title,
        bio: createForm.bio || undefined,
        sortOrder: createForm.sortOrder,
        isVisible: createForm.isVisible,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setSelectedUser(null);
          setUserSearch('');
          setCreateForm({
            userId: '',
            role: 'CORE',
            title: '',
            bio: '',
            sortOrder: 0,
            isVisible: true,
          });
        },
      },
    );
  };

  const openEdit = (member: AdminTeamMember) => {
    setEditingMember(member);
    setEditForm({
      title: member.title,
      bio: member.bio || '',
      sortOrder: member.sortOrder,
      isVisible: member.isVisible,
    });
    setEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingMember) return;
    updateMember.mutate(
      {
        id: editingMember.id,
        title: editForm.title,
        bio: editForm.bio || undefined,
        sortOrder: editForm.sortOrder,
        isVisible: editForm.isVisible,
      },
      {
        onSuccess: () => {
          setEditOpen(false);
          setEditingMember(null);
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deletingMember) return;
    deleteMember.mutate(deletingMember.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        setDeletingMember(null);
      },
    });
  };

  const getInitials = (m: AdminTeamMember) => {
    const name = m.user.profile?.displayName || m.user.email;
    return name.slice(0, 2).toUpperCase();
  };

  const getUserInitials = (user: AdminUser) => {
    const name = user.profile?.displayName || user.email;
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground mt-1">
            Manage core team and ambassador listings
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Core Team</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coreCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ambassadors</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ambassadorCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="mb-4 h-12 w-12" />
              <p>No team members found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Visible</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m: AdminTeamMember) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={m.user.profile?.avatarUrl || undefined}
                          />
                          <AvatarFallback className="text-xs">
                            {getInitials(m)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {m.user.profile?.displayName || '—'}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={m.role === 'CORE' ? 'default' : 'secondary'}
                      >
                        {m.role === 'CORE' ? 'Core' : 'Ambassador'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{m.title}</TableCell>
                    <TableCell className="text-sm">{m.sortOrder}</TableCell>
                    <TableCell>
                      {m.isVisible ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(m.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(m)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingMember(m);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setSelectedUser(null);
            setUserSearch('');
            setCreateForm((prev) => ({ ...prev, userId: '' }));
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add a user to the public team page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Input
                placeholder="Search by display name or email"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />

              {selectedUser && (
                <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage
                        src={selectedUser.profile?.avatarUrl ?? undefined}
                      />
                      <AvatarFallback className="text-xs">
                        {getUserInitials(selectedUser)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium leading-none">
                        {selectedUser.profile?.displayName ||
                          selectedUser.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {selectedUser.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(null);
                      setCreateForm((prev) => ({ ...prev, userId: '' }));
                    }}
                  >
                    Change
                  </Button>
                </div>
              )}

              {!selectedUser && (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-1">
                  {isUsersLoading ? (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : availableUsers.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-muted-foreground">
                      No users found
                    </p>
                  ) : (
                    availableUsers.map((user: AdminUser) => {
                      const alreadyOnTeam = teamUserIds.has(user.id);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={alreadyOnTeam}
                          onClick={() => {
                            setSelectedUser(user);
                            setCreateForm((prev) => ({
                              ...prev,
                              userId: user.id,
                            }));
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage
                                src={user.profile?.avatarUrl ?? undefined}
                              />
                              <AvatarFallback className="text-xs">
                                {getUserInitials(user)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium leading-none">
                                {user.profile?.displayName || user.email}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                          {alreadyOnTeam && (
                            <Badge variant="secondary">Already added</Badge>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) =>
                  setCreateForm({
                    ...createForm,
                    role: v as 'CORE' | 'AMBASSADOR',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CORE">Core Team</SelectItem>
                  <SelectItem value="AMBASSADOR">Ambassador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                placeholder="e.g. Founder & CEO"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm({ ...createForm, title: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea
                placeholder="Short bio..."
                value={createForm.bio}
                onChange={(e) =>
                  setCreateForm({ ...createForm, bio: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={createForm.sortOrder}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label htmlFor="create-visible">Visible</Label>
                <Switch
                  id="create-visible"
                  checked={createForm.isVisible}
                  onCheckedChange={(checked) =>
                    setCreateForm({
                      ...createForm,
                      isVisible: checked,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !createForm.userId ||
                !createForm.title ||
                createMember.isPending
              }
            >
              {createMember.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update {editingMember?.user.profile?.displayName || 'member'}{' '}
              details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea
                value={editForm.bio}
                onChange={(e) =>
                  setEditForm({ ...editForm, bio: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={editForm.sortOrder}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label htmlFor="edit-visible">Visible</Label>
                <Switch
                  id="edit-visible"
                  checked={editForm.isVisible}
                  onCheckedChange={(checked) =>
                    setEditForm({
                      ...editForm,
                      isVisible: checked,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!editForm.title || updateMember.isPending}
            >
              {updateMember.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Remove{' '}
              {deletingMember?.user.profile?.displayName || 'this member'} from
              the team page? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMember.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
