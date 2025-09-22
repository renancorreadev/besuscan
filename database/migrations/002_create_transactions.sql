-- Migration: Criação da tabela transactions
CREATE TABLE IF NOT EXISTS transactions (
    hash TEXT PRIMARY KEY,
    block_number BIGINT NOT NULL REFERENCES blocks(number) ON DELETE CASCADE,
    from_address TEXT NOT NULL,
    to_address TEXT,
    value TEXT NOT NULL,
    gas BIGINT NOT NULL,
    gas_price TEXT NOT NULL,
    nonce BIGINT NOT NULL,
    status TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_block_number ON transactions(block_number);
CREATE INDEX IF NOT EXISTS idx_transactions_from_address ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_to_address ON transactions(to_address);
