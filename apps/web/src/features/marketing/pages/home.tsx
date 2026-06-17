import { useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  Code2,
  Dumbbell,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroDashboardScreenshot from '@/assets/images/home-hero-dashboard.png';
import avatarWoman1 from '@/assets/images/unsplash/avatar-woman-1.jpg';
import avatarMan1 from '@/assets/images/unsplash/avatar-man-1.jpg';
import avatarWoman2 from '@/assets/images/unsplash/avatar-woman-2.jpg';
import avatarMan2 from '@/assets/images/unsplash/avatar-man-2.jpg';
import avatarWoman3 from '@/assets/images/unsplash/avatar-woman-3.jpg';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useSiteStats } from '@/features/profile';

const features = [
  {
    id: 'tracking',
    label: 'Smart Tracking',
    title: 'Log workouts in seconds',
    description:
      'Intuitive workout logging that learns your patterns. Quick-add recent exercises, auto-fill weights from last session, and track every rep without friction.',
    highlights: [
      'Auto-fill from history',
      'Voice logging',
      'Apple Watch sync',
      'Offline mode',
    ],
    visual: (
      <div className="space-y-3">
        <div className="rounded-lg border border-border/50 bg-card/80 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-medium">Bench Press</span>
            <span className="text-xs text-green-500">+5 lbs from last</span>
          </div>
          <div className="space-y-2">
            {[
              { set: 1, weight: 185, reps: 8, done: true },
              { set: 2, weight: 185, reps: 8, done: true },
              { set: 3, weight: 185, reps: 6, done: true },
              { set: 4, weight: 185, reps: '—', done: false },
            ].map((set) => (
              <div
                key={set.set}
                className={cn(
                  'flex items-center gap-4 rounded-md px-3 py-2 text-sm',
                  set.done ? 'bg-green-500/10' : 'bg-muted/50',
                )}
              >
                <span className="w-8 text-muted-foreground">Set {set.set}</span>
                <span className="w-16">{set.weight} lbs</span>
                <span className="w-12">{set.reps} reps</span>
                {set.done && (
                  <svg
                    className="ml-auto h-4 w-4 text-green-500"
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
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg border border-border/50 bg-card/80 p-3 text-center">
            <p className="text-2xl font-bold">12,450</p>
            <p className="text-xs text-muted-foreground">Volume (lbs)</p>
          </div>
          <div className="flex-1 rounded-lg border border-border/50 bg-card/80 p-3 text-center">
            <p className="text-2xl font-bold">47:32</p>
            <p className="text-xs text-muted-foreground">Duration</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'analytics',
    label: 'Progress Analytics',
    title: 'See your gains, not guesses',
    description:
      "Beautiful charts that actually mean something. Track strength progression, volume trends, and consistency streaks. Export your data anytime—it's yours.",
    highlights: [
      'Strength curves',
      'Volume tracking',
      'Body measurements',
      'Data export',
    ],
    visual: (
      <div className="space-y-3">
        <div className="rounded-lg border border-border/50 bg-card/80 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-medium">Squat Progress</span>
            <span className="text-xs text-muted-foreground">Last 6 months</span>
          </div>
          <div className="flex h-32 items-end gap-2">
            {[45, 55, 52, 65, 70, 68, 75, 82, 78, 85, 90, 95].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-linear-to-t from-primary to-primary/60"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Aug</span>
            <span>Sep</span>
            <span>Oct</span>
            <span>Nov</span>
            <span>Dec</span>
            <span>Jan</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-center">
            <p className="text-lg font-bold text-green-500">+45 lbs</p>
            <p className="text-xs text-muted-foreground">6 month gain</p>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-center">
            <p className="text-lg font-bold text-blue-500">315 lbs</p>
            <p className="text-xs text-muted-foreground">Current 1RM</p>
          </div>
          <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 text-center">
            <p className="text-lg font-bold text-purple-500">12</p>
            <p className="text-xs text-muted-foreground">PRs this year</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'community',
    label: 'Gym Partners',
    title: 'Real connections, not followers',
    description:
      'Find people who train at your gym. Sync schedules, share workouts, and build accountability with real training partners.',
    highlights: [
      'Location matching',
      'Schedule sync',
      'Workout sharing',
      'Gym partner counts',
    ],
    visual: (
      <div className="space-y-3">
        <div className="rounded-lg border border-border/50 bg-card/80 p-4">
          <p className="mb-3 text-sm font-medium">
            Training at Gold's Gym Downtown
          </p>
          <div className="space-y-3">
            {[
              {
                name: 'Mike R.',
                status: 'Training now',
                exercise: 'Pull day',
                initials: 'MR',
                color: '#2196F3',
              },
              {
                name: 'Sarah K.',
                status: 'Starting in 30m',
                exercise: 'Legs',
                initials: 'SK',
                color: '#E91E63',
              },
              {
                name: 'James T.',
                status: 'Done for today',
                exercise: 'Push day',
                initials: 'JT',
                color: '#FF9800',
              },
            ].map((partner) => (
              <div key={partner.name} className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: partner.color }}
                >
                  {partner.initials}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{partner.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {partner.exercise}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2 py-1 text-xs',
                    partner.status === 'Training now'
                      ? 'bg-green-500/20 text-green-500'
                      : partner.status === 'Starting in 30m'
                        ? 'bg-yellow-500/20 text-yellow-500'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {partner.status}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
          <div className="flex items-center gap-2">
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
                d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
              />
            </svg>
            <span className="text-sm font-medium text-orange-500">
              You're on a 23-day streak with Mike!
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'customization',
    label: 'Your Style',
    title: 'Make your profile yours',
    description:
      'Remember when the internet was fun? Custom themes, colors, and layouts. Pin your favorite lifts, show off your PRs, and express yourself—not just your metrics.',
    highlights: [
      'Custom themes',
      'Widget layouts',
      'Profile badges',
      'Markdown bio',
    ],
    visual: (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-lg border border-border/50">
          <div className="h-16 bg-linear-to-r from-purple-600 via-pink-500 to-orange-400" />
          <div className="relative bg-card/80 p-4">
            <div className="absolute -top-8 left-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-background bg-indigo-500 text-lg font-bold text-white">
                AJ
              </div>
            </div>
            <div className="ml-20">
              <p className="font-bold">@lifting_legend</p>
              <p className="text-xs text-muted-foreground">
                Training since 2019 • Push/Pull/Legs
              </p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded bg-purple-500/10 p-2 text-center">
                <p className="text-lg font-bold text-purple-500">847</p>
                <p className="text-xs text-muted-foreground">Workouts</p>
              </div>
              <div className="rounded bg-pink-500/10 p-2 text-center">
                <p className="text-lg font-bold text-pink-500">52</p>
                <p className="text-xs text-muted-foreground">PRs</p>
              </div>
              <div className="rounded bg-orange-500/10 p-2 text-center">
                <p className="text-lg font-bold text-orange-500">156</p>
                <p className="text-xs text-muted-foreground">Streak</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Themes:</span>
          {[
            '#8b5cf6',
            '#ec4899',
            '#f97316',
            '#22c55e',
            '#3b82f6',
            '#ef4444',
          ].map((color) => (
            <button
              key={color}
              className="h-5 w-5 rounded-full ring-offset-2 ring-offset-background transition-all hover:scale-110 first:ring-2 first:ring-primary"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    ),
  },
];

const HERO_DASHBOARD_ALT =
  'Screenshot of the Vara Performance app dashboard with training overview, metrics, and health tracking.';

/** Real product screenshot in a light browser-style frame (live stats stay in the left column). */
function MarketingHeroDashboardFrame({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-[inherit] bg-background text-left',
        className,
      )}
    >
      <div
        className="flex shrink-0 items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-2 sm:px-4"
        aria-hidden
      >
        <span className="flex gap-1.5">
          <span className="size-2 rounded-full bg-[hsl(0_62%_52%)]/90" />
          <span className="size-2 rounded-full bg-[hsl(48_96%_53%)]/85" />
          <span className="size-2 rounded-full bg-[hsl(142_45%_42%)]/85" />
        </span>
        <span className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs">
          app.varaperformance.com
        </span>
        <span className="ml-auto shrink-0 rounded-md border border-border/55 bg-background/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Live product
        </span>
      </div>
      <div className="relative flex min-h-0 flex-1 items-start justify-center bg-muted/30">
        <img
          src={heroDashboardScreenshot}
          alt={HERO_DASHBOARD_ALT}
          className="h-full w-full max-w-full object-contain object-top"
          loading="lazy"
          decoding="async"
          sizes="(max-width: 1024px) 96vw, 560px"
        />
      </div>
    </div>
  );
}

const HomePage = () => {
  const isMobile = useIsMobile();
  const { workoutsLogged, activeUsers, personalRecords, exercisesAvailable } =
    useSiteStats();

  const [activeFeature, setActiveFeature] = useState(features[0].id);
  return (
    <div className="flex flex-col">
      <div className="border-b border-primary/15 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-500 motion-reduce:animate-none">
        <div className="container flex flex-col items-start justify-between gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-4">
          <p className="text-sm text-foreground/80">
            <span className="font-semibold text-primary">Alpha Release</span>{' '}
            Sign up and start training, no invite code needed.{' '}
            <span className="text-muted-foreground">
              Data may be reset or lost during this phase.
            </span>
          </p>
          <a
            href="https://discord.gg/MGrfchn2kh"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            Join Discord
          </a>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden py-12 sm:py-16 lg:py-10">
        <div className="container relative z-10">
          <div
            className={cn(
              'grid items-center gap-14 lg:gap-16',
              isMobile
                ? 'grid-cols-1'
                : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]',
            )}
          >
            {/* Left Content */}
            <div className="mx-auto w-full max-w-2xl lg:mx-0">
              <div className="mb-5 inline-flex animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards duration-500 delay-75 motion-reduce:animate-none items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary shadow-sm shadow-primary/10 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:animate-none"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                </span>
                Alpha — open signup, no invite code
              </div>

              <ul
                className="mb-8 flex animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards flex-wrap gap-2 duration-500 delay-100 motion-reduce:animate-none"
                aria-label="Product highlights"
              >
                <li className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
                  <Dumbbell className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Logs &amp; PRs in seconds
                </li>
                <li className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
                  <Users className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Gym partners, not followers
                </li>
                <li className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
                  SOC II · HIPAA · GDPR
                </li>
                <li className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
                  <Code2 className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Open Source · AGPL v3
                </li>
              </ul>

              <h1 className="mb-6 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards text-balance duration-700 delay-150 motion-reduce:animate-none">
                <span className="block text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-[3.35rem]">
                  Your workouts,
                </span>
                <span className="vara-marketing-gradient-text mt-1 block bg-linear-to-r from-primary via-primary to-primary/50 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl lg:text-6xl xl:text-[3.35rem]">
                  your proof.
                </span>
              </h1>

              <p className="mb-8 max-w-lg animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards text-pretty text-lg leading-relaxed text-muted-foreground duration-700 delay-200 motion-reduce:animate-none">
                A fully featured open-source fitness platform and social network.
                Log workouts, track nutrition, and train with real people at your
                gym — all with SOC II, HIPAA, and GDPR-grade privacy built in,
                not bolted on.
              </p>

              <div className="mb-10 grid animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards grid-cols-2 gap-3 duration-700 delay-250 motion-reduce:animate-none sm:grid-cols-4">
                {(
                  [
                    ['Workouts logged', workoutsLogged],
                    ['Active lifters', activeUsers],
                    ['PRs tracked', personalRecords],
                    ['Moves in the library', exercisesAvailable],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border/60 bg-linear-to-br from-card/90 to-muted/25 px-3 py-3 shadow-sm backdrop-blur-sm sm:px-4 sm:py-3.5"
                  >
                    <p className="text-lg font-bold tabular-nums tracking-tight text-foreground sm:text-xl">
                      {value}
                    </p>
                    <p className="text-[11px] font-medium leading-snug text-muted-foreground sm:text-xs">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards flex-col gap-3 duration-700 delay-300 motion-reduce:animate-none sm:flex-row sm:flex-wrap sm:gap-4">
                <Button
                  size="lg"
                  className="vara-marketing-cta-glow group h-12 w-full px-8 shadow-lg shadow-primary/25 motion-reduce:animate-none sm:w-auto"
                  asChild
                >
                  <Link to="/register" className="gap-2">
                    Start for free
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full border-border/70 bg-background/40 px-8 backdrop-blur-sm transition-colors hover:bg-muted/60 sm:w-auto"
                  asChild
                >
                  <Link to="/features" className="gap-2">
                    Explore the product
                    <ArrowRight className="h-4 w-4 opacity-70" />
                  </Link>
                </Button>
              </div>

              {/* Social proof */}
              <div className="mt-10 flex animate-in fade-in zoom-in-95 fill-mode-backwards flex-col gap-4 duration-700 delay-400 motion-reduce:animate-none sm:mt-11 sm:flex-row sm:items-center sm:gap-6">
                <div className="flex -space-x-2 sm:-space-x-3">
                  {[
                    avatarWoman1,
                    avatarMan1,
                    avatarWoman2,
                    avatarMan2,
                    avatarWoman3,
                  ].map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-9 w-9 shrink-0 animate-in fade-in zoom-in-50 rounded-full border-2 border-background object-cover ring-2 ring-background/80 duration-500 motion-reduce:animate-none sm:h-10 sm:w-10"
                      style={{
                        animationDelay: `${450 + i * 55}ms`,
                        animationFillMode: 'backwards',
                      }}
                    />
                  ))}
                </div>
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-foreground">
                    Early lifters are already logging
                  </p>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse motion-reduce:animate-none"
                      aria-hidden
                    />
                    <span>No credit card to start</span>
                  </div>
                </div>
              </div>

              {/* Mobile — real dashboard screenshot (stats stay in the column above) */}
              <div className="mt-10 animate-in fade-in slide-in-from-bottom-6 fill-mode-backwards duration-700 delay-500 motion-reduce:animate-none lg:hidden">
                <div className="rounded-2xl border border-primary/25 bg-linear-to-br from-primary/15 via-transparent to-muted/25 p-px shadow-2xl shadow-primary/20">
                  <div className="aspect-video max-h-[min(52vh,420px)] min-h-[220px] w-full overflow-hidden rounded-[0.95rem] border border-border/50 shadow-xl">
                    <MarketingHeroDashboardFrame className="h-full rounded-[0.95rem]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right — dashboard screenshot (fits full frame; letterboxing uses muted bg) */}
            <div className="relative hidden animate-in fade-in zoom-in-95 fill-mode-backwards duration-1000 delay-150 motion-reduce:animate-none lg:block">
              <div className="relative isolate aspect-video max-h-[min(68vh,620px)] w-full">
                <div className="vara-marketing-orb-drift-slow pointer-events-none absolute -right-12 -top-12 h-72 w-72 rounded-full bg-primary/10 blur-3xl motion-reduce:opacity-90" />
                <div className="vara-marketing-orb-drift pointer-events-none absolute -bottom-12 -left-12 h-72 w-72 rounded-full bg-primary/8 blur-3xl motion-reduce:opacity-90" />

                <div className="absolute inset-0 rounded-[1.25rem] bg-linear-to-br from-primary/40 via-primary/12 to-transparent p-px shadow-2xl shadow-primary/25">
                  <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.2rem] border border-border/50 bg-muted/20 shadow-inner">
                    <MarketingHeroDashboardFrame className="h-full min-h-0 rounded-[1.2rem]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0">
          {/* Animated orbs */}
          <div className="vara-marketing-orb-drift absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="vara-marketing-orb-drift-slow absolute -right-40 top-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="vara-marketing-orb-drift-delayed absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />

          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.05)_1px,transparent_1px)] bg-size-[4rem_4rem]" />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-radial-[ellipse_at_50%_0%] from-transparent via-transparent to-background/70" />
        </div>
      </section>

      {/* Features Section - Interactive Tabs */}
      <section className="relative overflow-hidden border-t border-border/50 py-24">
        {/* Decorative orb */}
        <div className="pointer-events-none absolute -right-48 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />

        <div className="container relative">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
              Features
            </p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Built for every body and every goal
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Everything you need to start, stay consistent, and keep improving.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-12 flex flex-wrap justify-center gap-2">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(feature.id)}
                className={cn(
                  'rounded-full px-4 py-2.5 text-sm font-medium transition-all sm:px-5',
                  activeFeature === feature.id
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {feature.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {features.map((feature) => (
            <div
              key={feature.id}
              className={cn(
                'grid items-center gap-12',
                isMobile ? 'grid-cols-1' : 'lg:grid-cols-2',
                activeFeature === feature.id ? 'grid' : 'hidden',
              )}
            >
              {/* Left - Details */}
              <div className="max-w-xl">
                <h3 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
                  {feature.title}
                </h3>
                <p className="mb-6 text-lg text-muted-foreground">
                  {feature.description}
                </p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {feature.highlights.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <svg
                        className="h-4 w-4 shrink-0 text-primary"
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
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right - Interactive Visual */}
              <div className="relative w-full">
                <div className="absolute -inset-4 rounded-3xl bg-linear-to-br from-primary/10 via-transparent to-primary/5 blur-2xl" />
                <div className="relative rounded-2xl border border-border/50 bg-background/80 p-6 backdrop-blur-sm">
                  {feature.visual}
                </div>
              </div>
            </div>
          ))}

          {/* Single CTA below tabs */}
          <div className="mt-12 text-center">
            <Button variant="outline" asChild>
              <Link to="/features">Explore all features</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Vara Performance Section */}
      <section className="border-t border-border/50 py-24">
        <div className="container">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
              Why Vara Performance
            </p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Built different, on purpose
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              We're not another fitness app trying to maximize your screen time.
              Here's what sets us apart.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: (
                  <svg
                    className="h-6 w-6"
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
                ),
                title: 'Certified coaches only',
                description:
                  'Every coach is verified with real credentials (NSCA, ACSM, NASM). No self-proclaimed gurus.',
                color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
              },
              {
                icon: (
                  <svg
                    className="h-6 w-6"
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
                ),
                title: 'Your data stays yours',
                description:
                  'Full data ownership, export anytime, no selling to third parties. GDPR compliant with real deletion.',
                color: 'bg-green-500/10 text-green-500 border-green-500/30',
              },
              {
                icon: (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                    />
                  </svg>
                ),
                title: 'Real gym partners',
                description:
                  'Find people at your gym. Build accountability through real training relationships, not parasocial ones.',
                color: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
              },
              {
                icon: (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                    />
                  </svg>
                ),
                title: 'Momentum algorithm (optional)',
                description:
                  'Turn on Momentum to surface logged workouts and PRs first. Or keep it chronological. Your call.',
                color: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
              },
              {
                icon: (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
                    />
                  </svg>
                ),
                title: 'Actually customizable',
                description:
                  'Custom themes, colors, and widget layouts. Remember when the internet was fun? We do.',
                color: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
              },
              {
                icon: (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                ),
                title: 'Partners, not followers',
                description:
                  'Gym partner counts replace follower counts. What matters is who you actually train with.',
                color: 'bg-red-500/10 text-red-500 border-red-500/30',
              },
            ].map((item, i) => (
              <div key={i} className={`rounded-2xl border p-6 ${item.color}`}>
                <div className="mb-4">{item.icon}</div>
                <h3 className="mb-2 font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="border-t border-border/50 bg-muted/30 py-24">
        <div className="container">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
              Testimonials
            </p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Members who get it
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                quote:
                  "Finally, a fitness app that doesn't try to turn me into a content creator. I just want to track my workouts and find a partner.",
                name: 'Marcus T.',
                role: 'Member, 3 years on Vara Performance',
                img: avatarMan1,
              },
              {
                quote:
                  'The certified coach matching is incredible. My coach actually has credentials, not just a six-pack and a ring light.',
                name: 'Jennifer K.',
                role: 'CrossFit member, certified coach',
                img: avatarWoman2,
              },
              {
                quote:
                  "I exported 2 years of data when I switched from another app. Vara Performance imported everything. That's when I knew they meant it about data ownership.",
                name: 'David R.',
                role: 'Bodybuilder, data engineer',
                img: avatarMan2,
              },
            ].map((testimonial, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/50 bg-background p-6"
              >
                <div className="mb-4 flex text-yellow-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className="h-4 w-4 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="mb-6 text-muted-foreground">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.img}
                    alt={testimonial.name}
                    loading="lazy"
                    decoding="async"
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-t border-border/50 py-24">
        <div className="container">
          <div className="grid gap-8 text-center md:grid-cols-4">
            {[
              { value: activeUsers, label: 'Active users' },
              { value: workoutsLogged, label: 'Workouts logged' },
              { value: personalRecords, label: 'Personal records' },
              { value: exercisesAvailable, label: 'Exercises available' },
            ].map((stat, index) => (
              <div key={index}>
                <p className="text-4xl font-bold text-foreground md:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-primary-foreground md:px-16">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

            <div className="relative z-10 mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Ready to level up?
              </h2>
              <p className="mb-8 text-lg opacity-90">
                Join thousands of members already using Vara Performance to
                reach their goals at their own pace. Start your free trial
                today.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-12 px-8"
                  asChild
                >
                  <Link to="/register">Get started free</Link>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-12 px-8 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                  asChild
                >
                  <Link to="/contact">Talk to sales</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
