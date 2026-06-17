import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useKeepAwake } from '@/hooks/use-keep-awake';
import { useOrientationLock } from '@/hooks/use-orientation-lock';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useDebounce } from '@/hooks/use-debounce';
import { hapticsMedium, hapticsNotification } from '@/lib/haptics';
import { maybePromptReview } from '@/lib/app-review';
import {
  formatDateInTimezone,
  getDaysAgoInTimezone,
} from '@varaperformance/core';
import { ActivitySummary, ActivitySummaryInline } from './activity-summary';
import { HRZoneChart } from './hr-zone-chart';
import { RouteMap } from './route-map';
import { useRestTimer } from '../../../hooks/use-rest-timer';
import { RestTimerOverlay } from '../../../components/rest-timer-overlay';

const buildElevatePrPayloadFromSession = (prs: NewPR[]): string => {
  const payload = prs.slice(0, 6).map((pr) => {
    const prTypeLabel =
      PR_TYPE_LABELS[pr.type as keyof typeof PR_TYPE_LABELS] || pr.type;
    const valueLabel = formatPRValue(
      pr.type as keyof typeof PR_TYPE_LABELS,
      pr.value,
    );

    return {
      exerciseName: pr.exerciseName,
      prTypeLabel,
      valueLabel,
      improvementLabel:
        pr.improvement !== undefined && pr.improvement > 0
          ? `+${pr.improvement.toFixed(1)}%`
          : undefined,
    };
  });

  return encodeURIComponent(JSON.stringify(payload));
};
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Trash2,
  Dumbbell,
  Loader2,
  TrendingUp,
  Activity,
  Search,
  ChevronRight,
  ChevronLeft,
  Lock,
  Users,
  Globe,
  Calendar,
  Check,
  X,
  Trophy,
  Star,
  Sparkles,
  Lightbulb,
  StickyNote,
  ShieldCheck,
  Settings,
  Target,
  MapPin,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useWorkoutSessions,
  useWorkoutSession,
  useDeleteSession,
  useWorkoutStats,
  useFrequentExercises,
  useCreateSession,
  useWorkoutGoalWithDefaults,
  useUpdateWorkoutGoal,
  useActiveSession,
  useStartSession,
  useEndSession,
  useAddWorkout,
  useUpdateSession,
  useUpdateSet,
  useAddSet,
  useDeleteSet,
  useUpdateWorkout,
  type WorkoutSessionResponse,
  type WorkoutResponse,
  type WorkoutSet,
  type CreateWorkoutSession,
  type NewPR,
} from '@/features/health';
import { PR_TYPE_LABELS, formatPRValue } from '@/features/health';
import { useExercises, type ExerciseResponse } from '@/features/health';
import {
  useTimezone,
  useProfileGyms,
  useUnitPreference,
} from '@/features/profile';
import {
  convertWeightFromStorage,
  convertWeightToStorage,
  convertDistanceFromStorage,
  convertDistanceToStorage,
  getWeightUnit,
  getDistanceUnit,
  formatWeight,
  formatDistance,
} from '@varaperformance/core';
import type {
  WorkoutPrivacy,
  WorkoutSessionSource,
  CreateWorkout,
  ActiveSession,
} from '@varaperformance/core';

// Helper to format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const WORKOUT_LOG_ONBOARDING_KEY = 'workout-log-onboarding-dismissed-v1';

// Get relative time (compares calendar dates, not time difference)
const getRelativeTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);

  // Compare calendar dates by resetting to midnight
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (today.getTime() - dateDay.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateString);
};

// Pre-computed sparkle positions for celebration animation
const SPARKLE_POSITIONS = [
  { left: 15, top: 20, delay: 0.3, opacity: 0.7, scale: 0.8 },
  { left: 85, top: 15, delay: 1.2, opacity: 0.9, scale: 0.6 },
  { left: 25, top: 75, delay: 0.8, opacity: 0.5, scale: 1.0 },
  { left: 70, top: 80, delay: 1.5, opacity: 0.8, scale: 0.7 },
  { left: 10, top: 50, delay: 0.1, opacity: 0.6, scale: 0.9 },
  { left: 90, top: 45, delay: 1.8, opacity: 0.7, scale: 0.5 },
  { left: 45, top: 10, delay: 0.5, opacity: 0.9, scale: 0.8 },
  { left: 55, top: 90, delay: 1.0, opacity: 0.4, scale: 1.1 },
  { left: 5, top: 85, delay: 0.7, opacity: 0.8, scale: 0.6 },
  { left: 95, top: 70, delay: 1.3, opacity: 0.5, scale: 0.9 },
  { left: 30, top: 35, delay: 0.2, opacity: 0.6, scale: 0.7 },
  { left: 60, top: 55, delay: 1.6, opacity: 0.9, scale: 0.5 },
  { left: 40, top: 65, delay: 0.9, opacity: 0.7, scale: 1.0 },
  { left: 75, top: 25, delay: 1.1, opacity: 0.8, scale: 0.8 },
  { left: 20, top: 95, delay: 0.4, opacity: 0.5, scale: 0.6 },
  { left: 80, top: 5, delay: 1.9, opacity: 0.6, scale: 0.9 },
  { left: 50, top: 40, delay: 0.6, opacity: 0.9, scale: 0.7 },
  { left: 35, top: 60, delay: 1.4, opacity: 0.4, scale: 1.0 },
  { left: 65, top: 30, delay: 1.7, opacity: 0.7, scale: 0.5 },
  { left: 12, top: 8, delay: 0.0, opacity: 0.8, scale: 0.8 },
];

// Privacy icon component
const PrivacyIcon = ({ privacy }: { privacy: WorkoutPrivacy }) => {
  switch (privacy) {
    case 'PUBLIC':
      return <Globe className="h-3 w-3" />;
    case 'FRIENDS':
      return <Users className="h-3 w-3" />;
    default:
      return <Lock className="h-3 w-3" />;
  }
};

const formatSourceLabel = (source: WorkoutSessionSource) => {
  return source.toLowerCase().replaceAll('_', ' ');
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasWordBoundaryMatch = (text: string, token: string): boolean => {
  if (!token.trim()) {
    return false;
  }

  return new RegExp(`(^|[^a-z0-9])${escapeRegex(token)}`, 'i').test(text);
};

const scoreExerciseSearchMatch = (
  exercise: ExerciseResponse,
  query: string,
): number => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return 1;
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return 1;
  }

  const name = exercise.name.toLowerCase();
  const category = exercise.category.toLowerCase();

  const matchesAllTokens = tokens.every(
    (token) =>
      hasWordBoundaryMatch(name, token) ||
      hasWordBoundaryMatch(category, token),
  );

  if (!matchesAllTokens) {
    return 0;
  }

  let score = 0;

  if (name.startsWith(normalizedQuery)) {
    score += 120;
  } else if (hasWordBoundaryMatch(name, normalizedQuery)) {
    score += 90;
  }

  for (const token of tokens) {
    if (hasWordBoundaryMatch(name, token)) {
      score += 12;
    } else if (hasWordBoundaryMatch(category, token)) {
      score += 5;
    }
  }

  return score;
};

