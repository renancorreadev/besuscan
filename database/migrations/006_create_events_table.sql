-- Migration: Create events table
-- Description: Tabela para armazenar eventos de smart contracts

-- +goose Up
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(255) PRIMARY KEY,
    contract_address VARCHAR(42) NOT NULL,
    contract_name VARCHAR(255),
    event_name VARCHAR(255) NOT NULL,
    event_signature VARCHAR(66) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    block_hash VARCHAR(66) NOT NULL,
    log_index BIGINT NOT NULL,
    transaction_index BIGINT NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42),
    topics JSONB NOT NULL DEFAULT '[]',
    data BYTEA,
    decoded_data JSONB,
    gas_used BIGINT NOT NULL DEFAULT 0,
    gas_price VARCHAR(78) NOT NULL DEFAULT '0',
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    removed BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_events_contract_address ON events(contract_address);
CREATE INDEX IF NOT EXISTS idx_events_event_name ON events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_transaction_hash ON events(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_events_block_number ON events(block_number);
CREATE INDEX IF NOT EXISTS idx_events_from_address ON events(from_address);
CREATE INDEX IF NOT EXISTS idx_events_to_address ON events(to_address);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_event_signature ON events(event_signature);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Índice composto para paginação eficiente
CREATE INDEX IF NOT EXISTS idx_events_timestamp_id ON events(timestamp DESC, id);

-- Índice para busca por bloco e log
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_block_log ON events(block_number, log_index, transaction_hash);

-- Índice GIN para busca em topics JSONB
CREATE INDEX IF NOT EXISTS idx_events_topics_gin ON events USING GIN(topics);

-- Índice GIN para busca em decoded_data JSONB
CREATE INDEX IF NOT EXISTS idx_events_decoded_data_gin ON events USING GIN(decoded_data);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_events_updated_at();

-- +goose Down
DROP TRIGGER IF EXISTS trigger_events_updated_at ON events;
DROP FUNCTION IF EXISTS update_events_updated_at();
DROP TABLE IF EXISTS events; 