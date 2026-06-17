import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Search,
  Trash2,
  Check,
  X,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  FileQuestion,
  Eye,
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { format } from 'date-fns';
import {
  useAdminAmbassadorApplications,
  useApproveAmbassador,
  useDenyAmbassador,
  useDeleteAmbassadorApplication,
  type AdminAmbassadorApplication,
} from '@/hooks/use-admin';

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'DENIED';

export default function AdminAmbassadorsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const debouncedSearch = useDebounce(search, 300);

  // View detail dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<AdminAmbassadorApplication | null>(
    null,
  );

  // Deny dialog
  const [denyOpen, setDenyOpen] = useState(false);
  const [denyingApp, setDenyingApp] =
    useState<AdminAmbassadorApplication | null>(null);
  const [denyReason, setDenyReason] = useState('');

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingApp, setDeletingApp] =
    useState<AdminAmbassadorApplication | null>(null);

  const { data, isLoading } = useAdminAmbassadorApplications({
    page,
    limit: 20,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  });
  const { data: allAppsData } = useAdminAmbassadorApplications({
    page: 1,
    limit: 1000,
  });
  const approve = useApproveAmbassador();
  const deny = useDenyAmbassador();
  const deleteApp = useDeleteAmbassadorApplication();

  const apps = data?.data?.items ?? [];
  const allApps = allAppsData?.data?.items ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = data?.data?.totalPages ?? 1;

  const filtered = debouncedSearch
    ? apps.filter(
        (a: AdminAmbassadorApplication) =>
          a.user.profile?.displayName
            ?.toLowerCase()
            .includes(debouncedSearch.toLowerCase()) ||
          a.user.email.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : apps;

  const handleApprove = (app: AdminAmbassadorApplication) => {
    approve.mutate(app.id);
  };

  const openDeny = (app: AdminAmbassadorApplication) => {
    setDenyingApp(app);
    setDenyReason('');
    setDenyOpen(true);
  };

  const handleDeny = () => {
    if (!denyingApp) return;
    deny.mutate(
      { id: denyingApp.id, reason: denyReason || undefined },
      {
        onSuccess: () => {
          setDenyOpen(false);
          setDenyingApp(null);
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deletingApp) return;
    deleteApp.mutate(deletingApp.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        setDeletingApp(null);
      },
    });
  };

  const getInitials = (a: AdminAmbassadorApplication) => {
    const name = a.user.profile?.displayName || a.user.email;
    return name.slice(0, 2).toUpperCase();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge className="gap-1 bg-green-600 hover:bg-green-700">
            <Check className="h-3 w-3" /> Approved
          </Badge>
        );
      case 'DENIED':
        return (
          <Badge variant="destructive" className="gap-1">
            <X className="h-3 w-3" /> Denied
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingCount = allApps.filter(
    (a: AdminAmbassadorApplication) => a.status === 'PENDING',
  ).length;

  const approvedCount = allApps.filter(
    (a: AdminAmbassadorApplication) => a.status === 'APPROVED',
  ).length;

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Ambassador Applications
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage ambassador program applications
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Applications
            </CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Review
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <FileQuestion className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allApps.length > 0
                ? Math.round((approvedCount / allApps.length) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search applicants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as StatusFilter);
                setPage(1);
              }}
            >
              <TabsList>
                <TabsTrigger value="PENDING">Pending</TabsTrigger>
                <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                <TabsTrigger value="DENIED">Denied</TabsTrigger>
                <TabsTrigger value="ALL">All</TabsTrigger>
              </TabsList>
            </Tabs>
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
              <Megaphone className="mb-4 h-12 w-12" />
              <p>No applications found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Reviewed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a: AdminAmbassadorApplication) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={a.user.profile?.avatarUrl || undefined}
                          />
                          <AvatarFallback className="text-xs">
                            {getInitials(a)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {a.user.profile?.displayName || '—'}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {a.user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(a.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(a.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.reviewedAt
                        ? format(new Date(a.reviewedAt), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setViewing(a);
                            setViewOpen(true);
                          }}
                          aria-label={`View ${a.user.profile?.displayName || a.user.email}`}
                          title={`View ${a.user.profile?.displayName || a.user.email}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {a.status === 'PENDING' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleApprove(a)}
                              disabled={approve.isPending}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeny(a)}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingApp(a);
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

      {/* View Detail Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              {viewing?.user.profile?.displayName || viewing?.user.email}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={viewing.user.profile?.avatarUrl || undefined}
                  />
                  <AvatarFallback>{getInitials(viewing)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {viewing.user.profile?.displayName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {viewing.user.email}
                  </p>
                </div>
                <div className="ml-auto">{statusBadge(viewing.status)}</div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Why do you want to be an ambassador?
                </Label>
                <p className="mt-1 text-sm">{viewing.reason}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  How will you contribute?
                </Label>
                <p className="mt-1 text-sm">{viewing.contribution}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Your audience / reach
                </Label>
                <p className="mt-1 text-sm">{viewing.audience}</p>
              </div>

              {viewing.denyReason && (
                <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
                  <Label className="text-xs text-destructive">
                    Denial Reason
                  </Label>
                  <p className="mt-1 text-sm">{viewing.denyReason}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Applied {format(new Date(viewing.createdAt), 'PPP')}
                {viewing.reviewedAt &&
                  ` · Reviewed ${format(new Date(viewing.reviewedAt), 'PPP')}`}
              </div>
            </div>
          )}
          <DialogFooter>
            {viewing?.status === 'PENDING' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewOpen(false);
                    if (viewing) openDeny(viewing);
                  }}
                >
                  Deny
                </Button>
                <Button
                  onClick={() => {
                    if (viewing) handleApprove(viewing);
                    setViewOpen(false);
                  }}
                  disabled={approve.isPending}
                >
                  Approve
                </Button>
              </>
            )}
            {viewing?.status !== 'PENDING' && (
              <Button variant="outline" onClick={() => setViewOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Dialog */}
      <Dialog open={denyOpen} onOpenChange={setDenyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Application</DialogTitle>
            <DialogDescription>
              Deny {denyingApp?.user.profile?.displayName || 'this'}{' '}
              application. Optionally provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason (optional)</Label>
            <Textarea
              placeholder="Why is this application being denied?"
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={deny.isPending}
            >
              {deny.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Deny Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Application</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete this application from{' '}
              {deletingApp?.user.profile?.displayName || 'this user'}? This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteApp.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
