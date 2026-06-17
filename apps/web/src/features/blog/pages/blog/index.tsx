import { Link } from 'react-router';
import { useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight, Calendar } from 'lucide-react';
import { useBlogPostsInfinite } from '../../hooks/use-blogs';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';

const categories = [
  'All',
  'Company',
  'Product',
  'Engineering',
  'Privacy',
  'Coaching',
  'Announcements',
];

// Skeleton components
const HeroSkeleton = () => (
  <section className="relative min-h-[85vh] animate-pulse">
    <div className="absolute inset-0 bg-muted" />
    <div className="container relative flex min-h-[85vh] items-center py-20">
      <div className="max-w-2xl space-y-6">
        <div className="flex gap-3">
          <div className="h-7 w-20 rounded-full bg-muted-foreground/20" />
          <div className="h-7 w-24 rounded-full bg-muted-foreground/20" />
        </div>
        <div className="h-14 w-full rounded bg-muted-foreground/20" />
        <div className="h-14 w-3/4 rounded bg-muted-foreground/20" />
        <div className="h-6 w-full rounded bg-muted-foreground/20" />
        <div className="h-6 w-2/3 rounded bg-muted-foreground/20" />
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-muted-foreground/20" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-muted-foreground/20" />
            <div className="h-3 w-40 rounded bg-muted-foreground/20" />
          </div>
        </div>
        <div className="h-12 w-40 rounded-full bg-muted-foreground/20" />
      </div>
    </div>
  </section>
);

const CardSkeleton = () => (
  <div className="group relative overflow-hidden rounded-2xl bg-card animate-pulse">
    <div className="aspect-4/3">
      <div className="h-full w-full bg-muted" />
      <div className="absolute inset-x-0 bottom-0 p-5 space-y-3">
        <div className="h-6 w-16 rounded-full bg-muted-foreground/20" />
        <div className="h-5 w-full rounded bg-muted-foreground/20" />
        <div className="h-5 w-3/4 rounded bg-muted-foreground/20" />
        <div className="h-4 w-full rounded bg-muted-foreground/20" />
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-muted-foreground/20" />
          <div className="h-4 w-24 rounded bg-muted-foreground/20" />
          <div className="ml-auto h-3 w-16 rounded bg-muted-foreground/20" />
        </div>
      </div>
    </div>
  </div>
);

const BlogPage = () => {
  const isMobile = useIsMobile();
  const {
    featuredPost,
    regularPosts,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useBlogPostsInfinite();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0,
      rootMargin: '400px',
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-destructive">Failed to load blog posts</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Featured Post Hero */}
      {isLoading ? (
        <HeroSkeleton />
      ) : featuredPost ? (
        <section className="relative min-h-[85vh]">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={featuredPost.image}
              alt={featuredPost.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/70 to-transparent" />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/30" />
          </div>

          {/* Page Title - Top */}
          <div className="absolute inset-x-0 top-0 z-10">
            <div className="container pt-8">
              <p className="text-sm font-medium uppercase tracking-widest text-white/60">
                Blog
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="container relative flex min-h-[85vh] items-center py-20">
            <div className="max-w-2xl">
              <div className="mb-6 flex items-center gap-3">
                <Badge className="border-0 bg-primary px-3 py-1 text-primary-foreground">
                  Featured
                </Badge>
                <Badge
                  variant="outline"
                  className="border-white/20 bg-white/10 text-white backdrop-blur-sm"
                >
                  {featuredPost.category}
                </Badge>
              </div>

              <h1 className="mb-6 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
                {featuredPost.title}
              </h1>

              <p className="mb-8 max-w-xl text-lg text-white/70 leading-relaxed">
                {featuredPost.excerpt}
              </p>

              <div className="mb-8 flex items-center gap-4">
                <Avatar className="h-12 w-12 ring-2 ring-white/20">
                  <AvatarImage
                    src={featuredPost.author.avatar}
                    alt={featuredPost.author.name}
                  />
                  <AvatarFallback className="bg-white/10 text-lg font-semibold text-white">
                    {featuredPost.author.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-white">
                    {featuredPost.author.name}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Calendar className="h-3.5 w-3.5" />
                    {featuredPost.date} · {featuredPost.readTime}
                  </div>
                </div>
              </div>

              <Link
                to={`/blog/${featuredPost.slug}`}
                className="group inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 font-medium text-black transition-all hover:bg-white/90 hover:shadow-xl"
              >
                Read Article
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Categories */}
      <section className="sticky top-16 z-20 border-b border-border/50 bg-background/80 py-4 backdrop-blur-xl">
        <div className="container">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  category === 'All'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
                Latest
              </p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Recent Posts
              </h2>
            </div>
          </div>

          <div
            className={cn(
              'grid gap-6',
              !isMobile && 'md:grid-cols-2 lg:grid-cols-3',
            )}
          >
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))
              : regularPosts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group relative overflow-hidden rounded-2xl bg-card"
                  >
                    <div className="aspect-4/3 overflow-hidden">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />

                      {/* Content overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-5">
                        <Badge className="mb-3 border-0 bg-white/10 text-white backdrop-blur-sm">
                          {post.category}
                        </Badge>
                        <h3 className="mb-2 text-lg font-bold text-white transition-colors group-hover:text-primary">
                          {post.title}
                        </h3>
                        <p className="mb-4 text-sm text-white/70 line-clamp-2">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={post.author.avatar}
                              alt={post.author.name}
                            />
                            <AvatarFallback className="bg-white/10 text-sm font-semibold text-white">
                              {post.author.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">
                              {post.author.name}
                            </p>
                          </div>
                          <p className="text-xs text-white/60">
                            {post.readTime}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}

            {/* Loading more skeletons */}
            {isFetchingNextPage &&
              Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={`loading-${i}`} />
              ))}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="h-1" />

          {/* Manual load more fallback */}
          {hasNextPage && !isFetchingNextPage && (
            <div className="mt-12 text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => fetchNextPage()}
              >
                Load more posts
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-24">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center md:px-16 md:py-24">
            {/* Background pattern */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_40%)]" />

            <div className="relative">
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-primary-foreground md:text-5xl">
                Stay in the loop
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-primary-foreground/80">
                Get the latest posts delivered straight to your inbox. No spam,
                unsubscribe anytime.
              </p>
              <form className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row sm:gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 rounded-full border-0 bg-white/10 px-5 py-3 text-sm text-white placeholder:text-white/50 outline-none ring-1 ring-white/20 transition-all focus:bg-white/20 focus:ring-white/40"
                />
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-full px-8 font-semibold"
                >
                  Subscribe
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPage;
