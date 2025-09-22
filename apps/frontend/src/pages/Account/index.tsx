import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Code,
  FileText,
  Settings,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  X,
  Search,
  Activity,
  Zap,
  Bot,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Copy,
  Menu,
  ChevronDown
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_BASE_URL } from '@/services/api';
import '@/styles/accounts-table.css';
import '@/styles/glass-tables.css';
import { useDebounce } from '@/hooks/useDebounce';
import {
  AccountHeader,
  AccountMetrics,
  TransactionFilters as TransactionFiltersComponent,
  MethodFilters as MethodFiltersComponent,
  EventFilters as EventFiltersComponent,
  TokenFilters as TokenFiltersComponent,
  TransactionTable,
  MethodStatsTable,
  EventsTable,
  Pagination,
  formatAddress,
  formatBalance,
  formatTimeAgo,
  formatNumber,
  getComplianceColor,
  getRiskScoreColor,
  copyToClipboard
} from './components';
import { 
  AccountDetails, 
  AccountTag, 
  AccountAnalytics, 
  ContractInteraction, 
  TokenHolding, 
  Transaction, 
  AccountTransaction, 
  AccountEvent, 
  MethodStats, 
  TransactionFilters as TransactionFiltersType, 
  MethodFilters as MethodFiltersType, 
  EventFilters as EventFiltersType, 
  TokenFilters as TokenFiltersType, 
  PaginationState 
} from './types';

