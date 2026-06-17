/**
 * Bottom-sheet drawer for Capacitor native apps, powered by react-modal-sheet.
 *
 * Wraps react-modal-sheet (Motion-based) to get proper iOS scroll locking,
 * drag-to-dismiss, keyboard avoidance, and scrollable content — all handled
 * by a battle-tested library instead of hand-rolled touch code.
 *
 * Exports the same API that responsive-dialog.tsx / responsive-alert-dialog.tsx
 * consume so the rest of the codebase is unaffected.
 */
import * as React from 'react';
import { Sheet } from 'react-modal-sheet';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface NativeDrawerContextValue {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const NativeDrawerContext = React.createContext<NativeDrawerContextValue>({
  open: false,
  onClose: () => {},
  onOpen: () => {},
});

function useNativeDrawer() {
  return React.useContext(NativeDrawerContext);
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

interface NativeDrawerRootProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function NativeDrawerRoot({
  open = false,
  onOpenChange,
  children,
}: NativeDrawerRootProps) {
  const onClose = React.useCallback(
    () => onOpenChange?.(false),
    [onOpenChange],
  );

  const onOpen = React.useCallback(
    () => onOpenChange?.(true),
    [onOpenChange],
  );

  return (
    <NativeDrawerContext.Provider value={{ open, onClose, onOpen }}>
      {children}
    </NativeDrawerContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

interface NativeDrawerTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const NativeDrawerTrigger = React.forwardRef<
  HTMLButtonElement,
  NativeDrawerTriggerProps
>(function NativeDrawerTrigger({ asChild, children, onClick, ...props }, ref) {
  const { onOpen } = useNativeDrawer();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    onOpen();
  };

  if (asChild && React.isValidElement(children)) {
    return (
      <Slot.Root ref={ref} onClick={handleClick} {...props}>
        {children}
      </Slot.Root>
    );
  }
  return (
    <button ref={ref} onClick={handleClick} {...props}>
      {children}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Close
// ---------------------------------------------------------------------------

interface NativeDrawerCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const NativeDrawerClose = React.forwardRef<
  HTMLButtonElement,
  NativeDrawerCloseProps
>(function NativeDrawerClose({ asChild, children, onClick, ...props }, ref) {
  const { onClose } = useNativeDrawer();
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    onClose();
  };
  if (asChild && React.isValidElement(children)) {
    return (
      <Slot.Root ref={ref} onClick={handleClick} {...props}>
        {children}
      </Slot.Root>
    );
  }
  return (
    <button ref={ref} onClick={handleClick} {...props}>
      {children}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Content (the actual sheet — powered by react-modal-sheet)
// ---------------------------------------------------------------------------

interface NativeDrawerContentProps {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

function NativeDrawerContent({
  className,
  children,
}: NativeDrawerContentProps) {
  const { open, onClose } = useNativeDrawer();

  return (
    <Sheet isOpen={open} onClose={onClose} detent="content" unstyled>
      <Sheet.Container
        className={cn(
          'rounded-t-2xl border bg-background max-h-[85vh]!',
          className,
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <Sheet.Header className="flex justify-center py-3">
          <div className="h-1.5 w-12 rounded-full bg-muted" />
        </Sheet.Header>
        <Sheet.Content disableDrag className="px-6 pb-6 pt-2">
          {children}
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop className="bg-black/50!" onTap={onClose} />
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Semantic sub-components (pass-through, no special behavior needed)
// ---------------------------------------------------------------------------

function NativeDrawerHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('grid gap-1.5 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function NativeDrawerFooter({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'sticky bottom-0 flex flex-col gap-2 border-t bg-background pt-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function NativeDrawerTitle({
  className,
  ...props
}: React.ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  );
}

function NativeDrawerDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props} />
  );
}

export {
  NativeDrawerRoot,
  NativeDrawerTrigger,
  NativeDrawerClose,
  NativeDrawerContent,
  NativeDrawerHeader,
  NativeDrawerFooter,
  NativeDrawerTitle,
  NativeDrawerDescription,
};
