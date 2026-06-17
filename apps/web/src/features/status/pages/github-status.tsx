import { useQuery } from '@tanstack/react-query';
import {
  GitBranch,
  GitCommit,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  User,
  Calendar,
} from 'lucide-react';
import api from '@/lib/api';

// API Response types
interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

interface WorkflowStatus {
  name: string;
  state: 'success' | 'failure' | 'pending' | 'unknown';
  conclusion: string | null;
  sha: string;
  updatedAt: string;
}

interface RepoStatus {
  repo: string;
  state: string;
  totalCommits: number;
  commits: Commit[];
  workflows: WorkflowStatus[];
  error?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// Fetch GitHub status
const fetchGithubStatus = async (): Promise<RepoStatus[]> => {
  const response = await api.get<ApiResponse<RepoStatus[]>>('/status/github');
  return response.data.data;
};

const GitHubStatusPage = () => {
  const {
    data: repos = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['github-status'],
    queryFn: fetchGithubStatus,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failure':
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'no_checks':
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'success':
        return (
          <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500">
            Passing
          </span>
        );
      case 'failure':
      case 'error':
        return (
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-500">
            Failing
          </span>
        );
      case 'pending':
        return (
          <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-500">
            Pending
          </span>
        );
      case 'no_checks':
        return (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-500">
            No CI
          </span>
        );
      default:
        return (
          <span className="rounded-full border border-muted-foreground/30 bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Unknown
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getRepoDisplayName = (repo: string) => {
    return repo.replace('varaperformance-', '');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading GitHub status...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <XCircle className="h-12 w-12 text-red-500" />
          <p className="text-lg font-medium">Unable to load GitHub status</p>
          <p className="text-muted-foreground">Please try again later</p>
          <button
            onClick={() => refetch()}
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const allPassing = repos.every(
    (r) => r.state === 'success' || r.state === 'no_checks',
  );
  const hasPending = repos.some((r) => r.state === 'pending');
  const hasFailing = repos.some(
    (r) => r.state === 'failure' || r.state === 'error',
  );

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent" />
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <GitBranch className="h-4 w-4" />
              Development Status
            </div>
            <h1 className="mb-6 text-5xl font-bold tracking-tight">
              GitHub Status
            </h1>

            {/* Overall Status */}
            <div
              className={`mx-auto inline-flex items-center gap-3 rounded-2xl border px-6 py-4 ${
                allPassing
                  ? 'border-green-500/30 bg-green-500/10'
                  : hasFailing
                    ? 'border-red-500/30 bg-red-500/10'
                    : hasPending
                      ? 'border-yellow-500/30 bg-yellow-500/10'
                      : 'border-muted-foreground/30 bg-muted/50'
              }`}
            >
              {allPassing ? (
                <>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div className="text-left">
                    <div className="font-semibold text-green-500">
                      All Checks Passing
                    </div>
                    <div className="text-sm text-muted-foreground">
                      All repositories are in good health
                    </div>
                  </div>
                </>
              ) : hasFailing ? (
                <>
                  <XCircle className="h-8 w-8 text-red-500" />
                  <div className="text-left">
                    <div className="font-semibold text-red-500">
                      Some Checks Failing
                    </div>
                    <div className="text-sm text-muted-foreground">
                      We're working on fixing the issues
                    </div>
                  </div>
                </>
              ) : hasPending ? (
                <>
                  <Clock className="h-8 w-8 text-yellow-500" />
                  <div className="text-left">
                    <div className="font-semibold text-yellow-500">
                      Checks In Progress
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Waiting for CI/CD pipelines to complete
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                  <div className="text-left">
                    <div className="font-semibold text-muted-foreground">
                      Status Unknown
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Unable to determine build status
                    </div>
                  </div>
                </>
              )}
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-10">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-colors hover:border-primary/30">
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary/5 transition-transform group-hover:scale-150" />
                <GitBranch className="mb-3 h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">{repos.length}</div>
                <div className="text-sm text-muted-foreground">
                  Repositories
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-colors hover:border-primary/30">
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary/5 transition-transform group-hover:scale-150" />
                <GitCommit className="mb-3 h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">
                  {repos
                    .reduce((sum, r) => sum + r.totalCommits, 0)
                    .toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Commits
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-colors hover:border-green-500/30">
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-green-500/5 transition-transform group-hover:scale-150" />
                <CheckCircle className="mb-3 h-5 w-5 text-green-500" />
                <div className="text-2xl font-bold text-green-500">
                  {repos.filter((r) => r.state === 'success').length}
                </div>
                <div className="text-sm text-muted-foreground">Passing</div>
              </div>
              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-colors hover:border-yellow-500/30">
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-yellow-500/5 transition-transform group-hover:scale-150" />
                <Clock className="mb-3 h-5 w-5 text-yellow-500" />
                <div className="text-2xl font-bold text-yellow-500">
                  {repos.filter((r) => r.state === 'pending').length}
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Repository Status */}
      <section className="py-8">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-2xl font-bold">Repositories</h2>
            <div className="space-y-6">
              {repos.map((repo) => (
                <div
                  key={repo.repo}
                  className="rounded-xl border border-border/50 bg-card overflow-hidden"
                >
                  {/* Repo Header */}
                  <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
                    <div className="flex items-center gap-3">
                      {getStateIcon(repo.state)}
                      <div>
                        <h3 className="font-semibold capitalize">
                          {getRepoDisplayName(repo.repo)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          varaperformance/{repo.repo}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStateBadge(repo.state)}
                    </div>
                  </div>

                  {/* Workflows */}
                  {repo.workflows && repo.workflows.length > 0 && (
                    <div className="border-b border-border/50 px-6 py-4">
                      <div className="mb-3 text-sm font-medium text-muted-foreground">
                        CI Workflows
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {repo.workflows.map((workflow) => (
                          <div
                            key={workflow.name}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                              workflow.state === 'success'
                                ? 'border-green-500/30 bg-green-500/10'
                                : workflow.state === 'failure'
                                  ? 'border-red-500/30 bg-red-500/10'
                                  : workflow.state === 'pending'
                                    ? 'border-yellow-500/30 bg-yellow-500/10'
                                    : 'border-border bg-muted/50'
                            }`}
                          >
                            {workflow.state === 'success' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : workflow.state === 'failure' ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : workflow.state === 'pending' ? (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium">
                              {workflow.name}
                            </span>
                            <code className="rounded bg-background/50 px-1 py-0.5 font-mono text-xs text-muted-foreground">
                              {workflow.sha}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {repo.error && (
                    <div className="border-b border-border/50 bg-red-500/5 px-6 py-3">
                      <p className="text-sm text-red-500">{repo.error}</p>
                    </div>
                  )}

                  {/* Commits */}
                  {repo.commits.length > 0 && (
                    <div className="divide-y divide-border/50">
                      {repo.commits.map((commit, index) => (
                        <div
                          key={commit.sha}
                          className={`flex items-start gap-4 px-6 py-4 ${
                            index === 0 ? 'bg-muted/30' : ''
                          }`}
                        >
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/50">
                            <GitCommit className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium leading-snug">
                              {commit.message}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                {commit.author}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(commit.date)}
                              </span>
                              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                                {commit.sha}
                              </code>
                            </div>
                          </div>
                          {index === 0 && (
                            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              Latest
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No Commits */}
                  {repo.commits.length === 0 && !repo.error && (
                    <div className="px-6 py-8 text-center">
                      <GitCommit className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No recent commits
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-muted/30 py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <GitBranch className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h2 className="mb-4 text-2xl font-bold">Want to Contribute?</h2>
            <p className="mb-6 text-muted-foreground">
              Vara Performance is built with passion. Check out our repositories
              and see what we're working on.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://github.com/varaperformance"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                View on GitHub
              </a>
              <a
                href="/roadmap"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                View Roadmap
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GitHubStatusPage;
