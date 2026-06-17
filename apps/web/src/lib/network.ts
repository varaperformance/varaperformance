import { Network, type ConnectionStatus } from '@capacitor/network';
import { isNativeApp } from '@/lib/capacitor';

type NetworkListener = (connected: boolean) => void;

const listeners = new Set<NetworkListener>();
let lastStatus: boolean | null = null;

function notifyListeners(connected: boolean) {
  if (lastStatus === connected) return;
  lastStatus = connected;
  listeners.forEach((fn) => fn(connected));
}

/**
 * Initialise the network listener.
 * On native platforms this delegates to `@capacitor/network`;
 * on the web it uses the standard `navigator.onLine` + events.
 */
export async function initNetworkListener(): Promise<void> {
  if (isNativeApp()) {
    const status: ConnectionStatus = await Network.getStatus();
    lastStatus = status.connected;

    await Network.addListener('networkStatusChange', (s: ConnectionStatus) => {
      notifyListeners(s.connected);
    });
  } else {
    lastStatus = navigator.onLine;

    window.addEventListener('online', () => notifyListeners(true));
    window.addEventListener('offline', () => notifyListeners(false));
  }
}

/**
 * Subscribe to connectivity changes. Returns an unsubscribe fn.
 */
export function onNetworkChange(fn: NetworkListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Current connectivity state (`true === online`). Falls back to browser API.
 */
export function isOnline(): boolean {
  if (lastStatus !== null) return lastStatus;
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
