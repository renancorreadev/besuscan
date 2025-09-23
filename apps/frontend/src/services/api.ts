import cacheService, { CACHE_CONFIGS } from './cache-service';
import { authService } from './auth';

// API Configuration
const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || '/api';
};

export const API_BASE_URL = getApiBaseUrl();

export const getWebSocketUrl = () => {
  // WebSocket disabled - API doesn't have WebSocket support
  return null;
};

// Interfaces para Blocos
export interface BlockSummary {
  number: number;
  hash: string;
  timestamp: string;
  miner: string;
  tx_count: number;
  gas_used: number;
  gas_limit: number;
  size: number;
}

export interface Block extends BlockSummary {
  parent_hash: string;
  nonce: string;
  difficulty: string;
  total_difficulty: string;
  extra_data: string;
  mix_hash: string;
  receipts_root: string;
  state_root: string;
  transactions_root: string;
  uncle_count: number;
  base_fee_per_gas: number;
}

// Interfaces para Transações
export interface TransactionSummary {
  hash: string;
  block_number: number;
  from: string;
  to?: string;
  value: string;
  gas: number;
  gas_used: number;
  status: 'success' | 'failed' | 'pending';
  type: number;
  method?: string;
  method_type?: string;
  mined_at: string;
  // Campos antigos mantidos para compatibilidade
  block_hash?: string;
  transaction_index?: number;
  from_address?: string;
  to_address?: string;
  gas_limit?: number;
  gas_price?: string;
  timestamp?: number;
  contract_address?: string;
}

export interface Transaction extends TransactionSummary {
  nonce: number;
  input?: string;
  data?: string;  // API returns 'data' field instead of 'input'
  max_fee_per_gas?: string;
  max_priority_fee_per_gas?: string;
  access_list?: any[];
  chain_id?: number;
  v?: string;
  r?: string;
  s?: string;
  logs?: TransactionLog[];
}

export interface TransactionLog {
  address: string;
  topics: string[];
  data: string;
  block_number: number;
  transaction_hash: string;
  transaction_index: number;
  block_hash: string;
  log_index: number;
  removed: boolean;
}

// Interfaces para Smart Contracts - Updated to match API response
export interface SmartContractSummary {
  address: string;
  name?: string;
  symbol?: string;
  contract_type?: string;
  creator_address: string;
  creation_tx_hash: string;
  creation_block_number: number;
  creation_timestamp: string; // API returns ISO string, not number
  is_verified: boolean;
  verification_date?: string;
  compiler_version?: string;
  optimization_enabled?: boolean;
  optimization_runs?: number;
  license_type?: string;
  source_code?: string;
  abi?: any[];
  bytecode?: string;
  balance: string;
  nonce: number;
  total_transactions: number;
  total_internal_transactions: number;
  total_events: number;
  unique_addresses_count: number;
  total_gas_used: string;
  total_value_transferred: string;
  is_active: boolean;
  is_proxy: boolean;
  is_token: boolean;
  description?: string;
  website_url?: string;
  github_url?: string;
  documentation_url?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface SmartContract extends SmartContractSummary {
  compiler_version?: string;
  optimization_enabled?: boolean;
  optimization_runs?: number;
  license?: string;
  proxy_type?: string;
  implementation_address?: string;
  description?: string;
  website?: string;
  social_links?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
    github?: string;
  };
}

export interface SmartContractABI {
  type: 'function' | 'constructor' | 'event' | 'fallback' | 'receive';
  name?: string;
  inputs: ABIInput[];
  outputs?: ABIOutput[];
  stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable';
  anonymous?: boolean;
}

export interface ABIInput {
  name: string;
  type: string;
  indexed?: boolean;
  components?: ABIInput[];
}

export interface ABIOutput {
  name: string;
  type: string;
  components?: ABIOutput[];
}

export interface SmartContractSourceCode {
  source_code: string;
  compiler_version: string;
  optimization_enabled: boolean;
  optimization_runs: number;
  constructor_arguments?: string;
  library_used?: string;
  license_type?: string;
}

