-- Migration: 007_create_smart_contracts.sql
-- Descrição: Cria tabela completa para smart contracts com todas as métricas necessárias

-- Tabela principal de smart contracts
CREATE TABLE IF NOT EXISTS smart_contracts (
    address VARCHAR(42) PRIMARY KEY,
    name VARCHAR(255),
    symbol VARCHAR(50),
    contract_type VARCHAR(50), -- ERC-20, ERC-721, DeFi, DEX, etc.
    
    -- Informações de criação
    creator_address VARCHAR(42) NOT NULL,
    creation_tx_hash VARCHAR(66) NOT NULL,
    creation_block_number BIGINT NOT NULL,
    creation_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Informações de verificação
    is_verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP WITH TIME ZONE,
    compiler_version VARCHAR(50),
    optimization_enabled BOOLEAN,
    optimization_runs INTEGER,
    license_type VARCHAR(50),
    
    -- Código e ABI
    source_code TEXT,
    abi JSONB,
    bytecode TEXT,
    constructor_args TEXT,
    
    -- Métricas básicas
    balance NUMERIC(78, 0) DEFAULT 0, -- Wei
    nonce BIGINT DEFAULT 0,
    code_size INTEGER,
    storage_size INTEGER,
    
    -- Métricas de atividade (atualizadas periodicamente)
    total_transactions BIGINT DEFAULT 0,
    total_internal_transactions BIGINT DEFAULT 0,
    total_events BIGINT DEFAULT 0,
    unique_addresses_count BIGINT DEFAULT 0,
    total_gas_used NUMERIC(78, 0) DEFAULT 0,
    total_value_transferred NUMERIC(78, 0) DEFAULT 0,
    
    -- Métricas de tempo
    first_transaction_at TIMESTAMP WITH TIME ZONE,
    last_transaction_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    
    -- Status e flags
    is_active BOOLEAN DEFAULT TRUE,
    is_proxy BOOLEAN DEFAULT FALSE,
    proxy_implementation VARCHAR(42),
    is_token BOOLEAN DEFAULT FALSE,
    
    -- Metadados adicionais
    description TEXT,
    website_url VARCHAR(500),
    github_url VARCHAR(500),
    documentation_url VARCHAR(500),
    tags TEXT[], -- Array de tags para categorização
    
    -- Timestamps de controle
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_metrics_update TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_smart_contracts_creator ON smart_contracts(creator_address);
CREATE INDEX IF NOT EXISTS idx_smart_contracts_creation_block ON smart_contracts(creation_block_number);
CREATE INDEX IF NOT EXISTS idx_smart_contracts_type ON smart_contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_smart_contracts_verified ON smart_contracts(is_verified);
CREATE INDEX IF NOT EXISTS idx_smart_contracts_active ON smart_contracts(is_active);
CREATE INDEX IF NOT EXISTS idx_smart_contracts_token ON smart_contracts(is_token);
CREATE INDEX IF NOT EXISTS idx_smart_contracts_last_activity ON smart_contracts(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_smart_contracts_total_transactions ON smart_contracts(total_transactions);
CREATE INDEX IF NOT EXISTS idx_smart_contracts_tags ON smart_contracts USING gin(tags);

-- Índice composto para busca por tipo e status
CREATE INDEX IF NOT EXISTS idx_smart_contracts_type_verified ON smart_contracts(contract_type, is_verified);

-- Tabela para métricas diárias de smart contracts
CREATE TABLE IF NOT EXISTS smart_contract_daily_metrics (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(42) NOT NULL REFERENCES smart_contracts(address) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Métricas do dia
    transactions_count BIGINT DEFAULT 0,
    unique_addresses_count BIGINT DEFAULT 0,
    gas_used NUMERIC(78, 0) DEFAULT 0,
    value_transferred NUMERIC(78, 0) DEFAULT 0,
    events_count BIGINT DEFAULT 0,
    
    -- Métricas de performance
    avg_gas_per_tx NUMERIC(20, 2),
    success_rate DECIMAL(5, 4), -- 0.0000 to 1.0000
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(contract_address, date)
);

-- Índices para métricas diárias
CREATE INDEX IF NOT EXISTS idx_contract_daily_metrics_address ON smart_contract_daily_metrics(contract_address);
CREATE INDEX IF NOT EXISTS idx_contract_daily_metrics_date ON smart_contract_daily_metrics(date);
CREATE INDEX IF NOT EXISTS idx_contract_daily_metrics_transactions ON smart_contract_daily_metrics(transactions_count);

-- Tabela para funções de smart contracts (ABI parsing)
CREATE TABLE IF NOT EXISTS smart_contract_functions (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(42) NOT NULL REFERENCES smart_contracts(address) ON DELETE CASCADE,
    function_name VARCHAR(255) NOT NULL,
    function_signature VARCHAR(10) NOT NULL, -- 4-byte selector
    function_type VARCHAR(20) NOT NULL, -- function, constructor, fallback, receive
    state_mutability VARCHAR(20), -- pure, view, nonpayable, payable
    
    -- Inputs e outputs como JSON
    inputs JSONB,
    outputs JSONB,
    
    -- Métricas de uso
    call_count BIGINT DEFAULT 0,
    last_called_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(contract_address, function_signature)
);

-- Índices para funções
CREATE INDEX IF NOT EXISTS idx_contract_functions_address ON smart_contract_functions(contract_address);
CREATE INDEX IF NOT EXISTS idx_contract_functions_name ON smart_contract_functions(function_name);
CREATE INDEX IF NOT EXISTS idx_contract_functions_type ON smart_contract_functions(function_type);
CREATE INDEX IF NOT EXISTS idx_contract_functions_signature ON smart_contract_functions(function_signature);

-- Tabela para eventos de smart contracts
CREATE TABLE IF NOT EXISTS smart_contract_events (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(42) NOT NULL REFERENCES smart_contracts(address) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    event_signature VARCHAR(66) NOT NULL, -- keccak256 hash
    
    -- Definição do evento
    inputs JSONB,
    anonymous BOOLEAN DEFAULT FALSE,
    
    -- Métricas de uso
    emission_count BIGINT DEFAULT 0,
    last_emitted_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(contract_address, event_signature)
);

-- Índices para eventos
CREATE INDEX IF NOT EXISTS idx_contract_events_address ON smart_contract_events(contract_address);
CREATE INDEX IF NOT EXISTS idx_contract_events_name ON smart_contract_events(event_name);
CREATE INDEX IF NOT EXISTS idx_contract_events_signature ON smart_contract_events(event_signature);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_smart_contracts_updated_at 
    BEFORE UPDATE ON smart_contracts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_functions_updated_at 
    BEFORE UPDATE ON smart_contract_functions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_events_updated_at 
    BEFORE UPDATE ON smart_contract_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE smart_contracts IS 'Tabela principal para armazenar informações de smart contracts';
COMMENT ON TABLE smart_contract_daily_metrics IS 'Métricas diárias agregadas por smart contract';
COMMENT ON TABLE smart_contract_functions IS 'Funções disponíveis em cada smart contract (parsed do ABI)';
COMMENT ON TABLE smart_contract_events IS 'Eventos definidos em cada smart contract (parsed do ABI)';

COMMENT ON COLUMN smart_contracts.balance IS 'Balance do contrato em Wei';
COMMENT ON COLUMN smart_contracts.total_gas_used IS 'Total de gas usado por todas as transações do contrato';
COMMENT ON COLUMN smart_contracts.total_value_transferred IS 'Valor total transferido através do contrato em Wei';
COMMENT ON COLUMN smart_contracts.is_proxy IS 'Indica se o contrato é um proxy (EIP-1967, etc.)';
COMMENT ON COLUMN smart_contracts.proxy_implementation IS 'Endereço da implementação se for um proxy'; 