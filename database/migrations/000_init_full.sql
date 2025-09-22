-- Migration FULL: inicializa todas as tabelas principais do indexer

-- Tabela de blocos
CREATE TABLE IF NOT EXISTS blocks (
    number BIGINT PRIMARY KEY,
    hash TEXT NOT NULL UNIQUE,
    parent_hash TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    miner TEXT,
    gas_used BIGINT,
    gas_limit BIGINT,
    base_fee_per_gas TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blocks_timestamp ON blocks(timestamp);

-- Tabela de transações
CREATE TABLE IF NOT EXISTS transactions (
    hash TEXT PRIMARY KEY,
    block_number BIGINT REFERENCES blocks(number) ON DELETE CASCADE,
    from_address TEXT NOT NULL,
    to_address TEXT,
    nonce BIGINT NOT NULL,
    value TEXT NOT NULL,
    gas BIGINT NOT NULL,
    gas_price TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, success, error
    error_log TEXT,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_updated_at ON transactions(updated_at);
CREATE INDEX IF NOT EXISTS idx_transactions_block_number ON transactions(block_number);

-- Tabela de eventos/logs
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    tx_hash TEXT NOT NULL REFERENCES transactions(hash) ON DELETE CASCADE,
    block_number BIGINT REFERENCES blocks(number) ON DELETE CASCADE,
    log_index BIGINT NOT NULL,
    address TEXT NOT NULL,
    data TEXT,
    topics TEXT[],
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_logs_block_number ON logs(block_number);
CREATE INDEX IF NOT EXISTS idx_logs_tx_hash ON logs(tx_hash);

-- Tabela de contas (opcional, pode ser populada depois)
CREATE TABLE IF NOT EXISTS accounts (
    address TEXT PRIMARY KEY,
    balance TEXT,
    nonce BIGINT,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
