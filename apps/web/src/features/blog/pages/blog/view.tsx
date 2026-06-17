import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { writeClipboard } from '@/lib/clipboard';
import { shareContent, canShare } from '@/lib/share';
import { openUrl } from '@/lib/browser';
import { isNativeApp } from '@/lib/capacitor';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BlogCodeFence } from '@/features/blog/components/blog-code-fence';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Share2,
  Bookmark,
  BookmarkCheck,
  ChevronUp,
  Copy,
  Check,
  Facebook,
  Linkedin,
  MessageCircle,
  Heart,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useBlog, useRelatedBlogs, type BlogPost } from '@/features/blog';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { toast } from 'sonner';

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// Animated Reading Progress
function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(scrollPercent, 100));
      setIsVisible(scrollTop > 100);
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isVisible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="h-1 w-full bg-border/50 backdrop-blur-sm">
        <div
          className="h-full bg-linear-to-r from-primary via-primary to-primary/50 transition-all duration-100 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Floating Actions Bar (Medium-style)
function FloatingActions({
  onShare,
  onCopyLink,
  onToggleSave,
  onLike,
  canUseNativeShare,
  isSaved,
  hasLiked,
  linkCopied,
  likes,
  shareUrl,
  shareTitle,
}: {
  onShare: () => void;
  onCopyLink: () => void;
  onToggleSave: () => void;
  onLike: () => void;
  canUseNativeShare: boolean;
  isSaved: boolean;
  hasLiked: boolean;
  linkCopied: boolean;
  likes: number;
  shareUrl: string;
  shareTitle: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={cn(
        'fixed bottom-8 left-1/2 -translate-x-1/2 z-40 transition-all duration-500',
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-20 opacity-0 pointer-events-none',
      )}
    >
      <div className="flex items-center gap-1 px-2 py-2 rounded-full bg-background/80 backdrop-blur-xl border border-border/50 shadow-2xl">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'rounded-full transition-all',
                hasLiked && 'text-red-500',
              )}
              onClick={onLike}
            >
              <Heart className={cn('h-5 w-5', hasLiked && 'fill-current')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{likes} likes</TooltipContent>
        </Tooltip>

        <span className="text-sm text-muted-foreground tabular-nums min-w-[2ch]">
          {likes}
        </span>

        <div className="w-px h-6 bg-border mx-1" />

        <Popover open={shareOpen} onOpenChange={setShareOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Share2 className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Share</TooltipContent>
          </Tooltip>
          <PopoverContent
            side="top"
            align="center"
            className="w-auto rounded-xl border-border/70 bg-background/95 p-2 backdrop-blur"
          >
            <div className="flex items-center gap-1">
              {canUseNativeShare && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={async () => {
                    await onShare();
                    setShareOpen(false);
                  }}
                  title="Native share"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}

              <a
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (isNativeApp()) {
                    e.preventDefault();
                    void openUrl(
                      `https://x.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
                    );
                  }
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted"
                title="Share on X"
              >
                <XIcon className="h-4 w-4" />
              </a>

              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (isNativeApp()) {
                    e.preventDefault();
                    void openUrl(
                      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
                    );
                  }
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted"
                title="Share on LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (isNativeApp()) {
                    e.preventDefault();
                    void openUrl(
                      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                    );
                  }
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted"
                title="Share on Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>

              <a
                href={`https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (isNativeApp()) {
                    e.preventDefault();
                    void openUrl(
                      `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`,
                    );
                  }
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted"
                title="Share on Reddit"
              >
                <MessageCircle className="h-4 w-4" />
              </a>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={async () => {
                  await onCopyLink();
                  setShareOpen(false);
                }}
                title={linkCopied ? 'Copied' : 'Copy link'}
              >
                {linkCopied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={onCopyLink}
            >
              {linkCopied ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {linkCopied ? 'Copied!' : 'Copy link'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('rounded-full', isSaved && 'text-primary')}
              onClick={onToggleSave}
            >
              {isSaved ? (
                <BookmarkCheck className="h-5 w-5" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isSaved ? 'Saved' : 'Save'}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// Scroll to Top
function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => setVisible(window.scrollY > 800);
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  return (
    <Button
      size="icon"
      variant="outline"
      className={cn(
        'fixed bottom-8 right-8 z-40 rounded-full shadow-lg transition-all duration-300 bg-background/80 backdrop-blur-sm',
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-20 opacity-0 pointer-events-none',
      )}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <ChevronUp className="h-5 w-5" />
    </Button>
  );
}

// Related Post Card
function RelatedPostCard({ post, index }: { post: BlogPost; index: number }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group block"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <article className="relative overflow-hidden rounded-2xl bg-card border border-border/50 transition-all duration-500 hover:border-primary/30 hover:shadow-xl hover:-translate-y-2">
        <div className="aspect-16/10 overflow-hidden">
          <img
            src={post.image}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <Badge
            variant="secondary"
            className="mb-3 bg-white/10 backdrop-blur-sm border-0 text-white"
          >
            {post.category}
          </Badge>
          <h3 className="text-lg font-semibold text-white line-clamp-2 mb-2 group-hover:text-primary-foreground transition-colors">
            {post.title}
          </h3>
          <div className="flex items-center gap-3 text-white/70 text-sm">
            <span>{post.readTime}</span>
            <span>·</span>
            <span>{post.date}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

// Share Menu
function ShareMenu({ title, url }: { title: string; url: string }) {
  const shareLinks = [
    {
      icon: XIcon,
      label: 'X',
      href: `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    {
      icon: Linkedin,
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      icon: Facebook,
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      icon: MessageCircle,
      label: 'Reddit',
      href: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    },
  ];

  return (
    <div className="flex items-center gap-2">
      {shareLinks.map(({ icon: Icon, label, href }) => (
        <Tooltip key={label}>
          <TooltipTrigger asChild>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (isNativeApp()) {
                  e.preventDefault();
                  void openUrl(href);
                }
              }}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <Icon className="h-4 w-4" />
            </a>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

export default function BlogViewPage() {
  const isMobile = useIsMobile();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [linkCopied, setLinkCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [, setInteractionVersion] = useState(0);

  // Fetch post from API
  const { data: post, isLoading, error } = useBlog(slug);

  // Fetch related posts
  const { relatedPosts } = useRelatedBlogs(post?.categorySlug, post?.id, 3);

  const savedKey = slug ? `blog-saved-${slug}` : null;
  const likedKey = slug ? `blog-liked-${slug}` : null;
  const canUseNativeShare = canShare();
  const isSaved =
    !!savedKey &&
    typeof window !== 'undefined' &&
    localStorage.getItem(savedKey) === 'true';

  const hasLiked =
    !!likedKey &&
    typeof window !== 'undefined' &&
    localStorage.getItem(likedKey) === 'true';

  const handleCopyLink = useCallback(async () => {
    try {
      await writeClipboard(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast.success('Link copied');
    } catch {
      toast.error('Unable to copy link');
    }
  }, []);

  const handleToggleSave = useCallback(() => {
    if (!slug || !savedKey) return;
    const newSaved = !isSaved;
    localStorage.setItem(savedKey, String(newSaved));
    setInteractionVersion((version) => version + 1);
    toast.success(newSaved ? 'Saved for later' : 'Removed from saved');
  }, [slug, isSaved, savedKey]);

  const handleLike = useCallback(() => {
    if (!likedKey) return;

    const nextLiked = !hasLiked;
    localStorage.setItem(likedKey, String(nextLiked));
    setInteractionVersion((version) => version + 1);
    toast.success(nextLiked ? 'Thanks for the love' : 'Like removed');
  }, [hasLiked, likedKey]);

  const handleShare = useCallback(async () => {
    if (!post) return;

    const url = window.location.href;
    const shared = await shareContent({
      title: post.title,
      text: post.excerpt,
      url,
    });

    if (!shared) {
      await handleCopyLink();
    }
  }, [post, handleCopyLink]);

  const likesCount = (post?.likes ?? 0) + (hasLiked ? 1 : 0);

  const markdownComponents: Components = useMemo(
    () => ({
      h1: ({ children }) => {
        const text = String(children);
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        return (
          <h1
            id={id}
            className="scroll-mt-24 mt-14 mb-6 text-3xl font-bold tracking-tight leading-tight md:text-4xl"
          >
            {children}
          </h1>
        );
      },
      h2: ({ children }) => {
        const text = String(children);
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        return (
          <h2
            id={id}
            className="scroll-mt-24 mt-12 mb-5 border-b border-border/70 pb-3 text-2xl font-semibold tracking-tight md:text-3xl"
          >
            {children}
          </h2>
        );
      },
      h3: ({ children }) => {
        const text = String(children);
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        return (
          <h3
            id={id}
            className="scroll-mt-24 mt-10 mb-4 text-xl font-semibold tracking-tight md:text-2xl"
          >
            {children}
          </h3>
        );
      },
      p: ({ children }) => (
        <p className="mb-7 text-base leading-8 text-muted-foreground md:text-[1.0625rem]">
          {children}
        </p>
      ),
      ul: ({ children }) => (
        <ul className="my-7 ml-6 list-disc space-y-3 text-muted-foreground md:ml-7">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="my-7 ml-6 list-decimal space-y-3 text-muted-foreground md:ml-7">
          {children}
        </ol>
      ),
      li: ({ children }) => (
        <li className="text-base leading-8 md:text-[1.04rem]">{children}</li>
      ),
      blockquote: ({ children }) => (
        <blockquote className="my-10 rounded-r-xl border-l-4 border-primary/80 py-3 pl-6 pr-4 text-[1.08rem] leading-8 italic text-muted-foreground">
          {children}
        </blockquote>
      ),
      strong: ({ children }) => (
        <strong className="font-semibold text-foreground">{children}</strong>
      ),
      a: ({ href, children }) => {
        const isExternal =
          href?.startsWith('http://') || href?.startsWith('https://');

        const handleClick = (e: React.MouseEvent) => {
          if (isExternal && isNativeApp() && href) {
            e.preventDefault();
            void openUrl(href);
          }
        };

        return (
          <a
            href={href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            onClick={handleClick}
            className="text-primary underline underline-offset-[3px] decoration-primary/70 transition-colors hover:text-primary/80"
          >
            {children}
          </a>
        );
      },
      code: ({ className, children }) => {
        const match = /language-(\w+)/.exec(className || '');
        const inline = !match;
        return !inline && match ? (
          <BlogCodeFence
            language={match[1]}
            code={String(children).replace(/\n$/, '')}
            toolbar={
              <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 px-2"
                  onClick={() => {
                    writeClipboard(String(children));
                    toast.success('Code copied');
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
            }
          />
        ) : (
          <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm text-primary">
            {children}
          </code>
        );
      },
      table: ({ children }) => (
        <div className="my-10 overflow-x-auto rounded-xl border border-border/60 bg-card/20">
          <table className="w-full text-sm">{children}</table>
        </div>
      ),
      thead: ({ children }) => (
        <thead className="border-b-2 border-border bg-muted/50">
          {children}
        </thead>
      ),
      tbody: ({ children }) => (
        <tbody className="divide-y divide-border/50">{children}</tbody>
      ),
      tr: ({ children }) => (
        <tr className="transition-colors hover:bg-muted/30">{children}</tr>
      ),
      th: ({ children }) => (
        <th className="px-4 py-3 text-left font-semibold text-foreground">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="px-4 py-3 text-muted-foreground">{children}</td>
      ),
      img: ({ src, alt }) => (
        <figure className="my-10">
          <img
            src={src}
            alt={alt || ''}
            className="w-full rounded-2xl border border-border/60 object-cover shadow-lg"
            loading="lazy"
            decoding="async"
          />
          {alt && (
            <figcaption className="mt-3 text-center text-sm text-muted-foreground italic">
              {alt}
            </figcaption>
          )}
        </figure>
      ),
      hr: () => <hr className="my-14 border-t border-border/80" />,
    }),
    [],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen">
        {/* Hero Skeleton */}
        <header className="relative min-h-[70vh] flex items-end bg-muted/30">
          <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/blog')}
            className="absolute top-8 left-8 bg-background/50 backdrop-blur-sm hover:bg-background/80 z-10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="relative container pb-16 pt-32">
            <div className="max-w-3xl mx-auto text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-14 w-full bg-muted rounded mb-4 animate-pulse" />
              <div className="h-14 w-3/4 mx-auto bg-muted rounded mb-6 animate-pulse" />
              <div className="h-6 w-2/3 mx-auto bg-muted rounded mb-8 animate-pulse" />
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                  <div>
                    <div className="h-4 w-24 bg-muted rounded mb-2 animate-pulse" />
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        {/* Content Skeleton */}
        <div className="container py-16">
          <div className="max-w-3xl mx-auto space-y-6">
            {[100, 85, 92, 78, 95, 88, 100, 72].map((width, i) => (
              <div
                key={i}
                className="h-5 bg-muted rounded animate-pulse"
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!post || error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Article not found</h1>
          <p className="text-muted-foreground mb-8">
            The article you're looking for doesn't exist or may have been moved.
          </p>
          <Button size="lg" onClick={() => navigate('/blog')}>
            Browse all articles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <ReadingProgress />
      <ScrollToTop />
      <FloatingActions
        onShare={handleShare}
        onCopyLink={handleCopyLink}
        onToggleSave={handleToggleSave}
        onLike={handleLike}
        canUseNativeShare={canUseNativeShare}
        isSaved={isSaved}
        hasLiked={hasLiked}
        linkCopied={linkCopied}
        likes={likesCount}
        shareUrl={window.location.href}
        shareTitle={post.title}
      />

      <article className="min-h-screen">
        {/* Hero */}
        <header className="relative min-h-[70vh] flex items-end">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={post.image}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 bg-linear-to-r from-background/80 to-transparent" />
          </div>

          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/blog')}
            className="absolute top-8 left-8 bg-background/50 backdrop-blur-sm hover:bg-background/80 z-10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {/* Hero Content */}
          <div className="relative container pb-16 pt-32">
            <div className="max-w-3xl mx-auto text-center">
              {/* Category & Date */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <Badge className="bg-primary/90 hover:bg-primary text-primary-foreground">
                  {post.category}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {post.date}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
                {post.title}
              </h1>

              {/* Excerpt */}
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                {post.excerpt}
              </p>

              {/* Article Meta */}
              <div className="mx-auto mt-2 inline-flex max-w-full items-center gap-4 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 backdrop-blur-md">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {post.readTime}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {post.date}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="container py-16 lg:py-20">
          <div
            className={cn(
              'mx-auto grid max-w-6xl gap-10',
              !isMobile && 'lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start',
            )}
          >
            <aside className={cn('lg:sticky lg:top-24', isMobile && 'order-2')}>
              <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Article details
                </p>

                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{post.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{post.readTime}</span>
                  </div>
                </div>

                <div className="mt-5 border-t border-border/60 pt-4">
                  <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Share
                  </p>
                  <ShareMenu title={post.title} url={window.location.href} />
                </div>
              </div>
            </aside>

            <div className={cn(isMobile && 'order-1')}>
              {/* Share Bar */}
              <div className="mb-8 flex items-center justify-between rounded-xl border border-border/60 bg-card/30 px-4 py-4">
                <span className="text-sm text-muted-foreground">
                  Share this article
                </span>
                <ShareMenu title={post.title} url={window.location.href} />
              </div>

              {/* Article Body */}
              <div
                ref={contentRef}
                className="prose-custom rounded-2xl border border-border/50 bg-card/20 px-5 py-8 sm:px-8 lg:px-10"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {post.content}
                </ReactMarkdown>
              </div>

              {/* Tags */}
              <div className="mt-12 border-t border-border/60 pt-8">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="px-4 py-2 text-sm hover:bg-muted transition-colors cursor-pointer"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Author Bio */}
              <div className="mt-10 rounded-2xl border border-border/60 bg-linear-to-br from-card to-card/40 p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <Avatar className="h-18 w-18">
                    <AvatarImage
                      src={post.author.avatar}
                      alt={post.author.name}
                    />
                    <AvatarFallback className="text-xl">
                      {post.author.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="mb-1 text-sm text-muted-foreground">
                      Written by
                    </p>
                    <h3 className="mb-1 text-xl font-semibold">
                      {post.author.name}
                    </h3>
                    <p className="mb-3 text-sm text-primary">
                      {post.author.role}
                    </p>
                    <p className="text-muted-foreground">
                      {post.author.bio ||
                        'Building practical content for members and everyday training.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="border-t bg-muted/30">
            <div className="container py-20">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Related Articles</h2>
                  <p className="text-muted-foreground">
                    Continue reading from our blog
                  </p>
                </div>
                <Button variant="outline" onClick={() => navigate('/blog')}>
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div
                className={cn(
                  'grid gap-6',
                  !isMobile && 'md:grid-cols-2 lg:grid-cols-3',
                )}
              >
                {relatedPosts.slice(0, 3).map((relatedPost, index) => (
                  <RelatedPostCard
                    key={relatedPost.id}
                    post={relatedPost}
                    index={index}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Newsletter CTA */}
        <section className="py-20">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">Stay in the loop</h2>
              <p className="text-muted-foreground mb-8">
                Get notified when we publish new articles. No spam, unsubscribe
                anytime.
              </p>
              <form className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button size="lg">Subscribe</Button>
              </form>
            </div>
          </div>
        </section>
      </article>
    </TooltipProvider>
  );
}
