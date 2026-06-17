import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { onNetworkChange, isOnline } from '@/lib/network';

export function OfflineBanner() {
  const [online, setOnline] = useState(isOnline);

  useEffect(() => {
    return onNetworkChange(setOnline);
  }, []);

  if (online) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-60 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-md">
      <WifiOff className="h-4 w-4" />
      You are offline — some features may be unavailable
    </div>
  );
}
