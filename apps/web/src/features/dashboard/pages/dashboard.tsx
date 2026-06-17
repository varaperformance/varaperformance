import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { Link } from 'react-router';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

import { useDailyNutritionSummary } from '@/features/health';
import { useDailyWaterSummary } from '@/features/health';
import { useWeightLogs, useWeightGoal } from '@/features/health';
import {
  useWorkoutStats,
  useWorkoutSessions,
  useActivityData,
  useMuscleBreakdown,
  useRecentWorkouts,
  useWorkoutGoalWithDefaults,
  useWorkoutMotivationQuote,
} from '@/features/health';
import { usePersonalRecords } from '@/features/health';
import { useProfile, useTimezone } from '@/features/profile';
import { useLifestyleInsights } from '@/features/health';
import { useStepsToday, useStepsTrend } from '@/features/health';
import { useSleepTrend, useLifestyleGoalWithDefaults } from '@/features/health';
import { useHeartRateDailySummary } from '@/features/health';
import { useHabits } from '@/features/health';
import { useMeasurements } from '@/features/health';
import { useWaterHistory } from '@/features/health';
import { useNutritionHistory } from '@/features/health';
import { useActiveStack } from '@/features/health';
import { useInjectionProtocols, useInjectionLogs } from '@/features/health';
import { useActiveMealPlan } from '@/features/health';
import { useGroceryLists } from '@/features/health';
import { useMyAchievements } from '@/features/achievements';
import { useMyChallenges } from '@/features/challenge';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  getTodayInTimezone,
  getDaysAgoInTimezone,
  getRelativeDateInTimezone,
  DASHBOARD_CARD_IDS,
  type DashboardCardId,
  type CardSize,
} from '@varaperformance/core';
import {
  useDashboardPreferences,
  useUpdateDashboardPreferences,
} from '../hooks/use-dashboard-preferences';
import {
  useDashboardDataGate,
  dashboardQueryCards,
} from '../hooks/use-dashboard-data-gate';
import {
  useChartColors,
  parseDateOnlyLocal,
  DATE_RANGE_PRESETS,
} from '../lib/chart-helpers';
import type { MuscleGroup, DateRangePreset, DateRange } from '../lib/types';
import { CARD_DISPLAY_NAMES } from '../lib/card-registry';
import {
  MotivationQuoteCard,
  GoalWorkoutsCard,
  GoalCaloriesCard,
  GoalProteinCard,
  GoalCarbsCard,
  GoalFatsCard,
  GoalWaterCard,
  StatStreakCard,
  StatYearlyCard,
  StatCaloriesCard,
  StatPrsCard,
  TrainingOverviewCard,
  BodyCompositionCard,
  WeightProgressCard,
  StrengthProgressCard,
  WeeklyDurationCard,
  MacrosCard,
  HeartRateCard,
  SleepRecoveryCard,
  WeeklyVolumeCard,
  MealPlanCard,
  BodyMeasurementsCard,
  LifestyleAdherenceCard,
  StackComplianceCard,
  HydrationTrendCard,
  NutritionTrendCard,
  PRTimelineCard,
  HabitsCard,
  AchievementsCard,
  ChallengesCard,
  RecentWorkoutsCard,
  GoalStepsCard,
  GoalSleepCard,
  StepTrendCard,
} from '../components/cards';

// ---------------------------------------------------------------------------
// Default card sizes (cols × rows on an 8-column grid)
// ---------------------------------------------------------------------------

const CARD_DEFAULT_SIZES: Record<DashboardCardId, CardSize> = {
  'motivation-quote': { cols: 8, rows: 1 },
  'goal-workouts': { cols: 1, rows: 1 },
  'goal-calories': { cols: 1, rows: 1 },
  'goal-protein': { cols: 1, rows: 1 },
  'goal-carbs': { cols: 1, rows: 1 },
  'goal-fats': { cols: 1, rows: 1 },
  'goal-water': { cols: 1, rows: 1 },
  'goal-steps': { cols: 1, rows: 1 },
  'goal-sleep': { cols: 1, rows: 1 },
  'stat-streak': { cols: 2, rows: 1 },
  'stat-yearly': { cols: 2, rows: 1 },
  'stat-calories': { cols: 2, rows: 1 },
  'stat-prs': { cols: 2, rows: 1 },
  'training-overview': { cols: 8, rows: 4 },
  'body-composition': { cols: 4, rows: 2 },
  'weight-progress': { cols: 4, rows: 2 },
  'strength-progress': { cols: 4, rows: 2 },
  'todays-macros': { cols: 4, rows: 2 },
  'heart-rate': { cols: 2, rows: 2 },
  'sleep-recovery': { cols: 2, rows: 2 },
  'weekly-volume': { cols: 2, rows: 2 },
  'weekly-duration': { cols: 2, rows: 2 },
  'body-measurements': { cols: 2, rows: 2 },
  habits: { cols: 2, rows: 2 },
  achievements: { cols: 2, rows: 2 },
  challenges: { cols: 2, rows: 2 },
  'lifestyle-adherence': { cols: 4, rows: 1 },
  'stack-compliance': { cols: 4, rows: 1 },
  'meal-plan': { cols: 4, rows: 2 },
  'hydration-trend': { cols: 4, rows: 2 },
  'nutrition-trend': { cols: 4, rows: 2 },
  'pr-timeline': { cols: 4, rows: 2 },
  'step-trend': { cols: 4, rows: 2 },
  'recent-workouts': { cols: 4, rows: 2 },
};

// Tailwind col-span classes (must be literal for JIT)
const COL_CLASSES: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-1 md:col-span-2',
  3: 'col-span-1 md:col-span-2 lg:col-span-3',
  4: 'col-span-1 md:col-span-2 lg:col-span-4',
  5: 'col-span-1 md:col-span-2 lg:col-span-5',
  6: 'col-span-1 md:col-span-2 lg:col-span-6',
  7: 'col-span-1 md:col-span-2 lg:col-span-7',
  8: 'col-span-1 md:col-span-2 lg:col-span-8',
};
const ROW_CLASSES: Record<number, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
  4: 'row-span-4',
};

