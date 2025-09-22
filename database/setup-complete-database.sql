-- =============================================================================
-- SETUP COMPLETO DO BANCO DE DADOS - BeSuScan Explorer
-- =============================================================================
-- Este arquivo contém TUDO necessário para recriar o banco do zero
-- 
-- Uso: 
-- docker exec -i explorer-postgres-dev psql -U explorer -d blockexplorer < database/setup-complete-database.sql
-- 
-- Ou para produção:
-- psql -U explorer -d blockexplorer < database/setup-complete-database.sql
-- =============================================================================

-- Conectar ao banco e limpar se necessário
\c blockexplorer;

-- =============================================================================
-- 1. LIMPAR BANCO (CUIDADO: REMOVE TUDO!)
-- =============================================================================

-- Remover triggers primeiro
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts CASCADE;
DROP TRIGGER IF EXISTS update_smart_contracts_updated_at ON smart_contracts CASCADE;
DROP TRIGGER IF EXISTS update_account_analytics_updated_at ON account_analytics CASCADE;
DROP TRIGGER IF EXISTS update_contract_interactions_updated_at ON contract_interactions CASCADE;
DROP TRIGGER IF EXISTS update_contract_events_updated_at ON smart_contract_events CASCADE;
DROP TRIGGER IF EXISTS update_contract_functions_updated_at ON smart_contract_functions CASCADE;
DROP TRIGGER IF EXISTS update_token_holdings_updated_at ON token_holdings CASCADE;
DROP TRIGGER IF EXISTS trigger_events_updated_at ON events CASCADE;
DROP TRIGGER IF EXISTS update_validators_updated_at_trigger ON validators CASCADE;

-- Remover funções
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_events_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_validators_updated_at() CASCADE;

-- Remover tabelas (ordem importa devido a foreign keys)
DROP TABLE IF EXISTS token_holdings CASCADE;
DROP TABLE IF EXISTS smart_contract_functions CASCADE;
DROP TABLE IF EXISTS smart_contract_events CASCADE;
DROP TABLE IF EXISTS contract_interactions CASCADE;
DROP TABLE IF EXISTS account_analytics CASCADE;
DROP TABLE IF EXISTS smart_contracts CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS transaction_logs CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS blocks CASCADE;
DROP TABLE IF EXISTS validators CASCADE;

-- =============================================================================
-- 2. CRIAR EXTENSÕES NECESSÁRIAS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =============================================================================
-- 3. CRIAR FUNÇÕES DE TRIGGER
-- =============================================================================

-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Função específica para events
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Função específica para validators
CREATE OR REPLACE FUNCTION update_validators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================
-- 4. CRIAR TABELAS PRINCIPAIS
-- =============================================================================

-- Tabela de validadores
CREATE TABLE validators (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) UNIQUE NOT NULL,
    name VARCHAR(255),
    description TEXT,
    website VARCHAR(255),
    stake DECIMAL(78, 0) DEFAULT 0,
    commission_rate DECIMAL(5, 4) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    uptime_percentage DECIMAL(5, 2) DEFAULT 100.00,
    blocks_proposed INTEGER DEFAULT 0,
    last_block_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de blocos