export interface SmartContractFunction {
  name: string;
  type: 'read' | 'write';
  inputs: ABIInput[];
  outputs?: ABIOutput[];
  stateMutability: string;
  payable: boolean;
}

export interface SmartContractEvent {
  name: string;
  inputs: ABIInput[];
  anonymous: boolean;
  signature: string;
}

// Interfaces para Events
export interface EventSummary {
  id: string;
  event_name: string;
  contract_address: string;
  contract_name?: string;
  method: string;
  transaction_hash: string;
  block_number: number;
  block_hash?: string;
  log_index?: number;
  timestamp: string; // API retorna string ISO, não number
  from_address: string;
  to_address?: string;
  topics: string[] | null;
  data: string;
  decoded_data?: {
    [key: string]: any;
  };
}

export interface Event extends EventSummary {
  transaction_index: number;
  gas_used: number;
  gas_price: string;
  status: 'success' | 'failed';
  removed: boolean;
  contract_type?: string;
  event_signature: string;
  raw_log: {
    address: string;
    topics: string[];
    data: string;
  };
}

export interface EventsResponse {
  success: boolean;
  data: EventSummary[];
  count: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface EventResponse {
  success: boolean;
  data: Event;
}

export interface EventStatsResponse {
  success: boolean;
  data: {
    total_events: number;
    unique_contracts: number;
    popular_events: Array<{
      event_name: string;
      count: number;
      percentage: number;
    }>;
    recent_activity: Array<{
      date: string;
      count: number;
    }>;
  };
}

// Interfaces para Validadores QBFT
export interface ValidatorSummary {
  address: string;
  proposed_block_count: string;
  last_proposed_block_number: string;
  status: 'active' | 'inactive';
  is_active: boolean;
  uptime: number;
  last_seen: string;
}

export interface Validator extends ValidatorSummary {
  first_seen: string;
  created_at: string;
  updated_at: string;
}

export interface ValidatorMetrics {
  total_validators: number;
  active_validators: number;
  inactive_validators: number;
  consensus_type: string;
  current_epoch: number;
  epoch_length: number;
  average_uptime: number;
}

export interface SmartContractMetrics {
  total_transactions: number;
  unique_users: number;
  total_value_transferred: string;
  gas_consumed: number;
  average_gas_per_tx: number;
  daily_transactions: Array<{
    date: string;
    count: number;
  }>;
  top_functions: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
}

// Interfaces para Respostas da API
export interface BlocksResponse {
  success: boolean;
  data: BlockSummary[];
  count: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface BlockResponse {
  success: boolean;
  data: Block;
}

export interface BlockStatsResponse {
  success: boolean;
  data: {
    total_blocks: number;
    latest_block_number: number;
    latest_block_hash: string;
    latest_block_timestamp: string;
    avg_block_time?: number;
    avg_gas_used?: number;
    avg_transaction_count?: number;
    network_utilization?: string;
    last_safe_block?: number;
  };
}

export interface TransactionsResponse {
  success: boolean;
  data: TransactionSummary[];
  count: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface TransactionResponse {
  success: boolean;
  data: Transaction;
}

export interface TransactionStatsResponse {
  success: boolean;
  data: {
    total_transactions: number;
    pending_transactions: number;
    success_transactions: number;
    failed_transactions: number;
    total_gas_used: number;
    average_gas_price: number;
    average_transaction_fee: number;
  };
}

export interface SmartContractsResponse {
  success: boolean;
  data: SmartContractSummary[];
  count?: number;
  pagination?: {
    current_page: number;
    items_per_page: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface SmartContractResponse {
  success: boolean;
  data: SmartContract;
}

export interface SmartContractStatsResponse {
  success: boolean;
  data: {
    total_contracts: number;
    verified_contracts: number;
    active_contracts: number;
    token_contracts: number;
    total_transactions: number;
    total_gas_used: string;
    total_value_transferred: string;
    contract_types: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    daily_deployments: Array<{
      date: string;
      count: number;
    }>;
  };
}

// Response types para Validadores
export interface ValidatorsResponse {
  success: boolean;
  data: ValidatorSummary[];
  count: number;
}

export interface ValidatorResponse {
  success: boolean;
  data: Validator;
}

export interface ValidatorMetricsResponse {
  success: boolean;
  data: ValidatorMetrics;
}

// Interfaces para Estatísticas Gerais
export interface GeneralStats {
  total_blocks: number;
  latest_block_number: number;
  total_transactions: number;
  total_contracts: number;
  avg_block_time: number;
  network_utilization: string;
  avg_gas_used: number;
  active_validators: number;
  top_methods: MethodStats[];
}

export interface MethodStats {
  method_name: string;
  call_count: number;
  total_gas_used: number;
  contract_name: string;
}

// Novas interfaces para Gas Trends e Volume Distribution
export interface GasTrend {
  date: string;
  avg_price: string;
  min_price: string;
  max_price: string;
  volume: string;
  tx_count: number;
}

export interface VolumeByTime {
  time: string;
  volume: string;
  count: number;
}

export interface VolumeByContractType {
  contract_type: string;
  volume: string;
  count: number;
  percentage: number;
}

export interface VolumeDistribution {
  period: string;
  total_volume: string;
  total_transactions: number;
  by_hour?: VolumeByTime[];
  by_day?: VolumeByTime[];
  by_contract_type: VolumeByContractType[];
}

export interface RecentActivity {
  last_24h_growth: string;
  peak_tps: number;
  new_contracts: number;
  active_addresses: number;
}

// API Service Class
class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(), // Incluir token de autenticação automaticamente
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Cached request wrapper
  private async cachedRequest<T>(
    cacheKey: string,
    endpoint: string,
    ttl: number,
    options?: RequestInit,
    forceRefresh: boolean = false
  ): Promise<T> {
    // Force refresh bypasses cache
    if (forceRefresh) {
      cacheService.forceRefresh(cacheKey);
    }

    // Try to get from cache first
    const cached = cacheService.get<T>(cacheKey);
    if (cached && !forceRefresh) {
      return cached;
    }

    // If not in cache, make request
    const data = await this.request<T>(endpoint, options);

    // Cache the result
    cacheService.set(cacheKey, data, ttl);

    return data;
  }

  // Smart cached request that invalidates related cache on new data
  private async smartCachedRequest<T>(
    cacheKey: string,
    endpoint: string,
    ttl: number,
    invalidationPattern?: string,
    options?: RequestInit
  ): Promise<T> {
    const data = await this.cachedRequest<T>(cacheKey, endpoint, ttl, options);

    // If this is fresh data, invalidate related caches
    if (invalidationPattern && !cacheService.isFresh(cacheKey, 1000)) {
      cacheService.invalidatePattern(invalidationPattern);
    }

    return data;
  }

  // Métodos para Blocos
  async getBlocks(params?: {
    limit?: number;
    page?: number;
    order?: 'asc' | 'desc';
  }): Promise<BlocksResponse> {
    const searchParams = new URLSearchParams();

    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.order) searchParams.append('order', params.order);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/blocks?${queryString}` : '/blocks';
    const cacheKey = `blocks_${queryString || 'default'}`;

    return this.cachedRequest(cacheKey, endpoint, CACHE_CONFIGS.BLOCKS);
  }

  async getBlock(identifier: string | number): Promise<BlockResponse> {
    return this.request(`/blocks/${identifier}`);
  }

  async getLatestBlock(): Promise<BlockResponse> {
    // Use shorter cache for latest block to ensure freshness
    return this.cachedRequest('latest_block', '/blocks/latest', CACHE_CONFIGS.LATEST_BLOCK);
  }

  async getBlockStats(): Promise<BlockStatsResponse> {
    return this.cachedRequest('block_stats', '/blocks/stats', CACHE_CONFIGS.NETWORK_STATS);
  }

  async getDashboardData(): Promise<{ success: boolean; data: any; cached?: boolean }> {
    return this.cachedRequest('dashboard_data', '/dashboard/data', CACHE_CONFIGS.DASHBOARD_DATA);
  }

  async getBlocksByRange(from: number, to: number): Promise<BlocksResponse> {
    return this.request(`/blocks/range?from=${from}&to=${to}`);
  }

  async getUniqueMiners(): Promise<{ success: boolean; data: string[]; count: number }> {
    return this.request('/blocks/miners');
  }

  async searchBlocks(filters: {
    miner?: string;
    min_gas_used?: number;
    max_gas_used?: number;
    min_timestamp?: number;
    max_timestamp?: number;
    order_by?: string;
    page?: number;
    limit?: number;
  }): Promise<BlocksResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/blocks/search?${searchParams.toString()}`);
  }

