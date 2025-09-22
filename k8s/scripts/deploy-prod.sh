#!/bin/bash

# =============================================================================
# SCRIPT DE DEPLOY - AMBIENTE DE PRODUÇÃO
# =============================================================================
# Este script automatiza o deploy completo do BeSuScan no ambiente de produção
# 
# Uso: ./deploy-prod.sh
# =============================================================================

set -e  # Para na primeira falha

echo "=============================================="
echo "🚀 BeSuScan - Deploy Produção"
echo "=============================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logs coloridos
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se kubectl está disponível
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl não encontrado. Instale o kubectl primeiro."
    exit 1
fi

# Verificar se o cluster está acessível
if ! kubectl cluster-info &> /dev/null; then
    log_error "Não foi possível conectar ao cluster Kubernetes."
    exit 1
fi

log_success "Conectado ao cluster Kubernetes"

# Navegar para o diretório correto
cd "$(dirname "$0")/.."

echo ""
log_info "Iniciando deploy do ambiente de produção..."
echo ""

# 1. Aplicar Storage Classes
echo "1️⃣  Aplicando Storage Classes..."
kubectl apply -f shared/storage-classes/storage-classes.yaml
log_success "Storage Classes aplicadas"

# 2. Aplicar Namespace
echo ""
echo "2️⃣  Criando namespace de produção..."
kubectl apply -f namespaces/prod-namespace.yaml
log_success "Namespace besuscan-prod criado"

# 3. Aplicar Volumes Persistentes
echo ""
echo "3️⃣  Criando volumes persistentes..."
kubectl apply -f prod/volumes/persistent-volumes.yaml
log_success "Volumes persistentes criados"

# 4. Aplicar ConfigMaps
echo ""
echo "4️⃣  Aplicando configurações (ConfigMaps)..."
kubectl apply -f prod/configmaps/app-config.yaml
log_success "ConfigMaps aplicados"

# 5. Aplicar Secrets
echo ""
echo "5️⃣  Aplicando credenciais (Secrets)..."
kubectl apply -f prod/secrets/app-secrets.yaml
log_success "Secrets aplicados"

# 6. Aplicar Services
echo ""
echo "6️⃣  Criando services..."
kubectl apply -f prod/services/rabbitmq-service.yaml
kubectl apply -f prod/services/redis-service.yaml
kubectl apply -f prod/services/api-service.yaml
kubectl apply -f prod/services/frontend-service.yaml
kubectl apply -f prod/services/indexer-service.yaml
kubectl apply -f prod/services/worker-service.yaml
log_success "Services criados"

# 7. Aplicar Deployments (infraestrutura primeiro)
echo ""
echo "7️⃣  Fazendo deploy da infraestrutura..."
kubectl apply -f prod/deployments/rabbitmq-deployment.yaml
kubectl apply -f prod/deployments/redis-deployment.yaml
log_success "Infraestrutura deployada"

echo ""
log_info "Aguardando infraestrutura ficar pronta..."
kubectl wait --for=condition=ready pod -l component=rabbitmq -n besuscan-prod --timeout=300s
kubectl wait --for=condition=ready pod -l component=redis -n besuscan-prod --timeout=300s
log_success "Infraestrutura pronta"

# 8. Aplicar Deployments da aplicação
echo ""
echo "8️⃣  Fazendo deploy da aplicação..."
kubectl apply -f prod/deployments/indexer-deployment.yaml
kubectl apply -f prod/deployments/worker-deployment.yaml
kubectl apply -f prod/deployments/api-deployment.yaml
kubectl apply -f prod/deployments/frontend-deployment.yaml
log_success "Aplicação deployada"

# 9. Aplicar Ingress
echo ""
echo "9️⃣  Configurando ingress..."
kubectl apply -f prod/ingress/ingress.yaml
log_success "Ingress configurado"

echo ""
log_info "Aguardando aplicação ficar pronta..."
kubectl wait --for=condition=ready pod -l app=indexer -n besuscan-prod --timeout=300s
kubectl wait --for=condition=ready pod -l app=worker -n besuscan-prod --timeout=300s
kubectl wait --for=condition=ready pod -l app=api -n besuscan-prod --timeout=300s
kubectl wait --for=condition=ready pod -l app=frontend -n besuscan-prod --timeout=300s

echo ""
echo "=============================================="
echo "🎉 Deploy Concluído com Sucesso!"
echo "=============================================="
echo ""

# Mostrar status dos pods
echo "📊 Status dos Pods:"
kubectl get pods -n besuscan-prod -o wide

echo ""
echo "🌐 Services:"
kubectl get services -n besuscan-prod

echo ""
echo "🔗 Acesso à aplicação:"
echo "  • Frontend: https://besuscan.com"
echo "  • API: https://besuscan.com/api"
echo "  • RabbitMQ Management: kubectl port-forward service/rabbitmq-service 15672:15672 -n besuscan-prod"

echo ""
echo "📋 Comandos úteis:"
echo "  • Ver logs da API: kubectl logs -f deployment/api-deployment -n besuscan-prod"
echo "  • Ver logs do Worker: kubectl logs -f deployment/worker-deployment -n besuscan-prod"
echo "  • Ver logs do Indexer: kubectl logs -f deployment/indexer-deployment -n besuscan-prod"
echo ""

log_success "Deploy finalizado! 🚀" 