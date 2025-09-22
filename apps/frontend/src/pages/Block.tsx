import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Copy, Box, Clock, Activity, Zap, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useGlassToast, GlassToastContainer } from '@/components/ui/glass-toast';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { 
  apiService, 
  Block as BlockType, 
  formatHash, 
  formatTimestamp, 
  formatNumber 
} from '@/services/api';
import { useLatestBlock } from '@/stores/blockchainStore';

const Block = () => {
  const { number } = useParams<{ number: string }>();
  const navigate = useNavigate();
  const [blockData, setBlockData] = useState<BlockType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const [lastCheckedBlock, setLastCheckedBlock] = useState<number | null>(null);
  const { toast } = useToast();
  const { toasts, addToast, removeToast } = useGlassToast();
  const { block: latestBlock } = useLatestBlock();

  // Verificar novos blocos baseado na store
  const pollForUpdates = useCallback(async () => {
    if (!blockData || !latestBlock) return;

    try {
      const latestBlockNumber = latestBlock.number;
      
      // Se há novos blocos e não notificamos ainda
      if (lastCheckedBlock && latestBlockNumber > lastCheckedBlock && latestBlockNumber > blockData.number) {
        addToast({
          title: "🆕 Novo Bloco Disponível",
          description: `Bloco #${latestBlockNumber} foi minerado. Clique para visualizar.`,
          type: 'block',
          duration: 6000,
        });
      }
      
      setLastCheckedBlock(latestBlockNumber);
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
    }
  }, [blockData, latestBlock, lastCheckedBlock, addToast]);

  // Reagir ao último bloco da store
  useEffect(() => {
    if (latestBlock && latestBlock.number !== lastCheckedBlock) {
      pollForUpdates();
    }
  }, [latestBlock?.number]);

  // Carregar dados do bloco via API REST
  useEffect(() => {
    if (number) {
      loadBlockData(number);
    }
  }, [number]);

  const loadBlockData = async (blockIdentifier: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getBlock(blockIdentifier);
      
      if (response.success) {
        setBlockData(response.data);
      } else {
        throw new Error('Falha ao carregar dados do bloco');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast({
        title: "Erro",
        description: `Falha ao carregar bloco: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência",
      duration: 2000,
    });
  };

  const navigateBlock = (direction: 'prev' | 'next') => {
    if (!blockData) return;
    
    const currentBlock = blockData.number;
    const newBlock = direction === 'prev' ? currentBlock - 1 : currentBlock + 1;
    
    if (newBlock >= 0) {
      navigate(`/block/${newBlock}`);
    }
  };

  const formatGasUsedPercentage = (gasUsed: number, gasLimit: number): string => {
    const percentage = ((gasUsed / gasLimit) * 100).toFixed(2);
    return `${percentage}%`;
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <main className="container mx-auto px-6 py-8 max-w-6xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Carregando dados do bloco...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !blockData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <main className="container mx-auto px-6 py-8 max-w-6xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Box className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Bloco não encontrado
                </h2>
                <p className="text-red-600 dark:text-red-400 mb-4">
                  {error?.includes('404') 
                    ? `O bloco #${number} não existe ou ainda não foi minerado.`
                    : error || 'Bloco não encontrado'
                  }
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Verifique se o número do bloco está correto ou tente acessar um bloco mais recente.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => number && loadBlockData(number)} 
                  variant="outline"
                  className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Tentar Novamente
                </Button>
                <Button 
                  onClick={() => navigate('/blocks')} 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Ver Blocos Recentes
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      
      <main className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Box className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Detalhes do Bloco</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Informações detalhadas sobre o bloco #{blockData.number}
              </p>
            </div>
            
            {/* Status WebSocket */}
            <Badge variant={isPolling ? "default" : "destructive"} className="ml-2">
              {isPolling ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  <span className="text-gray-900 dark:text-white">Atualizando...</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  <span className="text-gray-900 dark:text-white">Offline</span>
                </>
              )}
            </Badge>
          </div>
          <Button variant="outline" size="sm" className="border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 text-gray-900 dark:text-white">
            <span>🔧</span> API
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-900 dark:text-white">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="consensus" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-900 dark:text-white">
              Info Consenso
            </TabsTrigger>
            <TabsTrigger value="mev" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-900 dark:text-white">
              Info MEV
            </TabsTrigger>
            <TabsTrigger value="blob" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-gray-900 dark:text-white">
              Info Blob
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Block Height */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Box className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-medium">Altura do Bloco:</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigateBlock('prev')}
                        disabled={blockData.number <= 0}
                        className="p-2 h-8 w-8 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 text-gray-900 dark:text-white"
                      >
                        <ChevronLeft className="h-4 w-4 text-gray-900 dark:text-white" />
                      </Button>
                      <span className="font-mono text-xl font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
                        #{blockData.number}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigateBlock('next')}
                        className="p-2 h-8 w-8 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 text-gray-900 dark:text-white"
                      >
                        <ChevronRight className="h-4 w-4 text-gray-900 dark:text-white" />
                      </Button>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="font-medium">Timestamp:</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-900 dark:text-white font-medium">
                        🕐 {formatTimestamp(blockData.timestamp)} ({typeof blockData.timestamp === 'string' 
                          ? new Date(blockData.timestamp).toLocaleString()
                          : new Date(Number(blockData.timestamp) * 1000).toLocaleString()})
                      </span>
                    </div>
                  </div>

                  {/* Transactions */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <span className="font-medium">Transações:</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a href={`/txs?block=${blockData.number}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
                        {blockData.tx_count} transações
                      </a>
                      <span className="text-gray-900 dark:text-white">neste bloco</span>
                    </div>
                  </div>

                  {/* Gas Used */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="font-medium">Gas Usado:</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-900 dark:text-white font-medium">{formatNumber(blockData.gas_used)}</span>
                      <span className="text-gray-500 dark:text-gray-400">({formatGasUsedPercentage(blockData.gas_used, blockData.gas_limit)})</span>
                      <div className="w-20 h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500 rounded-full transition-all duration-300"
                          style={{ width: formatGasUsedPercentage(blockData.gas_used, blockData.gas_limit) }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Gas Limit */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="font-medium">Limite de Gas:</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-900 dark:text-white font-medium">{formatNumber(blockData.gas_limit)}</span>
                    </div>
                  </div>

                  {/* Miner */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                      <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                        <span className="text-yellow-600 dark:text-yellow-400 text-sm">⛏️</span>
                      </div>
                      <span className="font-medium">Minerador:</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
                        {formatHash(blockData.miner)}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(blockData.miner)}
                        className="p-2 h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-900 dark:text-white"
                      >
                        <Copy className="h-4 w-4 text-gray-900 dark:text-white" />
                      </Button>
                    </div>
                  </div>

                  {/* More Details Toggle */}
                  <div className="pt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowMoreDetails(!showMoreDetails)}
                      className="border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 text-gray-900 dark:text-white"
                    >
                      {showMoreDetails ? '- Mostrar Menos Detalhes' : '+ Mostrar Mais Detalhes'}
                    </Button>
                  </div>

                  {/* Additional Details (when expanded) */}
                  {showMoreDetails && (
                    <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">#</span>
                          </div>
                          <span className="font-medium">Hash:</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded break-all">
                            {blockData.hash}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyToClipboard(blockData.hash)}
                            className="p-2 h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-900 dark:text-white"
                          >
                            <Copy className="h-4 w-4 text-gray-900 dark:text-white" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <span className="text-sm text-gray-900 dark:text-white">↖</span>
                          </div>
                          <span className="font-medium">Hash do Bloco Pai:</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a href={`/block/${blockData.number - 1}`} className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded transition-colors break-all">
                            {blockData.parent_hash}
                          </a>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyToClipboard(blockData.parent_hash)}
                            className="p-2 h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-900 dark:text-white"
                          >
                            <Copy className="h-4 w-4 text-gray-900 dark:text-white" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <span className="text-sm text-gray-900 dark:text-white">📏</span>
                          </div>
                          <span className="font-medium">Tamanho:</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-900 dark:text-white font-medium">
                            {formatBytes(blockData.size)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <span className="text-sm text-gray-900 dark:text-white">💰</span>
                          </div>
                          <span className="font-medium">Taxa Base por Gas:</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-900 dark:text-white font-medium">
                            {blockData.base_fee_per_gas} ETH
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <span className="text-sm text-gray-900 dark:text-white">🔢</span>
                          </div>
                          <span className="font-medium">Nonce:</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
                            {blockData.nonce}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consensus">
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="p-8">
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-500 dark:text-gray-400" />
                  <p className="text-lg text-gray-900 dark:text-white">Informações de consenso seriam exibidas aqui</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mev">
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="p-8">
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-500 dark:text-gray-400" />
                  <p className="text-lg text-gray-900 dark:text-white">Informações MEV seriam exibidas aqui</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blob">
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="p-8">
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                  <Box className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-500 dark:text-gray-400" />
                  <p className="text-lg text-gray-900 dark:text-white">Informações de blob seriam exibidas aqui</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
      
              {/* Glass Toast Container */}
        <GlassToastContainer 
          toasts={toasts} 
          onClose={removeToast} 
          position="top-right" 
        />
    </div>
  );
};

export default Block;
