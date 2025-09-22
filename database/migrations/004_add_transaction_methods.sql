-- Migration: 004_add_transaction_methods.sql
-- Descrição: Adiciona suporte para identificação de métodos de transações para contratos customizados

-- Tabela para armazenar métodos de transações identificados
CREATE TABLE IF NOT EXISTS transaction_methods (
    -- Chave primária
    id BIGSERIAL PRIMARY KEY,
    
    -- Hash da transação (FK)
    transaction_hash VARCHAR(66) NOT NULL UNIQUE,
    
    -- Informações do método
    method_name VARCHAR(100) NOT NULL,
    method_signature VARCHAR(10), -- 4 bytes do selector (0x12345678)
    method_type VARCHAR(50) NOT NULL, -- 'transfer', 'approve', 'deploy', 'transferETH', 'unknown', etc.
    
    -- Endereço do contrato (se aplicável)
    contract_address VARCHAR(42),
    
    -- Parâmetros decodificados (JSON) - opcional
    decoded_params JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transaction_methods_hash ON transaction_methods(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_transaction_methods_type ON transaction_methods(method_type);
CREATE INDEX IF NOT EXISTS idx_transaction_methods_contract ON transaction_methods(contract_address);
CREATE INDEX IF NOT EXISTS idx_transaction_methods_signature ON transaction_methods(method_signature);

-- Foreign key para transações
ALTER TABLE transaction_methods ADD CONSTRAINT fk_transaction_methods_hash 
    FOREIGN KEY (transaction_hash) REFERENCES transactions(hash) ON DELETE CASCADE;

-- Comentários para documentação
COMMENT ON TABLE transaction_methods IS 'Métodos identificados para cada transação';
COMMENT ON COLUMN transaction_methods.transaction_hash IS 'Hash da transação';
COMMENT ON COLUMN transaction_methods.method_name IS 'Nome do método (ex: transfer, approve) ou "Transfer ETH" ou "Deploy Contract"';
COMMENT ON COLUMN transaction_methods.method_signature IS 'Signature do método (4 bytes) - NULL para ETH transfers';
COMMENT ON COLUMN transaction_methods.method_type IS 'Tipo do método (transfer, approve, deploy, transferETH, unknown)';
COMMENT ON COLUMN transaction_methods.contract_address IS 'Endereço do contrato (se aplicável)';
COMMENT ON COLUMN transaction_methods.decoded_params IS 'Parâmetros decodificados em JSON (opcional)';

 