import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
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
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Trash2,
} from 'lucide-react';
import type { ElevateStoryGroup } from '@/features/social';
import { useViewStory, useDeleteStory } from '@/features/social';
import { toast } from 'sonner';
import { hapticsLight } from '@/lib/haptics';
import { useAuth } from '@/features/auth';

interface StoryViewerProps {
  groups: ElevateStoryGroup[];
  initialGroupIndex?: number;
  initialStoryIndex?: number;
  onClose: () => void;
}

const DEFAULT_AVATAR = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#6366f1" rx="50"/><circle cx="50" cy="38" r="16" fill="white" opacity=".85"/><ellipse cx="50" cy="80" rx="28" ry="20" fill="white" opacity=".85"/></svg>')}`;
const STORY_DURATION = 5000; // 5 seconds for images

export function StoryViewer({
  groups,
  initialGroupIndex = 0,
  initialStoryIndex = 0,
  onClose,
}: StoryViewerProps) {
  const { user } = useAuth();
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [deleteStoryId, setDeleteStoryId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);

  const viewStory = useViewStory();
  const deleteStory = useDeleteStory({
    onSuccess: () => {
      toast.success('Story deleted');
      // Move to next story or close
      handleNext();
    },
    onError: () => {
      toast.error('Failed to delete story');
    },
  });

  const currentGroup = groups[currentGroupIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];
  const isOwnStory = currentGroup?.user.id === user?.sub;

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && !currentStory.hasViewed) {
      viewStory.mutate(currentStory.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStory?.id]);

  // Handle next story
  const handleNext = useCallback(() => {
    if (!currentGroup) return;

    if (currentStoryIndex < currentGroup.stories.length - 1) {
      // Next story in same group
      void hapticsLight();
      setCurrentStoryIndex(currentStoryIndex + 1);
      setProgress(0);
    } else if (currentGroupIndex < groups.length - 1) {
      // Next group
      void hapticsLight();
      setCurrentGroupIndex(currentGroupIndex + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    } else {
      // End of all stories
      onClose();
    }
  }, [
    currentGroup,
    currentStoryIndex,
    currentGroupIndex,
    groups.length,
    onClose,
  ]);

  // Handle previous story
  const handlePrev = useCallback(() => {
    if (currentStoryIndex > 0) {
      // Previous story in same group
      setCurrentStoryIndex(currentStoryIndex - 1);
      setProgress(0);
    } else if (currentGroupIndex > 0) {
      // Previous group (go to last story)
      const prevGroup = groups[currentGroupIndex - 1];
      setCurrentGroupIndex(currentGroupIndex - 1);
      setCurrentStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  }, [currentStoryIndex, currentGroupIndex, groups]);

  // Auto-advance for images / video end
  useEffect(() => {
    if (!currentStory || isPaused) return;

    if (currentStory.mediaType === 'IMAGE') {
      startTimeRef.current = Date.now();

      const animate = () => {
        if (isPaused) return;
        const elapsed = Date.now() - startTimeRef.current;
        const newProgress = Math.min((elapsed / STORY_DURATION) * 100, 100);
        setProgress(newProgress);

        if (newProgress >= 100) {
          handleNext();
        } else {
          timerRef.current = setTimeout(animate, 50);
        }
      };

      timerRef.current = setTimeout(animate, 50);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentStory, isPaused, handleNext]);

  // Handle video progress
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const progress =
        (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progress);
    }
  };

  const handleVideoEnded = () => {
    handleNext();
  };

  // Pause/resume
  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const newPaused = !prev;
      if (videoRef.current) {
        if (newPaused) {
          videoRef.current.pause();
        } else {
          videoRef.current.play();
        }
      }
      return newPaused;
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case ' ':
          e.preventDefault();
          togglePause();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, onClose, togglePause]);

  // Touch handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const screenWidth = window.innerWidth;

    if (touch.clientX < screenWidth / 3) {
      handlePrev();
    } else if (touch.clientX > (screenWidth * 2) / 3) {
      handleNext();
    } else {
      togglePause();
    }
  };

  if (!currentGroup || !currentStory) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Story container */}
      <div
        className="relative w-full h-full max-w-lg mx-auto"
        onTouchStart={handleTouchStart}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
          {currentGroup.stories.map((story, index) => (
            <div
              key={story.id}
              className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width:
                    index < currentStoryIndex
                      ? '100%'
                      : index === currentStoryIndex
                        ? `${progress}%`
                        : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4">
          <Link
            to={`/elevate/${currentGroup.user.id}`}
            className="flex items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentGroup.user.avatarUrl || DEFAULT_AVATAR}
              alt={currentGroup.user.displayName || 'User'}
              className="h-10 w-10 shrink-0 rounded-full border-2 border-white object-cover"
              loading="lazy"
              decoding="async"
            />
            <div>
              <p className="text-white font-medium text-sm">
                {currentGroup.user.displayName || 'Anonymous'}
              </p>
              <p className="text-white/70 text-xs">
                {new Date(currentStory.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {currentStory.mediaType === 'VIDEO' && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted;
                  }
                }}
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                togglePause();
              }}
            >
              {isPaused ? (
                <Play className="h-5 w-5" />
              ) : (
                <Pause className="h-5 w-5" />
              )}
            </Button>
            {isOwnStory && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteStoryId(currentStory.id);
                }}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Media content */}
        <div className="h-full flex items-center justify-center">
          {currentStory.mediaType === 'IMAGE' ? (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="max-h-full max-w-full object-contain"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              className="max-h-full max-w-full object-contain"
              autoPlay
              muted={isMuted}
              playsInline
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
              onPause={() => setIsPaused(true)}
              onPlay={() => setIsPaused(false)}
            />
          )}
        </div>

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-20 left-0 right-0 z-20 px-4">
            <p className="text-white text-center text-sm bg-black/40 rounded-lg p-3">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* Navigation arrows (desktop) */}
        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors hidden md:flex"
          onClick={handlePrev}
          disabled={currentGroupIndex === 0 && currentStoryIndex === 0}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors hidden md:flex"
          onClick={handleNext}
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Click areas for mobile */}
        <div className="absolute inset-0 z-10 flex">
          <div className="w-1/3 h-full" onClick={handlePrev} />
          <div className="w-1/3 h-full" onClick={togglePause} />
          <div className="w-1/3 h-full" onClick={handleNext} />
        </div>
      </div>

      {/* Group navigation (thumbnails on sides for desktop) */}
      {groups.length > 1 && (
        <>
          {currentGroupIndex > 0 && (
            <div
              className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 flex-col items-center cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
              onClick={() => {
                setCurrentGroupIndex(currentGroupIndex - 1);
                setCurrentStoryIndex(0);
                setProgress(0);
              }}
            >
              <img
                src={
                  groups[currentGroupIndex - 1].user.avatarUrl || DEFAULT_AVATAR
                }
                alt="Previous"
                className="h-12 w-12 shrink-0 rounded-full border-2 border-white/50 object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          )}
          {currentGroupIndex < groups.length - 1 && (
            <div
              className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col items-center cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
              onClick={() => {
                setCurrentGroupIndex(currentGroupIndex + 1);
                setCurrentStoryIndex(0);
                setProgress(0);
              }}
            >
              <img
                src={
                  groups[currentGroupIndex + 1].user.avatarUrl || DEFAULT_AVATAR
                }
                alt="Next"
                className="h-12 w-12 shrink-0 rounded-full border-2 border-white/50 object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          )}
        </>
      )}

      <AlertDialog
        open={!!deleteStoryId}
        onOpenChange={(open) => !open && setDeleteStoryId(null)}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Story</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete this story? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteStory.isPending}
              onClick={() => {
                if (deleteStoryId) {
                  deleteStory.mutate(deleteStoryId);
                  setDeleteStoryId(null);
                }
              }}
            >
              {deleteStory.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