const Account = () => {
  const { address } = useParams<{ address: string }>();
  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [tags, setTags] = useState<AccountTag[]>([]);
  const [analytics, setAnalytics] = useState<AccountAnalytics[]>([]);
  const [contractInteractions, setContractInteractions] = useState<ContractInteraction[]>([]);
  const [tokenHoldings, setTokenHoldings] = useState<TokenHolding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accountTransactions, setAccountTransactions] = useState<AccountTransaction[]>([]);
  const [accountEvents, setAccountEvents] = useState<AccountEvent[]>([]);
  const [methodStats, setMethodStats] = useState<MethodStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Estados para paginação
  const [transactionsPagination, setTransactionsPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const [methodsPagination, setMethodsPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [eventsPagination, setEventsPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const [tokensPagination, setTokensPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Estados para filtros
  const [transactionFilters, setTransactionFilters] = useState<TransactionFiltersType>({});
  const [methodFilters, setMethodFilters] = useState<MethodFiltersType>({ sortBy: 'executions' });
  const [eventFilters, setEventFilters] = useState<EventFiltersType>({});
  const [tokenFilters, setTokenFilters] = useState<TokenFiltersType>({});

  // Estados temporários para inputs com debounce
  const [tempTransactionMethod, setTempTransactionMethod] = useState('');
  const [tempMethodName, setTempMethodName] = useState('');
  const [tempContractType, setTempContractType] = useState('');
  const [tempEventName, setTempEventName] = useState('');
  const [tempContractAddress, setTempContractAddress] = useState('');
  const [tempTokenSymbol, setTempTokenSymbol] = useState('');
  const [tempTokenName, setTempTokenName] = useState('');
  const [tempTokenMinBalance, setTempTokenMinBalance] = useState('');

  // Debounced values
  const debouncedTransactionMethod = useDebounce(tempTransactionMethod, 2000);
  const debouncedMethodName = useDebounce(tempMethodName, 2000);
  const debouncedContractType = useDebounce(tempContractType, 2000);
  const debouncedEventName = useDebounce(tempEventName, 2000);
  const debouncedContractAddress = useDebounce(tempContractAddress, 2000);
  const debouncedTokenSymbol = useDebounce(tempTokenSymbol, 2000);
  const debouncedTokenName = useDebounce(tempTokenName, 2000);
  const debouncedTokenMinBalance = useDebounce(tempTokenMinBalance, 2000);

  // Estados para loading das abas
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [tokensLoading, setTokensLoading] = useState(false);

  // API Functions
  const fetchAccountDetails = async (addr: string): Promise<AccountDetails> => {
    const response = await fetch(`${API_BASE_URL}/accounts/${addr}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch account: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  };

  // Helper function to convert ETH to Wei
  const ethToWei = (ethValue: string): string => {
    if (!ethValue || ethValue === '') return '';
    const eth = parseFloat(ethValue);
    if (isNaN(eth)) return '';
    // 1 ETH = 10^18 Wei
    const wei = eth * Math.pow(10, 18);
    return wei.toString();
  };

  const fetchAccountTags = async (addr: string): Promise<AccountTag[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/${addr}/tags`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.warn('Failed to fetch tags:', error);
      return [];
    }
  };

  const fetchAccountAnalytics = async (addr: string, days: number = 30): Promise<AccountAnalytics[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/${addr}/analytics?days=${days}`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.warn(`Failed to fetch analytics for ${addr}:`, error);
      return [];
    }
  };

  const fetchContractInteractions = async (addr: string): Promise<ContractInteraction[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/${addr}/interactions?limit=10`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.warn('Failed to fetch contract interactions:', error);
      return [];
    }
  };

  const fetchAccountTransactions = async (
    addr: string,
    pagination: PaginationState,
    filters: TransactionFiltersType
  ): Promise<{ data: AccountTransaction[], pagination: PaginationState }> => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      // Add filters with correct API parameter names
      if (filters.status) params.append('status', filters.status);
      if (filters.contract_type) params.append('contract_type', filters.contract_type);
      if (filters.method) params.append('method', filters.method);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await fetch(`${API_BASE_URL}/accounts/${addr}/transactions?${params}`);
      if (!response.ok) {
        return { data: [], pagination };
      }
      const result = await response.json();

      return {
        data: result.data || [],
        pagination: {
          page: result.pagination?.page || pagination.page,
          limit: result.pagination?.limit || pagination.limit,
          total: result.pagination?.total || 0,
          totalPages: result.pagination?.total_pages || 0
        }
      };
    } catch (error) {
      console.warn(`Failed to fetch account transactions for ${addr}:`, error);
      return { data: [], pagination };
    }
  };

  const fetchAccountEvents = async (
    addr: string,
    pagination: PaginationState,
    filters: EventFiltersType
  ): Promise<{ data: AccountEvent[], pagination: PaginationState }> => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      // Add filters with correct API parameter names
      if (filters.eventName) params.append('eventName', filters.eventName);
      if (filters.contractAddress) params.append('contractAddress', filters.contractAddress);
      if (filters.involvementType) params.append('involvementType', filters.involvementType);
      if (filters.dateFrom) params.append('fromDate', filters.dateFrom);
      if (filters.dateTo) params.append('toDate', filters.dateTo);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortDir) params.append('sortDir', filters.sortDir);

      const response = await fetch(`${API_BASE_URL}/accounts/${addr}/events?${params}`);
      if (!response.ok) {
        return { data: [], pagination };
      }
      const result = await response.json();

      return {
        data: result.data || [],
        pagination: {
          page: result.pagination?.page || pagination.page,
          limit: result.pagination?.limit || pagination.limit,
          total: result.pagination?.total || 0,
          totalPages: result.pagination?.total_pages || 0
        }
      };
    } catch (error) {
      console.warn(`Failed to fetch account events for ${addr}:`, error);
      return { data: [], pagination };
    }
  };

  const fetchMethodStats = async (
    addr: string,
    pagination: PaginationState,
    filters: MethodFiltersType
  ): Promise<{ data: MethodStats[], pagination: PaginationState }> => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      // Add filters with correct API parameter names
      if (filters.methodName) params.append('methodName', filters.methodName);
      if (filters.contractAddress) params.append('contractAddress', filters.contractAddress);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortDir) params.append('sortDir', filters.sortDir);

      const response = await fetch(`${API_BASE_URL}/accounts/${addr}/method-stats?${params}`);
      if (!response.ok) {
        return { data: [], pagination };
      }
      const result = await response.json();

      return {
        data: result.data || [],
        pagination: {
          page: result.pagination?.page || pagination.page,
          limit: result.pagination?.limit || pagination.limit,
          total: result.pagination?.total || 0,
          totalPages: result.pagination?.total_pages || 0
        }
      };
    } catch (error) {
      console.warn(`Failed to fetch method stats for ${addr}:`, error);
      return { data: [], pagination };
    }
  };

  const fetchTokenHoldings = async (
    addr: string,
    pagination: PaginationState,
    filters: TokenFiltersType
  ): Promise<{ data: TokenHolding[], pagination: PaginationState }> => {
    try {
      // Token API doesn't support filtering, so we just pass pagination
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      console.log('💰 Fetching tokens for address:', addr);
      console.log('🔗 URL:', `${API_BASE_URL}/accounts/${addr}/tokens?${params}`);

      const response = await fetch(`${API_BASE_URL}/accounts/${addr}/tokens?${params}`);
      if (!response.ok) {
        return { data: [], pagination };
      }
      const result = await response.json();

      // Apply client-side filtering if needed
      let filteredData = result.data || [];
      
      if (filters.hasValue !== undefined) {
        filteredData = filteredData.filter((token: TokenHolding) => {
          if (filters.hasValue === true) {
            return token.value_usd && parseFloat(token.value_usd) > 0;
          } else if (filters.hasValue === false) {
            return !token.value_usd || parseFloat(token.value_usd) === 0;
          }
          return true;
        });
      }

      if (filters.symbol) {
        filteredData = filteredData.filter((token: TokenHolding) => 
          token.token_symbol?.toLowerCase().includes(filters.symbol!.toLowerCase())
        );
      }

      if (filters.name) {
        filteredData = filteredData.filter((token: TokenHolding) => 
          token.token_name?.toLowerCase().includes(filters.name!.toLowerCase())
        );
      }

      if (filters.minBalance) {
        const minBalance = parseFloat(filters.minBalance);
        filteredData = filteredData.filter((token: TokenHolding) => 
          parseFloat(token.balance) >= minBalance
        );
      }

      // Apply sorting
      if (filters.sortBy) {
        filteredData.sort((a: TokenHolding, b: TokenHolding) => {
          let aValue: any, bValue: any;
          
          switch (filters.sortBy) {
            case 'balance':
              aValue = parseFloat(a.balance);
              bValue = parseFloat(b.balance);
              break;
            case 'value_usd':
              aValue = parseFloat(a.value_usd || '0');
              bValue = parseFloat(b.value_usd || '0');
              break;
            case 'symbol':
              aValue = a.token_symbol || '';
              bValue = b.token_symbol || '';
              break;
            case 'name':
              aValue = a.token_name || '';
              bValue = b.token_name || '';
              break;
            default:
              return 0;
          }

          if (filters.sortDir === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });
      }

      return {
        data: filteredData,
        pagination: {
          page: result.pagination?.page || pagination.page,
          limit: result.pagination?.limit || pagination.limit,
          total: filteredData.length,
          totalPages: Math.ceil(filteredData.length / pagination.limit)
        }
      };
    } catch (error) {
      console.warn(`Failed to fetch token holdings for ${addr}:`, error);
      return { data: [], pagination };
    }
  };

  // Funções para carregar dados das abas individuais
  const loadTransactions = async () => {
    if (!address) return;
    setTransactionsLoading(true);
    try {
      const result = await fetchAccountTransactions(address, transactionsPagination, transactionFilters);
      setAccountTransactions(result.data);
      setTransactionsPagination(result.pagination);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const loadMethods = async () => {
    if (!address) return;
    setMethodsLoading(true);
    try {
      const result = await fetchMethodStats(address, methodsPagination, methodFilters);
      setMethodStats(result.data);
      setMethodsPagination(result.pagination);
    } catch (error) {
      console.error('Error loading methods:', error);
    } finally {
      setMethodsLoading(false);
    }
  };

  const loadEvents = async () => {
    if (!address) return;
    setEventsLoading(true);
    try {
      const result = await fetchAccountEvents(address, eventsPagination, eventFilters);
      setAccountEvents(result.data);
      setEventsPagination(result.pagination);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  const loadTokens = async () => {
    if (!address) return;
    setTokensLoading(true);
    try {
      const result = await fetchTokenHoldings(address, tokensPagination, tokenFilters);
      setTokenHoldings(result.data);
      setTokensPagination(result.pagination);
    } catch (error) {
      console.error('Error loading tokens:', error);
    } finally {
      setTokensLoading(false);
    }
  };

  // Effects para carregar dados quando filtros ou paginação mudarem
  useEffect(() => {
    if (address && account) {
      loadTransactions();
    }
  }, [transactionsPagination.page, transactionFilters, address, account]);

  useEffect(() => {
    if (address && account) {
      loadMethods();
    }
  }, [methodsPagination.page, methodFilters, address, account]);

  useEffect(() => {
    if (address && account) {
      loadEvents();
    }
  }, [eventsPagination.page, eventFilters, address, account]);

  useEffect(() => {
    if (address && account) {
      loadTokens();
    }
  }, [tokensPagination.page, tokenFilters, address, account]);

  // Handlers para mudança de página
  const handleTransactionsPageChange = (page: number) => {
    setTransactionsPagination(prev => ({ ...prev, page }));
  };

  const handleMethodsPageChange = (page: number) => {
    setMethodsPagination(prev => ({ ...prev, page }));
  };

  const handleEventsPageChange = (page: number) => {
    setEventsPagination(prev => ({ ...prev, page }));
  };

  const handleTokensPageChange = (page: number) => {
    setTokensPagination(prev => ({ ...prev, page }));
  };

  // Effects para aplicar filtros com debounce
  useEffect(() => {
    console.log('🔄 Transaction method filter changed:', debouncedTransactionMethod);
    setTransactionFilters(prev => ({
      ...prev,
      method: debouncedTransactionMethod || undefined
    }));
    setTransactionsPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedTransactionMethod]);

  useEffect(() => {
    setMethodFilters(prev => ({
      ...prev,
      methodName: debouncedMethodName || undefined
    }));
    setMethodsPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedMethodName]);

  useEffect(() => {
    setMethodFilters(prev => ({
      ...prev,
      contractAddress: debouncedContractType || undefined
    }));
    setMethodsPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedContractType]);

  useEffect(() => {
    setEventFilters(prev => ({
      ...prev,
      eventName: debouncedEventName || undefined
    }));
    setEventsPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedEventName]);

  useEffect(() => {
    setEventFilters(prev => ({
      ...prev,
      contractAddress: debouncedContractAddress || undefined
    }));
    setEventsPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedContractAddress]);

  useEffect(() => {
    setTokenFilters(prev => ({
      ...prev,
      symbol: debouncedTokenSymbol || undefined
    }));
    setTokensPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedTokenSymbol]);

  useEffect(() => {
    setTokenFilters(prev => ({
      ...prev,
      name: debouncedTokenName || undefined
    }));
    setTokensPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedTokenName]);

  useEffect(() => {
    setTokenFilters(prev => ({
      ...prev,
      minBalance: debouncedTokenMinBalance || undefined
    }));
    setTokensPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedTokenMinBalance]);

  // Sincronizar valores temporários com filtros existentes na inicialização
  useEffect(() => {
    setTempTransactionMethod(transactionFilters.method || '');
  }, []);

  useEffect(() => {
    setTempMethodName(methodFilters.methodName || '');
    setTempContractType(methodFilters.contractAddress || '');
  }, []);

  useEffect(() => {
    setTempEventName(eventFilters.eventName || '');
    setTempContractAddress(eventFilters.contractAddress || '');
  }, []);

  useEffect(() => {
    setTempTokenSymbol(tokenFilters.symbol || '');
    setTempTokenName(tokenFilters.name || '');
    setTempTokenMinBalance(tokenFilters.minBalance || '');
  }, []);

  useEffect(() => {
    setTempTokenMinBalance(debouncedTokenMinBalance || undefined);
  }, [debouncedTokenMinBalance]);

  // Load account data
  useEffect(() => {
    if (!address) {
      setError('No address provided');
      setLoading(false);
      return;
    }

    const loadAccountData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [accountData, tagsData, analyticsData, contractInteractionsData] = await Promise.all([
          fetchAccountDetails(address),
          fetchAccountTags(address),
          fetchAccountAnalytics(address),
          fetchContractInteractions(address)
        ]);

        setAccount(accountData);
        setTags(tagsData);
        setAnalytics(analyticsData);
        setContractInteractions(contractInteractionsData);

        // Carregar transações iniciais
        await loadTransactions();
      } catch (err) {
        console.error('Error loading account data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load account data');
      } finally {
        setLoading(false);
      }
    };

    loadAccountData();
  }, [address]);

  // Load data when filters change
  useEffect(() => {
    if (!loading && address) {
      loadTransactions();
    }
  }, [transactionFilters, transactionsPagination.page]);

  useEffect(() => {
    if (!loading && address && activeTab === 'methods') {
      loadMethods();
    }
  }, [methodFilters, methodsPagination.page, activeTab]);

  useEffect(() => {
    if (!loading && address && activeTab === 'events') {
      loadEvents();
    }
  }, [eventFilters, eventsPagination.page, activeTab]);

  useEffect(() => {
    if (!loading && address && activeTab === 'tokens') {
      loadTokens();
    }
  }, [tokenFilters, tokensPagination.page, activeTab]);

  // Update filters when debounced values change
  useEffect(() => {
    setTransactionFilters(prev => ({
      ...prev,
      method: debouncedTransactionMethod || undefined
    }));
  }, [debouncedTransactionMethod]);

  useEffect(() => {
    setMethodFilters(prev => ({
      ...prev,
      methodName: debouncedMethodName || undefined
    }));
  }, [debouncedMethodName]);

  useEffect(() => {
    setMethodFilters(prev => ({
      ...prev,
      contractAddress: debouncedContractType || undefined
    }));
  }, [debouncedContractType]);

  useEffect(() => {
    setEventFilters(prev => ({
      ...prev,
      eventName: debouncedEventName || undefined
    }));
  }, [debouncedEventName]);

  useEffect(() => {
    setEventFilters(prev => ({
      ...prev,
      contractAddress: debouncedContractAddress || undefined
    }));
  }, [debouncedContractAddress]);

  useEffect(() => {
    setTokenFilters(prev => ({
      ...prev,
      symbol: debouncedTokenSymbol || undefined
    }));
  }, [debouncedTokenSymbol]);

  useEffect(() => {
    setTokenFilters(prev => ({
      ...prev,
      name: debouncedTokenName || undefined
    }));
  }, [debouncedTokenName]);

  useEffect(() => {
    setTokenFilters(prev => ({
      ...prev,
      minBalance: debouncedTokenMinBalance || undefined
    }));
  }, [debouncedTokenMinBalance]);

  // Utility functions
  const formatAddress = (addr: string | undefined) => {
    if (!addr) return 'Unknown';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (isNaN(num)) return '0 ETH';

    // Convert from Wei to ETH
    const ethValue = num / 1e18;

    if (ethValue >= 1000000) return `${(ethValue / 1000000).toFixed(2)}M ETH`;
    if (ethValue >= 1000) return `${(ethValue / 1000).toFixed(2)}K ETH`;
    return `${ethValue.toFixed(4)} ETH`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const formatNumber = (num: number | string | undefined) => {
    if (num === undefined || num === null) return '0';
    const value = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(value)) return '0';
    return value.toLocaleString();
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for browsers that don't support the Clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      console.log('Endereço copiado:', text); // Para debug

      // Visual feedback - usando um approach mais simples
      // Você pode implementar um toast notification aqui se desejar

    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const getTransactionType = (tx: Transaction): 'sent' | 'received' | 'contract_call' => {
    if (tx.contract_address) return 'contract_call';
    if (tx.from_address && address && tx.from_address.toLowerCase() === address.toLowerCase()) return 'sent';
    return 'received';
  };

  const getMethodBadgeClass = (methodName: string) => {
    const method = methodName.toLowerCase();
    if (method.includes('transfer')) return 'method-badge-transfer';
    if (method.includes('approve')) return 'method-badge-approve';
    if (method.includes('swap')) return 'method-badge-swap';
    if (method.includes('mint')) return 'method-badge-mint';
    if (method.includes('burn')) return 'method-badge-burn';
    return 'glass-badge-info';
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sent':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'received':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'contract_call':
        return <Code className="h-4 w-4 text-purple-500" />;
      case 'contract_creation':
        return <Settings className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getInvolvementBadgeClass = (involvement: string) => {
    switch (involvement) {
      case 'emitter':
        return 'glass-badge-warning';
      case 'participant':
        return 'glass-badge-info';
      case 'recipient':
        return 'glass-badge-success';
      default:
        return 'glass-badge-neutral';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-gray-600 dark:text-gray-300">Loading account details...</span>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/30">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Error Loading Account</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white">
                Retry
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Account not found state
  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/30">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Account Not Found</h3>
              <p className="text-gray-600 dark:text-gray-300">The requested account could not be found.</p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Main component (with both mobile and desktop layouts)
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Layout */}
          <div className="block md:hidden space-y-4">
            {/* Mobile Account Header */}
            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/30">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                        {account.address}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Account Address
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(account.address)}
                      className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </Button>
                  </div>
                  
                  {/* Mobile Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatBalance(account.balance)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Balance</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatNumber(account.transaction_count)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Transactions</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Tabs */}
            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/30">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Mobile Tab Selector */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700/30">
                  <Select value={activeTab} onValueChange={setActiveTab}>
                    <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                      <SelectValue>
                        {activeTab === 'overview' && '📊 Overview'}
                        {activeTab === 'transactions' && '💸 Transactions'}
                        {activeTab === 'methods' && '⚙️ Methods'}
                        {activeTab === 'events' && '⚡ Events'}
                        {activeTab === 'contracts' && '📜 Contracts'}
                        {activeTab === 'tokens' && '🪙 Tokens'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <SelectItem value="overview" className="text-gray-900 dark:text-gray-100">📊 Overview</SelectItem>
                      <SelectItem value="transactions" className="text-gray-900 dark:text-gray-100">💸 Transactions</SelectItem>
                      <SelectItem value="methods" className="text-gray-900 dark:text-gray-100">⚙️ Methods</SelectItem>
                      <SelectItem value="events" className="text-gray-900 dark:text-gray-100">⚡ Events</SelectItem>
                      <SelectItem value="contracts" className="text-gray-900 dark:text-gray-100">📜 Contracts</SelectItem>
                      <SelectItem value="tokens" className="text-gray-900 dark:text-gray-100">🪙 Tokens</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Mobile Tab Content */}
                <div className="p-4">
                  <TabsContent value="overview" className="mt-0 space-y-4">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Account Timeline</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/30">
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">Account Created</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {new Date(account.first_seen_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        {account.last_activity_at && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
                              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">Last Activity</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {formatTimeAgo(account.last_activity_at)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="transactions" className="mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Transactions</h3>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {transactionsPagination.total} total
                        </div>
                      </div>
                      
                      {transactionsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-gray-500 dark:text-gray-400">Loading...</span>
                          </div>
                        </div>
                      ) : accountTransactions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No transactions found
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {accountTransactions.slice(0, 5).map((tx) => (
                            <div key={tx.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                              <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 mt-0.5">
                                  {getTransactionIcon(tx.transaction_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="font-mono text-xs text-gray-900 dark:text-gray-100">
                                      {formatAddress(tx.transaction_hash)}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(tx.transaction_hash)}
                                      className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                                    >
                                      <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                    </Button>
                                  </div>
                                  
                                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                                    {tx.contract_type || tx.transaction_type.replace('_', ' ')}
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div className={`text-sm font-medium ${tx.value !== '0' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                      {tx.value !== '0' ? formatBalance(tx.value) : '0 ETH'}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatTimeAgo(tx.timestamp)}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between mt-2">
                                    {tx.method_name ? (
                                      <span className={`${getMethodBadgeClass(tx.method_name)} text-xs px-2 py-1 rounded`}>
                                        {tx.method_name}
                                      </span>
                                    ) : (
                                      <span className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                        ETH Transfer
                                      </span>
                                    )}
                                    <span className={`text-xs px-2 py-1 rounded ${tx.status === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : tx.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
                                      {tx.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Mobile Simple Pagination */}
                      {transactionsPagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTransactionsPageChange(transactionsPagination.page - 1)}
                            disabled={transactionsPagination.page === 1}
                            className="text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {transactionsPagination.page} of {transactionsPagination.totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTransactionsPageChange(transactionsPagination.page + 1)}
                            disabled={transactionsPagination.page === transactionsPagination.totalPages}
                            className="text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="tokens" className="mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Tokens</h3>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {tokensPagination.total} tokens
                        </div>
                      </div>
                      
                      {tokensLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-gray-500 dark:text-gray-400">Loading...</span>
                          </div>
                        </div>
                      ) : tokenHoldings.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No tokens found
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {tokenHoldings.map((token, index) => {
                            const getTokenDisplayName = () => {
                              if (token.token_symbol && token.token_symbol !== 'Unknown Token') {
                                return token.token_symbol;
                              }
                              return `Token ${formatAddress(token.token_address)}`;
                            };

                            const getFormattedBalance = () => {
                              const rawBalance = parseFloat(token.balance);
                              if (isNaN(rawBalance)) return '0';

                              if (token.token_decimals && token.token_decimals > 0) {
                                const formattedBalance = rawBalance / Math.pow(10, token.token_decimals);
                                const symbol = token.token_symbol && token.token_symbol !== 'Unknown Token'
                                  ? token.token_symbol
                                  : 'tokens';
                                return `${formatNumber(formattedBalance)} ${symbol}`;
                              }

                              const symbol = token.token_symbol && token.token_symbol !== 'Unknown Token'
                                ? token.token_symbol
                                : 'units';
                              return `${formatNumber(rawBalance)} ${symbol}`;
                            };

                            return (
                              <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                <div className="flex items-start gap-3">
                                  <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/30 mt-0.5">
                                    <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1">
                                      {getTokenDisplayName()}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                                      Balance: {getFormattedBalance()}
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                        {token.value_usd ? `$${formatNumber(token.value_usd)}` : 'N/A'}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(token.token_address)}
                                        className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                                      >
                                        <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Placeholder for other mobile tabs */}
                  <TabsContent value="methods" className="mt-0">
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Methods view optimized for mobile coming soon</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="events" className="mt-0">
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Events view optimized for mobile coming soon</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="contracts" className="mt-0">
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Contracts view optimized for mobile coming soon</p>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:block">
            <AccountHeader account={account} tags={tags} />
            <AccountMetrics account={account} />

            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/30 rounded-xl shadow-sm mt-8">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700/30 grid w-full grid-cols-6 rounded-none">
                  <TabsTrigger value="overview" className="text-gray-700 dark:text-gray-300 data-[state=active]:text-blue-600 data-[state=active]:dark:text-blue-400 data-[state=active]:bg-white data-[state=active]:dark:bg-gray-700">Overview</TabsTrigger>
                  <TabsTrigger value="transactions" className="text-gray-700 dark:text-gray-300 data-[state=active]:text-blue-600 data-[state=active]:dark:text-blue-400 data-[state=active]:bg-white data-[state=active]:dark:bg-gray-700">Transactions</TabsTrigger>
                  <TabsTrigger value="methods" className="text-gray-700 dark:text-gray-300 data-[state=active]:text-blue-600 data-[state=active]:dark:text-blue-400 data-[state=active]:bg-white data-[state=active]:dark:bg-gray-700">Methods</TabsTrigger>
                  <TabsTrigger value="events" className="text-gray-700 dark:text-gray-300 data-[state=active]:text-blue-600 data-[state=active]:dark:text-blue-400 data-[state=active]:bg-white data-[state=active]:dark:bg-gray-700">Events</TabsTrigger>
                  <TabsTrigger value="contracts" className="text-gray-700 dark:text-gray-300 data-[state=active]:text-blue-600 data-[state=active]:dark:text-blue-400 data-[state=active]:bg-white data-[state=active]:dark:bg-gray-700">Contracts</TabsTrigger>
                  <TabsTrigger value="tokens" className="text-gray-700 dark:text-gray-300 data-[state=active]:text-blue-600 data-[state=active]:dark:text-blue-400 data-[state=active]:bg-white data-[state=active]:dark:bg-gray-700">Tokens</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="p-6 space-y-6">
                  {/* Activity Chart */}
                  {analytics.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Daily Activity</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analytics}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="transactions_count" stroke="#3B82F6" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Account Timeline */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Account Timeline</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">Account Created</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(account.first_seen_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {account.last_activity_at && (
                        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">Last Activity</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {formatTimeAgo(account.last_activity_at)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="transactions" className="p-0">
                  <div className="space-y-0">
                    <div className="flex items-center justify-between p-6 pb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">All Transactions</h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {transactionsPagination.total} total transactions
                      </div>
                    </div>

                    <TransactionFiltersComponent
                      filters={transactionFilters}
                      setFilters={setTransactionFilters}
                      setPagination={setTransactionsPagination}
                      tempTransactionMethod={tempTransactionMethod}
                      setTempTransactionMethod={setTempTransactionMethod}
                    />

                    <div className="p-6 pt-4">
                      {transactionsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-gray-500 dark:text-gray-400">Loading transactions...</span>
                          </div>
                        </div>
                      ) : accountTransactions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No transactions found
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {accountTransactions.map((tx) => (
                            <div key={tx.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
                              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                                {getTransactionIcon(tx.transaction_type)}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {formatAddress(tx.transaction_hash)}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(tx.transaction_hash)}
                                    className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
                                  >
                                    <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                  </Button>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  {tx.contract_type || tx.transaction_type.replace('_', ' ')}
                                </div>
                                <div className="flex items-center gap-4 mt-2">
                                  {tx.method_name ? (
                                    <span className={`method-badge ${getMethodBadgeClass(tx.method_name)} text-xs`}>
                                      {tx.method_name}
                                    </span>
                                  ) : (
                                    <span className="glass-badge-neutral text-xs">ETH Transfer</span>
                                  )}
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    From: {formatAddress(tx.from_address)}
                                    {tx.to_address && ` → ${formatAddress(tx.to_address)}`}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                <div className={`font-medium text-gray-900 dark:text-gray-100 ${tx.value !== '0' ? 'text-green-600 dark:text-green-400' : ''}`}>
                                  {tx.value !== '0' ? formatBalance(tx.value) : '0 ETH'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Gas: {formatNumber(tx.gas_limit)}
                                  {tx.gas_used && ` (${formatNumber(tx.gas_used)} used)`}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`glass-badge ${tx.status === 'success' ? 'glass-badge-success' : tx.status === 'failed' ? 'glass-badge-error' : 'glass-badge-warning'} text-xs`}>
                                    {tx.status}
                                  </span>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatTimeAgo(tx.timestamp)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {transactionsPagination.totalPages > 1 && (
                      <Pagination
                        pagination={transactionsPagination}
                        onPageChange={handleTransactionsPageChange}
                        loading={transactionsLoading}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="methods" className="p-0">
                  <div className="space-y-0">
                    <div className="flex items-center justify-between p-6 pb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Method Statistics</h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {methodsPagination.total} unique methods
                      </div>
                    </div>

                    <MethodFiltersComponent
                      filters={methodFilters}
                      setFilters={setMethodFilters}
                      setPagination={setMethodsPagination}
                      tempMethodName={tempMethodName}
                      setTempMethodName={setTempMethodName}
                      tempContractType={tempContractType}
                      setTempContractType={setTempContractType}
                    />

                    <div className="p-6 pt-4">
                      {methodsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-gray-500 dark:text-gray-400">Loading methods...</span>
                          </div>
                        </div>
                      ) : methodStats.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No method statistics found
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {methodStats.map((method) => {
                            const successRate = method.execution_count > 0 ? (method.success_count / method.execution_count) * 100 : 0;
                            return (
                              <div key={method.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
                                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                                  <Code className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`method-badge ${getMethodBadgeClass(method.method_name)} text-sm`}>
                                      {method.method_name}
                                    </span>
                                  </div>
                                  {method.method_signature && (
                                    <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">
                                      {method.method_signature}
                                    </div>
                                  )}
                                  <div className="text-sm text-gray-600 dark:text-gray-300">
                                    {method.contract_name ? (
                                      <div>
                                        <span className="font-medium">{method.contract_name}</span>
                                        {method.contract_address && (
                                          <span className="ml-2 text-xs">({formatAddress(method.contract_address)})</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span>ETH Transfer</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span>✅ {method.success_count} | ❌ {method.failed_count}</span>
                                    <span>Gas: {formatNumber(method.avg_gas_used)} avg</span>
                                  </div>
                                </div>

                                <div className="text-right flex-shrink-0">
                                  <div className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">
                                    {formatNumber(method.execution_count)}
                                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">executions</span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className={`font-medium ${successRate >= 90 ? 'text-green-600 dark:text-green-400' : successRate >= 70 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                      {successRate.toFixed(1)}%
                                    </div>
                                    <div className="w-16 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full transition-all duration-300 ${successRate >= 90 ? 'bg-green-500' : successRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${successRate}%` }}
                                      />
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {method.total_value_sent !== '0' ? formatBalance(method.total_value_sent) : '0 ETH'} sent
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Last: {formatTimeAgo(method.last_executed_at)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {methodsPagination.totalPages > 1 && (
                      <Pagination
                        pagination={methodsPagination}
                        onPageChange={handleMethodsPageChange}
                        loading={methodsLoading}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="events" className="p-0">
                  <div className="space-y-0">
                    <div className="flex items-center justify-between p-6 pb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Smart Contract Events</h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {eventsPagination.total} events
                      </div>
                    </div>

                    <EventFiltersComponent
                      filters={eventFilters}
                      setFilters={setEventFilters}
                      setPagination={setEventsPagination}
                      tempEventName={tempEventName}
                      setTempEventName={setTempEventName}
                      tempContractAddress={tempContractAddress}
                      setTempContractAddress={setTempContractAddress}
                    />

                    <div className="p-6 pt-4">
                      {eventsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-gray-500 dark:text-gray-400">Loading events...</span>
                          </div>
                        </div>
                      ) : accountEvents.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No events found
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {accountEvents.map((event) => (
                            <div key={event.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
                              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                                <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="font-medium text-purple-600 dark:text-purple-400">
                                    {event.event_name}
                                  </div>
                                  <span className={`glass-badge ${getInvolvementBadgeClass(event.involvement_type)} text-xs`}>
                                    {event.involvement_type}
                                  </span>
                                </div>
                                <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">
                                  {event.event_signature.slice(0, 50)}...
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  {event.contract_name && (
                                    <div className="mb-1">
                                      <span className="font-medium">{event.contract_name}</span>
                                      <span className="ml-2 text-xs">({formatAddress(event.contract_address)})</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs">Tx: {formatAddress(event.transaction_hash)}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(event.transaction_hash)}
                                      className="h-4 w-4 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
                                    >
                                      <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                    </Button>
                                    <span className="text-xs">Block: #{formatNumber(event.block_number)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                {event.decoded_data ? (
                                  <div className="max-w-48 overflow-hidden mb-2">
                                    <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded text-wrap">
                                      {JSON.stringify(event.decoded_data, null, 2).slice(0, 100)}
                                      {JSON.stringify(event.decoded_data, null, 2).length > 100 && '...'}
                                    </pre>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">No decoded data</div>
                                )}
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatTimeAgo(event.timestamp)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {eventsPagination.totalPages > 1 && (
                      <Pagination
                        pagination={eventsPagination}
                        onPageChange={handleEventsPageChange}
                        loading={eventsLoading}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="contracts" className="p-0">
                  <div className="space-y-0">
                    <div className="flex items-center justify-between p-6 pb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Contract Interactions</h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {contractInteractions.length} contracts
                      </div>
                    </div>

                    <div className="p-6 pt-4">
                      {contractInteractions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No contract interactions found
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {contractInteractions.map((interaction, index) => (
                            <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
                              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                                <Code className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                                  {interaction.contract_name || 'Unknown Contract'}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                  {formatAddress(interaction.contract_address)}
                                </div>
                                {interaction.method && (
                                  <div className="text-sm text-purple-600 dark:text-purple-400">
                                    Method: {interaction.method}
                                  </div>
                                )}
                              </div>

                              <div className="text-right flex-shrink-0">
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {formatNumber(interaction.interactions_count)}
                                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">interactions</span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Last: {formatTimeAgo(interaction.last_interaction)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  First: {formatTimeAgo(interaction.first_interaction)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tokens" className="p-0">
                  <div className="space-y-0">
                    <div className="flex items-center justify-between p-6 pb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Token Holdings</h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {tokensPagination.total} tokens
                      </div>
                    </div>

                    <TokenFiltersComponent
                      filters={tokenFilters}
                      setFilters={setTokenFilters}
                      setPagination={setTokensPagination}
                      tempTokenSymbol={tempTokenSymbol}
                      setTempTokenSymbol={setTempTokenSymbol}
                      tempTokenName={tempTokenName}
                      setTempTokenName={setTempTokenName}
                      tempTokenMinBalance={tempTokenMinBalance}
                      setTempTokenMinBalance={setTempTokenMinBalance}
                    />

                    <div className="p-6 pt-4">
                      {tokensLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-gray-500 dark:text-gray-400">Loading tokens...</span>
                          </div>
                        </div>
                      ) : tokenHoldings.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No token holdings found
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {tokenHoldings.map((token, index) => {
                            // Função para formatar o nome/símbolo do token
                            const getTokenDisplayName = () => {
                              if (token.token_symbol && token.token_symbol !== 'Unknown Token') {
                                return token.token_symbol;
                              }
                              // Se não tem símbolo, mostrar endereço formatado
                              return `Token ${formatAddress(token.token_address)}`;
                            };

                            const getTokenDescription = () => {
                              if (token.token_name && token.token_name !== 'Unknown Token Name') {
                                return token.token_name;
                              }
                              // Se não tem nome, mostrar o endereço completo do contrato
                              return `Contract: ${token.token_address}`;
                            };

                            const getFormattedBalance = () => {
                              const rawBalance = parseFloat(token.balance);
                              if (isNaN(rawBalance)) return '0';

                              // Se tem decimais definidos, usar para formatação
                              if (token.token_decimals && token.token_decimals > 0) {
                                const formattedBalance = rawBalance / Math.pow(10, token.token_decimals);
                                const symbol = token.token_symbol && token.token_symbol !== 'Unknown Token'
                                  ? token.token_symbol
                                  : 'tokens';
                                return `${formatNumber(formattedBalance)} ${symbol}`;
                              }

                              // Se não tem decimais ou é 0, mostrar o valor raw
                              const symbol = token.token_symbol && token.token_symbol !== 'Unknown Token'
                                ? token.token_symbol
                                : 'units';
                              return `${formatNumber(rawBalance)} ${symbol}`;
                            };

                            return (
                              <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
                                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                                  <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {getTokenDisplayName()}
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                    {getTokenDescription()}
                                  </div>
                                  <div className="text-sm font-medium text-green-600 dark:text-green-400">
                                    Balance: {getFormattedBalance()}
                                  </div>
                                  {token.token_decimals && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      Decimals: {token.token_decimals}
                                    </div>
                                  )}
                                </div>

                                <div className="text-right flex-shrink-0">
                                  <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {token.value_usd ? `$${formatNumber(token.value_usd)}` : 'N/A'}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Updated: {formatTimeAgo(token.last_updated)}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(token.token_address)}
                                    className="h-6 w-6 p-0 mt-1 hover:bg-gray-200 dark:hover:bg-gray-600"
                                    title="Copy token address"
                                  >
                                    <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {tokensPagination.totalPages > 1 && (
                      <Pagination
                        pagination={tokensPagination}
                        onPageChange={handleTokensPageChange}
                        loading={tokensLoading}
                      />
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Account;