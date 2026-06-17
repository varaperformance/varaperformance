import * as React from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { buttonVariants } from '@/components/ui/button-variants';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog-base';
import {
  NativeDrawerRoot,
  NativeDrawerTrigger,
  NativeDrawerClose,
  NativeDrawerContent,
  NativeDrawerHeader,
  NativeDrawerFooter,
  NativeDrawerTitle,
  NativeDrawerDescription,
} from '@/components/ui/native-drawer';

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

function ResponsiveAlertDialog({
  children,
  ...props
}: React.ComponentProps<typeof AlertDialog>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <NativeDrawerRoot open={props.open} onOpenChange={props.onOpenChange}>
        {children}
      </NativeDrawerRoot>
    );
  }

  return <AlertDialog {...props}>{children}</AlertDialog>;
}

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

function ResponsiveAlertDialogTrigger({
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogTrigger>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <NativeDrawerTrigger asChild {...props}>
        {children}
      </NativeDrawerTrigger>
    );
  }

  return <AlertDialogTrigger {...props}>{children}</AlertDialogTrigger>;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

function ResponsiveAlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogContent>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <NativeDrawerContent className={cn('max-h-fit', className)}>
        {children}
      </NativeDrawerContent>
    );
  }

  return (
    <AlertDialogContent className={className} {...props}>
      {children}
    </AlertDialogContent>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function ResponsiveAlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <NativeDrawerHeader className={className} {...props} />;
  }

  return <AlertDialogHeader className={className} {...props} />;
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function ResponsiveAlertDialogFooter({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <NativeDrawerFooter className={className} {...props}>
        {children}
      </NativeDrawerFooter>
    );
  }

  return (
    <AlertDialogFooter className={className} {...props}>
      {children}
    </AlertDialogFooter>
  );
}

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

function ResponsiveAlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogTitle>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <NativeDrawerTitle
        className={className}
        {...(props as React.ComponentProps<'h2'>)}
      />
    );
  }

  return <AlertDialogTitle className={className} {...props} />;
}

// ---------------------------------------------------------------------------
// Description
// ---------------------------------------------------------------------------

function ResponsiveAlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogDescription>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <NativeDrawerDescription
        className={className}
        {...(props as React.ComponentProps<'p'>)}
      />
    );
  }

  return <AlertDialogDescription className={className} {...props} />;
}

// ---------------------------------------------------------------------------
// Action (destructive confirm button)
// ---------------------------------------------------------------------------

function ResponsiveAlertDialogAction({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogAction>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <NativeDrawerClose asChild>
        <button
          className={cn(buttonVariants(), 'w-full', className)}
          {...props}
        >
          {children}
        </button>
      </NativeDrawerClose>
    );
  }

  return (
    <AlertDialogAction className={className} {...props}>
      {children}
    </AlertDialogAction>
  );
}

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

function ResponsiveAlertDialogCancel({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogCancel>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <NativeDrawerClose asChild>
        <button
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'w-full',
            className,
          )}
          {...props}
        >
          {children}
        </button>
      </NativeDrawerClose>
    );
  }

  return (
    <AlertDialogCancel className={className} {...props}>
      {children}
    </AlertDialogCancel>
  );
}

export {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogTrigger,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogTitle,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
};
