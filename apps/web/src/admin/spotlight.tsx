import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  Check,
  Edit,
  Loader2,
  Plus,
  ShieldX,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';
import {
  useCreateSpotlight,
  useDeleteSpotlight,
  useSpotlights,
  useUpdateSpotlight,
} from '@/features/spotlight';
import type { SpotlightStory } from '@varaperformance/core';

const DEFAULT_FORM = {
  slug: '',
  name: '',
  username: '',
  imageUrl: '',
  videoUrl: '',
  tagline: '',
  story: '',
  achievements: '',
  sport: '',
  memberSince: '',
  quote: '',
  reviewNotes: '',
  twitterUrl: '',
  instagramUrl: '',
  featured: false,
  status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  isActive: true,
  publishedAt: '',
};

type SpotlightView = 'ALL' | 'PENDING' | 'ACTIVE' | 'FEATURED';

function toLocalDateTimeInput(value?: string | Date | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function AdminSpotlightPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const [view, setView] = useState<SpotlightView>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<SpotlightStory | null>(null);
  const [deletingStory, setDeletingStory] = useState<SpotlightStory | null>(
    null,
  );
  const [form, setForm] = useState(DEFAULT_FORM);

  const debouncedSearch = useDebounce(search, 300);

  const queryFilters = useMemo(() => {
    if (view === 'PENDING') {
      return { status: 'DRAFT', isActive: false, featured: undefined };
    }
    if (view === 'ACTIVE') {
      return { status: 'PUBLISHED', isActive: true, featured: undefined };
    }
    if (view === 'FEATURED') {
      return { featured: true, status: undefined, isActive: undefined };
    }
    return {
      status: status === 'ALL' ? undefined : status,
      isActive: undefined,
      featured: undefined,
    };
  }, [status, view]);

  const { data, isLoading } = useSpotlights({
    page,
    limit: 15,
    search: debouncedSearch || undefined,
    status: queryFilters.status,
    isActive: queryFilters.isActive,
    featured: queryFilters.featured,
  });

  const createSpotlight = useCreateSpotlight();
  const updateSpotlight = useUpdateSpotlight();
  const deleteSpotlight = useDeleteSpotlight();

  const stories = data?.data.items ?? [];
  const total = data?.data.total ?? 0;
  const totalPages = data?.data.totalPages ?? 1;

  const pending = createSpotlight.isPending || updateSpotlight.isPending;

  const canSubmit = useMemo(() => {
    return (
      form.slug &&
      form.name &&
      form.imageUrl &&
      form.tagline &&
      form.story &&
      form.sport
    );
  }, [form]);

  const resetForm = () => {
    setEditingStory(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(false);
  };

  const openCreateDialog = () => {
    setEditingStory(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (story: SpotlightStory) => {
    setEditingStory(story);
    setForm({
      slug: story.slug,
      name: story.name,
      username: story.username ?? '',
      imageUrl: story.imageUrl,
      videoUrl: story.videoUrl ?? '',
      tagline: story.tagline,
      story: story.story,
      achievements: story.achievements.join('\n'),
      sport: story.sport,
      memberSince: toLocalDateTimeInput(story.memberSince),
      quote: story.quote ?? '',
      reviewNotes: story.reviewNotes ?? '',
      twitterUrl: story.twitterUrl ?? '',
      instagramUrl: story.instagramUrl ?? '',
      featured: story.featured,
      status: story.status,
      isActive: story.isActive,
      publishedAt: toLocalDateTimeInput(story.publishedAt),
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      username: form.username.trim() || undefined,
      imageUrl: form.imageUrl.trim(),
      videoUrl: form.videoUrl.trim() || undefined,
      tagline: form.tagline.trim(),
      story: form.story.trim(),
      achievements: form.achievements
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
      sport: form.sport.trim(),
      memberSince: form.memberSince
        ? new Date(form.memberSince).toISOString()
        : undefined,
      quote: form.quote.trim() || undefined,
      reviewNotes: form.reviewNotes.trim() || undefined,
      twitterUrl: form.twitterUrl.trim() || undefined,
      instagramUrl: form.instagramUrl.trim() || undefined,
      featured: form.featured,
      status: form.status,
      isActive: form.isActive,
      publishedAt: form.publishedAt
        ? new Date(form.publishedAt).toISOString()
        : undefined,
    };

    if (editingStory) {
      updateSpotlight.mutate(
        { id: editingStory.id, data: payload },
        { onSuccess: resetForm },
      );
      return;
    }

    createSpotlight.mutate(payload, { onSuccess: resetForm });
  };

  const handleDelete = () => {
    if (!deletingStory) {
      return;
    }

    deleteSpotlight.mutate(deletingStory.id, {
      onSuccess: () => {
        setDeletingStory(null);
        setDeleteDialogOpen(false);
      },
    });
  };

  const handleActivate = (story: SpotlightStory) => {
    updateSpotlight.mutate(
      {
        id: story.id,
        data: {
          status: 'PUBLISHED',
          isActive: true,
          publishedAt: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => toast.success('Story activated'),
        onError: () => toast.error('Failed to activate story'),
      },
    );
  };

  const handleDecline = (story: SpotlightStory) => {
    updateSpotlight.mutate(
      {
        id: story.id,
        data: {
          status: 'ARCHIVED',
          isActive: false,
          featured: false,
        },
      },
      {
        onSuccess: () => toast.success('Story declined'),
        onError: () => toast.error('Failed to decline story'),
      },
    );
  };

  const handleFeature = (story: SpotlightStory) => {
    updateSpotlight.mutate(
      {
        id: story.id,
        data: {
          featured: true,
          status: 'PUBLISHED',
          isActive: true,
          publishedAt: story.publishedAt ?? new Date().toISOString(),
        },
      },
      {
        onSuccess: () => toast.success('Story featured'),
        onError: () => toast.error('Failed to feature story'),
      },
    );
  };

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Spotlight Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Curate member stories displayed on the public spotlight page.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full gap-3 sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              className="pl-10"
              placeholder="Search spotlight stories"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Story
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingStory
                  ? 'Edit Spotlight Story'
                  : 'Create Spotlight Story'}
              </DialogTitle>
              <DialogDescription>
                Stories marked as featured are displayed first on `/spotlight`.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      slug: event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]+/g, '-')
                        .replace(/^-+|-+$/g, ''),
                    }))
                  }
                  placeholder="marcus-thompson"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Marcus Thompson"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      username: event.target.value,
                    }))
                  }
                  placeholder="@marcusliftsheavy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sport">Sport</Label>
                <Input
                  id="sport"
                  value={form.sport}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, sport: event.target.value }))
                  }
                  placeholder="Powerlifting"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={form.imageUrl}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      imageUrl: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="videoUrl">Video URL (optional)</Label>
                <Input
                  id="videoUrl"
                  value={form.videoUrl}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      videoUrl: event.target.value,
                    }))
                  }
                  placeholder="https://www.youtube.com/embed/..."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={form.tagline}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      tagline: event.target.value,
                    }))
                  }
                  placeholder="From desk job to deadlift PR"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="story">Story</Label>
                <Textarea
                  id="story"
                  rows={5}
                  value={form.story}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, story: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="achievements">
                  Achievements (one per line)
                </Label>
                <Textarea
                  id="achievements"
                  rows={4}
                  value={form.achievements}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      achievements: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quote">Quote (optional)</Label>
                <Textarea
                  id="quote"
                  rows={3}
                  value={form.quote}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, quote: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewNotes">Review Notes (optional)</Label>
                <Textarea
                  id="reviewNotes"
                  rows={3}
                  value={form.reviewNotes}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      reviewNotes: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberSince">Member Since (optional)</Label>
                <Input
                  id="memberSince"
                  type="datetime-local"
                  value={form.memberSince}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      memberSince: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitterUrl">Twitter URL (optional)</Label>
                <Input
                  id="twitterUrl"
                  value={form.twitterUrl}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      twitterUrl: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagramUrl">Instagram URL (optional)</Label>
                <Input
                  id="instagramUrl"
                  value={form.instagramUrl}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      instagramUrl: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') =>
                    setForm((prev) => ({ ...prev, status: value }))
                  }
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
                <Label htmlFor="publishedAt">Publish At (optional)</Label>
                <Input
                  id="publishedAt"
                  type="datetime-local"
                  value={form.publishedAt}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      publishedAt: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">Featured Story</p>
                  <p className="text-sm text-muted-foreground">
                    Only one story can be featured at a time.
                  </p>
                </div>
                <Switch
                  checked={form.featured}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, featured: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">Active</p>
                  <p className="text-sm text-muted-foreground">
                    Inactive stories are hidden from public view.
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button disabled={!canSubmit || pending} onClick={handleSubmit}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingStory ? (
                  'Update Story'
                ) : (
                  'Create Story'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={view === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('ALL')}
        >
          All
        </Button>
        <Button
          variant={view === 'PENDING' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('PENDING')}
        >
          Pending
        </Button>
        <Button
          variant={view === 'ACTIVE' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('ACTIVE')}
        >
          Active
        </Button>
        <Button
          variant={view === 'FEATURED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('FEATURED')}
        >
          Featured
        </Button>
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : stories.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No spotlight stories found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Story</TableHead>
                  <TableHead>Submitter</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="w-30">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stories.map((story) => (
                  <TableRow key={story.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          {story.name}
                          {story.featured && (
                            <Badge className="gap-1" variant="default">
                              <Star className="h-3 w-3" />
                              Featured
                            </Badge>
                          )}
                        </div>
                        <p className="line-clamp-1 text-sm text-muted-foreground">
                          {story.tagline}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {story.submitterEmail ?? 'Team entry'}
                      </div>
                    </TableCell>
                    <TableCell>{story.sport}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          story.status === 'PUBLISHED'
                            ? 'default'
                            : story.status === 'DRAFT'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {story.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={story.isActive ? 'default' : 'secondary'}>
                        {story.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {story.publishedAt
                        ? format(new Date(story.publishedAt), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Activate"
                          onClick={() => handleActivate(story)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Decline"
                          onClick={() => handleDecline(story)}
                        >
                          <ShieldX className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Feature"
                          onClick={() => handleFeature(story)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(story)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeletingStory(story);
                            setDeleteDialogOpen(true);
                          }}
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

      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">{total} total stories</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete spotlight story?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The story will be removed from admin
              and public views.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteSpotlight.isPending}
            >
              {deleteSpotlight.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
