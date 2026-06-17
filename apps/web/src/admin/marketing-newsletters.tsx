import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import {
  Plus,
  Edit,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  useNewsletters,
  useCreateNewsletter,
  useUpdateNewsletter,
  useDeleteNewsletter,
  useSendNewsletter,
  type Newsletter,
} from '@/hooks/use-admin';

const LIMIT = 20;

const STATUS_COLORS: Record<Newsletter['status'], string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SENDING:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  SENT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AdminMarketingNewslettersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [selected, setSelected] = useState<Newsletter | null>(null);

  // Form
  const [form, setForm] = useState({
    subject: '',
    content: '',
    scheduledAt: '',
  });

  const { data, isLoading } = useNewsletters({
    page,
    limit: LIMIT,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const createMutation = useCreateNewsletter();
  const updateMutation = useUpdateNewsletter();
  const deleteMutation = useDeleteNewsletter();
  const sendMutation = useSendNewsletter();

  const newsletters = data?.data?.items ?? [];
  const totalPages = data?.data?.totalPages ?? 1;

  const resetForm = () =>
    setForm({ subject: '', content: '', scheduledAt: '' });

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({
        subject: form.subject,
        content: form.content,
        scheduledAt: form.scheduledAt || undefined,
      });
      toast.success('Newsletter created');
      setCreateOpen(false);
      resetForm();
    } catch {
      toast.error('Failed to create newsletter');
    }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try {
      await updateMutation.mutateAsync({
        id: selected.id,
        subject: form.subject,
        content: form.content,
        scheduledAt: form.scheduledAt || undefined,
      });
      toast.success('Newsletter updated');
      setEditOpen(false);
      resetForm();
      setSelected(null);
    } catch {
      toast.error('Failed to update newsletter');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await deleteMutation.mutateAsync(selected.id);
      toast.success('Newsletter deleted');
      setDeleteOpen(false);
      setSelected(null);
    } catch {
      toast.error('Failed to delete newsletter');
    }
  };

  const handleSend = async () => {
    if (!selected) return;
    try {
      await sendMutation.mutateAsync(selected.id);
      toast.success('Newsletter sent!');
      setSendOpen(false);
      setSelected(null);
    } catch {
      toast.error('Failed to send newsletter');
    }
  };

  const openEdit = (nl: Newsletter) => {
    setSelected(nl);
    setForm({
      subject: nl.subject,
      content: nl.content,
      scheduledAt: nl.scheduledAt
        ? new Date(nl.scheduledAt).toISOString().slice(0, 16)
        : '',
    });
    setEditOpen(true);
  };

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Newsletters</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage newsletter campaigns
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Newsletter
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="SENDING">Sending</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Newsletters Table */}
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : newsletters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">No newsletters found</h3>
              <p className="text-sm text-muted-foreground">
                Create a newsletter to get started
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Stats</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newsletters.map((nl) => (
                    <TableRow key={nl.id}>
                      <TableCell>
                        <p className="truncate font-medium max-w-xs">
                          {nl.subject}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={STATUS_COLORS[nl.status]}
                        >
                          {nl.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {nl.scheduledAt ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(
                              new Date(nl.scheduledAt),
                              'MMM d, yyyy HH:mm',
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {nl.sentAt ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(nl.sentAt), 'MMM d, yyyy HH:mm')}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {nl.sentCount > 0 || nl.failedCount > 0
                          ? `${nl.sentCount} sent / ${nl.failedCount} failed`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {(nl.status === 'DRAFT' ||
                          nl.status === 'SCHEDULED') && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(nl)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelected(nl);
                                setSendOpen(true);
                              }}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelected(nl);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
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
                    disabled={page >= totalPages}
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Newsletter</DialogTitle>
            <DialogDescription>
              Compose a new newsletter to send to subscribers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-subject">Subject</Label>
              <Input
                id="create-subject"
                placeholder="Enter newsletter subject..."
                value={form.subject}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-content">Content (HTML)</Label>
              <Textarea
                id="create-content"
                placeholder="Newsletter HTML content..."
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                rows={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-scheduled">Schedule (optional)</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="create-scheduled"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scheduledAt: e.target.value }))
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
                !form.subject.trim() ||
                !form.content.trim() ||
                createMutation.isPending
              }
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Newsletter</DialogTitle>
            <DialogDescription>
              Update the newsletter content or schedule
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-subject">Subject</Label>
              <Input
                id="edit-subject"
                value={form.subject}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content (HTML)</Label>
              <Textarea
                id="edit-content"
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                rows={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-scheduled">Schedule (optional)</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-scheduled"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scheduledAt: e.target.value }))
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
              disabled={
                !form.subject.trim() ||
                !form.content.trim() ||
                updateMutation.isPending
              }
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Newsletter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selected?.subject}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Confirmation */}
      <AlertDialog open={sendOpen} onOpenChange={setSendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Newsletter</AlertDialogTitle>
            <AlertDialogDescription>
              This will send &quot;{selected?.subject}&quot; to all marketing
              subscribers immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>
              {sendMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
