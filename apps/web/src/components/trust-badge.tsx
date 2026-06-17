import { Lock } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type TrustBadgeProps = {
  label: string;
  tooltip?: string;
  showIcon?: boolean;
  className?: string;
};

export function TrustBadge({
  label,
  tooltip,
  showIcon = true,
  className,
}: TrustBadgeProps) {
  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground',
        tooltip && 'cursor-help',
        className,
      )}
    >
      {showIcon && <Lock className="h-3.5 w-3.5 text-primary" />}
      {label}
    </span>
  );

  if (!tooltip) {
    return badge;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
