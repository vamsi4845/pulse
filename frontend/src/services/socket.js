import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants.js';

export function createSocket(userId, organizationId) {
  return io(SOCKET_URL, {
    auth: {
      userId,
      organizationId,
    },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    timeout: 20000,
    forceNew: false,
    autoConnect: true,
  });
}

