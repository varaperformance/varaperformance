import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
  Plus,
  Search,
  Edit,
  Trash2,
  Tag,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { format } from 'date-fns';
import {
  useAdminTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  type AdminTag,
} from '@/hooks/use-admin';

export default function TagManagementPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Create/Edit Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<AdminTag | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagSlug, setTagSlug] = useState('');

  // Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTag, setDeletingTag] = useState<AdminTag | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Queries & Mutations
  const { data: tagsData, isLoading } = useAdminTags({
    search: debouncedSearch,
    page,
    limit: 20,
  });

  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const tags = tagsData?.data?.items ?? [];
  const total = tagsData?.data?.total ?? 0;
  const limit = tagsData?.data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit) || 1;

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingTag(null);
    setTagName('');
    setTagSlug('');
  };

  const openEditDialog = (tag: AdminTag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagSlug(tag.slug);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      name: tagName,
      slug: tagSlug,
    };

    if (editingTag) {
      updateTag.mutate(
        { id: editingTag.id, ...data },
        { onSuccess: resetDialog },
      );
    } else {
      createTag.mutate(data, { onSuccess: resetDialog });
    }
  };

  const handleDelete = () => {
    if (deletingTag) {
      deleteTag.mutate(deletingTag.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setDeletingTag(null);
        },
      });
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setTagName(name);
    if (!editingTag) {
      setTagSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      );
    }
  };

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tag Management</h1>
          <p className="text-muted-foreground mt-1">Manage blog tags</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTag ? 'Edit Tag' : 'Create Tag'}
              </DialogTitle>
              <DialogDescription>
                {editingTag
                  ? 'Update tag details'
                  : 'Add a new tag for blog posts'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={tagName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Nutrition"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={tagSlug}
                  onChange={(e) => setTagSlug(e.target.value)}
                  placeholder="e.g., nutrition"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !tagName ||
                  !tagSlug ||
                  createTag.isPending ||
                  updateTag.isPending
                }
              >
                {createTag.isPending || updateTag.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingTag ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tags..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
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
          ) : tags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Tag className="mb-4 h-12 w-12" />
              <p>No tags found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Posts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag: AdminTag) => (
                  <TableRow key={tag.id}>
                    <TableCell className="font-medium">{tag.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-2 py-1 text-sm">
                        {tag.slug}
                      </code>
                    </TableCell>
                    <TableCell>{tag._count.posts}</TableCell>
                    <TableCell>
                      {format(new Date(tag.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(tag)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingTag(tag);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={tag._count.posts > 0}
                        >
                          <Trash2 className="h-4 w-4" />
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
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)}{' '}
            of {total} tags
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
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
              disabled={page === totalPages}
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
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTag?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTag.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
