import { useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSearch,
  Loader2,
  Search,
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { useAdminAuditLogs, type AdminAuditLog } from '@/hooks/use-admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';

const actionOptions = [
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'FAILED_LOGIN',
  'PASSWORD_CHANGE',
  'EXPORT',
  'CONSENT_GRANTED',
  'CONSENT_REVOKED',
] as const;

const actionStyles: Record<string, string> = {
  CREATE: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  READ: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
  UPDATE: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  DELETE: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
  LOGIN: 'bg-green-500/10 text-green-700 border-green-500/20',
  LOGOUT: 'bg-zinc-500/10 text-zinc-700 border-zinc-500/20',
  FAILED_LOGIN: 'bg-red-500/10 text-red-700 border-red-500/20',
  PASSWORD_CHANGE: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  EXPORT: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
  CONSENT_GRANTED: 'bg-teal-500/10 text-teal-700 border-teal-500/20',
  CONSENT_REVOKED: 'bg-pink-500/10 text-pink-700 border-pink-500/20',
};

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return 'Unable to serialize value';
  }
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string>('all');
  const [resource, setResource] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  const debouncedResource = useDebounce(resource, 300);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useAdminAuditLogs({
    page,
    limit: 25,
    action: action !== 'all' ? action : undefined,
    resource: debouncedResource || undefined,
    search: debouncedSearch || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const logs = data?.data?.items ?? [];
  const totalPages = data?.data?.totalPages ?? 1;
  const total = data?.data?.total ?? 0;

  const pageLabel = useMemo(() => {
    if (!logs.length) return '0 results';
    const limit = data?.data?.limit ?? 25;
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    return `${start}-${end} of ${total}`;
  }, [data?.data?.limit, logs.length, page, total]);

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Review security and compliance events across the platform
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={action}
                onValueChange={(value) => {
                  setAction(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {actionOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resource</Label>
              <Input
                placeholder="User, Profile, Note..."
                value={resource}
                onChange={(e) => {
                  setResource(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Resource ID or User ID"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>From</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>To</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileSearch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">No audit logs found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or search terms
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Resource ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`border ${actionStyles[log.action] ?? ''}`}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{log.resource}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-52">
                        <p className="truncate text-sm font-medium">
                          {log.user?.displayName || 'Unknown user'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {log.user?.email || log.userId || 'System'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {log.resourceId || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), 'MMM d, yyyy p')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        title="View event details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!isLoading && logs.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{pageLabel}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(selectedLog)}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Audit Event Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Action
                  </p>
                  <p className="font-medium">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Resource
                  </p>
                  <p className="font-medium">{selectedLog.resource}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    User
                  </p>
                  <p className="font-medium">
                    {selectedLog.user?.displayName || 'Unknown user'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedLog.user?.email || selectedLog.userId || 'System'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Created
                  </p>
                  <p className="font-medium">
                    {format(new Date(selectedLog.createdAt), 'PPpp')}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    IP Address
                  </p>
                  <p className="font-medium">{selectedLog.ipAddress || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    User Agent
                  </p>
                  <p className="text-sm break-words">
                    {selectedLog.userAgent || '-'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Metadata
                  </p>
                  <pre className="max-h-52 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                    {stringifyValue(selectedLog.metadata)}
                  </pre>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Old Value
                  </p>
                  <pre className="max-h-52 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                    {stringifyValue(selectedLog.oldValue)}
                  </pre>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    New Value
                  </p>
                  <pre className="max-h-52 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                    {stringifyValue(selectedLog.newValue)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
