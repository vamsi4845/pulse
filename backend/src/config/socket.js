import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.trim().split('=');
      if (parts.length === 2) {
        cookies[parts[0]] = decodeURIComponent(parts[1]);
      }
    });
  }
  return cookies;
}

export function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth.token;
      
      if (!token) {
        const cookieHeader = socket.handshake.headers.cookie;
        if (cookieHeader) {
          const cookies = parseCookies(cookieHeader);
          token = cookies.token;
        }
      }
      
      if (!token) {
        const error = new Error('Authentication error: No token provided');
        error.data = { type: 'AUTH_ERROR' };
        return next(error);
      }
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id.toString();
        
        const { User } = await import('../models/User.js');
        const user = await User.findById(decoded.id).select('organizationId');
        
        if (user && user.organizationId) {
          socket.organizationId = user.organizationId.toString();
        }
        
        next();
      } catch (jwtError) {
        console.error('Socket JWT verification error:', jwtError.message);
        const error = new Error('Authentication error: Invalid token');
        error.data = { type: 'AUTH_ERROR' };
        next(error);
      }
    } catch (error) {
      console.error('Socket middleware error:', error);
      const authError = new Error('Authentication error: Failed to authenticate');
      authError.data = { type: 'AUTH_ERROR' };
      next(authError);
    }
  });

  io.on('connection', (socket) => {
    if (!socket.userId) {
      console.error('Socket connected without userId');
      socket.disconnect();
      return;
    }

    console.log(`User connected: ${socket.userId}`);
    
    if (socket.organizationId) {
      socket.join(`org:${socket.organizationId}`);
    }
    socket.join(`user:${socket.userId}`);

    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.userId}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  io.engine.on('connection_error', (err) => {
    console.error('Socket.IO connection error:', err);
  });

  return io;
}

