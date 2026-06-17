import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router';

const TwitterIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const GitHubIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 .297a12 12 0 00-3.79 23.39c.6.111.82-.258.82-.577v-2.235c-3.338.724-4.042-1.611-4.042-1.611-.546-1.387-1.334-1.757-1.334-1.757-1.09-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.419-1.305.762-1.605-2.665-.303-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.323 3.3 1.23a11.5 11.5 0 016.001 0c2.291-1.553 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.625-5.48 5.921.43.371.823 1.103.823 2.222v3.293c0 .322.216.694.825.576A12 12 0 0012 .297" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M22.675 0h-21.35C.593 0 0 .593 0 1.326v21.348C0 23.407.593 24 1.326 24H12.82V14.708H9.692v-3.622h3.128V8.413c0-3.1 1.894-4.788 4.659-4.788 1.325 0 2.464.099 2.796.143v3.24h-1.919c-1.505 0-1.796.716-1.796 1.765v2.313h3.587l-.467 3.622H16.56V24h6.115C23.407 24 24 23.407 24 22.674V1.326C24 .593 23.407 0 22.675 0z" />
  </svg>
);

const ThreadsIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M15.28 10.52c-.08-.04-.15-.07-.23-.1-.14-2.38-1.57-3.73-3.95-3.73-2.52 0-4.18 1.62-4.18 4.03 0 2.12 1.34 3.63 3.35 3.77.97.06 1.85-.22 2.58-.83.37-.31.67-.69.89-1.14.2-.39.32-.83.38-1.3.37.14.71.34.98.61.48.49.72 1.19.64 1.87-.08.72-.5 1.35-1.12 1.74-.62.39-1.42.53-2.22.44-2.22-.24-3.6-1.82-3.6-4.11 0-2.53 1.76-4.31 4.27-4.31 2.45 0 4.08 1.35 4.34 3.61.04.3.06.61.06.95 0 .19-.01.37-.02.55-.03.59-.16 1.13-.39 1.63-.28.61-.69 1.12-1.21 1.51-.95.72-2.22 1.07-3.63.93-3.01-.3-4.99-2.52-4.99-5.59 0-3.42 2.42-5.8 5.87-5.8 3.17 0 5.31 1.77 5.71 4.73.57.2 1.08.51 1.5.95.95.99 1.41 2.4 1.24 3.81-.17 1.4-.96 2.63-2.17 3.39-1.05.66-2.36.95-3.74.95-4.18 0-7.03-2.86-7.03-7.1C4.5 5.31 7.64 2.5 12.02 2.5c4.09 0 6.9 2.44 7.34 6.38.02.2.03.4.04.61.95.37 1.79.95 2.44 1.73.99 1.19 1.41 2.79 1.16 4.35-.26 1.62-1.16 3.02-2.51 3.98-1.4.99-3.18 1.52-5.1 1.52-5.16 0-8.67-3.46-8.67-8.61 0-4.92 3.54-8.3 8.74-8.3 4.89 0 8.24 2.99 8.79 7.78.06.54.08 1.1.06 1.69l-1.77-.04c.01-.49 0-.95-.05-1.39-.44-3.96-3.07-6.31-7.04-6.31-4.15 0-6.96 2.63-6.96 6.54 0 4.09 2.72 6.83 6.9 6.83 1.56 0 2.98-.42 4.06-1.2.95-.68 1.58-1.66 1.76-2.76.18-1.1-.12-2.18-.83-3.03-.42-.49-.95-.86-1.56-1.11-.09.48-.24.93-.44 1.34-.31.63-.74 1.16-1.29 1.58-.99.76-2.35 1.14-3.92 1.02-2.91-.22-4.86-2.31-4.86-5.2 0-3.02 2.08-5.04 5.2-5.04 2.89 0 4.84 1.69 5.08 4.41z" />
  </svg>
);

interface TeamMember {
  id: string;
  role: 'CORE' | 'AMBASSADOR';
  title: string;
  bio: string | null;
  photoUrl: string | null;
  sortOrder: number;
  user: {
    email: string;
    profile: {
      displayName: string | null;
      avatarUrl: string | null;
      socials: Record<string, string> | null;
    } | null;
  };
}

interface TeamResponse {
  success: boolean;
  data: { core: TeamMember[]; ambassadors: TeamMember[] };
}

