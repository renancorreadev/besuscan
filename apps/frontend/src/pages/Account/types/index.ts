export interface AccountDetails {
    address: string;
    account_type: 'EOA' | 'Smart Account' | 'CONTRACT';
    balance: string;
    nonce: number;
    transaction_count: number;
    is_contract: boolean;
    contract_type?: string;
    first_seen_at: string;
    last_activity_at?: string;
    factory_address?: string;
    implementation_address?: string;
    owner_address?: string;
    label?: string;
    risk_score?: number;
    compliance_status?: 'compliant' | 'non_compliant' | 'pending' | 'under_review';
    compliance_notes?: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface AccountTag {
    address: string;
    tag: string;
    created_by?: string;
    created_at: string;
  }
  
  export interface AccountAnalytics {
    address: string;
    date: string;
    transactions_count: number;
    unique_addresses_count: number;
    gas_used: string;
    value_transferred: string;
    avg_gas_per_tx?: string;
    success_rate?: number;
    contract_calls_count?: number;
    token_transfers_count?: number;
  }
  
  export interface ContractInteraction {
    id: number;
    account_address: string;
    contract_address: string;
    contract_name?: string;
    method?: string;
    interactions_count: number;
    last_interaction: string;
    first_interaction: string;
    total_gas_used: string;
    total_value_sent: string;
  }
  
  export interface TokenHolding {
    account_address: string;
    token_address: string;
    token_symbol?: string;
    token_name?: string;
    token_decimals?: number;
    balance: string;
    value_usd?: string;
    last_updated: string;
    created_at: string;
  }
  
  export interface Transaction {
    hash: string;
    block_number: number;
    transaction_index: number;
    from_address: string;
    to_address?: string;
    value: string;
    gas_limit: number;
    gas_used: number;
    gas_price: string;
    input_data?: string;
    nonce: number;
    status: 'success' | 'failed';
    timestamp: string;
    contract_address?: string;
    method_name?: string;
  }
  
  export interface AccountTransaction {
    id: number;
    transaction_hash: string;
    block_number: number;
    transaction_index: number;
    transaction_type: 'sent' | 'received' | 'contract_call' | 'contract_creation';
    from_address: string;
    to_address?: string;
    value: string;
    gas_limit: number;
    gas_used?: number;
    gas_price?: string;
    status: 'success' | 'failed' | 'pending';
    method_name?: string;
    method_signature?: string;
    contract_address?: string;
    contract_name?: string;
    contract_type?: string;
    decoded_input?: any;
    error_message?: string;
    timestamp: string;
  }
  
  export interface AccountEvent {
    id: number;
    event_id: string;
    transaction_hash: string;
    block_number: number;
    log_index: number;
    contract_address: string;
    contract_name?: string;
    event_name: string;
    event_signature: string;
    involvement_type: 'emitter' | 'participant' | 'recipient';
    topics: any[];
    decoded_data?: any;
    timestamp: string;
  }
  
  export interface MethodStats {
    id: number;
    method_name: string;
    method_signature?: string;
    contract_address?: string;
    contract_name?: string;
    execution_count: number;
    success_count: number;
    failed_count: number;
    total_gas_used: string;
    total_value_sent: string;
    avg_gas_used: number;
    first_executed_at: string;
    last_executed_at: string;
  }
  
  // Interfaces para filtros
  export interface TransactionFilters {
    contract_type?: string;
    status?: string;
    method?: string;
    dateFrom?: string;
    dateTo?: string;
  }
  
  export interface MethodFilters {
    methodName?: string;
    contractAddress?: string;
    sortBy?: 'executions' | 'success_rate' | 'gas_used' | 'value_sent' | 'recent';
    sortDir?: 'asc' | 'desc';
  }
  
  export interface EventFilters {
    eventName?: string;
    contractAddress?: string;
    involvementType?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'timestamp' | 'event_name' | 'contract_address';
    sortDir?: 'asc' | 'desc';
  }
  
  export interface TokenFilters {
    symbol?: string;
    name?: string;
    minBalance?: string;
    hasValue?: boolean;
    sortBy?: 'balance' | 'value_usd' | 'symbol' | 'name';
    sortDir?: 'asc' | 'desc';
  }
  
  export interface PaginationState {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
  
  