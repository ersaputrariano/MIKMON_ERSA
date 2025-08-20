import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url: string, token: string | null) {
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!token) {
      setConnectionStatus('disconnected');
      return;
    }

    try {
      setConnectionStatus('connecting');
      const wsUrl = `${url}?token=${token}`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setConnectionStatus('connected');
        console.log('WebSocket connected');
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.current.onmessage = (event) => {
        setLastMessage(event.data);
      };

      ws.current.onclose = (event) => {
        setConnectionStatus('disconnected');
        console.log('WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);

        // Don't auto-reconnect if the server closed the connection for a specific reason (e.g., bad auth)
        // Normal closure (1000) or going away (1001) might be reconnectable.
        // Abnormal closure (1006) is what we often see for network issues.
        if (event.code !== 1000 && event.code !== 1005) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, 3000);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
        // The onclose event will usually fire after an error, which will handle reconnect logic.
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionStatus('disconnected');
    }
  }, [url, token]);

  useEffect(() => {
    if (token) {
      connect();
    } else {
      setConnectionStatus('disconnected');
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        // Prevent the "WebSocket is closed before the connection is established" error
        // by removing the onclose handler before closing.
        ws.current.onclose = null;
        ws.current.close();
        ws.current = null;
      }
    };
  }, [token, connect]);

  const sendMessage = (message: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(message);
    }
  };

  return {
    lastMessage,
    connectionStatus,
    sendMessage
  };
}