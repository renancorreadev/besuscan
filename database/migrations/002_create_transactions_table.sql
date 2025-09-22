-- Migration: 002_create_transactions_table.sql
-- Descrição: Cria a tabela de transações da blockchain

CREATE TABLE IF NOT EXISTS transactions (
    -- Identificador único
    hash VARCHAR(66) NOT NULL PRIMARY KEY,
    
    -- Informações do bloco (nullable para transações pendentes)
    block_number BIGINT,
    block_hash VARCHAR(66),
    transaction_index BIGINT,
    
    -- Endereços
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42), -- NULL para criação de contratos
    
    -- Valores e gas
    value TEXT NOT NULL DEFAULT '0', -- Armazenado como string para suportar big.Int
    gas_limit BIGINT NOT NULL,
    gas_price TEXT, -- Legacy gas price
    gas_used BIGINT,
    
    -- EIP-1559 (Type 2 transactions)
    max_fee_per_gas TEXT,
    max_priority_fee_per_gas TEXT,
    
    -- Informações da transação
    nonce BIGINT NOT NULL,
    data BYTEA, -- Input data
    transaction_type SMALLINT NOT NULL DEFAULT 0, -- 0=Legacy, 1=AccessList, 2=DynamicFee
    access_list BYTEA, -- EIP-2930
    
    -- Status e resultado
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    contract_address VARCHAR(42), -- Para criação de contratos
    logs_bloom BYTEA,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    mined_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_block_number ON transactions(block_number);
CREATE INDEX IF NOT EXISTS idx_transactions_block_hash ON transactions(block_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_from_address ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_to_address ON transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_nonce ON transactions(from_address, nonce);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_mined_at ON transactions(mined_at);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON transactions(deleted_at) WHERE deleted_at IS NULL;

-- Índice composto para buscar transações de um endereço
CREATE INDEX IF NOT EXISTS idx_transactions_address_composite ON transactions(from_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_to_address_composite ON transactions(to_address, created_at DESC);

-- Constraint para garantir que transações mineradas tenham block_number
ALTER TABLE transactions ADD CONSTRAINT chk_mined_transactions 
    CHECK ((status = 'pending' AND block_number IS NULL) OR 
           (status != 'pending' AND block_number IS NOT NULL));

-- Foreign key para blocos (opcional, pode ser removida se causar problemas de performance)
ALTER TABLE transactions ADD CONSTRAINT fk_transactions_block_hash 
    FOREIGN KEY (block_hash) REFERENCES blocks(hash) ON DELETE SET NULL;

-- Comentários para documentação
COMMENT ON TABLE transactions IS 'Tabela de transações da blockchain';
COMMENT ON COLUMN transactions.hash IS 'Hash único da transação (chave primária)';
COMMENT ON COLUMN transactions.block_number IS 'Número do bloco (NULL para pendentes)';
COMMENT ON COLUMN transactions.block_hash IS 'Hash do bloco (NULL para pendentes)';
COMMENT ON COLUMN transactions.transaction_index IS 'Índice da transação no bloco';
COMMENT ON COLUMN transactions.from_address IS 'Endereço remetente';
COMMENT ON COLUMN transactions.to_address IS 'Endereço destinatário (NULL para criação de contrato)';
COMMENT ON COLUMN transactions.value IS 'Valor transferido (em wei, armazenado como string)';
COMMENT ON COLUMN transactions.gas_limit IS 'Limite de gas da transação';
COMMENT ON COLUMN transactions.gas_price IS 'Preço do gas (legacy)';
COMMENT ON COLUMN transactions.gas_used IS 'Gas efetivamente utilizado';
COMMENT ON COLUMN transactions.max_fee_per_gas IS 'Taxa máxima por gas (EIP-1559)';
COMMENT ON COLUMN transactions.max_priority_fee_per_gas IS 'Taxa de prioridade máxima (EIP-1559)';
COMMENT ON COLUMN transactions.nonce IS 'Nonce da transação';
COMMENT ON COLUMN transactions.data IS 'Dados de entrada da transação';
COMMENT ON COLUMN transactions.transaction_type IS 'Tipo da transação (0=Legacy, 1=AccessList, 2=DynamicFee)';
COMMENT ON COLUMN transactions.status IS 'Status da transação (pending, success, failed, dropped, replaced)';
COMMENT ON COLUMN transactions.contract_address IS 'Endereço do contrato criado (se aplicável)'; 