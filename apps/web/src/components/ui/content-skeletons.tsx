import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Card skeleton with image, title, and description lines */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border p-4 space-y-3', className)}>
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  );
}

/** List item skeleton with avatar, title, and subtitle */
export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 p-3', className)}>
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** Stat card skeleton with number and label */
export function StatSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border p-4 space-y-2', className)}>
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

/** Chart placeholder skeleton */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-6 w-20 rounded-md" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

/** Feed post skeleton with header, content, and action bar */
export function PostSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border p-4 space-y-3', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-2.5 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-52 w-full rounded-lg" />
      <div className="flex gap-4 pt-1">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
}

/** Form field skeleton */
export function FormFieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-3.5 w-1/4" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}
