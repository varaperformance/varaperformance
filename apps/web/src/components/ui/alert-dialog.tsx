/**
 * Responsive AlertDialog — renders a react-modal-sheet action-sheet on mobile,
 * standard Radix AlertDialog on desktop. Re-exports with original names
 * so every consumer gets responsive behaviour automatically.
 */
export {
  AlertDialogPortal,
  AlertDialogOverlay,
} from '@/components/ui/alert-dialog-base';

export {
  ResponsiveAlertDialog as AlertDialog,
  ResponsiveAlertDialogTrigger as AlertDialogTrigger,
  ResponsiveAlertDialogContent as AlertDialogContent,
  ResponsiveAlertDialogHeader as AlertDialogHeader,
  ResponsiveAlertDialogFooter as AlertDialogFooter,
  ResponsiveAlertDialogTitle as AlertDialogTitle,
  ResponsiveAlertDialogDescription as AlertDialogDescription,
  ResponsiveAlertDialogAction as AlertDialogAction,
  ResponsiveAlertDialogCancel as AlertDialogCancel,
} from '@/components/ui/responsive-alert-dialog';
