import { Link } from 'react-router';
import {
  Sparkles,
  Rocket,
  Bug,
  Zap,
  Shield,
  Calendar,
  Loader2,
} from 'lucide-react';
import {
  usePublicReleaseNotes,
  type PublicReleaseNote,
} from '@/features/release-notes';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';

const ReleaseNotesPage = () => {
  const isMobile = useIsMobile();
  const { data, isLoading } = usePublicReleaseNotes();
  const releases = data?.data ?? [];

  const getVersionBadgeStyle = (type: PublicReleaseNote['type']) => {
    switch (type) {
      case 'MAJOR':
        return 'border-primary/30 bg-primary/10 text-primary';
      case 'MINOR':
        return 'border-blue-500/30 bg-blue-500/10 text-blue-500';
      case 'PATCH':
        return 'border-orange-500/30 bg-orange-500/10 text-orange-500';
    }
  };

  const getVersionLabel = (type: PublicReleaseNote['type']) => {
    switch (type) {
      case 'MAJOR':
        return 'Major Release';
      case 'MINOR':
        return 'Feature Update';
      case 'PATCH':
        return 'Bug Fix';
    }
  };

  return (
    <div className="flex flex-col">
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-border/40 py-20">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent" />
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              What's New
            </div>
            <h1 className="mb-4 text-5xl font-bold tracking-tight">
              Release Notes
            </h1>
            <p className="mb-6 text-lg text-muted-foreground">
              Stay up to date with the latest features, improvements, and fixes
            </p>
            {releases.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Current version: {releases[0].version}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Legend */}
      <section className="sticky top-16 z-40 border-b border-border/40 bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm text-muted-foreground">Legend:</span>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-500">
                  <Rocket className="h-3 w-3" />
                  New Feature
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-500">
                  <Zap className="h-3 w-3" />
                  Improvement
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-500">
                  <Bug className="h-3 w-3" />
                  Bug Fix
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Releases */}
      <section className="py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl space-y-12">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : releases.length === 0 ? (
              <div className="text-center py-12">
                <Rocket className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium">No release notes yet</p>
                <p className="text-sm text-muted-foreground">
                  Check back soon for updates
                </p>
              </div>
            ) : (
              releases.map((release, index) => (
                <div
                  key={release.version}
                  className={`rounded-2xl border border-border/50 bg-card p-8 ${
                    index === 0 ? 'ring-2 ring-primary/20' : ''
                  }`}
                >
                  {/* Release Header */}
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 flex items-center gap-3">
                        <h2 className="text-2xl font-bold">
                          v{release.version}
                        </h2>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getVersionBadgeStyle(
                            release.type,
                          )}`}
                        >
                          {getVersionLabel(release.type)}
                        </span>
                        {index === 0 && (
                          <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {release.publishedAt
                          ? new Date(release.publishedAt).toLocaleDateString(
                              'en-US',
                              {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              },
                            )
                          : 'Unreleased'}
                      </div>
                    </div>
                  </div>

                  {/* Highlights */}
                  {release.highlights && release.highlights.length > 0 && (
                    <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                        <Sparkles className="h-4 w-4" />
                        Highlights
                      </h3>
                      <ul className="space-y-2">
                        {release.highlights.map((highlight, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div
                    className={cn(
                      'grid gap-6',
                      !isMobile && 'md:grid-cols-2 lg:grid-cols-3',
                    )}
                  >
                    {/* Features */}
                    {release.features && release.features.length > 0 && (
                      <div>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-500">
                          <Rocket className="h-4 w-4" />
                          New Features
                        </h3>
                        <ul className="space-y-2">
                          {release.features.map((feature, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Improvements */}
                    {release.improvements &&
                      release.improvements.length > 0 && (
                        <div>
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-500">
                            <Zap className="h-4 w-4" />
                            Improvements
                          </h3>
                          <ul className="space-y-2">
                            {release.improvements.map((improvement, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm text-muted-foreground"
                              >
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                                {improvement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {/* Fixes */}
                    {release.fixes && release.fixes.length > 0 && (
                      <div>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-500">
                          <Bug className="h-4 w-4" />
                          Bug Fixes
                        </h3>
                        <ul className="space-y-2">
                          {release.fixes.map((fix, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                              {fix}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Subscribe Section */}
      <section className="border-t border-border/40 py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h2 className="mb-4 text-2xl font-bold">Stay Updated</h2>
            <p className="mb-6 text-muted-foreground">
              Want to be the first to know about new features and updates?
              Follow us on social media or check back here regularly.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/features"
                className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Sparkles className="h-4 w-4" />
                Explore Features
              </Link>
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                Read Our Blog
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ReleaseNotesPage;
