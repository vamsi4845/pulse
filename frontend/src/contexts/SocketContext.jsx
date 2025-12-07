import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createSocket } from '../services/socket.js';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
        reconnectAttemptsRef.current = 0;
      }
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const newSocket = createSocket(
      user.id,
      user.organizationId
    );

    const handleConnect = () => {
      console.log('Socket connected');
      setConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    const handleDisconnect = (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
      
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    };

    const handleConnectError = (error) => {
      reconnectAttemptsRef.current += 1;
      console.error('Socket connection error:', error.message);
      setConnected(false);
      
      if (error.message.includes('Invalid namespace') || 
          error.message.includes('Authentication') ||
          reconnectAttemptsRef.current >= 3) {
        console.log('Stopping socket reconnection attempts');
        newSocket.disconnect();
        socketRef.current = null;
        setSocket(null);
        reconnectAttemptsRef.current = 0;
      }
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
        reconnectAttemptsRef.current = 0;
      }
    };
  }, [isAuthenticated, user]);

  const value = {
    socket,
    connected,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

