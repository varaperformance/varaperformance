import * as React from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog-base';
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

function ResponsiveDialog({
  children,
  ...props
}: React.ComponentProps<typeof Dialog>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <NativeDrawerRoot open={props.open} onOpenChange={props.onOpenChange}>
        {children}
      </NativeDrawerRoot>
    );
  }

  return <Dialog {...props}>{children}</Dialog>;
}

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

function ResponsiveDialogTrigger({
  children,
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <NativeDrawerTrigger asChild {...props}>
        {children}
      </NativeDrawerTrigger>
    );
  }

  return <DialogTrigger {...props}>{children}</DialogTrigger>;
}

// ---------------------------------------------------------------------------
// Close
// ---------------------------------------------------------------------------

function ResponsiveDialogClose({
  children,
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <NativeDrawerClose asChild {...props}>
        {children}
      </NativeDrawerClose>
    );
  }

  return <DialogClose {...props}>{children}</DialogClose>;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

function ResponsiveDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <NativeDrawerContent className={className}>
        {children}
      </NativeDrawerContent>
    );
  }

  return (
    <DialogContent className={className} {...props}>
      {children}
    </DialogContent>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <NativeDrawerHeader className={className} {...props} />;
  }

  return <DialogHeader className={className} {...props} />;
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function ResponsiveDialogFooter({
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & { showCloseButton?: boolean }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <NativeDrawerFooter className={className} {...props}>
        {children}
      </NativeDrawerFooter>
    );
  }

  return (
    <DialogFooter className={className} {...props}>
      {children}
    </DialogFooter>
  );
}

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <NativeDrawerTitle
        className={className}
        {...(props as React.ComponentProps<'h2'>)}
      />
    );
  }

  return <DialogTitle className={className} {...props} />;
}

// ---------------------------------------------------------------------------
// Description
// ---------------------------------------------------------------------------

function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <NativeDrawerDescription
        className={className}
        {...(props as React.ComponentProps<'p'>)}
      />
    );
  }

  return <DialogDescription className={className} {...props} />;
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
};
