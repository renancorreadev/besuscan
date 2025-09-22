-- Migration: 001_create_blocks_table.sql
-- Descrição: Cria a tabela de blocos da blockchain

CREATE TABLE IF NOT EXISTS blocks (
    -- Identificadores únicos
    number BIGINT NOT NULL,
    hash VARCHAR(66) NOT NULL PRIMARY KEY,
    parent_hash VARCHAR(66),
    
    -- Informações temporais
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Informações de mineração
    miner VARCHAR(42),
    difficulty TEXT, -- Armazenado como string para suportar big.Int
    total_difficulty TEXT,
    
    -- Informações de tamanho e gas
    size BIGINT DEFAULT 0,
    gas_limit BIGINT NOT NULL DEFAULT 0,
    gas_used BIGINT NOT NULL DEFAULT 0,
    base_fee_per_gas TEXT, -- EIP-1559
    
    -- Contadores
    tx_count INTEGER NOT NULL DEFAULT 0,
    uncle_count INTEGER NOT NULL DEFAULT 0
);

-- Índices para performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_number ON blocks(number);
CREATE INDEX IF NOT EXISTS idx_blocks_timestamp ON blocks(timestamp);
CREATE INDEX IF NOT EXISTS idx_blocks_miner ON blocks(miner);
CREATE INDEX IF NOT EXISTS idx_blocks_gas_used ON blocks(gas_used);
CREATE INDEX IF NOT EXISTS idx_blocks_created_at ON blocks(created_at);
CREATE INDEX IF NOT EXISTS idx_blocks_deleted_at ON blocks(deleted_at) WHERE deleted_at IS NULL;

-- Comentários para documentação
COMMENT ON TABLE blocks IS 'Tabela de blocos da blockchain';
COMMENT ON COLUMN blocks.number IS 'Número sequencial do bloco';
COMMENT ON COLUMN blocks.hash IS 'Hash único do bloco (chave primária)';
COMMENT ON COLUMN blocks.parent_hash IS 'Hash do bloco pai';
COMMENT ON COLUMN blocks.timestamp IS 'Timestamp do bloco na blockchain';
COMMENT ON COLUMN blocks.miner IS 'Endereço do minerador';
COMMENT ON COLUMN blocks.difficulty IS 'Dificuldade de mineração (armazenado como string)';
COMMENT ON COLUMN blocks.total_difficulty IS 'Dificuldade total acumulada';
COMMENT ON COLUMN blocks.size IS 'Tamanho do bloco em bytes';
COMMENT ON COLUMN blocks.gas_limit IS 'Limite de gas do bloco';
COMMENT ON COLUMN blocks.gas_used IS 'Gas utilizado no bloco';
COMMENT ON COLUMN blocks.base_fee_per_gas IS 'Taxa base por gas (EIP-1559)';
COMMENT ON COLUMN blocks.tx_count IS 'Número de transações no bloco';
COMMENT ON COLUMN blocks.uncle_count IS 'Número de uncle blocks'; 