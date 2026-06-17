import { io, Socket } from 'socket.io-client';
import type {
  NotificationServerToClientEvents,
  NotificationClientToServerEvents,
} from '@varaperformance/core';
import { isNativeApp } from '@/lib/capacitor';
import { getAccessToken } from '@/lib/auth-tokens';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3000';
const NOTIFICATION_SOCKET_URL =
  import.meta.env.VITE_NOTIFICATION_SOCKET_URL ?? `${API_ORIGIN}/notifications`;

let socket: Socket<
  NotificationServerToClientEvents,
  NotificationClientToServerEvents
> | null = null;
let refCount = 0;

export function getNotificationSocket(): Socket<
  NotificationServerToClientEvents,
  NotificationClientToServerEvents
> {
  if (!socket) {
    socket = io(NOTIFICATION_SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      ...(isNativeApp() && {
        auth: (cb) => cb({ token: getAccessToken() ?? undefined }),
      }),
    });
  }
  return socket;
}

export function connectNotificationSocket() {
  refCount++;
  const sock = getNotificationSocket();
  if (!sock.connected) {
    sock.connect();
  }
  return sock;
}

export function disconnectNotificationSocket() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket?.connected) {
    socket.disconnect();
  }
}
