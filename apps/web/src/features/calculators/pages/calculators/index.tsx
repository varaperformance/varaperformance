import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Search, CheckCircle, Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const calculatorCategories = [
  {
    title: 'Body Composition',
    description: 'Measure and track your body metrics',
    accentFrom: '#7c3aed',
    accentTo: '#22d3ee',
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
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        />
      </svg>
    ),
    calculators: [
      {
        to: '/calculators/bmi',
        name: 'BMI Calculator',
        description:
          'Calculate your Body Mass Index and see what category you fall into',
      },
      {
        to: '/calculators/body-fat',
        name: 'Body Fat %',
        description: 'Estimate body fat percentage using the US Navy method',
      },
      {
        to: '/calculators/ffmi',
        name: 'FFMI Calculator',
        description: 'Fat-Free Mass Index to assess muscular development',
      },
      {
        to: '/calculators/lean-mass',
        name: 'Lean Body Mass',
        description: 'Calculate your lean body mass from body fat percentage',
      },
      {
        to: '/calculators/waist-hip',
        name: 'Waist-to-Hip Ratio',
        description: 'Health risk indicator based on body shape',
      },
    ],
  },
  {
    title: 'Caloric Needs',
    description: 'Calculate your daily energy requirements',
    accentFrom: '#f97316',
    accentTo: '#22c55e',
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
          d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z"
        />
      </svg>
    ),
    calculators: [
      {
        to: '/calculators/bmr',
        name: 'BMR Calculator',
        description: 'Basal Metabolic Rate - calories burned at rest',
      },
      {
        to: '/calculators/tdee',
        name: 'TDEE Calculator',
        description: 'Total Daily Energy Expenditure based on activity level',
      },
      {
        to: '/calculators/calorie-goal',
        name: 'Calorie Goal',
        description: 'Calculate daily calories for weight loss or gain',
      },
      {
        to: '/calculators/weight-goal',
        name: 'Weight Goal Timeline',
        description: 'Calculate how long to reach your target weight',
      },
    ],
  },
  {
    title: 'Strength & Training',
    description: 'Powerlifting and strength metrics',
    accentFrom: '#22d3ee',
    accentTo: '#f43f5e',
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
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </svg>
    ),
    calculators: [
      {
        to: '/calculators/one-rm',
        name: '1RM Calculator',
        description: 'Estimate your one-rep max from a submaximal lift',
      },
      {
        to: '/calculators/wilks',
        name: 'Wilks Score',
        description: 'Compare powerlifting totals across weight classes',
      },
      {
        to: '/calculators/dots',
        name: 'DOTS Score',
        description: 'Modern alternative to Wilks coefficient',
      },
      {
        to: '/calculators/volume-load',
        name: 'Volume Load',
        description: 'Calculate total training volume (sets × reps × weight)',
      },
      {
        to: '/calculators/inol',
        name: 'INOL Calculator',
        description: 'Intensity Number of Lifts for training stress',
      },
    ],
  },
  {
    title: 'Cardiovascular',
    description: 'Heart rate and cardio fitness metrics',
    accentFrom: '#0ea5e9',
    accentTo: '#a855f7',
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
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    ),
    calculators: [
      {
        to: '/calculators/max-hr',
        name: 'Max Heart Rate',
        description: 'Calculate your maximum heart rate by age',
      },
      {
        to: '/calculators/hr-zones',
        name: 'Heart Rate Zones',
        description: 'Training zones for optimal cardio workouts',
      },
      {
        to: '/calculators/vo2-max',
        name: 'VO2 Max Estimator',
        description: 'Estimate your cardiovascular fitness level',
      },
      {
        to: '/calculators/pace',
        name: 'Running Pace',
        description: 'Calculate pace and speed from distance and time',
      },
      {
        to: '/calculators/met',
        name: 'MET Calories',
        description: 'Calculate calories burned by activity type',
      },
    ],
  },
  {
    title: 'Nutrition & Macros',
    description: 'Diet and macronutrient planning',
    accentFrom: '#10b981',
    accentTo: '#f59e0b',
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
          d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z"
        />
      </svg>
    ),
    calculators: [
      {
        to: '/calculators/macros',
        name: 'Macro Calculator',
        description: 'Calculate protein, carbs, and fat targets',
      },
      {
        to: '/calculators/protein',
        name: 'Protein Needs',
        description: 'Daily protein recommendation based on goals',
      },
      {
        to: '/calculators/water',
        name: 'Water Intake',
        description: 'Daily hydration needs based on activity',
      },
    ],
  },
];

