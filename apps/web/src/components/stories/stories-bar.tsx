import { useState, useRef } from 'react';
import { Plus, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pickImage } from '@/lib/camera';
import {
  useStories,
  useCreateStory,
  useUploadStoryMedia,
  type ElevateStoryGroup,
} from '@/features/social';
import { StoryViewer } from './story-viewer';
import { useAuth } from '@/features/auth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

export function StoriesBar() {
  const { user, profile } = useAuth();
  const { data: storiesData, isLoading } = useStories();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const groups: ElevateStoryGroup[] = storiesData?.data?.groups || [];

  // Check if current user has a story
  const userHasStory = groups.some(
    (g: ElevateStoryGroup) => g.user.id === user?.sub,
  );
  const userStoryIndex = groups.findIndex(
    (g: ElevateStoryGroup) => g.user.id === user?.sub,
  );

  const openViewer = (groupIndex: number) => {
    setSelectedGroupIndex(groupIndex);
    setViewerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 px-4 py-2 overflow-x-auto">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-12 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="w-full">
        <div className="flex gap-4 px-4 py-2">
          {/* Create story button (or view own story) */}
          {userHasStory ? (
            <StoryAvatar
              group={groups[userStoryIndex]}
              onClick={() => openViewer(userStoryIndex)}
              isOwn
            />
          ) : (
            <button
              className="flex flex-col items-center gap-1.5 shrink-0"
              onClick={() => setCreateOpen(true)}
            >
              <div className="relative h-16 w-16">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt="Your story"
                    className="h-16 w-16 shrink-0 rounded-full border-2 border-muted object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <Skeleton className="h-16 w-16 rounded-full border-2 border-muted" />
                )}
                <div className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                  <Plus className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">Your story</span>
            </button>
          )}

          {/* Other users' stories */}
          {groups
            .filter((g: ElevateStoryGroup) => g.user.id !== user?.sub)
            .map((group: ElevateStoryGroup) => {
              const actualIndex = groups.findIndex(
                (g: ElevateStoryGroup) => g.user.id === group.user.id,
              );
              return (
                <StoryAvatar
                  key={group.user.id}
                  group={group}
                  onClick={() => openViewer(actualIndex)}
                />
              );
            })}

          {/* Add story button if user already has stories */}
          {userHasStory && (
            <button
              className="flex flex-col items-center gap-1.5 shrink-0"
              onClick={() => setCreateOpen(true)}
            >
              <div className="h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center hover:border-primary transition-colors">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Add</span>
            </button>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Story Viewer */}
      {viewerOpen && groups.length > 0 && (
        <StoryViewer
          groups={groups}
          initialGroupIndex={selectedGroupIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {/* Create Story Dialog */}
      <CreateStoryDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

interface StoryAvatarProps {
  group: ElevateStoryGroup;
  onClick: () => void;
  isOwn?: boolean;
}

function StoryAvatar({ group, onClick, isOwn }: StoryAvatarProps) {
  const hasUnviewed = group.stories.some((s) => !s.hasViewed);

  return (
    <button
      className="flex flex-col items-center gap-1.5 shrink-0"
      onClick={onClick}
    >
      <div
        className={cn(
          'h-16 w-16 rounded-full p-0.5',
          hasUnviewed
            ? 'bg-linear-to-tr from-amber-500 via-rose-500 to-purple-500'
            : 'bg-muted',
        )}
      >
        {group.user.avatarUrl ? (
          <img
            src={group.user.avatarUrl}
            alt={group.user.displayName || 'User'}
            className="h-full w-full shrink-0 rounded-full border-2 border-background object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Skeleton className="h-full w-full rounded-full border-2 border-background" />
        )}
      </div>
      <span className="text-xs text-muted-foreground truncate max-w-16">
        {isOwn ? 'Your story' : group.user.displayName || 'Anonymous'}
      </span>
    </button>
  );
}

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateStoryDialog({ open, onOpenChange }: CreateStoryDialogProps) {
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMedia = useUploadStoryMedia();
  const createStory = useCreateStory({
    onSuccess: () => {
      toast.success('Story created!');
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to create story');
    },
  });

  const resetForm = () => {
    setCaption('');
    setPreview(null);
    setMediaType('IMAGE');
    setSelectedFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (file.type.startsWith('image/')) {
      setMediaType('IMAGE');
    } else if (file.type.startsWith('video/')) {
      setMediaType('VIDEO');
    } else {
      toast.error('Please select an image or video file');
      return;
    }

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    try {
      // Upload the media file
      const uploadResult = await uploadMedia.mutateAsync(selectedFile);

      // Create the story
      createStory.mutate({
        mediaUrl: uploadResult.url,
        mediaType,
        caption: caption || undefined,
      });
    } catch {
      toast.error('Failed to upload media');
    }
  };

  const isSubmitting = uploadMedia.isPending || createStory.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Preview / Upload area */}
          {preview ? (
            <div className="relative aspect-9/16 max-h-75 w-full overflow-hidden rounded-lg bg-muted">
              {mediaType === 'IMAGE' ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="h-full w-full object-contain"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <video
                  src={preview}
                  className="h-full w-full object-contain"
                  controls
                  muted
                />
              )}
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-2 right-2"
                onClick={async () => {
                  const result = await pickImage();
                  if (result.file) {
                    setSelectedFile(result.file);
                    setMediaType('IMAGE');
                    setPreview(URL.createObjectURL(result.file));
                    return;
                  }
                  if (!result.native) fileInputRef.current?.click();
                }}
              >
                Change
              </Button>
            </div>
          ) : (
            <button
              className="flex aspect-9/16 max-h-75 w-full flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors"
              onClick={async () => {
                const result = await pickImage();
                if (result.file) {
                  setSelectedFile(result.file);
                  setMediaType('IMAGE');
                  setPreview(URL.createObjectURL(result.file));
                  return;
                }
                if (!result.native) fileInputRef.current?.click();
              }}
            >
              <Camera className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Add photo or video</p>
                <p className="text-xs text-muted-foreground">Max 50MB</p>
              </div>
            </button>
          )}

          {/* Caption */}
          <Textarea
            placeholder="Add a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            maxLength={500}
          />

          {/* Submit */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!selectedFile || isSubmitting}
            >
              {isSubmitting ? 'Sharing...' : 'Share Story'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