  // Métodos para Transações
  async getTransactions(params?: {
    limit?: number;
    page?: number;
    order?: 'asc' | 'desc';
  }): Promise<TransactionsResponse> {
    const searchParams = new URLSearchParams();

    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.order) searchParams.append('order', params.order);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/transactions?${queryString}` : '/transactions';

    return this.request(endpoint);
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    return this.request(`/transactions/${hash}`);
  }

  async getTransactionStats(): Promise<TransactionStatsResponse> {
    return this.cachedRequest('transaction_stats', '/transactions/stats', CACHE_CONFIGS.NETWORK_STATS);
  }

  async searchTransactions(filters: {
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
  }): Promise<TransactionsResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/transactions/search?${searchParams.toString()}`);
  }

  async getTransactionsByValue(min?: string, max?: string): Promise<TransactionsResponse> {
    const params = new URLSearchParams();
    if (min) params.append('min', min);
    if (max) params.append('max', max);
    return this.request(`/transactions/value?${params.toString()}`);
  }

  async getTransactionsByType(type: number): Promise<TransactionsResponse> {
    return this.request(`/transactions/type/${type}`);
  }

  async getContractCreations(): Promise<TransactionsResponse> {
    return this.request('/transactions/contracts');
  }

  async getTransactionsByDateRange(from: string, to: string): Promise<TransactionsResponse> {
    return this.request(`/transactions/date-range?from=${from}&to=${to}`);
  }

