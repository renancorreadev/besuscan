# Worker Makefile
# Comandos para gerenciar o worker e monitorar RabbitMQ

.PHONY: help build-dev build-prod dev prod run clean check-consumers kill-consumers logs docker-login

# Variáveis
BINARY_NAME=worker
DOCKER_COMPOSE=docker-compose
RABBITMQ_HOST=147.93.11.54

# Docker Hub config
DOCKER_USER=besuscan
DEV_REPO=$(DOCKER_USER)/worker-dev
PROD_REPO=$(DOCKER_USER)/worker

# Versão padrão para desenvolvimento
DEV_VERSION ?= v0.0.1

# Pega a versão do primeiro argumento após o target
VERSION = $(word 2,$(MAKECMDGOALS))
# Ignora argumentos desconhecidos
%:
	@:

# Cores para output
GREEN := \033[0;32m
RED := \033[0;31m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m

help: ## Mostrar ajuda
	@echo "$(BLUE)🔧 Comandos para Docker:$(NC)"
	@echo "  make dev 0.0.1             # Build e push da imagem de desenvolvimento"
	@echo "  make prod 1.0.0            # Build e push da imagem de produção"
	@echo "  make docker-login          # Login no Docker Hub"
	@echo ""
	@echo "$(BLUE)🐳 Imagens geradas:$(NC)"
	@echo "  Desenvolvimento:"
	@echo "    • $(DEV_REPO):latest"
	@echo "    • $(DEV_REPO):vX.Y.Z"
	@echo "  Produção:"
	@echo "    • $(PROD_REPO):latest"
	@echo "    • $(PROD_REPO):vX.Y.Z"
	@echo ""
	@echo "$(BLUE)🚀 Comandos para execução local:$(NC)"
	@echo "  make run                   # Executar worker localmente"
	@echo "  make test                  # Executar testes"
	@echo "  make lint                  # Executar linter"
	@echo ""
	@echo "$(BLUE)📦 Comandos para Docker Compose:$(NC)"
	@echo "  make start                 # Iniciar worker no Docker"
	@echo "  make stop                  # Parar worker no Docker"
	@echo "  make restart               # Reiniciar worker no Docker"
	@echo "  make logs                  # Ver logs do worker"
	@echo "  make status                # Status dos serviços"
	@echo ""
	@echo "$(BLUE)🔍 Comandos para monitoramento:$(NC)"
	@echo "  make health                # Verificar saúde do sistema"
	@echo "  make check-consumers       # Verificar consumidores RabbitMQ"
	@echo "  make kill-consumers        # Forçar fechamento de conexões RabbitMQ"
	@echo "  make cleanup-consumers     # Limpar consumidores órfãos"
	@echo "  make debug                 # Ver informações de debug"
	@echo ""
	@echo "$(BLUE)🧹 Outros comandos:$(NC)"
	@echo "  make clean                 # Limpar arquivos temporários"
	@echo "  make mod-tidy              # Limpar dependências Go"

docker-login: ## Login no Docker Hub
	@echo "$(GREEN)🔑 Fazendo login no Docker Hub como $(DOCKER_USERNAME)...$(NC)"
	@if [ -z "$(DOCKER_USERNAME)" ] || [ -z "$(DOCKER_PASSWORD)" ]; then \
		echo "$(RED)❌ DOCKER_USERNAME e DOCKER_PASSWORD são necessários$(NC)"; \
		exit 1; \
	fi
	@echo "$(DOCKER_PASSWORD)" | docker login -u $(DOCKER_USERNAME) --password-stdin

# Comandos Docker simplificados
dev: ## Build e push imagem de desenvolvimento
	@if [ -z "$(VERSION)" ]; then \
		VERSION=$(DEV_VERSION); \
	else \
		VERSION="v$(VERSION)"; \
	fi; \
	echo "$(GREEN)🐳 Construindo imagem de desenvolvimento ($$VERSION)...$(NC)"; \
	docker build -t $(DEV_REPO):latest -f Dockerfile.dev .; \
	docker tag $(DEV_REPO):latest $(DEV_REPO):$$VERSION; \
	echo "$(GREEN)🐳 Pushing imagem de desenvolvimento...$(NC)"; \
	docker push $(DEV_REPO):latest; \
	docker push $(DEV_REPO):$$VERSION; \
	echo "$(GREEN)✅ Imagem de desenvolvimento publicada:$(NC)"; \
	echo "  • $(DEV_REPO):latest"; \
	echo "  • $(DEV_REPO):$$VERSION"

prod: ## Build e push imagem de produção
	@if [ -z "$(VERSION)" ]; then \
		echo "$(RED)❌ Versão não especificada. Use: make prod x.y.z$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)🐳 Construindo imagem de produção (v$(VERSION))...$(NC)"
	@docker build -t $(PROD_REPO):latest -f Dockerfile .
	@docker tag $(PROD_REPO):latest $(PROD_REPO):v$(VERSION)
	@echo "$(GREEN)🐳 Pushing imagem de produção...$(NC)"
	@docker push $(PROD_REPO):latest
	@docker push $(PROD_REPO):v$(VERSION)
	@echo "$(GREEN)✅ Imagem de produção publicada:$(NC)"
	@echo "  • $(PROD_REPO):latest"
	@echo "  • $(PROD_REPO):v$(VERSION)"

run: ## Executar o worker localmente
	@echo "🚀 Executando worker..."
	go run ./cmd/main.go

clean: ## Limpar arquivos temporários
	@echo "🧹 Limpando arquivos temporários..."
	rm -rf tmp/
	rm -rf bin/
	rm -f build-errors.log
	rm -f log.txt
	@echo "✅ Limpeza concluída"

check-consumers: ## Verificar consumidores RabbitMQ ativos
	@echo "🔍 Verificando consumidores RabbitMQ..."
	@if [ -f scripts/check-consumers.sh ]; then \
		./scripts/check-consumers.sh; \
	else \
		echo "❌ Script check-consumers.sh não encontrado"; \
	fi

kill-consumers: ## Forçar fechamento de todas as conexões RabbitMQ
	@echo "⚠️ Forçando fechamento de conexões RabbitMQ..."
	@echo "Isso irá desconectar TODOS os consumidores!"
	@read -p "Tem certeza? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@curl -s -u guest:guest -X DELETE "http://$(RABBITMQ_HOST):15673/api/connections" || echo "❌ Erro ao fechar conexões"
	@echo "✅ Comando enviado para fechar conexões"

cleanup-consumers: ## Limpar consumidores órfãos (desenvolvimento)
	@echo "🧹 Limpando consumidores órfãos..."
	@if [ -f scripts/cleanup-consumers.sh ]; then \
		./scripts/cleanup-consumers.sh; \
	else \
		echo "❌ Script cleanup-consumers.sh não encontrado"; \
	fi

logs: ## Mostrar logs do container Docker
	@echo "📋 Logs do worker..."
	$(DOCKER_COMPOSE) logs -f worker

restart: ## Reiniciar o worker no Docker
	@echo "🔄 Reiniciando worker..."
	$(DOCKER_COMPOSE) restart worker
	@echo "✅ Worker reiniciado"

stop: ## Parar o worker no Docker
	@echo "🛑 Parando worker..."
	$(DOCKER_COMPOSE) stop worker
	@echo "✅ Worker parado"

start: ## Iniciar o worker no Docker
	@echo "🚀 Iniciando worker..."
	$(DOCKER_COMPOSE) start worker
	@echo "✅ Worker iniciado"

status: ## Verificar status dos serviços
	@echo "📊 Status dos serviços:"
	$(DOCKER_COMPOSE) ps

health: ## Verificar saúde do sistema (RabbitMQ + PostgreSQL)
	@echo "🏥 Verificando saúde do sistema..."
	@echo "RabbitMQ:"
	@curl -s -u guest:guest "http://$(RABBITMQ_HOST):15673/api/overview" | jq -r '.rabbitmq_version // "❌ Não conectado"' || echo "❌ RabbitMQ não acessível"
	@echo "PostgreSQL:"
	@$(DOCKER_COMPOSE) exec -T postgres pg_isready || echo "❌ PostgreSQL não acessível"

debug: ## Informações de debug
	@echo "🐛 Informações de debug:"
	@echo "Variáveis de ambiente:"
	@env | grep -E "(RABBITMQ|DATABASE|ETH)" || echo "Nenhuma variável encontrada"
	@echo ""
	@echo "Processos Go ativos:"
	@ps aux | grep -E "(air|worker|main)" | grep -v grep || echo "Nenhum processo encontrado"

# Comandos para desenvolvimento
test: ## Executar testes
	@echo "🧪 Executando testes..."
	go test ./...

lint: ## Executar linter
	@echo "🔍 Executando linter..."
	golangci-lint run

mod-tidy: ## Limpar dependências Go
	@echo "📦 Limpando dependências..."
	go mod tidy 