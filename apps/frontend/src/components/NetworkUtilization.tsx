import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Zap, 
  Users, 
  Clock, 
  TrendingUp, 
  Database,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import { besuApi, BesuNetworkMetrics } from '@/services/besu-api';
import { formatNumber, formatBlockTime } from '@/services/api';
import { useLatestBlock } from '@/stores/blockchainStore';

interface NetworkUtilizationProps {
  refreshInterval?: number; // em milissegundos
}

const NetworkUtilization: React.FC<NetworkUtilizationProps> = ({ 
  refreshInterval = 30000 // 30 segundos por padrão
}) => {
  const [metrics, setMetrics] = useState<BesuNetworkMetrics | null>(null);
  const [utilization, setUtilization] = useState<{
    averageGasUsage: number;
    averageBlockTime: number;
    transactionThroughput: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { block: latestBlock } = useLatestBlock();

  const fetchNetworkData = async () => {
    try {
      setError(null);
      
      const [networkMetrics, networkUtilization] = await Promise.all([
        besuApi.getNetworkMetrics(),
        besuApi.getNetworkUtilization(20) // Últimos 20 blocos
      ]);

      setMetrics(networkMetrics);
      setUtilization(networkUtilization);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Erro ao buscar dados da rede:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkData();
  }, []);

  // Reagir ao último bloco da store para atualizar métricas
  useEffect(() => {
    if (latestBlock) {
      fetchNetworkData();
    }
  }, [latestBlock?.number]);

  const getGasUsageColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSyncStatusBadge = () => {
    if (!metrics) return null;
    
    if (metrics.syncStatus.isSyncing) {
      const progress = (metrics.syncStatus.currentBlock / metrics.syncStatus.highestBlock) * 100;
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          <Database className="w-3 h-3 mr-1" />
          Sincronizando {progress.toFixed(1)}%
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="text-green-600 border-green-600">
        <Wifi className="w-3 h-3 mr-1" />
        Sincronizado
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Erro ao carregar métricas da rede</span>
          </div>
          <p className="text-sm text-red-500 mt-2">{error}</p>
          <button 
            onClick={fetchNetworkData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!metrics || !utilization) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header com status de sincronização */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Utilização da Rede
        </h2>
        <div className="flex items-center gap-3">
          {getSyncStatusBadge()}
          <span className="text-sm text-gray-500">
            Atualizado: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Grid de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Utilização de Gas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilização de Gas</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.gasUsagePercentage.toFixed(1)}%
            </div>
            <Progress 
              value={metrics.gasUsagePercentage} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Média dos últimos blocos: {utilization.averageGasUsage.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        {/* Pool de Transações */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pool de Transações</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(metrics.transactionPoolSize)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Transações pendentes
            </p>
          </CardContent>
        </Card>

        {/* Peers Conectados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peers Conectados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.peerCount}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Nós da rede
            </p>
          </CardContent>
        </Card>

        {/* Tempo Médio de Bloco */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo de Bloco</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBlockTime(utilization.averageBlockTime)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Tempo médio entre blocos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Throughput de Transações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Throughput de Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Transações por Bloco</span>
                  <span className="text-lg font-bold">
                    {utilization.transactionThroughput.toFixed(1)}
                  </span>
                </div>
                <Progress value={(utilization.transactionThroughput / 100) * 100} />
              </div>
              
              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">TPS Estimado</span>
                    <div className="font-medium">
                      {(utilization.transactionThroughput / utilization.averageBlockTime).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gas Price</span>
                    <div className="font-medium">
                      {(parseInt(metrics.gasPrice) / 1e9).toFixed(2)} Gwei
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status de Sincronização */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Status de Sincronização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Bloco Atual</span>
                <span className="font-mono text-lg">
                  #{formatNumber(metrics.syncStatus.currentBlock)}
                </span>
              </div>
              
              {metrics.syncStatus.isSyncing && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Progresso</span>
                    <span className="text-sm">
                      {((metrics.syncStatus.currentBlock / metrics.syncStatus.highestBlock) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <Progress 
                    value={(metrics.syncStatus.currentBlock / metrics.syncStatus.highestBlock) * 100} 
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Bloco mais alto: #{formatNumber(metrics.syncStatus.highestBlock)}
                  </p>
                </div>
              )}
              
              {!metrics.syncStatus.isSyncing && (
                <div className="flex items-center gap-2 text-green-600">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm font-medium">Totalmente sincronizado</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NetworkUtilization; 