  async getTransactionsByBlock(blockNumber: number): Promise<TransactionsResponse> {
    return this.request(`/transactions/block/${blockNumber}`);
  }

  async getTransactionsByAddress(address: string): Promise<TransactionsResponse> {
    return this.request(`/transactions/address/${address}`);
  }

  async getTransactionsByStatus(status: 'success' | 'failed' | 'pending'): Promise<TransactionsResponse> {
    return this.request(`/transactions/status/${status}`);
  }

  // Métodos para Smart Contracts
  async getSmartContracts(params?: {
    limit?: number;
    page?: number;
    type?: string;
    verified?: boolean;
  }): Promise<SmartContractsResponse> {
    const searchParams = new URLSearchParams();

    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.type) searchParams.append('type', params.type);
    if (params?.verified !== undefined) searchParams.append('verified', params.verified.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/smart-contracts?${queryString}` : '/smart-contracts';

    return this.request(endpoint);
  }

  async getSmartContract(address: string): Promise<SmartContractResponse> {
    return this.request(`/smart-contracts/${address}`);
  }

  async getSmartContractStats(): Promise<SmartContractStatsResponse> {
    return this.cachedRequest('smart_contract_stats', '/smart-contracts/stats', CACHE_CONFIGS.NETWORK_STATS);
  }

  async searchSmartContracts(query: string): Promise<SmartContractsResponse> {
    return this.request(`/smart-contracts/search?q=${encodeURIComponent(query)}`);
  }

  async getVerifiedSmartContracts(): Promise<SmartContractsResponse> {
    return this.request('/smart-contracts/verified');
  }

  async getPopularSmartContracts(): Promise<SmartContractsResponse> {
    return this.request('/smart-contracts/popular');
  }

  async getSmartContractsByType(type: string): Promise<SmartContractsResponse> {
    return this.request(`/smart-contracts/type/${type}`);
  }

  // Buscar ABI do smart contract
  async getSmartContractABI(address: string): Promise<{ success: boolean; data: SmartContractABI[] }> {
    return this.request(`/smart-contracts/${address}/abi`);
  }

  // Buscar código fonte do smart contract
  async getSmartContractSourceCode(address: string): Promise<{ success: boolean; data: SmartContractSourceCode }> {
    return this.request(`/smart-contracts/${address}/source`);
  }

  // Buscar funções do smart contract
  async getSmartContractFunctions(address: string): Promise<{ success: boolean; data: SmartContractFunction[] }> {
    return this.request(`/smart-contracts/${address}/functions`);
  }

  // Buscar eventos do smart contract
  async getSmartContractEvents(address: string): Promise<{ success: boolean; data: SmartContractEvent[] }> {
    return this.request(`/smart-contracts/${address}/events`);
  }

  // Buscar métricas do smart contract
  async getSmartContractMetrics(address: string): Promise<{ success: boolean; data: SmartContractMetrics }> {
    return this.request(`/smart-contracts/${address}/metrics`);
  }

  // Verificar smart contract
  async verifySmartContract(data: {
    address: string;
    source_code: string;
    compiler_version: string;
    optimization_enabled: boolean;
    optimization_runs?: number;
    constructor_arguments?: string;
    contract_name: string;
    license_type?: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.request('/smart-contracts/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Registrar smart contract
  async registerSmartContract(data: {
    address: string;
    name: string;
    type?: string;
    description?: string;
    website?: string;
    social_links?: {
      twitter?: string;
      telegram?: string;
      discord?: string;
      github?: string;
    };
  }): Promise<{ success: boolean; message: string }> {
    return this.request('/smart-contracts/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ===== STATS API METHODS =====

  async getGeneralStats(): Promise<{ success: boolean; data: GeneralStats }> {
    return this.cachedRequest('general_stats', '/stats', CACHE_CONFIGS.NETWORK_STATS);
  }

  async getRecentActivity(): Promise<{ success: boolean; data: RecentActivity }> {
    return this.cachedRequest('recent_activity', '/stats/recent-activity', CACHE_CONFIGS.NETWORK_STATS);
  }

  async getGasTrends(days: number = 7): Promise<{ success: boolean; data: { trends: GasTrend[]; days: number; count: number } }> {
    return this.cachedRequest(`gas_trends_${days}`, `/blocks/gas-trends?days=${days}`, CACHE_CONFIGS.NETWORK_STATS);
  }

  async getVolumeDistribution(period: string = '24h'): Promise<{ success: boolean; data: { distribution: VolumeDistribution; period: string } }> {
    return this.cachedRequest(`volume_distribution_${period}`, `/blocks/volume-distribution?period=${period}`, CACHE_CONFIGS.NETWORK_STATS);
  }

  // ===== VALIDATORS API METHODS =====

  async getValidators(): Promise<ValidatorsResponse> {
    return this.request('/validators');
  }

  async getActiveValidators(): Promise<ValidatorsResponse> {
    return this.request('/validators/active');
  }

  async getInactiveValidators(): Promise<ValidatorsResponse> {
    return this.request('/validators/inactive');
  }

  async getValidator(address: string): Promise<ValidatorResponse> {
    return this.request(`/validators/${address}`);
  }

  async getValidatorMetrics(): Promise<ValidatorMetricsResponse> {
    return this.request('/validators/metrics');
  }

  async syncValidators(): Promise<{ success: boolean; message: string }> {
    return this.request('/validators/sync', {
      method: 'POST'
    });
  }

  // Events API methods
  async getEvents(params?: {
    limit?: number;
    page?: number;
    order?: 'asc' | 'desc';
  }): Promise<EventsResponse> {
    const searchParams = new URLSearchParams();

    if (params?.limit) {
      searchParams.append('limit', params.limit.toString());
    }
    if (params?.page) {
      searchParams.append('page', params.page.toString());
    }
    if (params?.order) {
      searchParams.append('order', params.order);
    }

    return this.request(`/events?${searchParams.toString()}`);
  }

  async getEvent(id: string): Promise<EventResponse> {
    return this.request(`/events/${id}`);
  }

  async getEventStats(): Promise<EventStatsResponse> {
    return this.request('/events/stats');
  }

  async searchEvents(filters: {
    search?: string;
    contract_address?: string;
    event_name?: string;
    from_address?: string;
    to_address?: string;
    from_block?: string;
    to_block?: string;
    from_date?: string;
    to_date?: string;
    transaction_hash?: string;
    order_by?: string;
    order_dir?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<EventsResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/events/search?${searchParams.toString()}`);
  }

  async getEventsByContract(contractAddress: string): Promise<EventsResponse> {
    return this.request(`/events/contract/${contractAddress}`);
  }

  async getEventsByTransaction(transactionHash: string): Promise<EventsResponse> {
    return this.request(`/events/transaction/${transactionHash}`);
  }

  async getEventsByBlock(blockNumber: number): Promise<EventsResponse> {
    return this.request(`/events/block/${blockNumber}`);
  }
}

