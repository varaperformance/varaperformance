import { type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwipeAction } from '@/hooks/use-swipe-action';
import { hapticsLight } from '@/lib/haptics';

const ACTION_WIDTH = 80;

interface SwipeToDeleteProps {
  children: ReactNode;
  onDelete: () => void;
  className?: string;
  disabled?: boolean;
}

export function SwipeToDelete({
  children,
  onDelete,
  className,
  disabled = false,
}: SwipeToDeleteProps) {
  const { state, handlers, reset } = useSwipeAction(ACTION_WIDTH);

  const handleDelete = async () => {
    await hapticsLight();
    reset();
    onDelete();
  };

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Delete action behind */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-destructive text-destructive-foreground"
        style={{ width: ACTION_WIDTH }}
      >
        <button
          type="button"
          onClick={handleDelete}
          className="flex h-full w-full items-center justify-center"
          aria-label="Delete"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Swipeable content */}
      <div
        className="relative z-10 bg-background"
        style={{
          transform: `translateX(${state.offsetX}px)`,
          transition: state.swiping ? 'none' : 'transform 200ms ease-out',
        }}
        {...handlers}
      >
        {children}
      </div>
    </div>
  );
}
