import React, { useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  Lock,
  Database,
  ScrollText,
  Activity,
  Users,
  FileText,
  Download,
  Trash2,
  Flag,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Bell,
  Plus,
  Loader2,
  Eye,
  UserX,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminStats } from '@/hooks/use-admin';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type BreachSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type BreachStatus =
  | 'DETECTED'
  | 'INVESTIGATING'
  | 'CONTAINED'
  | 'NOTIFIED_DPA'
  | 'NOTIFIED_USERS'
  | 'RESOLVED';

interface BreachRecord {
  id: string;
  severity: BreachSeverity;
  status: BreachStatus;
  description: string;
  dataCategories: string[];
  affectedCount?: number;
  detectedAt: string;
  containedAt?: string;
  dpaNotifiedAt?: string;
  usersNotifiedAt?: string;
  dpaReference?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const severityColors: Record<BreachSeverity, string> = {
  LOW: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  MEDIUM: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  HIGH: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  CRITICAL: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const statusColors: Record<BreachStatus, string> = {
  DETECTED: 'bg-red-500/10 text-red-600 border-red-500/20',
  INVESTIGATING: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  CONTAINED: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  NOTIFIED_DPA: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  NOTIFIED_USERS: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  RESOLVED: 'bg-green-500/10 text-green-600 border-green-500/20',
};

const statusLabel: Record<BreachStatus, string> = {
  DETECTED: 'Detected',
  INVESTIGATING: 'Investigating',
  CONTAINED: 'Contained',
  NOTIFIED_DPA: 'DPA Notified',
  NOTIFIED_USERS: 'Users Notified',
  RESOLVED: 'Resolved',
};

function dpaDeadlineStatus(breach: BreachRecord) {
  if (breach.dpaNotifiedAt) return { label: 'Notified', overdue: false, urgent: false };
  const hoursElapsed = differenceInHours(new Date(), new Date(breach.detectedAt));
  const overdue = hoursElapsed >= 72;
  const urgent = !overdue && hoursElapsed >= 48;
  const hoursLeft = Math.max(0, 72 - hoursElapsed);
  return {
    label: overdue ? 'Overdue' : `${hoursLeft}h left`,
    overdue,
    urgent,
  };
}

function StatusBadge({ active, label }: { active: boolean; label?: string }) {
  return (
    <Badge
      variant="default"
      className={active ? 'bg-green-500 text-xs' : 'bg-red-500 text-xs'}
    >
      {label ?? (active ? 'Active' : 'Inactive')}
    </Badge>
  );
}

function StatusIcon({ active }: { active?: boolean }) {
  return active ? (
    <CheckCircle2 className="h-4 w-4 text-green-500 inline-block" />
  ) : (
    <XCircle className="h-4 w-4 text-red-500 inline-block" />
  );
}

function ControlRow({
  icon: Icon,
  label,
  active,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  iconColor: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/60 last:border-0">
      <div className="flex items-center gap-2 text-sm">
        <Icon className={cn('h-3.5 w-3.5 shrink-0', iconColor)} />
        <span>{label}</span>
      </div>
      <StatusIcon active={active} />
    </div>
  );
}

function MetricRow({
  icon: Icon,
  label,
  value,
  href,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  href?: string;
  iconColor: string;
}) {
  const labelEl = href ? (
    <Link to={href} className="flex items-center gap-2 text-sm text-primary hover:underline">
      <Icon className={cn('h-3.5 w-3.5 shrink-0', iconColor)} />
      <span>{label}</span>
    </Link>
  ) : (
    <div className="flex items-center gap-2 text-sm">
      <Icon className={cn('h-3.5 w-3.5 shrink-0', iconColor)} />
      <span>{label}</span>
    </div>
  );
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/60 last:border-0">
      {labelEl}
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}

function formatNumber(n: number | undefined | null): string {
  return (n ?? 0).toLocaleString();
}

function Pct(a: number, b: number): string {
  if (b === 0) return '0%';
  return `${Math.round((a / b) * 100)}%`;
}

const DATA_CATEGORY_OPTIONS = [
  'email',
  'name',
  'health_data',
  'payment_info',
  'location',
  'biometric',
  'credentials',
  'device_data',
];

// ─── Breach Management Section ────────────────────────────────────────────────

function BreachManagementSection() {
  const queryClient = useQueryClient();

  const [recordOpen, setRecordOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [notifyUsersOpen, setNotifyUsersOpen] = useState(false);
  const [selected, setSelected] = useState<BreachRecord | null>(null);

  // Record form
  const [severity, setSeverity] = useState<BreachSeverity>('MEDIUM');
  const [description, setDescription] = useState('');
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [detectedAt, setDetectedAt] = useState('');
  const [affectedCount, setAffectedCount] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Update form
  const [updateStatus, setUpdateStatus] = useState<BreachStatus>('DETECTED');
  const [updateNotes, setUpdateNotes] = useState('');
  const [dpaReference, setDpaReference] = useState('');

  // Notify users form
  const [notifyEmails, setNotifyEmails] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-breaches'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: BreachRecord[] }>(
        '/admin/breach',
      );
      return res.data.data;
    },
  });

  const breaches = data ?? [];
  const openBreaches = breaches.filter((b) => b.status !== 'RESOLVED');
  const overdueBreaches = openBreaches.filter(
    (b) => !b.dpaNotifiedAt && differenceInHours(new Date(), new Date(b.detectedAt)) >= 72,
  );

  const recordMutation = useMutation({
    mutationFn: async () => {
      await api.post('/admin/breach', {
        severity,
        description,
        dataCategories,
        detectedAt: new Date(detectedAt).toISOString(),
        affectedCount: affectedCount ? parseInt(affectedCount, 10) : undefined,
        internalNotes: internalNotes || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Breach recorded and admin team alerted');
      queryClient.invalidateQueries({ queryKey: ['admin-breaches'] });
      setRecordOpen(false);
      setSeverity('MEDIUM');
      setDescription('');
      setDataCategories([]);
      setDetectedAt('');
      setAffectedCount('');
      setInternalNotes('');
    },
    onError: () => toast.error('Failed to record breach'),
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/admin/breach/${id}`, {
        status: updateStatus,
        internalNotes: updateNotes || undefined,
        dpaReference: dpaReference || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Breach updated');
      queryClient.invalidateQueries({ queryKey: ['admin-breaches'] });
      setViewOpen(false);
    },
    onError: () => toast.error('Failed to update breach'),
  });

  const notifyDpaMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/breach/${id}/notify-dpa`);
    },
    onSuccess: () => {
      toast.success('DPA marked as notified');
      queryClient.invalidateQueries({ queryKey: ['admin-breaches'] });
      setViewOpen(false);
    },
    onError: () => toast.error('Failed to update DPA status'),
  });

  const notifyUsersMutation = useMutation({
    mutationFn: async ({ id, emails }: { id: string; emails: string[] }) => {
      await api.post(`/admin/breach/${id}/notify-users`, { emails });
    },
    onSuccess: () => {
      toast.success('User notifications sent');
      queryClient.invalidateQueries({ queryKey: ['admin-breaches'] });
      setNotifyUsersOpen(false);
      setNotifyEmails('');
    },
    onError: () => toast.error('Failed to send user notifications'),
  });

  function openView(breach: BreachRecord) {
    setSelected(breach);
    setUpdateStatus(breach.status);
    setUpdateNotes(breach.internalNotes ?? '');
    setDpaReference(breach.dpaReference ?? '');
    setViewOpen(true);
  }

  function openNotifyUsers(breach: BreachRecord) {
    setSelected(breach);
    setNotifyEmails('');
    setNotifyUsersOpen(true);
  }

  function toggleCategory(cat: string) {
    setDataCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  return (
    <>
      {/* Summary strip */}
      {openBreaches.length > 0 && (
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm',
            overdueBreaches.length > 0
              ? 'border-red-500/30 bg-red-500/5 text-red-600'
              : 'border-orange-500/30 bg-orange-500/5 text-orange-600',
          )}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{openBreaches.length}</strong> open breach
            {openBreaches.length !== 1 ? 'es' : ''}
            {overdueBreaches.length > 0 && (
              <>
                {' — '}
                <strong>{overdueBreaches.length}</strong> overdue 72h DPA notification
                {overdueBreaches.length !== 1 ? 's' : ''}
              </>
            )}
          </span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            Data Breach Notifications
            <span className="text-xs font-normal text-muted-foreground ml-1">
              GDPR Art. 33–34
            </span>
          </CardTitle>
          <Button size="sm" onClick={() => setRecordOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Record Breach
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : breaches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-10 w-10 text-green-500 mb-3" />
              <p className="font-medium">No breach records</p>
              <p className="text-sm text-muted-foreground mt-1">
                No data breaches have been recorded
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Affected</TableHead>
                    <TableHead>Detected</TableHead>
                    <TableHead>DPA Deadline</TableHead>
                    <TableHead className="w-25">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breaches.map((breach) => {
                    const dpa = dpaDeadlineStatus(breach);
                    return (
                      <TableRow key={breach.id}>
                        <TableCell>
                          <Badge
                            className={cn('border text-xs', severityColors[breach.severity])}
                          >
                            {breach.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-55">
                          <p className="truncate text-sm">{breach.description}</p>
                          {breach.dataCategories.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {breach.dataCategories.join(', ')}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn('border text-xs', statusColors[breach.status])}
                          >
                            {statusLabel[breach.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {breach.affectedCount != null
                            ? formatNumber(breach.affectedCount)
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(breach.detectedAt), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          {breach.dpaNotifiedAt ? (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Notified
                            </span>
                          ) : (
                            <span
                              className={cn(
                                'flex items-center gap-1 text-xs',
                                dpa.overdue
                                  ? 'text-red-600 font-semibold'
                                  : dpa.urgent
                                    ? 'text-orange-600'
                                    : 'text-muted-foreground',
                              )}
                            >
                              <Clock className="h-3.5 w-3.5" />
                              {dpa.label}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openView(breach)}
                              title="View / Update"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openNotifyUsers(breach)}
                              title="Notify affected users"
                              disabled={breach.status === 'RESOLVED'}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Breach Dialog */}
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Data Breach</DialogTitle>
            <DialogDescription>
              GDPR Art. 33 — supervisory authority must be notified within 72 hours of
              becoming aware.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={severity}
                onValueChange={(v) => setSeverity(v as BreachSeverity)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what happened..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Categories Affected</Label>
              <div className="flex flex-wrap gap-2">
                {DATA_CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border transition-colors',
                      dataCategories.includes(cat)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Detected At</Label>
                <Input
                  type="datetime-local"
                  value={detectedAt}
                  onChange={(e) => setDetectedAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Affected Users (est.)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={affectedCount}
                  onChange={(e) => setAffectedCount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Textarea
                placeholder="Investigation notes, root cause, remediation steps..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => recordMutation.mutate()}
              disabled={
                !description ||
                !detectedAt ||
                dataCategories.length === 0 ||
                recordMutation.isPending
              }
            >
              {recordMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Record Breach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View / Update Dialog */}
      {selected && (
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Breach Details</DialogTitle>
              <DialogDescription>
                Detected{' '}
                {formatDistanceToNow(new Date(selected.detectedAt), {
                  addSuffix: true,
                })}
                {' · '}
                {selected.dataCategories.join(', ')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">{selected.description}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Affected users</p>
                  <p className="font-mono">
                    {selected.affectedCount != null
                      ? formatNumber(selected.affectedCount)
                      : 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">DPA notified</p>
                  <p>
                    {selected.dpaNotifiedAt
                      ? format(new Date(selected.dpaNotifiedAt), 'MMM d, HH:mm')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Users notified</p>
                  <p>
                    {selected.usersNotifiedAt
                      ? format(new Date(selected.usersNotifiedAt), 'MMM d, HH:mm')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Contained</p>
                  <p>
                    {selected.containedAt
                      ? format(new Date(selected.containedAt), 'MMM d, HH:mm')
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={updateStatus}
                  onValueChange={(v) => setUpdateStatus(v as BreachStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DETECTED">Detected</SelectItem>
                    <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                    <SelectItem value="CONTAINED">Contained</SelectItem>
                    <SelectItem value="NOTIFIED_DPA">DPA Notified</SelectItem>
                    <SelectItem value="NOTIFIED_USERS">Users Notified</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>DPA Reference Number</Label>
                <Input
                  placeholder="e.g. ICO-2026-00123"
                  value={dpaReference}
                  onChange={(e) => setDpaReference(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  rows={2}
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              {!selected.dpaNotifiedAt && (
                <Button
                  variant="outline"
                  onClick={() => notifyDpaMutation.mutate(selected.id)}
                  disabled={notifyDpaMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {notifyDpaMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  Mark DPA Notified
                </Button>
              )}
              <Button
                onClick={() => updateMutation.mutate(selected.id)}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Notify Users Dialog */}
      {selected && (
        <Dialog open={notifyUsersOpen} onOpenChange={setNotifyUsersOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Notify Affected Users</DialogTitle>
              <DialogDescription>
                GDPR Art. 34 — send breach notification emails to affected individuals.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email Addresses</Label>
                <Textarea
                  placeholder={'user@example.com\nother@example.com'}
                  value={notifyEmails}
                  onChange={(e) => setNotifyEmails(e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  One email per line or comma-separated
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setNotifyUsersOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const emails = notifyEmails
                    .split(/[\n,]/)
                    .map((e) => e.trim())
                    .filter(Boolean);
                  notifyUsersMutation.mutate({ id: selected.id, emails });
                }}
                disabled={!notifyEmails.trim() || notifyUsersMutation.isPending}
              >
                {notifyUsersMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Send Notifications
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminCompliancePage() {
  const { data: statsData, isLoading } = useAdminStats();
  const stats = statsData?.data;
  const c = stats?.compliance;

  const encryption = c?.dataEncryption;
  const audit = c?.auditLogging;
  const worm = c?.wormStorage;
  const consent = c?.consentTracking;
  const legal = c?.legalDocuments;
  const gdpr = c?.gdpr;
  const legalDocumentTypes = legal?.types.length ?? 0;
  const retainedLegalVersions = Math.max(
    0,
    (legal?.total ?? 0) - (legal?.active ?? 0),
  );

  const soc2Active = !!(encryption?.active && audit?.active && worm?.active);
  const hipaaActive = !!(
    encryption?.active &&
    consent?.enabled &&
    audit?.active
  );
  const gdprActive = (gdpr?.pendingRetentions ?? 0) === 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance</h1>
          <p className="text-muted-foreground mt-1">
            Live verification status of security and privacy controls
          </p>
        </div>
      </div>

      {/* Framework Status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              SOC2 Type II
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <StatusBadge
              active={soc2Active}
              label={soc2Active ? 'Controls Active' : 'Controls Partial'}
            />
            <div className="pt-1">
              <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-border/40">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Control</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</span>
              </div>
              <ControlRow icon={Database} label="Data Encryption" active={encryption?.active} iconColor="text-amber-500" />
              <ControlRow icon={Activity} label="Audit Logging" active={audit?.active} iconColor="text-cyan-500" />
              <ControlRow icon={ScrollText} label="WORM Storage" active={worm?.active} iconColor="text-teal-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-purple-500" />
              HIPAA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <StatusBadge
              active={hipaaActive}
              label={hipaaActive ? 'Controls Active' : 'Controls Partial'}
            />
            <div className="pt-1">
              <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-border/40">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Control</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</span>
              </div>
              <ControlRow icon={Database} label="Data Encryption" active={encryption?.active} iconColor="text-amber-500" />
              <ControlRow icon={Users} label="Consent Tracking" active={consent?.enabled} iconColor="text-indigo-500" />
              <ControlRow icon={Activity} label="Audit Logging" active={audit?.active} iconColor="text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flag className="h-4 w-4 text-amber-500" />
              GDPR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <StatusBadge
              active={gdprActive}
              label={gdprActive ? 'Controls Active' : 'Attention Needed'}
            />
            <div className="pt-1">
              <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-border/40">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Metric</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Count</span>
              </div>
              <MetricRow icon={Download} label="Data Exports" value={formatNumber(gdpr?.dataExports)} href="/admin/audit-logs?action=EXPORT" iconColor="text-blue-500" />
              <MetricRow icon={Trash2} label="Account Deletions" value={formatNumber(gdpr?.accountDeletions)} href="/admin/audit-logs?action=DELETE&resource=User" iconColor="text-red-500" />
              <MetricRow icon={Flag} label="Pending Retentions" value={formatNumber(gdpr?.pendingRetentions)} iconColor="text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Control Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Control</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Data Encryption */}
                <TableRow>
                  <TableCell
                    rowSpan={2}
                    className="align-top font-medium whitespace-nowrap"
                  >
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-amber-500" />
                      Data Encryption
                    </div>
                  </TableCell>
                  <TableCell>Encrypted profiles (PII)</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(encryption?.encryptedProfiles)} /{' '}
                    {formatNumber(encryption?.totalProfiles)}{' '}
                    <span className="text-muted-foreground text-xs">
                      (
                      {Pct(
                        encryption?.encryptedProfiles ?? 0,
                        encryption?.totalProfiles ?? 0,
                      )}
                      )
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusIcon
                      active={
                        (encryption?.encryptedProfiles ?? 0) > 0 &&
                        encryption?.encryptedProfiles ===
                          encryption?.totalProfiles
                      }
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Encrypted sessions (tokens)</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(encryption?.encryptedSessions)}
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusIcon
                      active={(encryption?.encryptedSessions ?? 0) > 0}
                    />
                  </TableCell>
                </TableRow>

                {/* Audit Logging */}
                <TableRow>
                  <TableCell className="font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-cyan-500" />
                      Audit Logging
                    </div>
                  </TableCell>
                  <TableCell>Entries (last 24h)</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(audit?.recentEntries)}
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusIcon active={audit?.active} />
                  </TableCell>
                </TableRow>

                {/* WORM Storage */}
                <TableRow>
                  <TableCell
                    rowSpan={2}
                    className="align-top font-medium whitespace-nowrap"
                  >
                    <div className="flex items-center gap-2">
                      <ScrollText className="h-4 w-4 text-teal-500" />
                      WORM Storage
                    </div>
                  </TableCell>
                  <TableCell>Legal docs with SHA-256 hash</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(worm?.legalDocuments?.withHash)} /{' '}
                    {formatNumber(worm?.legalDocuments?.total)}{' '}
                    <span className="text-muted-foreground text-xs">
                      (
                      {Pct(
                        worm?.legalDocuments?.withHash ?? 0,
                        worm?.legalDocuments?.total ?? 0,
                      )}
                      )
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusIcon
                      active={
                        (worm?.legalDocuments?.withHash ?? 0) > 0 &&
                        worm?.legalDocuments?.withHash ===
                          worm?.legalDocuments?.total
                      }
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Coaching contracts with SHA-256 hash</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(worm?.coachingContracts?.withHash)} /{' '}
                    {formatNumber(worm?.coachingContracts?.total)}{' '}
                    <span className="text-muted-foreground text-xs">
                      (
                      {Pct(
                        worm?.coachingContracts?.withHash ?? 0,
                        worm?.coachingContracts?.total ?? 0,
                      )}
                      )
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusIcon
                      active={
                        (worm?.coachingContracts?.withHash ?? 0) > 0 &&
                        worm?.coachingContracts?.withHash ===
                          worm?.coachingContracts?.total
                      }
                    />
                  </TableCell>
                </TableRow>

                {/* Consent Tracking */}
                <TableRow>
                  <TableCell
                    rowSpan={2}
                    className="align-top font-medium whitespace-nowrap"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-500" />
                      Consent Tracking
                    </div>
                  </TableCell>
                  <TableCell>Total consent records</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(consent?.totalConsents)}
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusIcon active={consent?.enabled} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Legal document types covered</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(legalDocumentTypes)}
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusIcon active={legalDocumentTypes > 0} />
                  </TableCell>
                </TableRow>

                {/* Legal Documents */}
                <TableRow>
                  <TableCell
                    rowSpan={2}
                    className="align-top font-medium whitespace-nowrap"
                  >
                    <Link
                      to="/admin/legal"
                      className="flex items-center gap-2 hover:underline text-primary"
                    >
                      <FileText className="h-4 w-4 text-sky-500" />
                      Legal Documents
                    </Link>
                  </TableCell>
                  <TableCell>Active documents</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(legal?.active)} / {formatNumber(legal?.total)}
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusIcon active={(legal?.active ?? 0) > 0} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Archived versions retained</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(retainedLegalVersions)}
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusIcon
                      active={(legal?.total ?? 0) >= (legal?.active ?? 0)}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Breach Management */}
      <BreachManagementSection />
    </div>
  );
}
