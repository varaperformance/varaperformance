import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 8,
  label,
  subLabel,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  subLabel?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="-rotate-90" width={size} height={size}>
          <circle
            className="text-muted"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            className="text-primary transition-all duration-500"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold">{Math.round(progress)}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{label}</p>
        {subLabel && (
          <p className="text-xs text-muted-foreground">{subLabel}</p>
        )}
      </div>
    </div>
  );
}

export function GoalWidget({
  title,
  progress,
  current,
  target,
  unit,
  icon,
  className,
  isLoading = false,
}: {
  title: string;
  progress: number;
  current: number;
  target: number;
  unit: string;
  icon: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}) {
  const formatNumber = (value: number, decimals: 0 | 1 = 0) => {
    if (!Number.isFinite(value)) return '0';
    if (decimals === 0) return String(Math.round(value));
    const rounded = Math.round((value + Number.EPSILON) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };

  const normalizedUnit = unit.trim();
  const useDecimal = normalizedUnit === 'g' || normalizedUnit === 'L';

  return (
    <Card
      className={cn(
        'h-full border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <CardContent className="flex h-full flex-col items-center justify-center p-3">
        <div className="mb-1 text-chart-1">{icon}</div>
        {isLoading ? (
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="h-[60px] w-[60px] rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ) : (
          <ProgressRing
            progress={progress}
            label={title}
            subLabel={`${formatNumber(current, useDecimal ? 1 : 0)}/${formatNumber(target, useDecimal ? 1 : 0)}${unit}`}
            size={60}
            strokeWidth={5}
          />
        )}
      </CardContent>
    </Card>
  );
}
