-- Migration: 006_update_transactions_table.sql
-- Descrição: Atualiza a tabela de transações para suportar todos os campos necessários

-- Adicionar campos que podem estar faltando
ALTER TABLE transactions 
    ADD COLUMN IF NOT EXISTS transaction_index BIGINT,
    ADD COLUMN IF NOT EXISTS gas_limit BIGINT,
    ADD COLUMN IF NOT EXISTS max_fee_per_gas TEXT,
    ADD COLUMN IF NOT EXISTS max_priority_fee_per_gas TEXT,
    ADD COLUMN IF NOT EXISTS data BYTEA,
    ADD COLUMN IF NOT EXISTS transaction_type SMALLINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS contract_address VARCHAR(42),
    ADD COLUMN IF NOT EXISTS logs_bloom BYTEA,
    ADD COLUMN IF NOT EXISTS mined_at TIMESTAMP WITH TIME ZONE;

-- Renomear colunas se necessário (verificar se existem)
DO $$
BEGIN
    -- Renomear gas para gas_limit se a coluna gas existir
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'transactions' AND column_name = 'gas') THEN
        ALTER TABLE transactions RENAME COLUMN gas TO gas_limit;
    END IF;
    
    -- Renomear input_data para data se existir
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'transactions' AND column_name = 'input_data') THEN
        ALTER TABLE transactions RENAME COLUMN data TO data;
    END IF;
END $$;

-- Atualizar constraints e índices
ALTER TABLE transactions 
    ALTER COLUMN gas_limit SET NOT NULL,
    ALTER COLUMN transaction_type SET DEFAULT 0;

-- Criar índices adicionais para performance
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_index ON transactions(transaction_index);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_contract_address ON transactions(contract_address);
CREATE INDEX IF NOT EXISTS idx_transactions_mined_at ON transactions(mined_at);
CREATE INDEX IF NOT EXISTS idx_transactions_gas_used ON transactions(gas_used);

-- Criar índice composto para busca por bloco e índice da transação
CREATE INDEX IF NOT EXISTS idx_transactions_block_tx_index ON transactions(block_number, transaction_index);

-- Criar índice para busca por endereço (from ou to)
CREATE INDEX IF NOT EXISTS idx_transactions_addresses ON transactions USING gin((ARRAY[from_address, to_address]));

-- Adicionar constraint para garantir que transaction_index seja único por bloco
ALTER TABLE transactions 
    DROP CONSTRAINT IF EXISTS unique_tx_per_block,
    ADD CONSTRAINT unique_tx_per_block UNIQUE (block_hash, transaction_index);

-- Comentários para documentação
COMMENT ON COLUMN transactions.transaction_index IS 'Índice da transação dentro do bloco';
COMMENT ON COLUMN transactions.gas_limit IS 'Limite de gas definido para a transação';
COMMENT ON COLUMN transactions.max_fee_per_gas IS 'Taxa máxima por gas (EIP-1559)';
COMMENT ON COLUMN transactions.max_priority_fee_per_gas IS 'Taxa de prioridade máxima por gas (EIP-1559)';
COMMENT ON COLUMN transactions.data IS 'Dados de entrada da transação (input data)';
COMMENT ON COLUMN transactions.transaction_type IS 'Tipo da transação (0=Legacy, 1=AccessList, 2=DynamicFee)';
COMMENT ON COLUMN transactions.contract_address IS 'Endereço do contrato criado (se aplicável)';
COMMENT ON COLUMN transactions.logs_bloom IS 'Bloom filter dos logs da transação';
COMMENT ON COLUMN transactions.mined_at IS 'Timestamp de quando a transação foi minerada'; 