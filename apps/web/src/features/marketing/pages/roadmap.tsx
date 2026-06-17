import { Link } from 'react-router';
import {
  Map,
  CheckCircle,
  Circle,
  Clock,
  Sparkles,
  MessageSquare,
  ThumbsUp,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';

interface RoadmapItem {
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'planned' | 'considering';
  quarter: string;
  votes?: number;
}

const RoadmapPage = () => {
  const isMobile = useIsMobile();
  const roadmapItems: RoadmapItem[] = [
    // Completed
    {
      title: 'AI Workout Recommendations',
      description:
        'Personalized workout suggestions based on your goals, history, and recovery status.',
      status: 'completed',
      quarter: 'Q4 2025',
    },
    {
      title: 'Apple Watch Integration',
      description:
        'Real-time heart rate, workout sync, and activity data from Apple Watch.',
      status: 'completed',
      quarter: 'Q4 2025',
    },
    {
      title: 'Custom Workout Templates',
      description:
        'Create, save, and share your own workout templates for quick logging.',
      status: 'completed',
      quarter: 'Q3 2025',
    },
    {
      title: 'Social Feed',
      description:
        'Share achievements and connect with friends in the community feed.',
      status: 'completed',
      quarter: 'Q3 2025',
    },
    // In Progress
    {
      title: 'Garmin Integration',
      description:
        'Full sync with Garmin devices including training load and recovery metrics.',
      status: 'in-progress',
      quarter: 'Q1 2026',
    },
    {
      title: 'Advanced Analytics Dashboard',
      description:
        'Deeper insights into training volume, intensity distribution, and progress trends.',
      status: 'in-progress',
      quarter: 'Q1 2026',
    },
    {
      title: 'Video Exercise Demonstrations',
      description:
        'HD video guides for proper form on all exercises in our library.',
      status: 'in-progress',
      quarter: 'Q1 2026',
    },
    // Planned
    {
      title: 'Nutrition Tracking',
      description:
        'Log meals, track macros, and sync with nutrition apps like MyFitnessPal.',
      status: 'planned',
      quarter: 'Q2 2026',
    },
    {
      title: 'Coach Mode',
      description:
        'Tools for coaches to create programs, assign workouts, and track client progress.',
      status: 'planned',
      quarter: 'Q2 2026',
    },
    {
      title: 'Workout Challenges',
      description:
        'Join community challenges and compete with friends on specific goals.',
      status: 'planned',
      quarter: 'Q2 2026',
    },
    {
      title: 'REST API',
      description:
        'Public API for developers to build integrations and custom applications.',
      status: 'planned',
      quarter: 'Q3 2026',
    },
    // Considering
    {
      title: 'Supplement Tracking',
      description:
        'Track supplements, set reminders, and log intake alongside workouts.',
      status: 'considering',
      quarter: 'TBD',
      votes: 847,
    },
    {
      title: 'Sleep Analysis Integration',
      description:
        'Deep sleep data analysis correlated with training performance.',
      status: 'considering',
      quarter: 'TBD',
      votes: 623,
    },
    {
      title: 'Workout Music Integration',
      description:
        'Spotify/Apple Music integration with BPM-matched playlists.',
      status: 'considering',
      quarter: 'TBD',
      votes: 512,
    },
    {
      title: 'VR Workout Mode',
      description:
        'Virtual reality workouts with immersive environments and guided sessions.',
      status: 'considering',
      quarter: 'TBD',
      votes: 389,
    },
  ];

  const getStatusBadge = (status: RoadmapItem['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500">
            Completed
          </span>
        );
      case 'in-progress':
        return (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-500">
            In Progress
          </span>
        );
      case 'planned':
        return (
          <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-500">
            Planned
          </span>
        );
      case 'considering':
        return (
          <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-500">
            Under Consideration
          </span>
        );
    }
  };

  const groupedItems = {
    completed: roadmapItems.filter((item) => item.status === 'completed'),
    'in-progress': roadmapItems.filter((item) => item.status === 'in-progress'),
    planned: roadmapItems.filter((item) => item.status === 'planned'),
    considering: roadmapItems.filter((item) => item.status === 'considering'),
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 py-24">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent" />
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Map className="h-4 w-4" />
              Product Roadmap
            </div>
            <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
              What We're
              <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {' '}
                Building
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              See what's coming next for Vara Performance. Our roadmap is shaped
              by your feedback—vote on features you want to see or suggest new
              ideas.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="shadow-lg shadow-primary/25">
                <Sparkles className="mr-2 h-4 w-4" />
                Suggest a Feature
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/release-notes">View Release Notes</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Legend */}
      <section className="border-b border-border/40 py-6">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-5 w-5 text-blue-500" />
              <span className="text-sm">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-sm">Planned</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-500" />
              <span className="text-sm">Under Consideration</span>
            </div>
          </div>
        </div>
      </section>

      {/* In Progress */}
      <section className="py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 flex items-center gap-3 text-2xl font-bold">
              <Circle className="h-6 w-6 text-blue-500" />
              Currently Building
            </h2>
            <div className="space-y-4">
              {groupedItems['in-progress'].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6"
                >
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <h3 className="font-semibold">{item.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {item.quarter}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Planned */}
      <section className="border-t border-border/40 bg-muted/30 py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 flex items-center gap-3 text-2xl font-bold">
              <Clock className="h-6 w-6 text-orange-500" />
              Coming Soon
            </h2>
            <div className="space-y-4">
              {groupedItems.planned.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border/50 bg-card p-6"
                >
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <h3 className="font-semibold">{item.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {item.quarter}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Under Consideration */}
      <section className="py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 flex items-center gap-3 text-2xl font-bold">
              <MessageSquare className="h-6 w-6 text-purple-500" />
              Under Consideration
            </h2>
            <p className="mb-6 text-muted-foreground">
              These features are being evaluated based on community feedback.
              Vote for the ones you want to see!
            </p>
            <div className="space-y-4">
              {groupedItems.considering.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-6"
                >
                  <button className="flex shrink-0 flex-col items-center rounded-lg border border-border/50 bg-muted/50 px-3 py-2 transition-colors hover:border-primary/50 hover:bg-primary/10">
                    <ThumbsUp className="mb-1 h-4 w-4" />
                    <span className="text-sm font-semibold">{item.votes}</span>
                  </button>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-semibold">{item.title}</h3>
                      {getStatusBadge(item.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recently Completed */}
      <section className="border-t border-border/40 bg-muted/30 py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 flex items-center gap-3 text-2xl font-bold">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Recently Shipped
            </h2>
            <div className={cn('grid gap-4', !isMobile && 'md:grid-cols-2')}>
              {groupedItems.completed.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-green-500/20 bg-card p-6"
                >
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <h3 className="font-semibold">{item.title}</h3>
                    <span className="text-sm text-muted-foreground">
                      {item.quarter}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Button variant="outline" asChild>
                <Link to="/release-notes">
                  View All Updates
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border/50 bg-card p-8 text-center">
            <Sparkles className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h2 className="mb-4 text-2xl font-bold">Have a Feature Idea?</h2>
            <p className="mb-6 text-muted-foreground">
              We love hearing from our users. Submit your feature requests and
              help shape the future of Vara Performance.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button>Submit Feature Request</Button>
              <Button variant="outline" asChild>
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RoadmapPage;
