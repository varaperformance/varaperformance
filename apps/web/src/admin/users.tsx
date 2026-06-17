import { useState } from 'react';
import { Link } from 'react-router';
import {
  useAdminUsers,
  useAdminRoles,
  useUpdateUserStatus,
  useCreateAdminUser,
  useAssignRole,
  useRemoveRole,
  type AdminUser,
  type AdminRole,
} from '@/hooks/use-admin';
import { useAuth } from '@/features/auth';
import { useDebounce } from '@/hooks/use-debounce';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  MoreHorizontal,
  UserX,
  UserCheck,
  Shield,
  ShieldMinus,
  Mail,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  KeyRound,
  UserPlus,
} from 'lucide-react';
import { format } from 'date-fns';

export default function UserManagementPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [dialogType, setDialogType] = useState<
    'deactivate' | 'activate' | 'create' | null
  >(null);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    displayName: '',
    isActive: true,
    isVerified: true,
  });

  const debouncedSearch = useDebounce(search, 300);

  const { data: usersData, isLoading: usersLoading } = useAdminUsers({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
  });

  const { data: rolesData } = useAdminRoles();
  const { hasPermission } = useAuth();
  const updateStatus = useUpdateUserStatus();
  const createUser = useCreateAdminUser();
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

  const users: AdminUser[] = usersData?.data?.items ?? [];
  const totalPages = usersData?.data?.totalPages ?? 1;
  const roles: AdminRole[] = rolesData?.data ?? [];
  const canManageRbac = hasPermission('admin:write');
  const canCreateUser = hasPermission('admin:create');

  const handleStatusUpdate = async () => {
    if (!selectedUser) return;

    await updateStatus.mutateAsync({
      userId: selectedUser.id,
      isActive: dialogType === 'activate',
    });

    setDialogType(null);
    setSelectedUser(null);
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    await assignRole.mutateAsync({ userId, roleId });
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    await removeRole.mutateAsync({ userId, roleId });
  };

  const resetCreateForm = () => {
    setCreateForm({
      email: '',
      password: '',
      displayName: '',
      isActive: true,
      isVerified: true,
    });
  };

  const handleCreateUser = async () => {
    await createUser.mutateAsync({
      email: createForm.email.trim(),
      password: createForm.password,
      displayName: createForm.displayName.trim() || undefined,
      isActive: createForm.isActive,
      isVerified: createForm.isVerified,
    });

    resetCreateForm();
    setDialogType(null);
  };

  const getUserInitials = (user: AdminUser) => {
    if (user.profile?.displayName) {
      return user.profile.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            View and manage user accounts
          </p>
        </div>
        {canCreateUser && (
          <Button onClick={() => setDialogType('create')}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">No users found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage
                              src={user.profile?.avatarUrl ?? undefined}
                            />
                            <AvatarFallback>
                              {getUserInitials(user)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {user.profile?.displayName || 'No name'}
                            </p>
                            <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p
                          className="truncate font-mono text-xs text-muted-foreground max-w-[120px]"
                          title={user.id}
                        >
                          {user.id.slice(0, 8)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={user.isActive ? 'default' : 'destructive'}
                            className="w-fit"
                          >
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {user.isVerified && (
                            <Badge
                              variant="secondary"
                              className="w-fit text-xs"
                            >
                              Verified
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? (
                            user.roles.map(({ role }) => (
                              <Badge key={role.id} variant="outline">
                                {role.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              No roles
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.authProvider}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(user.lastLoginAt), 'MMM d, yyyy')}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Never
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(user.createdAt), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            {canManageRbac && (
                              <>
                                {/* Role Management */}
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Assign Role
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    {roles
                                      .filter(
                                        (role) =>
                                          !user.roles.some(
                                            (ur) => ur.role.id === role.id,
                                          ),
                                      )
                                      .map((role) => (
                                        <DropdownMenuItem
                                          key={role.id}
                                          onClick={() =>
                                            handleAssignRole(user.id, role.id)
                                          }
                                        >
                                          {role.name}
                                        </DropdownMenuItem>
                                      ))}
                                    {roles.filter(
                                      (role) =>
                                        !user.roles.some(
                                          (ur) => ur.role.id === role.id,
                                        ),
                                    ).length === 0 && (
                                      <DropdownMenuItem disabled>
                                        All roles assigned
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>

                                {user.roles.length > 0 && (
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                      <ShieldMinus className="h-4 w-4 mr-2" />
                                      Remove Role
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                      {user.roles.map(({ role }) => (
                                        <DropdownMenuItem
                                          key={role.id}
                                          onClick={() =>
                                            handleRemoveRole(user.id, role.id)
                                          }
                                        >
                                          {role.name}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub>
                                )}

                                <DropdownMenuItem asChild>
                                  <Link
                                    to={`/admin/users/${user.id}/permissions`}
                                    className="flex w-full items-center gap-2 cursor-pointer"
                                  >
                                    <KeyRound className="h-4 w-4" />
                                    Manage Permissions
                                  </Link>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                              </>
                            )}

                            {/* Status Toggle */}
                            {user.isActive ? (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setDialogType('deactivate');
                                }}
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Deactivate User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setDialogType('activate');
                                }}
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activate User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* User Action Dialog */}
      <Dialog
        open={dialogType !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogType(null);
            resetCreateForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'create'
                ? 'Create User'
                : dialogType === 'deactivate'
                  ? 'Deactivate User'
                  : 'Activate User'}
            </DialogTitle>
            <DialogDescription>
              {dialogType === 'create'
                ? 'Create a new user account manually from the admin panel.'
                : dialogType === 'deactivate'
                  ? "This will disable the user's access to the platform. They won't be able to log in until reactivated."
                  : "This will restore the user's access to the platform."}
            </DialogDescription>
          </DialogHeader>
          {dialogType === 'create' ? (
            <div className="space-y-4">
              <Input
                placeholder="Email"
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
              <Input
                placeholder="Temporary password"
                type="password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
              />
              <Input
                placeholder="Display name (optional)"
                value={createForm.displayName}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    displayName: e.target.value,
                  }))
                }
              />
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">
                    Allow login immediately
                  </p>
                </div>
                <Checkbox
                  checked={createForm.isActive}
                  onCheckedChange={(checked) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      isActive: checked === true,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Verified</p>
                  <p className="text-xs text-muted-foreground">
                    Skip email verification requirement
                  </p>
                </div>
                <Checkbox
                  checked={createForm.isVerified}
                  onCheckedChange={(checked) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      isVerified: checked === true,
                    }))
                  }
                />
              </div>
            </div>
          ) : (
            selectedUser && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={selectedUser.profile?.avatarUrl ?? undefined}
                  />
                  <AvatarFallback>
                    {getUserInitials(selectedUser)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {selectedUser.profile?.displayName || 'No name'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.email}
                  </p>
                </div>
              </div>
            )
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button
              variant={dialogType === 'deactivate' ? 'destructive' : 'default'}
              onClick={
                dialogType === 'create' ? handleCreateUser : handleStatusUpdate
              }
              disabled={
                dialogType === 'create'
                  ? createUser.isPending ||
                    !createForm.email.trim() ||
                    createForm.password.length < 8
                  : updateStatus.isPending
              }
            >
              {(dialogType === 'create'
                ? createUser.isPending
                : updateStatus.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {dialogType === 'create'
                ? 'Create User'
                : dialogType === 'deactivate'
                  ? 'Deactivate'
                  : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
