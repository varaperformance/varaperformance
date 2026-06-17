import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface MotivationQuote {
  quote: string;
  author: string;
  source: string;
}

export function MotivationQuoteCard({
  motivationQuote,
  isLoading,
}: {
  motivationQuote: MotivationQuote | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="h-full border-primary/20 bg-linear-to-r from-primary/10 via-card to-emerald-400/10">
        <CardContent className="px-5 py-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-2 h-5 w-104 max-w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!motivationQuote) return null;

  return (
    <Card className="h-full border-primary/20 bg-linear-to-r from-primary/10 via-card to-emerald-400/10">
      <CardContent className="px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/90">
          Daily Focus
        </p>
        <div className="mt-2 border-l-2 border-primary/45 pl-3">
          <p className="text-base font-semibold leading-relaxed text-foreground sm:text-[17px]">
            &ldquo;{motivationQuote.quote}&rdquo;
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ― {motivationQuote.author}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
