import { lazy, Suspense, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const BlogPrismBlock = lazy(() =>
  import('./blog-code-fence-prism').then((m) => ({
    default: m.BlogPrismBlock,
  })),
);

/**
 * Fenced code block: loads react-syntax-highlighter in a separate chunk.
 */
export function BlogCodeFence({
  language,
  code,
  toolbar,
  className,
}: {
  language: string;
  code: string;
  toolbar: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative group my-10 overflow-hidden rounded-xl border border-border/60',
        className,
      )}
    >
      {toolbar}
      <Suspense
        fallback={<div className="min-h-32 w-full bg-muted/40 animate-pulse" />}
      >
        <BlogPrismBlock language={language} code={code} />
      </Suspense>
    </div>
  );
}