const rankExercisesForPicker = (
  rawExercises: ExerciseResponse[],
  frequentIds: string[],
  search: string,
): ExerciseResponse[] => {
  const normalizedQuery = search.trim().toLowerCase();

  const ranked = rawExercises
    .map((exercise) => ({
      exercise,
      score: scoreExerciseSearchMatch(exercise, normalizedQuery),
      frequentIndex: frequentIds.indexOf(exercise.id),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      const aFrequent = a.frequentIndex !== -1;
      const bFrequent = b.frequentIndex !== -1;

      if (aFrequent && bFrequent) {
        return a.frequentIndex - b.frequentIndex;
      }
      if (aFrequent) {
        return -1;
      }
      if (bFrequent) {
        return 1;
      }
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.exercise.name.localeCompare(b.exercise.name);
    });

  return ranked.map((entry) => entry.exercise);
};

// Set form state
interface SetFormData {
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
}

// Workout form state (for building a session)
interface WorkoutFormData {
  exercise: ExerciseResponse | null;
  sets: SetFormData[];
}

// Determine input type based on exercise category
type ExerciseInputType = 'strength' | 'cardio' | 'bodyweight' | 'flexibility';

const getInputType = (category: string): ExerciseInputType => {
  switch (category) {
    case 'STRENGTH':
      return 'strength';
    case 'CARDIO':
      return 'cardio';
    case 'FLEXIBILITY':
      return 'flexibility';
    case 'PLYOMETRICS':
    case 'BODYWEIGHT':
    default:
      return 'bodyweight';
  }
};

// PR Celebration Overlay Component
function PRCelebration({
  prs,
  onClose,
  onShare,
}: {
  prs: NewPR[];
  onClose: () => void;
  onShare: () => void;
}) {
  useEffect(() => {
    if (prs.length > 0) {
      void hapticsNotification();
    }
  }, [prs.length]);

  if (prs.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-300">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Animated sparkles with floating animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {SPARKLE_POSITIONS.map((pos, i) => (
          <Sparkles
            key={i}
            className="absolute text-yellow-400"
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              opacity: pos.opacity,
              transform: `scale(${pos.scale})`,
              animation: `sparkle-float 3s ease-in-out infinite, sparkle-pulse 1.5s ease-in-out infinite`,
              animationDelay: `${pos.delay}s, ${pos.delay * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Animated confetti particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={`confetti-${i}`}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: `${10 + ((i * 2.7) % 80)}%`,
              top: '-10px',
              backgroundColor: [
                '#fbbf24',
                '#f59e0b',
                '#ef4444',
                '#22c55e',
                '#3b82f6',
              ][i % 5],
              animation: `confetti-fall 3s ease-out forwards`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>

      {/* Main celebration card with bounce animation */}
      <div
        className="relative bg-linear-to-br from-yellow-500/20 via-amber-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-2xl p-8 max-w-md mx-4"
        style={{
          animation:
            'celebration-bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
        }}
      >
        {/* Trophy with pulse animation */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
          <div
            className="bg-linear-to-br from-yellow-400 to-amber-500 rounded-full p-4 shadow-lg shadow-yellow-500/30"
            style={{
              animation: 'trophy-pulse 1s ease-in-out infinite',
            }}
          >
            <Trophy className="h-8 w-8 text-white" />
          </div>
        </div>

        <div className="text-center mt-6">
          <h2
            className="text-2xl font-bold bg-linear-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent"
            style={{
              animation: 'text-shimmer 2s ease-in-out infinite',
            }}
          >
            {prs.length === 1
              ? 'New Personal Record!'
              : 'New Personal Records!'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {prs.length === 1
              ? "You've crushed your previous best!"
              : `You've set ${prs.length} new records!`}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {prs.map((pr, i) => (
            <div
              key={i}
              className="bg-background/50 rounded-lg p-4 border border-yellow-500/20"
              style={{
                animation: 'slide-up 0.4s ease-out forwards',
                animationDelay: `${0.3 + i * 0.1}s`,
                opacity: 0,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-linear-to-br from-yellow-400 to-amber-500 flex items-center justify-center shrink-0">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{pr.exerciseName}</p>
                  <p className="text-sm text-muted-foreground">
                    {PR_TYPE_LABELS[pr.type as keyof typeof PR_TYPE_LABELS] ||
                      pr.type}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-yellow-500">
                    {formatPRValue(
                      pr.type as keyof typeof PR_TYPE_LABELS,
                      pr.value,
                    )}
                  </p>
                  {pr.improvement !== undefined && pr.improvement > 0 && (
                    <p className="text-xs text-green-500">
                      +{pr.improvement.toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="border-yellow-500/40 bg-background/50"
            onClick={onClose}
          >
            Awesome!
          </Button>
          <Button
            className="bg-linear-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
            onClick={onShare}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Share to Elevate
          </Button>
        </div>
      </div>
    </div>
  );
}

// Date range helpers
const getDateRange = (range: 'week' | 'month' | 'all', timezone: string) => {
  if (range === 'all') {
    return { startDate: undefined, endDate: undefined };
  }

  const days = range === 'week' ? 7 : 30;
  return {
    startDate: getDaysAgoInTimezone(days, timezone),
    endDate: formatDateInTimezone(new Date(), timezone),
  };
};

function WorkoutsPage() {
  const navigate = useNavigate();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<WorkoutSessionResponse | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [celebrationPRs, setCelebrationPRs] = useState<NewPR[]>([]);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('all');

  const timezone = useTimezone();
  const unit = useUnitPreference();
  const isMobile = useIsMobile();

  // Active session state
  const { data: activeSessionData, refetch: refetchActiveSession } =
    useActiveSession();
  const activeSession = activeSessionData?.data;

  const startSessionMutation = useStartSession({
    onSuccess: () => {
      toast.success('Session started');
      refetchActiveSession();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to start session');
    },
  });

  // Workout goal state
  const { data: workoutGoalData } = useWorkoutGoalWithDefaults();
  const updateWorkoutGoal = useUpdateWorkoutGoal({
    onSuccess: () => {
      toast.success('Workout goals updated!');
      setShowSettingsDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update workout goals');
    },
  });
  const [goalForm, setGoalForm] = useState({
    weeklyWorkouts: 4,
    muscleTargets: {
      CHEST: 16,
      BACK: 18,
      SHOULDERS: 14,
      ARMS: 12,
      LEGS: 16,
      CORE: 10,
    } as Record<string, number>,
  });

  // Sync goal form with fetched data
  useEffect(() => {
    if (workoutGoalData?.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGoalForm({
        weeklyWorkouts: workoutGoalData.data.weeklyWorkouts,
        muscleTargets: workoutGoalData.data.muscleTargets as Record<
          string,
          number
        >,
      });
    }
  }, [workoutGoalData]);

  const { startDate, endDate } = getDateRange(dateRange, timezone);
  const { data: sessionsData, isLoading: isLoadingSessions } =
    useWorkoutSessions({ page: 1, limit: 50, startDate, endDate });
  const { data: recentSessionsData } = useWorkoutSessions({
    page: 1,
    limit: 100,
  });
  const { data: statsData } = useWorkoutStats();

  // Compute stats from filtered sessions when date range is not "all"
  const filteredStats = useMemo(() => {
    if (dateRange === 'all' && statsData?.data) {
      return statsData.data;
    }

    const items = sessionsData?.data?.items || [];
    let totalWorkouts = 0;
    let totalSets = 0;
    let totalVolume = 0;
    let totalCalories = 0;
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;

    for (const session of items) {
      totalWorkouts += session.workouts.length;
      for (const workout of session.workouts) {
        totalSets += workout.sets.length;
        for (const set of workout.sets) {
          if (set.weight && set.reps) {
            totalVolume += set.weight * set.reps;
          }
        }
      }
      // Aggregate imported session metrics
      if (session.externalSummary) {
        if (session.externalSummary.calories)
          totalCalories += session.externalSummary.calories;
        if (session.externalSummary.distanceMeters)
          totalDistanceMeters += session.externalSummary.distanceMeters;
        if (session.externalSummary.elapsedTimeSeconds)
          totalDurationSeconds += session.externalSummary.elapsedTimeSeconds;
      }
    }

    return {
      totalSessions: items.length,
      totalWorkouts,
      totalSets,
      totalVolume,
      totalCalories: totalCalories > 0 ? Math.round(totalCalories) : undefined,
      totalDistanceMeters:
        totalDistanceMeters > 0 ? Math.round(totalDistanceMeters) : undefined,
      totalDurationSeconds:
        totalDurationSeconds > 0 ? Math.round(totalDurationSeconds) : undefined,
      totalExercises: 0,
    };
  }, [dateRange, sessionsData, statsData]);

  const deleteMutation = useDeleteSession({
    onSuccess: () => {
      toast.success('Session deleted');
      setDeleteSessionId(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete session');
    },
  });

  const sessions = sessionsData?.data?.items || [];
  const recentSessions = recentSessionsData?.data?.items || sessions;
  const completedWorkoutDaysThisWeek = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const uniqueDays = new Set<number>();

    for (const session of recentSessions) {
      const performedDate = new Date(session.performed);
      const sessionDay = new Date(
        performedDate.getFullYear(),
        performedDate.getMonth(),
        performedDate.getDate(),
      );
      const diffDays = Math.round(
        (today.getTime() - sessionDay.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays >= 0 && diffDays < 7) {
        uniqueDays.add(sessionDay.getTime());
      }
    }

    return uniqueDays.size;
  }, [recentSessions]);
  const weeklyGoalTarget = goalForm.weeklyWorkouts || 0;
  const weeklyGoalProgressPercent =
    weeklyGoalTarget > 0
      ? Math.min(100, (completedWorkoutDaysThisWeek / weeklyGoalTarget) * 100)
      : 0;
  const rangeLabel =
    dateRange === 'week'
      ? 'Last 7 days'
      : dateRange === 'month'
        ? 'Last 30 days'
        : 'All time';
  const totalGoalSets = Object.values(goalForm.muscleTargets).reduce(
    (a, b) => a + b,
    0,
  );

  const handleSessionCreated = (prs: NewPR[]) => {
    setShowAddDialog(false);
    if (prs.length > 0) {
      setCelebrationPRs(prs);
    } else {
      toast.success('Session logged!');
    }
  };

  const handleQuickStartSession = () => {
    if (activeSession || startSessionMutation.isPending) {
      return;
    }

    startSessionMutation.mutate({
      privacy: 'PRIVATE',
    });
  };

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* PR Celebration Overlay */}
      {celebrationPRs.length > 0 && (
        <PRCelebration
          prs={celebrationPRs}
          onClose={() => setCelebrationPRs([])}
          onShare={() => {
            const prPayload = buildElevatePrPayloadFromSession(celebrationPRs);
            navigate(`/elevate?compose=1&pr=${prPayload}`);
            setCelebrationPRs([]);
          }}
        />
      )}

      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Training Dashboard
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Workout Log
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Track sessions, hit targets, and stay consistent without losing
                your flow.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="h-8 rounded-full px-3 text-xs"
              >
                <Calendar className="mr-1 h-3.5 w-3.5" />
                {rangeLabel}
              </Badge>
              {filteredStats && (
                <Badge
                  variant="secondary"
                  className="h-8 rounded-full px-3 text-xs"
                >
                  <Dumbbell className="mr-1 h-3.5 w-3.5" />
                  {filteredStats.totalSessions} sessions
                </Badge>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSettingsDialog(true)}
                className="h-8 w-8 rounded-full transition-transform duration-200 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex flex-1 min-w-0 max-w-sm items-center gap-1 rounded-xl border bg-background/80 p-1">
              <Button
                variant={dateRange === 'week' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 flex-1 rounded-lg"
                onClick={() => setDateRange('week')}
              >
                Week
              </Button>
              <Button
                variant={dateRange === 'month' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 flex-1 rounded-lg"
                onClick={() => setDateRange('month')}
              >
                Month
              </Button>
              <Button
                variant={dateRange === 'all' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 flex-1 rounded-lg"
                onClick={() => setDateRange('all')}
              >
                All
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {!activeSession && (
                <Button
                  onClick={handleQuickStartSession}
                  disabled={startSessionMutation.isPending}
                  size="icon"
                  className="h-10 w-10 bg-linear-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  aria-label="Start session"
                  title="Start session"
                >
                  {startSessionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              )}

              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!!activeSession}
                    className="h-10 w-10 transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    aria-label="Quick log"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                {showAddDialog && (
                  <AddSessionDialog
                    onClose={() => setShowAddDialog(false)}
                    onSuccess={handleSessionCreated}
                  />
                )}
              </Dialog>
            </div>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Quick start: tap + to begin a private session instantly, then
                use the calendar icon for a quick manual log.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workout Goal Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Workout Goals
            </DialogTitle>
            <DialogDescription>
              Set your weekly training targets
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Weekly Workouts */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Weekly Workout Days</Label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() =>
                      setGoalForm({ ...goalForm, weeklyWorkouts: num })
                    }
                    className={cn(
                      'h-10 w-10 rounded-lg border-2 font-semibold transition-all',
                      goalForm.weeklyWorkouts === num
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/50',
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Muscle Group Targets */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Weekly Set Targets by Muscle
              </Label>
              <div className="grid gap-3">
                {[
                  { key: 'CHEST', label: 'Chest' },
                  { key: 'BACK', label: 'Back' },
                  { key: 'SHOULDERS', label: 'Shoulders' },
                  { key: 'ARMS', label: 'Arms' },
                  { key: 'LEGS', label: 'Legs' },
                  { key: 'CORE', label: 'Core' },
                ].map((muscle) => (
                  <div
                    key={muscle.key}
                    className="flex items-center justify-between gap-3 p-2 rounded-lg border"
                  >
                    <span className="text-sm font-medium">{muscle.label}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setGoalForm({
                            ...goalForm,
                            muscleTargets: {
                              ...goalForm.muscleTargets,
                              [muscle.key]: Math.max(
                                0,
                                (goalForm.muscleTargets[muscle.key] || 0) - 2,
                              ),
                            },
                          })
                        }
                        className="h-7 w-7 rounded border hover:bg-muted flex items-center justify-center text-sm"
                      >
                        -
                      </button>
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        value={goalForm.muscleTargets[muscle.key] || 0}
                        onChange={(e) =>
                          setGoalForm({
                            ...goalForm,
                            muscleTargets: {
                              ...goalForm.muscleTargets,
                              [muscle.key]: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-14 h-7 text-center text-sm"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setGoalForm({
                            ...goalForm,
                            muscleTargets: {
                              ...goalForm.muscleTargets,
                              [muscle.key]: Math.min(
                                30,
                                (goalForm.muscleTargets[muscle.key] || 0) + 2,
                              ),
                            },
                          })
                        }
                        className="h-7 w-7 rounded border hover:bg-muted flex items-center justify-center text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Total:{' '}
                {Object.values(goalForm.muscleTargets).reduce(
                  (a, b) => a + b,
                  0,
                )}{' '}
                sets/week
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSettingsDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateWorkoutGoal.mutate(goalForm)}
              disabled={updateWorkoutGoal.isPending}
            >
              {updateWorkoutGoal.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Goals'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Session Panel */}
      {activeSession && (
        <ActiveSessionPanel
          key={activeSession.id}
          activeSession={activeSession}
          onEndSession={() => refetchActiveSession()}
          onPRs={(prs) => setCelebrationPRs(prs)}
        />
      )}

      {/* Main Content */}
      <div
        className={cn(
          'grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-400 motion-reduce:animate-none',
          isMobile ? 'grid-cols-1' : 'xl:grid-cols-[340px_1fr]',
        )}
      >
        <div
          className={cn(
            'space-y-4',
            isMobile ? 'order-2' : 'xl:sticky xl:top-6 xl:h-fit',
          )}
        >
          <Card className="overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <div className="bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Snapshot</CardTitle>
                <CardDescription>{rangeLabel}</CardDescription>
              </CardHeader>
              <CardContent className="pb-5">
                {filteredStats ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-background/80 p-3 transition-all duration-200 hover:border-primary/40 hover:bg-background motion-reduce:transition-none">
                      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Dumbbell className="h-3.5 w-3.5 text-primary" />
                        Sessions
                      </div>
                      <p className="text-2xl font-bold tabular-nums">
                        {filteredStats.totalSessions}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-background/80 p-3 transition-all duration-200 hover:border-primary/40 hover:bg-background motion-reduce:transition-none">
                      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Activity className="h-3.5 w-3.5 text-blue-500" />
                        Workouts
                      </div>
                      <p className="text-2xl font-bold tabular-nums">
                        {filteredStats.totalWorkouts}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-background/80 p-3 transition-all duration-200 hover:border-primary/40 hover:bg-background motion-reduce:transition-none">
                      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Dumbbell className="h-3.5 w-3.5 text-emerald-500" />
                        Sets
                      </div>
                      <p className="text-2xl font-bold tabular-nums">
                        {filteredStats.totalSets}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-background/80 p-3 transition-all duration-200 hover:border-primary/40 hover:bg-background motion-reduce:transition-none">
                      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
                        Volume
                      </div>
                      <p className="text-2xl font-bold tabular-nums">
                        {filteredStats.totalVolume >= 1000
                          ? `${(filteredStats.totalVolume / 1000).toFixed(1)}k`
                          : filteredStats.totalVolume}
                      </p>
                    </div>
                    {filteredStats.totalCalories &&
                      filteredStats.totalCalories > 0 && (
                        <div className="rounded-xl border bg-background/80 p-3 transition-all duration-200 hover:border-primary/40 hover:bg-background motion-reduce:transition-none">
                          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <Activity className="h-3.5 w-3.5 text-red-500" />
                            Calories
                          </div>
                          <p className="text-2xl font-bold tabular-nums">
                            {filteredStats.totalCalories >= 1000
                              ? `${(filteredStats.totalCalories / 1000).toFixed(1)}k`
                              : filteredStats.totalCalories}
                          </p>
                        </div>
                      )}
                    {filteredStats.totalDistanceMeters &&
                      filteredStats.totalDistanceMeters > 0 && (
                        <div className="rounded-xl border bg-background/80 p-3 transition-all duration-200 hover:border-primary/40 hover:bg-background motion-reduce:transition-none">
                          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 text-violet-500" />
                            Distance
                          </div>
                          <p className="text-2xl font-bold tabular-nums">
                            {formatDistance(
                              filteredStats.totalDistanceMeters,
                              unit,
                              true,
                            )}
                          </p>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Dumbbell className="mb-2 h-10 w-10 text-muted-foreground/50" />
                    <span className="text-muted-foreground">
                      No sessions yet
                    </span>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>

          <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Weekly Goal</CardTitle>
              <CardDescription>Configured training targets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                <span className="text-sm text-muted-foreground">
                  Workout days (this week)
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {completedWorkoutDaysThisWeek}/{goalForm.weeklyWorkouts}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-linear-to-r from-primary to-emerald-500 transition-all duration-300"
                  style={{ width: `${weeklyGoalProgressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                <span className="text-sm text-muted-foreground">
                  Target sets
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {totalGoalSets}
                </span>
              </div>
              <Button
                variant="outline"
                className="w-full transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                onClick={() => setShowSettingsDialog(true)}
              >
                <Target className="mr-2 h-4 w-4" />
                Update Goals
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card
          className={cn(
            'overflow-hidden transition-shadow hover:shadow-lg',
            isMobile && 'order-1',
          )}
        >
          <CardHeader className="border-b bg-muted/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  Session History
                </CardTitle>
                <CardDescription className="mt-1">
                  {sessions.length > 0
                    ? `Showing ${sessions.length} session${sessions.length === 1 ? '' : 's'} for ${rangeLabel.toLowerCase()}`
                    : 'Your workout history will appear here'}
                </CardDescription>
              </div>
              <Badge
                variant="secondary"
                className="w-fit rounded-full px-3 py-1 text-xs"
              >
                {rangeLabel}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-5">
            {isLoadingSessions ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Dumbbell className="h-8 w-8 text-primary/50" />
                </div>
                <p className="font-medium text-muted-foreground">
                  No workout sessions yet
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Log Your First Session
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session, index) => (
                  <div
                    key={session.id}
                    className={cn(
                      'group cursor-pointer rounded-2xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5 animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                      index === 0 &&
                        'border-primary/40 bg-linear-to-r from-primary/10 to-transparent',
                    )}
                    style={{ animationDelay: `${index * 35}ms` }}
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                        <div
                          className={cn(
                            'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                            index === 0 ? 'bg-primary/20' : 'bg-muted',
                          )}
                        >
                          {session.externalSummary ? (
                            <Activity
                              className={cn(
                                'h-5 w-5',
                                index === 0
                                  ? 'text-primary'
                                  : 'text-muted-foreground',
                              )}
                            />
                          ) : (
                            <Dumbbell
                              className={cn(
                                'h-5 w-5',
                                index === 0
                                  ? 'text-primary'
                                  : 'text-muted-foreground',
                              )}
                            />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {session.title ||
                              session.workouts
                                .map((w) => w.exercise.name)
                                .slice(0, 2)
                                .join(', ')}
                            {session.workouts.length > 2 &&
                              ` +${session.workouts.length - 2}`}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                            {session.externalSummary ? (
                              <>
                                <ActivitySummaryInline
                                  summary={session.externalSummary}
                                  unit={unit}
                                />
                                <span className="hidden sm:inline">•</span>
                                <span>
                                  {getRelativeTime(session.performed)}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-medium">
                                  {session.workouts.length} exercises
                                </span>
                                <span className="hidden sm:inline">•</span>
                                <span>
                                  {session.workouts.reduce(
                                    (acc, w) => acc + w.sets.length,
                                    0,
                                  )}{' '}
                                  sets
                                </span>
                                <span className="hidden sm:inline">•</span>
                                <span>
                                  {getRelativeTime(session.performed)}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="secondary"
                              className="flex items-center gap-1 text-xs"
                            >
                              <PrivacyIcon privacy={session.privacy} />
                              <span className="capitalize">
                                {session.privacy.toLowerCase()}
                              </span>
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <span className="capitalize">
                                {formatSourceLabel(session.source)}
                              </span>
                            </Badge>
                            {session.source !== 'MANUAL' && (
                              <Badge
                                variant="secondary"
                                className="border-blue-200 bg-blue-50 text-blue-700 text-xs dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              >
                                Imported
                              </Badge>
                            )}
                            {session.notes && (
                              <Badge variant="outline" className="text-xs">
                                <StickyNote className="mr-1 h-3 w-3" />
                                Notes
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteSessionId(session.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session Detail Sheet */}
      <Sheet
        open={!!selectedSession}
        onOpenChange={() => setSelectedSession(null)}
      >
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className={cn(
            'overflow-y-auto',
            isMobile
              ? 'max-h-[85vh] rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]'
              : 'sm:max-w-lg',
          )}
        >
          {selectedSession && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selectedSession.title || 'Workout Session'}
                </SheetTitle>
                <SheetDescription>
                  {formatDate(selectedSession.performed)} at{' '}
                  {formatTime(selectedSession.performed)}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <PrivacyIcon privacy={selectedSession.privacy} />
                    <span className="capitalize">
                      {selectedSession.privacy.toLowerCase()}
                    </span>
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {formatSourceLabel(selectedSession.source)}
                  </Badge>
                </div>

                {selectedSession.notes && (
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="flex items-center gap-2 mb-2">
                      <StickyNote className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground">
                        Notes
                      </p>
                      <div className="flex items-center gap-1 ml-auto text-xs text-green-600 dark:text-green-400">
                        <ShieldCheck className="h-3 w-3" />
                        <span>Encrypted</span>
                      </div>
                    </div>
                    <p className="text-sm">{selectedSession.notes}</p>
                  </div>
                )}

                {/* Activity Summary for imported sessions */}
                {selectedSession.externalSummary && (
                  <ActivitySummary
                    summary={selectedSession.externalSummary}
                    activityType={selectedSession.externalActivityType ?? null}
                    unit={unit}
                  />
                )}

                {/* Route Map for sessions with polyline */}
                {selectedSession.externalSummary?.polyline && (
                  <RouteMap
                    polyline={selectedSession.externalSummary.polyline}
                  />
                )}

                {/* HR Zone Chart */}
                {selectedSession.externalSummary?.averageHeartRate &&
                  selectedSession.externalSummary?.maxHeartRate && (
                    <HRZoneChart
                      averageHeartRate={
                        selectedSession.externalSummary.averageHeartRate
                      }
                      maxHeartRate={
                        selectedSession.externalSummary.maxHeartRate
                      }
                    />
                  )}

                {/* Workouts in session */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-medium">
                      {
                        selectedSession.workouts.filter(
                          (workout) => workout.completed,
                        ).length
                      }
                      /{selectedSession.workouts.length} workouts completed
                    </span>
                  </div>
                  {selectedSession.workouts.map((workout: WorkoutResponse) => (
                    <div
                      key={workout.id}
                      className="border rounded-lg overflow-hidden"
                    >
                      <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{workout.exercise.name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className="capitalize text-xs"
                            >
                              {workout.exercise.category.toLowerCase()}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="capitalize text-xs"
                            >
                              {workout.exercise.difficulty.toLowerCase()}
                            </Badge>
                          </div>
                        </div>
                        <Badge
                          variant={workout.completed ? 'default' : 'outline'}
                          className={cn(
                            'shrink-0',
                            workout.completed
                              ? 'bg-emerald-600 hover:bg-emerald-600'
                              : 'text-muted-foreground',
                          )}
                        >
                          {workout.completed ? (
                            <>
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Completed
                            </>
                          ) : (
                            <>
                              <X className="mr-1 h-3.5 w-3.5" />
                              Not completed
                            </>
                          )}
                        </Badge>
                      </div>
                      <div className="p-4 space-y-2">
                        {workout.sets.map((set: WorkoutSet) => (
                          <div
                            key={set.id}
                            className="flex items-center gap-3 text-sm"
                          >
                            <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium shrink-0">
                              {set.setNumber}
                            </span>
                            <div>
                              {set.reps && set.weight && (
                                <span>
                                  {set.reps} reps ×{' '}
                                  {formatWeight(set.weight, unit)}
                                </span>
                              )}
                              {set.reps && !set.weight && (
                                <span>{set.reps} reps</span>
                              )}
                              {set.duration && (
                                <span className="ml-2">{set.duration}s</span>
                              )}
                              {set.distance && (
                                <span className="ml-2">
                                  {formatDistance(set.distance, unit)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Volume */}
                {selectedSession.workouts.some((w) =>
                  w.sets.some((s) => s.reps && s.weight),
                ) && (
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">
                      Total Session Volume
                    </p>
                    <p className="text-xl font-bold">
                      {formatWeight(
                        selectedSession.workouts
                          .flatMap((w) => w.sets)
                          .reduce(
                            (total, set) =>
                              total + (set.reps || 0) * (set.weight || 0),
                            0,
                          ),
                        unit,
                      )}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteSessionId}
        onOpenChange={() => setDeleteSessionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this workout session and all its
              data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteSessionId && deleteMutation.mutate(deleteSessionId)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
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

// Helper to format duration for display
function formatDurationInput(seconds: number | undefined): {
  min: string;
  sec: string;
} {
  if (!seconds) return { min: '', sec: '' };
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return { min: min > 0 ? String(min) : '', sec: sec > 0 ? String(sec) : '' };
}

// Helper to parse duration from min:sec inputs
function parseDurationInput(
  min: string | undefined,
  sec: string | undefined,
): number | undefined {
  const m = min ? parseInt(min, 10) : 0;
  const s = sec ? parseInt(sec, 10) : 0;
  const total = m * 60 + s;
  return total > 0 ? total : undefined;
}

// ============================================================================
// ADD WORKOUT DIALOG - Add a single workout to active session
// ============================================================================
function AddWorkoutDialog({
  sessionId,
  autoCompleteAddedWorkout,
  onClose,
  onSuccess,
  onPRs,
}: {
  sessionId: string;
  autoCompleteAddedWorkout?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onPRs?: (prs: NewPR[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseResponse | null>(null);
  const [sets, setSets] = useState<SetFormData[]>([{}]);
  const unit = useUnitPreference();
  const debouncedSearch = useDebounce(search, 250);

  const {
    data: exercisesData,
    isLoading: isLoadingExercises,
    isError: isExercisesError,
    error: exercisesError,
  } = useExercises({
    search: debouncedSearch || undefined,
    limit: 50,
  });
  const exerciseQueryError = isExercisesError
    ? exercisesError instanceof Error
      ? exercisesError.message
      : 'Failed to load exercises'
    : null;

  const { data: frequentData } = useFrequentExercises();
  const frequentIds = frequentData?.data?.exerciseIds ?? [];

  const addWorkoutMutation = useAddWorkout({
    onSuccess: (response) => {
      toast.success(`Added ${selectedExercise?.name}`);

      const matchingWorkouts = (response.data?.workouts || []).filter(
        (workout) => workout.exerciseId === selectedExercise?.id,
      );
      const addedWorkout = matchingWorkouts.sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
      )[0];

      if (autoCompleteAddedWorkout && addedWorkout && !addedWorkout.completed) {
        updateWorkoutMutation.mutate({
          sessionId,
          workoutId: addedWorkout.id,
          data: { completed: true },
        });
      }

      // Check for PRs in the response
      const prs = (response.data as { newPRs?: NewPR[] })?.newPRs || [];
      if (prs.length > 0 && onPRs) {
        onPRs(prs);
      }
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add workout');
    },
  });

  const updateWorkoutMutation = useUpdateWorkout();

  const exercises = useMemo(() => {
    const rawExercises = exercisesData?.data?.items ?? [];
    const frequentIds = frequentData?.data?.exerciseIds ?? [];
    return rankExercisesForPicker(rawExercises, frequentIds, debouncedSearch);
  }, [
    exercisesData?.data?.items,
    frequentData?.data?.exerciseIds,
    debouncedSearch,
  ]);

  const inputType = selectedExercise
    ? getInputType(selectedExercise.category)
    : 'strength';

  const addSet = () => {
    setSets([...sets, {}]);
  };

  const removeSet = (index: number) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index));
    }
  };

  const updateSet = (index: number, data: Partial<SetFormData>) => {
    setSets(sets.map((s, i) => (i === index ? { ...s, ...data } : s)));
  };

  const validSets = sets.filter(
    (s) => s.reps || s.weight || s.duration || s.distance,
  );

  const handleSubmit = () => {
    if (!selectedExercise || validSets.length === 0) return;

    const workoutData: CreateWorkout = {
      exerciseId: selectedExercise.id,
      sets: validSets.map((s, index) => ({
        setNumber: index + 1,
        reps: s.reps,
        weight: s.weight
          ? (convertWeightToStorage(s.weight, unit) ?? undefined)
          : undefined,
        duration: s.duration,
        distance: s.distance
          ? (convertDistanceToStorage(s.distance, unit, true) ?? undefined)
          : undefined,
      })),
    };

    addWorkoutMutation.mutate({ sessionId, data: workoutData });
  };

  // Exercise selection view
  if (!selectedExercise) {
    return (
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Add Exercise</DialogTitle>
          <DialogDescription>
            Select an exercise to add to your session
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="flex-1">
            {search.length > 0 && search.length < 3 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Type at least 3 characters to search
              </div>
            ) : isLoadingExercises ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : exerciseQueryError ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {exerciseQueryError}
              </div>
            ) : exercises.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No exercises found
              </div>
            ) : (
              <div className="space-y-1 pr-3">
                {exercises.map((exercise) => {
                  const isFrequent = frequentIds.includes(exercise.id);
                  return (
                    <div
                      key={exercise.id}
                      className={cn(
                        'flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all',
                        isFrequent
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
                          : 'hover:bg-muted',
                      )}
                      onClick={() => setSelectedExercise(exercise)}
                    >
                      {isFrequent && (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {exercise.name}
                        </p>
                        <p
                          className={cn(
                            'text-xs capitalize',
                            isFrequent
                              ? 'text-amber-600'
                              : 'text-muted-foreground',
                          )}
                        >
                          {exercise.category.toLowerCase()}
                          {isFrequent && (
                            <span className="ml-1 text-amber-500 font-medium">
                              • Your go-to
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  // Sets editor view
  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <button
            onClick={() => setSelectedExercise(null)}
            className="p-1 rounded hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {selectedExercise.name}
        </DialogTitle>
        <DialogDescription className="capitalize">
          {selectedExercise.category.toLowerCase()} • Add your sets
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-4">
        {sets.map((set, setIndex) => (
          <div
            key={setIndex}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
          >
            <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0 mt-0.5">
              {setIndex + 1}
            </span>

            <div className="flex-1 space-y-2">
              {inputType === 'strength' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Reps
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={set.reps || ''}
                      onChange={(e) =>
                        updateSet(setIndex, {
                          reps: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Weight ({getWeightUnit(unit)})
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      step="0.5"
                      value={set.weight || ''}
                      onChange={(e) =>
                        updateSet(setIndex, {
                          weight: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className="h-9"
                    />
                  </div>
                </div>
              )}

              {inputType === 'cardio' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Duration
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="0"
                        value={formatDurationInput(set.duration).min || ''}
                        onChange={(e) => {
                          const newDuration = parseDurationInput(
                            e.target.value,
                            String(set.duration ? set.duration % 60 : 0),
                          );
                          updateSet(setIndex, { duration: newDuration });
                        }}
                        className="h-9 w-16"
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                      <Input
                        type="number"
                        placeholder="0"
                        value={formatDurationInput(set.duration).sec || ''}
                        onChange={(e) => {
                          const newDuration = parseDurationInput(
                            String(
                              set.duration ? Math.floor(set.duration / 60) : 0,
                            ),
                            e.target.value,
                          );
                          updateSet(setIndex, { duration: newDuration });
                        }}
                        className="h-9 w-16"
                      />
                      <span className="text-xs text-muted-foreground">sec</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Distance ({getDistanceUnit(unit)})
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={set.distance || ''}
                      onChange={(e) =>
                        updateSet(setIndex, {
                          distance: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className="h-9"
                    />
                  </div>
                </div>
              )}

              {(inputType === 'bodyweight' || inputType === 'flexibility') && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Reps
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={set.reps || ''}
                      onChange={(e) =>
                        updateSet(setIndex, {
                          reps: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Hold (sec)
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={set.duration || ''}
                      onChange={(e) =>
                        updateSet(setIndex, {
                          duration: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className="h-9"
                    />
                  </div>
                </div>
              )}
            </div>

            {sets.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeSet(setIndex)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addSet} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Add Set
        </Button>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setSelectedExercise(null)}>
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={validSets.length === 0 || addWorkoutMutation.isPending}
        >
          {addWorkoutMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            `Add ${validSets.length} ${validSets.length === 1 ? 'Set' : 'Sets'}`
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ============================================================================
// EDIT WORKOUT DIALOG - Edit an existing workout's sets
// ============================================================================
function EditWorkoutDialog({
  sessionId,
  workout,
  onClose,
  onSuccess,
  onPRs,
  onSetSaved,
}: {
  sessionId: string;
  workout: {
    id: string;
    exercise: { id: string; name: string; category: string };
    sets: Array<{
      id: string;
      setNumber: number;
      reps?: number | null;
      weight?: number | null;
      duration?: number | null;
      distance?: number | null;
    }>;
  };
  onClose: () => void;
  onSuccess: () => void;
  onPRs?: (prs: NewPR[]) => void;
  onSetSaved?: () => void;
}) {
  const unit = useUnitPreference();

  // Initialize local sets state from workout.sets (convert from storage to display units)
  const [sets, setSets] = useState<
    Array<{
      id?: string;
      reps?: number;
      weight?: number;
      duration?: number;
      distance?: number;
    }>
  >(() =>
    workout.sets.map((s) => ({
      id: s.id,
      reps: s.reps ?? undefined,
      weight: s.weight
        ? (convertWeightFromStorage(s.weight, unit) ?? undefined)
        : undefined,
      duration: s.duration ?? undefined,
      distance: s.distance
        ? (convertDistanceFromStorage(s.distance, unit) ?? undefined)
        : undefined,
    })),
  );

  const [saving, setSaving] = useState(false);
  const updateSetMutation = useUpdateSet();
  const addSetMutation = useAddSet();
  const deleteSetMutation = useDeleteSet();

  const inputType = getInputType(workout.exercise.category);

  const updateSet = (index: number, data: Partial<(typeof sets)[0]>) => {
    setSets(sets.map((s, i) => (i === index ? { ...s, ...data } : s)));
  };

  const addSet = () => {
    setSets([...sets, {}]);
  };

  const removeSet = (index: number) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Process all set changes
      for (let i = 0; i < sets.length; i++) {
        const set = sets[i];
        const originalSet = workout.sets.find((s) => s.id === set.id);

        if (set.id && originalSet) {
          // Update existing set (convert from display to storage units)
          await updateSetMutation.mutateAsync({
            sessionId,
            workoutId: workout.id,
            setId: set.id,
            data: {
              reps: set.reps || undefined,
              weight: set.weight
                ? (convertWeightToStorage(set.weight, unit) ?? undefined)
                : undefined,
              duration: set.duration || undefined,
              distance: set.distance
                ? (convertDistanceToStorage(set.distance, unit, true) ??
                  undefined)
                : undefined,
            },
          });
        } else if (!set.id) {
          // Create new set (convert from display to storage units)
          const response = await addSetMutation.mutateAsync({
            sessionId,
            workoutId: workout.id,
            data: {
              setNumber: i + 1,
              reps: set.reps,
              weight: set.weight
                ? (convertWeightToStorage(set.weight, unit) ?? undefined)
                : undefined,
              duration: set.duration,
              distance: set.distance
                ? (convertDistanceToStorage(set.distance, unit, true) ??
                  undefined)
                : undefined,
            },
          });
          // Check for PRs
          const prs = (response.data as { newPRs?: NewPR[] })?.newPRs || [];
          if (prs.length > 0 && onPRs) {
            onPRs(prs);
          }
        }
      }

      // Delete removed sets
      for (const originalSet of workout.sets) {
        if (!sets.some((s) => s.id === originalSet.id)) {
          await deleteSetMutation.mutateAsync({
            sessionId,
            workoutId: workout.id,
            setId: originalSet.id,
          });
        }
      }

      toast.success('Workout updated!');
      onSetSaved?.();
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update workout';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{workout.exercise.name}</DialogTitle>
        <DialogDescription className="capitalize">
          {workout.exercise.category.toLowerCase()} • Edit your sets
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-4">
        {sets.map((set, setIndex) => (
          <div
            key={set.id || `new-${setIndex}`}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
          >
            <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0 mt-0.5">
              {setIndex + 1}
            </span>

            <div className="flex-1 space-y-2">
              {inputType === 'strength' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Reps
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={set.reps ?? ''}
                      onChange={(e) =>
                        updateSet(setIndex, {
                          reps: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Weight ({getWeightUnit(unit)})
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      step="0.5"
                      value={set.weight ?? ''}
                      onChange={(e) =>
                        updateSet(setIndex, {
                          weight: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className="h-9"
                    />
                  </div>
                </div>
              )}

              {inputType === 'cardio' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Duration
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="0"
                        value={
                          set.duration ? Math.floor(set.duration / 60) : ''
                        }
                        onChange={(e) => {
                          const min = e.target.value
                            ? Number(e.target.value)
                            : 0;
                          const sec = set.duration ? set.duration % 60 : 0;
                          updateSet(setIndex, {
                            duration: min * 60 + sec || undefined,
                          });
                        }}
                        className="h-9 w-16"
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                      <Input
                        type="number"
                        placeholder="0"
                        value={set.duration ? set.duration % 60 : ''}
                        onChange={(e) => {
                          const sec = e.target.value
                            ? Number(e.target.value)
                            : 0;
                          const min = set.duration
                            ? Math.floor(set.duration / 60)
                            : 0;
                          updateSet(setIndex, {
                            duration: min * 60 + sec || undefined,
                          });
                        }}
                        className="h-9 w-16"
                      />
                      <span className="text-xs text-muted-foreground">sec</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Distance ({getDistanceUnit(unit)})
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={set.distance ?? ''}
                      onChange={(e) =>
                        updateSet(setIndex, {
                          distance: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className="h-9"
                    />
                  </div>
                </div>
              )}

              {(inputType === 'bodyweight' || inputType === 'flexibility') && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Reps
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={set.reps ?? ''}
                      onChange={(e) =>
                        updateSet(setIndex, {
                          reps: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Hold (sec)
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={set.duration ?? ''}
                      onChange={(e) =>
                        updateSet(setIndex, {
                          duration: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className="h-9"
                    />
                  </div>
                </div>
              )}
            </div>

            {sets.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeSet(setIndex)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addSet} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Add Set
        </Button>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ============================================================================
// ACTIVE SESSION PANEL - Shows current session and allows adding workouts
// ============================================================================
function ActiveSessionPanel({
  activeSession,
  onEndSession,
  onPRs,
}: {
  activeSession: ActiveSession;
  onEndSession: () => void;
  onPRs?: (prs: NewPR[]) => void;
}) {
  const [showAddWorkout, setShowAddWorkout] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<{
    id: string;
    exercise: { id: string; name: string; category: string };
    sets: Array<{
      id: string;
      setNumber: number;
      reps?: number | null;
      weight?: number | null;
      duration?: number | null;
      distance?: number | null;
    }>;
  } | null>(null);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(true);
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [elapsedDisplay, setElapsedDisplay] = useState('');
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [endTitle, setEndTitle] = useState('');
  const [endPrivacy, setEndPrivacy] = useState<WorkoutPrivacy>('PRIVATE');
  const [isFinalizingEnd, setIsFinalizingEnd] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const unit = useUnitPreference();
  const restTimer = useRestTimer();

  // Keep screen awake during active workout
  useKeepAwake(true);

  // Lock to portrait during active workout session
  useOrientationLock('portrait');

  // Fetch full session details for workout list
  const { data: sessionData, refetch: refetchSession } = useWorkoutSession(
    activeSession.id,
  );
  const session = sessionData?.data;

  // Live timer update
  useEffect(() => {
    const updateTimer = () => {
      const startTime = new Date(activeSession.startedAt);
      const elapsedMs = Date.now() - startTime.getTime();
      const elapsedSecs = Math.floor(elapsedMs / 1000);
      const elapsedMins = Math.floor(elapsedSecs / 60);
      const elapsedHours = Math.floor(elapsedMins / 60);

      if (elapsedHours > 0) {
        setElapsedDisplay(
          `${elapsedHours}:${String(elapsedMins % 60).padStart(2, '0')}:${String(elapsedSecs % 60).padStart(2, '0')}`,
        );
      } else {
        setElapsedDisplay(
          `${elapsedMins}:${String(elapsedSecs % 60).padStart(2, '0')}`,
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession.startedAt]);

  // Update session mutation for saving notes
  const updateMutation = useUpdateSession();

  // Debounced save notes
  const saveNotes = useCallback(
    (value: string) => {
      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current);
      }
      setNotesSaved(false);
      notesTimeoutRef.current = setTimeout(() => {
        updateMutation.mutate(
          {
            sessionId: activeSession.id,
            data: { notes: value || null },
          },
          {
            onSuccess: () => setNotesSaved(true),
            onError: () => toast.error('Failed to save notes'),
          },
        );
      }, 1000); // 1 second debounce
    },
    [activeSession.id, updateMutation],
  );

  // Handle notes change with auto-save
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNotesDraft(value);
    saveNotes(value);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current);
      }
    };
  }, []);

  const endMutation = useEndSession({
    onSuccess: (response) => {
      toast.success('Session ended!');
      maybePromptReview();
      // Check for PRs in the response
      const prs = (response.data as { newPRs?: NewPR[] })?.newPRs || [];
      if (prs.length > 0 && onPRs) {
        onPRs(prs);
      }
      onEndSession();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to end session');
    },
  });

  const updateWorkoutMutation = useUpdateWorkout();

  useEffect(() => {
    if (!showEndDialog) {
      return;
    }

    setEndTitle(session?.title || activeSession.title || '');
    setEndPrivacy((session?.privacy || 'PRIVATE') as WorkoutPrivacy);
  }, [activeSession.title, session?.privacy, session?.title, showEndDialog]);

  useEffect(() => {
    try {
      const dismissed =
        window.localStorage.getItem(WORKOUT_LOG_ONBOARDING_KEY) === '1';
      setShowOnboarding(!dismissed);
    } catch {
      setShowOnboarding(true);
    }
  }, []);

  const handleToggleComplete = (
    workoutId: string,
    currentCompleted: boolean,
  ) => {
    updateWorkoutMutation.mutate(
      {
        sessionId: activeSession.id,
        workoutId,
        data: { completed: !currentCompleted },
      },
      {
        onSuccess: () => {
          if (!currentCompleted) void hapticsMedium();
          refetchSession();
        },
      },
    );
  };

  const handleOpenEndSessionDialog = () => {
    setShowEndDialog(true);
  };

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    try {
      window.localStorage.setItem(WORKOUT_LOG_ONBOARDING_KEY, '1');
    } catch {
      // Ignore localStorage failures
    }
  };

  const handleConfirmEndSession = async () => {
    if (isFinalizingEnd) {
      return;
    }

    setIsFinalizingEnd(true);

    const notesValue = notesDraft ?? session?.notes ?? '';
    const normalizedTitle = endTitle.trim();
    const currentTitle = session?.title || activeSession.title || '';
    const currentPrivacy = (session?.privacy || 'PRIVATE') as WorkoutPrivacy;

    try {
      if (normalizedTitle !== currentTitle || endPrivacy !== currentPrivacy) {
        await updateMutation.mutateAsync({
          sessionId: activeSession.id,
          data: {
            title: normalizedTitle || undefined,
            privacy: endPrivacy,
          },
        });
      }

      await endMutation.mutateAsync({
        sessionId: activeSession.id,
        data: { notes: notesValue || undefined },
      });

      setShowEndDialog(false);
    } finally {
      setIsFinalizingEnd(false);
    }
  };

  const workouts = session?.workouts || [];
  const hasIncompleteWorkouts = workouts.some((workout) => !workout.completed);
  const isManualSession = session?.source === 'MANUAL';
  const allowCompletionToggle = !isManualSession || hasIncompleteWorkouts;
  const completedWorkoutsCount = workouts.filter((w) =>
    allowCompletionToggle ? w.completed : true,
  ).length;
  const progressPercent =
    workouts.length > 0
      ? Math.round((completedWorkoutsCount / workouts.length) * 100)
      : 0;

  return (
    <div className="relative">
      <RestTimerOverlay {...restTimer} onSkip={restTimer.skip} />

      <Card className="relative overflow-hidden border border-primary/25 bg-background">
        {/* Live indicator bar */}
        <div className="h-0.5 bg-linear-to-r from-primary/75 via-emerald-500/75 to-primary/75" />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {/* Live indicator */}
              <div className="relative shrink-0">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Activity className="h-5 w-5" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="border-0 bg-red-500/85 text-white gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    LIVE
                  </Badge>
                  <span className="font-mono text-lg font-bold tabular-nums text-primary">
                    {elapsedDisplay}
                  </span>
                </div>
                <CardTitle className="text-xl truncate">
                  {activeSession.title || 'Workout in Progress'}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {activeSession.gym && (
                    <>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {activeSession.gym.name}
                      </span>
                      <span className="text-muted-foreground/50">•</span>
                    </>
                  )}
                  <span>
                    {workouts.length}{' '}
                    {workouts.length === 1 ? 'exercise' : 'exercises'}
                  </span>
                  {workouts.length > 0 && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <span className="text-emerald-500 font-medium">
                        {completedWorkoutsCount}/{workouts.length} done
                      </span>
                    </>
                  )}
                </CardDescription>
              </div>
            </div>

            <Button
              variant="destructive"
              size="icon"
              onClick={handleOpenEndSessionDialog}
              disabled={endMutation.isPending}
              className="h-9 w-9 shrink-0"
              aria-label="End session"
              title="End session"
            >
              {endMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Finish workout</DialogTitle>
                <DialogDescription>
                  Optional: name this session and choose visibility before
                  ending.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="end-session-title">Session Name</Label>
                  <Input
                    id="end-session-title"
                    placeholder="e.g., Upper Body, Tempo Run"
                    value={endTitle}
                    onChange={(e) => setEndTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Privacy</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        value: 'PRIVATE',
                        label: 'Private',
                        icon: Lock,
                      },
                      {
                        value: 'FRIENDS',
                        label: 'Friends',
                        icon: Users,
                      },
                      {
                        value: 'PUBLIC',
                        label: 'Public',
                        icon: Globe,
                      },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setEndPrivacy(option.value as WorkoutPrivacy)
                        }
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-lg border p-2.5 transition-all',
                          endPrivacy === option.value
                            ? 'border-primary bg-primary/8 text-primary'
                            : 'border-border hover:border-primary/40',
                        )}
                      >
                        <option.icon className="h-4 w-4" />
                        <span className="text-xs font-medium">
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowEndDialog(false)}
                  disabled={isFinalizingEnd}
                >
                  Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmEndSession}
                  disabled={isFinalizingEnd}
                >
                  {isFinalizingEnd ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ending...
                    </>
                  ) : (
                    'End Session'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Progress bar */}
          {workouts.length > 0 && (
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-primary to-emerald-500 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {showOnboarding && (
            <div className="rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">
                    Quick tip
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Exercises added during manual sessions auto-complete. Check
                    toggles are mainly for plan and coach sessions.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={handleDismissOnboarding}
                  aria-label="Dismiss workout tips"
                  title="Dismiss workout tips"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Workouts List */}
          {workouts.length > 0 ? (
            <div className="space-y-2">
              {workouts.map((workout, index) => {
                const totalSets = workout.sets.length;
                const filledSets = workout.sets.filter(
                  (s) => s.reps || s.weight || s.duration || s.distance,
                ).length;
                const inputType = getInputType(workout.exercise.category);
                const hasWeight = workout.sets.some((s) => s.weight);
                const maxWeight = hasWeight
                  ? Math.max(...workout.sets.map((s) => s.weight || 0))
                  : null;
                const hasDistance = workout.sets.some((s) => s.distance);
                const totalDistance = hasDistance
                  ? workout.sets.reduce((sum, s) => sum + (s.distance || 0), 0)
                  : null;
                const hasDuration = workout.sets.some((s) => s.duration);
                const totalDuration = hasDuration
                  ? workout.sets.reduce((sum, s) => sum + (s.duration || 0), 0)
                  : null;
                const isComplete = allowCompletionToggle
                  ? workout.completed
                  : true;
                const exerciseProgress =
                  totalSets > 0 ? (filledSets / totalSets) * 100 : 0;

                // Build summary text based on exercise type
                let summaryText = '';
                if (inputType === 'cardio') {
                  const parts: string[] = [];
                  if (totalDistance)
                    parts.push(formatDistance(totalDistance, unit));
                  if (totalDuration) {
                    const mins = Math.floor(totalDuration / 60);
                    const secs = totalDuration % 60;
                    parts.push(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
                  }
                  summaryText =
                    parts.length > 0
                      ? parts.join(' • ')
                      : `${filledSets}/${totalSets} entries`;
                } else {
                  summaryText = `${filledSets}/${totalSets} ${totalSets === 1 ? 'set' : 'sets'}`;
                  if (maxWeight)
                    summaryText += ` • ${formatWeight(maxWeight, unit)}`;
                }

                return (
                  <div
                    key={workout.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border transition-all',
                      isComplete
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-background',
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Completion toggle */}
                      {allowCompletionToggle ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleComplete(workout.id, workout.completed);
                          }}
                          disabled={updateWorkoutMutation.isPending}
                          className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-all',
                            isComplete
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                              : 'bg-muted border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/10 text-muted-foreground',
                          )}
                        >
                          {isComplete ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            index + 1
                          )}
                        </button>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                      <div
                        className="min-w-0 flex-1 cursor-pointer hover:opacity-80"
                        onClick={() => setEditingWorkout(workout)}
                      >
                        <p
                          className={cn(
                            'font-medium text-sm truncate',
                            isComplete &&
                              'text-emerald-700 dark:text-emerald-400',
                          )}
                        >
                          {workout.exercise.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {summaryText}
                          </p>
                          {!isComplete && totalSets > 0 && filledSets > 0 && (
                            <div className="h-1 w-12 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${exerciseProgress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingWorkout(workout)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isComplete
                            ? 'text-emerald-500'
                            : 'text-muted-foreground',
                        )}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground rounded-lg border border-dashed">
              <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Ready to work out?</p>
              <p className="text-sm">Add your first exercise to get started</p>
            </div>
          )}

          {/* Action buttons row */}
          <div className="flex gap-2 pb-[calc(env(safe-area-inset-bottom,0px)+3.75rem)] md:pb-0">
            <Button
              size="icon"
              className="h-10 w-10 bg-linear-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90"
              aria-label="Add exercise"
              onClick={() => setShowAddWorkout(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>

            <Dialog open={showAddWorkout} onOpenChange={setShowAddWorkout}>
              {showAddWorkout && (
                <AddWorkoutDialog
                  sessionId={activeSession.id}
                  autoCompleteAddedWorkout={!allowCompletionToggle}
                  onClose={() => setShowAddWorkout(false)}
                  onSuccess={() => {
                    setShowAddWorkout(false);
                    refetchSession();
                  }}
                />
              )}
            </Dialog>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowNotes(!showNotes)}
              className={cn(
                'h-10 w-10',
                showNotes && 'bg-primary/10 border-primary/50',
              )}
              aria-label={showNotes ? 'Hide notes' : 'Show notes'}
              title={showNotes ? 'Hide notes' : 'Show notes'}
            >
              <StickyNote className="h-4 w-4" />
            </Button>
          </div>

          {/* Edit Workout Dialog */}
          <Dialog
            open={!!editingWorkout}
            onOpenChange={(open) => !open && setEditingWorkout(null)}
          >
            {editingWorkout && (
              <EditWorkoutDialog
                sessionId={activeSession.id}
                workout={editingWorkout}
                onClose={() => setEditingWorkout(null)}
                onSuccess={() => {
                  setEditingWorkout(null);
                  refetchSession();
                }}
                onPRs={onPRs}
                onSetSaved={() => restTimer.start(90)}
              />
            )}
          </Dialog>

          {/* Notes Section - Expandable */}
          {showNotes && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/50 border animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Session Notes
                </span>
                {!notesSaved && (
                  <span className="text-xs text-amber-500 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </span>
                )}
              </div>
              <Textarea
                placeholder="How's it going? Energy levels, observations, anything you want to remember..."
                value={notesDraft ?? session?.notes ?? ''}
                onChange={handleNotesChange}
                rows={3}
                className="resize-none bg-background"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Notes are encrypted & auto-saved
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Add Session Dialog Component
function AddSessionDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (prs: NewPR[]) => void;
}) {
  const unit = useUnitPreference();
  const [step, setStep] = useState<'exercises' | 'details'>('exercises');
  const [search, setSearch] = useState('');
  const [workouts, setWorkouts] = useState<WorkoutFormData[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [privacy, setPrivacy] = useState<WorkoutPrivacy>('PRIVATE');
  const [gymId, setGymId] = useState<string | undefined>(undefined);
  const debouncedSearch = useDebounce(search, 250);

  const { data: gymsData } = useProfileGyms();
  const gyms = gymsData?.data || [];

  const { data: exercisesData, isLoading: isLoadingExercises } = useExercises({
    search: debouncedSearch || undefined,
    limit: 50,
  });

  const { data: frequentData } = useFrequentExercises();
  const frequentIds = frequentData?.data?.exerciseIds ?? [];

  const createMutation = useCreateSession({
    onSuccess: (response) => {
      const prs = response.data?.newPRs || [];
      onSuccess(prs);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to log session');
    },
  });

  // Sort exercises to prioritize frequent ones at the top
  const exercises = useMemo(() => {
    const rawExercises = exercisesData?.data?.items ?? [];
    const frequentIds = frequentData?.data?.exerciseIds ?? [];
    return rankExercisesForPicker(rawExercises, frequentIds, debouncedSearch);
  }, [
    exercisesData?.data?.items,
    frequentData?.data?.exerciseIds,
    debouncedSearch,
  ]);

  const editingWorkout = editingIndex !== null ? workouts[editingIndex] : null;
  const inputType = editingWorkout?.exercise
    ? getInputType(editingWorkout.exercise.category)
    : 'strength';

  const handleExerciseSelect = (exercise: ExerciseResponse) => {
    // Check if exercise already exists in workouts
    const existingIndex = workouts.findIndex(
      (w) => w.exercise?.id === exercise.id,
    );

    if (existingIndex !== -1) {
      // Focus existing workout for editing
      setEditingIndex(existingIndex);
    } else {
      // Add new workout
      const newInputType = getInputType(exercise.category);
      const newSets: SetFormData[] =
        newInputType === 'cardio'
          ? [{ duration: undefined, distance: undefined }]
          : newInputType === 'strength'
            ? [{ reps: undefined, weight: undefined }]
            : [{ reps: undefined, duration: undefined }];

      const newWorkouts = [...workouts, { exercise, sets: newSets }];
      setWorkouts(newWorkouts);
      setEditingIndex(newWorkouts.length - 1);
    }
  };

  const addSet = () => {
    if (editingIndex === null || !editingWorkout) return;
    const lastSet = editingWorkout.sets[editingWorkout.sets.length - 1];
    const newSet: SetFormData =
      inputType === 'strength'
        ? { reps: lastSet?.reps, weight: lastSet?.weight }
        : inputType === 'cardio'
          ? { duration: lastSet?.duration, distance: lastSet?.distance }
          : { reps: lastSet?.reps, duration: lastSet?.duration };

    const updated = [...workouts];
    updated[editingIndex].sets = [...editingWorkout.sets, newSet];
    setWorkouts(updated);
  };

  const removeSet = (setIndex: number) => {
    if (editingIndex === null || !editingWorkout) return;
    if (editingWorkout.sets.length > 1) {
      const updated = [...workouts];
      updated[editingIndex].sets = editingWorkout.sets.filter(
        (_, i) => i !== setIndex,
      );
      setWorkouts(updated);
    }
  };

  const updateSet = (setIndex: number, data: Partial<SetFormData>) => {
    if (editingIndex === null || !editingWorkout) return;
    const updated = [...workouts];
    updated[editingIndex].sets = editingWorkout.sets.map((s, i) =>
      i === setIndex ? { ...s, ...data } : s,
    );
    setWorkouts(updated);
  };

  const removeWorkout = (index: number) => {
    const updated = workouts.filter((_, i) => i !== index);
    setWorkouts(updated);
    if (editingIndex === index) {
      setEditingIndex(updated.length > 0 ? 0 : null);
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const validWorkouts = workouts.filter(
    (w) =>
      w.exercise &&
      w.sets.some((s) => s.reps || s.weight || s.duration || s.distance),
  );

  const hasValidWorkouts = validWorkouts.length > 0;

  const handleSubmit = () => {
    const sessionData: CreateWorkoutSession = {
      title: title || undefined,
      privacy,
      notes: notes || undefined,
      gymId: gymId || undefined,
      workouts: validWorkouts.map((w, wIndex) => ({
        exerciseId: w.exercise!.id,
        sortOrder: wIndex,
        sets: w.sets
          .filter((s) => s.reps || s.weight || s.duration || s.distance)
          .map((s, sIndex) => ({
            setNumber: sIndex + 1,
            reps: s.reps,
            weight: s.weight
              ? (convertWeightToStorage(s.weight, unit) ?? undefined)
              : undefined,
            duration: s.duration,
            distance: s.distance
              ? (convertDistanceToStorage(s.distance, unit, true) ?? undefined)
              : undefined,
          })),
      })),
    };

    createMutation.mutate(sessionData);
  };

  // Helper to summarize sets for display
  const summarizeSets = (workout: WorkoutFormData) => {
    const validSets = workout.sets.filter(
      (s) => s.reps || s.weight || s.duration || s.distance,
    );
    if (validSets.length === 0) return 'No sets';

    const type = workout.exercise
      ? getInputType(workout.exercise.category)
      : 'strength';

    if (type === 'cardio') {
      const totalDuration = validSets.reduce(
        (sum, s) => sum + (s.duration || 0),
        0,
      );
      const totalDistance = validSets.reduce(
        (sum, s) => sum + (s.distance || 0),
        0,
      );
      const parts = [];
      if (totalDuration > 0) {
        const mins = Math.floor(totalDuration / 60);
        const secs = totalDuration % 60;
        parts.push(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
      }
      if (totalDistance > 0) {
        parts.push(
          totalDistance >= 1000
            ? `${(totalDistance / 1000).toFixed(1)}km`
            : `${totalDistance}m`,
        );
      }
      return parts.join(', ') || `${validSets.length} sets`;
    }

    return `${validSets.length} sets`;
  };

  // Exercise selection step
  if (step === 'exercises') {
    return (
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl">Log Workout Session</DialogTitle>
          <DialogDescription>
            Select exercises and configure your sets
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-5 gap-0 md:divide-x">
          {/* Left: Exercise selection */}
          <div className="md:col-span-2 flex flex-col overflow-hidden p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="flex-1">
              {search.length > 0 && search.length < 3 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Type at least 3 characters to search
                </div>
              ) : isLoadingExercises ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : exercises.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No exercises found
                </div>
              ) : (
                <div className="space-y-1 pr-3">
                  {exercises.map((exercise) => {
                    const isFrequent = frequentIds.includes(exercise.id);
                    const isAdded = workouts.some(
                      (w) => w.exercise?.id === exercise.id,
                    );
                    const isEditing =
                      editingWorkout?.exercise?.id === exercise.id;
                    return (
                      <div
                        key={exercise.id}
                        className={cn(
                          'flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all relative',
                          isEditing
                            ? 'bg-primary text-primary-foreground'
                            : isAdded
                              ? 'bg-primary/10 hover:bg-primary/20'
                              : isFrequent
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
                                : 'hover:bg-muted',
                        )}
                        onClick={() => handleExerciseSelect(exercise)}
                      >
                        {isFrequent && !isEditing && (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        {isAdded && !isEditing && !isFrequent && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                        {isAdded && !isEditing && isFrequent && (
                          <Check className="h-4 w-4 text-primary shrink-0 absolute right-2" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              'font-medium text-sm truncate',
                              isEditing && 'text-primary-foreground',
                            )}
                          >
                            {exercise.name}
                          </p>
                          <p
                            className={cn(
                              'text-xs capitalize',
                              isEditing
                                ? 'text-primary-foreground/70'
                                : isFrequent
                                  ? 'text-amber-600'
                                  : 'text-muted-foreground',
                            )}
                          >
                            {exercise.category.toLowerCase()}
                            {isFrequent && (
                              <span className="ml-1 text-amber-500 font-medium">
                                • Your go-to
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: Sets editor + Added workouts */}
          <div className="md:col-span-3 flex flex-col overflow-hidden">
            {/* Sets editor */}
            <div className="flex-1 p-4 overflow-auto border-b">
              {editingWorkout?.exercise ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {editingWorkout.exercise.name}
                      </h3>
                      <p className="text-xs text-muted-foreground capitalize">
                        {editingWorkout.exercise.category.toLowerCase()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeWorkout(editingIndex!)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {editingWorkout.sets.map((set, setIndex) => (
                      <div
                        key={setIndex}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0 mt-0.5">
                          {setIndex + 1}
                        </span>

                        <div className="flex-1 space-y-2">
                          {inputType === 'strength' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  Reps
                                </Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={set.reps || ''}
                                  onChange={(e) =>
                                    updateSet(setIndex, {
                                      reps: e.target.value
                                        ? Number(e.target.value)
                                        : undefined,
                                    })
                                  }
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  Weight ({getWeightUnit(unit)})
                                </Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={set.weight || ''}
                                  onChange={(e) =>
                                    updateSet(setIndex, {
                                      weight: e.target.value
                                        ? Number(e.target.value)
                                        : undefined,
                                    })
                                  }
                                  className="h-9"
                                />
                              </div>
                            </div>
                          )}

                          {inputType === 'cardio' && (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  Duration
                                </Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={
                                      formatDurationInput(set.duration).min ||
                                      ''
                                    }
                                    onChange={(e) => {
                                      const newDuration = parseDurationInput(
                                        e.target.value,
                                        String(
                                          set.duration ? set.duration % 60 : 0,
                                        ),
                                      );
                                      updateSet(setIndex, {
                                        duration: newDuration,
                                      });
                                    }}
                                    className="h-9 w-20"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    min
                                  </span>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={
                                      formatDurationInput(set.duration).sec ||
                                      ''
                                    }
                                    onChange={(e) => {
                                      const newDuration = parseDurationInput(
                                        String(
                                          set.duration
                                            ? Math.floor(set.duration / 60)
                                            : 0,
                                        ),
                                        e.target.value,
                                      );
                                      updateSet(setIndex, {
                                        duration: newDuration,
                                      });
                                    }}
                                    className="h-9 w-20"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    sec
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  Distance ({getDistanceUnit(unit)})
                                </Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={set.distance || ''}
                                  onChange={(e) =>
                                    updateSet(setIndex, {
                                      distance: e.target.value
                                        ? Number(e.target.value)
                                        : undefined,
                                    })
                                  }
                                  className="h-9"
                                />
                              </div>
                            </div>
                          )}

                          {(inputType === 'bodyweight' ||
                            inputType === 'flexibility') && (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  Reps
                                </Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={set.reps || ''}
                                  onChange={(e) =>
                                    updateSet(setIndex, {
                                      reps: e.target.value
                                        ? Number(e.target.value)
                                        : undefined,
                                    })
                                  }
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  Hold (sec)
                                </Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={set.duration || ''}
                                  onChange={(e) =>
                                    updateSet(setIndex, {
                                      duration: e.target.value
                                        ? Number(e.target.value)
                                        : undefined,
                                    })
                                  }
                                  className="h-9"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {editingWorkout.sets.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeSet(setIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addSet}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Set
                  </Button>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Dumbbell className="h-12 w-12 mb-3 opacity-20" />
                  <p className="text-sm">Select an exercise to get started</p>
                  <p className="text-xs mt-1">
                    Your frequent exercises are shown first
                  </p>
                </div>
              )}
            </div>

            {/* Added workouts summary */}
            <div className="p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">
                  Session ({validWorkouts.length} exercises)
                </p>
              </div>
              {workouts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No exercises added yet
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {workouts.map((w, i) => {
                    const isValid = w.sets.some(
                      (s) => s.reps || s.weight || s.duration || s.distance,
                    );
                    const isEditing = editingIndex === i;
                    return (
                      <Badge
                        key={i}
                        variant={isEditing ? 'default' : 'secondary'}
                        className={cn(
                          'cursor-pointer text-xs py-1 px-2',
                          !isValid && !isEditing && 'opacity-50',
                        )}
                        onClick={() => setEditingIndex(i)}
                      >
                        {w.exercise?.name || 'Unnamed'}
                        {isValid && !isEditing && (
                          <span className="ml-1 opacity-70">
                            • {summarizeSets(w)}
                          </span>
                        )}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => setStep('details')}
            disabled={!hasValidWorkouts}
          >
            Continue
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  // Session details step
  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Session Details</DialogTitle>
        <DialogDescription>Finalize your workout session</DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label>Session Title</Label>
          <Input
            placeholder="e.g., Morning Run, Push Day..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Optional - helps you find this session later
          </p>
        </div>

        {gyms.length > 0 && (
          <div className="space-y-2">
            <Label>Gym Location</Label>
            <Select
              value={gymId || ''}
              onValueChange={(v) => setGymId(v || undefined)}
            >
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select a gym (optional)" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {gyms.map((gym) => (
                  <SelectItem key={gym.id} value={gym.id}>
                    <div className="flex flex-col">
                      <span>{gym.name}</span>
                      {gym.location && (
                        <span className="text-xs text-muted-foreground">
                          {gym.location.city}
                          {gym.location.state ? `, ${gym.location.state}` : ''}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Track where you trained - visible on your feed
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Privacy</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                value: 'PRIVATE',
                label: 'Private',
                icon: Lock,
                desc: 'Only you',
              },
              {
                value: 'FRIENDS',
                label: 'Friends',
                icon: Users,
                desc: 'Your friends',
              },
              {
                value: 'PUBLIC',
                label: 'Public',
                icon: Globe,
                desc: 'Everyone',
              },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPrivacy(option.value as WorkoutPrivacy)}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                  privacy === option.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50',
                )}
              >
                <option.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            placeholder="How did it go? Any PRs?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Notes are encrypted and only visible to you
          </p>
        </div>

        {/* Summary */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium mb-3">Workout Summary</p>
          <div className="space-y-2">
            {validWorkouts.map((w, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                    {i + 1}
                  </span>
                  <span>{w.exercise?.name}</span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {summarizeSets(w)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={() => setStep('exercises')}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Session'
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default WorkoutsPage;
