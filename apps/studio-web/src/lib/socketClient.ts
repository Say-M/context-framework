import { io, type Socket } from "socket.io-client";
import { API_URL, getAccessToken } from "./api-client";

let socket: Socket | null = null;

/**
 * Lazily-created singleton — not connected until something actually needs
 * it (`autoConnect: false`). `auth` is a function, not a static object, so
 * every (re)connection attempt reads the current token fresh rather than a
 * stale snapshot from whenever this module first ran.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      path: "/socket.io/",
      autoConnect: false,
      auth: (cb) => cb({ token: getAccessToken() }),
    });
  }
  return socket;
}
