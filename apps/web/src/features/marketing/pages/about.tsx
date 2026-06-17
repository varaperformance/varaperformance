import { Link } from 'react-router';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import gymWorkoutImg from '@/assets/images/unsplash/gym-workout.jpg';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useSiteStats } from '@/features/profile';

const values = [
  {
    title: 'Members First',
    description:
      "Every feature we build starts with one question: will this help members train better? If not, we don't build it.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    ),
  },
  {
    title: 'Data Privacy',
    description:
      'Your fitness data is yours. We never sell it, and you can export or delete it anytime. Full encryption, always.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    ),
  },
  {
    title: 'Continuous Improvement',
    description:
      'Just like in training, we believe in progressive overload. We ship improvements every week based on your feedback.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    ),
  },
  {
    title: 'Community Driven',
    description:
      'We build in public and listen to our community. Our roadmap is shaped by the members who use Vara Performance every day.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
      />
    ),
  },
];

const milestones = [
  {
    year: '2023',
    title: 'FormaFi Era',
    description:
      'The project began as an answer to the same frustration many lifters had: existing fitness apps felt generic and disconnected from real training. In its earliest chapter, it was internally known as FormaFi.',
  },
  {
    year: '2024',
    title: 'Project On Hold',
    description:
      'Momentum stalled and the original founding group stepped away. For a while, the project looked like it might end before it ever had a real chance to grow.',
  },
  {
    year: '2025',
    title: 'Rebuild and Rebrand',
    description:
      'The project was revived and rebuilt through multiple iterations, including Peak One Performance and Drakkar Fitness. That process shaped the product vision and led to the official name: Vara Performance.',
  },
  {
    year: '2026',
    title: 'Now Building in Public',
    description:
      'Today, Vara Performance is focused on disciplined execution: better tools for athletes, faster iteration, and a community-first roadmap built from real member feedback.',
  },
];

const AboutPage = () => {
  const isMobile = useIsMobile();
  const { workoutsLogged, activeUsers, personalRecords, exercisesAvailable } =
    useSiteStats();

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
              About Vara Performance
            </p>
            <h1 className="mb-6 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards text-4xl font-bold tracking-tight delay-150 duration-700 motion-reduce:animate-none md:text-5xl lg:text-6xl">
              Building the future of{' '}
              <span className="vara-marketing-gradient-text bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                fitness
              </span>
            </h1>
            <p className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards text-lg text-muted-foreground delay-300 duration-700 motion-reduce:animate-none">
              We are builders and members creating the kind of fitness app we
              always wished existed: practical, honest, and built for real
              people with real schedules.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24">
        <div className="container">
          <div
            className={cn(
              'grid items-center gap-12',
              isMobile ? 'grid-cols-1' : 'lg:grid-cols-2',
            )}
          >
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
                Our Mission
              </p>
              <h2 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">
                Help people train with clarity, consistency, and confidence
              </h2>
              <p className="mb-6 text-muted-foreground">
                Fitness should not feel confusing. Our goal is to make training
                easier to understand day to day, so you know what to do next,
                why it matters, and how you are progressing over time.
              </p>
              <p className="mb-6 text-muted-foreground">
                We built Vara Performance because too many apps are either too
                basic or too overwhelming. We focus on useful tools, clear
                feedback, and a product that supports beginners and serious
                athletes alike.
              </p>
              <p className="text-muted-foreground">
                Whether you are starting from scratch, getting back on track, or
                pushing for your next level, we are here to help you stay
                consistent and keep moving forward.
              </p>
            </div>
            <div className="relative">
              <div className="aspect-square overflow-hidden rounded-3xl bg-muted">
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url('${gymWorkoutImg}')`,
                  }}
                />
              </div>
              <div className="absolute -bottom-6 -right-6 rounded-2xl border border-border/50 bg-card p-6 shadow-xl">
                <p className="text-3xl font-bold text-primary">50K+</p>
                <p className="text-sm text-muted-foreground">
                  Members worldwide
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="border-t border-border/50 py-24">
        <div className="container">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
              Our Values
            </p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              What we believe in
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              These principles guide every decision we make, from product
              features to company culture.
            </p>
          </div>

          <div
            className={cn(
              'grid gap-6',
              isMobile ? 'grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4',
            )}
          >
            {values.map((value, index) => (
              <Card
                key={index}
                className="border-border/50 bg-card/50 transition-all hover:border-primary/50 hover:bg-card"
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      {value.icon}
                    </svg>
                  </div>
                  <CardTitle className="text-lg">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{value.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-24">
        <div className="container">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
              Our Journey
            </p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              How we got here
            </h2>
          </div>

          <div className="mx-auto max-w-3xl">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 h-full w-0.5 bg-border md:left-1/2 md:-ml-0.5" />

              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  className={`relative mb-12 last:mb-0 md:flex ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-8 top-6 z-10 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full bg-primary md:left-1/2">
                    <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                  </div>

                  {/* Content */}
                  <div
                    className={`ml-16 md:ml-0 md:w-1/2 ${
                      index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'
                    }`}
                  >
                    <span className="text-sm font-semibold text-primary">
                      {milestone.year}
                    </span>
                    <h3 className="mb-2 text-xl font-bold text-foreground">
                      {milestone.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-t border-border/50 bg-muted/30 py-24">
        <div className="container">
          <div
            className={cn(
              'grid gap-8 text-center',
              isMobile ? 'grid-cols-2' : 'md:grid-cols-4',
            )}
          >
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

      {/* Team CTA */}
      <section className="py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Meet the team behind Vara Performance
            </h2>
            <p className="mb-8 text-muted-foreground">
              We're a diverse group of individuals, engineers, and designers
              passionate about building the best fitness platform in the world.
            </p>
            <Button size="lg" className="h-12 px-8" asChild>
              <Link to="/team">Meet the team</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="pb-24">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-primary-foreground md:px-16">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

            <div className="relative z-10 mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Join our mission
              </h2>
              <p className="mb-8 text-lg opacity-90">
                Whether you're looking to transform your training or join our
                team, we'd love to have you.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-12 px-8"
                  asChild
                >
                  <Link to="/register">Start training</Link>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-12 px-8 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                  asChild
                >
                  <Link to="/careers">View open roles</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
