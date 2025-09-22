#!/bin/bash

# Script para verificar consumidores RabbitMQ ativos
# Ajuda a detectar duplicação de consumidores durante hot-reload

RABBITMQ_HOST=${RABBITMQ_HOST:-"147.93.11.54"}
RABBITMQ_PORT=${RABBITMQ_PORT:-"15673"}
RABBITMQ_USER=${RABBITMQ_USER:-"guest"}
RABBITMQ_PASS=${RABBITMQ_PASS:-"guest"}

echo "🔍 Verificando consumidores RabbitMQ ativos..."
echo "Host: $RABBITMQ_HOST:$RABBITMQ_PORT"
echo "----------------------------------------"

# Verificar se curl está disponível
if ! command -v curl &> /dev/null; then
    echo "❌ curl não encontrado. Instale curl para usar este script."
    exit 1
fi

# Verificar se jq está disponível
if ! command -v jq &> /dev/null; then
    echo "⚠️ jq não encontrado. Saída será em JSON bruto."
    USE_JQ=false
else
    USE_JQ=true
fi

# Função para fazer requisição à API do RabbitMQ
rabbitmq_api() {
    local endpoint=$1
    curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
         "http://$RABBITMQ_HOST:$RABBITMQ_PORT/api/$endpoint" 2>/dev/null
}

# Função para verificar se RabbitMQ está acessível
check_rabbitmq() {
    local test_response=$(rabbitmq_api "overview")
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

# Verificar conexões ativas
echo "📡 Conexões ativas:"
connections=$(rabbitmq_api "connections")
if [ "$USE_JQ" = true ] && [ -n "$connections" ]; then
    echo "$connections" | jq -r '.[] | "  • \(.name) - \(.user) (\(.state))"' 2>/dev/null || echo "  Nenhuma conexão encontrada"
    connection_count=$(echo "$connections" | jq '. | length' 2>/dev/null || echo "0")
    echo "Total: $connection_count conexões"
else
    echo "  Erro ao obter conexões ou jq não disponível"
fi

echo ""

# Verificar canais ativos
echo "📺 Canais ativos:"
channels=$(rabbitmq_api "channels")
if [ "$USE_JQ" = true ] && [ -n "$channels" ]; then
    echo "$channels" | jq -r '.[] | "  • Canal \(.number) - \(.connection_details.name)"' 2>/dev/null || echo "  Nenhum canal encontrado"
    channel_count=$(echo "$channels" | jq '. | length' 2>/dev/null || echo "0")
    echo "Total: $channel_count canais"
else
    echo "  Erro ao obter canais ou jq não disponível"
fi

echo ""

# Verificar consumidores por fila
echo "🎯 Consumidores por fila:"
queues=("block-mined" "transaction-mined" "transaction-processed" "block-processed")

for queue in "${queues[@]}"; do
    echo "  📦 Fila: $queue"
    queue_info=$(rabbitmq_api "queues/%2F/$queue")
    
    if [ "$USE_JQ" = true ] && [ -n "$queue_info" ]; then
        # Usar valores padrão se jq retornar null ou vazio
        consumer_count=$(echo "$queue_info" | jq -r '.consumers // 0' 2>/dev/null)
        messages=$(echo "$queue_info" | jq -r '.messages // 0' 2>/dev/null)
        
        # Garantir que temos valores numéricos válidos
        consumer_count=${consumer_count:-0}
        messages=${messages:-0}
        
        # Verificar se são números válidos
        if ! [[ "$consumer_count" =~ ^[0-9]+$ ]]; then
            consumer_count=0
        fi
        if ! [[ "$messages" =~ ^[0-9]+$ ]]; then
            messages=0
        fi
        
        echo "    Consumidores: $consumer_count"
        echo "    Mensagens: $messages"
        
        # Verificar se há múltiplos consumidores (problema!)
        if [ "$consumer_count" -gt 1 ]; then
            echo "    ⚠️ ATENÇÃO: Múltiplos consumidores detectados!"
        elif [ "$consumer_count" -eq 1 ]; then
            echo "    ✅ OK: 1 consumidor ativo"
        else
            echo "    ⚪ Nenhum consumidor ativo"
        fi
    else
        echo "    ❌ Erro ao obter informações da fila"
    fi
    echo ""
done

# Verificar detalhes dos consumidores
echo "👥 Detalhes dos consumidores:"
consumers_detail=$(rabbitmq_api "consumers")
if [ "$USE_JQ" = true ] && [ -n "$consumers_detail" ]; then
    # Verificar se há consumidores
    total_consumers=$(echo "$consumers_detail" | jq '. | length' 2>/dev/null || echo "0")
    
    if [ "$total_consumers" -gt 0 ]; then
        echo "$consumers_detail" | jq -r '.[] | "  • \(.consumer_tag) - Fila: \(.queue.name) - Canal: \(.channel_details.number)"' 2>/dev/null
        echo "Total de consumidores: $total_consumers"
        
        # Verificar duplicação por consumer tag pattern
        echo ""
        echo "🔍 Análise de duplicação:"
        worker_consumers=$(echo "$consumers_detail" | jq -r '.[] | select(.consumer_tag | startswith("worker-")) | .consumer_tag' 2>/dev/null)
        if [ -n "$worker_consumers" ]; then
            echo "Consumidores worker detectados:"
            echo "$worker_consumers" | while read -r tag; do
                echo "  • $tag"
            done
            
            # Contar consumidores por fila
            for queue in "${queues[@]}"; do
                queue_consumers=$(echo "$consumers_detail" | jq -r ".[] | select(.queue.name == \"$queue\" and (.consumer_tag | startswith(\"worker-\"))) | .consumer_tag" 2>/dev/null)
                if [ -n "$queue_consumers" ]; then
                    count=$(echo "$queue_consumers" | wc -l)
                    if [ "$count" -gt 1 ]; then
                        echo "  ⚠️ PROBLEMA: $count consumidores na fila $queue"
                        echo "$queue_consumers" | sed 's/^/    - /'
                    fi
                fi
            done
        else
            echo "Nenhum consumidor worker encontrado"
        fi
    else
        echo "Nenhum consumidor ativo no momento"
    fi
else
    echo "❌ Erro ao obter detalhes dos consumidores"
fi

echo ""
echo "✅ Verificação concluída"
echo ""
echo "💡 Dicas:"
echo "  • Se houver múltiplos consumidores na mesma fila, há duplicação"
echo "  • Consumer tags únicos ajudam a identificar instâncias específicas"
echo "  • Durante hot-reload, consumidores antigos devem ser fechados"
echo ""
echo "🔗 Links úteis:"
echo "  • RabbitMQ Management: http://$RABBITMQ_HOST:$RABBITMQ_PORT"
echo "  • Documentação: apps/worker/HOT_RELOAD_GUIDE.md" 