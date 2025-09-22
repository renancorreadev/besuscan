import { useState, useEffect, useCallback } from 'react';
import { 
  apiService, 
  TransactionsResponse, 
  TransactionResponse, 
  TransactionStatsResponse,
  TransactionSummary,
  Transaction
} from '../services/api';

export interface UseTransactionsOptions {
  limit?: number;
  page?: number;
  order?: 'asc' | 'desc';
  autoFetch?: boolean;
}

export interface TransactionFilters {
  search?: string;
  from?: string;
  to?: string;
  status?: 'success' | 'failed' | 'pending';
  min_value?: string;
  max_value?: string;
  min_gas?: string;
  max_gas?: string;
  min_gas_used?: string;
  max_gas_used?: string;
  tx_type?: number;
  from_date?: string;
  to_date?: string;
  from_block?: string;
  to_block?: string;
  contract_creation?: boolean;
  has_data?: boolean;
  order_by?: string;
  order_dir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface UseTransactionsReturn {
  transactions: TransactionSummary[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;
  fetchTransactions: (options?: UseTransactionsOptions) => Promise<void>;
  searchTransactions: (filters: TransactionFilters) => Promise<void>;
  getTransactionsByValue: (min?: string, max?: string) => Promise<void>;
  getTransactionsByType: (type: number) => Promise<void>;
  getContractCreations: () => Promise<void>;
  getTransactionsByDateRange: (from: string, to: string) => Promise<void>;
  getTransactionsByBlock: (blockNumber: number) => Promise<void>;
  getTransactionsByAddress: (address: string) => Promise<void>;
  getTransactionsByStatus: (status: 'success' | 'failed' | 'pending') => Promise<void>;
  setCustomTransactions: (transactions: TransactionSummary[], pagination?: { page: number; limit: number; total: number; total_pages: number; }) => void;
  refresh: () => Promise<void>;
}

export const useTransactions = (options: UseTransactionsOptions = {}): UseTransactionsReturn => {
  const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const fetchTransactions = useCallback(async (fetchOptions?: UseTransactionsOptions) => {
    setLoading(true);
    setError(null);

    try {
      // Se fetchOptions é fornecido, use-o prioritariamente para page
      const params = fetchOptions ? 
        { ...options, ...fetchOptions } : 
        options;
      
      const response: TransactionsResponse = await apiService.getTransactions(params);
      
      if (response.success) {
        setTransactions(response.data);
        setPagination(response.pagination || null);
      } else {
        setError('Failed to fetch transactions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [options]);

  const searchTransactions = useCallback(async (filters: TransactionFilters) => {
    setLoading(true);
    setError(null);

    try {
      // Use advanced search endpoint with all filters
      const response: TransactionsResponse = await apiService.searchTransactions(filters);
      
      if (response.success) {
        setTransactions(response.data);
        setPagination(response.pagination || null);
      } else {
        setError('Failed to search transactions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const getTransactionsByValue = useCallback(async (min?: string, max?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response: TransactionsResponse = await apiService.getTransactionsByValue(min, max);
      
      if (response.success) {
        setTransactions(response.data);
        setPagination(response.pagination || null);
      } else {
        setError('Failed to fetch transactions by value');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const getTransactionsByType = useCallback(async (type: number) => {
    setLoading(true);
    setError(null);

    try {
      const response: TransactionsResponse = await apiService.getTransactionsByType(type);
      
      if (response.success) {
        setTransactions(response.data);
        setPagination(response.pagination || null);
      } else {
        setError('Failed to fetch transactions by type');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const getContractCreations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: TransactionsResponse = await apiService.getContractCreations();
      
      if (response.success) {
        setTransactions(response.data);
        setPagination(response.pagination || null);
      } else {
        setError('Failed to fetch contract creations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const getTransactionsByDateRange = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);

    try {
      const response: TransactionsResponse = await apiService.getTransactionsByDateRange(from, to);
      
      if (response.success) {
        setTransactions(response.data);
        setPagination(response.pagination || null);
      } else {
        setError('Failed to fetch transactions by date range');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const getTransactionsByBlock = useCallback(async (blockNumber: number) => {
    setLoading(true);
    setError(null);

    try {
      const response: TransactionsResponse = await apiService.getTransactionsByBlock(blockNumber);
      
      if (response.success) {
        setTransactions(response.data);
        setPagination(response.pagination || null);
      } else {
        setError('Failed to fetch transactions by block');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const getTransactionsByAddress = useCallback(async (address: string) => {
    setLoading(true);
    setError(null);

    try {
      const response: TransactionsResponse = await apiService.getTransactionsByAddress(address);
      
      if (response.success) {
        setTransactions(response.data);
        setPagination(response.pagination || null);
      } else {
        setError('Failed to fetch transactions by address');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const getTransactionsByStatus = useCallback(async (status: 'success' | 'failed' | 'pending') => {
    setLoading(true);
    setError(null);

    try {
      const response: TransactionsResponse = await apiService.getTransactionsByStatus(status);
      
      if (response.success) {
        setTransactions(response.data);
        setPagination(response.pagination || null);
      } else {
        setError('Failed to fetch transactions by status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const setCustomTransactions = useCallback((transactions: TransactionSummary[], pagination?: { page: number; limit: number; total: number; total_pages: number; }) => {
    setTransactions(transactions);
    setPagination(pagination || null);
  }, []);

  const refresh = useCallback(() => {
    return fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchTransactions();
    }
  }, [fetchTransactions, options.autoFetch]);

  return {
    transactions,
    loading,
    error,
    pagination,
    fetchTransactions,
    searchTransactions,
    getTransactionsByValue,
    getTransactionsByType,
    getContractCreations,
    getTransactionsByDateRange,
    getTransactionsByBlock,
    getTransactionsByAddress,
    getTransactionsByStatus,
    setCustomTransactions,
    refresh,
  };
};

export interface UseTransactionDetailsOptions {
  hash: string;
  autoFetch?: boolean;
}

export interface UseTransactionDetailsReturn {
  transaction: Transaction | null;
  loading: boolean;
  error: string | null;
  fetchTransaction: () => Promise<void>;
}

export const useTransactionDetails = (options: UseTransactionDetailsOptions): UseTransactionDetailsReturn => {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransaction = useCallback(async () => {
    if (!options.hash) return;

    setLoading(true);
    setError(null);

    try {
      const response: TransactionResponse = await apiService.getTransaction(options.hash);
      
      if (response.success) {
        setTransaction(response.data);
      } else {
        setError('Failed to fetch transaction details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [options.hash]);

  useEffect(() => {
    if (options.autoFetch !== false && options.hash) {
      fetchTransaction();
    }
  }, [fetchTransaction, options.autoFetch, options.hash]);

  return {
    transaction,
    loading,
    error,
    fetchTransaction,
  };
};

export interface UseTransactionStatsReturn {
  stats: TransactionStatsResponse['data'] | null;
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
}

export const useTransactionStats = (): UseTransactionStatsReturn => {
  const [stats, setStats] = useState<TransactionStatsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: TransactionStatsResponse = await apiService.getTransactionStats();
      
      if (response.success) {
        setStats(response.data);
      } else {
        setError('Failed to fetch transaction stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    fetchStats,
  };
};

export interface UseLatestBlockReturn {
  latestBlock: {
    number: number;
    timestamp: number;
  } | null;
  loading: boolean;
  error: string | null;
  fetchLatestBlock: () => Promise<void>;
}

export const useLatestBlock = (): UseLatestBlockReturn => {
  const [latestBlock, setLatestBlock] = useState<{
    number: number;
    timestamp: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestBlock = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getLatestBlock();
      
      if (response.success) {
        setLatestBlock({
          number: response.data.number,
          timestamp: new Date(response.data.timestamp).getTime()
        });
      } else {
        setError('Failed to fetch latest block');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestBlock();
  }, [fetchLatestBlock]);

  return {
    latestBlock,
    loading,
    error,
    fetchLatestBlock,
  };
}; 