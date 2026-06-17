import { io, Socket } from 'socket.io-client';
import type {
  ElevateServerToClientEvents,
  ElevateClientToServerEvents,
} from '@varaperformance/core';
import { isNativeApp } from '@/lib/capacitor';
import { getAccessToken } from '@/lib/auth-tokens';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3000';
const ELEVATE_SOCKET_URL =
  import.meta.env.VITE_ELEVATE_SOCKET_URL ?? `${API_ORIGIN}/elevate`;

let socket: Socket<
  ElevateServerToClientEvents,
  ElevateClientToServerEvents
> | null = null;
let refCount = 0;

export function getElevateSocket(): Socket<
  ElevateServerToClientEvents,
  ElevateClientToServerEvents
> {
  if (!socket) {
    socket = io(ELEVATE_SOCKET_URL, {
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

export function connectElevateSocket() {
  refCount++;
  const sock = getElevateSocket();
  if (!sock.connected) {
    sock.connect();
  }
  return sock;
}

export function disconnectElevateSocket() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket?.connected) {
    socket.disconnect();
  }
}
