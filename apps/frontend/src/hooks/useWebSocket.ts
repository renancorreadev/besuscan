import { useEffect, useRef, useState, useCallback } from 'react';
import { getWebSocketUrl } from '../services/api';

export interface WebSocketMessage {
  type: 'new_block' | 'new_transaction' | 'pending_transaction' | 'connection_status';
  data: any;
  timestamp?: number;
}

export interface UseWebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
  connect: () => void;
  disconnect: () => void;
  connectionAttempts: number;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  } = options;

  // Check if WebSocket is available
  const wsUrl = getWebSocketUrl();
  if (!wsUrl) {
    // WebSocket not available - return default values
    return {
      isConnected: false,
      isConnecting: false,
      lastMessage: null,
      sendMessage: () => console.warn('⚠️ WebSocket não está disponível'),
      connect: () => console.warn('⚠️ WebSocket não está disponível'),
      disconnect: () => {},
      connectionAttempts: 0,
    };
  }

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket já está conectado');
      return;
    }

    if (isConnecting) {
      console.log('🔌 WebSocket já está tentando conectar');
      return;
    }

    setIsConnecting(true);
    
    try {
      console.log(`🔌 Conectando WebSocket: ${wsUrl}`);
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('✅ WebSocket conectado');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionAttempts(0);
        onConnect?.();
      };

      ws.current.onclose = (event) => {
        console.log('🔌 WebSocket desconectado', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        onDisconnect?.();

        // Tentar reconectar se não foi fechamento intencional
        if (event.code !== 1000 && connectionAttempts < maxReconnectAttempts) {
          console.log(`🔄 Tentando reconectar em ${reconnectInterval}ms (tentativa ${connectionAttempts + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            connect();
          }, reconnectInterval);
        } else if (connectionAttempts >= maxReconnectAttempts) {
          console.log('❌ Máximo de tentativas de reconexão atingido');
        }
      };

      ws.current.onerror = (error) => {
        console.log('❌ Erro WebSocket:', error);
        setIsConnecting(false);
        onError?.(error);
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          // console.log('📨 Mensagem WebSocket recebida:', message);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error('❌ Erro ao parsear mensagem WebSocket:', error);
        }
      };
    } catch (error) {
      console.error('❌ Erro ao criar WebSocket:', error);
      setIsConnecting(false);
    }
  }, [connectionAttempts, maxReconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, onMessage, isConnecting]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (ws.current) {
      console.log('🔌 Desconectando WebSocket');
      ws.current.close(1000, 'Desconexão intencional');
      ws.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setConnectionAttempts(0);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      console.log('📤 Mensagem enviada:', message);
    } else {
      console.warn('⚠️ WebSocket não está conectado. Não é possível enviar mensagem.');
    }
  }, []);

  // Conectar automaticamente quando o hook é montado
  useEffect(() => {
    connect();

    // Cleanup na desmontagem
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close(1000, 'Componente desmontado');
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    connectionAttempts,
  };
}; 