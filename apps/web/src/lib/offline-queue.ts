import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from '@/lib/capacitor';
import { onNetworkChange, isOnline } from '@/lib/network';
import api from '@/lib/api';

interface QueuedMutation {
  id: string;
  method: 'post' | 'put' | 'patch' | 'delete';
  url: string;
  data?: unknown;
  createdAt: number;
}

const QUEUE_KEY = 'vara-offline-mutation-queue';

async function loadQueue(): Promise<QueuedMutation[]> {
  if (!isNativeApp()) return [];
  const { value } = await Preferences.get({ key: QUEUE_KEY });
  if (!value) return [];
  try {
    return JSON.parse(value) as QueuedMutation[];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedMutation[]): Promise<void> {
  if (!isNativeApp()) return;
  await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(queue) });
}

export async function enqueueMutation(
  method: QueuedMutation['method'],
  url: string,
  data?: unknown,
): Promise<void> {
  const queue = await loadQueue();
  queue.push({
    id: crypto.randomUUID(),
    method,
    url,
    data,
    createdAt: Date.now(),
  });
  await saveQueue(queue);
}

async function replayQueue(): Promise<void> {
  const queue = await loadQueue();
  if (queue.length === 0) return;

  const failed: QueuedMutation[] = [];

  for (const mutation of queue) {
    try {
      await api[mutation.method](
        mutation.url,
        mutation.data as Record<string, unknown>,
      );
    } catch {
      // Keep permanently failed mutations for one retry cycle only
      // Discard mutations older than 24 hours
      if (Date.now() - mutation.createdAt < 24 * 60 * 60 * 1000) {
        failed.push(mutation);
      }
    }
  }

  await saveQueue(failed);
}

let initialized = false;

export function initOfflineQueue(): void {
  if (initialized || !isNativeApp()) return;
  initialized = true;

  // Replay on reconnect
  onNetworkChange((connected) => {
    if (connected) {
      void replayQueue();
    }
  });

  // Replay any pending mutations from a previous session if currently online
  if (isOnline()) {
    void replayQueue();
  }
}
