import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Target,
  Scale,
  Utensils,
  Droplets,
  Moon,
  Footprints,
  ClipboardCheck,
  CalendarDays,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  Settings,
  Dumbbell,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNutritionGoal } from '@/features/health';
import { useWeightGoal } from '@/features/health';
import { useWaterGoal } from '@/features/health';
import { useWorkoutGoalWithDefaults } from '@/features/health';
import { useLifestyleGoalWithDefaults } from '@/features/health';
import { useIsMobile } from '@/hooks/use-is-mobile';

export default function GoalsPage() {
  const isMobile = useIsMobile();
  const { data: nutritionGoal, isLoading: isLoadingNutrition } =
    useNutritionGoal();
  const { data: weightGoal, isLoading: isLoadingWeight } = useWeightGoal();
  const { data: waterGoal, isLoading: isLoadingWater } = useWaterGoal();
  const { data: workoutGoal, isLoading: isLoadingWorkout } =
    useWorkoutGoalWithDefaults();
  const { data: lifestyleGoal, isLoading: isLoadingLifestyle } =
    useLifestyleGoalWithDefaults();

  const nutrition = nutritionGoal?.data;
  const weight = weightGoal?.data;
  const water = waterGoal?.data;
  const workout = workoutGoal?.data;
  const lifestyle = lifestyleGoal?.data;

  const getGoalIcon = (goalType?: string) => {
    switch (goalType) {
      case 'LOSE':
        return TrendingDown;
      case 'GAIN':
        return TrendingUp;
      default:
        return Minus;
    }
  };

  const getGoalLabel = (goalType?: string) => {
    switch (goalType) {
      case 'LOSE':
        return 'Lose Weight';
      case 'GAIN':
        return 'Build Muscle';
      default:
        return 'Maintain';
    }
  };

  const getGoalColor = (goalType?: string) => {
    switch (goalType) {
      case 'LOSE':
        return 'text-blue-500';
      case 'GAIN':
        return 'text-orange-500';
      default:
        return 'text-green-500';
    }
  };

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
              Goal Center
            </p>
            <h1 className="text-3xl font-bold tracking-tight mt-1">
              Your Goals
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Track and manage your nutrition, weight, hydration, workout, and
              lifestyle goals.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
              <Target className="h-3.5 w-3.5 text-primary" />5 core health goal
              areas
            </div>
          </div>
          <Button
            asChild
            size="icon"
            aria-label="Open goal wizard"
            title="Open goal wizard"
            className="bg-linear-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <Link to="/health/goals/wizard">
              <Sparkles className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="relative mt-4 rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
          <div className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Quick start: open the wizard to set all core goals in one pass,
              then fine-tune individual goal cards with the settings icons.
            </p>
          </div>
        </div>
      </section>

      {/* Goals Grid */}
      <div
        className={cn(
          'grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none',
          isMobile ? 'grid-cols-1' : 'md:grid-cols-2 xl:grid-cols-12',
        )}
      >
        {/* Nutrition Goal Card */}
        <Card className="group relative overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 xl:col-span-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-orange-500/70 to-amber-500/70" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Utensils className="h-5 w-5 text-orange-500" />
              </div>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/food-diary">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardTitle className="mt-3">Nutrition Goals</CardTitle>
            <CardDescription>Daily calorie and macro targets</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingNutrition ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-24" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ) : nutrition ? (
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold">
                    {nutrition.targetCalories}
                  </p>
                  <p className="text-xs text-muted-foreground">calories/day</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <p className="text-lg font-semibold text-blue-600">
                      {nutrition.targetProtein}g
                    </p>
                    <p className="text-xs text-muted-foreground">Protein</p>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <p className="text-lg font-semibold text-amber-600">
                      {nutrition.targetCarbs}g
                    </p>
                    <p className="text-xs text-muted-foreground">Carbs</p>
                  </div>
                  <div className="p-2 rounded-lg bg-pink-500/10">
                    <p className="text-lg font-semibold text-pink-600">
                      {nutrition.targetFat}g
                    </p>
                    <p className="text-xs text-muted-foreground">Fat</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  No nutrition goals set
                </p>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link to="/health/goals/wizard">Set up now</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weight Goal Card */}
        <Card className="group relative overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 xl:col-span-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-green-500/70 to-lime-500/70" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Scale className="h-5 w-5 text-green-500" />
              </div>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/weight">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardTitle className="mt-3">Weight Goal</CardTitle>
            <CardDescription>Target weight and timeline</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingWeight ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : weight ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = getGoalIcon(weight.goalType);
                    return (
                      <div
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center bg-muted',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4',
                            getGoalColor(weight.goalType),
                          )}
                        />
                      </div>
                    );
                  })()}
                  <div>
                    <p className="font-semibold">
                      {getGoalLabel(weight.goalType)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {weight.weeklyRate}{' '}
                      {weight.targetUnit?.toLowerCase() || 'lb'}/week
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-baseline gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">
                      {weight.targetWeight}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {weight.targetUnit?.toLowerCase() || 'lb'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  No weight goal set
                </p>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link to="/health/goals/wizard">Set up now</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Water Goal Card */}
        <Card className="group relative overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 xl:col-span-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-blue-500/70 to-cyan-500/70" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Droplets className="h-5 w-5 text-blue-500" />
              </div>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/water">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardTitle className="mt-3">Hydration Goal</CardTitle>
            <CardDescription>Daily water intake target</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingWater ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : water ? (
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold">
                    {water.targetAmount}
                    <span className="text-lg font-normal text-muted-foreground ml-1">
                      {water.targetUnit?.toLowerCase() || 'oz'}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">daily target</p>
                </div>
                <div className="flex gap-2">
                  {[8, 12, 16, 24].map((oz) => (
                    <div
                      key={oz}
                      className="flex-1 text-center p-2 rounded bg-blue-500/5 text-xs"
                    >
                      <Droplets className="h-3 w-3 mx-auto text-blue-500 mb-1" />
                      {oz}oz
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  No water goal set
                </p>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link to="/water">Set up now</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workout Goal Card */}
        <Card className="group relative overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 xl:col-span-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-emerald-500/70 to-teal-500/70" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-emerald-500" />
              </div>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/workouts">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardTitle className="mt-3">Workout Goal</CardTitle>
            <CardDescription>Weekly training targets</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingWorkout ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : workout ? (
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold">
                    {workout.weeklyWorkouts}
                    <span className="text-lg font-normal text-muted-foreground ml-1">
                      days/week
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    training frequency
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Weekly set targets:
                  </p>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {Object.entries(
                      workout.muscleTargets as Record<string, number>,
                    )
                      .slice(0, 6)
                      .map(([muscle, sets]) => (
                        <div
                          key={muscle}
                          className="flex items-center justify-between px-2 py-1 rounded bg-emerald-500/5"
                        >
                          <span className="text-muted-foreground capitalize">
                            {muscle.toLowerCase()}
                          </span>
                          <span className="font-medium">{sets}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  No workout goal set
                </p>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link to="/health/goals/wizard">Set up now</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lifestyle Goal Card */}
        <Card className="group relative overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 xl:col-span-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-indigo-500/70 to-violet-500/70" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Moon className="h-5 w-5 text-indigo-500" />
              </div>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/health/goals/wizard">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardTitle className="mt-3">Lifestyle Goal</CardTitle>
            <CardDescription>
              Sleep, steps, adherence, check-ins
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLifestyle ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : lifestyle ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-indigo-500/10 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Moon className="h-4 w-4 text-indigo-500" /> Sleep
                  </span>
                  <span className="font-semibold">{lifestyle.sleepHours}h</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Footprints className="h-4 w-4 text-emerald-500" /> Steps
                  </span>
                  <span className="font-semibold">
                    {lifestyle.dailySteps.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <ClipboardCheck className="h-4 w-4 text-amber-500" />{' '}
                    Adherence
                  </span>
                  <span className="font-semibold">
                    {lifestyle.adherenceTarget}%
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-cyan-500/10 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-4 w-4 text-cyan-500" /> Check-ins
                  </span>
                  <span className="font-semibold">
                    {lifestyle.checkInsPerWeek}/week
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  No lifestyle goal set
                </p>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link to="/health/goals/wizard">Set up now</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
