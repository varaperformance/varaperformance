import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import {
  useAdminUser,
  useAdminPermissions,
  useAssignPermissionToUser,
  useRemovePermissionFromUser,
  type AdminPermission,
} from '@/hooks/use-admin';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, ShieldPlus, ShieldMinus } from 'lucide-react';

export default function AdminUserPermissionsPage() {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState('');

  const { data: userData, isLoading: userLoading } = useAdminUser(id ?? '');
  const { data: permissionsData, isLoading: permissionsLoading } =
    useAdminPermissions();

  const assignPermission = useAssignPermissionToUser();
  const removePermission = useRemovePermissionFromUser();

  const user = userData?.data;
  const allPermissions: AdminPermission[] = useMemo(
    () => permissionsData?.data ?? [],
    [permissionsData?.data],
  );

  const assignedPermissionIds = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(user.permissions.map((up) => up.permission.id));
  }, [user]);

  const query = search.trim().toLowerCase();

  const assignedPermissions = useMemo(() => {
    if (!user) return [];
    return user.permissions
      .map((up) => up.permission)
      .filter((permission) => {
        if (!query) return true;
        return `${permission.resource}:${permission.action}`
          .toLowerCase()
          .includes(query);
      });
  }, [user, query]);

  const availablePermissions = useMemo(() => {
    return allPermissions.filter((permission) => {
      if (assignedPermissionIds.has(permission.id)) return false;
      if (!query) return true;
      return `${permission.resource}:${permission.action}`
        .toLowerCase()
        .includes(query);
    });
  }, [allPermissions, assignedPermissionIds, query]);

  const isLoading = userLoading || permissionsLoading;

  const userInitials = user?.profile?.displayName
    ? user.profile.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (user?.email.slice(0, 2).toUpperCase() ?? 'U');

  if (!id) {
    return (
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">Missing user id.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manage User Permissions
          </h1>
          <p className="text-muted-foreground mt-1">
            {user
              ? `Direct permissions for ${user.profile?.displayName || user.email}`
              : 'Direct user permission assignment and removal'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Editing User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.profile?.avatarUrl ?? undefined} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium leading-tight">
                  {user?.profile?.displayName || 'Unknown user'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user?.email ?? 'Loading...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="uppercase">
                {user?.authProvider ?? 'UNKNOWN'}
              </Badge>
              <Badge variant={user?.isActive ? 'default' : 'destructive'}>
                {user?.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground font-mono">
            User ID: {id}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search permission (e.g., user:update)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Assigned Direct Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignedPermissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No direct permissions assigned.
                </p>
              ) : (
                <div className="max-h-96 space-y-2 overflow-auto pr-1">
                  {assignedPermissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <Badge variant="secondary" className="font-mono text-xs">
                        {permission.resource}:{permission.action}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={removePermission.isPending}
                        onClick={() =>
                          removePermission.mutate({
                            userId: id,
                            permissionId: permission.id,
                          })
                        }
                      >
                        <ShieldMinus className="mr-1 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              {availablePermissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No matching permissions available.
                </p>
              ) : (
                <div className="max-h-96 space-y-2 overflow-auto pr-1">
                  {availablePermissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <Badge variant="outline" className="font-mono text-xs">
                        {permission.resource}:{permission.action}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={assignPermission.isPending}
                        onClick={() =>
                          assignPermission.mutate({
                            userId: id,
                            permissionId: permission.id,
                          })
                        }
                      >
                        <ShieldPlus className="mr-1 h-4 w-4" />
                        Assign
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />
      <p className="text-xs text-muted-foreground">
        Direct permissions are additive and work alongside role-based
        permissions.
      </p>
    </div>
  );
}
