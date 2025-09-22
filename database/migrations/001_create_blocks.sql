-- Migration: Criação da tabela blocks
CREATE TABLE IF NOT EXISTS blocks (
    number BIGINT PRIMARY KEY,
    hash TEXT NOT NULL,
    parent_hash TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    miner TEXT NOT NULL,
    tx_count INTEGER NOT NULL,
    base_fee_per_gas TEXT NOT NULL
);
