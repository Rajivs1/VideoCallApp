import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (serverUrl = null) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);

  // Determine server URL based on environment
  const getServerUrl = useCallback(() => {
    // If server URL is provided directly, use it
    if (serverUrl) return serverUrl;
    
    // Check for environment variable
    if (process.env.REACT_APP_SERVER_URL) {
      return process.env.REACT_APP_SERVER_URL;
    }
    
    // Check if we're in development or production
    if (process.env.NODE_ENV === 'development') {
      const hostname = window.location.hostname;
      const serverPort = '3001';
      
      // If accessing via IP, use the same IP for socket
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return `http://${hostname}:${serverPort}`;
      }
      
      // Default to localhost for local development
      return `http://localhost:${serverPort}`;
    }
    
    // For production, use the same origin
    return window.location.origin;
  }, [serverUrl]);

  useEffect(() => {
    const serverURL = getServerUrl();
    console.log('Connecting to server:', serverURL);

    // Socket.io configuration
    const socketConfig = {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      upgrade: true,
      // Increase buffer size for WebRTC signaling
      maxHttpBufferSize: 1e8
    };

    // Create socket connection
    const newSocket = io(serverURL, socketConfig);
    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ Connected to server:', newSocket.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      setIsConnected(false);
      setConnectionError(`Connection lost: ${reason}`);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setIsConnected(false);
      setConnectionError(`Connection failed: ${error.message || error}`);
    });

    // Error handler
    newSocket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      setConnectionError(`Server error: ${error.message || error}`);
    });

    // WebRTC-specific handlers
    newSocket.on('webrtc-config', (config) => {
      console.log('📡 Received WebRTC config:', config);
    });

    // Connection test
    newSocket.on('connection-test-response', (data) => {
      console.log('📡 Connection test successful:', data);
    });

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up socket connection');
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
      setSocket(null);
      setIsConnected(false);
    };
  }, [getServerUrl]);

  // Emit function with connection check
  const emit = useCallback((event, data) => {
    if (socketRef.current && isConnected) {
      console.log(`📤 Emitting ${event}:`, data);
      socketRef.current.emit(event, data);
      return true;
    } else {
      console.warn(`⚠️ Cannot emit ${event}: Socket not connected`);
      return false;
    }
  }, [isConnected]);

  // On function for event listeners
  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      return true;
    }
    return false;
  }, []);

  // Off function for removing event listeners
  const off = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
      return true;
    }
    return false;
  }, []);

  // Test connection function
  const testConnection = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('connection-test', { timestamp: Date.now() });
      return true;
    }
    return false;
  }, [isConnected]);

  return {
    socket,
    isConnected,
    connectionError,
    emit,
    on,
    off,
    testConnection
  };
};