CREATE TABLE blocks (
    id SERIAL PRIMARY KEY,
    block_number BIGINT UNIQUE NOT NULL,
    block_hash VARCHAR(66) UNIQUE NOT NULL,
    parent_hash VARCHAR(66) NOT NULL,
    state_root VARCHAR(66),
    transactions_root VARCHAR(66),
    receipts_root VARCHAR(66),
    miner VARCHAR(42),
    difficulty DECIMAL(78, 0),
    total_difficulty DECIMAL(78, 0),
    size_bytes INTEGER,
    gas_limit BIGINT,
    gas_used BIGINT,
    timestamp BIGINT NOT NULL,
    extra_data TEXT,
    mix_hash VARCHAR(66),
    nonce VARCHAR(18),
    base_fee_per_gas BIGINT,
    transaction_count INTEGER DEFAULT 0,
    uncle_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de contas
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) UNIQUE NOT NULL,
    balance DECIMAL(78, 0) DEFAULT 0,
    nonce BIGINT DEFAULT 0,
    code_hash VARCHAR(66),
    storage_root VARCHAR(66),
    is_contract BOOLEAN DEFAULT false,
    contract_creator VARCHAR(42),
    creation_transaction_hash VARCHAR(66),
    creation_block_number BIGINT,
    first_seen_block BIGINT,
    last_seen_block BIGINT,
    transaction_count INTEGER DEFAULT 0,
    internal_transaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creation_block_number) REFERENCES blocks(block_number),
    FOREIGN KEY (first_seen_block) REFERENCES blocks(block_number),
    FOREIGN KEY (last_seen_block) REFERENCES blocks(block_number)
);

-- Tabela de transações
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    transaction_hash VARCHAR(66) UNIQUE NOT NULL,
    block_number BIGINT NOT NULL,
    block_hash VARCHAR(66) NOT NULL,
    transaction_index INTEGER NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42),
    value DECIMAL(78, 0) DEFAULT 0,
    gas_limit BIGINT NOT NULL,
    gas_used BIGINT,
    gas_price BIGINT,
    max_fee_per_gas BIGINT,
    max_priority_fee_per_gas BIGINT,
    effective_gas_price BIGINT,
    nonce BIGINT NOT NULL,
    input_data TEXT,
    status INTEGER,
    contract_address VARCHAR(42),
    cumulative_gas_used BIGINT,
    logs_bloom TEXT,
    transaction_type INTEGER DEFAULT 0,
    access_list JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (block_number) REFERENCES blocks(block_number),
    FOREIGN KEY (from_address) REFERENCES accounts(address),
    FOREIGN KEY (to_address) REFERENCES accounts(address)
);

-- Tabela de logs de transação
CREATE TABLE transaction_logs (
    id SERIAL PRIMARY KEY,
    transaction_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    address VARCHAR(42) NOT NULL,
    topic0 VARCHAR(66),
    topic1 VARCHAR(66),
    topic2 VARCHAR(66),
    topic3 VARCHAR(66),
    data TEXT,
    block_number BIGINT NOT NULL,
    block_hash VARCHAR(66) NOT NULL,
    transaction_index INTEGER NOT NULL,
    removed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_hash) REFERENCES transactions(transaction_hash),
    FOREIGN KEY (block_number) REFERENCES blocks(block_number),
    FOREIGN KEY (address) REFERENCES accounts(address)
);

-- Tabela de eventos
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    transaction_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    address VARCHAR(42) NOT NULL,
    event_name VARCHAR(255),
    event_signature VARCHAR(66),
    topic0 VARCHAR(66),
    topic1 VARCHAR(66),
    topic2 VARCHAR(66),
    topic3 VARCHAR(66),
    data TEXT,
    decoded_data JSONB,
    block_number BIGINT NOT NULL,
    block_hash VARCHAR(66) NOT NULL,
    transaction_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_hash) REFERENCES transactions(transaction_hash),
    FOREIGN KEY (block_number) REFERENCES blocks(block_number),
    FOREIGN KEY (address) REFERENCES accounts(address)
);

-- Tabela de contratos inteligentes
CREATE TABLE smart_contracts (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) UNIQUE NOT NULL,
    name VARCHAR(255),
    symbol VARCHAR(50),
    decimals INTEGER,
    total_supply DECIMAL(78, 0),
    contract_type VARCHAR(50), -- ERC20, ERC721, ERC1155, Custom, etc.
    source_code TEXT,
    abi JSONB,
    bytecode TEXT,
    constructor_arguments TEXT,
    compiler_version VARCHAR(50),
    optimization_enabled BOOLEAN DEFAULT false,
    optimization_runs INTEGER,
    evm_version VARCHAR(50),
    license_type VARCHAR(100),
    proxy_implementation VARCHAR(42),
    is_proxy BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMP,
    creator_address VARCHAR(42),
    creation_transaction_hash VARCHAR(66),
    creation_block_number BIGINT,
    transaction_count INTEGER DEFAULT 0,
    holder_count INTEGER DEFAULT 0,
    transfer_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (address) REFERENCES accounts(address),
    FOREIGN KEY (creator_address) REFERENCES accounts(address),
    FOREIGN KEY (creation_transaction_hash) REFERENCES transactions(transaction_hash),
    FOREIGN KEY (creation_block_number) REFERENCES blocks(block_number)
);

