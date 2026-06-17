import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '@varaperformance/core';
import { isNativeApp } from '@/lib/capacitor';
import { getAccessToken } from '@/lib/auth-tokens';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3000';
const MESSAGING_SOCKET_URL =
  import.meta.env.VITE_MESSAGING_SOCKET_URL ?? `${API_ORIGIN}/messaging`;

// Socket singleton
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getMessagingSocket(): Socket<
  ServerToClientEvents,
  ClientToServerEvents
> {
  if (!socket) {
    socket = io(MESSAGING_SOCKET_URL, {
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

export function connectMessagingSocket() {
  const sock = getMessagingSocket();
  if (!sock.connected) {
    sock.connect();
  }
  return sock;
}

export function disconnectMessagingSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}
