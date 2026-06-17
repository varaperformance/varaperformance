import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Rocket,
  X,
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import {
  useReleaseNotes,
  useCreateReleaseNote,
  useUpdateReleaseNote,
  useDeleteReleaseNote,
  type ReleaseNote,
} from '@/features/release-notes';

export default function ReleaseNotesManagementPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // Create/Edit Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReleaseNote | null>(null);
  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'MAJOR' | 'MINOR' | 'PATCH'>('MINOR');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>(
    'DRAFT',
  );
  const [publishedAt, setPublishedAt] = useState('');
  const [highlights, setHighlights] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [fixes, setFixes] = useState<string[]>([]);

  // Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<ReleaseNote | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data: releasesData, isLoading } = useReleaseNotes({
    search: debouncedSearch,
    page,
    limit: 20,
    type: typeFilter,
    status: statusFilter,
  });

  const createRelease = useCreateReleaseNote();
  const updateRelease = useUpdateReleaseNote();
  const deleteRelease = useDeleteReleaseNote();

  const releases = releasesData?.data?.items ?? [];
  const total = releasesData?.data?.total ?? 0;
  const limit = releasesData?.data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit) || 1;

  const resetDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setVersion('');
    setTitle('');
    setType('MINOR');
    setStatus('DRAFT');
    setPublishedAt('');
    setHighlights([]);
    setFeatures([]);
    setImprovements([]);
    setFixes([]);
  };

  const openEditDialog = (release: ReleaseNote) => {
    setEditing(release);
    setVersion(release.version);
    setTitle(release.title ?? '');
    setType(release.type);
    setStatus(release.status);
    setPublishedAt(
      release.publishedAt
        ? new Date(release.publishedAt).toISOString().slice(0, 16)
        : '',
    );
    setHighlights(release.highlights);
    setFeatures(release.features);
    setImprovements(release.improvements);
    setFixes(release.fixes);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      version,
      title: title || undefined,
      type,
      status,
      publishedAt: publishedAt
        ? new Date(publishedAt).toISOString()
        : undefined,
      highlights,
      features,
      improvements,
      fixes,
    };

    if (editing) {
      updateRelease.mutate(
        { id: editing.id, data },
        { onSuccess: resetDialog },
      );
    } else {
      createRelease.mutate(data, { onSuccess: resetDialog });
    }
  };

  const handleDelete = () => {
    if (deleting) {
      deleteRelease.mutate(deleting.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setDeleting(null);
        },
      });
    }
  };

  const getTypeBadge = (t: ReleaseNote['type']) => {
    switch (t) {
      case 'MAJOR':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/30">
            Major
          </Badge>
        );
      case 'MINOR':
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">
            Minor
          </Badge>
        );
      case 'PATCH':
        return (
          <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/30">
            Patch
          </Badge>
        );
    }
  };

  const getStatusBadge = (s: ReleaseNote['status']) => {
    switch (s) {
      case 'DRAFT':
        return <Badge variant="outline">Draft</Badge>;
      case 'PUBLISHED':
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
            Published
          </Badge>
        );
      case 'ARCHIVED':
        return <Badge variant="secondary">Archived</Badge>;
    }
  };

  const isSaving = createRelease.isPending || updateRelease.isPending;

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Release Notes</h1>
          <p className="text-muted-foreground mt-1">
            Manage release notes and changelogs
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search releases..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={typeFilter ?? 'all'}
            onValueChange={(v) => {
              setTypeFilter(v === 'all' ? undefined : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32.5">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="MAJOR">Major</SelectItem>
              <SelectItem value="MINOR">Minor</SelectItem>
              <SelectItem value="PATCH">Patch</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter ?? 'all'}
            onValueChange={(v) => {
              setStatusFilter(v === 'all' ? undefined : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-35">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Release
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Edit Release Note' : 'Create Release Note'}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? 'Update release note details'
                  : 'Add a new release note'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g., 2.1.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title (optional)</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Spring Update"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v as typeof type)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MAJOR">Major</SelectItem>
                      <SelectItem value="MINOR">Minor</SelectItem>
                      <SelectItem value="PATCH">Patch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as typeof status)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PUBLISHED">Published</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="publishedAt">Published At</Label>
                  <Input
                    id="publishedAt"
                    type="datetime-local"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                  />
                </div>
              </div>

              <StringListField
                label="Highlights"
                items={highlights}
                onChange={setHighlights}
                placeholder="Add a highlight..."
              />

              <StringListField
                label="New Features"
                items={features}
                onChange={setFeatures}
                placeholder="Add a feature..."
              />

              <StringListField
                label="Improvements"
                items={improvements}
                onChange={setImprovements}
                placeholder="Add an improvement..."
              />

              <StringListField
                label="Bug Fixes"
                items={fixes}
                onChange={setFixes}
                placeholder="Add a bug fix..."
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!version || isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : releases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Rocket className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No release notes</p>
              <p className="text-sm text-muted-foreground">
                Create your first release note to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {releases.map((release) => (
                  <TableRow key={release.id}>
                    <TableCell className="font-mono font-medium">
                      v{release.version}
                    </TableCell>
                    <TableCell className="max-w-50 truncate">
                      {release.title || '—'}
                    </TableCell>
                    <TableCell>{getTypeBadge(release.type)}</TableCell>
                    <TableCell>{getStatusBadge(release.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {release.highlights.length > 0 && (
                          <span
                            className="text-xs text-primary"
                            title="Highlights"
                          >
                            ✦{release.highlights.length}
                          </span>
                        )}
                        {release.features.length > 0 && (
                          <span
                            className="text-xs text-green-500"
                            title="Features"
                          >
                            +{release.features.length}
                          </span>
                        )}
                        {release.improvements.length > 0 && (
                          <span
                            className="text-xs text-blue-500"
                            title="Improvements"
                          >
                            ↑{release.improvements.length}
                          </span>
                        )}
                        {release.fixes.length > 0 && (
                          <span
                            className="text-xs text-orange-500"
                            title="Fixes"
                          >
                            ✓{release.fixes.length}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {release.publishedAt
                        ? new Date(release.publishedAt).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(release)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleting(release);
                            setDeleteDialogOpen(true);
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of{' '}
            {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Release Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete v{deleting?.version}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRelease.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== String List Field ====================

function StringListField({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState('');

  const addItem = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onChange([...items, trimmed]);
      setInputValue('');
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/50 px-3 py-1.5 text-sm"
            >
              <span className="flex-1">{item}</span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