function SocialLinks({
  socials,
  className,
}: {
  socials: Record<string, string | null> | null | undefined;
  className?: string;
}) {
  if (!socials) return null;

  const icons: Record<string, React.ReactNode> = {
    twitter: <TwitterIcon />,
    x: <TwitterIcon />,
    instagram: <InstagramIcon />,
    facebook: <FacebookIcon />,
    threads: <ThreadsIcon />,
    linkedin: <LinkedInIcon />,
    github: <GitHubIcon />,
  };

  const platformOrder = [
    'x',
    'instagram',
    'facebook',
    'threads',
    'linkedin',
    'github',
  ] as const;

  const normalizeSocialUrl = (platform: string, rawUrl: string) => {
    const value = rawUrl.trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;

    const handle = value.replace(/^@/, '');
    if (!handle) return null;

    switch (platform) {
      case 'twitter':
      case 'x':
        return `https://x.com/${handle}`;
      case 'instagram':
        return `https://instagram.com/${handle}`;
      case 'facebook':
        return `https://facebook.com/${handle}`;
      case 'threads': {
        const threadsHandle = handle.startsWith('@') ? handle : `@${handle}`;
        return `https://threads.net/${threadsHandle}`;
      }
      case 'linkedin':
        return `https://linkedin.com/in/${handle}`;
      case 'github':
        return `https://github.com/${handle}`;
      default:
        return null;
    }
  };

  // Only render explicitly supported public social fields.
  const entries = platformOrder.flatMap((platform) => {
    const direct = socials[platform] ?? null;
    const alias = platform === 'x' ? (socials.twitter ?? null) : null;
    const raw = direct || alias;
    if (!raw) return [];

    const href = normalizeSocialUrl(platform, raw);
    if (!href) return [];

    return [{ platform, href }];
  });

  if (entries.length === 0) return null;
  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      {entries.map(({ platform, href }) => (
        <a
          key={platform}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {icons[platform]}
        </a>
      ))}
    </div>
  );
}

const TeamPage = () => {
  const isMobile = useIsMobile();
  const { data, isLoading } = useQuery<TeamResponse>({
    queryKey: ['team'],
    queryFn: () => api.get('/team').then((r) => r.data),
  });

  const core = data?.data?.core ?? [];
  const ambassadors = data?.data?.ambassadors ?? [];

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
              Our Team
            </p>
            <h1 className="mb-6 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards text-4xl font-bold tracking-tight delay-150 duration-700 motion-reduce:animate-none md:text-5xl lg:text-6xl">
              Built by{' '}
              <span className="vara-marketing-gradient-text bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                members
              </span>
              , for members
            </h1>
            <p className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards text-lg text-muted-foreground delay-300 duration-700 motion-reduce:animate-none">
              We're not just building software—we're building the tools we wish
              existed when we started training.
            </p>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Core Team */}
          {core.length > 0 && (
            <section className="py-20">
              <div className="container">
                <div className="mx-auto mb-12 max-w-2xl text-center">
                  <h2 className="mb-3 text-3xl font-bold tracking-tight">
                    Core Team
                  </h2>
                  <p className="text-muted-foreground">
                    The people behind Vara Performance
                  </p>
                </div>

                <div
                  className={cn(
                    'grid gap-6',
                    isMobile ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3',
                  )}
                >
                  {core.map((member) => (
                    <div
                      key={member.id}
                      className="group overflow-hidden rounded-2xl border border-border/50 bg-card"
                    >
                      <div className="aspect-square overflow-hidden bg-muted">
                        <Avatar className="h-full w-full rounded-none">
                          <AvatarImage
                            src={
                              member.photoUrl ||
                              member.user.profile?.avatarUrl ||
                              undefined
                            }
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <AvatarFallback className="h-full w-full rounded-none text-4xl">
                            {(
                              member.user.profile?.displayName ||
                              member.user.email
                            )
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="p-5">
                        <p className="text-xs font-medium text-primary">
                          {member.title}
                        </p>
                        <p className="mt-1 text-lg font-semibold">
                          {member.user.profile?.displayName ||
                            member.user.email}
                        </p>
                        {member.bio && (
                          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                            {member.bio}
                          </p>
                        )}
                        <SocialLinks
                          socials={member.user.profile?.socials}
                          className="mt-3"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Ambassadors */}
          {ambassadors.length > 0 && (
            <section className="border-t border-border/40 bg-muted/30 py-20">
              <div className="container">
                <div className="mx-auto mb-12 max-w-2xl text-center">
                  <h2 className="mb-3 text-3xl font-bold tracking-tight">
                    Ambassadors
                  </h2>
                  <p className="text-muted-foreground">
                    Movers and creators who represent and support the Vara
                    community
                  </p>
                </div>

                <div
                  className={cn(
                    'grid gap-4',
                    isMobile
                      ? 'grid-cols-2'
                      : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
                  )}
                >
                  {ambassadors.map((member) => (
                    <div
                      key={member.id}
                      className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-colors hover:bg-accent/50"
                    >
                      <Avatar className="h-14 w-14 shrink-0">
                        <AvatarImage
                          src={
                            member.photoUrl ||
                            member.user.profile?.avatarUrl ||
                            undefined
                          }
                        />
                        <AvatarFallback>
                          {(
                            member.user.profile?.displayName ||
                            member.user.email
                          )
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {member.user.profile?.displayName ||
                            member.user.email}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.title}
                        </p>
                        <SocialLinks
                          socials={member.user.profile?.socials}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* CTA - Become an Ambassador */}
      <section className="border-t border-border/40 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">
              Become an Ambassador
            </h2>
            <p className="mb-8 text-muted-foreground">
              Love what we're building? Represent Vara Performance and help grow
              the community.
            </p>
            <Link to="/ambassadors/apply">
              <Button size="lg" className="h-12 px-8">
                Apply Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TeamPage;
