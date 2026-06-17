import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';

const openRoles = [
  {
    id: 1,
    title: 'Frontend Developer',
    area: 'Engineering',
    commitment: '5-10 hrs/week',
    description:
      'Help build our React/TypeScript web app. Perfect for someone wanting to level up their skills on a real product.',
    skills: ['React', 'TypeScript', 'Tailwind CSS'],
  },
  {
    id: 2,
    title: 'Mobile Developer',
    area: 'Engineering',
    commitment: '5-10 hrs/week',
    description:
      'Build our iOS or Android app from scratch. Great opportunity to own a mobile product end-to-end.',
    skills: ['React Native', 'Swift', 'or Kotlin'],
  },
  {
    id: 3,
    title: 'Backend Developer',
    area: 'Engineering',
    commitment: '5-10 hrs/week',
    description:
      'Work on our NestJS API, database design, and infrastructure. Learn real-world backend patterns.',
    skills: ['Node.js', 'PostgreSQL', 'NestJS'],
  },
  {
    id: 4,
    title: 'UI/UX Designer',
    area: 'Design',
    commitment: '3-5 hrs/week',
    description:
      'Design beautiful, intuitive interfaces for members. Build your portfolio with shipped product work.',
    skills: ['Figma', 'UI Design', 'User Research'],
  },
  {
    id: 5,
    title: 'Content Creator',
    area: 'Marketing',
    commitment: '3-5 hrs/week',
    description:
      'Write blog posts, create social content, and help tell our story. Fitness industry experience a plus.',
    skills: ['Writing', 'Social Media', 'Fitness Knowledge'],
  },
];

const whyJoin = [
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
    title: 'Real experience',
    description:
      'Work on a real product with real users. Build portfolio pieces that actually ship.',
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
    title: 'Great people',
    description:
      'Collaborate with passionate builders who care about doing things right.',
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
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: 'Flexible hours',
    description:
      "Contribute when it works for you. We're all doing this around our day jobs too.",
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
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
        />
      </svg>
    ),
    title: 'Learn & grow',
    description:
      'Mentorship from experienced engineers. Level up your skills in a supportive environment.',
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
          d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
        />
      </svg>
    ),
    title: 'Ground floor',
    description:
      "Be part of something from the beginning. If this takes off, you'll have been there from day one.",
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
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    ),
    title: 'Passion project',
    description:
      "We're building this because we believe in it, not because someone's paying us to.",
  },
];

const values = [
  {
    title: 'Effort over aesthetics',
    description:
      'We celebrate progress and consistency, not appearance. Our platform and culture reflect this.',
  },
  {
    title: 'Data belongs to users',
    description:
      "We're building a product where user data is truly owned by users. Privacy isn't a feature, it's a principle.",
  },
  {
    title: 'Real credentials matter',
    description:
      "We don't take shortcuts. Coaches must be certified, code must be tested, claims must be backed.",
  },
  {
    title: 'Move fast, stay grounded',
    description:
      'We ship quickly but thoughtfully. Speed without direction is just chaos.',
  },
];

const CareersPage = () => {
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
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards items-center gap-2 text-sm font-medium uppercase tracking-wider text-primary delay-75 duration-500 motion-reduce:animate-none">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
              Careers
            </p>
            <h1 className="mb-6 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards text-4xl font-bold tracking-tight delay-150 duration-700 motion-reduce:animate-none md:text-5xl lg:text-6xl">
              Help us build something{' '}
              <span className="vara-marketing-gradient-text bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                different
              </span>
            </h1>
            <p className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards text-lg text-muted-foreground delay-300 duration-700 motion-reduce:animate-none">
              Vara Performance is a side project built by a small team of
              fitness enthusiasts and developers. We're not funded, we're not
              paying salaries (yet), but we're building something we believe in.
            </p>
          </div>
        </div>
      </section>

      {/* Honest Disclaimer */}
      <section className="border-t border-border/50 bg-muted/30 py-12">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-border/50 bg-background p-8">
            <h2 className="mb-4 flex items-center gap-3 text-xl font-bold">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Let's be real
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                We're a bootstrapped startup. Everyone on the team has a day job
                and works on Vara Performance in evenings and weekends. We can't
                offer salaries right now, but here's what we can offer:
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Real product experience you can put on your resume</li>
                <li>Mentorship and code reviews from experienced developers</li>
                <li>A supportive community of builders</li>
                <li>The chance to shape a product from the ground up</li>
                <li>
                  If we ever get funding or revenue, early contributors will be
                  remembered
                </li>
              </ul>
              <p className="text-sm">
                This is perfect for students, career changers, or anyone who
                wants to build cool stuff with cool people outside of work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Company Values */}
      <section className="py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
              Our Values
            </p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              What we believe
            </h2>
          </div>

          <div
            className={cn(
              'grid gap-6',
              isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-4',
            )}
          >
            {values.map((value, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border/50 bg-card p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                  {index + 1}
                </div>
                <h3 className="mb-2 font-bold">{value.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join */}
      <section className="border-t border-border/50 bg-muted/30 py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
              Why Contribute
            </p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              What you'll get out of it
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              No salary, but plenty of reasons to join anyway.
            </p>
          </div>

          <div
            className={cn(
              'grid gap-6',
              isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3',
            )}
          >
            {whyJoin.map((item, index) => (
              <div
                key={index}
                className="flex gap-4 rounded-2xl border border-border/50 bg-background p-6 transition-colors hover:border-primary/30"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {item.icon}
                </div>
                <div>
                  <h3 className="mb-1 font-bold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Roles */}
      <section id="roles" className="scroll-mt-20 py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
              Open Roles
            </p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Ways to contribute
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              We're looking for passionate people who want to build something
              meaningful in their spare time.
            </p>
          </div>

          <div className="mx-auto max-w-4xl space-y-4">
            {openRoles.map((role) => (
              <div
                key={role.id}
                className="group rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-bold transition-colors group-hover:text-primary">
                        {role.title}
                      </h3>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {role.area}
                      </span>
                    </div>
                    <p className="mb-3 text-sm text-muted-foreground">
                      {role.description}
                    </p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {role.skills.map((skill, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {role.commitment}
                      <span className="ml-2 rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                        Volunteer
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" className="shrink-0">
                    I'm interested
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/50 bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
              Want to help in another way?
            </h2>
            <p className="mb-8 text-muted-foreground">
              Maybe you have a skill we haven't listed, or you just want to chat
              about the project. We'd love to hear from you.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild>
                <Link to="mailto:hello@varaperformance.com">Get in touch</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a
                  href="https://github.com/varaperformance"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    className="mr-2 h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Check out our GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CareersPage;