-- Tabela de analytics de contas
CREATE TABLE account_analytics (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) NOT NULL,
    date DATE NOT NULL,
    balance_start DECIMAL(78, 0) DEFAULT 0,
    balance_end DECIMAL(78, 0) DEFAULT 0,
    balance_change DECIMAL(78, 0) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    gas_used BIGINT DEFAULT 0,
    gas_fees_paid DECIMAL(78, 0) DEFAULT 0,
    tokens_transferred INTEGER DEFAULT 0,
    unique_counterparties INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(address, date),
    FOREIGN KEY (address) REFERENCES accounts(address)
);

-- Tabela de interações de contratos
CREATE TABLE contract_interactions (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(42) NOT NULL,
    caller_address VARCHAR(42) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    function_name VARCHAR(255),
    function_signature VARCHAR(10),
    input_data TEXT,
    output_data TEXT,
    gas_used BIGINT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    internal_transactions_count INTEGER DEFAULT 0,
    events_emitted INTEGER DEFAULT 0,
    value_transferred DECIMAL(78, 0) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_address) REFERENCES smart_contracts(address),
    FOREIGN KEY (caller_address) REFERENCES accounts(address),
    FOREIGN KEY (transaction_hash) REFERENCES transactions(transaction_hash)
);

-- Tabela de eventos de contratos inteligentes
CREATE TABLE smart_contract_events (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(42) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_signature VARCHAR(66) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    block_number BIGINT NOT NULL,
    decoded_params JSONB,
    raw_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_address) REFERENCES smart_contracts(address),
    FOREIGN KEY (transaction_hash) REFERENCES transactions(transaction_hash),
    FOREIGN KEY (block_number) REFERENCES blocks(block_number)
);

-- Tabela de funções de contratos inteligentes
CREATE TABLE smart_contract_functions (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(42) NOT NULL,
    function_name VARCHAR(255) NOT NULL,
    function_signature VARCHAR(10) NOT NULL,
    function_selector VARCHAR(10) NOT NULL,
    input_types TEXT[],
    output_types TEXT[],
    state_mutability VARCHAR(20), -- pure, view, nonpayable, payable
    is_constructor BOOLEAN DEFAULT false,
    is_fallback BOOLEAN DEFAULT false,
    is_receive BOOLEAN DEFAULT false,
    call_count INTEGER DEFAULT 0,
    last_called_block BIGINT,
    last_called_transaction VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_address) REFERENCES smart_contracts(address),
    FOREIGN KEY (last_called_block) REFERENCES blocks(block_number),
    FOREIGN KEY (last_called_transaction) REFERENCES transactions(transaction_hash)
);

-- Tabela de holdings de tokens
CREATE TABLE token_holdings (
    id SERIAL PRIMARY KEY,
    holder_address VARCHAR(42) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    balance DECIMAL(78, 0) DEFAULT 0,
    balance_formatted DECIMAL(36, 18) DEFAULT 0,
    percentage_of_supply DECIMAL(10, 6) DEFAULT 0,
    first_transfer_block BIGINT,
    last_transfer_block BIGINT,
    transfer_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(holder_address, token_address),
    FOREIGN KEY (holder_address) REFERENCES accounts(address),
    FOREIGN KEY (token_address) REFERENCES smart_contracts(address),
    FOREIGN KEY (first_transfer_block) REFERENCES blocks(block_number),
    FOREIGN KEY (last_transfer_block) REFERENCES blocks(block_number)
);

