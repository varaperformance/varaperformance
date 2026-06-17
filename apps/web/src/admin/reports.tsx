import { useState } from 'react';
import {
  useAdminElevateReports,
  useUpdateElevateReportStatus,
  useAdminDeleteElevatePost,
  type AdminElevateReport,
} from '@/hooks/use-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ChevronLeft,
  ChevronRight,
  Loader2,
  Flag,
  Eye,
  XCircle,
  Trash2,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  REVIEWED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  RESOLVED: 'bg-green-500/10 text-green-600 border-green-500/20',
  DISMISSED: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

const reasonLabels: Record<string, string> = {
  SPAM: 'Spam',
  HARASSMENT: 'Harassment',
  HATE_SPEECH: 'Hate Speech',
  VIOLENCE: 'Violence',
  NUDITY: 'Nudity',
  FALSE_INFO: 'False Information',
  SCAM: 'Scam',
  OTHER: 'Other',
};

const DEFAULT_AVATAR = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#6366f1" rx="50"/><circle cx="50" cy="38" r="16" fill="white" opacity=".85"/><ellipse cx="50" cy="80" rx="28" ry="20" fill="white" opacity=".85"/></svg>')}`;

export default function AdminReports() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Dialog states
  const [selectedReport, setSelectedReport] =
    useState<AdminElevateReport | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string>('');
  const [reviewNote, setReviewNote] = useState('');
  const [deletePostId, setDeletePostId] = useState<string | null>(null);

  const { data: reportsData, isLoading } = useAdminElevateReports({
    page,
    limit: 20,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    reason: reasonFilter !== 'all' ? reasonFilter : undefined,
  });

  const updateReportStatus = useUpdateElevateReportStatus();
  const deletePost = useAdminDeleteElevatePost();

  const reports = reportsData?.data?.reports ?? [];
  const pagination = reportsData?.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const handleOpenReview = (report: AdminElevateReport) => {
    setSelectedReport(report);
    setReviewStatus(report.status);
    setReviewNote(report.reviewNote || '');
    setReviewDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedReport) return;

    try {
      await updateReportStatus.mutateAsync({
        reportId: selectedReport.id,
        status: reviewStatus,
        reviewNote: reviewNote || undefined,
      });
      toast.success('Report status updated');
      setReviewDialogOpen(false);
      setSelectedReport(null);
    } catch {
      toast.error('Failed to update report status');
    }
  };

  const handleDeletePost = async () => {
    if (!deletePostId) return;

    try {
      await deletePost.mutateAsync(deletePostId);
      toast.success('Post deleted');
      setDeletePostId(null);
    } catch {
      toast.error('Failed to delete post');
    }
  };

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reported Posts</h1>
          <p className="text-muted-foreground mt-1">
            Review and moderate reported Elevate posts
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-45">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REVIEWED">Reviewed</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="DISMISSED">Dismissed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={reasonFilter}
              onValueChange={(val) => {
                setReasonFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-45">
                <SelectValue placeholder="Filter by reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                <SelectItem value="SPAM">Spam</SelectItem>
                <SelectItem value="HARASSMENT">Harassment</SelectItem>
                <SelectItem value="HATE_SPEECH">Hate Speech</SelectItem>
                <SelectItem value="VIOLENCE">Violence</SelectItem>
                <SelectItem value="NUDITY">Nudity</SelectItem>
                <SelectItem value="FALSE_INFO">False Information</SelectItem>
                <SelectItem value="SCAM">Scam</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Flag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">No reported posts</h3>
              <p className="text-sm text-muted-foreground">
                {statusFilter !== 'all' || reasonFilter !== 'all'
                  ? 'No reports match your filters'
                  : 'There are no reported posts to review'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Post</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reported</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm line-clamp-2">
                            {report.post.content}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {report.post.type}
                            </Badge>
                            {report.post.images.length > 0 && (
                              <span className="flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                {report.post.images.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img
                            src={report.post.author.avatarUrl || DEFAULT_AVATAR}
                            alt=""
                            className="h-6 w-6 shrink-0 rounded-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                          <span className="text-sm">
                            {report.post.author.displayName || 'Anonymous'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img
                            src={report.reporter.avatarUrl || DEFAULT_AVATAR}
                            alt=""
                            className="h-6 w-6 shrink-0 rounded-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                          <span className="text-sm">
                            {report.reporter.displayName || 'Anonymous'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {reasonLabels[report.reason] || report.reason}
                        </Badge>
                        {report.details && (
                          <p
                            className="text-xs text-muted-foreground mt-1 max-w-32 truncate"
                            title={report.details}
                          >
                            {report.details}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'border',
                            statusColors[report.status] || statusColors.PENDING,
                          )}
                        >
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(report.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Review report"
                            onClick={() => handleOpenReview(report)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {report.status === 'PENDING' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Dismiss report"
                                onClick={() => {
                                  setSelectedReport(report);
                                  setReviewStatus('DISMISSED');
                                  setReviewNote('');
                                  handleUpdateStatus();
                                }}
                              >
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Delete post"
                                onClick={() => setDeletePostId(report.postId)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({pagination.total} reports)
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
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>
              Review the reported post and update its status
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              {/* Post Preview */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <img
                    src={selectedReport.post.author.avatarUrl || DEFAULT_AVATAR}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {selectedReport.post.author.displayName || 'Anonymous'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(
                        new Date(selectedReport.post.createdAt),
                        "MMM d, yyyy 'at' h:mm a",
                      )}
                    </p>
                  </div>
                </div>
                <p className="text-sm">{selectedReport.post.content}</p>
                {selectedReport.post.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {selectedReport.post.images.slice(0, 4).map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Post image ${i + 1}`}
                        className="h-20 w-20 rounded object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ))}
                    {selectedReport.post.images.length > 4 && (
                      <div className="h-20 w-20 rounded bg-muted flex items-center justify-center text-sm text-muted-foreground">
                        +{selectedReport.post.images.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Report Info */}
              <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                <div className="flex items-center gap-2 text-sm">
                  <Flag className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Reported for:</span>
                  <Badge variant="outline">
                    {reasonLabels[selectedReport.reason]}
                  </Badge>
                </div>
                {selectedReport.details && (
                  <p className="text-sm text-muted-foreground pl-6">
                    "{selectedReport.details}"
                  </p>
                )}
                <div className="flex items-center gap-2 text-sm pl-6">
                  <span className="text-muted-foreground">by</span>
                  <img
                    src={selectedReport.reporter.avatarUrl || DEFAULT_AVATAR}
                    alt=""
                    className="h-5 w-5 shrink-0 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <span>
                    {selectedReport.reporter.displayName || 'Anonymous'}
                  </span>
                </div>
              </div>

              {/* Status Update */}
              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="REVIEWED">Reviewed</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="DISMISSED">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Review Note (optional)</Label>
                <Textarea
                  placeholder="Add a note about this review..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedReport) {
                  setDeletePostId(selectedReport.postId);
                  setReviewDialogOpen(false);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Post
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateReportStatus.isPending}
            >
              {updateReportStatus.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletePostId}
        onOpenChange={(open) => !open && setDeletePostId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete this post?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the post and resolve all pending
              reports against it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePost.isPending ? 'Deleting...' : 'Delete Post'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
