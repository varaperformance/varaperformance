import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { isNativeApp } from '@/lib/capacitor';
import { showNativeActionSheet } from '@/lib/action-sheet';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useAuth } from '@/features/auth';
import {
  useProfileDetails,
  useProfileGyms,
  useUnitPreference,
} from '@/features/profile';
import { useSocials } from '@/features/social';
import { useMapboxSearch } from '@/hooks/use-mapbox';
import { useNotifications, useUnreadCount } from '@/features/notifications';
import {
  useInfiniteElevateFeed,
  useInfiniteFeedWithMode,
  useProfileStats,
  useGymPartners,
  usePendingPartnerRequests,
  usePartnerSuggestions,
  useSendPartnerRequest,
  useRespondToPartnerRequest,
  useToggleHighFive,
  useToggleSave,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  useElevateComments,
  useCreateComment,
  useReportPost,
  useGymStats,
  useElevateRealtime,
  useSearchUsers,
  type ElevatePostResponse,
  type PostPrivacy,
  type ElevateCommentResponse,
  type ElevateReportReason,
  type UpdateElevatePost,
  type ElevateFeedMode,
  type SearchUserResult,
} from '@/features/social';
import { StoriesBar } from '@/components/stories';
import {
  MealAttachmentCards,
  PrAttachmentCards,
  RecipeAttachmentCards,
  StackAttachmentCards,
  WorkoutPlanAttachmentCards,
} from '@/components/elevate/attachment-cards';
import {
  useRecentWorkouts,
  type RecentWorkoutSummary,
} from '@/features/health';
import {
  appendMealAttachmentMeta,
  appendPrAttachmentMeta,
  appendRecipeAttachmentMeta,
  appendStackAttachmentMeta,
  appendWorkoutPlanAttachmentMeta,
  decodeMealAttachments,
  decodePrAttachments,
  decodeRecipeAttachments,
  decodeStackAttachments,
  decodeWorkoutPlanAttachments,
  extractMealAttachmentsFromContent,
  extractPrAttachmentsFromContent,
  extractRecipeAttachmentsFromContent,
  extractStackAttachmentsFromContent,
  extractWorkoutPlanAttachmentsFromContent,
  stripAttachmentMetaFromContent,
  type ElevateMealAttachment,
  type ElevatePrAttachment,
  type ElevateRecipeAttachment,
  type ElevateStackAttachment,
  type ElevateWorkoutPlanAttachment,
} from '@/lib/elevate-attachments';
import { formatDistance as formatDistanceMeasurement } from '@varaperformance/core';
import api from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { hapticsLight } from '@/lib/haptics';
import { shareContent, canShare } from '@/lib/share';
import { buildDeepLinkUrl } from '@/lib/deep-links';
import { pickImage } from '@/lib/camera';
import {
  Activity,
  Bell,
  Camera,
  ExternalLink,
  Share2,
  Flame,
  MapPin,
  Music2,
  Play,
  TrendingUp,
  Settings,
  SquarePen,
  Users,
  X,
} from 'lucide-react';

// Helper to format duration from seconds to readable format
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  } else {
    return `${secs}s`;
  }
};

// Format an hourly range from a 24h wall-clock bucket (e.g. "8:00 PM - 9:00 PM").
const formatHourRange = (hour: number): string => {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const start = new Date(2026, 0, 1, normalizedHour, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const COMPOSER_DRAFT_KEY = 'elevate-composer-draft-v1';
const NEW_POST_PILL_SCROLL_THRESHOLD = 180;
const ELEVATE_COMPOSE_PARAM = 'compose';
const ELEVATE_DRAFT_PARAM = 'draft';
const ELEVATE_PR_PARAM = 'pr';
const ELEVATE_RECIPE_PARAM = 'recipe';
const ELEVATE_WORKOUT_PLAN_PARAM = 'workoutPlan';
const ELEVATE_MEAL_PARAM = 'meal';
const ELEVATE_STACK_PARAM = 'stack';

const isExternalLink = (href: string): boolean => {
  try {
    if (typeof window === 'undefined') {
      return true;
    }

    const resolvedUrl = new URL(href, window.location.origin);
    return resolvedUrl.origin !== window.location.origin;
  } catch {
    return true;
  }
};

const DEFAULT_HASHTAG_SUGGESTIONS = [
  '#workout',
  '#legsday',
  '#pushday',
  '#pullday',
  '#recovery',
  '#fitness',
  '#progress',
  '#consistency',
];

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const postContainsHashtag = (content: string, tag: string): boolean => {
  if (!content.trim() || !tag.trim()) {
    return false;
  }

  const normalizedTag = tag.startsWith('#') ? tag.slice(1) : tag;
  if (!normalizedTag) {
    return false;
  }

  const hashtagRegex = new RegExp(
    `(^|\\s)#${escapeRegExp(normalizedTag)}\\b`,
    'i',
  );
  return hashtagRegex.test(content);
};

type ComposerSuggestion = {
  key: string;
  replacement: string;
  primary: string;
  secondary?: string;
  avatarUrl?: string | null;
};

type UploadStatusItem = {
  id: string;
  file: File;
  status: 'uploading' | 'failed';
  message?: string;
};

type ExternalEmbed = {
  url: string;
  hostname: string;
  provider: 'youtube' | 'tiktok' | 'instagram' | 'generic';
  title: string;
  embedUrl?: string;
  thumbnailUrl?: string;
};

type ResourceTag = 'Technique' | 'Motivation' | 'Recipe' | 'Science';

type PrDetails = {
  exercise?: string;
  newValue?: string;
  previousValue?: string;
  delta?: string;
  reps?: number;
};

const RESOURCE_TAGS: ResourceTag[] = [
  'Technique',
  'Motivation',
  'Recipe',
  'Science',
];

const PR_EXERCISE_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'Back squat', regex: /\b(back\s+squat|squat)\b/i },
  { label: 'Bench press', regex: /\b(bench\s+press|bench)\b/i },
  { label: 'Deadlift', regex: /\bdeadlift\b/i },
  {
    label: 'Overhead press',
    regex: /\b(overhead\s+press|strict\s+press|ohp)\b/i,
  },
  { label: 'Row', regex: /\b(row|barbell\s+row|db\s+row)\b/i },
  { label: 'Pull-up', regex: /\b(pull[- ]?up|chin[- ]?up)\b/i },
];

const parsePrDetailsFromContent = (content: string): PrDetails | null => {
  const normalized = content.trim();
  if (!normalized) {
    return null;
  }

  const hasPrSignal = /\b(pr|personal\s+record|new\s+record|pb)\b/i.test(
    normalized,
  );
  const newValueMatch = normalized.match(
    /(\d{2,4}(?:\.\d+)?)\s?(kg|kgs|lb|lbs)\b/i,
  );
  const previousValueMatch = normalized.match(
    /(?:from|prev(?:ious)?(?:\s+pr)?|last)\s+(\d{2,4}(?:\.\d+)?)\s?(kg|kgs|lb|lbs)\b/i,
  );
  const deltaMatch = normalized.match(
    /(?:\+|up\s+)(\d{1,3}(?:\.\d+)?)\s?(kg|kgs|lb|lbs)\b/i,
  );
  const repsMatch =
    normalized.match(/(?:x|for)\s*(\d{1,2})\s*reps?\b/i) ||
    normalized.match(/\b(\d{1,2})\s*reps?\b/i);
  const exerciseMatch = PR_EXERCISE_PATTERNS.find((entry) =>
    entry.regex.test(normalized),
  );

  if (!hasPrSignal && !newValueMatch && !deltaMatch) {
    return null;
  }

  return {
    exercise: exerciseMatch?.label,
    newValue: newValueMatch
      ? `${newValueMatch[1]} ${newValueMatch[2].toLowerCase()}`
      : undefined,
    previousValue: previousValueMatch
      ? `${previousValueMatch[1]} ${previousValueMatch[2].toLowerCase()}`
      : undefined,
    delta: deltaMatch
      ? `+${deltaMatch[1]} ${deltaMatch[2].toLowerCase()}`
      : undefined,
    reps: repsMatch ? Number(repsMatch[1]) : undefined,
  };
};

const inferResourceTags = (
  content: string,
  embeds: ExternalEmbed[],
  context?: { hasWorkout?: boolean; isPr?: boolean },
): ResourceTag[] => {
  const normalized = content.toLowerCase();
  const tags = new Set<ResourceTag>();

  if (
    context?.hasWorkout ||
    /\b(form|tempo|cue|setup|technique|program|split|deload)\b/.test(normalized)
  ) {
    tags.add('Technique');
  }

  if (
    context?.isPr ||
    /\b(motivation|mindset|discipline|consistency|streak|progress|grateful)\b/.test(
      normalized,
    )
  ) {
    tags.add('Motivation');
  }

  if (
    /\b(recipe|meal|macro|protein|calories|nutrition|prep)\b/.test(normalized)
  ) {
    tags.add('Recipe');
  }

  if (
    /\b(study|evidence|research|meta-analysis|journal|science)\b/.test(
      normalized,
    ) ||
    embeds.some((embed) =>
      /(pubmed|nih\.gov|nature\.com|sciencedirect\.com)/i.test(embed.hostname),
    )
  ) {
    tags.add('Science');
  }

  return Array.from(tags).slice(0, 3);
};

const getPrDetailsForPost = (post: {
  content: string;
  isPR: boolean;
  milestone?: { value?: string | number; label?: string };
  workout?: { name?: string };
}): PrDetails | null => {
  if (!post.isPR) {
    return null;
  }

  const parsed = parsePrDetailsFromContent(post.content);
  if (!parsed && !post.milestone?.value && !post.milestone?.label) {
    return null;
  }

  const milestoneValue =
    post.milestone?.value !== undefined
      ? String(post.milestone.value)
      : undefined;

  return {
    exercise: parsed?.exercise || post.workout?.name || post.milestone?.label,
    newValue: parsed?.newValue || milestoneValue,
    previousValue: parsed?.previousValue,
    delta: parsed?.delta,
    reps: parsed?.reps,
  };
};

const getMidnightTimestamp = (input: Date | string): number | null => {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
};

const calculateWorkoutStreakDays = (
  workouts: RecentWorkoutSummary[],
): number => {
  const uniqueWorkoutDays = new Set<number>();

  for (const workout of workouts) {
    const midnightTs = getMidnightTimestamp(workout.performed);
    if (midnightTs !== null) {
      uniqueWorkoutDays.add(midnightTs);
    }
  }

  if (uniqueWorkoutDays.size === 0) {
    return 0;
  }

  const sortedDays = Array.from(uniqueWorkoutDays).sort((a, b) => b - a);
  const todayMidnight = getMidnightTimestamp(new Date());
  if (todayMidnight === null) {
    return 0;
  }

  const latestWorkoutDay = sortedDays[0];
  if (latestWorkoutDay < todayMidnight - DAY_MS) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < sortedDays.length; i += 1) {
    if (sortedDays[i] === sortedDays[i - 1] - DAY_MS) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
};

const EMBED_URL_REGEX = /(?:https?:\/\/|www\.)[^\s]+/gi;

const sanitizeUrlToken = (token: string): string => {
  const trailingPunctuationMatch = token.match(/[),.!?;:]+$/);
  return trailingPunctuationMatch
    ? token.slice(0, -trailingPunctuationMatch[0].length)
    : token;
};

const normalizeExternalUrl = (rawToken: string): string | null => {
  const raw = sanitizeUrlToken(rawToken);
  const candidate = raw.startsWith('www.') ? `https://${raw}` : raw;

  try {
    const url = new URL(candidate);
    return url.toString();
  } catch {
    return null;
  }
};

const getYouTubeVideoId = (url: URL): string | null => {
  const hostname = url.hostname.replace(/^www\./, '').toLowerCase();

  if (hostname === 'youtu.be') {
    return url.pathname.split('/').filter(Boolean)[0] ?? null;
  }

  if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
    if (url.pathname === '/watch') {
      return url.searchParams.get('v');
    }

    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'shorts' || pathParts[0] === 'live') {
      return pathParts[1] ?? null;
    }
  }

  return null;
};

