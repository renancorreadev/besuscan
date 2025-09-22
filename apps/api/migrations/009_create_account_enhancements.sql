-- Migration: Account Enhancements
-- Description: Novas tabelas para tracking detalhado de transações e eventos por usuário
-- Created: 2024

-- Tabela para registrar todas as transações de uma conta com detalhes enriquecidos
CREATE TABLE IF NOT EXISTS account_transactions (
    id BIGSERIAL PRIMARY KEY,
    account_address VARCHAR(42) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    transaction_index INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- 'sent', 'received', 'contract_call', 'contract_creation'
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NULL,
    value TEXT DEFAULT '0' NOT NULL,
    gas_limit BIGINT NOT NULL,
    gas_used BIGINT NULL,
    gas_price TEXT NULL,
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'pending'
    method_name VARCHAR(100) NULL,
    method_signature VARCHAR(200) NULL,
    contract_address VARCHAR(42) NULL,
    contract_name VARCHAR(100) NULL,
    decoded_input JSONB NULL,
    error_message TEXT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabela para registrar eventos de smart contracts relacionados a uma conta
CREATE TABLE IF NOT EXISTS account_events (
    id BIGSERIAL PRIMARY KEY,
    account_address VARCHAR(42) NOT NULL,
    event_id VARCHAR(100) NOT NULL, -- ID único do evento (tx_hash + log_index)
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index BIGINT NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    contract_name VARCHAR(100) NULL,
    event_name VARCHAR(100) NOT NULL,
    event_signature VARCHAR(200) NOT NULL,
    involvement_type VARCHAR(20) NOT NULL, -- 'emitter', 'participant', 'recipient'
    topics JSONB NULL,
    decoded_data JSONB NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabela para estatísticas agregadas de métodos executados por conta
CREATE TABLE IF NOT EXISTS account_method_stats (
    id BIGSERIAL PRIMARY KEY,
    account_address VARCHAR(42) NOT NULL,
    method_name VARCHAR(100) NOT NULL,
    method_signature VARCHAR(200) NULL,
    contract_address VARCHAR(42) NULL,
    contract_name VARCHAR(100) NULL,
    execution_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    total_gas_used TEXT NOT NULL DEFAULT '0',
    total_value_sent TEXT NOT NULL DEFAULT '0',
    avg_gas_used BIGINT NOT NULL DEFAULT 0,
    first_executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_account_transactions_address ON account_transactions(account_address);
CREATE INDEX IF NOT EXISTS idx_account_transactions_hash ON account_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_account_transactions_block ON account_transactions(block_number);
CREATE INDEX IF NOT EXISTS idx_account_transactions_timestamp ON account_transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_account_transactions_type ON account_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_account_transactions_status ON account_transactions(status);
CREATE INDEX IF NOT EXISTS idx_account_transactions_method ON account_transactions(method_name);

CREATE INDEX IF NOT EXISTS idx_account_events_address ON account_events(account_address);
CREATE INDEX IF NOT EXISTS idx_account_events_contract ON account_events(contract_address);
CREATE INDEX IF NOT EXISTS idx_account_events_name ON account_events(event_name);
CREATE INDEX IF NOT EXISTS idx_account_events_timestamp ON account_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_account_events_involvement ON account_events(involvement_type);
CREATE INDEX IF NOT EXISTS idx_account_events_event_id ON account_events(event_id);

CREATE INDEX IF NOT EXISTS idx_account_method_stats_address ON account_method_stats(account_address);
CREATE INDEX IF NOT EXISTS idx_account_method_stats_method ON account_method_stats(method_name);
CREATE INDEX IF NOT EXISTS idx_account_method_stats_contract ON account_method_stats(contract_address);
CREATE INDEX IF NOT EXISTS idx_account_method_stats_executions ON account_method_stats(execution_count DESC);
CREATE INDEX IF NOT EXISTS idx_account_method_stats_last_executed ON account_method_stats(last_executed_at DESC);

-- Índices compostos para consultas otimizadas
CREATE INDEX IF NOT EXISTS idx_account_transactions_address_timestamp ON account_transactions(account_address, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_account_events_address_timestamp ON account_events(account_address, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_account_method_stats_address_executions ON account_method_stats(account_address, execution_count DESC);

-- Unique constraints
ALTER TABLE account_transactions ADD CONSTRAINT IF NOT EXISTS unique_account_transaction 
    UNIQUE (account_address, transaction_hash, transaction_index);

ALTER TABLE account_events ADD CONSTRAINT IF NOT EXISTS unique_account_event 
    UNIQUE (account_address, event_id);

ALTER TABLE account_method_stats ADD CONSTRAINT IF NOT EXISTS unique_account_method 
    UNIQUE (account_address, method_name, contract_address);

-- Comentários nas tabelas
COMMENT ON TABLE account_transactions IS 'Tabela para tracking detalhado de todas as transações relacionadas a uma conta';
COMMENT ON TABLE account_events IS 'Tabela para tracking de eventos de smart contracts relacionados a uma conta';
COMMENT ON TABLE account_method_stats IS 'Tabela para estatísticas agregadas de métodos executados por conta';

-- Comentários nas colunas principais
COMMENT ON COLUMN account_transactions.transaction_type IS 'Tipo da transação: sent, received, contract_call, contract_creation';
COMMENT ON COLUMN account_transactions.status IS 'Status da transação: success, failed, pending';
COMMENT ON COLUMN account_transactions.decoded_input IS 'Input da transação decodificado em formato JSON';

COMMENT ON COLUMN account_events.involvement_type IS 'Tipo de envolvimento da conta no evento: emitter, participant, recipient';
COMMENT ON COLUMN account_events.topics IS 'Topics do evento em formato JSON';
COMMENT ON COLUMN account_events.decoded_data IS 'Dados do evento decodificados em formato JSON';

COMMENT ON COLUMN account_method_stats.execution_count IS 'Número total de execuções do método';
COMMENT ON COLUMN account_method_stats.success_count IS 'Número de execuções bem-sucedidas';
COMMENT ON COLUMN account_method_stats.failed_count IS 'Número de execuções que falharam';
COMMENT ON COLUMN account_method_stats.total_gas_used IS 'Total de gas usado em todas as execuções';
COMMENT ON COLUMN account_method_stats.avg_gas_used IS 'Média de gas usado por execução'; 