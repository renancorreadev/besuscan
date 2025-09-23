-- Migration: Fix Account Enhancements
-- Description: Corrige problemas nas tabelas de account enhancements
-- Created: 2024

-- 1. Adicionar coluna created_at na tabela account_method_stats
ALTER TABLE account_method_stats ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- 2. Corrigir constraint da tabela account_transactions
-- Primeiro, dropar a constraint incorreta se existir
ALTER TABLE account_transactions DROP CONSTRAINT IF EXISTS unique_account_transaction;

-- Depois, adicionar a constraint correta
ALTER TABLE account_transactions ADD CONSTRAINT unique_account_transaction 
    UNIQUE (account_address, transaction_hash);

-- 3. Corrigir constraint da tabela account_method_stats
ALTER TABLE account_method_stats DROP CONSTRAINT IF EXISTS unique_account_method;

-- Para lidar com valores NULL em contract_address, vamos criar um índice único parcial
CREATE UNIQUE INDEX IF NOT EXISTS unique_account_method_with_contract 
    ON account_method_stats (account_address, method_name, contract_address) 
    WHERE contract_address IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_account_method_without_contract 
    ON account_method_stats (account_address, method_name) 
    WHERE contract_address IS NULL;

-- 4. Adicionar coluna raw_data na tabela account_events se não existir
ALTER TABLE account_events ADD COLUMN IF NOT EXISTS raw_data TEXT NULL;

-- 5. Adicionar coluna updated_at na tabela account_events se não existir  
ALTER TABLE account_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- Comentários
COMMENT ON COLUMN account_method_stats.created_at IS 'Data de criação do registro de estatísticas';
COMMENT ON COLUMN account_events.raw_data IS 'Dados brutos do evento em hexadecimal';
COMMENT ON COLUMN account_events.updated_at IS 'Data da última atualização do registro'; 