-- =============================================================================
-- 5. CRIAR ÍNDICES PARA PERFORMANCE
-- =============================================================================

-- Índices para blocks
CREATE INDEX idx_blocks_number ON blocks(block_number);
CREATE INDEX idx_blocks_hash ON blocks(block_hash);
CREATE INDEX idx_blocks_timestamp ON blocks(timestamp);
CREATE INDEX idx_blocks_miner ON blocks(miner);

-- Índices para accounts
CREATE INDEX idx_accounts_address ON accounts(address);
CREATE INDEX idx_accounts_is_contract ON accounts(is_contract);
CREATE INDEX idx_accounts_creation_block ON accounts(creation_block_number);

-- Índices para transactions
CREATE INDEX idx_transactions_hash ON transactions(transaction_hash);
CREATE INDEX idx_transactions_block_number ON transactions(block_number);
CREATE INDEX idx_transactions_from ON transactions(from_address);
CREATE INDEX idx_transactions_to ON transactions(to_address);
CREATE INDEX idx_transactions_timestamp ON transactions(created_at);

-- Índices para transaction_logs
CREATE INDEX idx_transaction_logs_tx_hash ON transaction_logs(transaction_hash);
CREATE INDEX idx_transaction_logs_address ON transaction_logs(address);
CREATE INDEX idx_transaction_logs_topic0 ON transaction_logs(topic0);
CREATE INDEX idx_transaction_logs_block_number ON transaction_logs(block_number);

-- Índices para events
CREATE INDEX idx_events_tx_hash ON events(transaction_hash);
CREATE INDEX idx_events_address ON events(address);
CREATE INDEX idx_events_event_name ON events(event_name);
CREATE INDEX idx_events_block_number ON events(block_number);
CREATE INDEX idx_events_topic0 ON events(topic0);

-- Índices para smart_contracts
CREATE INDEX idx_smart_contracts_address ON smart_contracts(address);
CREATE INDEX idx_smart_contracts_type ON smart_contracts(contract_type);
CREATE INDEX idx_smart_contracts_verified ON smart_contracts(is_verified);
CREATE INDEX idx_smart_contracts_creator ON smart_contracts(creator_address);

-- Índices para contract_interactions
CREATE INDEX idx_contract_interactions_contract ON contract_interactions(contract_address);
CREATE INDEX idx_contract_interactions_caller ON contract_interactions(caller_address);
CREATE INDEX idx_contract_interactions_tx_hash ON contract_interactions(transaction_hash);
CREATE INDEX idx_contract_interactions_function ON contract_interactions(function_name);

-- Índices para token_holdings
CREATE INDEX idx_token_holdings_holder ON token_holdings(holder_address);
CREATE INDEX idx_token_holdings_token ON token_holdings(token_address);
CREATE INDEX idx_token_holdings_balance ON token_holdings(balance);
CREATE INDEX idx_token_holdings_active ON token_holdings(is_active);

-- Índices para validators
CREATE INDEX idx_validators_address ON validators(address);
CREATE INDEX idx_validators_active ON validators(is_active);

-- =============================================================================
-- 6. CRIAR TRIGGERS
-- =============================================================================

-- Triggers para atualização automática de updated_at
CREATE TRIGGER update_accounts_updated_at 
    BEFORE UPDATE ON accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_smart_contracts_updated_at 
    BEFORE UPDATE ON smart_contracts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_analytics_updated_at 
    BEFORE UPDATE ON account_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_interactions_updated_at 
    BEFORE UPDATE ON contract_interactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_events_updated_at 
    BEFORE UPDATE ON smart_contract_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_functions_updated_at 
    BEFORE UPDATE ON smart_contract_functions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_token_holdings_updated_at 
    BEFORE UPDATE ON token_holdings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger específico para events
CREATE TRIGGER trigger_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW EXECUTE FUNCTION update_events_updated_at();

