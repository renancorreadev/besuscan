-- Migration: Add raw_data to account_events
-- Description: Adiciona coluna raw_data para armazenar dados brutos do evento e updated_at para controle de atualização
-- Created: 2024

-- Adicionar coluna raw_data
ALTER TABLE account_events ADD COLUMN IF NOT EXISTS raw_data BYTEA NULL;

-- Adicionar coluna updated_at
ALTER TABLE account_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- Comentários nas colunas
COMMENT ON COLUMN account_events.raw_data IS 'Dados brutos do evento em formato binário';
COMMENT ON COLUMN account_events.updated_at IS 'Data e hora da última atualização do registro'; 