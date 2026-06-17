import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SkipForward } from 'lucide-react';
import type { RestTimerState } from '../hooks/use-rest-timer';

interface RestTimerOverlayProps extends RestTimerState {
  onSkip: () => void;
  className?: string;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}`;
}

export function RestTimerOverlay({
  isRunning,
  secondsLeft,
  totalSeconds,
  progress,
  onSkip,
  className,
}: RestTimerOverlayProps) {
  if (!isRunning) return null;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const isUrgent = secondsLeft <= 10;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center gap-6',
        'bg-background/95 backdrop-blur-sm',
        className,
      )}
      role="dialog"
      aria-label="Rest timer"
      aria-live="polite"
    >
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Rest
      </p>

      {/* Circular progress ring */}
      <div className="relative flex items-center justify-center">
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            strokeWidth="6"
            className="stroke-muted"
          />
          {/* Progress arc */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={cn(
              'transition-[stroke-dashoffset] duration-1000 ease-linear',
              isUrgent ? 'stroke-destructive' : 'stroke-primary',
            )}
          />
        </svg>

        {/* Countdown number */}
        <span
          className={cn(
            'absolute text-5xl font-bold tabular-nums transition-colors',
            isUrgent ? 'text-destructive' : 'text-foreground',
          )}
        >
          {formatSeconds(secondsLeft)}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        of {formatSeconds(totalSeconds)}
      </p>

      <Button variant="outline" size="sm" onClick={onSkip} className="gap-2">
        <SkipForward className="h-4 w-4" />
        Skip rest
      </Button>
    </div>
  );
}
