/**
 * Responsive Dialog — renders a react-modal-sheet bottom-sheet on mobile,
 * standard Radix Dialog on desktop. Re-exports with original names
 * so every consumer gets responsive behaviour automatically.
 */
export { DialogOverlay, DialogPortal } from '@/components/ui/dialog-base';

export {
  ResponsiveDialog as Dialog,
  ResponsiveDialogTrigger as DialogTrigger,
  ResponsiveDialogClose as DialogClose,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogFooter as DialogFooter,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
} from '@/components/ui/responsive-dialog';
