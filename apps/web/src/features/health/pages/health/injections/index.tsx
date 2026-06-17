import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  Loader2,
  Plus,
  Syringe,
  Trash2,
  Shield,
  CircleDot,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import { PrivacyNotice } from '@/components/common/privacy-notice';
import type {
  InjectionLogsQuery,
  InjectionRoute,
  InjectionSite,
} from '@varaperformance/core';
import {
  useCreateInjectionLog,
  useCreateInjectionProtocol,
  useDeleteInjectionLog,
  useDeleteInjectionProtocol,
  useInjectionLogs,
  useInjectionProtocols,
} from '@/features/health';

const routeOptions = [
  { value: 'SUBCUTANEOUS', label: 'Subcutaneous' },
  { value: 'INTRAMUSCULAR', label: 'Intramuscular' },
  { value: 'INTRAVENOUS', label: 'Intravenous' },
  { value: 'OTHER', label: 'Other' },
] as const;

const siteOptions = [
  { value: 'ABDOMEN', label: 'Abdomen' },
  { value: 'THIGH', label: 'Thigh' },
  { value: 'GLUTE', label: 'Glute' },
  { value: 'DELTOID', label: 'Deltoid' },
  { value: 'ARM', label: 'Arm' },
  { value: 'OTHER', label: 'Other' },
] as const;

const routeLabelMap = new Map(
  routeOptions.map((item) => [item.value, item.label]),
);
const siteLabelMap = new Map(
  siteOptions.map((item) => [item.value, item.label]),
);

type OptionalRouteSelect = InjectionRoute | 'none';
type OptionalSiteSelect = InjectionSite | 'none';

