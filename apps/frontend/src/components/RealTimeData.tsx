import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface Block {
  number: number;
  hash: string;
  miner: string;
  timestamp: number;
  tx_count: number;
  gas_used: number;
  gas_limit: number;
  size: number;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gas_price: string;
  status: string;
}

interface PendingTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gas_price: string;
}

const RealTimeData: React.FC = () => {
  const [latestBlocks, setLatestBlocks] = useState<Block[]>([]);
  const [latestTransactions, setLatestTransactions] = useState<Transaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [stats, setStats] = useState({
    totalBlocks: 0,
    totalTransactions: 0,
    pendingCount: 0,
  });

  const { isConnected, lastMessage, connectionAttempts } = useWebSocket({
    onMessage: (message) => {
      console.log('📡 Mensagem WebSocket recebida:', message);
      
      switch (message.type) {
        case 'new_block':
          const newBlock = message.data as Block;
          setLatestBlocks(prev => [newBlock, ...prev.slice(0, 9)]); // Manter apenas os 10 mais recentes
          setStats(prev => ({ ...prev, totalBlocks: prev.totalBlocks + 1 }));
          break;
          
        case 'new_transaction':
          const newTx = message.data as Transaction;
          setLatestTransactions(prev => [newTx, ...prev.slice(0, 19)]); // Manter apenas os 20 mais recentes
          setStats(prev => ({ ...prev, totalTransactions: prev.totalTransactions + 1 }));
          break;
          
        case 'pending_transaction':
          const pendingTx = message.data as PendingTransaction;
          setPendingTransactions(prev => [pendingTx, ...prev.slice(0, 9)]); // Manter apenas os 10 mais recentes
          setStats(prev => ({ ...prev, pendingCount: prev.pendingCount + 1 }));
          break;
      }
    },
    onConnect: () => {
      console.log('✅ Conectado ao WebSocket');
    },
    onDisconnect: () => {
      console.log('❌ Desconectado do WebSocket');
    },
    onError: (error) => {
      console.error('❌ Erro WebSocket:', error);
    },
  });

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const formatValue = (value: string) => {
    const eth = parseFloat(value) / 1e18;
    return eth.toFixed(4);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Status da Conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Status da Conexão WebSocket
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Conectado" : "Desconectado"}
            </Badge>
            {connectionAttempts > 0 && (
              <Badge variant="outline">
                Tentativas: {connectionAttempts}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Blocos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBlocks}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Transações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Transações Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Blocos Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Blocos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {latestBlocks.length === 0 ? (
              <p className="text-muted-foreground">Aguardando novos blocos...</p>
            ) : (
              latestBlocks.map((block, index) => (
                <div key={block.hash} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{block.number}</Badge>
                      <span className="font-mono text-sm">{formatHash(block.hash)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Minerador: {formatHash(block.miner)}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm">{block.tx_count} txs</div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimestamp(block.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transações Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {latestTransactions.length === 0 ? (
              <p className="text-muted-foreground">Aguardando novas transações...</p>
            ) : (
              latestTransactions.map((tx, index) => (
                <div key={tx.hash} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-mono text-sm">{formatHash(tx.hash)}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatHash(tx.from)} → {formatHash(tx.to)}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm font-medium">
                      {(() => {
                        // Se há input data, tentar decodificar parâmetros
                        if ((tx as any).input && (tx as any).input !== '0x') {
                          try {
                            let hexData = (tx as any).input;
                            
                            // Se é Base64, converter para hex
                            if (!hexData.startsWith('0x')) {
                              const binaryString = atob(hexData);
                              hexData = '0x' + Array.from(binaryString)
                                .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
                                .join('');
                            }

                            if (hexData.length >= 74) { // 10 chars method + 64 chars param
                              const paramData = hexData.slice(10, 74);
                              const value = parseInt(paramData, 16);
                              if (value > 0) {
                                return value.toLocaleString();
                              }
                            }
                          } catch (error) {
                            // Fallback para valor ETH
                          }
                        }
                        
                        return formatValue(tx.value) === '0.0000' ? '0 ETH' : `${formatValue(tx.value)} ETH`;
                      })()}
                    </div>
                    <Badge variant={tx.status === 'success' ? 'default' : 'destructive'}>
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transações Pendentes */}
      <Card>
        <CardHeader>
          <CardTitle>Mempool - Transações Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingTransactions.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma transação pendente...</p>
            ) : (
              pendingTransactions.map((tx, index) => (
                <div key={tx.hash} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="space-y-1">
                    <div className="font-mono text-sm">{formatHash(tx.hash)}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatHash(tx.from)} → {formatHash(tx.to)}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm font-medium">
                      {(() => {
                        // Se há input data, tentar decodificar parâmetros
                        if ((tx as any).input && (tx as any).input !== '0x') {
                          try {
                            let hexData = (tx as any).input;
                            
                            // Se é Base64, converter para hex
                            if (!hexData.startsWith('0x')) {
                              const binaryString = atob(hexData);
                              hexData = '0x' + Array.from(binaryString)
                                .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
                                .join('');
                            }

                            if (hexData.length >= 74) { // 10 chars method + 64 chars param
                              const paramData = hexData.slice(10, 74);
                              const value = parseInt(paramData, 16);
                              if (value > 0) {
                                return value.toLocaleString();
                              }
                            }
                          } catch (error) {
                            // Fallback para valor ETH
                          }
                        }
                        
                        return formatValue(tx.value) === '0.0000' ? '0 ETH' : `${formatValue(tx.value)} ETH`;
                      })()}
                    </div>
                    <Badge variant="outline">Pendente</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeData; 