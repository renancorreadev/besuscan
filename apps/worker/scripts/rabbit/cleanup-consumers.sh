#!/bin/bash

# Script para limpar consumidores RabbitMQ órfãos/duplicados
# Útil durante desenvolvimento com hot-reload

RABBITMQ_HOST=${RABBITMQ_HOST:-"147.93.11.54"}
RABBITMQ_PORT=${RABBITMQ_PORT:-"15673"}
RABBITMQ_USER=${RABBITMQ_USER:-"guest"}
RABBITMQ_PASS=${RABBITMQ_PASS:-"guest"}

echo "🧹 Limpando consumidores RabbitMQ órfãos..."
echo "Host: $RABBITMQ_HOST:$RABBITMQ_PORT"
echo "----------------------------------------"

# Verificar se curl está disponível
if ! command -v curl &> /dev/null; then
    echo "❌ curl não encontrado. Instale curl para usar este script."
    exit 1
fi

# Verificar se jq está disponível
if ! command -v jq &> /dev/null; then
    echo "❌ jq não encontrado. Instale jq para usar este script."
    echo "   Ubuntu/Debian: sudo apt-get install jq"
    echo "   CentOS/RHEL: sudo yum install jq"
    exit 1
fi

# Função para fazer requisição à API do RabbitMQ
rabbitmq_api() {
    local method=${1:-GET}
    local endpoint=$2
    local data=$3
    
    if [ "$method" = "DELETE" ]; then
        curl -s -X DELETE -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
             "http://$RABBITMQ_HOST:$RABBITMQ_PORT/api/$endpoint" 2>/dev/null
    else
        curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
             "http://$RABBITMQ_HOST:$RABBITMQ_PORT/api/$endpoint" 2>/dev/null
    fi
}

# Função para verificar se RabbitMQ está acessível
check_rabbitmq() {
    local test_response=$(rabbitmq_api GET "overview")
    if [ -z "$test_response" ] || echo "$test_response" | grep -q "error\|Error\|404"; then
        echo "❌ Erro: Não foi possível conectar ao RabbitMQ em $RABBITMQ_HOST:$RABBITMQ_PORT"
        echo "   Verifique se:"
        echo "   • RabbitMQ está rodando"
        echo "   • Management plugin está habilitado"
        echo "   • Host e porta estão corretos"
        echo "   • Credenciais estão corretas (guest/guest)"
        exit 1
    fi
}

# Verificar conectividade
check_rabbitmq

# Listar consumidores worker ativos
echo "🔍 Buscando consumidores worker..."
consumers=$(rabbitmq_api GET "consumers")
worker_consumers=$(echo "$consumers" | jq -r '.[] | select(.consumer_tag | startswith("worker-")) | {tag: .consumer_tag, queue: .queue.name, channel: .channel_details.name}')

if [ -z "$worker_consumers" ] || [ "$worker_consumers" = "null" ]; then
    echo "✅ Nenhum consumidor worker encontrado"
    exit 0
fi

echo "📋 Consumidores worker encontrados:"
echo "$worker_consumers" | jq -r '"  • \(.tag) - Fila: \(.queue) - Canal: \(.channel)"'

echo ""
echo "⚠️ ATENÇÃO: Esta operação irá fechar TODAS as conexões RabbitMQ!"
echo "   Isso afetará todos os consumidores ativos (indexer, api, worker)"
echo ""

# Confirmar ação
read -p "Deseja continuar e fechar todas as conexões? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ Operação cancelada"
    exit 0
fi

echo ""
echo "🔄 Fechando todas as conexões RabbitMQ..."

# Obter lista de conexões
connections=$(rabbitmq_api GET "connections")
connection_names=$(echo "$connections" | jq -r '.[].name')

if [ -z "$connection_names" ]; then
    echo "✅ Nenhuma conexão ativa encontrada"
    exit 0
fi

# Fechar cada conexão individualmente
echo "$connection_names" | while read -r connection_name; do
    if [ -n "$connection_name" ]; then
        echo "  🔒 Fechando conexão: $connection_name"
        # URL encode do nome da conexão
        encoded_name=$(echo "$connection_name" | sed 's/ /%20/g' | sed 's/:/%3A/g')
        result=$(rabbitmq_api DELETE "connections/$encoded_name")
        
        if [ $? -eq 0 ]; then
            echo "    ✅ Conexão fechada"
        else
            echo "    ❌ Erro ao fechar conexão"
        fi
    fi
done

echo ""
echo "⏳ Aguardando 2 segundos para limpeza..."
sleep 2

# Verificar resultado
echo "🔍 Verificando resultado..."
new_consumers=$(rabbitmq_api GET "consumers")
remaining_workers=$(echo "$new_consumers" | jq -r '.[] | select(.consumer_tag | startswith("worker-")) | .consumer_tag' 2>/dev/null)

if [ -z "$remaining_workers" ]; then
    echo "✅ Todos os consumidores worker foram removidos"
else
    echo "⚠️ Ainda existem consumidores worker:"
    echo "$remaining_workers" | sed 's/^/  • /'
fi

echo ""
echo "💡 Dicas:"
echo "  • Reinicie o worker para criar novas conexões limpas"
echo "  • Use 'make check-consumers' para monitorar o status"
echo "  • Durante desenvolvimento, considere usar consumer tags únicos"
echo ""
echo "✅ Limpeza concluída" 