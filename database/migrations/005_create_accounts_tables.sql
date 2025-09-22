-- Migration: 005_create_accounts_tables.sql
-- Descrição: Cria as tabelas para gerenciamento de contas (EOA e Smart Accounts)

-- Tabela principal de contas
CREATE TABLE IF NOT EXISTS accounts (
    -- Identificador único
    address VARCHAR(42) NOT NULL PRIMARY KEY,
    
    -- Tipo de conta
    account_type VARCHAR(20) NOT NULL DEFAULT 'eoa', -- 'eoa' ou 'smart_account'
    
    -- Informações básicas
    balance TEXT NOT NULL DEFAULT '0', -- Armazenado como string para suportar big.Int
    nonce BIGINT NOT NULL DEFAULT 0,
    
    -- Contadores de atividade
    transaction_count BIGINT NOT NULL DEFAULT 0,
    contract_interactions BIGINT NOT NULL DEFAULT 0,
    smart_contract_deployments BIGINT NOT NULL DEFAULT 0,
    
    -- Timestamps de atividade
    first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE,
    
    -- Informações de contrato
    is_contract BOOLEAN NOT NULL DEFAULT FALSE,
    contract_type VARCHAR(50),
    
    -- Smart Account specific fields (ERC-4337)
    factory_address VARCHAR(42),
    implementation_address VARCHAR(42),
    owner_address VARCHAR(42),
    
    -- Corporate/Enterprise fields
    label VARCHAR(255),
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 10),
    compliance_status VARCHAR(20) NOT NULL DEFAULT 'compliant', -- 'compliant', 'flagged', 'under_review'
    compliance_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabela de tags das contas
CREATE TABLE IF NOT EXISTS account_tags (
    address VARCHAR(42) NOT NULL,
    tag VARCHAR(100) NOT NULL,
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (address, tag),
    FOREIGN KEY (address) REFERENCES accounts(address) ON DELETE CASCADE
);

-- Tabela de analytics diárias das contas
CREATE TABLE IF NOT EXISTS account_analytics (
    address VARCHAR(42) NOT NULL,
    date DATE NOT NULL,
    transactions_count BIGINT NOT NULL DEFAULT 0,
    unique_addresses_count BIGINT NOT NULL DEFAULT 0,
    gas_used TEXT NOT NULL DEFAULT '0',
    value_transferred TEXT NOT NULL DEFAULT '0',
    avg_gas_per_tx TEXT NOT NULL DEFAULT '0',
    success_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000, -- 0.0000 to 1.0000
    contract_calls_count BIGINT NOT NULL DEFAULT 0,
    token_transfers_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (address, date),
    FOREIGN KEY (address) REFERENCES accounts(address) ON DELETE CASCADE
);

-- Tabela de interações com contratos
CREATE TABLE IF NOT EXISTS contract_interactions (
    id BIGSERIAL PRIMARY KEY,
    account_address VARCHAR(42) NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    contract_name VARCHAR(255),
    method VARCHAR(100),
    interactions_count BIGINT NOT NULL DEFAULT 1,
    last_interaction TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    first_interaction TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    total_gas_used TEXT NOT NULL DEFAULT '0',
    total_value_sent TEXT NOT NULL DEFAULT '0',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(account_address, contract_address, method),
    FOREIGN KEY (account_address) REFERENCES accounts(address) ON DELETE CASCADE
);

-- Tabela de holdings de tokens
CREATE TABLE IF NOT EXISTS token_holdings (
    account_address VARCHAR(42) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    token_symbol VARCHAR(20) NOT NULL,
    token_name VARCHAR(255) NOT NULL,
    token_decimals SMALLINT NOT NULL DEFAULT 18,
    balance TEXT NOT NULL DEFAULT '0',
    value_usd TEXT NOT NULL DEFAULT '0',
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (account_address, token_address),
    FOREIGN KEY (account_address) REFERENCES accounts(address) ON DELETE CASCADE
);

-- Índices para performance da tabela accounts
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_balance ON accounts(balance);
CREATE INDEX IF NOT EXISTS idx_accounts_transaction_count ON accounts(transaction_count);
CREATE INDEX IF NOT EXISTS idx_accounts_last_activity ON accounts(last_activity);
CREATE INDEX IF NOT EXISTS idx_accounts_first_seen ON accounts(first_seen);
CREATE INDEX IF NOT EXISTS idx_accounts_is_contract ON accounts(is_contract);
CREATE INDEX IF NOT EXISTS idx_accounts_compliance_status ON accounts(compliance_status);
CREATE INDEX IF NOT EXISTS idx_accounts_risk_score ON accounts(risk_score);
CREATE INDEX IF NOT EXISTS idx_accounts_factory_address ON accounts(factory_address);
CREATE INDEX IF NOT EXISTS idx_accounts_owner_address ON accounts(owner_address);

