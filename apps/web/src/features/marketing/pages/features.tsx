import { Link } from 'react-router';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import gymWorkoutImg from '@/assets/images/unsplash/gym-workout.jpg';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

// Sample data for charts
const progressData = [
  { month: 'Jan', weight: 135, volume: 12000 },
  { month: 'Feb', weight: 145, volume: 14500 },
  { month: 'Mar', weight: 155, volume: 16200 },
  { month: 'Apr', weight: 160, volume: 18000 },
  { month: 'May', weight: 170, volume: 19500 },
  { month: 'Jun', weight: 185, volume: 22000 },
];

const weeklyActivity = [
  { day: 'Mon', workouts: 1, duration: 65 },
  { day: 'Tue', workouts: 1, duration: 45 },
  { day: 'Wed', workouts: 0, duration: 0 },
  { day: 'Thu', workouts: 1, duration: 75 },
  { day: 'Fri', workouts: 1, duration: 55 },
  { day: 'Sat', workouts: 1, duration: 90 },
  { day: 'Sun', workouts: 0, duration: 0 },
];

// Icons
const ShieldIcon = () => (
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
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

const PaletteIcon = () => (
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
      d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z"
    />
  </svg>
);

const UsersIcon = () => (
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
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const HeartIcon = () => (
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
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="h-3 w-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const FeaturesPage = () => {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/50 py-24">
        {/* Animated background orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="vara-marketing-orb-drift absolute -left-40 top-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="vara-marketing-orb-drift-slow absolute -right-40 top-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="vara-marketing-orb-drift-delayed absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        </div>

        {/* Grid pattern overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.1)_1px,transparent_1px)] bg-size-[4rem_4rem]" />

        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards items-center gap-2 text-sm font-medium uppercase tracking-wider text-primary delay-75 duration-500 motion-reduce:animate-none">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
              Features
            </p>
            <h1 className="mb-6 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards text-4xl font-bold tracking-tight delay-150 duration-700 motion-reduce:animate-none md:text-5xl lg:text-6xl">
              Built for{' '}
              <span className="vara-marketing-gradient-text bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                real training
              </span>{' '}
              workflows
            </h1>
            <p className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards text-lg text-muted-foreground delay-300 duration-700 motion-reduce:animate-none">
              Track workouts, manage nutrition, work with coaches, and stay
              connected in one place.
            </p>
          </div>
        </div>
      </section>

      {/* Data Ownership Section */}
      <section className="py-20">
        <div className="container">
          <div
            className={cn(
              'grid gap-12 lg:items-center',
              isMobile ? 'grid-cols-1' : 'lg:grid-cols-2',
            )}
          >
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm text-green-500">
                <ShieldIcon />
                Progress Tracking
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight">
                See progress across lifts, volume, and consistency
              </h2>
              <p className="mb-6 text-muted-foreground">
                The app surfaces key training metrics with clean dashboards and
                trend views so members and coaches can act on what is actually
                happening in training.
              </p>
              <ul className="space-y-3">
                {[
                  'Workout session logging and history',
                  'Personal-record tracking with trend context',
                  'Progress visualizations for quick review',
                  'Health and performance calculators built in',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                      <CheckIcon />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Interactive Chart */}
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Training Volume Trend
                    </p>
                    <p className="text-2xl font-bold">22,000 total lbs</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <DownloadIcon />
                    Export CSV
                  </Button>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={progressData}>
                      <defs>
                        <linearGradient
                          id="colorWeight"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#22c55e"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#22c55e"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="month"
                        stroke="#888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={[10000, 24000]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #333',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="volume"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fill="url(#colorWeight)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Use trend data to adjust programming week to week.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Nutrition Workflow Section */}
      <section className="border-y border-border/40 bg-muted/30 py-20">
        <div className="container">
          <div
            className={cn(
              'grid gap-12 lg:items-center',
              isMobile ? 'grid-cols-1' : 'lg:grid-cols-2',
            )}
          >
            {/* Nutrition Preview */}
            <div className="order-2 lg:order-1">
              <Card className="overflow-hidden border-border/40">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Today&apos;s Nutrition
                      </p>
                      <p className="text-2xl font-bold">2,140 / 2,300 kcal</p>
                    </div>
                    <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                      93% target
                    </span>
                  </div>

                  <div className="mb-5 space-y-3">
                    {[
                      { label: 'Protein', value: '172g / 185g', pct: 93 },
                      { label: 'Carbs', value: '212g / 240g', pct: 88 },
                      { label: 'Fat', value: '68g / 75g', pct: 91 },
                    ].map((macro) => (
                      <div key={macro.label}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium">{macro.label}</span>
                          <span className="text-muted-foreground">
                            {macro.value}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${macro.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-2">
                    {[
                      {
                        meal: 'Breakfast',
                        summary: 'Overnight oats + whey',
                        macros: '44P / 52C / 12F',
                      },
                      {
                        meal: 'Lunch',
                        summary: 'Chicken bowl',
                        macros: '51P / 63C / 18F',
                      },
                      {
                        meal: 'Dinner',
                        summary: 'Salmon + rice',
                        macros: '47P / 41C / 23F',
                      },
                    ].map((item) => (
                      <div
                        key={item.meal}
                        className="flex items-center justify-between rounded-lg border border-border/40 bg-background/60 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{item.meal}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.summary}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {item.macros}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-border/40 pt-3">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Recipe library
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
                        High protein
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
                        Meal prep
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
                        Quick meals
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="order-1 lg:order-2">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-500">
                <PaletteIcon />
                Nutrition Workflow
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight">
                Plan meals, track intake, and keep it practical
              </h2>
              <p className="mb-6 text-muted-foreground">
                Nutrition tools are designed for day-to-day use: recipe
                management, logging, and reusable structures that keep members
                consistent instead of starting from scratch every week.
              </p>
              <ul className="space-y-3">
                {[
                  'Recipe builder for repeatable meals',
                  'Food diary logging with quick entry flow',
                  'Macro and calorie calculators for planning',
                  'Nutrition data connected with training context',
                  'Admin-managed food and category content',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-purple-500">
                      <CheckIcon />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feed Section - Anti-Thirst Trap */}
      <section className="py-20">
        <div className="container">
          <div
            className={cn(
              'grid gap-12 lg:items-center',
              isMobile ? 'grid-cols-1' : 'lg:grid-cols-2',
            )}
          >
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm text-blue-500">
                <HeartIcon />
                Community + Messaging
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight">
                Updates, activity, and conversations in one flow
              </h2>
              <p className="mb-6 text-muted-foreground">
                Members can share progress, react to updates, and coordinate in
                real time with direct messaging and activity surfaces.
              </p>

              <div className="space-y-4">
                <div className="rounded-lg border border-border/40 bg-card/50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Feed Priority</span>
                    <span className="text-xs text-muted-foreground">
                      Typical activity mix
                    </span>
                  </div>
                  <div className="space-y-2">
                    {[
                      {
                        label: 'Workout updates',
                        value: 90,
                        color: 'bg-green-500',
                      },
                      {
                        label: 'Progress milestones',
                        value: 85,
                        color: 'bg-blue-500',
                      },
                      {
                        label: 'Coach/client updates',
                        value: 75,
                        color: 'bg-purple-500',
                      },
                      {
                        label: 'General social posts',
                        value: 15,
                        color: 'bg-muted-foreground',
                      },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs">
                            <span>{item.label}</span>
                            <span className="text-muted-foreground">
                              {item.value}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${item.color}`}
                              style={{ width: `${item.value}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Elevate Feed Frame */}
            <div className="space-y-4">
              <Card className="overflow-hidden border-primary/20 bg-card/60">
                <CardContent className="p-0">
                  <div
                    className={cn(
                      'grid min-h-[420px] bg-background/80',
                      isMobile
                        ? 'grid-cols-1'
                        : 'grid-cols-[72px_minmax(0,1fr)_280px]',
                    )}
                  >
                    <div className="border-r border-border/50 p-3">
                      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-sm font-semibold text-primary">
                        V
                      </div>
                      <div className="space-y-2 pt-1">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div
                            key={i}
                            className="mx-auto h-7 w-7 rounded-md border border-border/40 bg-muted/30"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="border-r border-border/50">
                      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                        <div className="h-8 w-72 rounded-md border border-border/60 bg-muted/30 text-xs text-muted-foreground px-3 py-2">
                          Search...
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted/40" />
                          <div className="h-2 w-16 rounded bg-muted/40" />
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="rounded-2xl border border-border/50 bg-card/80 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-muted/50" />
                              <div>
                                <p className="text-sm font-semibold">
                                  alex_runs
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  about 1 hour ago • edited
                                </p>
                              </div>
                            </div>
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                              Live
                            </span>
                          </div>

                          <p className="text-sm leading-6">
                            Today we released Recipe Builder. Create, track, and
                            save meals with macro and calorie breakdowns in one
                            flow.
                          </p>
                          <p className="mt-2 text-xs text-primary">
                            #fitness #recipes #tracking
                          </p>

                          <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 p-3">
                            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span>Attached preview</span>
                              <span>Recipes module</span>
                            </div>
                            <div className="h-40 rounded-lg border border-border/40 bg-background/70" />
                          </div>

                          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                            <span>0 High-fives</span>
                            <span>0 Comments</span>
                            <span>Save</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 p-3">
                      <div className="rounded-xl border border-border/50 bg-card/70 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Today at your gym
                          </p>
                          <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] text-green-500">
                            0 training now
                          </span>
                        </div>
                        <p className="text-sm font-semibold">
                          Fuel Fortress - Clarksville
                        </p>
                        <div className="mt-2 rounded-md border border-border/50 bg-muted/30 px-2 py-1 text-center text-xs">
                          Find gym partners
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/50 bg-card/70 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Live nearby
                          </p>
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                            0 live
                          </span>
                        </div>
                        <div className="rounded-md border border-border/40 bg-muted/30 px-2 py-3 text-center text-xs text-muted-foreground">
                          No live sessions nearby right now
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/50 bg-card/70 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Inbox</p>
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                            0 unread
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="rounded-md border border-border/40 bg-muted/30 px-2 py-2 text-xs">
                            <p className="font-medium">
                              Stack reminder: Morning items
                            </p>
                            <p className="text-muted-foreground">
                              about 3 hours ago
                            </p>
                          </div>
                          <div className="rounded-md border border-border/40 bg-muted/30 px-2 py-2 text-xs">
                            <p className="font-medium">
                              Daily check-in reminder
                            </p>
                            <p className="text-muted-foreground">
                              about 17 hours ago
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <p className="text-center text-xs text-muted-foreground">
                Elevate surfaces momentum, feed activity, and notifications in
                one screen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Real Connections Section */}
      <section className="border-y border-border/40 bg-muted/30 py-20">
        <div className="container">
          <div
            className={cn(
              'grid gap-12 lg:items-center',
              isMobile ? 'grid-cols-1' : 'lg:grid-cols-2',
            )}
          >
            {/* Activity Chart */}
            <Card className="order-2 border-border/40 bg-card/50 lg:order-1">
              <CardContent className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Weekly Accountability Touchpoints
                  </p>
                  <p className="text-2xl font-bold">7 check-ins + messages</p>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="day"
                        stroke="#888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #333',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                      />
                      <Bar
                        dataKey="duration"
                        fill="#22c55e"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Touchpoint summary */}
                <div className="mt-4 border-t border-border/40 pt-4">
                  <p className="mb-2 text-xs text-muted-foreground">
                    This week
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-muted/60 px-2 py-2">
                      <p className="font-semibold">3</p>
                      <p className="text-muted-foreground">Check-ins</p>
                    </div>
                    <div className="rounded-md bg-muted/60 px-2 py-2">
                      <p className="font-semibold">2</p>
                      <p className="text-muted-foreground">Plan updates</p>
                    </div>
                    <div className="rounded-md bg-muted/60 px-2 py-2">
                      <p className="font-semibold">2</p>
                      <p className="text-muted-foreground">Messages</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="order-1 lg:order-2">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-sm text-orange-500">
                <UsersIcon />
                Accountability
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight">
                Built for working with partners and coaches
              </h2>
              <p className="mb-6 text-muted-foreground">
                Between partner flows, client management, shared context, and
                messaging, the platform supports accountability loops beyond
                one-off workout logs.
              </p>
              <ul className="space-y-3">
                {[
                  'Partner and team-oriented training workflows',
                  'Shared context across workouts and progress',
                  'In-app messaging for accountability touchpoints',
                  'Coach-client visibility on plans and logs',
                  'Structured check-ins supported by history',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-orange-500">
                      <CheckIcon />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Certified Coaches Section */}
      <section className="py-20">
        <div className="container">
          <div
            className={cn(
              'grid gap-12 lg:items-center',
              isMobile ? 'grid-cols-1' : 'lg:grid-cols-2',
            )}
          >
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-500">
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
                    d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
                  />
                </svg>
                Verified Professionals
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight">
                Coach discovery with clear profile context
              </h2>
              <p className="mb-6 text-muted-foreground">
                Members can browse coach profiles, compare specialties, and
                choose support models that fit their goals and schedule.
              </p>
              <ul className="space-y-3">
                {[
                  'Coach profile pages with structured info',
                  'Clear service types and coaching options',
                  'Booking flow integration for sessions',
                  'Client dashboards and coaching workspace',
                  'Program and check-in management tooling',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-500">
                      <CheckIcon />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Coach Credentials Card */}
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center gap-4">
                  <img
                    src={gymWorkoutImg}
                    alt="Coach Sarah"
                    className="h-16 w-16 shrink-0 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">Sarah Mitchell, CSCS</h3>
                      <svg
                        className="h-5 w-5 text-cyan-500"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Strength & Conditioning Coach
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Verified Certifications
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        name: 'NSCA-CSCS',
                        color:
                          'bg-cyan-500/20 text-cyan-500 border-cyan-500/30',
                      },
                      {
                        name: 'USAW-L2',
                        color:
                          'bg-purple-500/20 text-purple-500 border-purple-500/30',
                      },
                      {
                        name: 'FMS',
                        color:
                          'bg-green-500/20 text-green-500 border-green-500/30',
                      },
                    ].map((cert) => (
                      <span
                        key={cert.name}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${cert.color}`}
                      >
                        {cert.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-lg font-bold">8+</p>
                    <p className="text-xs text-muted-foreground">Years exp.</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-lg font-bold">340+</p>
                    <p className="text-xs text-muted-foreground">
                      Members coached
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-lg font-bold">4.9</p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                </div>

                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                      />
                    </svg>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-yellow-600 dark:text-yellow-400">
                        Coach profile clarity.
                      </span>{' '}
                      Profiles surface practical coaching context so members can
                      choose based on fit, not hype.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Coaching Marketplace Section */}
      <section className="border-y border-border/40 bg-muted/30 py-20">
        <div className="container">
          <div
            className={cn(
              'grid gap-12 lg:items-center',
              isMobile ? 'grid-cols-1' : 'lg:grid-cols-2',
            )}
          >
            {/* Coaching Dashboard Preview */}
            <Card className="order-2 border-border/40 bg-card/50 lg:order-1">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Coach Dashboard
                    </p>
                    <p className="text-lg font-bold">Sarah Mitchell, CSCS</p>
                  </div>
                  <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-500">
                    3 Active Clients
                  </span>
                </div>

                {/* Client Card */}
                <div className="mb-4 rounded-lg border border-border/40 bg-background/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
                        MR
                      </div>
                      <div>
                        <p className="font-medium">Mike R.</p>
                        <p className="text-xs text-muted-foreground">
                          Online Coaching • 12 weeks
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-500">
                      Check-in due
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
                    <div className="rounded bg-muted/50 p-2">
                      <p className="text-sm font-bold">+15 lbs</p>
                      <p className="text-xs text-muted-foreground">Squat PR</p>
                    </div>
                    <div className="rounded bg-muted/50 p-2">
                      <p className="text-sm font-bold">92%</p>
                      <p className="text-xs text-muted-foreground">Adherence</p>
                    </div>
                    <div className="rounded bg-muted/50 p-2">
                      <p className="text-sm font-bold">-4 lbs</p>
                      <p className="text-xs text-muted-foreground">
                        Body weight
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button className="flex items-center justify-center gap-2 rounded-lg border border-border/40 bg-background/50 p-3 text-sm transition-colors hover:bg-muted/50">
                    <svg
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                    Create Program
                  </button>
                  <button className="flex items-center justify-center gap-2 rounded-lg border border-border/40 bg-background/50 p-3 text-sm transition-colors hover:bg-muted/50">
                    <svg
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    Message
                  </button>
                </div>

                {/* Payments */}
                <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        This month
                      </span>
                    </div>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      $2,400
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Payments handled automatically by Vara Performance
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="order-1 lg:order-2">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-500">
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
                    d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z"
                  />
                </svg>
                Coaching Marketplace
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight">
                Hire a coach, we handle the rest
              </h2>
              <p className="mb-6 text-muted-foreground">
                Coaching workflows are built directly into Vara: manage clients,
                deliver programming, handle check-ins, and keep communication in
                one place.
              </p>
              <ul className="space-y-3">
                {[
                  'Online coaching and structured client flows',
                  'Coaches see your logs, diet, and metrics',
                  'Custom workout plans designed for you',
                  'Scheduling and recurring check-in support',
                  'Built-in scheduling & check-in system',
                  'Message your coach directly in-app',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-500">
                      <CheckIcon />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex gap-3">
                <Button asChild>
                  <Link to="/coaches">Find a coach</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/coaches/apply">Become a coach</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Progress-First Manifesto */}
      <section className="border-t border-border/40 bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 text-3xl font-bold tracking-tight">
              What you can do today
            </h2>
            <div className="grid gap-4 text-left sm:grid-cols-2">
              {[
                { no: 'Workouts', yes: 'Log sessions and review progress' },
                { no: 'Nutrition', yes: 'Build recipes and track intake' },
                { no: 'Coaching', yes: 'Find coaches and manage check-ins' },
                { no: 'Messaging', yes: 'Chat directly in-app' },
                { no: 'Integrations', yes: 'Connect Strava and sync activity' },
                {
                  no: 'Admin tools',
                  yes: 'Manage content, users, and settings',
                },
              ].map((item, i) => (
                <div key={i} className="rounded-lg border border-border/40 p-4">
                  <p className="mb-1 text-sm text-muted-foreground">
                    {item.no}
                  </p>
                  <p className="font-medium text-primary">{item.yes}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/40 bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <h2 className="mb-3 text-2xl font-bold tracking-tight">
              Ready to use Vara end to end?
            </h2>
            <p className="mb-6 text-muted-foreground">
              Start with training and nutrition, then layer in coaching,
              messaging, and integrations as needed.
            </p>
            <div className="flex gap-4">
              <Button asChild>
                <Link to="/register">Start free trial</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/about">Learn more</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FeaturesPage;
