import { useState } from 'react';
import {
  useAdminRoles,
  useAdminPermissions,
  useAssignPermissionToRole,
  useRemovePermissionFromRole,
  type AdminRole,
  type AdminPermission,
} from '@/hooks/use-admin';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { Shield, Users, Key, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RoleManagementPage() {
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);

  const { data: rolesData, isLoading: rolesLoading } = useAdminRoles();
  const { data: permissionsData, isLoading: permissionsLoading } =
    useAdminPermissions();

  const assignPermission = useAssignPermissionToRole();
  const removePermission = useRemovePermissionFromRole();

  const roles = rolesData?.data ?? [];
  const permissions = permissionsData?.data ?? [];

  // Group permissions by resource
  const groupedPermissions = permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    },
    {} as Record<string, AdminPermission[]>,
  );

  const hasPermission = (permissionId: string) => {
    if (!selectedRole) return false;
    return selectedRole.permissions.some(
      (p) => p.permission.id === permissionId,
    );
  };

  const handleTogglePermission = async (permissionId: string) => {
    if (!selectedRole) return;

    if (hasPermission(permissionId)) {
      await removePermission.mutateAsync({
        roleId: selectedRole.id,
        permissionId,
      });
    } else {
      await assignPermission.mutateAsync({
        roleId: selectedRole.id,
        permissionId,
      });
    }
  };

  const isLoading = rolesLoading || permissionsLoading;
  const isMutating = assignPermission.isPending || removePermission.isPending;

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure role-based access control
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Roles List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Roles
                </CardTitle>
                <CardDescription>
                  Select a role to manage its permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="p-4 space-y-2">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role)}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border transition-colors',
                          selectedRole?.id === role.id
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent hover:bg-muted',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{role.name}</p>
                            {role.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {role.description}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {role._count.users} users
                          </span>
                          <span className="flex items-center gap-1">
                            <Key className="h-3 w-3" />
                            {role._count.permissions} permissions
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Permissions Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Permissions
                  {selectedRole && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedRole.name}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedRole
                    ? `Manage permissions for the ${selectedRole.name} role`
                    : 'Select a role to view and manage its permissions'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedRole ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold">No role selected</h3>
                    <p className="text-sm text-muted-foreground">
                      Select a role from the list to manage its permissions
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[450px] pr-4">
                    <div className="space-y-6">
                      {Object.entries(groupedPermissions).map(
                        ([resource, perms]) => (
                          <div key={resource}>
                            <div className="flex items-center gap-2 mb-3">
                              <h4 className="font-medium capitalize">
                                {resource}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {
                                  perms.filter((p) => hasPermission(p.id))
                                    .length
                                }
                                /{perms.length}
                              </Badge>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {perms.map((perm) => {
                                const checked = hasPermission(perm.id);
                                return (
                                  <label
                                    key={perm.id}
                                    className={cn(
                                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                                      checked
                                        ? 'border-primary/50 bg-primary/5'
                                        : 'border-border hover:bg-muted/50',
                                      isMutating &&
                                        'opacity-50 pointer-events-none',
                                    )}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={() =>
                                        handleTogglePermission(perm.id)
                                      }
                                      disabled={isMutating}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">
                                        {perm.resource}:{perm.action}
                                      </p>
                                      {perm.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {perm.description}
                                        </p>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                            <Separator className="mt-4" />
                          </div>
                        ),
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