-- Índices para performance da tabela account_tags
CREATE INDEX IF NOT EXISTS idx_account_tags_tag ON account_tags(tag);
CREATE INDEX IF NOT EXISTS idx_account_tags_created_at ON account_tags(created_at);

-- Índices para performance da tabela account_analytics
CREATE INDEX IF NOT EXISTS idx_account_analytics_date ON account_analytics(date);
CREATE INDEX IF NOT EXISTS idx_account_analytics_transactions_count ON account_analytics(transactions_count);
CREATE INDEX IF NOT EXISTS idx_account_analytics_value_transferred ON account_analytics(value_transferred);

-- Índices para performance da tabela contract_interactions
CREATE INDEX IF NOT EXISTS idx_contract_interactions_contract_address ON contract_interactions(contract_address);
CREATE INDEX IF NOT EXISTS idx_contract_interactions_method ON contract_interactions(method);
CREATE INDEX IF NOT EXISTS idx_contract_interactions_last_interaction ON contract_interactions(last_interaction);
CREATE INDEX IF NOT EXISTS idx_contract_interactions_interactions_count ON contract_interactions(interactions_count);

-- Índices para performance da tabela token_holdings
CREATE INDEX IF NOT EXISTS idx_token_holdings_token_address ON token_holdings(token_address);
CREATE INDEX IF NOT EXISTS idx_token_holdings_token_symbol ON token_holdings(token_symbol);
CREATE INDEX IF NOT EXISTS idx_token_holdings_balance ON token_holdings(balance);
CREATE INDEX IF NOT EXISTS idx_token_holdings_value_usd ON token_holdings(value_usd);
CREATE INDEX IF NOT EXISTS idx_token_holdings_last_updated ON token_holdings(last_updated);

-- Triggers para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_analytics_updated_at BEFORE UPDATE ON account_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_interactions_updated_at BEFORE UPDATE ON contract_interactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_token_holdings_updated_at BEFORE UPDATE ON token_holdings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE accounts IS 'Tabela principal de contas (EOA e Smart Accounts)';
COMMENT ON COLUMN accounts.address IS 'Endereço da conta (chave primária)';
COMMENT ON COLUMN accounts.account_type IS 'Tipo de conta: eoa ou smart_account';
COMMENT ON COLUMN accounts.balance IS 'Saldo da conta em wei (armazenado como string)';
COMMENT ON COLUMN accounts.nonce IS 'Nonce atual da conta';
COMMENT ON COLUMN accounts.transaction_count IS 'Número total de transações';
COMMENT ON COLUMN accounts.contract_interactions IS 'Número de interações com contratos';
COMMENT ON COLUMN accounts.smart_contract_deployments IS 'Número de contratos deployados';
COMMENT ON COLUMN accounts.first_seen IS 'Primeira vez que a conta foi vista';
COMMENT ON COLUMN accounts.last_activity IS 'Última atividade da conta';
COMMENT ON COLUMN accounts.is_contract IS 'Indica se é um contrato';
COMMENT ON COLUMN accounts.contract_type IS 'Tipo do contrato (se aplicável)';
COMMENT ON COLUMN accounts.factory_address IS 'Endereço da factory (Smart Accounts)';
COMMENT ON COLUMN accounts.implementation_address IS 'Endereço da implementação (Smart Accounts)';
COMMENT ON COLUMN accounts.owner_address IS 'Endereço do owner (Smart Accounts)';
COMMENT ON COLUMN accounts.label IS 'Label personalizado da conta';
COMMENT ON COLUMN accounts.risk_score IS 'Score de risco (0-10)';
COMMENT ON COLUMN accounts.compliance_status IS 'Status de compliance';
COMMENT ON COLUMN accounts.compliance_notes IS 'Notas de compliance';

COMMENT ON TABLE account_tags IS 'Tags associadas às contas';
COMMENT ON TABLE account_analytics IS 'Métricas analíticas diárias das contas';
COMMENT ON TABLE contract_interactions IS 'Interações das contas com contratos';
COMMENT ON TABLE token_holdings IS 'Holdings de tokens das contas'; 