const toExternalEmbed = (normalizedUrl: string): ExternalEmbed => {
  const url = new URL(normalizedUrl);
  const hostname = url.hostname.replace(/^www\./, '').toLowerCase();

  const youtubeVideoId = getYouTubeVideoId(url);
  if (youtubeVideoId) {
    return {
      url: normalizedUrl,
      hostname,
      provider: 'youtube',
      title: 'YouTube video',
      embedUrl: `https://www.youtube.com/embed/${youtubeVideoId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
    };
  }

  if (hostname === 'tiktok.com' || hostname === 'm.tiktok.com') {
    const videoMatch = url.pathname.match(/\/video\/(\d+)/);
    const videoId = videoMatch?.[1];
    return {
      url: normalizedUrl,
      hostname,
      provider: 'tiktok',
      title: 'TikTok',
      embedUrl: videoId
        ? `https://www.tiktok.com/embed/v2/${videoId}`
        : undefined,
    };
  }

  if (hostname === 'instagram.com' || hostname === 'www.instagram.com') {
    const reelMatch = url.pathname.match(/\/(reel|p)\/([^/?#]+)/);
    const postType = reelMatch?.[1];
    const postId = reelMatch?.[2];
    return {
      url: normalizedUrl,
      hostname,
      provider: 'instagram',
      title: 'Instagram',
      embedUrl:
        postType && postId
          ? `https://www.instagram.com/${postType}/${postId}/embed`
          : undefined,
    };
  }

  return {
    url: normalizedUrl,
    hostname,
    provider: 'generic',
    title: url.hostname,
  };
};

const extractExternalEmbeds = (content: string): ExternalEmbed[] => {
  if (!content.trim()) return [];

  const seen = new Set<string>();
  const embeds: ExternalEmbed[] = [];
  const matches = content.match(EMBED_URL_REGEX) || [];

  for (const token of matches) {
    const normalizedUrl = normalizeExternalUrl(token);
    if (!normalizedUrl || seen.has(normalizedUrl)) {
      continue;
    }
    seen.add(normalizedUrl);
    embeds.push(toExternalEmbed(normalizedUrl));

    if (embeds.length >= 3) {
      break;
    }
  }

  return embeds;
};

function ExternalEmbedCard({
  embed,
  onExternalLinkClick,
}: {
  embed: ExternalEmbed;
  onExternalLinkClick?: (href: string) => void;
}) {
  const [playInline, setPlayInline] = useState(false);
  const isPortraitEmbed =
    embed.provider === 'tiktok' || embed.provider === 'instagram';
  const providerMeta =
    embed.provider === 'tiktok'
      ? {
          label: 'TikTok',
          badgeClass:
            'border-white/20 bg-black/70 text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)]',
          shellClass:
            'bg-[radial-gradient(circle_at_15%_15%,rgba(236,72,153,0.28),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.24),transparent_42%),linear-gradient(150deg,rgba(15,23,42,0.95),rgba(24,24,27,0.93))]',
          icon: <Music2 className="h-3.5 w-3.5" />,
        }
      : {
          label: 'Instagram',
          badgeClass:
            'border-white/20 bg-white/10 text-white shadow-[0_8px_30px_rgba(147,51,234,0.28)]',
          shellClass:
            'bg-[radial-gradient(circle_at_20%_20%,rgba(251,146,60,0.30),transparent_44%),radial-gradient(circle_at_82%_18%,rgba(236,72,153,0.30),transparent_42%),radial-gradient(circle_at_75%_85%,rgba(147,51,234,0.25),transparent_48%),linear-gradient(150deg,rgba(30,27,75,0.95),rgba(76,29,149,0.92))]',
          icon: <Camera className="h-3.5 w-3.5" />,
        };

  if (!embed.embedUrl) {
    if (onExternalLinkClick) {
      return (
        <button
          type="button"
          onClick={() => onExternalLinkClick(embed.url)}
          className="block w-full rounded-xl border border-border/60 bg-muted/30 p-3 text-left transition-colors hover:bg-muted/50"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            External link
          </p>
          <p className="mt-1 text-sm font-medium">{embed.title}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {embed.url}
          </p>
        </button>
      );
    }

    return (
      <a
        href={embed.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl border border-border/60 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          External link
        </p>
        <p className="mt-1 text-sm font-medium">{embed.title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {embed.url}
        </p>
      </a>
    );
  }

  if (embed.provider === 'youtube' && !playInline && embed.thumbnailUrl) {
    return (
      <button
        type="button"
        className="relative block w-full overflow-hidden rounded-xl border border-border/60 bg-black/70 text-left"
        onClick={() => setPlayInline(true)}
      >
        <img
          src={embed.thumbnailUrl}
          alt="Video thumbnail"
          className="h-56 w-full object-cover opacity-95"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          YouTube
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-black/65 px-4 py-2 text-sm font-medium text-white backdrop-blur">
            <Play className="h-4 w-4" />
            Play video
          </span>
        </div>
      </button>
    );
  }

  if (
    (embed.provider === 'tiktok' || embed.provider === 'instagram') &&
    !playInline
  ) {
    return (
      <button
        type="button"
        className={cn(
          'relative block w-full overflow-hidden rounded-xl border border-white/15 text-left',
          providerMeta.shellClass,
        )}
        onClick={() => setPlayInline(true)}
      >
        <div className="absolute left-3 top-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur',
              providerMeta.badgeClass,
            )}
          >
            {providerMeta.icon}
            {providerMeta.label}
          </span>
        </div>
        <div className="flex h-56 flex-col justify-end p-4">
          <p className="text-xs uppercase tracking-wide text-white/70">
            Tap to load embed
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="line-clamp-2 text-sm font-medium text-white">
              {embed.url}
            </p>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/25 bg-black/55 px-3 py-1.5 text-xs font-medium text-white">
              <Play className="h-3.5 w-3.5" />
              Play
            </span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border/60 bg-black/70',
        isPortraitEmbed && 'mx-auto w-full max-w-[460px]',
      )}
    >
      <iframe
        src={embed.embedUrl}
        title={embed.title}
        className={cn(
          'w-full',
          isPortraitEmbed ? 'h-[min(78vh,920px)]' : 'aspect-video',
        )}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <div className="border-t border-white/10 px-3 py-2 text-xs text-muted-foreground">
        {embed.hostname}
      </div>
    </div>
  );
}

function PostExternalEmbeds({
  postId,
  embeds,
  onExternalLinkClick,
}: {
  postId: string;
  embeds: ExternalEmbed[];
  onExternalLinkClick?: (href: string) => void;
}) {
  if (embeds.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 space-y-2">
      {embeds.map((embed) => (
        <ExternalEmbedCard
          key={`${postId}-${embed.url}`}
          embed={embed}
          onExternalLinkClick={onExternalLinkClick}
        />
      ))}
    </div>
  );
}

const removeEmbeddedUrlsFromContent = (
  content: string,
  embeds: ExternalEmbed[],
): string => {
  if (!content.trim() || embeds.length === 0) {
    return content.trim();
  }

  const embeddedUrls = new Set(embeds.map((embed) => embed.url));

  return content
    .replace(EMBED_URL_REGEX, (token) => {
      const normalized = normalizeExternalUrl(token);
      if (!normalized || !embeddedUrls.has(normalized)) {
        return token;
      }

      return '';
    })
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

function PostContentWithEmbeds({
  postId,
  content,
  onExternalLinkClick,
}: {
  postId: string;
  content: string;
  onExternalLinkClick?: (href: string) => void;
}) {
  const embeds = useMemo(() => extractExternalEmbeds(content), [content]);
  const textContent = useMemo(
    () => removeEmbeddedUrlsFromContent(content, embeds),
    [content, embeds],
  );

  return (
    <>
      {textContent && (
        <p className="mb-3 text-[15px] leading-relaxed whitespace-pre-wrap wrap-anywhere">
          {parseContent(textContent, onExternalLinkClick)}
        </p>
      )}
      <PostExternalEmbeds
        postId={postId}
        embeds={embeds}
        onExternalLinkClick={onExternalLinkClick}
      />
    </>
  );
}

function PrCelebrationCard({
  details,
  milestoneLabel,
}: {
  details: PrDetails;
  milestoneLabel?: string;
}) {
  const displayLift = details.exercise || milestoneLabel || 'Personal record';

  return (
    <div className="mb-3 rounded-xl border border-green-500/35 bg-green-500/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-green-500">
          PR highlight
        </p>
        <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[11px] font-medium text-green-500">
          New PR
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">
        {displayLift}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-green-500/20 bg-background/60 px-2.5 py-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            New PR
          </p>
          <p className="text-sm font-semibold">
            {details.newValue || 'Logged'}
          </p>
        </div>
        <div className="rounded-lg border border-green-500/20 bg-background/60 px-2.5 py-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Previous
          </p>
          <p className="text-sm font-semibold">
            {details.previousValue || '-'}
          </p>
        </div>
        <div className="rounded-lg border border-green-500/20 bg-background/60 px-2.5 py-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Delta
          </p>
          <p className="text-sm font-semibold">{details.delta || '-'}</p>
        </div>
      </div>
      {details.reps ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Reps logged: {details.reps}
        </p>
      ) : null}
    </div>
  );
}

function ComposerEmbedPreviewCard({
  embed,
  onRemove,
}: {
  embed: ExternalEmbed;
  onRemove: () => void;
}) {
  const hasThumbnail = Boolean(embed.thumbnailUrl);
  const providerLabel =
    embed.provider === 'youtube'
      ? 'YouTube'
      : embed.provider === 'tiktok'
        ? 'TikTok'
        : embed.provider === 'instagram'
          ? 'Instagram'
          : 'Link';

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/70 bg-muted/20">
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:text-foreground"
        title="Remove link preview"
      >
        <X className="h-4 w-4" />
      </button>

      {hasThumbnail ? (
        <img
          src={embed.thumbnailUrl}
          alt={`${providerLabel} preview`}
          className="h-40 w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="h-24 w-full bg-linear-to-r from-muted/80 via-muted/40 to-background" />
      )}

      <div className="space-y-1.5 p-3 pr-11">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {providerLabel} preview
        </p>
        <p className="line-clamp-2 text-sm font-medium text-foreground">
          {embed.title}
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="truncate">{embed.hostname}</span>
        </div>
      </div>
    </div>
  );
}

// Helper to parse URLs, hashtags, and @mentions from content
const parseContent = (
  content: string,
  onExternalLinkClick?: (href: string) => void,
): React.ReactNode => {
  const regex = /((?:https?:\/\/|www\.)[^\s]+)|(#[\w]+)|(@[\w]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('http') || token.startsWith('www.')) {
      const trailingPunctuationMatch = token.match(/[),.!?;:]+$/);
      const trailingPunctuation = trailingPunctuationMatch?.[0] ?? '';
      const rawUrl = trailingPunctuation
        ? token.slice(0, -trailingPunctuation.length)
        : token;
      const href = rawUrl.startsWith('www.') ? `https://${rawUrl}` : rawUrl;
      const isExternal = isExternalLink(href);

      parts.push(
        <a
          key={key++}
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="font-medium text-primary underline decoration-primary/60 underline-offset-2 hover:decoration-primary"
          title={href}
          onClick={(event) => {
            if (!isExternal || !onExternalLinkClick) {
              return;
            }

            event.preventDefault();
            onExternalLinkClick(href);
          }}
        >
          {rawUrl}
        </a>,
      );

      if (trailingPunctuation) {
        parts.push(trailingPunctuation);
      }
    } else if (token.startsWith('#')) {
      // Hashtag - link to search/filter
      const tag = token.slice(1);
      parts.push(
        <Link
          key={key++}
          to={`/elevate?tag=${encodeURIComponent(tag)}`}
          className="text-primary hover:underline font-medium"
        >
          {token}
        </Link>,
      );
    } else if (token.startsWith('@')) {
      // Mention - link to profile
      const username = token.slice(1);
      parts.push(
        <Link
          key={key++}
          to={`/elevate/${encodeURIComponent(username)}`}
          className="text-primary hover:underline font-medium"
        >
          {token}
        </Link>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
};

function AvatarOrSkeleton({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className: string;
}) {
  if (!src) {
    return <Skeleton className={cn(className, 'bg-muted/80')} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}

// Report reasons for the report dialog
const REPORT_REASONS: {
  value: ElevateReportReason;
  label: string;
  description: string;
}[] = [
  {
    value: 'SPAM',
    label: 'Spam',
    description: 'Misleading or repetitive content',
  },
  {
    value: 'HARASSMENT',
    label: 'Harassment',
    description: 'Bullying or targeting someone',
  },
  {
    value: 'HATE_SPEECH',
    label: 'Hate Speech',
    description: 'Attacks based on identity',
  },
  {
    value: 'VIOLENCE',
    label: 'Violence',
    description: 'Threats or promotion of violence',
  },
  {
    value: 'NUDITY',
    label: 'Nudity',
    description: 'Inappropriate sexual content',
  },
  {
    value: 'FALSE_INFO',
    label: 'False Information',
    description: 'Misinformation or fake news',
  },
  { value: 'SCAM', label: 'Scam', description: 'Fraud or deceptive practices' },
  { value: 'OTHER', label: 'Other', description: 'Something else not listed' },
];

// Comment Section Component
function CommentSection({
  postId,
  commentCount,
  commentText,
  onCommentTextChange,
  onAddComment,
  onExternalLinkClick,
  isSubmitting,
  isLocked,
  currentUserAvatar,
}: {
  postId: string;
  commentCount: number;
  commentText: string;
  onCommentTextChange: (text: string) => void;
  onAddComment: () => void;
  onExternalLinkClick?: (href: string) => void;
  isSubmitting: boolean;
  isLocked?: boolean;
  currentUserAvatar?: string | null;
}) {
  const { data: commentsData, isLoading } = useElevateComments(postId);
  const comments = commentsData?.success ? commentsData.data.comments : [];

  return (
    <div className="mt-4 border-t border-border pt-4">
      {/* Comment Input */}
      <div className="flex items-start gap-3 mb-4">
        <AvatarOrSkeleton
          src={currentUserAvatar}
          alt="Your avatar"
          className="h-8 w-8 rounded-full object-cover shrink-0"
        />
        <div className="flex-1 flex gap-2">
          <Input
            placeholder={
              isLocked
                ? 'Comments are temporarily disabled while this post is under review'
                : 'Write a comment...'
            }
            value={commentText}
            onChange={(e) => onCommentTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onAddComment();
              }
            }}
            className="flex-1"
            disabled={isSubmitting || isLocked}
          />
          <Button
            size="sm"
            onClick={onAddComment}
            disabled={isSubmitting || isLocked || !commentText.trim()}
          >
            {isSubmitting ? '...' : 'Post'}
          </Button>
        </div>
      </div>

      {isLocked && (
        <div className="mb-3 rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          This post is currently under moderation review. Reactions and comments
          are temporarily limited.
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(Math.min(3, commentCount))].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment: ElevateCommentResponse) => (
            <div key={comment.id} className="flex items-start gap-3">
              <Link to={`/elevate/${comment.author.id}`}>
                <AvatarOrSkeleton
                  src={comment.author.avatarUrl}
                  alt={comment.author.displayName || 'User'}
                  className="h-8 w-8 shrink-0 rounded-full object-cover transition-all hover:ring-2 hover:ring-primary/50"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={`/elevate/${comment.author.id}`}
                    className="font-medium text-sm hover:underline"
                  >
                    {comment.author.displayName || 'Anonymous'}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 wrap-break-word">
                  {parseContent(comment.content, onExternalLinkClick)}
                </p>
                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 pl-4 border-l-2 border-border/50 space-y-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex items-start gap-2">
                        <Link to={`/elevate/${reply.author.id}`}>
                          <AvatarOrSkeleton
                            src={reply.author.avatarUrl}
                            alt={reply.author.displayName || 'User'}
                            className="h-6 w-6 shrink-0 rounded-full object-cover"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              to={`/elevate/${reply.author.id}`}
                              className="font-medium text-xs hover:underline"
                            >
                              {reply.author.displayName || 'Anonymous'}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(reply.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/90">
                            {parseContent(reply.content, onExternalLinkClick)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ElevatePage = () => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [feedMode, setFeedMode] = useState<ElevateFeedMode>('PUBLIC');
  const [showOnlyMyPosts, setShowOnlyMyPosts] = useState(false);
  const [resourceFilter, setResourceFilter] = useState<ResourceTag | 'ALL'>(
    'ALL',
  );
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerPrAttachments, setComposerPrAttachments] = useState<
    ElevatePrAttachment[]
  >([]);
  const [composerRecipeAttachments, setComposerRecipeAttachments] = useState<
    ElevateRecipeAttachment[]
  >([]);
  const [composerWorkoutPlanAttachments, setComposerWorkoutPlanAttachments] =
    useState<ElevateWorkoutPlanAttachment[]>([]);
  const [composerMealAttachments, setComposerMealAttachments] = useState<
    ElevateMealAttachment[]
  >([]);
  const [composerStackAttachments, setComposerStackAttachments] = useState<
    ElevateStackAttachment[]
  >([]);
  const [postContent, setPostContent] = useState('');
  const [, setPostType] = useState<'TEXT' | 'PHOTO' | 'WORKOUT' | 'CHECK_IN'>(
    'TEXT',
  );
  const [postImages, setPostImages] = useState<string[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<
    Record<string, string>
  >({});
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [privacy, setPrivacy] = useState<PostPrivacy>('PUBLIC');
  const [selectedWorkout, setSelectedWorkout] =
    useState<RecentWorkoutSummary | null>(null);
  const [workoutSelectorOpen, setWorkoutSelectorOpen] = useState(false);
  const [checkInGym, setCheckInGym] = useState<{
    id?: string;
    name: string;
    formattedAddress?: string;
  } | null>(null);
  const [checkInSelectorOpen, setCheckInSelectorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(
    new Set(),
  );
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatusItem[]>([]);
  const [pendingRealtimeUpdates, setPendingRealtimeUpdates] = useState(0);
  const [isNearTop, setIsNearTop] = useState(true);
  const [composerCaretPosition, setComposerCaretPosition] = useState(0);
  const [duplicateBypassConfirmed, setDuplicateBypassConfirmed] =
    useState(false);
  const [suggestionToken, setSuggestionToken] = useState<string | null>(null);
  const [suggestionRange, setSuggestionRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [activeComposerSuggestionIndex, setActiveComposerSuggestionIndex] =
    useState(0);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const deletePostTimeoutRef = useRef<Record<string, number>>({});
  const isNearTopRef = useRef(true);
  const skipLocalDraftRestoreRef = useRef(false);

  // Lightbox state for viewing images
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Delete confirmation state
  const [deletePostId, setDeletePostId] = useState<string | null>(null);

  // External link warning state
  const [pendingExternalUrl, setPendingExternalUrl] = useState<string | null>(
    null,
  );

  // Report dialog state
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ElevateReportReason | null>(
    null,
  );
  const [reportDetails, setReportDetails] = useState('');

  // Edit dialog state
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleExternalLinkClick = useCallback((href: string) => {
    setPendingExternalUrl(href);
  }, []);

  const confirmExternalNavigation = useCallback(() => {
    if (!pendingExternalUrl) {
      return;
    }

    window.open(pendingExternalUrl, '_blank', 'noopener,noreferrer');
    setPendingExternalUrl(null);
  }, [pendingExternalUrl]);

  // Get current user
  const { user } = useAuth();
  const unit = useUnitPreference();

  const {
    query: checkInQuery,
    setQuery: setCheckInQuery,
    results: checkInResults,
    isSearching: isCheckInSearching,
    error: checkInSearchError,
  } = useMapboxSearch({ limit: 8, useProximity: true });

  const mentionSearchQuery =
    suggestionToken?.startsWith('@') && suggestionToken.length > 1
      ? suggestionToken.slice(1)
      : '';
  const { data: mentionSearchData, isFetching: isMentionSearching } =
    useSearchUsers(mentionSearchQuery, {
      enabled: composerOpen && mentionSearchQuery.length >= 2,
    });
  const mentionSuggestions = useMemo<SearchUserResult[]>(
    () => (mentionSearchData?.success ? mentionSearchData.data.results : []),
    [mentionSearchData],
  );
  const rankedMentionSuggestions = useMemo(() => {
    return [...mentionSuggestions].sort((a, b) => {
      if (a.isPartner !== b.isPartner) {
        return a.isPartner ? -1 : 1;
      }

      if (a.mutualPartners !== b.mutualPartners) {
        return b.mutualPartners - a.mutualPartners;
      }

      return (a.user.displayName || '').localeCompare(b.user.displayName || '');
    });
  }, [mentionSuggestions]);
  const showMentionSuggestions =
    Boolean(suggestionRange) &&
    suggestionToken?.startsWith('@') &&
    mentionSearchQuery.length >= 2;
  const hashtagSuggestions = useMemo(
    () =>
      suggestionToken?.startsWith('#') && suggestionToken.length > 1
        ? DEFAULT_HASHTAG_SUGGESTIONS.filter((tag) =>
            tag.toLowerCase().startsWith(suggestionToken.toLowerCase()),
          )
        : [],
    [suggestionToken],
  );
  const showHashtagSuggestions =
    Boolean(suggestionRange) &&
    suggestionToken?.startsWith('#') &&
    hashtagSuggestions.length > 0;
  const composerSuggestions = useMemo<ComposerSuggestion[]>(() => {
    if (showMentionSuggestions) {
      return rankedMentionSuggestions.slice(0, 5).map((candidate) => {
        const username =
          candidate.user.displayName?.toLowerCase().replace(/\s+/g, '') ||
          'user';
        const badge = candidate.isPartner
          ? 'Gym partner'
          : candidate.mutualPartners > 0
            ? `${candidate.mutualPartners} mutual`
            : 'Member';

        return {
          key: candidate.user.id,
          replacement: `@${username}`,
          primary: candidate.user.displayName || 'Anonymous',
          secondary: badge,
          avatarUrl: candidate.user.avatarUrl,
        };
      });
    }

    if (showHashtagSuggestions) {
      return hashtagSuggestions.slice(0, 6).map((tag) => ({
        key: tag,
        replacement: tag,
        primary: tag,
      }));
    }

    return [];
  }, [
    hashtagSuggestions,
    rankedMentionSuggestions,
    showHashtagSuggestions,
    showMentionSuggestions,
  ]);

  useEffect(() => {
    setActiveComposerSuggestionIndex((prev) => {
      if (composerSuggestions.length === 0) {
        return 0;
      }

      return Math.min(prev, composerSuggestions.length - 1);
    });
  }, [composerSuggestions.length]);

  // Fetch real profile data
  const { data: profileData, isLoading: isProfileLoading } =
    useProfileDetails();
  const { data: socialsData } = useSocials();
  const { data: notificationsData } = useNotifications({ limit: 6 });
  const { data: unreadNotificationsData } = useUnreadCount();
  const { data: gymsData } = useProfileGyms();
  const profile = profileData?.success ? profileData.data : null;
  const socials = socialsData?.success ? socialsData.data : null;
  const notifications = notificationsData?.success
    ? notificationsData.data.notifications
    : [];
  const unreadNotificationsCount = unreadNotificationsData?.success
    ? unreadNotificationsData.data.count
    : 0;
  const gyms = gymsData?.success ? gymsData.data : [];

  // Fetch recent workouts for workout selector (exclude already shared, only shareable)
  // Fetch recent workouts for workout selector (exclude already shared, filter by privacy on client)
  const { data: recentWorkoutsData } = useRecentWorkouts({
    limit: 10,
    excludeShared: true,
    shareableOnly: false, // Fetch all privacy levels, filter client-side based on post privacy
  });
  const recentWorkouts = recentWorkoutsData?.success
    ? recentWorkoutsData.data
    : [];

  const { refreshFeed } = useElevateRealtime({
    enabled: true,
    onFeedRefresh: () => {
      if (!isNearTopRef.current) {
        setPendingRealtimeUpdates((prev) => prev + 1);
        return false;
      }
      return true;
    },
  });

  // Fetch Elevate feed from API with mode using infinite pagination
  const {
    data: modeFeedPages,
    isLoading: isModeFeedLoading,
    hasNextPage: hasModeNextPage,
    fetchNextPage: fetchModeNextPage,
    isFetchingNextPage: isModeFetchingNextPage,
  } = useInfiniteFeedWithMode(feedMode, 20);

  const {
    data: myFeedPages,
    isLoading: isMyFeedLoading,
    hasNextPage: hasMyNextPage,
    fetchNextPage: fetchMyNextPage,
    isFetchingNextPage: isMyFetchingNextPage,
  } = useInfiniteElevateFeed(
    user?.sub
      ? {
          userId: user.sub,
          limit: 20,
        }
      : undefined,
    {
      enabled: showOnlyMyPosts && Boolean(user?.sub),
    },
  );

  const activeFeedPages = showOnlyMyPosts ? myFeedPages : modeFeedPages;
  const isFeedLoading = showOnlyMyPosts ? isMyFeedLoading : isModeFeedLoading;
  const hasNextPage = showOnlyMyPosts ? hasMyNextPage : hasModeNextPage;
  const isFetchingNextPage = showOnlyMyPosts
    ? isMyFetchingNextPage
    : isModeFetchingNextPage;
  const fetchNextPage = showOnlyMyPosts ? fetchMyNextPage : fetchModeNextPage;
  const activeTagFilter = searchParams.get('tag')?.trim() ?? '';

  useEffect(() => {
    const shouldOpenCompose = searchParams.get(ELEVATE_COMPOSE_PARAM) === '1';
    const draft = searchParams.get(ELEVATE_DRAFT_PARAM);
    const prPayload = searchParams.get(ELEVATE_PR_PARAM);
    const recipePayload = searchParams.get(ELEVATE_RECIPE_PARAM);
    const workoutPlanPayload = searchParams.get(ELEVATE_WORKOUT_PLAN_PARAM);
    const mealPayload = searchParams.get(ELEVATE_MEAL_PARAM);
    const stackPayload = searchParams.get(ELEVATE_STACK_PARAM);

    if (
      !shouldOpenCompose &&
      !draft &&
      !prPayload &&
      !recipePayload &&
      !workoutPlanPayload &&
      !mealPayload &&
      !stackPayload
    ) {
      return;
    }

    // URL-driven compose intents should win over any stale local draft.
    skipLocalDraftRestoreRef.current = true;

    if (draft) {
      setPostContent(draft);
      setDuplicateBypassConfirmed(false);
    }

    if (prPayload) {
      setComposerPrAttachments(decodePrAttachments(prPayload));
      setPostContent('');
      setDuplicateBypassConfirmed(false);
    }

    if (recipePayload) {
      setComposerRecipeAttachments(decodeRecipeAttachments(recipePayload));
      setPostContent('');
      setDuplicateBypassConfirmed(false);
    }

    if (workoutPlanPayload) {
      setComposerWorkoutPlanAttachments(
        decodeWorkoutPlanAttachments(workoutPlanPayload),
      );
      setPostContent('');
      setDuplicateBypassConfirmed(false);
    }

    if (mealPayload) {
      setComposerMealAttachments(decodeMealAttachments(mealPayload));
      setPostContent('');
      setDuplicateBypassConfirmed(false);
    }

    if (stackPayload) {
      setComposerStackAttachments(decodeStackAttachments(stackPayload));
      setPostContent('');
      setDuplicateBypassConfirmed(false);
    }

    setComposerOpen(true);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete(ELEVATE_COMPOSE_PARAM);
    nextParams.delete(ELEVATE_DRAFT_PARAM);
    nextParams.delete(ELEVATE_PR_PARAM);
    nextParams.delete(ELEVATE_RECIPE_PARAM);
    nextParams.delete(ELEVATE_WORKOUT_PLAN_PARAM);
    nextParams.delete(ELEVATE_MEAL_PARAM);
    nextParams.delete(ELEVATE_STACK_PARAM);
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Fetch profile stats (workouts, partners, PRs)
  const { data: profileStatsData } = useProfileStats();
  const profileStats = profileStatsData?.success ? profileStatsData.data : null;

  // Fetch gym stats (training now, peak hours, trending exercises)
  const { data: gymStatsData } = useGymStats();
  const gymStats = gymStatsData?.success ? gymStatsData.data : null;

  // Fetch gym partner data
  const { data: partnersData } = useGymPartners({ status: 'ACCEPTED' });
  const { data: pendingRequestsData } = usePendingPartnerRequests();
  const { data: suggestionsData } = usePartnerSuggestions();
  const sendPartnerRequest = useSendPartnerRequest({
    onSuccess: () => toast.success('Partner request sent!'),
    onError: (error) => toast.error(error.message || 'Failed to send request'),
  });
  const respondToRequest = useRespondToPartnerRequest({
    onSuccess: () => toast.success('Request updated!'),
    onError: (error) => toast.error(error.message || 'Failed to respond'),
  });
  const partners = partnersData?.success ? partnersData.data.partners : [];
  const pendingRequests = pendingRequestsData?.success
    ? pendingRequestsData.data.requests
    : [];
  const suggestions = suggestionsData?.success
    ? suggestionsData.data.suggestions
    : [];

  const toggleHighFive = useToggleHighFive();
  const toggleSave = useToggleSave();
  const createPost = useCreatePost({
    onSuccess: () => {
      toast.success('Post created!');
      setComposerOpen(false);
      setPostContent('');
      setComposerPrAttachments([]);
      setComposerRecipeAttachments([]);
      setComposerWorkoutPlanAttachments([]);
      setComposerMealAttachments([]);
      setComposerStackAttachments([]);
      setPostType('TEXT');
      setPostImages((prev) => {
        for (const key of prev) {
          if (imagePreviewUrls[key]) URL.revokeObjectURL(imagePreviewUrls[key]);
        }
        return [];
      });
      setImagePreviewUrls({});
      setUploadStatuses([]);
      setSelectedWorkout(null);
      setCheckInGym(null);
      setCheckInQuery('');
      setCheckInSelectorOpen(false);
      setDuplicateBypassConfirmed(false);
      setSuggestionToken(null);
      setSuggestionRange(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(COMPOSER_DRAFT_KEY);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create post');
    },
  });
  const createComment = useCreateComment({
    onSuccess: (_, variables) => {
      setCommentTexts((prev) => ({ ...prev, [variables.postId]: '' }));
      toast.success('Comment added!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add comment');
    },
  });
  const deletePost = useDeletePost({
    onSuccess: () => {
      toast.success('Post deleted');
      setDeletePostId(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete post');
    },
  });
  const reportPost = useReportPost({
    onSuccess: () => {
      toast.success('Post reported. Our moderation team will review it.');
      setReportPostId(null);
      setReportReason(null);
      setReportDetails('');
    },
    onError: (error: unknown) => {
      // Extract error message from axios response if available
      const axiosError = error as {
        response?: { data?: { error?: { message?: string } } };
      };
      const message =
        axiosError.response?.data?.error?.message || 'Failed to report post';
      toast.error(message);
    },
  });
  const updatePost = useUpdatePost({
    onSuccess: () => {
      toast.success('Post updated!');
      setEditPostId(null);
      setEditContent('');
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: { data?: { error?: { message?: string } } };
      };
      const message =
        axiosError.response?.data?.error?.message || 'Failed to update post';
      toast.error(message);
    },
  });

  // Lightbox handlers
  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const navigateLightbox = useCallback(
    (direction: 'prev' | 'next') => {
      if (direction === 'prev') {
        setLightboxIndex((prev) =>
          prev > 0 ? prev - 1 : lightboxImages.length - 1,
        );
      } else {
        setLightboxIndex((prev) =>
          prev < lightboxImages.length - 1 ? prev + 1 : 0,
        );
      }
    },
    [lightboxImages.length],
  );

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'ArrowLeft') {
        navigateLightbox('prev');
      } else if (e.key === 'ArrowRight') {
        navigateLightbox('next');
      } else if (e.key === 'Escape') {
        setLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, navigateLightbox]);

  // Auto-load more posts when the sentinel enters the viewport
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    const target = loadMoreRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: '200px 0px',
        threshold: 0.1,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const handleScroll = () => {
      const nearTop = window.scrollY <= NEW_POST_PILL_SCROLL_THRESHOLD;
      setIsNearTop(nearTop);
      isNearTopRef.current = nearTop;
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isNearTop || pendingRealtimeUpdates === 0) {
      return;
    }

    refreshFeed();
    setPendingRealtimeUpdates(0);
  }, [isNearTop, pendingRealtimeUpdates, refreshFeed]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (skipLocalDraftRestoreRef.current) {
      skipLocalDraftRestoreRef.current = false;
      return;
    }

    if (
      searchParams.get(ELEVATE_COMPOSE_PARAM) === '1' ||
      Boolean(searchParams.get(ELEVATE_DRAFT_PARAM)) ||
      Boolean(searchParams.get(ELEVATE_PR_PARAM)) ||
      Boolean(searchParams.get(ELEVATE_RECIPE_PARAM)) ||
      Boolean(searchParams.get(ELEVATE_WORKOUT_PLAN_PARAM)) ||
      Boolean(searchParams.get(ELEVATE_MEAL_PARAM)) ||
      Boolean(searchParams.get(ELEVATE_STACK_PARAM))
    ) {
      return;
    }

    const draftRaw = window.localStorage.getItem(COMPOSER_DRAFT_KEY);
    if (!draftRaw) {
      return;
    }

    try {
      const draft = JSON.parse(draftRaw) as {
        content?: string;
        images?: string[];
        prAttachments?: ElevatePrAttachment[];
        recipeAttachments?: ElevateRecipeAttachment[];
        workoutPlanAttachments?: ElevateWorkoutPlanAttachment[];
        mealAttachments?: ElevateMealAttachment[];
        stackAttachments?: ElevateStackAttachment[];
        privacy?: PostPrivacy;
        selectedWorkout?: RecentWorkoutSummary | null;
        checkInGym?: {
          id?: string;
          name: string;
          formattedAddress?: string;
        } | null;
      };

      if (draft.content) setPostContent(draft.content);
      if (Array.isArray(draft.images)) setPostImages(draft.images);
      if (Array.isArray(draft.prAttachments)) {
        setComposerPrAttachments(draft.prAttachments);
      }
      if (Array.isArray(draft.recipeAttachments)) {
        setComposerRecipeAttachments(draft.recipeAttachments);
      }
      if (Array.isArray(draft.workoutPlanAttachments)) {
        setComposerWorkoutPlanAttachments(draft.workoutPlanAttachments);
      }
      if (Array.isArray(draft.mealAttachments)) {
        setComposerMealAttachments(draft.mealAttachments);
      }
      if (Array.isArray(draft.stackAttachments)) {
        setComposerStackAttachments(draft.stackAttachments);
      }
      if (draft.privacy) setPrivacy(draft.privacy);
      if (draft.selectedWorkout) {
        setSelectedWorkout(draft.selectedWorkout);
        setPostType('WORKOUT');
      }
      if (draft.checkInGym) {
        setCheckInGym(draft.checkInGym);
        setPostType('CHECK_IN');
      }
    } catch {
      window.localStorage.removeItem(COMPOSER_DRAFT_KEY);
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hasDraftData =
      postContent.trim().length > 0 ||
      postImages.length > 0 ||
      composerPrAttachments.length > 0 ||
      composerRecipeAttachments.length > 0 ||
      composerWorkoutPlanAttachments.length > 0 ||
      composerMealAttachments.length > 0 ||
      composerStackAttachments.length > 0 ||
      Boolean(selectedWorkout) ||
      Boolean(checkInGym);

    if (!hasDraftData) {
      window.localStorage.removeItem(COMPOSER_DRAFT_KEY);
      return;
    }

    window.localStorage.setItem(
      COMPOSER_DRAFT_KEY,
      JSON.stringify({
        content: postContent,
        images: postImages,
        prAttachments: composerPrAttachments,
        recipeAttachments: composerRecipeAttachments,
        workoutPlanAttachments: composerWorkoutPlanAttachments,
        mealAttachments: composerMealAttachments,
        stackAttachments: composerStackAttachments,
        privacy,
        selectedWorkout,
        checkInGym,
      }),
    );
  }, [
    checkInGym,
    composerPrAttachments,
    composerRecipeAttachments,
    composerWorkoutPlanAttachments,
    composerMealAttachments,
    composerStackAttachments,
    postContent,
    postImages,
    privacy,
    selectedWorkout,
  ]);

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleAddComment = (postId: string) => {
    const text = commentTexts[postId]?.trim();
    if (!text) return;
    createComment.mutate({ postId, data: { content: text } });
  };

  const updateSuggestionContext = useCallback(
    (value: string, caret: number) => {
      const beforeCursor = value.slice(0, caret);
      const tokenMatch = beforeCursor.match(/(^|\s)([@#][\w]*)$/);
      if (!tokenMatch) {
        setSuggestionToken(null);
        setSuggestionRange(null);
        return;
      }

      const token = tokenMatch[2] ?? '';
      const start = caret - token.length;
      setSuggestionToken(token);
      setSuggestionRange({ start, end: caret });
      setActiveComposerSuggestionIndex(0);
    },
    [],
  );

  const handleComposerInputChange = useCallback(
    (value: string, caret: number) => {
      setPostContent(value);
      setDuplicateBypassConfirmed(false);
      setComposerCaretPosition(caret);
      updateSuggestionContext(value, caret);
    },
    [updateSuggestionContext],
  );

  const applyComposerSuggestion = useCallback(
    (replacement: string) => {
      if (!suggestionRange) {
        return;
      }

      const prefix = postContent.slice(0, suggestionRange.start);
      const suffix = postContent.slice(suggestionRange.end);
      const nextValue = `${prefix}${replacement} ${suffix}`;
      const nextCaret = prefix.length + replacement.length + 1;

      setPostContent(nextValue);
      setSuggestionToken(null);
      setSuggestionRange(null);
      setActiveComposerSuggestionIndex(0);

      requestAnimationFrame(() => {
        composerTextareaRef.current?.focus();
        composerTextareaRef.current?.setSelectionRange(nextCaret, nextCaret);
      });
    },
    [postContent, suggestionRange],
  );

  const recentOwnNormalizedContents =
    activeFeedPages?.pages
      .flatMap((page) => (page.success ? page.data.posts : []))
      .filter((post) => post.author.id === user?.sub)
      .slice(0, 20)
      .map((post) => post.content.trim().toLowerCase().replace(/\s+/g, ' ')) ??
    [];

  const normalizedPostDraft = postContent
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const isPotentialDuplicatePost =
    normalizedPostDraft.length > 0 &&
    recentOwnNormalizedContents.includes(normalizedPostDraft);

  const handleCreatePost = useCallback(() => {
    if (
      !postContent.trim() &&
      composerPrAttachments.length === 0 &&
      composerRecipeAttachments.length === 0 &&
      composerWorkoutPlanAttachments.length === 0 &&
      composerMealAttachments.length === 0 &&
      composerStackAttachments.length === 0
    ) {
      toast.error('Please enter some content or attach a card');
      return;
    }

    if (isPotentialDuplicatePost && !duplicateBypassConfirmed) {
      toast.error(
        'This looks like a duplicate of one of your recent posts. Click post again to confirm.',
      );
      setDuplicateBypassConfirmed(true);
      return;
    }

    // Determine post type with priority: workout > check-in > photo > text
    let finalType: 'TEXT' | 'PHOTO' | 'WORKOUT' | 'CHECK_IN' = 'TEXT';
    if (selectedWorkout) {
      finalType = 'WORKOUT';
    } else if (checkInGym) {
      finalType = 'CHECK_IN';
    } else if (postImages.length > 0) {
      finalType = 'PHOTO';
    }

    const contentWithRecipeAttachment = appendRecipeAttachmentMeta(
      postContent,
      composerRecipeAttachments,
    );
    const contentWithWorkoutPlanAttachment = appendWorkoutPlanAttachmentMeta(
      contentWithRecipeAttachment,
      composerWorkoutPlanAttachments,
    );
    const contentWithMealAttachment = appendMealAttachmentMeta(
      contentWithWorkoutPlanAttachment,
      composerMealAttachments,
    );
    const contentWithStackAttachment = appendStackAttachmentMeta(
      contentWithMealAttachment,
      composerStackAttachments,
    );
    const contentToPost = appendPrAttachmentMeta(
      contentWithStackAttachment,
      composerPrAttachments,
    );

    createPost.mutate({
      type: finalType,
      content: contentToPost,
      images: postImages.length > 0 ? postImages : [],
      privacy,
      workoutSessionId: selectedWorkout?.id,
      checkInData: checkInGym
        ? {
            ...(checkInGym.id ? { gymId: checkInGym.id } : {}),
            gymName: checkInGym.name,
          }
        : undefined,
    });

    setDuplicateBypassConfirmed(false);
  }, [
    checkInGym,
    createPost,
    duplicateBypassConfirmed,
    isPotentialDuplicatePost,
    composerPrAttachments,
    composerRecipeAttachments,
    composerWorkoutPlanAttachments,
    composerMealAttachments,
    composerStackAttachments,
    postContent,
    postImages,
    privacy,
    selectedWorkout,
  ]);

  const handleSelectCheckInPlace = (place: {
    name: string;
    formattedAddress?: string;
  }) => {
    setCheckInGym({
      name: place.name,
      formattedAddress: place.formattedAddress,
    });
    setPostType('CHECK_IN');
    setCheckInSelectorOpen(false);
  };

  const handleSelectWorkout = (workout: RecentWorkoutSummary) => {
    setSelectedWorkout(workout);
    setPostType('WORKOUT');
    setWorkoutSelectorOpen(false);
  };

  const handleRemoveWorkout = () => {
    setSelectedWorkout(null);
    if (postImages.length === 0) {
      setPostType('TEXT');
    } else {
      setPostType('PHOTO');
    }
  };

  const uploadSingleImage = useCallback(async (file: File, id: string) => {
    try {
      const formData = new FormData();
      formData.append('files', file);

      const response = await api.post<{
        success: boolean;
        data: { urls: string[] };
      }>('elevate/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        const uploadedUrl = response.data.data.urls[0];
        if (uploadedUrl) {
          const blobUrl = URL.createObjectURL(file);
          setPostImages((prev) => [...prev, uploadedUrl]);
          setImagePreviewUrls((prev) => ({ ...prev, [uploadedUrl]: blobUrl }));
          setPostType('PHOTO');
        }
        setUploadStatuses((prev) => prev.filter((item) => item.id !== id));
        return true;
      }

      throw new Error('Upload failed');
    } catch {
      setUploadStatuses((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'failed',
                message: 'Upload failed. Retry this image.',
              }
            : item,
        ),
      );
      return false;
    }
  }, []);

  const handleFileUpload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = 10 - (postImages.length + uploadStatuses.length);

      if (fileArray.length > remaining) {
        toast.error(
          `Can only add ${remaining} more image${remaining === 1 ? '' : 's'}`,
        );
        return;
      }

      // Validate file types
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      const validFiles = fileArray.filter((f) => allowedTypes.includes(f.type));

      if (validFiles.length !== fileArray.length) {
        toast.error('Only JPEG, PNG, GIF, and WebP images are allowed');
      }

      if (validFiles.length === 0) return;

      const queued = validFiles.map((file, index) => ({
        id:
          typeof crypto !== 'undefined' &&
          typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${index}`,
        file,
        status: 'uploading' as const,
      }));

      setUploadStatuses((prev) => [...prev, ...queued]);
      setIsUploading(true);

      let successCount = 0;
      for (const item of queued) {
        // Upload sequentially to keep queue status deterministic.
        const didUpload = await uploadSingleImage(item.file, item.id);
        if (didUpload) {
          successCount += 1;
        }
      }

      const failedCount = queued.length - successCount;
      if (successCount > 0) {
        toast.success(
          `${successCount} image${successCount === 1 ? '' : 's'} uploaded`,
        );
      }
      if (failedCount > 0) {
        toast.error(
          `${failedCount} image${failedCount === 1 ? '' : 's'} failed. Retry below.`,
        );
      }

      setIsUploading(false);
    },
    [postImages.length, uploadSingleImage, uploadStatuses.length],
  );

  const handleRetryUpload = useCallback(
    async (id: string) => {
      const item = uploadStatuses.find((statusItem) => statusItem.id === id);
      if (!item) {
        return;
      }

      setUploadStatuses((prev) =>
        prev.map((statusItem) =>
          statusItem.id === id
            ? { ...statusItem, status: 'uploading', message: undefined }
            : statusItem,
        ),
      );

      setIsUploading(true);
      await uploadSingleImage(item.file, id);
      setIsUploading(false);
    },
    [uploadSingleImage, uploadStatuses],
  );

  const handleDismissFailedUpload = useCallback((id: string) => {
    setUploadStatuses((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files);
      }
    },
    [handleFileUpload],
  );

  const handleComposerPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) {
        return;
      }

      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind !== 'file' || !item.type.startsWith('image/')) {
          continue;
        }

        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }

      if (imageFiles.length === 0) {
        return;
      }

      e.preventDefault();
      void handleFileUpload(imageFiles);
    },
    [handleFileUpload],
  );

  const handleComposerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCreatePost();
        return;
      }

      if (composerSuggestions.length > 0 && e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveComposerSuggestionIndex((prev) =>
          prev + 1 >= composerSuggestions.length ? 0 : prev + 1,
        );
        return;
      }

      if (composerSuggestions.length > 0 && e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveComposerSuggestionIndex((prev) =>
          prev - 1 < 0 ? composerSuggestions.length - 1 : prev - 1,
        );
        return;
      }

      if (
        composerSuggestions.length > 0 &&
        (e.key === 'Enter' || e.key === 'Tab')
      ) {
        e.preventDefault();
        const selected = composerSuggestions[activeComposerSuggestionIndex];
        if (selected) {
          applyComposerSuggestion(selected.replacement);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (composerSuggestions.length > 0) {
          e.preventDefault();
          setSuggestionToken(null);
          setSuggestionRange(null);
          setActiveComposerSuggestionIndex(0);
          return;
        }

        e.preventDefault();
        setComposerOpen(false);
      }
    },
    [
      activeComposerSuggestionIndex,
      applyComposerSuggestion,
      composerSuggestions,
      handleCreatePost,
    ],
  );

  const handleComposerSelectionChange = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const target = e.currentTarget;
      const caret = target.selectionStart ?? 0;
      setComposerCaretPosition(caret);
      updateSuggestionContext(postContent, caret);
    },
    [postContent, updateSuggestionContext],
  );

  const handleRemoveImage = (index: number) => {
    const removedKey = postImages[index];
    if (removedKey && imagePreviewUrls[removedKey]) {
      URL.revokeObjectURL(imagePreviewUrls[removedKey]);
      setImagePreviewUrls((prev) => {
        const next = { ...prev };
        delete next[removedKey];
        return next;
      });
    }
    const newImages = postImages.filter((_, i) => i !== index);
    setPostImages(newImages);
    if (newImages.length === 0) {
      setPostType('TEXT');
    }
  };

  const queueDeletePost = useCallback(
    (postId: string) => {
      setDeletePostId(null);

      const timeoutId = window.setTimeout(() => {
        deletePost.mutate(postId);
        delete deletePostTimeoutRef.current[postId];
      }, 7000);

      deletePostTimeoutRef.current[postId] = timeoutId;

      toast('Post will be deleted', {
        description: 'You have 7 seconds to undo.',
        action: {
          label: 'Undo',
          onClick: () => {
            const queued = deletePostTimeoutRef.current[postId];
            if (queued) {
              window.clearTimeout(queued);
              delete deletePostTimeoutRef.current[postId];
              toast.success('Delete canceled');
            }
          },
        },
      });
    },
    [deletePost],
  );

  useEffect(() => {
    const pendingDeletes = deletePostTimeoutRef.current;

    return () => {
      Object.values(pendingDeletes).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, []);

  // Map API posts to the render structure
  const feedPosts =
    activeFeedPages?.pages.flatMap((page) =>
      page.success ? page.data.posts : [],
    ) ?? [];

  const apiPosts = feedPosts.map((post: ElevatePostResponse) => {
    // Check if post was edited (updatedAt is significantly after createdAt - more than 1 minute)
    const createdDate = new Date(post.createdAt);
    const updatedDate = new Date(post.updatedAt);
    const isEdited = updatedDate.getTime() - createdDate.getTime() > 60000; // 1 minute threshold

    const attachedPrs = extractPrAttachmentsFromContent(post.content);
    const attachedRecipes = extractRecipeAttachmentsFromContent(post.content);
    const attachedWorkoutPlans = extractWorkoutPlanAttachmentsFromContent(
      post.content,
    );
    const attachedMeals = extractMealAttachmentsFromContent(post.content);
    const attachedStacks = extractStackAttachmentsFromContent(post.content);
    const visibleContent = stripAttachmentMetaFromContent(post.content);
    const embeds = extractExternalEmbeds(visibleContent);
    const isPrPost = post.type === 'PR';

    return {
      id: post.id,
      authorId: post.author.id,
      user: {
        name: post.author.displayName || 'Anonymous',
        username:
          post.author.displayName?.toLowerCase().replace(/\\s/g, '') || 'user',
        avatar: post.author.avatarUrl || null,
        gym: '', // API doesn't return gym info per post
        isCoach: false,
      },
      type: post.type.toLowerCase(),
      timeAgo: formatDistanceToNow(createdDate, { addSuffix: true }),
      privacy: post.privacy,
      content: visibleContent,
      images: post.images || [],
      workout: post.workout
        ? {
            name: post.workout.title || 'Workout',
            duration: post.workout.duration
              ? formatDuration(post.workout.duration)
              : null,
            exerciseCount: post.workout.exerciseCount,
            totalSets: post.workout.totalSets,
            totalVolume: post.workout.totalVolume
              ? `${post.workout.totalVolume.toLocaleString()} lbs`
              : null,
            totalDistance: post.workout.totalDistance
              ? formatDistanceMeasurement(post.workout.totalDistance, unit)
              : null,
          }
        : undefined,
      milestone: post.milestone
        ? {
            type: post.milestone.type,
            value: post.milestone.value,
            label: post.milestone.label,
          }
        : undefined,
      checkIn: post.checkIn
        ? {
            gymId: post.checkIn.gymId,
            gymName: post.checkIn.gymName,
          }
        : undefined,
      achievement: post.achievement
        ? {
            id: post.achievement.id,
            name: post.achievement.name,
            description: post.achievement.description,
            icon: post.achievement.icon,
            slug: post.achievement.slug,
          }
        : undefined,
      challenge: post.challenge
        ? {
            id: post.challenge.id,
            title: post.challenge.title,
            description: post.challenge.description,
            type: post.challenge.type,
            goalValue: post.challenge.goalValue,
            goalUnit: post.challenge.goalUnit,
            participantCount: post.challenge.participantCount,
            isOfficial: post.challenge.isOfficial,
            status: post.challenge.status,
          }
        : undefined,
      reactions: {
        highFives: post.highFiveCount,
        comments: post.commentCount,
      },
      isPR: isPrPost || attachedPrs.length > 0,
      attachedPrs,
      attachedRecipes,
      attachedWorkoutPlans,
      attachedMeals,
      attachedStacks,
      resourceTags: inferResourceTags(visibleContent, embeds, {
        hasWorkout: Boolean(post.workout),
        isPr: isPrPost || attachedPrs.length > 0,
      }),
      hasHighFived: post.hasHighFived,
      hasSaved: post.hasSaved,
      moderationLocked: post.moderationLocked,
      isEdited,
    };
  });

  // Get primary gym name (first gym or empty)
  const primaryGym = gyms.length > 0 ? gyms[0].name : '';

  // Current user derived from profile
  const currentUser = {
    firstName: profile?.firstName || 'User',
    lastName: profile?.lastName || '',
    displayName: profile?.displayName || 'user',
    bio: profile?.bio || 'No bio yet',
    avatar: profile?.avatarUrl || null,
    gym: primaryGym,
    socials: {
      twitter: socials?.twitter || '',
      instagram: socials?.instagram || '',
      facebook: socials?.facebook || '',
      threads: socials?.threads || '',
      linkedin: socials?.linkedin || '',
      github: socials?.github || '',
    },
    stats: {
      workouts: profileStats?.workouts ?? 0,
      gymPartners: profileStats?.gymPartners ?? 0,
      prsThisYear: profileStats?.prsThisYear ?? 0,
    },
  };

  const hasAnySocialLinks = Object.values(currentUser.socials).some(Boolean);

  // Use API posts if available, and optionally filter by hashtag/resource from query params.
  const tagFilteredPosts = activeTagFilter
    ? apiPosts.filter((post) =>
        postContainsHashtag(post.content, activeTagFilter),
      )
    : apiPosts;

  const postsToShow =
    resourceFilter === 'ALL'
      ? tagFilteredPosts
      : tagFilteredPosts.filter((post) =>
          post.resourceTags.includes(resourceFilter),
        );

  const sortedPosts = postsToShow;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const workoutsLast7Days = recentWorkouts.filter((workout) => {
    const performedAt = new Date(workout.performed);
    return !Number.isNaN(performedAt.getTime()) && performedAt >= sevenDaysAgo;
  }).length;

  const postsThisWeek = user?.sub
    ? feedPosts.filter((post) => {
        const postedAt = new Date(post.createdAt);
        return (
          post.author.id === user.sub &&
          !Number.isNaN(postedAt.getTime()) &&
          postedAt >= weekStart
        );
      }).length
    : 0;

  const workoutStreakDays = calculateWorkoutStreakDays(recentWorkouts);
  const weeklyWorkoutTarget = 5;
  const weeklyWorkoutProgress = Math.min(
    100,
    Math.round((workoutsLast7Days / weeklyWorkoutTarget) * 100),
  );
  const workoutsRemaining = Math.max(
    0,
    weeklyWorkoutTarget - workoutsLast7Days,
  );

  const nearbyTraining = [...(gymStats?.trainingNow ?? [])]
    .sort(
      (a, b) =>
        new Date(a.sessionStartedAt).getTime() -
        new Date(b.sessionStartedAt).getTime(),
    )
    .slice(0, 4);

  const trimmedPostContent = postContent.trim();
  const composerEmbeds = useMemo(
    () => extractExternalEmbeds(postContent),
    [postContent],
  );
  const postWordCount = trimmedPostContent
    ? trimmedPostContent.split(/\s+/).length
    : 0;
  const hasAttachmentContext =
    postImages.length > 0 ||
    composerPrAttachments.length > 0 ||
    composerRecipeAttachments.length > 0 ||
    composerWorkoutPlanAttachments.length > 0 ||
    composerMealAttachments.length > 0 ||
    composerStackAttachments.length > 0 ||
    Boolean(selectedWorkout) ||
    Boolean(checkInGym);
  const postQualityHints: string[] = [];

  if (trimmedPostContent.length > 0 && trimmedPostContent.length < 20) {
    postQualityHints.push('Add a little more context so people can engage.');
  }
  if (trimmedPostContent.length > 0 && postWordCount < 4) {
    postQualityHints.push('Try sharing what you did, learned, or felt.');
  }
  if (trimmedPostContent.length > 0 && !hasAttachmentContext) {
    postQualityHints.push(
      'Add a photo, workout, or check-in to boost post quality.',
    );
  }

  const isPostLowEffort =
    trimmedPostContent.length > 0 &&
    !hasAttachmentContext &&
    (trimmedPostContent.length < 20 || postWordCount < 4);

  const coverImageUrl = profile?.coverUrl || '';
  const [isCoverImageLoaded, setIsCoverImageLoaded] = useState(false);

  useEffect(() => {
    setIsCoverImageLoaded(false);
  }, [coverImageUrl]);

  const handleRemoveComposerEmbed = useCallback((urlToRemove: string) => {
    setPostContent((prev) =>
      prev
        .replace(EMBED_URL_REGEX, (token) => {
          const normalized = normalizeExternalUrl(token);
          return normalized === urlToRemove ? '' : token;
        })
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
    );
  }, []);

  const handleRemoveComposerPrAttachment = useCallback((index: number) => {
    setComposerPrAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveComposerRecipeAttachment = useCallback((index: number) => {
    setComposerRecipeAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveComposerWorkoutPlanAttachment = useCallback(
    (index: number) => {
      setComposerWorkoutPlanAttachments((prev) =>
        prev.filter((_, i) => i !== index),
      );
    },
    [],
  );

  const handleRemoveComposerMealAttachment = useCallback((index: number) => {
    setComposerMealAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveComposerStackAttachment = useCallback((index: number) => {
    setComposerStackAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Full-width Cover Banner */}
      <div className="relative h-36 w-full overflow-hidden md:h-44 lg:h-52">
        {!coverImageUrl ? (
          <Skeleton className="h-full w-full rounded-none" />
        ) : (
          <>
            {!isCoverImageLoaded && (
              <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
            )}
            <img
              src={coverImageUrl}
              alt="Cover"
              onLoad={() => setIsCoverImageLoaded(true)}
              onError={() => setIsCoverImageLoaded(false)}
              className={cn(
                'h-full w-full object-cover transition-opacity duration-300',
                isCoverImageLoaded ? 'opacity-100' : 'opacity-0',
              )}
              loading="lazy"
              decoding="async"
            />
          </>
        )}
      </div>

      {/* Profile Header overlapping cover */}
      <div className="relative px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="-mt-12 mb-6 rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <Link to="/elevate/studio?section=profile" className="relative">
                {isProfileLoading ? (
                  <Skeleton className="h-24 w-24 rounded-2xl sm:h-28 sm:w-28" />
                ) : (
                  <AvatarOrSkeleton
                    src={currentUser.avatar}
                    alt={currentUser.firstName}
                    className="relative h-24 w-24 rounded-2xl border-2 border-background object-cover shadow-md sm:h-28 sm:w-28"
                  />
                )}
              </Link>
              <div className="pt-2">
                {isProfileLoading ? (
                  <>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-4 w-64" />
                  </>
                ) : (
                  <>
                    <Link
                      to="/elevate/studio?section=profile"
                      className="text-2xl font-bold hover:text-primary"
                    >
                      {currentUser.firstName} {currentUser.lastName}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-primary">
                        @{currentUser.displayName}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {currentUser.gym}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span>
                        <span className="font-semibold text-foreground">
                          {currentUser.stats.workouts}
                        </span>{' '}
                        <span className="text-muted-foreground">workouts</span>
                      </span>
                      <span>
                        <span className="font-semibold text-foreground">
                          {currentUser.stats.gymPartners}
                        </span>{' '}
                        <span className="text-muted-foreground">
                          gym partners
                        </span>
                      </span>
                      <span>
                        <span className="font-semibold text-foreground">
                          {currentUser.stats.prsThisYear}
                        </span>{' '}
                        <span className="text-muted-foreground">
                          PRs this year
                        </span>
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {currentUser.socials.twitter && (
                <a
                  href={`https://twitter.com/${currentUser.socials.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              )}
              {currentUser.socials.instagram && (
                <a
                  href={`https://instagram.com/${currentUser.socials.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}
              {currentUser.socials.facebook && (
                <a
                  href={`https://facebook.com/${currentUser.socials.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              )}
              {currentUser.socials.threads && (
                <a
                  href={`https://threads.net/@${currentUser.socials.threads}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717-1.33 1.66-2.025 4.032-2.048 7.037v.124c.023 3.025.718 5.406 2.066 7.07 1.429 1.762 3.622 2.664 6.52 2.68 2.386-.017 4.258-.61 5.574-1.763 1.263-1.105 1.903-2.546 1.903-4.285 0-1.312-.416-2.33-1.237-3.027-.689-.583-1.546-.894-2.604-.949-.555 1.633-1.452 2.812-2.668 3.506-1.082.618-2.28.813-3.39.576-1.1-.234-2.023-.835-2.668-1.74-.728-1.02-.97-2.347-.668-3.648.506-2.18 2.285-3.682 4.587-3.875.943-.08 1.928.088 2.876.489l.27-.737c-.126-1.252-.61-2.197-1.445-2.813-.793-.586-1.836-.885-3.1-.889-1.263.002-2.306.305-3.1.9-.83.623-1.388 1.524-1.664 2.682l-1.992-.46c.365-1.565 1.131-2.794 2.276-3.652 1.17-.878 2.61-1.326 4.28-1.335h.01c1.668.01 3.108.458 4.28 1.332 1.03.77 1.742 1.832 2.12 3.16.44.126.863.278 1.263.456 1.328.59 2.387 1.52 3.15 2.762.807 1.313 1.217 2.923 1.217 4.782 0 2.29-.837 4.265-2.489 5.875-1.6 1.56-3.834 2.398-6.643 2.493h-.142zm-1.63-8.358c.665.082 1.326-.019 1.87-.284.728-.355 1.29-1.01 1.67-1.94-.64-.158-1.286-.225-1.918-.203-1.378.115-2.331.93-2.58 2.002-.147.632-.023 1.215.364 1.64.263.29.606.47.994.555.005 0 .01 0 .014.002l.1.015.085.012.101.011.096.008.106.005.098.002z" />
                  </svg>
                </a>
              )}
              {currentUser.socials.linkedin && (
                <a
                  href={`https://linkedin.com/in/${currentUser.socials.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              )}
              {currentUser.socials.github && (
                <a
                  href={`https://github.com/${currentUser.socials.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                </a>
              )}
              {hasAnySocialLinks && (
                <span
                  aria-hidden="true"
                  className="mx-1 h-8 w-px shrink-0 bg-border/70"
                />
              )}
              <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/60 p-1">
                <Link
                  to="/elevate/studio?section=profile"
                  aria-label="Edit Profile"
                  title="Edit Profile"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <SquarePen className="h-4 w-4" />
                </Link>
                <Link
                  to="/elevate/studio?section=settings"
                  aria-label="Settings"
                  title="Settings"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                </Link>
                <Link
                  to="/elevate/studio?section=partners"
                  aria-label="Gym Partners"
                  title="Gym Partners"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Users className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-start gap-6">
          {/* Left Sidebar */}
          <div className="hidden w-70 shrink-0 space-y-4 lg:block xl:sticky xl:top-20 xl:w-72 2xl:w-80">
            {/* Personal Momentum */}
            <Card className="card-elevated border-primary/20 bg-linear-to-br from-card via-card to-primary/5">
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Momentum
                    </p>
                    <h3 className="font-semibold">Personal Momentum</h3>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    Live
                  </span>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Workout streak</p>
                    <p className="text-sm font-semibold text-primary">
                      {workoutStreakDays} day
                      {workoutStreakDays === 1 ? '' : 's'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Based on your recent logged sessions
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">
                      Workouts (7d)
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {workoutsLast7Days}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">
                      Posts (week)
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {postsThisWeek}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Next milestone</p>
                    <p className="text-xs text-muted-foreground">
                      {workoutsLast7Days}/{weeklyWorkoutTarget} workouts
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${weeklyWorkoutProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {workoutsRemaining > 0
                      ? `${workoutsRemaining} workout${workoutsRemaining === 1 ? '' : 's'} to hit your weekly target`
                      : 'Weekly target reached. Keep the streak alive.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Gym Partners */}
            <Card className="card-elevated border-border/70 bg-card">
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Network
                    </p>
                    <h3 className="font-semibold">Gym Partners</h3>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {partners.length}
                  </span>
                </div>
                <div className="mb-3">
                  <Link
                    to="/elevate/studio?section=partners"
                    className="inline-flex items-center rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    See all
                  </Link>
                </div>
                <div className="space-y-3">
                  {partners.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/70 py-4 text-center text-sm text-muted-foreground">
                      No gym partners yet
                    </p>
                  ) : (
                    partners.slice(0, 5).map((partner) => (
                      <div
                        key={partner.id}
                        className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-2.5 transition-colors hover:bg-muted/40"
                      >
                        <div className="relative">
                          <AvatarOrSkeleton
                            src={partner.user.avatarUrl}
                            alt={partner.user.displayName || 'Partner'}
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {partner.user.displayName || 'Anonymous'}
                          </p>
                          {partner.user.gym && (
                            <p className="text-xs text-muted-foreground truncate">
                              {partner.user.gym.name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Suggested Partners */}
            <Card className="card-elevated border-border/70 bg-card">
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Discover
                    </p>
                    <h3 className="font-semibold">Suggested Partners</h3>
                  </div>
                  <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-600 dark:text-sky-400">
                    {suggestions.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {suggestions.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/70 py-4 text-center text-sm text-muted-foreground">
                      No suggestions available
                    </p>
                  ) : (
                    suggestions.slice(0, 3).map((suggestion) => (
                      <div
                        key={suggestion.user.id}
                        className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-2.5 transition-colors hover:bg-muted/40"
                      >
                        <AvatarOrSkeleton
                          src={suggestion.user.avatarUrl}
                          alt={suggestion.user.displayName || 'User'}
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {suggestion.user.displayName || 'Anonymous'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {suggestion.sharedGyms.length > 0
                              ? `Same gym${suggestion.mutualPartners > 0 ? ` • ${suggestion.mutualPartners} mutual` : ''}`
                              : suggestion.mutualPartners > 0
                                ? `${suggestion.mutualPartners} mutual partners`
                                : 'Suggested for you'}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() =>
                            sendPartnerRequest.mutate({
                              receiverId: suggestion.user.id,
                            })
                          }
                          disabled={sendPartnerRequest.isPending}
                        >
                          Add
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Feed - Center Column */}
          <div className="min-w-0 flex-1 space-y-4">
            {/* Quick Composer - Facebook style */}
            <Card className="card-elevated border-primary/20 bg-linear-to-br from-card via-card to-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AvatarOrSkeleton
                    src={currentUser.avatar}
                    alt="You"
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                  <button
                    onClick={() => setComposerOpen(true)}
                    className="flex-1 rounded-full border border-border/60 bg-background/80 px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                  >
                    What's on your mind, {currentUser.firstName}?
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border/70 pt-3 sm:grid-cols-3">
                  <button className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted">
                    <Activity className="h-5 w-5 text-red-500" />
                    Live video
                  </button>
                  <button
                    onClick={() => {
                      setComposerOpen(true);
                      setTimeout(() => fileInputRef.current?.click(), 100);
                    }}
                    className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <Camera className="h-5 w-5 text-green-500" />
                    Photo/video
                  </button>
                  <button
                    onClick={() => {
                      setComposerOpen(true);
                      setTimeout(() => setWorkoutSelectorOpen(true), 100);
                    }}
                    className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <Flame className="h-5 w-5 text-primary" />
                    Log workout
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Stories row */}
            <Card className="overflow-hidden">
              <StoriesBar />
            </Card>

            {/* Feed Tabs */}
            <div className="rounded-xl border border-border/60 bg-card/70 p-2 shadow-xs backdrop-blur-sm">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Feed Filters
                </p>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {sortedPosts.length} posts
                </span>
              </div>
              {activeTagFilter && (
                <div className="mb-2 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
                  <span className="text-primary">
                    Showing posts tagged #{activeTagFilter}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextParams = new URLSearchParams(searchParams);
                      nextParams.delete('tag');
                      setSearchParams(nextParams);
                    }}
                    className="font-medium text-primary hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}
              {resourceFilter !== 'ALL' && (
                <div className="mb-2 flex items-center justify-between rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs">
                  <span className="text-sky-600 dark:text-sky-300">
                    Resource filter: {resourceFilter}
                  </span>
                  <button
                    type="button"
                    onClick={() => setResourceFilter('ALL')}
                    className="font-medium text-sky-600 hover:underline dark:text-sky-300"
                  >
                    Clear
                  </button>
                </div>
              )}
              {/* Feed Mode Selector */}
              <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/50 p-1">
                <button
                  onClick={() => {
                    setShowOnlyMyPosts(false);
                    setFeedMode('PARTNERS');
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                    !showOnlyMyPosts && feedMode === 'PARTNERS'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title="Posts from your gym partners"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Partners
                </button>
                <button
                  onClick={() => {
                    setShowOnlyMyPosts(false);
                    setFeedMode('PUBLIC');
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                    !showOnlyMyPosts && feedMode === 'PUBLIC'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title="All public posts"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Public
                </button>
                <button
                  onClick={() => {
                    setShowOnlyMyPosts(false);
                    setFeedMode('MY_GYM');
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                    !showOnlyMyPosts && feedMode === 'MY_GYM'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title="Posts from people at your gym"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  My Gym
                </button>
                <button
                  onClick={() => setShowOnlyMyPosts(true)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                    showOnlyMyPosts
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title="Show only posts you authored"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                  My Posts
                </button>
                <button
                  onClick={() => {
                    setShowOnlyMyPosts(false);
                    setFeedMode('MOMENTUM');
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                    !showOnlyMyPosts && feedMode === 'MOMENTUM'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title="Trending posts ranked by engagement"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  Momentum
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setResourceFilter('ALL')}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    resourceFilter === 'ALL'
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border/70 text-muted-foreground hover:text-foreground',
                  )}
                >
                  All resources
                </button>
                {RESOURCE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setResourceFilter(tag)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                      resourceFilter === tag
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border/70 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {pendingRealtimeUpdates > 0 && !isNearTop && (
              <div className="sticky top-18 z-20 flex justify-center">
                <Button
                  size="sm"
                  className="rounded-full shadow-lg"
                  onClick={() => {
                    refreshFeed();
                    setPendingRealtimeUpdates(0);
                  }}
                >
                  {pendingRealtimeUpdates} new update
                  {pendingRealtimeUpdates === 1 ? '' : 's'} • Tap to refresh
                </Button>
              </div>
            )}

            {/* Feed Posts */}
            <div className="space-y-4">
              {isFeedLoading ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="card-elevated">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-11 w-11 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-20 w-full" />
                      <div className="flex gap-4">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : sortedPosts.length === 0 ? (
                // Empty state
                <Card className="card-elevated">
                  <CardContent className="p-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <svg
                        className="h-8 w-8 text-muted-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {showOnlyMyPosts
                        ? 'No posts from you yet'
                        : 'No posts yet'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {showOnlyMyPosts
                        ? 'Create your first post to start building your personal feed history.'
                        : 'Be the first to share your workout! Click above to create a post.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                sortedPosts.map((post) => (
                  <Card
                    key={post.id}
                    className={cn(
                      'card-elevated card-hoverable',
                      post.isPR && 'ring-1 ring-green-400/40',
                    )}
                  >
                    <CardContent className="p-4">
                      {/* Post Header */}
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Link to={`/elevate/${post.user.username}`}>
                            <AvatarOrSkeleton
                              src={post.user.avatar}
                              alt={post.user.name}
                              className="h-11 w-11 shrink-0 rounded-full object-cover"
                            />
                          </Link>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2 flex-wrap">
                              <Link
                                to={`/elevate/${post.user.username}`}
                                className="max-w-full truncate font-semibold hover:text-primary"
                              >
                                {post.user.name}
                              </Link>
                              {post.checkIn && (
                                <span className="min-w-0 text-muted-foreground">
                                  checked in at{' '}
                                  <span className="inline-block max-w-full truncate align-bottom font-medium text-orange-500">
                                    {post.checkIn.gymName}
                                  </span>
                                </span>
                              )}
                              {post.user.isCoach && (
                                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-500">
                                  Coach
                                </span>
                              )}
                              {post.isPR && (
                                <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-500">
                                  New PR!
                                </span>
                              )}
                              {post.type === 'milestone' && (
                                <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                                  Milestone
                                </span>
                              )}
                              {post.type === 'achievement' && (
                                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-500">
                                  Achievement
                                </span>
                              )}
                              {post.type === 'challenge' && (
                                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-500">
                                  Challenge
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {post.user.gym && (
                                <>
                                  <span>{post.user.gym}</span>
                                  <span>•</span>
                                </>
                              )}
                              {post.privacy === 'PUBLIC' && (
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                                  />
                                </svg>
                              )}
                              {post.privacy === 'FRIENDS' && (
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                                  />
                                </svg>
                              )}
                              {post.privacy === 'PRIVATE' && (
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                  />
                                </svg>
                              )}
                              {post.moderationLocked && (
                                <span
                                  className="flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-amber-600"
                                  title="This post is under moderation review"
                                >
                                  <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                    />
                                  </svg>
                                  <span className="text-[10px] font-medium">
                                    Under Review
                                  </span>
                                </span>
                              )}
                              <span>{post.timeAgo}</span>
                              {post.isEdited && (
                                <span
                                  className="text-muted-foreground/70"
                                  title="This post has been edited"
                                >
                                  • edited
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="text-muted-foreground hover:text-foreground"
                              onPointerDown={(e) => {
                                if (!isNativeApp()) return;
                                e.preventDefault();
                                const isOwner = post.authorId === user?.sub;
                                showNativeActionSheet(
                                  'Post',
                                  isOwner
                                    ? [
                                        {
                                          title: 'Edit post',
                                          handler: () => {
                                            setEditPostId(post.id);
                                            setEditContent(post.content);
                                          },
                                        },
                                        {
                                          title: 'Delete post',
                                          destructive: true,
                                          handler: () =>
                                            setDeletePostId(post.id),
                                        },
                                      ]
                                    : [
                                        {
                                          title: post.moderationLocked
                                            ? 'Already under moderation'
                                            : 'Report post',
                                          destructive: !post.moderationLocked,
                                          handler: () => {
                                            if (!post.moderationLocked)
                                              setReportPostId(post.id);
                                          },
                                        },
                                      ],
                                );
                              }}
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                                />
                              </svg>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {post.authorId === user?.sub && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditPostId(post.id);
                                    setEditContent(post.content);
                                  }}
                                >
                                  <svg
                                    className="mr-2 h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                                    />
                                  </svg>
                                  Edit post
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeletePostId(post.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <svg
                                    className="mr-2 h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                    />
                                  </svg>
                                  Delete post
                                </DropdownMenuItem>
                              </>
                            )}
                            {post.authorId !== user?.sub && (
                              <DropdownMenuItem
                                onClick={() =>
                                  !post.moderationLocked &&
                                  setReportPostId(post.id)
                                }
                                disabled={post.moderationLocked}
                              >
                                <svg
                                  className="mr-2 h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={1.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
                                  />
                                </svg>
                                {post.moderationLocked
                                  ? 'Already under moderation'
                                  : 'Report post'}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Post Content */}
                      <PostContentWithEmbeds
                        postId={post.id}
                        content={post.content}
                        onExternalLinkClick={handleExternalLinkClick}
                      />

                      {post.resourceTags.length > 0 && (
                        <div className="mb-3 flex flex-wrap items-center gap-1.5">
                          {post.resourceTags.map((tag: ResourceTag) => (
                            <button
                              key={`${post.id}-${tag}`}
                              type="button"
                              onClick={() => setResourceFilter(tag)}
                              className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-600 transition-colors hover:bg-sky-500/15 dark:text-sky-300"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}

                      <PrAttachmentCards attachments={post.attachedPrs || []} />

                      <RecipeAttachmentCards
                        attachments={post.attachedRecipes || []}
                        linkPublicRecipes
                      />

                      <WorkoutPlanAttachmentCards
                        attachments={post.attachedWorkoutPlans || []}
                        linkPublicPlans
                      />

                      <MealAttachmentCards
                        attachments={post.attachedMeals || []}
                      />

                      <StackAttachmentCards
                        attachments={post.attachedStacks || []}
                      />

                      {(() => {
                        if (post.attachedPrs && post.attachedPrs.length > 0) {
                          return null;
                        }

                        const prDetails = getPrDetailsForPost(post);
                        if (!prDetails) {
                          return null;
                        }

                        return (
                          <PrCelebrationCard
                            details={prDetails}
                            milestoneLabel={post.milestone?.label}
                          />
                        );
                      })()}

                      {post.moderationLocked && (
                        <div className="mb-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                          This post is under moderation review. Some
                          interactions are temporarily limited while we verify
                          reports.
                        </div>
                      )}

                      {/* Post Images */}
                      {post.images && post.images.length > 0 && (
                        <div
                          className={cn(
                            'mb-4 gap-2 overflow-hidden rounded-xl',
                            post.images.length === 1 && 'grid grid-cols-1',
                            post.images.length === 2 &&
                              (isMobile
                                ? 'grid grid-cols-1'
                                : 'grid grid-cols-2'),
                            post.images.length >= 3 &&
                              (isMobile
                                ? 'grid grid-cols-1'
                                : 'grid grid-cols-2'),
                          )}
                        >
                          {post.images.slice(0, 4).map((image, i) => (
                            <div
                              key={i}
                              onClick={() => openLightbox(post.images, i)}
                              className={cn(
                                'relative overflow-hidden bg-muted cursor-pointer transition-opacity hover:opacity-90',
                                post.images.length === 1 && 'aspect-video',
                                post.images.length === 2 && 'aspect-square',
                                post.images.length === 3 &&
                                  i === 0 &&
                                  'row-span-2 aspect-square',
                                post.images.length === 3 &&
                                  i > 0 &&
                                  'aspect-video',
                                post.images.length >= 4 && 'aspect-square',
                                i === 0 && 'rounded-tl-xl',
                                i === 1 &&
                                  post.images.length === 2 &&
                                  'rounded-tr-xl',
                                i === 1 &&
                                  post.images.length > 2 &&
                                  'rounded-tr-xl',
                                (i === post.images.length - 1 || i === 3) &&
                                  'rounded-br-xl',
                                ((i === 0 && post.images.length <= 2) ||
                                  (i === 2 && post.images.length > 2)) &&
                                  'rounded-bl-xl',
                              )}
                            >
                              <img
                                src={image}
                                alt={`Post image ${i + 1}`}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                              {i === 3 && post.images.length > 4 && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xl font-bold text-white">
                                  +{post.images.length - 4}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Workout Details */}
                      {post.workout && (
                        <div className="mb-4 rounded-xl border border-border/50 bg-muted/30 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <svg
                                className="h-5 w-5 text-primary"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                                />
                              </svg>
                              <span className="font-medium">
                                {post.workout.name}
                              </span>
                            </div>
                            {post.workout.duration && (
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span>{post.workout.duration}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">
                                Exercises:
                              </span>
                              <span className="font-medium">
                                {post.workout.exerciseCount}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">
                                Sets:
                              </span>
                              <span className="font-medium">
                                {post.workout.totalSets}
                              </span>
                            </div>
                            {post.workout.totalVolume && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">
                                  Volume:
                                </span>
                                <span className="font-medium text-primary">
                                  {post.workout.totalVolume}
                                </span>
                              </div>
                            )}
                            {post.workout.totalDistance && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">
                                  Distance:
                                </span>
                                <span className="font-medium text-primary">
                                  {post.workout.totalDistance}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Milestone Display */}
                      {post.milestone && (
                        <div className="mb-4 flex items-center justify-center rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-6">
                          <div className="text-center">
                            <p className="text-5xl font-bold text-yellow-500">
                              {post.milestone.value}
                            </p>
                            <p className="mt-2 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                              {post.milestone.label}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Achievement Card */}
                      {post.achievement && (
                        <div className="mb-4 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20 text-2xl">
                              🏆
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium uppercase tracking-wide text-purple-500">
                                Achievement Unlocked
                              </p>
                              <p className="mt-0.5 text-sm font-semibold text-foreground">
                                {post.achievement.name}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {post.achievement.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Challenge Card */}
                      {post.challenge && (
                        <a
                          href={`/challenges/${post.challenge.id}`}
                          className="mb-4 block rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 transition-colors hover:bg-blue-500/15"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-blue-500">
                              {post.challenge.isOfficial
                                ? '⭐ Official Challenge'
                                : 'Community Challenge'}
                            </p>
                            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-medium text-blue-500">
                              {post.challenge.status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {post.challenge.title}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              🎯 {post.challenge.goalValue}{' '}
                              {post.challenge.goalUnit}
                            </span>
                            <span>
                              👥 {post.challenge.participantCount} participants
                            </span>
                          </div>
                        </a>
                      )}

                      {/* Reactions */}
                      <div className="flex items-center justify-between border-t border-border/50 pt-4">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => {
                              if (post.moderationLocked) return;
                              void hapticsLight();
                              toggleHighFive.mutate(post.id);
                            }}
                            className={cn(
                              'flex items-center gap-2 text-sm transition-colors',
                              post.moderationLocked &&
                                'cursor-not-allowed opacity-50 text-muted-foreground',
                              post.hasHighFived
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-primary',
                            )}
                            disabled={post.moderationLocked}
                          >
                            <svg
                              className="h-5 w-5"
                              fill={post.hasHighFived ? 'currentColor' : 'none'}
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575a1.575 1.575 0 10-3.15 0v8.175a6.75 6.75 0 006.75 6.75h2.018a5.25 5.25 0 003.712-1.538l1.732-1.732a5.25 5.25 0 001.538-3.712l.003-2.024a.668.668 0 01.198-.471 1.575 1.575 0 10-2.228-2.228 3.818 3.818 0 00-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0116.35 15"
                              />
                            </svg>
                            <span className="font-medium">
                              {post.reactions.highFives}
                            </span>
                            <span className="hidden sm:inline">High-fives</span>
                          </button>
                          <button
                            onClick={() =>
                              !post.moderationLocked && toggleComments(post.id)
                            }
                            className={cn(
                              'flex items-center gap-2 text-sm transition-colors',
                              post.moderationLocked &&
                                'cursor-not-allowed opacity-50 text-muted-foreground',
                              expandedComments.has(post.id)
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                            disabled={post.moderationLocked}
                          >
                            <svg
                              className="h-5 w-5"
                              fill={
                                expandedComments.has(post.id)
                                  ? 'currentColor'
                                  : 'none'
                              }
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
                              />
                            </svg>
                            <span>{post.reactions.comments}</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleSave.mutate(post.id)}
                            className={cn(
                              'text-sm transition-colors',
                              post.hasSaved
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                            title={post.hasSaved ? 'Unsave post' : 'Save post'}
                          >
                            <svg
                              className="h-5 w-5"
                              fill={post.hasSaved ? 'currentColor' : 'none'}
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                              />
                            </svg>
                          </button>
                          {canShare() && (
                            <button
                              onClick={async () => {
                                const url = buildDeepLinkUrl(
                                  `/elevate/${post.user.username}`,
                                );
                                const shared = await shareContent({
                                  text: post.content?.slice(0, 120),
                                  url,
                                  imageUrl: post.images?.[0],
                                });
                                if (!shared) {
                                  toast.error('Unable to share');
                                }
                              }}
                              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                              title="Share post"
                            >
                              <Share2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Comments Section */}
                      {expandedComments.has(post.id) && (
                        <CommentSection
                          postId={post.id}
                          commentCount={post.reactions.comments}
                          commentText={commentTexts[post.id] || ''}
                          onCommentTextChange={(text) =>
                            setCommentTexts((prev) => ({
                              ...prev,
                              [post.id]: text,
                            }))
                          }
                          onAddComment={() => handleAddComment(post.id)}
                          onExternalLinkClick={handleExternalLinkClick}
                          isSubmitting={createComment.isPending}
                          isLocked={post.moderationLocked}
                          currentUserAvatar={currentUser.avatar}
                        />
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Load More */}
            <div ref={loadMoreRef} className="flex justify-center py-2">
              {hasNextPage ? (
                <Button
                  variant="outline"
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? 'Loading more...' : 'Load more'}
                </Button>
              ) : sortedPosts.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  You&apos;re all caught up.
                </p>
              ) : null}
            </div>
          </div>

          {/* Right Sidebar - Gym Activity & Partners */}
          <div className="hidden w-70 shrink-0 space-y-4 xl:sticky xl:top-20 xl:block xl:w-72 2xl:w-80">
            {/* Today at Your Gym */}
            {gyms.length > 0 && (
              <Card className="card-elevated border-primary/20 bg-linear-to-br from-card via-card to-primary/5">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Today at Your Gym
                    </p>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                      {gymStats?.trainingNow.length || 0} training now
                    </span>
                  </div>
                  <h3 className="mb-3 min-w-0 truncate text-lg font-semibold">
                    {gyms[0]?.name || 'Your Gym'}
                  </h3>
                  <div className="space-y-3">
                    {gymStats?.peakHours && gymStats.peakHours.length > 0 && (
                      <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">
                            Peak hours (last 30 days)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(() => {
                              const topHour = gymStats.peakHours[0];
                              return formatHourRange(topHour.hour);
                            })()}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Most active session start window at your gym
                        </p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full justify-center"
                      size="sm"
                      asChild
                    >
                      <Link
                        to="/elevate/studio?section=partners"
                        className="min-w-0"
                      >
                        <svg
                          className="mr-2 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                          />
                        </svg>
                        <span className="truncate">Find gym partners</span>
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Nearby Activity */}
            <Card className="card-elevated border-border/70 bg-card">
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Live Nearby
                    </p>
                    <h3 className="font-semibold">Nearby Activity</h3>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {nearbyTraining.length} live
                  </span>
                </div>

                <div className="space-y-3">
                  {nearbyTraining.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/70 py-4 text-center text-sm text-muted-foreground">
                      No live sessions nearby right now
                    </p>
                  ) : (
                    nearbyTraining.map((trainingUser) => {
                      const sessionStart = new Date(
                        trainingUser.sessionStartedAt,
                      );
                      const startedLabel = Number.isNaN(sessionStart.getTime())
                        ? 'Started recently'
                        : `Started ${formatDistanceToNow(sessionStart, { addSuffix: true })}`;

                      return (
                        <div
                          key={trainingUser.id}
                          className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-2.5"
                        >
                          <div className="relative">
                            <AvatarOrSkeleton
                              src={trainingUser.avatarUrl}
                              alt={trainingUser.displayName || 'Athlete'}
                              className="h-10 w-10 shrink-0 rounded-full object-cover"
                            />
                            <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {trainingUser.displayName || 'Anonymous'}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {trainingUser.currentExercise ||
                                'In a workout session'}
                            </p>
                            <p className="truncate text-xs text-muted-foreground/90">
                              {startedLabel}
                              {trainingUser.gym?.name
                                ? ` • ${trainingUser.gym.name}`
                                : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pending Partner Requests */}
            {pendingRequests.length > 0 && (
              <Card className="card-elevated border-amber-400/30 bg-amber-500/5">
                <CardContent className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">Partner Requests</h3>
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                      {pendingRequests.length} new
                    </span>
                  </div>
                  <div className="space-y-3">
                    {pendingRequests.slice(0, 3).map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center gap-3 rounded-xl border border-amber-400/20 bg-background/60 p-2.5"
                      >
                        <AvatarOrSkeleton
                          src={request.user.avatarUrl}
                          alt={request.user.displayName || 'User'}
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {request.user.displayName || 'Anonymous'}
                          </p>
                          {request.user.gym && (
                            <p className="text-xs text-muted-foreground truncate">
                              {request.user.gym.name}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() =>
                              respondToRequest.mutate({
                                requestId: request.id,
                                action: 'ACCEPT',
                              })
                            }
                            disabled={respondToRequest.isPending}
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() =>
                              respondToRequest.mutate({
                                requestId: request.id,
                                action: 'REJECT',
                              })
                            }
                            disabled={respondToRequest.isPending}
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notifications Snapshot */}
            <Card className="card-elevated border-border/70 bg-card">
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Inbox
                    </p>
                    <h3 className="font-semibold">Notifications</h3>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {unreadNotificationsCount} unread
                  </span>
                </div>

                <div className="space-y-2.5">
                  {notifications.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/70 py-4 text-center text-sm text-muted-foreground">
                      No notifications yet
                    </p>
                  ) : (
                    notifications.slice(0, 4).map((notification) => (
                      <Link
                        key={notification.id}
                        to={notification.actionUrl || '/elevate'}
                        className={cn(
                          'block rounded-xl border border-border/60 bg-muted/20 p-2.5 transition-colors hover:bg-muted/40',
                          !notification.read &&
                            'border-primary/30 bg-primary/5',
                        )}
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <p className="line-clamp-1 text-sm font-medium">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {notification.body}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground/80">
                          {formatDistanceToNow(
                            new Date(notification.createdAt),
                            {
                              addSuffix: true,
                            },
                          )}
                        </p>
                      </Link>
                    ))
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  asChild
                >
                  <Link to="/elevate">
                    <Bell className="mr-2 h-4 w-4" />
                    Open notifications bell
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Trending at Your Gym */}
            {gymStats?.trendingExercises &&
              gymStats.trendingExercises.length > 0 && (
                <Card className="card-elevated border-border/70 bg-card">
                  <CardContent className="p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="font-semibold">Trending at Your Gym</h3>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        Top {Math.min(gymStats.trendingExercises.length, 5)}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {gymStats.trendingExercises
                        .slice(0, 5)
                        .map((exercise, index) => (
                          <div
                            key={exercise.id}
                            className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {index + 1}
                              </span>
                              <span className="text-sm truncate">
                                {exercise.name}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {exercise.count} today
                            </span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>
        </div>
      </div>

      {/* Create Post Dialog */}
      <Dialog
        open={composerOpen}
        onOpenChange={(open) => {
          setComposerOpen(open);
          if (!open) {
            setPostContent('');
            setPostImages((prev) => {
              for (const key of prev) {
                if (imagePreviewUrls[key])
                  URL.revokeObjectURL(imagePreviewUrls[key]);
              }
              return [];
            });
            setImagePreviewUrls({});
            setUploadStatuses([]);
            setComposerPrAttachments([]);
            setComposerRecipeAttachments([]);
            setComposerWorkoutPlanAttachments([]);
            setComposerMealAttachments([]);
            setPostType('TEXT');
            setSelectedWorkout(null);
            setCheckInGym(null);
            setCheckInSelectorOpen(false);
            setCheckInQuery('');
            setDuplicateBypassConfirmed(false);
            setSuggestionToken(null);
            setSuggestionRange(null);
            window.localStorage.removeItem(COMPOSER_DRAFT_KEY);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
          </DialogHeader>
          <div
            className="space-y-4"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex items-start gap-3">
              <AvatarOrSkeleton
                src={currentUser.avatar}
                alt="You"
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="font-medium">
                  {currentUser.firstName} {currentUser.lastName}
                </p>
                <button
                  onClick={() => {
                    const options: PostPrivacy[] = [
                      'PUBLIC',
                      'FRIENDS',
                      'PRIVATE',
                    ];
                    const currentIndex = options.indexOf(privacy);
                    setPrivacy(options[(currentIndex + 1) % options.length]);
                  }}
                  className="mt-1 inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted/80"
                >
                  {privacy === 'PUBLIC' ? (
                    <>
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Public
                    </>
                  ) : privacy === 'FRIENDS' ? (
                    <>
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                        />
                      </svg>
                      Friends
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      Only me
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Textarea with drag/drop overlay */}
            <div className="relative">
              <Textarea
                ref={composerTextareaRef}
                placeholder="What's on your mind?"
                value={postContent}
                onChange={(e) =>
                  handleComposerInputChange(
                    e.target.value,
                    e.target.selectionStart ?? composerCaretPosition,
                  )
                }
                onPaste={handleComposerPaste}
                onKeyDown={handleComposerKeyDown}
                onClick={handleComposerSelectionChange}
                onKeyUp={handleComposerSelectionChange}
                className="min-h-32 resize-none border-0 bg-transparent text-lg focus-visible:ring-0"
                autoFocus
              />
              {(showMentionSuggestions || showHashtagSuggestions) && (
                <div className="absolute bottom-2 left-2 right-2 z-20 rounded-lg border border-border/70 bg-popover/95 p-2 shadow-md backdrop-blur-sm">
                  <p className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span>
                      {showMentionSuggestions
                        ? 'Mention suggestions'
                        : 'Hashtag suggestions'}
                    </span>
                    <span>↑/↓ navigate • Enter/Tab insert</span>
                  </p>
                  <div className="space-y-1">
                    {composerSuggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.key}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() =>
                          setActiveComposerSuggestionIndex(index)
                        }
                        onClick={() =>
                          applyComposerSuggestion(suggestion.replacement)
                        }
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
                          index === activeComposerSuggestionIndex
                            ? 'bg-muted'
                            : 'hover:bg-muted',
                        )}
                      >
                        {showMentionSuggestions && (
                          <AvatarOrSkeleton
                            src={suggestion.avatarUrl}
                            alt={suggestion.primary || 'User'}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">
                            {suggestion.primary}
                          </span>
                          {suggestion.secondary && (
                            <span className="block text-xs text-muted-foreground">
                              {suggestion.secondary}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                    {showMentionSuggestions && isMentionSearching && (
                      <p className="px-2 py-1 text-xs text-muted-foreground">
                        Searching users...
                      </p>
                    )}
                  </div>
                </div>
              )}
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-8 w-8 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                      />
                    </svg>
                    <p className="mt-2 text-sm font-medium text-primary">
                      Drop images here
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Composer link previews */}
            {composerEmbeds.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Link preview
                </p>
                <div className="space-y-2">
                  {composerEmbeds.map((embed) => (
                    <ComposerEmbedPreviewCard
                      key={embed.url}
                      embed={embed}
                      onRemove={() => handleRemoveComposerEmbed(embed.url)}
                    />
                  ))}
                </div>
              </div>
            )}

            {composerPrAttachments.length > 0 && (
              <div className="space-y-2">
                <PrAttachmentCards
                  attachments={composerPrAttachments}
                  title="Attached PR card"
                  compactSingle
                />
                <div className="-mt-1 flex flex-wrap gap-1.5">
                  {composerPrAttachments.map((item, index) => (
                    <button
                      key={`${item.exerciseName}-${item.prTypeLabel}-${index}`}
                      type="button"
                      onClick={() => handleRemoveComposerPrAttachment(index)}
                      className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                    >
                      Remove {item.exerciseName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {composerRecipeAttachments.length > 0 && (
              <div className="space-y-2">
                <RecipeAttachmentCards
                  attachments={composerRecipeAttachments}
                />
                <div className="-mt-1 flex flex-wrap gap-1.5">
                  {composerRecipeAttachments.map((item, index) => (
                    <button
                      key={`${item.recipeId}-${item.name}-${index}`}
                      type="button"
                      onClick={() =>
                        handleRemoveComposerRecipeAttachment(index)
                      }
                      className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                    >
                      Remove {item.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {composerWorkoutPlanAttachments.length > 0 && (
              <div className="space-y-2">
                <WorkoutPlanAttachmentCards
                  attachments={composerWorkoutPlanAttachments}
                />
                <div className="-mt-1 flex flex-wrap gap-1.5">
                  {composerWorkoutPlanAttachments.map((item, index) => (
                    <button
                      key={`${item.planId}-${item.name}-${index}`}
                      type="button"
                      onClick={() =>
                        handleRemoveComposerWorkoutPlanAttachment(index)
                      }
                      className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                    >
                      Remove {item.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {composerMealAttachments.length > 0 && (
              <div className="space-y-2">
                <MealAttachmentCards attachments={composerMealAttachments} />
                <div className="-mt-1 flex flex-wrap gap-1.5">
                  {composerMealAttachments.map((item, index) => (
                    <button
                      key={`${item.mealType}-${item.date}-${index}`}
                      type="button"
                      onClick={() => handleRemoveComposerMealAttachment(index)}
                      className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                    >
                      Remove {item.mealLabel}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {composerStackAttachments.length > 0 && (
              <div className="space-y-2">
                <StackAttachmentCards attachments={composerStackAttachments} />
                <div className="-mt-1 flex flex-wrap gap-1.5">
                  {composerStackAttachments.map((item, index) => (
                    <button
                      key={`${item.stackId}-${item.name}-${index}`}
                      type="button"
                      onClick={() => handleRemoveComposerStackAttachment(index)}
                      className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                    >
                      Remove {item.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Workout Preview */}
            {selectedWorkout && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <svg
                        className="h-5 w-5 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">
                        {selectedWorkout.title || 'Workout'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedWorkout.performed), 'MMM d')} •{' '}
                        {selectedWorkout.exerciseCount} exercises •{' '}
                        {selectedWorkout.setCount} sets
                      </p>
                      {selectedWorkout.exerciseNames.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedWorkout.exerciseNames.slice(0, 3).join(', ')}
                          {selectedWorkout.exerciseNames.length > 3 &&
                            ` +${selectedWorkout.exerciseNames.length - 3} more`}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveWorkout}
                    className="rounded-full p-1 hover:bg-muted"
                  >
                    <svg
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Check-In Preview */}
            {checkInGym && (
              <div className="rounded-lg border bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-orange-100 dark:bg-orange-900/50 p-2">
                      <svg
                        className="h-5 w-5 text-orange-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                        Checking in at
                      </p>
                      <p className="font-semibold">{checkInGym.name}</p>
                      {checkInGym.formattedAddress && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {checkInGym.formattedAddress}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckInGym(null);
                      setCheckInQuery('');
                      setPostType('TEXT');
                    }}
                    className="rounded-full p-1 hover:bg-orange-100 dark:hover:bg-orange-900/50"
                  >
                    <svg
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Image Previews */}
            {postImages.length > 0 && (
              <div
                className={cn(
                  'grid gap-2',
                  isMobile ? 'grid-cols-2' : 'grid-cols-3',
                )}
              >
                {postImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imagePreviewUrls[url] ?? url}
                      alt={`Preview ${index + 1}`}
                      className="h-20 w-full rounded-md object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {(uploadStatuses.length > 0 || isPotentialDuplicatePost) && (
              <div className="space-y-2">
                {isPotentialDuplicatePost && (
                  <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    This looks similar to one of your recent posts. Click post
                    again to confirm.
                  </div>
                )}

                {uploadStatuses.length > 0 && (
                  <div className="rounded-lg border border-border/70 bg-muted/30 p-2">
                    <p className="mb-1 text-xs font-medium text-foreground/90">
                      Upload queue
                    </p>
                    <div className="space-y-1">
                      {uploadStatuses.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-2 py-1"
                        >
                          <p className="min-w-0 truncate text-xs text-muted-foreground">
                            {item.file.name}
                          </p>
                          {item.status === 'uploading' ? (
                            <span className="text-xs text-primary">
                              Uploading...
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleRetryUpload(item.id)}
                                className="text-xs font-medium text-primary hover:underline"
                              >
                                Retry
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDismissFailedUpload(item.id)
                                }
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="hidden"
              onChange={(e) =>
                e.target.files && handleFileUpload(e.target.files)
              }
            />

            {/* Footer with icons and post button */}
            {postQualityHints.length > 0 && (
              <div
                className={cn(
                  'rounded-lg border px-3 py-2',
                  isPostLowEffort
                    ? 'border-amber-400/40 bg-amber-500/10'
                    : 'border-border/70 bg-muted/30',
                )}
              >
                <p className="mb-1 text-xs font-medium text-foreground/90">
                  Post quality tips
                </p>
                <div className="space-y-1">
                  {postQualityHints.map((hint) => (
                    <p key={hint} className="text-xs text-muted-foreground">
                      {hint}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const result = await pickImage();
                    if (result.file) {
                      void handleFileUpload([result.file]);
                      return;
                    }
                    if (!result.native) fileInputRef.current?.click();
                  }}
                  disabled={isUploading || postImages.length >= 10}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
                  title="Add photos"
                >
                  {isUploading ? (
                    <svg
                      className="h-5 w-5 animate-spin text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                      />
                    </svg>
                  )}
                </button>
                <Popover
                  open={workoutSelectorOpen}
                  onOpenChange={setWorkoutSelectorOpen}
                >
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        'rounded-full p-2 hover:bg-muted',
                        selectedWorkout
                          ? 'text-primary'
                          : 'text-muted-foreground',
                      )}
                      title="Attach workout"
                      disabled={!!selectedWorkout}
                    >
                      <svg
                        className="h-5 w-5 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                        />
                      </svg>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 p-0">
                    <div className="border-b p-3">
                      <h4 className="font-medium">Recent Workouts</h4>
                      <p className="text-xs text-muted-foreground">
                        Select a workout to share
                      </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {(() => {
                        // Filter workouts based on post privacy
                        // PUBLIC post → only PUBLIC workouts
                        // FRIENDS post → PUBLIC and FRIENDS workouts
                        // PRIVATE post → all workouts
                        const filteredWorkouts = recentWorkouts.filter(
                          (workout) => {
                            if (privacy === 'PUBLIC')
                              return workout.privacy === 'PUBLIC';
                            if (privacy === 'FRIENDS')
                              return (
                                workout.privacy === 'PUBLIC' ||
                                workout.privacy === 'FRIENDS'
                              );
                            return true; // PRIVATE post can attach any workout
                          },
                        );

                        if (filteredWorkouts.length === 0) {
                          return (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              {recentWorkouts.length === 0
                                ? 'No workouts logged yet'
                                : `No ${privacy.toLowerCase()} workouts available`}
                            </div>
                          );
                        }

                        return filteredWorkouts.map((workout) => (
                          <button
                            key={workout.id}
                            onClick={() => handleSelectWorkout(workout)}
                            className="w-full p-3 text-left hover:bg-muted transition-colors border-b last:border-b-0"
                          >
                            <div className="font-medium text-sm">
                              {workout.title || 'Workout'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(
                                new Date(workout.performed),
                                'MMM d, yyyy',
                              )}{' '}
                              • {workout.exerciseCount} exercises •{' '}
                              {workout.setCount} sets
                            </div>
                            {workout.exerciseNames.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {workout.exerciseNames.slice(0, 2).join(', ')}
                                {workout.exerciseNames.length > 2 &&
                                  ` +${workout.exerciseNames.length - 2}`}
                              </div>
                            )}
                          </button>
                        ));
                      })()}
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover
                  open={checkInSelectorOpen}
                  onOpenChange={(open) => {
                    setCheckInSelectorOpen(open);
                    if (!open) {
                      setCheckInQuery('');
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        'rounded-full p-2 hover:bg-muted',
                        checkInGym ? 'text-primary' : 'text-muted-foreground',
                      )}
                      title="Add check-in location"
                      disabled={!!checkInGym}
                    >
                      <svg
                        className="h-5 w-5 text-orange-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                        />
                      </svg>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 p-0">
                    <div className="border-b p-3">
                      <h4 className="font-medium">Check In</h4>
                      <p className="text-xs text-muted-foreground">
                        Search any place and add it to your post
                      </p>
                    </div>

                    <div className="border-b p-3">
                      <div className="relative">
                        <svg
                          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.045 6.045a7.5 7.5 0 0 0 10.607 10.607Z"
                          />
                        </svg>
                        <Input
                          value={checkInQuery}
                          onChange={(event) =>
                            setCheckInQuery(event.target.value)
                          }
                          placeholder="Search gym, studio, park, or city..."
                          className="h-9 pl-9"
                        />
                      </div>
                      {checkInSearchError && (
                        <p className="mt-2 text-xs text-destructive">
                          {checkInSearchError}
                        </p>
                      )}
                    </div>

                    {gyms.length > 0 && (
                      <div className="border-b p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Your gyms
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {gyms.slice(0, 5).map((gym) => (
                            <button
                              type="button"
                              key={gym.id}
                              onClick={() => {
                                setCheckInGym({ id: gym.id, name: gym.name });
                                setPostType('CHECK_IN');
                                setCheckInSelectorOpen(false);
                                setCheckInQuery('');
                              }}
                              className="rounded-full border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                            >
                              {gym.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="max-h-56 overflow-y-auto">
                      {isCheckInSearching ? (
                        <div className="space-y-2 p-3">
                          {[1, 2, 3].map((item) => (
                            <Skeleton key={item} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : checkInQuery.trim().length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">
                          Start typing to search locations with Mapbox
                        </p>
                      ) : checkInResults.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">
                          No places found for "{checkInQuery}"
                        </p>
                      ) : (
                        checkInResults.map((place) => (
                          <button
                            type="button"
                            key={place.id}
                            onClick={() =>
                              handleSelectCheckInPlace({
                                name: place.name,
                                formattedAddress:
                                  place.formattedAddress ||
                                  `${place.city}${place.state ? `, ${place.state}` : ''}`,
                              })
                            }
                            className="w-full border-b p-3 text-left transition-colors last:border-b-0 hover:bg-muted"
                          >
                            <p className="text-sm font-medium">{place.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {place.formattedAddress ||
                                `${place.city}${place.state ? `, ${place.state}` : ''}`}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-3">
                {postImages.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {postImages.length}/10 images
                  </span>
                )}
                <Button
                  onClick={handleCreatePost}
                  disabled={
                    !postContent.trim() || createPost.isPending || isUploading
                  }
                >
                  {createPost.isPending ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tip: Press Cmd/Ctrl+Enter to post. Press Esc to close.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox - Fullscreen */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Main image container */}
          <div className="flex h-full w-full items-center justify-center">
            {/* Previous button */}
            {lightboxImages.length > 1 && (
              <button
                onClick={() => navigateLightbox('prev')}
                className="absolute left-4 z-50 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
              >
                <svg
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
            )}

            {/* Image */}
            <img
              src={lightboxImages[lightboxIndex]}
              alt={`Image ${lightboxIndex + 1}`}
              className="max-h-screen max-w-full object-contain p-4"
              loading="lazy"
              decoding="async"
            />

            {/* Next button */}
            {lightboxImages.length > 1 && (
              <button
                onClick={() => navigateLightbox('next')}
                className="absolute right-4 z-50 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
              >
                <svg
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            )}

            {/* Image counter */}
            {lightboxImages.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm text-white">
                {lightboxIndex + 1} / {lightboxImages.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletePostId}
        onOpenChange={(open) => !open && setDeletePostId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              post and remove it from the feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePostId && queueDeletePost(deletePostId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePost.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!pendingExternalUrl}
        onOpenChange={(open) => !open && setPendingExternalUrl(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Vara?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to open an external website in a new tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingExternalUrl && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground break-all">
              {pendingExternalUrl}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Stay here</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExternalNavigation}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Post Dialog */}
      <Dialog
        open={!!editPostId}
        onOpenChange={(open) => {
          if (!open) {
            setEditPostId(null);
            setEditContent('');
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>
              Make changes to your post. Your followers will see it was edited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                placeholder="What's on your mind?"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-32 resize-none"
                maxLength={2000}
              />
              <div className="text-xs text-muted-foreground text-right">
                {editContent.length}/2000
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Tip:</span> Use #hashtags to
              categorize your post and @username to mention others.
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setEditPostId(null);
                setEditContent('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editPostId && editContent.trim()) {
                  const updateData: UpdateElevatePost = {
                    content: editContent.trim(),
                  };
                  // Only include images if they changed (for now we don't support editing images)
                  updatePost.mutate({
                    postId: editPostId,
                    data: updateData,
                  });
                }
              }}
              disabled={!editContent.trim() || updatePost.isPending}
            >
              {updatePost.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Post Dialog */}
      <Dialog
        open={!!reportPostId}
        onOpenChange={(open) => {
          if (!open) {
            setReportPostId(null);
            setReportReason(null);
            setReportDetails('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report Post</DialogTitle>
            <DialogDescription>
              Help us understand what's wrong with this post. Your report is
              anonymous.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Why are you reporting this post?</Label>
              <RadioGroup
                value={reportReason || ''}
                onValueChange={(value) =>
                  setReportReason(value as ElevateReportReason)
                }
                className="space-y-2"
              >
                {REPORT_REASONS.map((reason) => (
                  <div
                    key={reason.value}
                    className="flex items-start space-x-3 p-2 rounded-lg border hover:bg-accent/50 cursor-pointer"
                  >
                    <RadioGroupItem
                      value={reason.value}
                      id={reason.value}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={reason.value}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{reason.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {reason.description}
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            {reportReason && (
              <div className="space-y-2">
                <Label htmlFor="details">Additional details (optional)</Label>
                <Textarea
                  id="details"
                  placeholder="Provide any additional context..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  className="min-h-20"
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setReportPostId(null);
                setReportReason(null);
                setReportDetails('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (reportPostId && reportReason) {
                  reportPost.mutate({
                    postId: reportPostId,
                    data: {
                      reason: reportReason,
                      details: reportDetails || undefined,
                    },
                  });
                }
              }}
              disabled={!reportReason || reportPost.isPending}
            >
              {reportPost.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ElevatePage;
