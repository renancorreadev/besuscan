import { TransactionSummary, SmartContract, apiService, formatTimeAgo } from '@/services/api';

// Função para decodificar input da transação (versão básica)
export const decodeTransactionInput = (input?: string): string => {
  if (!input || input === '0x' || input.length < 10) {
    return 'Transfer';
  }

  const methodId = input.slice(0, 10);
  
  // Mapeamento de method IDs conhecidos
  const knownMethods: { [key: string]: string } = {
    '0xa9059cbb': 'transfer',
    '0x23b872dd': 'transferFrom',
    '0x095ea7b3': 'approve',
    '0x40c10f19': 'mint',
    '0x42966c68': 'burn',
    '0xa0712d68': 'mint',
    '0x70a08231': 'balanceOf',
    '0x18160ddd': 'totalSupply',
    '0x06fdde03': 'name',
    '0x95d89b41': 'symbol',
    '0x313ce567': 'decimals',
    '0xdd62ed3e': 'allowance',
    '0x39509351': 'increaseAllowance',
    '0xa457c2d7': 'decreaseAllowance',
    '0xf2fde38b': 'transferOwnership',
    '0x8da5cb5b': 'owner',
  };

  return knownMethods[methodId] || methodId;
};

// Cache para contratos já verificados
const contractCache = new Map<string, SmartContract | null>();

// Função para verificar se um endereço é um contrato
export const isContractAddress = async (address: string): Promise<SmartContract | null> => {
  if (contractCache.has(address)) {
    return contractCache.get(address) || null;
  }

  try {
    const response = await apiService.getSmartContract(address);
    if (response.success) {
      contractCache.set(address, response.data);
      return response.data;
    }
  } catch (error) {
    // Não é um contrato ou erro na busca
  }
  
  contractCache.set(address, null);
  return null;
};

// Função para detectar método da transação
export const detectTransactionMethod = async (tx: TransactionSummary, input?: string): Promise<string> => {
  // Se não tem to_address, é um deploy de contrato
  if (!tx.to_address) {
    return 'Deploy Contract';
  }

  // Se tem contract_address, é uma criação de contrato
  if (tx.contract_address) {
    try {
      // Tenta buscar informações do contrato
      const contractResponse = await apiService.getSmartContract(tx.contract_address);
      if (contractResponse.success && contractResponse.data.contract_type) {
        return `Deploy ${contractResponse.data.contract_type}`;
      }
    } catch (error) {
      // Se falhar, retorna deploy genérico
    }
    return 'Deploy Contract';
  }

  // Verifica se o to_address é um contrato conhecido
  try {
    const contractResponse = await apiService.getSmartContract(tx.to_address);
    if (contractResponse.success) {
      // É uma interação com contrato, tenta decodificar o método
      if (input) {
        const method = decodeTransactionInput(input);
        if (method !== 'Transfer') {
          return method;
        }
      }
      return 'Contract Call';
    }
  } catch (error) {
    // Não é um contrato ou erro na busca
  }

  // Transação normal
  return 'Transfer';
};

// Função simplificada para detectar método sem chamadas async
export const getTransactionMethodSync = (tx: TransactionSummary): string => {
  // Se não tem to_address, é um deploy de contrato
  if (!tx.to_address) {
    return 'Deploy Contract';
  }

  // Se tem contract_address, é uma criação de contrato
  if (tx.contract_address) {
    return 'Deploy Contract';
  }

  // Transação normal
  return 'Transfer';
};

/**
 * Estimate timestamp based on block number
 * This is a fallback when mined_at is null
 * Assumes average block time of ~12 seconds (can be adjusted)
 */
export const estimateTimestampFromBlock = (blockNumber: number, latestBlockNumber?: number, latestBlockTimestamp?: number): number => {
  // If we don't have latest block info, use a rough estimate
  // Assuming the network started at a known time and has consistent block times
  const AVERAGE_BLOCK_TIME = 12; // seconds
  const GENESIS_TIMESTAMP = 1640995200; // Example: Jan 1, 2022 (adjust as needed)
  
  if (latestBlockNumber && latestBlockTimestamp) {
    // Calculate based on latest known block
    const blockDifference = latestBlockNumber - blockNumber;
    const estimatedTimestamp = latestBlockTimestamp - (blockDifference * AVERAGE_BLOCK_TIME);
    return estimatedTimestamp;
  }
  
  // Fallback: estimate from genesis
  const estimatedTimestamp = GENESIS_TIMESTAMP + (blockNumber * AVERAGE_BLOCK_TIME);
  return estimatedTimestamp;
};

/**
 * Format transaction age with fallback to block-based estimation
 */
export const formatTransactionAgeWithFallback = (
  minedAt: string | number | null, 
  blockNumber: number,
  latestBlockNumber?: number,
  latestBlockTimestamp?: number
): string => {
  if (minedAt) {
    let timestamp: number;
    if (typeof minedAt === 'string') {
      timestamp = new Date(minedAt).getTime() / 1000;
    } else {
      timestamp = minedAt < 1e12 ? minedAt : minedAt / 1000;
    }
    return formatTimeAgo(timestamp);
  }
  
  // Try to estimate timestamp from block number
  if (blockNumber && latestBlockNumber && latestBlockTimestamp) {
    const estimatedTimestamp = estimateTimestampFromBlock(blockNumber, latestBlockNumber, latestBlockTimestamp);
    return formatTimeAgo(estimatedTimestamp) + ' (est.)';
  }
  
  // Final fallback: show block number
  return `Block #${blockNumber.toLocaleString()}`;
}; 