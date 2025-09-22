import { useState, useEffect, useMemo } from 'react';
import { 
  API_BASE_URL,
  SmartContract as SmartContractType,
  SmartContractABI,
  SmartContractEvent,
} from '@/services/api';

interface ContractFunction {
  name: string;
  type: 'function' | 'constructor' | 'fallback' | 'receive';
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
  inputs: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
  outputs?: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
}

interface ContractMetrics {
  address: string;
  days: number;
  metrics: Array<{
    date: string;
    transactions_count: number;
    unique_addresses_count: number;
    gas_used: string;
    value_transferred: string;
    avg_gas_per_tx?: number;
    success_rate?: number;
  }>;
  count: number;
}

interface UseContractDataReturn {
  contract: SmartContractType | null;
  abi: SmartContractABI[] | null;
  sourceCode: string | null;
  events: SmartContractEvent[];
  metrics: ContractMetrics | null;
  readFunctions: ContractFunction[];
  writeFunctions: ContractFunction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useContractData = (address: string | undefined): UseContractDataReturn => {
  const [contract, setContract] = useState<SmartContractType | null>(null);
  const [abi, setABI] = useState<SmartContractABI[] | null>(null);
  const [sourceCode, setSourceCode] = useState<string | null>(null);
  const [events, setEvents] = useState<SmartContractEvent[]>([]);
  const [metrics, setMetrics] = useState<ContractMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para fazer requisições à API
  const apiRequest = async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  };

  // Processar funções da ABI
  const { readFunctions, writeFunctions } = useMemo(() => {
    if (!abi) return { readFunctions: [], writeFunctions: [] };

    const read: ContractFunction[] = [];
    const write: ContractFunction[] = [];

    abi.forEach((item: any) => {
      if (item.type === 'function') {
        if (item.stateMutability === 'view' || item.stateMutability === 'pure') {
          read.push(item);
        } else {
          write.push(item);
        }
      }
    });

    return { readFunctions: read, writeFunctions: write };
  }, [abi]);

  // Carregar dados do contrato
  const loadContractData = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);

      // Carregar dados em paralelo para melhor performance
      const promises = [
        // Dados básicos do contrato
        apiRequest(`/smart-contracts/${address}`).catch(() => null),
        // ABI
        apiRequest(`/smart-contracts/${address}/abi`).catch(() => null),
        // Código fonte
        apiRequest(`/smart-contracts/${address}/source`).catch(() => null),
        // Eventos
        apiRequest(`/smart-contracts/${address}/events`).catch(() => null),
        // Métricas
        apiRequest(`/smart-contracts/${address}/metrics?days=30`).catch(() => null),
      ];

      const [
        contractResponse,
        abiResponse,
        sourceResponse,
        eventsResponse,
        metricsResponse
      ] = await Promise.all(promises);

      // Processar respostas
      if (contractResponse?.success) {
        setContract(contractResponse.data);
      }

      if (abiResponse?.success && abiResponse.data.abi) {
        setABI(abiResponse.data.abi);
      }

      if (sourceResponse?.success && sourceResponse.data.source_code) {
        setSourceCode(sourceResponse.data.source_code);
      }

      if (eventsResponse?.success) {
        setEvents(eventsResponse.data || []);
      }

      if (metricsResponse?.success) {
        setMetrics(metricsResponse.data);
      }

    } catch (err) {
      console.error('Erro ao carregar dados do contrato:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados quando o endereço mudar
  useEffect(() => {
    loadContractData();
  }, [address]);

  // Função para recarregar dados
  const refetch = async () => {
    await loadContractData();
  };

  return {
    contract,
    abi,
    sourceCode,
    events,
    metrics,
    readFunctions,
    writeFunctions,
    loading,
    error,
    refetch,
  };
}; 