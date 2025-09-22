-- Migração para criar tabela de validadores QBFT
-- +migrate Up

CREATE TABLE IF NOT EXISTS validators (
    address VARCHAR(42) PRIMARY KEY,  -- Endereço Ethereum do validador
    proposed_block_count TEXT NOT NULL DEFAULT '0',  -- Número de blocos propostos (como string para big numbers)
    last_proposed_block_number TEXT NOT NULL DEFAULT '0',  -- Último bloco proposto (como string)
    status VARCHAR(20) NOT NULL DEFAULT 'inactive',  -- Status: active, inactive
    is_active BOOLEAN NOT NULL DEFAULT false,  -- Se está ativo atualmente
    uptime DECIMAL(5,2) NOT NULL DEFAULT 0.0,  -- Porcentagem de uptime (0.00 a 100.00)
    first_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- Primeira vez visto
    last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- Última vez ativo
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_validators_status ON validators(status);
CREATE INDEX IF NOT EXISTS idx_validators_is_active ON validators(is_active);
CREATE INDEX IF NOT EXISTS idx_validators_last_seen ON validators(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_validators_uptime ON validators(uptime DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_validators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_validators_updated_at_trigger
    BEFORE UPDATE ON validators
    FOR EACH ROW
    EXECUTE FUNCTION update_validators_updated_at();

-- +migrate Down

DROP TRIGGER IF EXISTS update_validators_updated_at_trigger ON validators;
DROP FUNCTION IF EXISTS update_validators_updated_at();
DROP INDEX IF EXISTS idx_validators_uptime;
DROP INDEX IF EXISTS idx_validators_last_seen;
DROP INDEX IF EXISTS idx_validators_is_active;
DROP INDEX IF EXISTS idx_validators_status;
DROP TABLE IF EXISTS validators; 