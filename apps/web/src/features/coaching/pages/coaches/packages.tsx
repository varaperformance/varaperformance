import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import {
  Plus,
  Loader2,
  Pencil,
  Archive,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import type { SuccessResponse } from '@varaperformance/core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useMyCoachPackages,
  useCreateMyCoachPackage,
  useUpdateMyCoachPackage,
  useArchiveMyCoachPackage,
  useDeleteMyCoachPackage,
  type BillingCycle,
  type CoachPackageResponse,
} from '@/features/coaching';
import { useCoachClients } from '@/features/coaching';

type PackageFormState = {
  name: string;
  description: string;
  priceInDollars: string;
  billingCycle: BillingCycle;
  featuresText: string;
  sortOrder: string;
};

const EMPTY_FORM: PackageFormState = {
  name: '',
  description: '',
  priceInDollars: '',
  billingCycle: 'MONTHLY',
  featuresText: '',
  sortOrder: '0',
};

function toFormState(pkg: CoachPackageResponse): PackageFormState {
  return {
    name: pkg.name,
    description: pkg.description ?? '',
    priceInDollars: (pkg.priceInCents / 100).toString(),
    billingCycle: pkg.billingCycle,
    featuresText: pkg.features.join('\n'),
    sortOrder: String(pkg.sortOrder),
  };
}

