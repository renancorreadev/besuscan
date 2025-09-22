#!/bin/bash

# Script para gerenciar ambiente de desenvolvimento
# Uso: ./scripts/dev-setup.sh [start|stop|restart|logs|status]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se estamos no diretório correto
if [[ ! -f "docker-compose.dev.yml" ]]; then
    log_error "docker-compose.dev.yml não encontrado. Execute este script a partir da raiz do projeto."
    exit 1
fi

# Função para verificar portas em uso
check_ports() {
    log_info "Verificando portas em uso..."
    
    PORTS=(3001 8082 8083 8084 5434 5674 15674 6380)
    CONFLICTS=()
    
    for port in "${PORTS[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            CONFLICTS+=($port)
        fi
    done
    
    if [[ ${#CONFLICTS[@]} -gt 0 ]]; then
        log_warning "As seguintes portas estão em uso: ${CONFLICTS[*]}"
        log_warning "Isso pode causar conflitos. Deseja continuar? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_error "Operação cancelada pelo usuário"
            exit 1
        fi
    else
        log_success "Todas as portas estão livres"
    fi
}

# Função para aplicar configurações do Kubernetes
apply_k8s_config() {
    log_info "Aplicando configurações do Kubernetes para desenvolvimento..."
    
    # Aplicar serviços externos de desenvolvimento
    kubectl apply -f k8s/prod/services/external-services.yaml
    
    # Aplicar ingress atualizado
    kubectl apply -f k8s/prod/ingress/ingress.yaml
    
    log_success "Configurações K8s aplicadas"
}

# Função para iniciar ambiente de desenvolvimento
start_dev() {
    log_info "Iniciando ambiente de desenvolvimento..."
    
    check_ports
    
    # Criar volumes se não existirem
    docker volume create explorer-pgdata 2>/dev/null || true
    docker volume create explorer-go-modules 2>/dev/null || true
    docker volume create explorer-redis-data 2>/dev/null || true
    docker volume create explorer-frontend-node-modules 2>/dev/null || true
    
    # Iniciar serviços
    docker compose -f docker-compose.dev.yml up -d
    
    # Aplicar configurações K8s
    apply_k8s_config
    
    log_success "Ambiente de desenvolvimento iniciado!"
    log_info "Serviços disponíveis:"
    echo "  - Frontend: http://localhost:3001 (ou https://besuscan.hubweb3.com)"
    echo "  - API: http://localhost:8083"
    echo "  - Indexer: http://localhost:8082"
    echo "  - Worker: http://localhost:8084"
    echo "  - PostgreSQL: localhost:5434"
    echo "  - RabbitMQ: localhost:5674 (Management: localhost:15674)"
    echo "  - Redis: localhost:6380"
}

# Função para parar ambiente de desenvolvimento
stop_dev() {
    log_info "Parando ambiente de desenvolvimento..."
    
    docker compose -f docker-compose.dev.yml down
    
    log_success "Ambiente de desenvolvimento parado"
}

# Função para reiniciar ambiente de desenvolvimento
restart_dev() {
    log_info "Reiniciando ambiente de desenvolvimento..."
    
    stop_dev
    sleep 2
    start_dev
}

# Função para mostrar logs
show_logs() {
    local service=$2
    
    if [[ -n "$service" ]]; then
        log_info "Mostrando logs do serviço: $service"
        docker compose -f docker-compose.dev.yml logs -f "$service"
    else
        log_info "Mostrando logs de todos os serviços"
        docker compose -f docker-compose.dev.yml logs -f
    fi
}

# Função para mostrar status
show_status() {
    log_info "Status dos serviços de desenvolvimento:"
    
    docker compose -f docker-compose.dev.yml ps
    
    echo ""
    log_info "Verificando conectividade dos endpoints:"
    
    # Verificar endpoints locais
    ENDPOINTS=(
        "http://localhost:3001|Frontend"
        "http://localhost:8083/health|API"
        "http://localhost:8082/health|Indexer"
        "http://localhost:8084/health|Worker"
    )
    
    for endpoint in "${ENDPOINTS[@]}"; do
        IFS='|' read -r url name <<< "$endpoint"
        if curl -s "$url" >/dev/null 2>&1; then
            log_success "$name: ✅ Disponível"
        else
            log_warning "$name: ❌ Indisponível"
        fi
    done
}

# Função para mostrar ajuda
show_help() {
    echo "Uso: $0 [comando] [opções]"
    echo ""
    echo "Comandos:"
    echo "  start     - Iniciar ambiente de desenvolvimento"
    echo "  stop      - Parar ambiente de desenvolvimento"
    echo "  restart   - Reiniciar ambiente de desenvolvimento"
    echo "  logs      - Mostrar logs (opcional: especificar serviço)"
    echo "  status    - Mostrar status dos serviços"
    echo "  help      - Mostrar esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0 start"
    echo "  $0 logs api"
    echo "  $0 logs frontend"
    echo "  $0 status"
}

# Processar argumentos
case "${1:-help}" in
    start)
        start_dev
        ;;
    stop)
        stop_dev
        ;;
    restart)
        restart_dev
        ;;
    logs)
        show_logs "$@"
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Comando inválido: $1"
        show_help
        exit 1
        ;;
esac