-- Trigger específico para validators
CREATE TRIGGER update_validators_updated_at_trigger 
    BEFORE UPDATE ON validators 
    FOR EACH ROW EXECUTE FUNCTION update_validators_updated_at();

-- =============================================================================
-- 7. CONFIGURAÇÕES DE PERFORMANCE POSTGRESQL
-- =============================================================================

-- Aplicar configurações de performance otimizadas para blockchain
-- Baseado em: database/postgresql-performance.conf

-- Memory Settings
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET work_mem = '256MB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET effective_cache_size = '6GB';

-- WAL Settings (Write-Ahead Logging)
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET wal_buffers = '64MB';
ALTER SYSTEM SET checkpoint_timeout = '15min';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET max_wal_size = '4GB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET wal_writer_delay = '10ms';
ALTER SYSTEM SET wal_writer_flush_after = '1MB';

-- Background Writer Settings
ALTER SYSTEM SET bgwriter_delay = '10ms';
ALTER SYSTEM SET bgwriter_lru_maxpages = 1000;
ALTER SYSTEM SET bgwriter_lru_multiplier = 10.0;
ALTER SYSTEM SET bgwriter_flush_after = '512kB';

-- Autovacuum Settings
ALTER SYSTEM SET autovacuum = on;
ALTER SYSTEM SET autovacuum_max_workers = 6;
ALTER SYSTEM SET autovacuum_naptime = '15s';
ALTER SYSTEM SET autovacuum_vacuum_threshold = 1000;
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.05;
ALTER SYSTEM SET autovacuum_analyze_threshold = 1000;
ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.02;

-- Connection Settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Query Planner Settings
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET seq_page_cost = 1.0;

-- Logging Settings
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;

-- pg_stat_statements extension
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET pg_stat_statements.max = 10000;

-- Blockchain-specific optimizations
ALTER SYSTEM SET max_locks_per_transaction = 256;
ALTER SYSTEM SET max_pred_locks_per_transaction = 256;

-- Parallel Query Settings
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
ALTER SYSTEM SET max_parallel_workers = 8;
ALTER SYSTEM SET max_parallel_maintenance_workers = 4;

-- Timezone and Locale
ALTER SYSTEM SET timezone = 'UTC';
ALTER SYSTEM SET lc_messages = 'C';
ALTER SYSTEM SET lc_monetary = 'C';
ALTER SYSTEM SET lc_numeric = 'C';
ALTER SYSTEM SET lc_time = 'C';

-- Statistics
ALTER SYSTEM SET default_statistics_target = 1000;

-- Additional optimizations
ALTER SYSTEM SET track_activity_query_size = 8192;
ALTER SYSTEM SET track_io_timing = on;

-- =============================================================================
-- 8. CONFIGURAÇÕES FINAIS
-- =============================================================================

-- Recarregar configurações
SELECT pg_reload_conf();

-- =============================================================================
-- FINALIZADO!
-- =============================================================================

\echo '====================================================================='
\echo '✅ BANCO DE DADOS CONFIGURADO COM SUCESSO!'
\echo '====================================================================='
\echo 'Tabelas criadas:'
\echo '  • validators'
\echo '  • blocks'
\echo '  • accounts'
\echo '  • transactions'
\echo '  • transaction_logs'
\echo '  • events'
\echo '  • smart_contracts'
\echo '  • account_analytics'
\echo '  • contract_interactions'
\echo '  • smart_contract_events'
\echo '  • smart_contract_functions'
\echo '  • token_holdings'
\echo ''
\echo 'Funcionalidades configuradas:'
\echo '  • Funções de trigger para updated_at'
\echo '  • Índices para performance'
\echo '  • Foreign keys para integridade'
\echo '  • Extensões PostgreSQL'
\echo ''
\echo 'O banco está pronto para uso!'
\echo '====================================================================='

-- Mostrar estatísticas das tabelas
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY tablename, attname; 