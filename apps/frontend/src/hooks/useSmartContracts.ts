import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  apiService, 
  SmartContractsResponse, 
  SmartContractResponse, 
  SmartContractStatsResponse,
  SmartContractSummary,
  SmartContract,
  SmartContractABI,
  SmartContractSourceCode,
  SmartContractFunction,
  SmartContractEvent,
  SmartContractMetrics
} from '../services/api';

export interface UseSmartContractsOptions {
  limit?: number;
  page?: number;
  type?: string;
  verified?: boolean;
  autoFetch?: boolean;
}

export interface UseSmartContractsReturn {
  contracts: SmartContractSummary[];
  loading: boolean;
  error: string | null;
  pagination: {
    current_page: number;
    items_per_page: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  } | null;
  fetchContracts: (options?: UseSmartContractsOptions) => Promise<void>;
  searchContracts: (query: string) => Promise<void>;
  getVerifiedContracts: () => Promise<void>;
  getPopularContracts: () => Promise<void>;
  getContractsByType: (type: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useSmartContracts = (options: UseSmartContractsOptions = {}): UseSmartContractsReturn => {
  const [contracts, setContracts] = useState<SmartContractSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    current_page: number;
    items_per_page: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  } | null>(null);

  // Use ref to track if initial fetch has been done
  const initialFetchDone = useRef(false);
  
  // Destructure options to avoid dependency issues
  const { limit = 10, page = 1, type, verified, autoFetch = true } = options;

  const fetchContracts = useCallback(async (fetchOptions?: UseSmartContractsOptions) => {
    setLoading(true);
    setError(null);

    try {
      const params = { 
        limit, 
        page, 
        type, 
        verified, 
        ...fetchOptions 
      };
      const response: SmartContractsResponse = await apiService.getSmartContracts(params);
      
      if (response.success) {
        setContracts(response.data || []);
        setPagination(response.pagination || null);
      } else {
        setError('Failed to fetch smart contracts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [limit, page, type, verified]);

  const searchContracts = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      const response: SmartContractsResponse = await apiService.searchSmartContracts(query);
      
      if (response.success) {
        setContracts(response.data);
        setPagination(response.pagination || null);
      } else {
        setError('Failed to search smart contracts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const getVerifiedContracts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: SmartContractsResponse = await apiService.getVerifiedSmartContracts();
      
      if (response.success) {
        setContracts(response.data);
        setPagination(response.pagination || null);
      } else {
        setError('Failed to fetch verified contracts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const getPopularContracts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: SmartContractsResponse = await apiService.getPopularSmartContracts();
      
      if (response.success) {
        setContracts(response.data);
        setPagination(response.pagination || null);
      } else {
        setError('Failed to fetch popular contracts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const getContractsByType = useCallback(async (type: string) => {
    setLoading(true);
    setError(null);

    try {
      const response: SmartContractsResponse = await apiService.getSmartContractsByType(type);
      
      if (response.success) {
        setContracts(response.data);
        setPagination(response.pagination || null);
      } else {
        setError('Failed to fetch contracts by type');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    return fetchContracts();
  }, [fetchContracts]);

  // Only fetch once on mount if autoFetch is true
  useEffect(() => {
    if (autoFetch && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchContracts();
    }
  }, []); // Empty dependency array to run only once

  return {
    contracts,
    loading,
    error,
    pagination,
    fetchContracts,
    searchContracts,
    getVerifiedContracts,
    getPopularContracts,
    getContractsByType,
    refresh,
  };
};

export interface UseSmartContractDetailsOptions {
  address: string;
  autoFetch?: boolean;
}

export interface UseSmartContractDetailsReturn {
  contract: SmartContract | null;
  abi: SmartContractABI[] | null;
  sourceCode: SmartContractSourceCode | null;
  functions: SmartContractFunction[] | null;
  events: SmartContractEvent[] | null;
  metrics: SmartContractMetrics | null;
  loading: boolean;
  error: string | null;
  fetchContract: () => Promise<void>;
  fetchABI: () => Promise<void>;
  fetchSourceCode: () => Promise<void>;
  fetchFunctions: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchAll: () => Promise<void>;
}

export const useSmartContractDetails = (options: UseSmartContractDetailsOptions): UseSmartContractDetailsReturn => {
  const [contract, setContract] = useState<SmartContract | null>(null);
  const [abi, setAbi] = useState<SmartContractABI[] | null>(null);
  const [sourceCode, setSourceCode] = useState<SmartContractSourceCode | null>(null);
  const [functions, setFunctions] = useState<SmartContractFunction[] | null>(null);
  const [events, setEvents] = useState<SmartContractEvent[] | null>(null);
  const [metrics, setMetrics] = useState<SmartContractMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref to track if initial fetch has been done
  const initialFetchDone = useRef(false);
  
  // Destructure options to avoid dependency issues
  const { address, autoFetch = true } = options;

  const fetchContract = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const response: SmartContractResponse = await apiService.getSmartContract(address);
      
      if (response.success) {
        setContract(response.data);
      } else {
        setError('Failed to fetch contract details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [address]);

  const fetchABI = useCallback(async () => {
    if (!address) return;

    try {
      const response = await apiService.getSmartContractABI(address);
      
      if (response.success) {
        setAbi(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch ABI:', err);
    }
  }, [address]);

  const fetchSourceCode = useCallback(async () => {
    if (!address) return;

    try {
      const response = await apiService.getSmartContractSourceCode(address);
      
      if (response.success) {
        setSourceCode(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch source code:', err);
    }
  }, [address]);

  const fetchFunctions = useCallback(async () => {
    if (!address) return;

    try {
      const response = await apiService.getSmartContractFunctions(address);
      
      if (response.success) {
        setFunctions(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch functions:', err);
    }
  }, [address]);

  const fetchEvents = useCallback(async () => {
    if (!address) return;

    try {
      const response = await apiService.getSmartContractEvents(address);
      
      if (response.success) {
        setEvents(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  }, [address]);

  const fetchMetrics = useCallback(async () => {
    if (!address) return;

    try {
      const response = await apiService.getSmartContractMetrics(address);
      
      if (response.success) {
        setMetrics(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    }
  }, [address]);

  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchContract(),
      fetchABI(),
      fetchSourceCode(),
      fetchFunctions(),
      fetchEvents(),
      fetchMetrics(),
    ]);
  }, [fetchContract, fetchABI, fetchSourceCode, fetchFunctions, fetchEvents, fetchMetrics]);

  // Only fetch once on mount if autoFetch is true and address is provided
  useEffect(() => {
    if (autoFetch && address && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchContract();
    }
  }, []); // Empty dependency array to run only once

  return {
    contract,
    abi,
    sourceCode,
    functions,
    events,
    metrics,
    loading,
    error,
    fetchContract,
    fetchABI,
    fetchSourceCode,
    fetchFunctions,
    fetchEvents,
    fetchMetrics,
    fetchAll,
  };
};

export interface UseSmartContractStatsReturn {
  stats: SmartContractStatsResponse['data'] | null;
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
}

export const useSmartContractStats = (): UseSmartContractStatsReturn => {
  const [stats, setStats] = useState<SmartContractStatsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref to track if initial fetch has been done
  const initialFetchDone = useRef(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: SmartContractStatsResponse = await apiService.getSmartContractStats();
      
      if (response.success) {
        setStats(response.data);
      } else {
        setError('Failed to fetch smart contract stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Only fetch once on mount
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchStats();
    }
  }, []); // Empty dependency array to run only once

  return {
    stats,
    loading,
    error,
    fetchStats,
  };
}; 