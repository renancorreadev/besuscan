#!/bin/bash

# Script para aplicar configurações de performance do PostgreSQL
# Para uso com blockchain explorer

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Aplicando configurações de performance PostgreSQL${NC}"

# Verificar se o arquivo de configuração existe
if [ ! -f "database/postgresql-performance.conf" ]; then
    echo -e "${RED}❌ Arquivo database/postgresql-performance.conf não encontrado!${NC}"
    exit 1
fi

# Função para detectar instalação do PostgreSQL
detect_postgresql() {
    # Tentar encontrar postgresql.conf
    POSSIBLE_CONFIGS=(
        "/etc/postgresql/*/main/postgresql.conf"
        "/var/lib/pgsql/*/data/postgresql.conf"
        "/usr/local/pgsql/data/postgresql.conf"
        "/opt/postgresql/*/data/postgresql.conf"
    )
    
    for pattern in "${POSSIBLE_CONFIGS[@]}"; do
        for file in $pattern; do
            if [ -f "$file" ]; then
                echo "$file"
                return 0
            fi
        done
    done
    
    return 1
}

# Função para detectar serviço PostgreSQL
detect_service() {
    if systemctl list-units --type=service | grep -q postgresql; then
        systemctl list-units --type=service | grep postgresql | head -1 | awk '{print $1}'
    elif systemctl list-units --type=service | grep -q postgres; then
        systemctl list-units --type=service | grep postgres | head -1 | awk '{print $1}'
    else
        echo "postgresql"
    fi
}

echo -e "${YELLOW}🔍 Detectando instalação PostgreSQL...${NC}"

# Tentar detectar automaticamente
POSTGRESQL_CONF=$(detect_postgresql)
SERVICE_NAME=$(detect_service)

if [ -z "$POSTGRESQL_CONF" ]; then
    echo -e "${YELLOW}⚠️  Não foi possível detectar automaticamente o postgresql.conf${NC}"
    echo -e "${YELLOW}💡 Tentativas de localização via SQL...${NC}"
    
    # Tentar via psql se disponível
    if command -v psql >/dev/null 2>&1; then
        echo "Tentando: psql -c \"SHOW config_file;\""
        POSTGRESQL_CONF=$(sudo -u postgres psql -t -c "SHOW config_file;" 2>/dev/null | tr -d ' ' || echo "")
    fi
    
    if [ -z "$POSTGRESQL_CONF" ]; then
        echo -e "${RED}❌ Não foi possível localizar postgresql.conf automaticamente${NC}"
        echo -e "${YELLOW}💡 Por favor, forneça o caminho manualmente:${NC}"
        read -p "Caminho para postgresql.conf: " POSTGRESQL_CONF
        
        if [ ! -f "$POSTGRESQL_CONF" ]; then
            echo -e "${RED}❌ Arquivo não encontrado: $POSTGRESQL_CONF${NC}"
            exit 1
        fi
    fi
fi

echo -e "${GREEN}✅ PostgreSQL detectado:${NC}"
echo "  Config: $POSTGRESQL_CONF"
echo "  Service: $SERVICE_NAME"
echo ""

# Verificar permissões
if [ ! -w "$POSTGRESQL_CONF" ] && [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Sem permissão de escrita. Executando com sudo...${NC}"
    sudo -v || {
        echo -e "${RED}❌ Sudo necessário para modificar postgresql.conf${NC}"
        exit 1
    }
    USE_SUDO="sudo"
else
    USE_SUDO=""
fi

echo -e "${YELLOW}📋 Verificando configurações atuais...${NC}"

# Backup do arquivo original
BACKUP_FILE="${POSTGRESQL_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${YELLOW}💾 Criando backup: $BACKUP_FILE${NC}"
$USE_SUDO cp "$POSTGRESQL_CONF" "$BACKUP_FILE"

# Verificar se já foi aplicado
if $USE_SUDO grep -q "# PostgreSQL Performance Configuration for Blockchain Indexing" "$POSTGRESQL_CONF"; then
    echo -e "${YELLOW}⚠️  Configurações já foram aplicadas anteriormente${NC}"
    read -p "Aplicar novamente? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}❌ Operação cancelada.${NC}"
        exit 0
    fi
fi

echo -e "${YELLOW}⚡ Aplicando configurações de performance...${NC}"

# Adicionar configurações ao final do arquivo
$USE_SUDO tee -a "$POSTGRESQL_CONF" > /dev/null << EOF

# =============================================================================
# BLOCKCHAIN EXPLORER PERFORMANCE OPTIMIZATIONS
# Applied by: $(whoami) at $(date)
# Source: database/postgresql-performance.conf
# =============================================================================

EOF

# Aplicar configurações
$USE_SUDO cat "database/postgresql-performance.conf" | $USE_SUDO tee -a "$POSTGRESQL_CONF" > /dev/null

echo -e "${GREEN}✅ Configurações aplicadas com sucesso!${NC}"

# Validar configuração
echo -e "${YELLOW}🔍 Validando configuração...${NC}"
if $USE_SUDO su - postgres -c "postgres --check-config -D $(dirname $POSTGRESQL_CONF)" 2>/dev/null; then
    echo -e "${GREEN}✅ Configuração válida!${NC}"
else
    echo -e "${RED}❌ Erro na configuração! Restaurando backup...${NC}"
    $USE_SUDO cp "$BACKUP_FILE" "$POSTGRESQL_CONF"
    echo -e "${YELLOW}📋 Backup restaurado. Verifique os erros acima.${NC}"
    exit 1
fi

# Perguntar sobre restart
echo ""
echo -e "${YELLOW}🔄 Para aplicar as mudanças, o PostgreSQL precisa ser reiniciado.${NC}"
read -p "Reiniciar PostgreSQL agora? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🔄 Reiniciando PostgreSQL...${NC}"
    if $USE_SUDO systemctl restart "$SERVICE_NAME"; then
        echo -e "${GREEN}✅ PostgreSQL reiniciado com sucesso!${NC}"
        
        # Verificar se está rodando
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            echo -e "${GREEN}✅ PostgreSQL está ativo e funcionando${NC}"
        else
            echo -e "${RED}❌ PostgreSQL não está ativo. Verifique os logs:${NC}"
            echo "  sudo journalctl -u $SERVICE_NAME -f"
        fi
    else
        echo -e "${RED}❌ Erro ao reiniciar PostgreSQL!${NC}"
        echo -e "${YELLOW}📋 Restaurando backup...${NC}"
        $USE_SUDO cp "$BACKUP_FILE" "$POSTGRESQL_CONF"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Lembre-se de reiniciar o PostgreSQL para aplicar as mudanças:${NC}"
    echo "  sudo systemctl restart $SERVICE_NAME"
fi

echo ""
echo -e "${GREEN}🎉 Configurações de performance aplicadas!${NC}"
echo -e "${YELLOW}📊 Principais otimizações aplicadas:${NC}"
echo "  ✅ Memória otimizada (shared_buffers, work_mem, etc.)"
echo "  ✅ WAL otimizado para alta escrita"
echo "  ✅ Autovacuum configurado para blockchain data"
echo "  ✅ Consultas paralelas habilitadas"
echo "  ✅ Logging de performance ativo"
echo ""
echo -e "${YELLOW}💡 Próximos passos:${NC}"
echo "  1. Monitor performance com: SELECT * FROM pg_stat_statements;"
echo "  2. Ajustar configurações conforme RAM disponível"
echo "  3. Considerar particionamento para tabelas grandes"
echo ""
echo -e "${YELLOW}📋 Backup salvo em: $BACKUP_FILE${NC}" 