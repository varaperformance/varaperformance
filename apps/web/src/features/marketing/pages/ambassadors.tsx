import { Button } from '@/components/ui/button';
import { Link } from 'react-router';
import { useAuth } from '@/features/auth';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AmbassadorsPage() {
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/50 py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="vara-marketing-orb-drift absolute -left-40 top-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="vara-marketing-orb-drift-slow absolute -right-40 top-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="vara-marketing-orb-drift-delayed absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.1)_1px,transparent_1px)] bg-size-[4rem_4rem]" />

        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards items-center gap-2 text-sm font-medium uppercase tracking-wider text-primary delay-75 duration-500 motion-reduce:animate-none">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
              Vara Performance Ambassador Program
            </p>
            <h1 className="mb-6 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards text-4xl font-bold tracking-tight delay-150 duration-700 motion-reduce:animate-none md:text-5xl lg:text-6xl">
              Represent Vara. Inspire Community.
            </h1>
            <p className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards text-lg text-muted-foreground delay-300 duration-700 motion-reduce:animate-none">
              Our ambassadors are movers and creators who share practical
              training insights, support the community, and help others level up
              with consistency.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-8" asChild>
                <Link to={isAuthenticated ? '/ambassadors/apply' : '/login'}>
                  {isAuthenticated
                    ? 'Apply to Become an Ambassador'
                    : 'Sign In to Apply'}
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8" asChild>
                <Link to="/team">View Team</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Program Overview */}
      <section className="py-24">
        <div className="container">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
              Program Overview
            </p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Built for real community leaders
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              The ambassador program is designed for people who actively help
              others train better, stay consistent, and share evidence-based
              fitness guidance.
            </p>
          </div>

          <div
            className={cn(
              'grid gap-6',
              isMobile ? 'grid-cols-1' : 'md:grid-cols-3',
            )}
          >
            <Card className="border-border/50 bg-card/50 transition-all hover:border-primary/50 hover:bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Who It Is For</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Coaches, movers, and creators with a genuine interest in
                  helping people train smarter.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 transition-all hover:border-primary/50 hover:bg-card">
              <CardHeader>
                <CardTitle className="text-lg">What We Value</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Real training experience, positive community impact, and
                  high-integrity content over hype.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 transition-all hover:border-primary/50 hover:bg-card">
              <CardHeader>
                <CardTitle className="text-lg">How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Submit an application, our team reviews it, and approved
                  members are added to the ambassador roster.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-border/50 py-24">
        <div className="container">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
              Common Questions
            </p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Before you apply
            </h2>
          </div>

          <div
            className={cn(
              'mx-auto grid max-w-4xl gap-4',
              !isMobile && 'md:grid-cols-2',
            )}
          >
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">
                  Do I need a huge audience?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  No. We care more about quality, consistency, and impact than
                  raw follower count.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">
                  How long does review take?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Most applications are reviewed quickly. You will be notified
                  once the review is complete.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">
                  What should I include?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Share why you want to join, how you help others train, and
                  where your audience engages with your content.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">Can I reapply later?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Yes. If you are not approved initially, you can reapply after
                  strengthening your contribution plan.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Expectations Section */}
      <section className="border-t border-border/50 bg-muted/30 py-24">
        <div className="container">
          <div
            className={cn(
              'grid items-center gap-12',
              !isMobile && 'lg:grid-cols-2',
            )}
          >
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
                What to Expect
              </p>
              <h2 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">
                A program focused on consistency and impact
              </h2>
              <p className="mb-4 text-muted-foreground">
                Ambassadors are expected to share authentic progress, contribute
                practical training advice, and maintain a positive tone in the
                fitness community.
              </p>
              <p className="mb-4 text-muted-foreground">
                We prioritize substance over vanity metrics. If your content
                helps people move better, train smarter, and stay accountable,
                you are in the right place.
              </p>
              <p className="text-muted-foreground">
                Applications are reviewed manually. We consider community fit,
                communication style, and how you plan to contribute.
              </p>
            </div>
            <div className="relative">
              <div className="aspect-square overflow-hidden rounded-3xl border border-border/50 bg-card">
                <div className="grid h-full place-items-center p-8 text-center">
                  <div>
                    <p className="text-5xl font-bold text-primary">3 Steps</p>
                    <p className="mt-3 text-muted-foreground">
                      Apply, Review, Join the Ambassador Team
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 rounded-2xl border border-border/50 bg-card p-6 shadow-xl">
                <p className="text-3xl font-bold text-primary">Fast</p>
                <p className="text-sm text-muted-foreground">Review process</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Ready to Apply?
            </h2>
            <p className="mb-8 text-muted-foreground">
              Tell us why you want to represent Vara and how you will contribute
              to the community.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-8" asChild>
                <Link to={isAuthenticated ? '/ambassadors/apply' : '/login'}>
                  {isAuthenticated
                    ? 'Apply to Become an Ambassador'
                    : 'Sign In to Apply'}
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8" asChild>
                <Link to="/team">Meet the Team</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
