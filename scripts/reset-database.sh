#!/bin/bash

# =============================================================================
# RESET BANCO DE DADOS - BeSuScan Explorer
# =============================================================================
# Este script reseta completamente o banco de dados PostgreSQL usando o DDL original
# 
# Uso: ./scripts/reset-database.sh
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE} 🗄️  RESETANDO BANCO DE DADOS${NC}"
echo -e "${BLUE}============================================${NC}"

# Verificar se o arquivo DDL original existe
if [[ ! -f "database/ddl.sql" ]]; then
    echo -e "${RED}❌ Arquivo database/ddl.sql não encontrado!${NC}"
    exit 1
fi

# Verificar se o PostgreSQL está rodando
echo -e "${YELLOW}🔍 Verificando se PostgreSQL está rodando...${NC}"
if ! docker exec explorer-postgres-dev pg_isready -U explorer -d postgres > /dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL não está rodando ou não está acessível!${NC}"
    echo -e "${YELLOW}💡 Execute: docker compose -f docker-compose.dev.yml up -d postgres${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL está rodando!${NC}"

# Confirmar reset
echo -e "${YELLOW}⚠️  ATENÇÃO: Este comando irá APAGAR TODOS OS DADOS do banco!${NC}"
read -p "Tem certeza que deseja continuar? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}❌ Operação cancelada.${NC}"
    exit 0
fi

# Parar serviços que usam o banco
echo -e "${YELLOW}🛑 Parando serviços que usam o banco...${NC}"
docker compose -f docker-compose.dev.yml stop api worker indexer || true

# Aguardar um pouco para garantir que as conexões sejam fechadas
sleep 3

# Fechar conexões existentes no banco
echo -e "${YELLOW}🔌 Fechando conexões existentes...${NC}"
docker exec explorer-postgres-dev psql -U explorer -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'blockexplorer' AND pid <> pg_backend_pid();" > /dev/null 2>&1 || true

# Recriar o banco completamente
echo -e "${YELLOW}🗑️  Removendo banco existente...${NC}"
docker exec explorer-postgres-dev dropdb -U explorer blockexplorer > /dev/null 2>&1 || true

echo -e "${YELLOW}📦 Criando novo banco...${NC}"
docker exec explorer-postgres-dev createdb -U explorer blockexplorer

# Aplicar o DDL original
echo -e "${YELLOW}🔄 Aplicando DDL original (database/ddl.sql)...${NC}"
if docker exec -i explorer-postgres-dev psql -U explorer -d blockexplorer < database/ddl.sql > /dev/null 2>&1; then
    echo -e "${GREEN}✅ DDL aplicado com sucesso!${NC}"
else
    echo -e "${YELLOW}⚠️  DDL aplicado com alguns avisos (normal)${NC}"
fi

# Criar as funções de trigger que podem estar faltando
echo -e "${YELLOW}🔧 Criando funções de trigger necessárias...${NC}"
docker exec explorer-postgres-dev psql -U explorer -d blockexplorer -c "
-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
\$\$ language 'plpgsql';

-- Função para atualizar events updated_at
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
\$\$ language 'plpgsql';

-- Função para atualizar validators updated_at
CREATE OR REPLACE FUNCTION update_validators_updated_at()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
\$\$ language 'plpgsql';
" > /dev/null 2>&1

# Criar triggers que podem estar faltando
echo -e "${YELLOW}⚙️  Criando triggers necessários...${NC}"
docker exec explorer-postgres-dev psql -U explorer -d blockexplorer -c "
-- Triggers para updated_at (ignorar erros se já existirem)
DO \$\$ 
BEGIN
    -- Accounts
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_accounts_updated_at') THEN
        CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Smart contracts
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_smart_contracts_updated_at') THEN
        CREATE TRIGGER update_smart_contracts_updated_at BEFORE UPDATE ON smart_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Events
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_events_updated_at') THEN
        CREATE TRIGGER trigger_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_events_updated_at();
    END IF;
    
    -- Validators
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_validators_updated_at_trigger') THEN
        CREATE TRIGGER update_validators_updated_at_trigger BEFORE UPDATE ON validators FOR EACH ROW EXECUTE FUNCTION update_validators_updated_at();
    END IF;
    
    -- Contract interactions
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contract_interactions_updated_at') THEN
        CREATE TRIGGER update_contract_interactions_updated_at BEFORE UPDATE ON contract_interactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Smart contract events
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contract_events_updated_at') THEN
        CREATE TRIGGER update_contract_events_updated_at BEFORE UPDATE ON smart_contract_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Smart contract functions
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contract_functions_updated_at') THEN
        CREATE TRIGGER update_contract_functions_updated_at BEFORE UPDATE ON smart_contract_functions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Token holdings
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_token_holdings_updated_at') THEN
        CREATE TRIGGER update_token_holdings_updated_at BEFORE UPDATE ON token_holdings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Account analytics
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_account_analytics_updated_at') THEN
        CREATE TRIGGER update_account_analytics_updated_at BEFORE UPDATE ON account_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END \$\$;
" > /dev/null 2>&1

# Verificar se a estrutura está correta
echo -e "${YELLOW}🔍 Verificando estrutura da tabela blocks...${NC}"
COLUMN_CHECK=$(docker exec explorer-postgres-dev psql -U explorer -d blockexplorer -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'number';")
if [[ -n "${COLUMN_CHECK// }" ]]; then
    echo -e "${GREEN}✅ Coluna 'number' encontrada na tabela blocks!${NC}"
else
    echo -e "${RED}❌ Erro: Coluna 'number' não encontrada na tabela blocks!${NC}"
    exit 1
fi

# Verificar tabelas criadas
echo -e "${YELLOW}🔍 Verificando tabelas criadas...${NC}"
TABLES=$(docker exec explorer-postgres-dev psql -U explorer -d blockexplorer -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo -e "${GREEN}✅ ${TABLES// /} tabelas criadas!${NC}"

# Mostrar tabelas principais
echo -e "${BLUE}📋 Tabelas principais:${NC}"
docker exec explorer-postgres-dev psql -U explorer -d blockexplorer -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('blocks', 'transactions', 'accounts', 'events', 'smart_contracts') ORDER BY table_name;"

# Reiniciar serviços
echo -e "${YELLOW}🚀 Reiniciando serviços...${NC}"
docker compose -f docker-compose.dev.yml start api worker indexer

# Aguardar serviços iniciarem
echo -e "${YELLOW}⏳ Aguardando serviços iniciarem...${NC}"
sleep 10

# Testar API
echo -e "${YELLOW}🧪 Testando API...${NC}"
if curl -s "http://localhost:8080/api/blocks?limit=1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API está respondendo!${NC}"
else
    echo -e "${YELLOW}⚠️  API ainda não está respondendo (pode levar mais alguns segundos)${NC}"
fi

echo -e "${GREEN}🎉 Banco resetado e pronto para uso!${NC}"
echo -e "${BLUE}📱 Serviços disponíveis:${NC}"
echo -e "  • Frontend: http://localhost:3000"
echo -e "  • API: http://localhost:8080"
echo -e "  • Proxy Dev: https://besuscan.hubweb3.com" 