export const apiService = new ApiService();

// Utility functions
export const formatHash = (hash: string, length = 10): string => {
  if (!hash) return '';
  return `${hash.slice(0, length)}...${hash.slice(-4)}`;
};

export const formatAddress = (address: string, length = 10): string => {
  if (!address) return '';
  return `${address.slice(0, length)}...${address.slice(-4)}`;
};

export const formatTimestamp = (timestamp: number | string): string => {
  if (!timestamp) return '';

  // Handle both number (unix timestamp) and string (ISO date)
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp * 1000);

  if (isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleString();
};

export const formatTimeAgo = (timestamp: number | string): string => {
  if (!timestamp) return '';

  const now = Date.now();
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp * 1000);

  if (isNaN(date.getTime())) return 'Invalid date';

  const diff = now - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
};

export const formatGasUsed = (gasUsed: number | undefined | null, gasLimit: number | undefined | null): string => {
  if (!gasUsed || !gasLimit || isNaN(gasUsed) || isNaN(gasLimit) || gasLimit === 0) {
    return '0 (0%)';
  }

  const percentage = ((gasUsed / gasLimit) * 100);

  if (isNaN(percentage)) {
    return `${gasUsed.toLocaleString()} (0%)`;
  }

  return `${gasUsed.toLocaleString()} (${percentage.toFixed(2)}%)`;
};

