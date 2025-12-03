import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants.js';

export function createSocket(token, userId, organizationId) {
  return io(SOCKET_URL, {
    auth: {
      token,
      userId,
      organizationId,
    },
    transports: ['websocket', 'polling'],
  });
}