function parseFeatures(featuresText: string): string[] {
  return featuresText
    .split(/\n|,/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parsePriceInDollarsToCents(priceInDollars: string): number {
  const parsedValue = Number(priceInDollars);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return 0;
  }

  return Math.round(parsedValue * 100);
}

function getBillingCycleLabel(billingCycle: BillingCycle): string {
  if (billingCycle === 'MONTHLY') {
    return 'month';
  }

  if (billingCycle === 'QUARTERLY') {
    return 'quarter';
  }

  return 'year';
}

export default function CoachPackagesPage() {
  const isMobile = useIsMobile();
  const { data, isLoading } = useMyCoachPackages();
  const createPackage = useCreateMyCoachPackage();
  const updatePackage = useUpdateMyCoachPackage();
  const archivePackage = useArchiveMyCoachPackage();
  const deletePackage = useDeleteMyCoachPackage();
  const { data: clientsResponse } = useCoachClients({
    status: 'CONFIRMED',
    page: 1,
    limit: 1000,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPackage, setEditingPackage] =
    useState<CoachPackageResponse | null>(null);

  const [createForm, setCreateForm] = useState<PackageFormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<PackageFormState>(EMPTY_FORM);

  const { data: platformFeeData } = useQuery({
    queryKey: ['platform-fee', 'public'],
    queryFn: async () => {
      const response = await api.get<SuccessResponse<{ percent: number }>>(
        'payments/settings/platform-fee',
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const packages = useMemo(() => data?.data ?? [], [data?.data]);
  const clients = useMemo(
    () => (clientsResponse?.success ? clientsResponse.data.clients : []),
    [clientsResponse],
  );
  const platformFeePercent = platformFeeData?.data?.percent ?? 15;

  const activeSubscriptionsByPackage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const client of clients) {
      const packageId = client.package?.id;
      if (!packageId) continue;

      const subStatus = client.subscription?.status;
      const hasActiveLikeSubscription =
        subStatus === 'ACTIVE' ||
        subStatus === 'PAUSED' ||
        subStatus === 'PAST_DUE';

      if (client.status === 'CONFIRMED' && hasActiveLikeSubscription) {
        counts.set(packageId, (counts.get(packageId) ?? 0) + 1);
      }
    }
    return counts;
  }, [clients]);

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const createBasePriceCents = parsePriceInDollarsToCents(
    createForm.priceInDollars,
  );
  const createPlatformFeeCents = Math.round(
    createBasePriceCents * (platformFeePercent / 100),
  );
  const createFinalClientPriceCents =
    createBasePriceCents + createPlatformFeeCents;

  const editBasePriceCents = parsePriceInDollarsToCents(
    editForm.priceInDollars,
  );
  const editPlatformFeeCents = Math.round(
    editBasePriceCents * (platformFeePercent / 100),
  );
  const editFinalClientPriceCents = editBasePriceCents + editPlatformFeeCents;

  const submitCreate = async () => {
    const priceInCents = Math.round(Number(createForm.priceInDollars) * 100);
    const sortOrder = Number(createForm.sortOrder);
    const features = parseFeatures(createForm.featuresText);

    if (!createForm.name.trim()) {
      toast.error('Package name is required');
      return;
    }

    if (!Number.isFinite(priceInCents) || priceInCents <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    if (features.length === 0) {
      toast.error('Add at least one package feature');
      return;
    }

    try {
      await createPackage.mutateAsync({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        priceInCents,
        billingCycle: createForm.billingCycle,
        features,
        isActive: true,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      });

      toast.success('Package created');
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
    } catch {
      toast.error('Failed to create package');
    }
  };

  const openEditDialog = (pkg: CoachPackageResponse) => {
    setEditingPackage(pkg);
    setEditForm(toFormState(pkg));
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editingPackage) {
      return;
    }

    const priceInCents = Math.round(Number(editForm.priceInDollars) * 100);
    const sortOrder = Number(editForm.sortOrder);
    const features = parseFeatures(editForm.featuresText);

    if (!editForm.name.trim()) {
      toast.error('Package name is required');
      return;
    }

    if (!Number.isFinite(priceInCents) || priceInCents <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    if (features.length === 0) {
      toast.error('Add at least one package feature');
      return;
    }

    try {
      await updatePackage.mutateAsync({
        packageId: editingPackage.id,
        data: {
          name: editForm.name.trim(),
          description: editForm.description.trim() || undefined,
          priceInCents,
          billingCycle: editForm.billingCycle,
          features,
          sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        },
      });

      toast.success('Package updated');
      setEditOpen(false);
      setEditingPackage(null);
    } catch {
      toast.error('Failed to update package');
    }
  };

  const toggleActive = async (pkg: CoachPackageResponse) => {
    try {
      await updatePackage.mutateAsync({
        packageId: pkg.id,
        data: { isActive: !pkg.isActive },
      });
      toast.success(pkg.isActive ? 'Package archived' : 'Package activated');
    } catch {
      toast.error('Failed to update package status');
    }
  };

  const archiveOnly = async (pkg: CoachPackageResponse) => {
    try {
      await archivePackage.mutateAsync(pkg.id);
      toast.success('Package archived');
    } catch {
      toast.error('Failed to archive package');
    }
  };

  const deleteOnly = async (pkg: CoachPackageResponse) => {
    try {
      const response = await deletePackage.mutateAsync(pkg.id);

      if (response.success) {
        toast.success('Package deleted');
        return;
      }

      toast.error(response.error.message || 'Failed to delete package');
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: { message?: string } }>;
      const message =
        axiosError.response?.data?.error?.message || 'Failed to delete package';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Packages</h1>
          <p className="text-sm text-muted-foreground">
            Create and update coaching packages shown on your public profile.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Package
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Package</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Pro Coaching"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Who this package is best for"
                />
              </div>

              <div
                className={cn(
                  'grid gap-4',
                  isMobile ? 'grid-cols-1' : 'md:grid-cols-3',
                )}
              >
                <div className="space-y-2">
                  <Label>Price (USD)</Label>
                  <Input
                    type="number"
                    min={1}
                    step="0.01"
                    value={createForm.priceInDollars}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        priceInDollars: event.target.value,
                      }))
                    }
                    placeholder="150"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Billing Cycle</Label>
                  <Select
                    value={createForm.billingCycle}
                    onValueChange={(value: BillingCycle) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        billingCycle: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={createForm.sortOrder}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        sortOrder: event.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Features (one per line or comma separated)</Label>
                <Textarea
                  rows={4}
                  value={createForm.featuresText}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      featuresText: event.target.value,
                    }))
                  }
                  placeholder={
                    'Weekly check-ins\nForm review\nProgramming updates'
                  }
                />
              </div>

              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="font-medium">Client checkout preview</p>
                {createBasePriceCents > 0 ? (
                  <div className="mt-1 space-y-1 text-muted-foreground">
                    <p>Package price: {formatMoney(createBasePriceCents)}</p>
                    <p>
                      + Platform fee ({platformFeePercent}%):{' '}
                      {formatMoney(createPlatformFeeCents)}
                    </p>
                    <p className="font-medium text-foreground">
                      Final client price:{' '}
                      {formatMoney(createFinalClientPriceCents)}/
                      {getBillingCycleLabel(createForm.billingCycle)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground">
                    Enter a package price to preview the final client checkout
                    amount.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitCreate} disabled={createPackage.isPending}>
                {createPackage.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Package'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(value) => {
          setEditOpen(value);
          if (!value) {
            setEditingPackage(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Package</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <div
              className={cn(
                'grid gap-4',
                isMobile ? 'grid-cols-1' : 'md:grid-cols-3',
              )}
            >
              <div className="space-y-2">
                <Label>Price (USD)</Label>
                <Input
                  type="number"
                  min={1}
                  step="0.01"
                  value={editForm.priceInDollars}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      priceInDollars: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select
                  value={editForm.billingCycle}
                  onValueChange={(value: BillingCycle) =>
                    setEditForm((prev) => ({ ...prev, billingCycle: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={editForm.sortOrder}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      sortOrder: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Features (one per line or comma separated)</Label>
              <Textarea
                rows={4}
                value={editForm.featuresText}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    featuresText: event.target.value,
                  }))
                }
              />
            </div>

            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <p className="font-medium">Client checkout preview</p>
              {editBasePriceCents > 0 ? (
                <div className="mt-1 space-y-1 text-muted-foreground">
                  <p>Package price: {formatMoney(editBasePriceCents)}</p>
                  <p>
                    + Platform fee ({platformFeePercent}%):{' '}
                    {formatMoney(editPlatformFeeCents)}
                  </p>
                  <p className="font-medium text-foreground">
                    Final client price: {formatMoney(editFinalClientPriceCents)}
                    /{getBillingCycleLabel(editForm.billingCycle)}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-muted-foreground">
                  Enter a package price to preview the final client checkout
                  amount.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={updatePackage.isPending}>
              {updatePackage.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Your Packages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg border bg-muted/20 p-3 text-sm">
            <p className="font-medium">
              Current platform fee: {platformFeePercent}%
            </p>
            <p className="text-muted-foreground">
              Client checkout total = package price + platform fee.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : packages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No packages yet. Create your first package to start accepting
              bookings.
            </p>
          ) : (
            <div className="space-y-4">
              {packages.map((pkg) => {
                const activeSubCount =
                  activeSubscriptionsByPackage.get(pkg.id) ?? 0;
                const canDeletePackage = activeSubCount === 0;
                const platformFeeCents = Math.round(
                  pkg.priceInCents * (platformFeePercent / 100),
                );
                const finalClientPriceCents =
                  pkg.priceInCents + platformFeeCents;

                return (
                  <div
                    key={pkg.id}
                    className="rounded-lg border p-4 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{pkg.name}</p>
                          <Badge
                            variant={pkg.isActive ? 'default' : 'secondary'}
                          >
                            {pkg.isActive ? 'Active' : 'Archived'}
                          </Badge>
                          <Badge variant="outline">{pkg.billingCycle}</Badge>
                        </div>

                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Package price: {formatMoney(pkg.priceInCents)}</p>
                          <p>
                            + Platform fee ({platformFeePercent}%):{' '}
                            {formatMoney(platformFeeCents)}
                          </p>
                          <p className="font-medium text-foreground">
                            Final client price:{' '}
                            {formatMoney(finalClientPriceCents)}
                          </p>
                        </div>

                        {pkg.description && (
                          <p className="text-sm text-muted-foreground">
                            {pkg.description}
                          </p>
                        )}

                        {pkg.features.length > 0 && (
                          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                            {pkg.features.map((feature, index) => (
                              <li key={`${pkg.id}-feature-${index}`}>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(pkg)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActive(pkg)}
                          disabled={updatePackage.isPending}
                        >
                          {pkg.isActive ? (
                            <>
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </>
                          ) : (
                            <>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </Button>

                        {pkg.isActive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => archiveOnly(pkg)}
                            disabled={archivePackage.isPending}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Quick Archive
                          </Button>
                        )}

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={
                                !canDeletePackage || deletePackage.isPending
                              }
                              title={
                                canDeletePackage
                                  ? 'Delete package'
                                  : `Cannot delete: ${activeSubCount} active subscription${activeSubCount === 1 ? '' : 's'}`
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete package?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently deletes this package and
                                removes its linked booking/subscription history.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteOnly(pkg)}
                              >
                                {deletePackage.isPending
                                  ? 'Deleting...'
                                  : 'Delete Package'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      {!canDeletePackage ? (
                        <p className="text-xs text-muted-foreground">
                          Delete unavailable: {activeSubCount} active
                          subscription
                          {activeSubCount === 1 ? '' : 's'} still use this
                          package.
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