export const formatNumber = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }
  return num.toLocaleString();
};

export const formatLargeNumber = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }

  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }

  return num.toLocaleString();
};

export const formatEther = (wei: string | number): string => {
  if (!wei) return '0 ETH';

  const weiValue = typeof wei === 'string' ? BigInt(wei) : BigInt(wei.toString());
  const etherValue = Number(weiValue) / Math.pow(10, 18);

  if (etherValue === 0) return '0 ETH';
  if (etherValue < 0.0001) return '<0.0001 ETH';

  return `${etherValue.toFixed(4)} ETH`;
};

export const formatGwei = (wei: string | number): string => {
  if (!wei) return '0 Gwei';

  const weiValue = typeof wei === 'string' ? BigInt(wei) : BigInt(wei.toString());
  const gweiValue = Number(weiValue) / Math.pow(10, 9);

  if (gweiValue === 0) return '0 Gwei';
  if (gweiValue < 0.001) return '<0.001 Gwei';

  return `${gweiValue.toFixed(3)} Gwei`;
};

export const getTransactionTypeLabel = (type: number): string => {
  switch (type) {
    case 0: return 'Legacy';
    case 1: return 'EIP-2930';
    case 2: return 'EIP-1559';
    default: return `Type ${type}`;
  }
};

export const getContractTypeColor = (type?: string): string => {
  if (!type) return 'gray';

  switch (type.toLowerCase()) {
    case 'erc-20': return 'blue';
    case 'erc-721': return 'purple';
    case 'erc-1155': return 'green';
    case 'proxy': return 'orange';
    case 'multisig': return 'red';
    default: return 'gray';
  }
};

export const formatBlockTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds <= 0) return '0s';

  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }
};