const calculatorMeta: Record<string, string[]> = {
  '/calculators/bmi': ['BMI score', 'WHO categories', 'Metric & imperial'],
  '/calculators/body-fat': [
    'US Navy formula',
    'Body fat %',
    'Waist/neck inputs',
  ],
  '/calculators/ffmi': ['Adjusted FFMI', 'Kg/lb friendly', 'Body fat aware'],
  '/calculators/lean-mass': [
    'Lean mass output',
    'Uses body fat %',
    'Unit flexible',
  ],
  '/calculators/waist-hip': [
    'Risk bands',
    'Waist/hip ratio',
    'Sex-specific ranges',
  ],
  '/calculators/bmr': ['Mifflin-St Jeor', 'Basal calories', 'Unit flexible'],
  '/calculators/tdee': ['Activity factors', 'Daily calories', 'Preset levels'],
  '/calculators/calorie-goal': [
    'Cut/gain targets',
    'Weekly delta',
    'Unit flexible',
  ],
  '/calculators/weight-goal': [
    'Timeline estimate',
    'Rate of change',
    'Goal weight',
  ],
  '/calculators/one-rm': ['Epley/Brzycki', '1RM estimate', 'Load table'],
  '/calculators/wilks': ['Wilks score', 'Sex-adjusted', 'Kg/lb inputs'],
  '/calculators/dots': ['DOTS score', 'Powerlifting', 'Weight-class aware'],
  '/calculators/volume-load': [
    'Sets × reps × load',
    'Session total',
    'Unit flexible',
  ],
  '/calculators/inol': ['INOL score', 'Fatigue gauge', 'Per set calc'],
  '/calculators/max-hr': ['220 - age', 'Max HR', 'Simple input'],
  '/calculators/hr-zones': ['Zone 1-5', '% max HR', 'Training guidance'],
  '/calculators/vo2-max': ['VO2 estimate', 'Field test', 'Speed/pace aware'],
  '/calculators/pace': ['Pace & speed', 'Distance/time pairs', 'Splits ready'],
  '/calculators/met': [
    'MET × duration',
    'Calories by activity',
    'Weight aware',
  ],
  '/calculators/macros': [
    'Protein/carb/fat',
    'Calorie target',
    'Unit flexible',
  ],
  '/calculators/protein': ['Protein per kg/lb', 'Goal-based', 'Range output'],
  '/calculators/water': [
    'Hydration target',
    'Weight & activity',
    'Daily total',
  ],
};

const defaultMeta = ['Metric & imperial', 'Shows ranges', 'Instant output'];

const CalculatorsIndexPage = () => {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('All');

  const tags = useMemo(
    () => ['All', ...calculatorCategories.map((c) => c.title)],
    [],
  );

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return calculatorCategories
      .map((category) => {
        const calculators = category.calculators.filter((calc) => {
          const text = `${calc.name} ${calc.description}`.toLowerCase();
          const matchesQuery =
            normalizedQuery === '' || text.includes(normalizedQuery);
          const matchesTag =
            activeTag === 'All' || activeTag === category.title;
          return matchesQuery && matchesTag;
        });
        return { ...category, calculators };
      })
      .filter((category) => category.calculators.length > 0);
  }, [activeTag, query]);

  const isMobile = useIsMobile();
  const totalCalculators = calculatorCategories.reduce(
    (sum, category) => sum + category.calculators.length,
    0,
  );

  return (
    <div className="container space-y-6 py-6">
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-cyan-500/10" />
        <div className="relative space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Calculator Hub
          </div>
          <div
            className={cn(
              'grid gap-4',
              !isMobile && 'lg:grid-cols-[1.25fr,0.75fr]',
            )}
          >
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Fitness calculators that are actually usable
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Quickly move from a question to a number, then into action.
                Every calculator is public, unit-flexible, and built for
                day-to-day training decisions.
              </p>
            </div>
            <div
              className={cn(
                'grid gap-3 text-sm',
                isMobile ? 'grid-cols-1' : 'grid-cols-2',
              )}
            >
              <Card className="border-muted/70 bg-background/80">
                <CardContent className="p-4">
                  <p className="text-muted-foreground">Tools</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {totalCalculators}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-muted/70 bg-background/80">
                <CardContent className="p-4">
                  <p className="text-muted-foreground">Categories</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {calculatorCategories.length}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4" id="calculators">
        <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTag === tag
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-border/70 bg-background hover:border-primary/35'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search calculators"
              className="rounded-full pl-9"
            />
          </div>
        </div>

        {filteredCategories.length === 0 && (
          <Card className="border-muted/70">
            <CardContent className="py-10 text-center text-muted-foreground">
              No calculators found for that search.
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {filteredCategories.map((category) => (
            <Card key={category.title} className="border-muted/70">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-primary"
                    style={{
                      background: `linear-gradient(135deg, ${category.accentFrom}1f, ${category.accentTo}29)`,
                    }}
                  >
                    {category.icon}
                  </span>
                  {category.title}
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    'grid gap-3',
                    isMobile ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3',
                  )}
                >
                  {category.calculators.map((calc) => {
                    const features = calculatorMeta[calc.to] ?? defaultMeta;
                    return (
                      <Link key={calc.to} to={calc.to} className="group">
                        <Card className="h-full border-border/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-start justify-between gap-3 text-base leading-tight">
                              {calc.name}
                              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <CardDescription>
                              {calc.description}
                            </CardDescription>
                            <div className="flex flex-wrap gap-1.5">
                              {features.slice(0, 2).map((feature) => (
                                <span
                                  key={feature}
                                  className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-1 text-xs text-muted-foreground"
                                >
                                  <CheckCircle className="h-3.5 w-3.5 text-primary" />
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CalculatorsIndexPage;
