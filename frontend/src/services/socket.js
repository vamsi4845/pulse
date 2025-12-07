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
  });
}