function formatDate(date: string) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function InjectionTrackerPage() {
  const isMobile = useIsMobile();
  const [showProtocolDialog, setShowProtocolDialog] = useState(false);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [deleteProtocolId, setDeleteProtocolId] = useState<string | null>(null);
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>('none');

  const [protocolForm, setProtocolForm] = useState({
    name: '',
    defaultDose: '',
    unit: '',
    route: 'none' as OptionalRouteSelect,
    notes: '',
  });

  const [logForm, setLogForm] = useState({
    protocolId: 'none',
    name: '',
    dose: '',
    unit: '',
    route: 'none' as OptionalRouteSelect,
    site: 'none' as OptionalSiteSelect,
    notes: '',
  });

  const logsQuery = useMemo<InjectionLogsQuery>(() => {
    return {
      limit: 50,
      ...(selectedProtocolId !== 'none' && { protocolId: selectedProtocolId }),
    };
  }, [selectedProtocolId]);

  const { data: protocolsData, isLoading: protocolsLoading } =
    useInjectionProtocols();
  const { data: logsData, isLoading: logsLoading } =
    useInjectionLogs(logsQuery);

  const protocols = protocolsData?.data ?? [];
  const logs = logsData?.data?.items ?? [];

  const createProtocol = useCreateInjectionProtocol({
    onSuccess: () => {
      toast.success('Protocol created');
      setShowProtocolDialog(false);
      setProtocolForm({
        name: '',
        defaultDose: '',
        unit: '',
        route: 'none',
        notes: '',
      });
    },
    onError: (error) =>
      toast.error(error.message || 'Failed to create protocol'),
  });

  const createLog = useCreateInjectionLog({
    onSuccess: () => {
      toast.success('Injection logged');
      setShowLogDialog(false);
      setLogForm({
        protocolId: 'none',
        name: '',
        dose: '',
        unit: '',
        route: 'none',
        site: 'none',
        notes: '',
      });
    },
    onError: (error) => toast.error(error.message || 'Failed to log injection'),
  });

  const deleteProtocol = useDeleteInjectionProtocol({
    onSuccess: () => {
      toast.success('Protocol deleted');
      setDeleteProtocolId(null);
      setSelectedProtocolId((current) =>
        current === deleteProtocolId ? 'none' : current,
      );
    },
    onError: (error) =>
      toast.error(error.message || 'Failed to delete protocol'),
  });

  const deleteLog = useDeleteInjectionLog({
    onSuccess: () => {
      toast.success('Log deleted');
      setDeleteLogId(null);
    },
    onError: (error) => toast.error(error.message || 'Failed to delete log'),
  });

  const onCreateProtocol = () => {
    if (!protocolForm.name.trim()) {
      toast.error('Name is required');
      return;
    }

    createProtocol.mutate({
      name: protocolForm.name.trim(),
      defaultDose: protocolForm.defaultDose.trim() || null,
      unit: protocolForm.unit.trim() || null,
      route: protocolForm.route === 'none' ? null : protocolForm.route,
      notes: protocolForm.notes.trim() || null,
    });
  };

  const onCreateLog = () => {
    if (logForm.protocolId === 'none' && !logForm.name.trim()) {
      toast.error('Select a protocol or provide a name');
      return;
    }

    createLog.mutate({
      ...(logForm.protocolId !== 'none' && { protocolId: logForm.protocolId }),
      ...(logForm.name.trim() && { name: logForm.name.trim() }),
      dose: logForm.dose.trim() || null,
      unit: logForm.unit.trim() || null,
      route: logForm.route === 'none' ? null : logForm.route,
      site: logForm.site === 'none' ? null : logForm.site,
      notes: logForm.notes.trim() || null,
    });
  };

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Health Log
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Injection Tracker
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              Record injection events and keep a private history for adherence.
              This tracker is informational and does not provide medical advice
              or endorse non-prescribed use.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Encrypted health data
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Dialog
              open={showProtocolDialog}
              onOpenChange={setShowProtocolDialog}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Create protocol"
                  title="Create protocol"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Injection Protocol</DialogTitle>
                  <DialogDescription>
                    Save a neutral template to speed up future logging.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="protocol-name">Name</Label>
                    <Input
                      id="protocol-name"
                      value={protocolForm.name}
                      onChange={(event) =>
                        setProtocolForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Example: Weekly injection"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="protocol-dose">Default Dose</Label>
                      <Input
                        id="protocol-dose"
                        value={protocolForm.defaultDose}
                        onChange={(event) =>
                          setProtocolForm((current) => ({
                            ...current,
                            defaultDose: event.target.value,
                          }))
                        }
                        placeholder="0.25"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="protocol-unit">Unit</Label>
                      <Input
                        id="protocol-unit"
                        value={protocolForm.unit}
                        onChange={(event) =>
                          setProtocolForm((current) => ({
                            ...current,
                            unit: event.target.value,
                          }))
                        }
                        placeholder="mg"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Route</Label>
                    <Select
                      value={protocolForm.route}
                      onValueChange={(value) =>
                        setProtocolForm((current) => ({
                          ...current,
                          route: value as OptionalRouteSelect,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select route" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not set</SelectItem>
                        {routeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="protocol-notes">Notes</Label>
                    <Textarea
                      id="protocol-notes"
                      value={protocolForm.notes}
                      onChange={(event) =>
                        setProtocolForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Optional context"
                    />
                  </div>
                </div>

                <PrivacyNotice variant="health" />
                <DialogFooter>
                  <Button
                    onClick={onCreateProtocol}
                    disabled={createProtocol.isPending}
                  >
                    {createProtocol.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Protocol
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  className="bg-linear-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90"
                  aria-label="Log injection"
                  title="Log injection"
                >
                  <Syringe className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Injection</DialogTitle>
                  <DialogDescription>
                    Add a private entry to your health history.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Protocol (optional)</Label>
                    <Select
                      value={logForm.protocolId}
                      onValueChange={(value) =>
                        setLogForm((current) => ({
                          ...current,
                          protocolId: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select protocol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No protocol</SelectItem>
                        {protocols.map((protocol) => (
                          <SelectItem key={protocol.id} value={protocol.id}>
                            {protocol.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="log-name">
                      Name (when not using protocol)
                    </Label>
                    <Input
                      id="log-name"
                      value={logForm.name}
                      onChange={(event) =>
                        setLogForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Example: Night injection"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="log-dose">Dose</Label>
                      <Input
                        id="log-dose"
                        value={logForm.dose}
                        onChange={(event) =>
                          setLogForm((current) => ({
                            ...current,
                            dose: event.target.value,
                          }))
                        }
                        placeholder="0.25"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="log-unit">Unit</Label>
                      <Input
                        id="log-unit"
                        value={logForm.unit}
                        onChange={(event) =>
                          setLogForm((current) => ({
                            ...current,
                            unit: event.target.value,
                          }))
                        }
                        placeholder="mg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Route</Label>
                      <Select
                        value={logForm.route}
                        onValueChange={(value) =>
                          setLogForm((current) => ({
                            ...current,
                            route: value as OptionalRouteSelect,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Route" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not set</SelectItem>
                          {routeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Site</Label>
                      <Select
                        value={logForm.site}
                        onValueChange={(value) =>
                          setLogForm((current) => ({
                            ...current,
                            site: value as OptionalSiteSelect,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Site" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not set</SelectItem>
                          {siteOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="log-notes">Notes</Label>
                    <Textarea
                      id="log-notes"
                      value={logForm.notes}
                      onChange={(event) =>
                        setLogForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Optional context"
                    />
                  </div>
                </div>

                <PrivacyNotice variant="health" />
                <DialogFooter>
                  <Button onClick={onCreateLog} disabled={createLog.isPending}>
                    {createLog.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Log
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="relative mt-4 rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
          <div className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Start by creating a protocol template, then log events from that
              template for faster and more consistent tracking.
            </p>
          </div>
        </div>
      </section>

      <div
        className={cn('grid gap-6', !isMobile && 'xl:grid-cols-[360px_1fr]')}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDot className="h-4 w-4 text-primary" />
              Protocols
            </CardTitle>
            <CardDescription>
              Reusable templates for consistent logging.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {protocolsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((row) => (
                  <Skeleton key={row} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : protocols.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No protocols yet. Create one to speed up future logs.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {protocols.map((protocol) => (
                    <div
                      key={protocol.id}
                      className="rounded-xl border p-3 space-y-2 bg-card"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium leading-tight">
                            {protocol.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {protocol.defaultDose && protocol.unit
                              ? `${protocol.defaultDose} ${protocol.unit}`
                              : 'No default dose'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteProtocolId(protocol.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {protocol.route && (
                          <Badge variant="secondary">
                            {routeLabelMap.get(protocol.route) ||
                              protocol.route}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          <Calendar className="mr-1 h-3 w-3" />
                          {new Date(protocol.updatedAt).toLocaleDateString()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Filter logs by protocol</Label>
                  <Select
                    value={selectedProtocolId}
                    onValueChange={(value) => setSelectedProtocolId(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All protocols" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All protocols</SelectItem>
                      {protocols.map((protocol) => (
                        <SelectItem key={protocol.id} value={protocol.id}>
                          {protocol.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Syringe className="h-4 w-4 text-primary" />
              Recent Logs
            </CardTitle>
            <CardDescription>
              Latest 50 entries across all protocols or your selected filter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((row) => (
                  <Skeleton key={row} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No injection logs yet.
              </p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border p-3 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-medium truncate">{log.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {log.dose && log.unit
                          ? `${log.dose} ${log.unit}`
                          : 'Dose not specified'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {log.route && (
                          <Badge variant="secondary" className="text-[10px]">
                            {routeLabelMap.get(log.route) || log.route}
                          </Badge>
                        )}
                        {log.site && (
                          <Badge variant="outline" className="text-[10px]">
                            {siteLabelMap.get(log.site) || log.site}
                          </Badge>
                        )}
                        <span>{formatDate(log.loggedAt)}</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteLogId(log.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!deleteProtocolId}
        onOpenChange={(open) => !open && setDeleteProtocolId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete protocol?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the template. Existing logs remain in your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteProtocolId && deleteProtocol.mutate(deleteProtocolId)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteLogId}
        onOpenChange={(open) => !open && setDeleteLogId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete log entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLogId && deleteLog.mutate(deleteLogId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PrivacyNotice variant="health" />
    </div>
  );
}
