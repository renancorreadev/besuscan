import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { testRpcConnection, getRpcUrls } from '@/config/rpc';

export const RpcStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      setIsLoading(true);
      try {
        // Usar a mesma lógica do getRpcUrls()
        const rpcUrls = getRpcUrls();
        const primaryUrl = rpcUrls.default.http[0];
        
        // Testar conexão com o endpoint primário
        const connected = await testRpcConnection(primaryUrl);
        setIsConnected(connected);
      } catch (error) {
        console.error('Failed to check RPC connection:', error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Verificar conexão inicial
    checkConnection();

    // Verificar periodicamente (a cada 30 segundos)
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Badge variant="secondary" className="gap-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
        Verificando RPC...
      </Badge>
    );
  }

  if (isConnected === true) {
    return (
      <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
        <Wifi className="w-3 h-3" />
        RPC Conectado
      </Badge>
    );
  }

  if (isConnected === false) {
    return (
      <Badge variant="destructive" className="gap-1">
        <WifiOff className="w-3 h-3" />
        RPC Desconectado
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1">
      <AlertCircle className="w-3 h-3" />
      Status Desconhecido
    </Badge>
  );
}; 