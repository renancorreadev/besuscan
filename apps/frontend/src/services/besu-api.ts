// Serviço para integração com Hyperledger Besu JSON-RPC API
export interface BesuNetworkMetrics {
  blockProcessingTime: number;
  gasUsagePercentage: number;
  transactionPoolSize: number;
  peerCount: number;
  syncStatus: {
    isSyncing: boolean;
    currentBlock: number;
    highestBlock: number;
  };
  gasPrice: string;
  networkHashrate?: string;
}

export interface BesuBlockData {
  number: string;
  hash: string;
  timestamp: string;
  gasUsed: string;
  gasLimit: string;
  transactions: string[];
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  size: string;
}

export interface BesuTransactionPoolStatus {
  pending: number;
  queued: number;
}

class BesuApiService {
  private baseUrl: string;
  private requestId = 1;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async makeRpcCall(method: string, params: any[] = []): Promise<any> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: this.requestId++,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    return data.result;
  }

  // Obter informações do bloco
  async getBlockByNumber(blockNumber: string | number = 'latest'): Promise<BesuBlockData> {
    const blockNumberHex = typeof blockNumber === 'number' 
      ? `0x${blockNumber.toString(16)}` 
      : blockNumber;
    
    return await this.makeRpcCall('eth_getBlockByNumber', [blockNumberHex, false]);
  }

  // Obter status do pool de transações
  async getTransactionPoolStatus(): Promise<BesuTransactionPoolStatus> {
    return await this.makeRpcCall('txpool_status', []);
  }

  // Obter número de peers conectados
  async getPeerCount(): Promise<number> {
    const result = await this.makeRpcCall('net_peerCount', []);
    return parseInt(result, 16);
  }

  // Obter status de sincronização
  async getSyncStatus(): Promise<any> {
    return await this.makeRpcCall('eth_syncing', []);
  }

  // Obter preço atual do gas
  async getGasPrice(): Promise<string> {
    return await this.makeRpcCall('eth_gasPrice', []);
  }

  // Obter informações detalhadas dos peers
  async getPeersInfo(): Promise<any[]> {
    return await this.makeRpcCall('admin_peers', []);
  }

  // Obter métricas consolidadas da rede
  async getNetworkMetrics(): Promise<BesuNetworkMetrics> {
    try {
      const [
        latestBlock,
        txPoolStatus,
        peerCount,
        syncStatus,
        gasPrice
      ] = await Promise.all([
        this.getBlockByNumber('latest'),
        this.getTransactionPoolStatus(),
        this.getPeerCount(),
        this.getSyncStatus(),
        this.getGasPrice()
      ]);

      const gasUsed = parseInt(latestBlock.gasUsed, 16);
      const gasLimit = parseInt(latestBlock.gasLimit, 16);
      const gasUsagePercentage = (gasUsed / gasLimit) * 100;

      return {
        blockProcessingTime: 0, // Seria necessário calcular baseado em timestamps
        gasUsagePercentage,
        transactionPoolSize: txPoolStatus.pending + txPoolStatus.queued,
        peerCount,
        syncStatus: {
          isSyncing: syncStatus !== false,
          currentBlock: syncStatus ? parseInt(syncStatus.currentBlock, 16) : parseInt(latestBlock.number, 16),
          highestBlock: syncStatus ? parseInt(syncStatus.highestBlock, 16) : parseInt(latestBlock.number, 16),
        },
        gasPrice: parseInt(gasPrice, 16).toString(),
      };
    } catch (error) {
      console.error('Erro ao obter métricas da rede:', error);
      throw error;
    }
  }

  // Calcular utilização da rede baseada em múltiplos blocos
  async getNetworkUtilization(blockCount: number = 10): Promise<{
    averageGasUsage: number;
    averageBlockTime: number;
    transactionThroughput: number;
  }> {
    try {
      const latestBlockNumber = parseInt((await this.getBlockByNumber('latest')).number, 16);
      const blocks: BesuBlockData[] = [];

      // Buscar os últimos N blocos
      for (let i = 0; i < blockCount; i++) {
        const blockNumber = latestBlockNumber - i;
        const block = await this.getBlockByNumber(blockNumber);
        blocks.push(block);
      }

      // Calcular métricas
      const totalGasUsed = blocks.reduce((sum, block) => sum + parseInt(block.gasUsed, 16), 0);
      const totalGasLimit = blocks.reduce((sum, block) => sum + parseInt(block.gasLimit, 16), 0);
      const averageGasUsage = (totalGasUsed / totalGasLimit) * 100;

      // Calcular tempo médio entre blocos
      const timestamps = blocks.map(block => parseInt(block.timestamp, 16));
      const timeDiffs = [];
      for (let i = 0; i < timestamps.length - 1; i++) {
        timeDiffs.push(timestamps[i] - timestamps[i + 1]);
      }
      const averageBlockTime = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;

      // Calcular throughput de transações
      const totalTransactions = blocks.reduce((sum, block) => sum + block.transactions.length, 0);
      const transactionThroughput = totalTransactions / blockCount;

      return {
        averageGasUsage,
        averageBlockTime,
        transactionThroughput,
      };
    } catch (error) {
      console.error('Erro ao calcular utilização da rede:', error);
      throw error;
    }
  }
}

// Instância do serviço (configurar com a URL do seu nó Besu)
export const besuApi = new BesuApiService(
  import.meta.env.VITE_BESU_RPC_URL || 'http://localhost:8545'
);

export default BesuApiService; 