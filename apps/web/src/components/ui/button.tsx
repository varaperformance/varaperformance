import * as React from 'react';
import { type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button-variants';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  title,
  'aria-label': ariaLabel,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';
  const tooltipText = typeof title === 'string' ? title : undefined;

  const buttonNode = (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-label={ariaLabel ?? tooltipText}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );

  if (!tooltipText) {
    return buttonNode;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{buttonNode}</TooltipTrigger>
        <TooltipContent sideOffset={6}>{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { Button };
