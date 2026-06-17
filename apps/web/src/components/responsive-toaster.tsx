import { Toaster } from 'sonner';
import { useIsMobile } from '@/hooks/use-is-mobile';

export function ResponsiveToaster() {
  const isMobile = useIsMobile();
  return (
    <Toaster
      richColors
      position={isMobile ? 'top-center' : 'bottom-right'}
      closeButton
    />
  );
}
