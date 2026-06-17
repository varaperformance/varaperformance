import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  useNotes,
  useNote,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from '@/features/health';
import { useAuth } from '@/features/auth';
import { TrustBadge } from '@/components/trust-badge';
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  Lock,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Save,
  Loader2,
  Calendar,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';

type ViewMode = 'list' | 'create' | 'read' | 'edit';

// Format relative time
function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatTime = (date: string | Date) => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function NotesPage() {
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const { isLoading: isAuthLoading } = useAuth();
  const { data: notesData, isLoading: isNotesLoading } = useNotes(page, 20);
  const { data: noteData, isLoading: isNoteLoading } = useNote(
    selectedNoteId || '',
    {
      enabled: !!selectedNoteId && (viewMode === 'read' || viewMode === 'edit'),
    },
  );

  const notes = notesData?.success ? notesData.data.items : [];
  const total = notesData?.success ? notesData.data.total : 0;
  const totalPages = notesData?.success
    ? Math.ceil(notesData.data.total / notesData.data.limit)
    : 1;
  const selectedNote = noteData?.success ? noteData.data : null;

  // Mutations
  const createNote = useCreateNote({
    onSuccess: () => {
      toast.success('Note created');
      closeSheet();
    },
    onError: () => toast.error('Failed to create note'),
  });

  const updateNote = useUpdateNote({
    onSuccess: () => {
      toast.success('Note updated');
      closeSheet();
    },
    onError: () => toast.error('Failed to update note'),
  });

  const deleteNote = useDeleteNote({
    onSuccess: () => {
      toast.success('Note deleted');
      setDeleteId(null);
      if (viewMode !== 'list') {
        closeSheet();
      }
    },
    onError: () => toast.error('Failed to delete note'),
  });

  const isLoading = isAuthLoading || isNotesLoading;
  const isSheetOpen = viewMode !== 'list';

  // Open create sheet
  const openCreate = () => {
    setTitle('');
    setContent('');
    setSelectedNoteId(null);
    setViewMode('create');
  };

  // Open read sheet
  const openRead = (noteId: string) => {
    setSelectedNoteId(noteId);
    setViewMode('read');
  };

  // Close sheet and reset state
  const closeSheet = () => {
    setViewMode('list');
    setSelectedNoteId(null);
    setTitle('');
    setContent('');
  };

  // Handle create submit
  const handleCreate = () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    createNote.mutate({ title: title.trim(), content: content.trim() });
  };

  // Handle edit submit
  const handleUpdate = () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!selectedNoteId) return;
    updateNote.mutate({
      id: selectedNoteId,
      data: { title: title.trim(), content: content.trim() },
    });
  };

  // Initialize edit form when note data loads
  const initEditForm = () => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setContent(selectedNote.content);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Private Journal
            </p>
            <h1 className="text-3xl font-bold tracking-tight mt-1">
              Personal Notes
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TrustBadge
                label="Private by default"
                tooltip="Only you can view your notes unless you choose to share them."
              />
              <TrustBadge
                label="Encrypted at rest"
                showIcon={false}
                tooltip="Stored note data is encrypted while at rest."
              />
              <div className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
                {total} {total === 1 ? 'note' : 'notes'}
              </div>
            </div>
          </div>
          <Button
            onClick={openCreate}
            size="icon"
            aria-label="Create note"
            title="Create note"
            className="bg-linear-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative mt-4 rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
          <div className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Tap + to create a note, then use the card quick actions to edit or
              delete without opening the full sheet.
            </p>
          </div>
        </div>
      </section>

      {/* Empty State */}
      {notes.length === 0 ? (
        <Card className="border-dashed border-muted/70">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Start writing</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4 text-sm">
              Your notes are encrypted and only visible to you.
            </p>
            <Button
              onClick={openCreate}
              size="icon"
              aria-label="Create your first note"
              title="Create your first note"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Notes Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
            {notes.map((note) => (
              <Card
                key={note.id}
                className="group relative cursor-pointer overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                onClick={() => openRead(note.id)}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/60 via-emerald-500/60 to-primary/60 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                      {note.title || 'Untitled Note'}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="shrink-0 ml-2 text-xs"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {formatRelativeTime(note.updatedAt)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {note.content || 'No content yet...'}
                  </p>
                </div>
                {/* Action buttons - appear on hover */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-end gap-1 bg-linear-to-t from-card to-transparent p-3 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNoteId(note.id);
                      setTitle(note.title);
                      setContent(note.content);
                      setViewMode('edit');
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(note.id);
                    }}
                    className="hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 rounded-xl border bg-card/50 p-2 w-fit mx-auto">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'ghost'}
                      size="icon-sm"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit/Read Sheet */}
      <Sheet
        open={isSheetOpen}
        onOpenChange={(open: boolean) => !open && closeSheet()}
      >
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
          {/* Create Mode */}
          {viewMode === 'create' && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-primary/5">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Sparkles className="h-2.5 w-2.5" />
                    </div>
                  </div>
                  <div>
                    <SheetTitle>New Note</SheetTitle>
                    <SheetDescription className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      End-to-end encrypted
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <Input
                  placeholder="Note title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={createNote.isPending}
                  className="text-lg font-medium"
                />
                <Textarea
                  placeholder="Start writing..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={createNote.isPending}
                  className="min-h-75 resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {content.length} characters
                </p>
              </div>
              <SheetFooter className="mt-6">
                <Button
                  variant="outline"
                  onClick={closeSheet}
                  disabled={createNote.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createNote.isPending || !title.trim()}
                >
                  {createNote.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Note
                    </>
                  )}
                </Button>
              </SheetFooter>
            </>
          )}

          {/* Read Mode */}
          {viewMode === 'read' && (
            <>
              {isNoteLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : selectedNote ? (
                <>
                  <SheetHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <SheetTitle className="text-left">
                            {selectedNote.title || 'Untitled Note'}
                          </SheetTitle>
                          <SheetDescription className="flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Encrypted
                          </SheetDescription>
                        </div>
                      </div>
                    </div>
                  </SheetHeader>
                  <div className="mt-6">
                    <div className="flex gap-2 mb-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          initEditForm();
                          setViewMode('edit');
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteId(selectedNote.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {selectedNote.content ? (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {selectedNote.content}
                        </p>
                      ) : (
                        <p className="text-muted-foreground italic">
                          No content
                        </p>
                      )}
                    </div>
                    <div className="mt-8 pt-6 border-t space-y-2 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        Created {formatDate(selectedNote.createdAt)}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        Updated {formatDate(selectedNote.updatedAt)} at{' '}
                        {formatTime(selectedNote.updatedAt)}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Note not found</p>
                </div>
              )}
            </>
          )}

          {/* Edit Mode */}
          {viewMode === 'edit' && (
            <>
              {isNoteLoading && !title ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : (
                <>
                  <SheetHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Pencil className="h-5 w-5" />
                      </div>
                      <div>
                        <SheetTitle>Edit Note</SheetTitle>
                        <SheetDescription className="flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Changes encrypted automatically
                        </SheetDescription>
                      </div>
                    </div>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <Input
                      placeholder="Note title..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={updateNote.isPending}
                      className="text-lg font-medium"
                    />
                    <Textarea
                      placeholder="Start writing..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      disabled={updateNote.isPending}
                      className="min-h-75 resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      {content.length} characters
                    </p>
                  </div>
                  <SheetFooter className="mt-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (selectedNote) {
                          setViewMode('read');
                        } else {
                          closeSheet();
                        }
                      }}
                      disabled={updateNote.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdate}
                      disabled={updateNote.isPending || !title.trim()}
                    >
                      {updateNote.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </SheetFooter>
                </>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the note and all its content. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteNote.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteNote.isPending && (
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
