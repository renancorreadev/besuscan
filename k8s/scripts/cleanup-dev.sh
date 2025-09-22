#!/bin/bash

# =============================================================================
# SCRIPT DE LIMPEZA - AMBIENTE DE DESENVOLVIMENTO
# =============================================================================
# Este script remove todos os recursos do ambiente de desenvolvimento
# 
# Uso: ./cleanup-dev.sh
# =============================================================================

set -e

echo "=============================================="
echo "🧹 BeSuScan - Limpeza Desenvolvimento"
echo "=============================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    log_error "kubectl não encontrado."
    exit 1
fi

log_warning "Este script irá deletar TODOS os recursos do namespace besuscan-dev!"
log_warning "Isso inclui:"
echo "  • Namespace besuscan-dev e todos os recursos dentro dele"
echo "  • Volumes persistentes e dados"
echo "  • Configurações e secrets"
echo ""

read -p "Tem certeza que deseja continuar? (digite 'sim' para confirmar): " -r
echo

if [[ $REPLY != "sim" ]]; then
    log_info "Limpeza cancelada pelo usuário"
    exit 0
fi

echo ""
log_info "Iniciando limpeza do ambiente de desenvolvimento..."
echo ""

# Navegar para o diretório correto
cd "$(dirname "$0")/.."

# 1. Deletar Ingress
echo "1️⃣  Removendo ingress..."
kubectl delete -f dev/ingress/ingress.yaml --ignore-not-found=true
log_success "Ingress removido"

# 2. Deletar Deployments
echo ""
echo "2️⃣  Removendo deployments..."
kubectl delete -f dev/deployments/ --ignore-not-found=true
log_success "Deployments removidos"

# 3. Deletar Services
echo ""
echo "3️⃣  Removendo services..."
kubectl delete -f dev/services/ --ignore-not-found=true
log_success "Services removidos"

# 4. Deletar Secrets
echo ""
echo "4️⃣  Removendo secrets..."
kubectl delete -f dev/secrets/app-secrets.yaml --ignore-not-found=true
kubectl delete -f dev/secrets/docker-registry-secret.yaml --ignore-not-found=true
log_success "Secrets removidos"

# 5. Deletar ConfigMaps
echo ""
echo "5️⃣  Removendo configmaps..."
kubectl delete -f dev/configmaps/app-config.yaml --ignore-not-found=true
kubectl delete -f dev/configmaps/nginx-config.yaml --ignore-not-found=true
log_success "ConfigMaps removidos"

# 6. Deletar Volumes
echo ""
echo "6️⃣  Removendo volumes persistentes..."
kubectl delete -f dev/volumes/persistent-volumes.yaml --ignore-not-found=true
log_success "Volumes removidos"

# 7. Deletar Namespace
echo ""
echo "7️⃣  Removendo namespace..."
kubectl delete -f namespaces/dev-namespace.yaml --ignore-not-found=true
log_success "Namespace removido"

# 8. Aguardar finalização
echo ""
log_info "Aguardando finalização da limpeza..."
kubectl wait --for=delete namespace/besuscan-dev --timeout=300s 2>/dev/null || true

echo ""
echo "=============================================="
echo "🎉 Limpeza Concluída!"
echo "=============================================="
echo ""

log_success "Todos os recursos do ambiente de desenvolvimento foram removidos"
echo ""
echo "📋 Para fazer deploy novamente:"
echo "  ./deploy-dev.sh"
echo "" 