const GOAL_CARD_IDS: DashboardCardId[] = [
  'goal-workouts',
  'goal-calories',
  'goal-protein',
  'goal-carbs',
  'goal-fats',
  'goal-water',
  'goal-steps',
  'goal-sleep',
];

const STAT_CARD_IDS: DashboardCardId[] = [
  'stat-streak',
  'stat-yearly',
  'stat-calories',
  'stat-prs',
];

// Layout version — bump to force everyone to the new canonical order + sizes
const LAYOUT_VERSION = 3;
const LAYOUT_VERSION_KEY = 'vara-dashboard-layout-version';

// ---------------------------------------------------------------------------
// Sortable card wrapper with drag-to-resize
// ---------------------------------------------------------------------------

const GAP_PX = 16; // gap-4
const ROW_HEIGHT_PX = 180; // auto-rows-[180px]
const GRID_COLS = 8;

function SortableCard({
  id,
  size,
  onResize,
  children,
}: {
  id: string;
  size: CardSize;
  onResize: (cols: number, rows: number) => void;
  children: ReactNode;
}) {
  const [resizePreview, setResizePreview] = useState<CardSize | null>(null);
  const resizeState = useRef<{
    startX: number;
    startY: number;
    colWidth: number;
    startCols: number;
    startRows: number;
    latest: CardSize | null;
  } | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id });

  const activeSize = resizePreview ?? size;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: resizePreview ? 'none' : transition,
  };

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const card = (e.target as HTMLElement).closest(
        '[data-card]',
      ) as HTMLElement | null;
      const grid = card?.parentElement;
      if (!grid) return;

      const gridWidth = grid.clientWidth;
      const colWidth = (gridWidth - GAP_PX * (GRID_COLS - 1)) / GRID_COLS;

      resizeState.current = {
        startX: e.clientX,
        startY: e.clientY,
        colWidth,
        startCols: size.cols,
        startRows: size.rows,
        latest: null,
      };

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [size],
  );

  const handleResizePointerMove = useCallback((e: React.PointerEvent) => {
    const s = resizeState.current;
    if (!s) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    const newCols = Math.max(
      1,
      Math.min(8, s.startCols + Math.round(dx / s.colWidth)),
    );
    const newRows = Math.max(
      1,
      Math.min(4, s.startRows + Math.round(dy / ROW_HEIGHT_PX)),
    );
    const p = { cols: newCols, rows: newRows };
    s.latest = p;
    setResizePreview(p);
  }, []);

  const handleResizePointerUp = useCallback(() => {
    const s = resizeState.current;
    resizeState.current = null;
    setResizePreview(null);
    if (
      s?.latest &&
      (s.latest.cols !== size.cols || s.latest.rows !== size.rows)
    ) {
      onResize(s.latest.cols, s.latest.rows);
    }
  }, [size, onResize]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-card
      className={`${COL_CLASSES[activeSize.cols] ?? 'col-span-1'} ${ROW_CLASSES[activeSize.rows] ?? 'row-span-1'} overflow-hidden rounded-lg transition-shadow duration-200 ${
        isOver && !isDragging
          ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background shadow-lg'
          : ''
      } ${isDragging ? 'z-50' : ''}`}
      {...attributes}
    >
      {isDragging ? (
        <div className="h-full rounded-lg border-2 border-dashed border-primary/40 bg-primary/5" />
      ) : (
        <div className="group relative h-full">
          {/* Drag handle */}
          <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              {...listeners}
              className="rounded-md border bg-background p-1 shadow-sm cursor-grab active:cursor-grabbing hover:bg-accent"
              aria-label="Drag to reorder"
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
                  d="M4 8h16M4 16h16"
                />
              </svg>
            </button>
          </div>

          {children}

          {/* Resize handle — bottom-right corner drag grip */}
          <div
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            className="absolute bottom-0 right-0 z-10 cursor-nwse-resize p-1.5 opacity-0 transition-opacity group-hover:opacity-70 hover:opacity-100! touch-none"
            aria-label="Resize card"
          >
            <svg
              className="h-3 w-3 text-muted-foreground"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M9 1L1 9M9 5L5 9" />
            </svg>
          </div>

          {/* Size badge overlay during resize */}
          {resizePreview && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-background/70">
              <span className="text-lg font-bold text-primary">
                {resizePreview.cols}×{resizePreview.rows}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const chartColors = useChartColors();
  const isMobile = useIsMobile();

  const roundToOneDecimal = (value: number) =>
    Math.round((value + Number.EPSILON) * 10) / 10;

  // ── Date range state ──────────────────────────────────────────────────
  const [dateRangePreset, setDateRangePreset] =
    useState<DateRangePreset>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const customDateValidation = useMemo(() => {
    if (dateRangePreset !== 'custom')
      return { isValid: true, error: null as string | null };
    if (!customStartDate || !customEndDate)
      return { isValid: false, error: 'Select both start and end dates.' };
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
      return { isValid: false, error: 'Please select valid dates.' };
    if (start > end)
      return { isValid: false, error: 'Start date must be before end date.' };
    const diffDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays > 366)
      return {
        isValid: false,
        error: 'Custom ranges are limited to 366 days.',
      };
    return { isValid: true, error: null as string | null };
  }, [dateRangePreset, customStartDate, customEndDate]);

  const dateRange = useMemo((): DateRange => {
    if (
      dateRangePreset === 'custom' &&
      customStartDate &&
      customEndDate &&
      customDateValidation.isValid
    ) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const diffDays = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        startDate: customStartDate,
        endDate: customEndDate,
        label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${diffDays} days)`,
      };
    }
    const preset =
      DATE_RANGE_PRESETS[
        dateRangePreset === 'custom' ? '30d' : dateRangePreset
      ];
    const dates = preset.getDates();
    return { ...dates, label: preset.label };
  }, [
    dateRangePreset,
    customStartDate,
    customEndDate,
    customDateValidation.isValid,
  ]);

  // ── Timezone ──────────────────────────────────────────────────────────
  const timezone = useTimezone();
  const todayInTimezone = useMemo(
    () => getTodayInTimezone(timezone),
    [timezone],
  );

  // ── Dashboard layout prefs (before data hooks: gate fetches to visible cards) ──
  const { data: dashPrefs, isPending: dashPrefsPending } =
    useDashboardPreferences();
  const updatePrefs = useUpdateDashboardPreferences();

  const allCardIds = useMemo(
    () => [...DASHBOARD_CARD_IDS] as DashboardCardId[],
    [],
  );

  const { visibleCards, cardOrder, needsMigration, needsSizeReset } =
    useMemo(() => {
      if (!dashPrefs)
        return {
          visibleCards: allCardIds,
          cardOrder: allCardIds,
          needsMigration: false,
        };

      let savedVisible = dashPrefs.visibleCards as string[];
      let savedOrder = dashPrefs.cardOrder as string[];
      let dirty = false;

      if (savedVisible.includes('daily-goals')) {
        savedVisible = savedVisible.filter((id) => id !== 'daily-goals');
        savedVisible.push(
          ...GOAL_CARD_IDS.filter((id) => !savedVisible.includes(id)),
        );
        dirty = true;
      }
      if (savedOrder.includes('daily-goals')) {
        const idx = savedOrder.indexOf('daily-goals');
        savedOrder = [
          ...savedOrder.slice(0, idx),
          ...GOAL_CARD_IDS.filter((id) => !savedOrder.includes(id)),
          ...savedOrder.slice(idx + 1),
        ];
        dirty = true;
      }

      if (savedVisible.includes('stats-grid')) {
        savedVisible = savedVisible.filter((id) => id !== 'stats-grid');
        savedVisible.push(
          ...STAT_CARD_IDS.filter((id) => !savedVisible.includes(id)),
        );
        dirty = true;
      }
      if (savedOrder.includes('stats-grid')) {
        const idx = savedOrder.indexOf('stats-grid');
        savedOrder = [
          ...savedOrder.slice(0, idx),
          ...STAT_CARD_IDS.filter((id) => !savedOrder.includes(id)),
          ...savedOrder.slice(idx + 1),
        ];
        dirty = true;
      }

      const storedLayoutVersion =
        typeof window !== 'undefined'
          ? Number(localStorage.getItem(LAYOUT_VERSION_KEY) || '0')
          : LAYOUT_VERSION;
      const needsSizeReset = storedLayoutVersion < LAYOUT_VERSION;
      if (needsSizeReset) {
        savedOrder = [...(allCardIds as string[])];
        dirty = true;
      }

      const knownIds = new Set(allCardIds as string[]);
      savedVisible = savedVisible.filter((id) => knownIds.has(id));
      savedOrder = savedOrder.filter((id) => knownIds.has(id));
      for (const id of allCardIds) {
        if (!savedOrder.includes(id)) {
          savedOrder.push(id);
          savedVisible.push(id);
          dirty = true;
        }
      }

      return {
        visibleCards: savedVisible as DashboardCardId[],
        cardOrder: savedOrder as DashboardCardId[],
        needsMigration: dirty,
        needsSizeReset,
      };
    }, [dashPrefs, allCardIds]);

  const hasMigrated = useRef(false);
  useEffect(() => {
    if (needsMigration && !hasMigrated.current) {
      hasMigrated.current = true;
      localStorage.setItem(LAYOUT_VERSION_KEY, String(LAYOUT_VERSION));
      updatePrefs.mutate({
        visibleCards,
        cardOrder,
        ...(needsSizeReset ? { cardSizes: {} } : {}),
      });
    }
  }, [needsMigration, needsSizeReset, visibleCards, cardOrder, updatePrefs]);

  const orderedVisibleCards = useMemo(() => {
    const vis = new Set(visibleCards);
    return cardOrder.filter((id) => vis.has(id));
  }, [visibleCards, cardOrder]);

  const bypassDataGate = dashPrefsPending && dashPrefs === undefined;
  const { gate } = useDashboardDataGate(visibleCards, bypassDataGate);

  // ── Data hooks (enabled follows visible dashboard cards) ─────────────
  const { data: profileData, isLoading: isLoadingProfile } = useProfile();
  const { data: nutritionData, isLoading: isLoadingNutrition } =
    useDailyNutritionSummary(todayInTimezone, {
      enabled: gate(dashboardQueryCards.dailyNutrition),
    });
  const { data: waterData, isLoading: isLoadingWater } = useDailyWaterSummary(
    todayInTimezone,
    {
      enabled: gate(dashboardQueryCards.water),
    },
  );
  const { data: weightData, isLoading: isLoadingWeight } = useWeightLogs(
    { limit: 365 },
    { enabled: gate(dashboardQueryCards.weight) },
  );
  const { data: latestWeightData } = useWeightLogs(
    { limit: 1 },
    { enabled: gate(dashboardQueryCards.weight) },
  );
  useWeightGoal({ enabled: gate(dashboardQueryCards.weight) });
  const { data: workoutStats } = useWorkoutStats({
    enabled: gate(dashboardQueryCards.workoutGoals),
  });
  useWorkoutSessions(
    {
      page: 1,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      limit: 100,
    },
    { enabled: gate(dashboardQueryCards.workoutSessions) },
  );
  const { data: weeklySessionsData } = useWorkoutSessions(
    {
      page: 1,
      startDate: getDaysAgoInTimezone(7, timezone),
      endDate: todayInTimezone,
      limit: 50,
    },
    { enabled: gate(dashboardQueryCards.workoutSessions) },
  );
  const { data: personalRecordsData, isLoading: isLoadingPRs } =
    usePersonalRecords(undefined, {
      enabled: gate(dashboardQueryCards.personalRecords),
    });
  const { data: activityDataResponse } = useActivityData(365, {
    enabled: gate(dashboardQueryCards.workoutActivity),
  });
  const { data: muscleBreakdownData, isLoading: isLoadingMuscle } =
    useMuscleBreakdown(
      {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      { enabled: gate(dashboardQueryCards.muscleBreakdown) },
    );
  const { data: weeklyMuscleData } = useMuscleBreakdown(7, {
    enabled: gate(dashboardQueryCards.muscleBreakdown),
  });
  const { data: workoutGoalData } = useWorkoutGoalWithDefaults({
    enabled: gate(dashboardQueryCards.workoutGoals),
  });
  const { data: recentWorkoutsData, isLoading: isLoadingRecentWorkouts } =
    useRecentWorkouts(50, {
      enabled: gate(dashboardQueryCards.recentWorkouts),
    });
  const { data: motivationQuoteData, isLoading: isLoadingMotivationQuote } =
    useWorkoutMotivationQuote({
      enabled: gate(dashboardQueryCards.motivationQuote),
    });
  const { data: lifestyleInsightsData, isLoading: isLoadingLifestyleInsights } =
    useLifestyleInsights({
      enabled: gate(dashboardQueryCards.lifestyle),
    });
  const { data: habitsData, isLoading: isLoadingHabits } = useHabits(false, {
    enabled: gate(dashboardQueryCards.habits),
  });
  const { data: achievementsData, isLoading: isLoadingAchievements } =
    useMyAchievements({
      enabled: gate(dashboardQueryCards.achievements),
    });
  const { data: challengesData, isLoading: isLoadingChallenges } =
    useMyChallenges({
      enabled: gate(dashboardQueryCards.challenges),
    });
  const { data: measurementsData, isLoading: isLoadingMeasurements } =
    useMeasurements(
      { limit: 10 },
      { enabled: gate(dashboardQueryCards.measurements) },
    );
  const { data: waterHistoryData } = useWaterHistory(
    dateRange.startDate,
    dateRange.endDate,
    { enabled: gate(dashboardQueryCards.waterHistory) },
  );
  const { data: nutritionHistoryData } = useNutritionHistory(
    dateRange.startDate,
    dateRange.endDate,
    { enabled: gate(dashboardQueryCards.nutritionHistory) },
  );
  const { data: activeStackData } = useActiveStack({
    enabled: gate(dashboardQueryCards.stack),
  });
  const { data: injectionProtocolsData } = useInjectionProtocols({
    enabled: gate(dashboardQueryCards.stack),
  });
  const { data: injectionLogsData } = useInjectionLogs(
    {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      limit: 200,
    },
    { enabled: gate(dashboardQueryCards.stack) },
  );
  const { data: activeMealPlanData } = useActiveMealPlan({
    enabled: gate(dashboardQueryCards.meal),
  });
  const { data: groceryListsData } = useGroceryLists({
    enabled: gate(dashboardQueryCards.grocery),
  });
  const { data: stepsToday, isLoading: isLoadingSteps } = useStepsToday({
    enabled: gate(dashboardQueryCards.steps),
  });
  const stepsTrendDays = useStepsTrend(
    getDaysAgoInTimezone(7, timezone),
    todayInTimezone,
    { enabled: gate(dashboardQueryCards.steps) },
  );
  const heartRateQuery = useHeartRateDailySummary(
    getDaysAgoInTimezone(7, timezone),
    todayInTimezone,
    { enabled: gate(dashboardQueryCards.heartRate) },
  );
  const { data: lifestyleGoalData } = useLifestyleGoalWithDefaults({
    enabled: gate(dashboardQueryCards.lifestyleGoal),
  });
  const { data: sleepTrendData, isLoading: isLoadingSleep } = useSleepTrend(
    todayInTimezone,
    todayInTimezone,
    { enabled: gate(dashboardQueryCards.sleep) },
  );

  // ── Customize dialog state ────────────────────────────────────────────
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [pendingVisible, setPendingVisible] = useState<Set<DashboardCardId>>(
    new Set(),
  );

  const openCustomize = useCallback(() => {
    setPendingVisible(new Set(visibleCards));
    setCustomizeOpen(true);
  }, [visibleCards]);

  const saveCustomize = useCallback(() => {
    const newVisible = allCardIds.filter((id) => pendingVisible.has(id));
    const newOrder = cardOrder.filter((id) => pendingVisible.has(id));
    // add any newly-visible cards not already in order
    for (const id of newVisible) {
      if (!newOrder.includes(id)) newOrder.push(id);
    }
    updatePrefs.mutate({ visibleCards: newVisible, cardOrder: newOrder });
    setCustomizeOpen(false);
  }, [pendingVisible, cardOrder, allCardIds, updatePrefs]);

  // ── Drag and drop ─────────────────────────────────────────────────────
  const [activeId, setActiveId] = useState<DashboardCardId | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as DashboardCardId);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = cardOrder.indexOf(active.id as DashboardCardId);
      const newIndex = cardOrder.indexOf(over.id as DashboardCardId);
      if (oldIndex === -1 || newIndex === -1) return;
      const newOrder = arrayMove(cardOrder, oldIndex, newIndex);
      updatePrefs.mutate({
        visibleCards: [...visibleCards],
        cardOrder: newOrder,
      });
    },
    [cardOrder, visibleCards, updatePrefs],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // ── Card sizes (user overrides merged with defaults) ────────────────
  const userCardSizes = useMemo(
    () => (dashPrefs?.cardSizes ?? {}) as Record<string, CardSize>,
    [dashPrefs?.cardSizes],
  );

  const getCardSize = useCallback(
    (cardId: DashboardCardId): CardSize =>
      userCardSizes[cardId] ??
      CARD_DEFAULT_SIZES[cardId] ?? { cols: 1, rows: 1 },
    [userCardSizes],
  );

  const handleResize = useCallback(
    (cardId: DashboardCardId, cols: number, rows: number) => {
      const newSizes = { ...userCardSizes, [cardId]: { cols, rows } };
      updatePrefs.mutate({
        visibleCards: [...visibleCards],
        cardOrder: [...cardOrder],
        cardSizes: newSizes,
      });
    },
    [userCardSizes, visibleCards, cardOrder, updatePrefs],
  );

  // ── Extract data from hooks ───────────────────────────────────────────
  const profile = profileData?.data;
  const nutrition = nutritionData?.data;
  const water = waterData?.data;
  const weightLogs = weightData?.data;
  const workouts = workoutStats?.data;
  const prs = personalRecordsData?.data;
  const motivationQuote = motivationQuoteData?.data;
  const lifestyleInsights = lifestyleInsightsData?.data;
  const habits = habitsData?.data?.items;
  const myAchievements = achievementsData?.data?.items;
  const myChallenges = challengesData?.data;

  // ── Computed data ─────────────────────────────────────────────────────
  const measurementsSummary = useMemo(() => {
    const items = measurementsData?.data?.items;
    if (!items || items.length === 0) return null;
    const latest = items[0];
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const olderItems = items.filter(
      (m) => new Date(m.loggedAt) <= fourWeeksAgo,
    );
    const prev = olderItems.length > 0 ? olderItems[0] : null;
    const delta = (current: number | null, previous: number | null) => {
      if (current == null || previous == null) return null;
      return Math.round((current - previous) * 10) / 10;
    };
    return {
      latest,
      deltas: prev
        ? {
            waist: delta(latest.waist, prev.waist),
            chest: delta(latest.chest, prev.chest),
            hips: delta(latest.hips, prev.hips),
          }
        : null,
    };
  }, [measurementsData]);

  const waterHistoryDays = waterHistoryData?.data?.days ?? [];
  const nutritionHistoryDays = nutritionHistoryData?.data?.days ?? [];
  const activeStack = activeStackData?.data ?? null;

  const injectionCompliance = useMemo(() => {
    const protocols = injectionProtocolsData?.data ?? [];
    if (!Array.isArray(protocols) || protocols.length === 0) return null;
    const logsData = injectionLogsData?.data;
    const logs =
      (logsData && 'items' in logsData ? logsData.items : logsData) ?? [];
    const logsArr = Array.isArray(logs) ? logs : [];
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const weeks = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)),
    );
    const expected = protocols.length * weeks;
    const actual = logsArr.length;
    return {
      percent:
        expected > 0 ? Math.min(100, Math.round((actual / expected) * 100)) : 0,
      actual,
      expected,
      protocols: protocols.length,
    };
  }, [injectionProtocolsData, injectionLogsData, dateRange]);

  const mealPlanStatus = useMemo(() => {
    const plan = activeMealPlanData?.data ?? null;
    const lists = groceryListsData?.data ?? [];
    const listsArr = Array.isArray(lists) ? lists : [];
    if (!plan) return null;
    const activeList = listsArr.find(
      (l) => l.mealPlanName === plan.name || l.status === 'ACTIVE',
    );
    return {
      name: plan.name,
      itemCount: plan.items?.length ?? 0,
      groceryProgress: activeList
        ? {
            checked: activeList.checkedCount,
            total: activeList.totalCount,
            percent:
              activeList.totalCount > 0
                ? Math.round(
                    (activeList.checkedCount / activeList.totalCount) * 100,
                  )
                : 0,
          }
        : null,
    };
  }, [activeMealPlanData, groceryListsData]);

  const activityData = useMemo(() => {
    if (activityDataResponse?.data?.items) {
      return activityDataResponse.data.items.map((item) => ({
        date: item.date,
        workouts: item.workouts,
        calories: Math.round(item.volume * 0.015),
      }));
    }
    return [];
  }, [activityDataResponse]);

  const muscleWorkoutDataReal = useMemo(() => {
    if (muscleBreakdownData?.data?.items) {
      const muscleNameMap: Record<string, string> = {
        CHEST: 'chest',
        BACK: 'back',
        SHOULDERS: 'shoulders',
        BICEPS: 'arms',
        TRICEPS: 'arms',
        LEGS: 'legs',
        GLUTES: 'glutes',
        CORE: 'core',
        FULL_BODY: 'core',
      };
      const aggregated: Record<string, { fullName: string; value: number }> =
        {};
      for (const item of muscleBreakdownData.data.items) {
        const mappedMuscle = muscleNameMap[item.muscleGroup] || 'core';
        const displayName = mappedMuscle === 'arms' ? 'Arms' : item.fullName;
        if (!aggregated[mappedMuscle])
          aggregated[mappedMuscle] = { fullName: displayName, value: 0 };
        aggregated[mappedMuscle].value += item.percentage;
      }
      const colorIndexMap: Record<string, number> = {
        chest: 1,
        back: 2,
        shoulders: 3,
        arms: 4,
        core: 5,
        legs: 1,
        glutes: 2,
      };
      return Object.entries(aggregated).map(([muscle, data]) => ({
        muscle: muscle as MuscleGroup,
        fullName: data.fullName,
        value: Math.min(100, data.value),
        colorIndex: colorIndexMap[muscle] || 1,
      }));
    }
    return [];
  }, [muscleBreakdownData]);

  const weeklyVolumeDataReal = useMemo(() => {
    const targets =
      (workoutGoalData?.data?.muscleTargets as Record<string, number>) || {};
    const targetDisplayMap: Record<string, string> = {
      CHEST: 'Chest',
      BACK: 'Back',
      SHOULDERS: 'Shoulders',
      ARMS: 'Arms',
      LEGS: 'Legs',
      CORE: 'Core',
    };
    const displayTargets: Record<string, number> = {};
    for (const [key, value] of Object.entries(targets)) {
      displayTargets[targetDisplayMap[key] || key] = value;
    }
    if (
      weeklyMuscleData?.data?.items &&
      weeklyMuscleData.data.items.length > 0
    ) {
      const muscleNameMap: Record<string, string> = {
        CHEST: 'Chest',
        BACK: 'Back',
        SHOULDERS: 'Shoulders',
        BICEPS: 'Arms',
        TRICEPS: 'Arms',
        LEGS: 'Legs',
        GLUTES: 'Glutes',
        CORE: 'Core',
        FULL_BODY: 'Core',
      };
      const aggregated: Record<string, number> = {};
      for (const item of weeklyMuscleData.data.items) {
        const displayName = muscleNameMap[item.muscleGroup] || item.fullName;
        aggregated[displayName] = (aggregated[displayName] || 0) + item.sets;
      }
      const allMuscles = new Set([
        ...Object.keys(aggregated),
        ...Object.keys(displayTargets),
      ]);
      return Array.from(allMuscles)
        .map((muscle) => ({
          muscle,
          sets: aggregated[muscle] || 0,
          target: displayTargets[muscle] || 0,
        }))
        .filter((item) => item.sets > 0 || item.target > 0)
        .sort((a, b) => b.sets + b.target - (a.sets + a.target));
    }
    if (Object.keys(displayTargets).length > 0) {
      return Object.entries(displayTargets).map(([muscle, target]) => ({
        muscle,
        sets: 0,
        target,
      }));
    }
    return [];
  }, [weeklyMuscleData, workoutGoalData]);

  const prTimelineDataReal = useMemo(() => {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    if (prs?.items && prs.items.length > 0) {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      const prsInRange = prs.items.filter((pr) => {
        const date = new Date(pr.achievedAt);
        return date >= start && date <= end;
      });
      const monthCounts: Record<string, number> = {};
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cursor <= end) {
        monthCounts[`${cursor.getFullYear()}-${cursor.getMonth()}`] = 0;
        cursor.setMonth(cursor.getMonth() + 1);
      }
      for (const pr of prsInRange) {
        const date = new Date(pr.achievedAt);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (monthCounts[key] !== undefined) monthCounts[key]++;
      }
      return Object.entries(monthCounts).map(([key, count]) => {
        const [, month] = key.split('-').map(Number);
        return { month: monthNames[month], prs: count };
      });
    }
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const months: Array<{ month: string; prs: number }> = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      months.push({ month: monthNames[cursor.getMonth()], prs: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months.length > 0
      ? months
      : [{ month: monthNames[new Date().getMonth()], prs: 0 }];
  }, [prs, dateRange]);

  const recentWorkoutsReal = useMemo(() => {
    if (recentWorkoutsData?.data && recentWorkoutsData.data.length > 0) {
      return recentWorkoutsData.data.map((workout) => {
        const date = new Date(workout.performed);
        const dateStr = getRelativeDateInTimezone(date, timezone);
        return {
          id: workout.id,
          name: workout.title || 'Workout',
          date: dateStr,
          duration: workout.duration ? `${workout.duration} min` : null,
          exercises: workout.exerciseCount,
          volume: `${workout.totalVolume.toLocaleString()} lbs`,
          exerciseNames: workout.exerciseNames,
        };
      });
    }
    return null;
  }, [recentWorkoutsData, timezone]);

  const weeklyDurationDataReal = useMemo(() => {
    const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const buckets = dayOrder.map((day) => ({ day, duration: 0 }));
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const durationBySessionId = new Map<string, number>();
    for (const workout of recentWorkoutsData?.data ?? []) {
      const performed = new Date(workout.performed);
      if (performed < sevenDaysAgo) continue;
      if (workout.duration && workout.duration > 0)
        durationBySessionId.set(workout.id, workout.duration);
    }
    for (const session of weeklySessionsData?.data?.items ?? []) {
      const performed = new Date(session.performed);
      const dayIndex = performed.getDay();
      const summaryDuration = durationBySessionId.get(session.id);
      if (summaryDuration && summaryDuration > 0) {
        buckets[dayIndex].duration += summaryDuration;
        continue;
      }
      const timedSetSeconds = session.workouts.reduce(
        (totalWorkoutSeconds, workout) => {
          const workoutSeconds = workout.sets.reduce(
            (totalSetSeconds, set) => totalSetSeconds + (set.duration ?? 0),
            0,
          );
          return totalWorkoutSeconds + workoutSeconds;
        },
        0,
      );
      if (timedSetSeconds > 0)
        buckets[dayIndex].duration += Math.round(timedSetSeconds / 60);
    }
    return buckets;
  }, [recentWorkoutsData, weeklySessionsData]);

  const macrosDataReal = useMemo(() => {
    if (!nutrition?.totals) return [];
    const data = [
      {
        name: 'Protein',
        value: roundToOneDecimal(nutrition.totals.protein ?? 0),
      },
      { name: 'Carbs', value: roundToOneDecimal(nutrition.totals.carbs ?? 0) },
      { name: 'Fats', value: roundToOneDecimal(nutrition.totals.fat ?? 0) },
    ];
    return data.filter((item) => item.value > 0);
  }, [nutrition]);

  const hasMuscleData = muscleWorkoutDataReal.length > 0;
  const hasWeeklyDurationData = weeklyDurationDataReal.some(
    (item) => item.duration > 0,
  );

  const heartRateDailyData = useMemo(() => {
    const days = heartRateQuery.data;
    if (!days || days.length === 0) return undefined;
    return days.map((d) => ({
      date: d.date,
      restingBpm: d.min,
      avgBpm: d.avg,
      maxBpm: d.max,
    }));
  }, [heartRateQuery.data]);
  const hasMacrosData = macrosDataReal.length > 0;
  const hasWeeklyVolumeData = weeklyVolumeDataReal.length > 0;
  const hasLifestyleTrendData = (lifestyleInsights?.trend?.length ?? 0) > 0;

  const totalWorkoutsThisYear =
    workouts?.totalSessions ??
    activityData.reduce((sum, day) => sum + day.workouts, 0);
  const totalCaloriesThisYear = activityData.reduce(
    (sum, day) => sum + day.calories,
    0,
  );

  let currentStreak = 0;
  for (let i = activityData.length - 1; i >= 0; i--) {
    if (activityData[i].workouts > 0) currentStreak++;
    else break;
  }

  const weeklyWorkouts = useMemo(
    () => weeklySessionsData?.data?.items?.length ?? 0,
    [weeklySessionsData],
  );
  const latestWeight = latestWeightData?.data?.items?.[0];
  const latestWeightLogs = latestWeightData?.data;

  const weightProgressDataReal = useMemo(() => {
    if (!weightLogs?.items || weightLogs.items.length === 0) return [];
    const start = parseDateOnlyLocal(dateRange.startDate);
    const end = parseDateOnlyLocal(dateRange.endDate);
    end.setHours(23, 59, 59, 999);
    const logsInRange = weightLogs.items.filter((log) => {
      const logDate = new Date(log.loggedAt);
      return logDate >= start && logDate <= end;
    });
    if (logsInRange.length === 0) return [];
    const daysDiff = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const buckets: Array<{ start: Date; end: Date; label: string }> = [];
    if (daysDiff <= 14) {
      for (let i = 0; i <= daysDiff; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        buckets.push({
          start: dayStart,
          end: dayEnd,
          label: date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
        });
      }
    } else if (daysDiff <= 90) {
      const currentStart = new Date(start);
      currentStart.setDate(currentStart.getDate() - currentStart.getDay());
      let weekNum = 1;
      while (currentStart <= end) {
        const weekEnd = new Date(currentStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        buckets.push({
          start: new Date(currentStart),
          end: weekEnd,
          label: `W${weekNum}`,
        });
        currentStart.setDate(currentStart.getDate() + 7);
        weekNum++;
      }
    } else {
      const currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      while (currentMonth <= end) {
        const monthEnd = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );
        buckets.push({
          start: new Date(currentMonth),
          end: monthEnd,
          label: currentMonth.toLocaleDateString('en-US', { month: 'short' }),
        });
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
    }
    const result = buckets.map((bucket) => {
      const bucketLogs = logsInRange.filter((log) => {
        const logDate = new Date(log.loggedAt);
        return logDate >= bucket.start && logDate <= bucket.end;
      });
      const avgWeight =
        bucketLogs.length > 0
          ? bucketLogs.reduce((sum, log) => sum + log.value, 0) /
            bucketLogs.length
          : null;
      const logsWithBodyFat = bucketLogs.filter((log) => log.bodyFat != null);
      const avgBodyFat =
        logsWithBodyFat.length > 0
          ? logsWithBodyFat.reduce((sum, log) => sum + (log.bodyFat || 0), 0) /
            logsWithBodyFat.length
          : null;
      return {
        week: bucket.label,
        weight: avgWeight ? Number(avgWeight.toFixed(1)) : null,
        bodyFat: avgBodyFat ? Number(avgBodyFat.toFixed(1)) : null,
      };
    });
    const hasAnyWeight = result.some((w) => w.weight !== null);
    if (!hasAnyWeight) return [];
    return result;
  }, [weightLogs, dateRange]);

  const hasWeightProgressData = weightProgressDataReal.length > 0;
  const userName = profile?.displayName || 'there';
  const userAvatar = profile?.avatarUrl;

  // ── Card renderer ─────────────────────────────────────────────────────
  const renderCard = (cardId: DashboardCardId): ReactNode => {
    switch (cardId) {
      case 'motivation-quote':
        return (
          <MotivationQuoteCard
            motivationQuote={motivationQuote}
            isLoading={isLoadingMotivationQuote}
          />
        );
      case 'goal-workouts':
        return <GoalWorkoutsCard weeklyWorkouts={weeklyWorkouts} />;
      case 'goal-calories':
        return (
          <GoalCaloriesCard
            nutrition={nutrition}
            isLoading={isLoadingNutrition}
          />
        );
      case 'goal-protein':
        return (
          <GoalProteinCard
            nutrition={nutrition}
            isLoading={isLoadingNutrition}
          />
        );
      case 'goal-carbs':
        return (
          <GoalCarbsCard nutrition={nutrition} isLoading={isLoadingNutrition} />
        );
      case 'goal-fats':
        return (
          <GoalFatsCard nutrition={nutrition} isLoading={isLoadingNutrition} />
        );
      case 'goal-water':
        return <GoalWaterCard water={water} isLoading={isLoadingWater} />;
      case 'stat-streak':
        return <StatStreakCard currentStreak={currentStreak} />;
      case 'stat-yearly':
        return <StatYearlyCard totalWorkoutsThisYear={totalWorkoutsThisYear} />;
      case 'stat-calories':
        return (
          <StatCaloriesCard totalCaloriesThisYear={totalCaloriesThisYear} />
        );
      case 'stat-prs':
        return <StatPrsCard prs={prs} />;
      case 'training-overview':
        return (
          <TrainingOverviewCard
            activityData={activityData}
            muscleData={muscleWorkoutDataReal}
            isLoadingMuscle={isLoadingMuscle}
            hasMuscleData={hasMuscleData}
            chartColors={chartColors}
          />
        );
      case 'body-composition':
        return (
          <BodyCompositionCard
            latestWeight={latestWeight}
            stats={latestWeightLogs?.stats}
            isLoading={isLoadingWeight}
          />
        );
      case 'weight-progress':
        return (
          <WeightProgressCard
            data={weightProgressDataReal}
            hasData={hasWeightProgressData}
            dateRange={dateRange}
            chartColors={chartColors}
          />
        );
      case 'strength-progress':
        return <StrengthProgressCard />;
      case 'weekly-duration':
        return (
          <WeeklyDurationCard
            data={weeklyDurationDataReal}
            hasData={hasWeeklyDurationData}
            chartColors={chartColors}
          />
        );
      case 'todays-macros':
        return (
          <MacrosCard
            data={macrosDataReal}
            hasData={hasMacrosData}
            chartColors={chartColors}
          />
        );
      case 'heart-rate':
        return (
          <HeartRateCard
            data={heartRateDailyData}
            isLoading={heartRateQuery.isLoading}
            chartColors={chartColors}
          />
        );
      case 'sleep-recovery':
        return (
          <SleepRecoveryCard
            lifestyleInsights={lifestyleInsights}
            isLoading={isLoadingLifestyleInsights}
            hasTrendData={hasLifestyleTrendData}
            chartColors={chartColors}
          />
        );
      case 'weekly-volume':
        return (
          <WeeklyVolumeCard
            data={weeklyVolumeDataReal}
            hasData={hasWeeklyVolumeData}
            chartColors={chartColors}
          />
        );
      case 'meal-plan':
        return <MealPlanCard mealPlanStatus={mealPlanStatus} />;
      case 'body-measurements':
        return (
          <BodyMeasurementsCard
            measurementsSummary={measurementsSummary}
            isLoading={isLoadingMeasurements}
          />
        );
      case 'lifestyle-adherence':
        return (
          <LifestyleAdherenceCard
            lifestyleInsights={lifestyleInsights}
            isLoading={isLoadingLifestyleInsights}
          />
        );
      case 'stack-compliance':
        return (
          <StackComplianceCard
            activeStack={activeStack}
            injectionCompliance={injectionCompliance}
          />
        );
      case 'hydration-trend':
        return (
          <HydrationTrendCard
            data={waterHistoryDays}
            chartColors={chartColors}
          />
        );
      case 'nutrition-trend':
        return (
          <NutritionTrendCard
            data={nutritionHistoryDays}
            chartColors={chartColors}
          />
        );
      case 'pr-timeline':
        return (
          <PRTimelineCard
            data={prTimelineDataReal}
            isLoading={isLoadingPRs}
            chartColors={chartColors}
          />
        );
      case 'habits':
        return (
          <HabitsCard
            habits={habits}
            isLoading={isLoadingHabits}
            todayKey={todayInTimezone}
          />
        );
      case 'achievements':
        return (
          <AchievementsCard
            myAchievements={myAchievements}
            isLoading={isLoadingAchievements}
          />
        );
      case 'challenges':
        return (
          <ChallengesCard
            myChallenges={myChallenges}
            isLoading={isLoadingChallenges}
          />
        );
      case 'recent-workouts':
        return (
          <RecentWorkoutsCard
            recentWorkouts={recentWorkoutsReal}
            isLoading={isLoadingRecentWorkouts}
          />
        );
      case 'goal-steps':
        return (
          <GoalStepsCard stepsToday={stepsToday} isLoading={isLoadingSteps} />
        );
      case 'goal-sleep': {
        const sleepGoal = lifestyleGoalData?.data?.sleepHours ?? 8;
        const todaySleep = sleepTrendData?.[0]?.duration ?? 0;
        const sleepPercent =
          sleepGoal > 0
            ? Math.min(Math.round((todaySleep / sleepGoal) * 100), 100)
            : 0;
        return (
          <GoalSleepCard
            sleepToday={{
              hours: Math.round(todaySleep * 10) / 10,
              goal: sleepGoal,
              percent: sleepPercent,
            }}
            isLoading={isLoadingSleep}
          />
        );
      }
      case 'step-trend':
        return (
          <StepTrendCard
            data={stepsTrendDays.data}
            goal={stepsToday?.goal ?? 10000}
            isLoading={stepsTrendDays.isLoading}
            chartColors={chartColors}
          />
        );
      default:
        return null;
    }
  };

  // ── JSX ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="mb-6 relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            {isLoadingProfile ? (
              <>
                <Skeleton className="h-14 w-14 rounded-full" />
                <div>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </>
            ) : (
              <>
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-primary/20"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                    <span className="text-xl font-bold text-primary">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Performance Hub
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight">
                    Welcome back, {userName.split(' ')[0]}!
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Here's your fitness overview for{' '}
                    {dateRange.label.toLowerCase()}
                  </p>
                  {dateRangePreset === 'custom' &&
                    customDateValidation.error && (
                      <p className="mt-2 text-xs text-amber-600">
                        {customDateValidation.error}
                      </p>
                    )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                      {totalWorkoutsThisYear} sessions this year
                    </span>
                    <span className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                      {currentStreak} day streak
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Select
                  value={dateRangePreset}
                  onValueChange={(value) =>
                    setDateRangePreset(value as DateRangePreset)
                  }
                >
                  <SelectTrigger
                    size="sm"
                    className="w-auto bg-background/80 border-muted/70"
                  >
                    <svg
                      className="mr-1 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="60d">Last 60 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
                {dateRangePreset === 'custom' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-background/80 border-muted/70"
                      >
                        {customStartDate && customEndDate
                          ? `${new Date(customStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(customEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          : 'Pick dates'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="start">
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            Start Date
                          </label>
                          <Input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            End Date
                          </label>
                          <Input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-full"
                          />
                        </div>
                        {customDateValidation.error && (
                          <p className="text-xs text-amber-600">
                            {customDateValidation.error}
                          </p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Customize Dashboard */}
              <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openCustomize}
                    className="transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 6h16M4 12h16M4 18h7"
                      />
                    </svg>
                    Customize
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Customize Dashboard</DialogTitle>
                    <DialogDescription>
                      Choose which cards to display. Drag cards on the dashboard
                      to reorder them.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-1 py-4">
                    {allCardIds.map((id) => (
                      <label
                        key={id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={pendingVisible.has(id)}
                          onCheckedChange={(checked) => {
                            setPendingVisible((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(id);
                              else next.delete(id);
                              return next;
                            });
                          }}
                        />
                        <span className="text-sm">
                          {CARD_DISPLAY_NAMES[id]}
                        </span>
                      </label>
                    ))}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCustomizeOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={saveCustomize}
                      disabled={pendingVisible.size === 0}
                    >
                      Save ({pendingVisible.size} cards)
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="sm"
                asChild
                className="transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <Link to="/goals">
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Settings
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <Link to="/workouts">
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Log Workout
                </Link>
              </Button>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-right">
              Want training tips and product updates? Join our{' '}
              <a
                href="https://discord.gg/MGrfchn2kh"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Discord
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Cards — drag-and-drop sortable grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={orderedVisibleCards}>
          <div
            className={`grid gap-4 transition-colors duration-200 rounded-xl ${
              isMobile
                ? 'grid-cols-1 auto-rows-auto *:col-span-1! *:row-span-1!'
                : 'grid-cols-1 auto-rows-[180px] md:grid-cols-2 lg:grid-cols-8'
            } ${
              activeId ? 'bg-primary/3 ring-1 ring-inset ring-primary/10' : ''
            }`}
          >
            {orderedVisibleCards.map((cardId) => (
              <SortableCard
                key={cardId}
                id={cardId}
                size={getCardSize(cardId)}
                onResize={(cols, rows) => handleResize(cardId, cols, rows)}
              >
                {renderCard(cardId)}
              </SortableCard>
            ))}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeId ? (
            <div className="overflow-hidden rounded-lg shadow-2xl ring-2 ring-primary/20 opacity-90">
              {renderCard(activeId)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
