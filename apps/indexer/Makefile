# Makefile para deploy de smart contracts e execução do indexer

# Carrega variáveis do .env automaticamente
ifneq (,$(wildcard .env))
    include .env
    export
endif

DB_URL ?= "postgresql://user:password@localhost:5432/indexer"
MIGRATIONS_DIR = migrations
POSTGRES_DSN ?= "postgres://indexer:indexer@localhost:5432/indexer?sslmode=disable"

.PHONY: init-db migrate dbshell docker-up docker-down docker-restart docker-logs docker-ps docker-prune listener worker help dev prod

# Inicializa o banco do zero com todas as tabelas e índices
init-db:
	docker compose exec -T postgres-indexer psql -U indexer -d indexer -f /migrations/000_init_full.sql

migrate:
	docker compose exec -T postgres-indexer psql -U indexer -d indexer -f /migrations/001_create_blocks.sql
	docker compose exec -T postgres-indexer psql -U indexer -d indexer -f /migrations/002_create_transactions.sql
	docker compose exec -T postgres-indexer psql -U indexer -d indexer -f /migrations/003_alter_transactions_pending.sql

dbshell:
	docker compose exec -T postgres-indexer psql -U indexer -d indexer

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-restart:
	docker compose restart

docker-logs:
	docker compose logs -f --tail=100

docker-ps:
	docker compose ps

docker-prune:
	docker system prune -f

listener:
	@echo "[indexer] Rodando todos listeners (block, mempool, etc)..."
	ROLE=listener go run ./cmd/main.go

worker:
	@echo "[indexer] Rodando todos workers (block, mempool, etc)..."
	ROLE=worker go run ./cmd/main.go

# Docker Hub config
DOCKER_USER=besuscan
DEV_REPO=$(DOCKER_USER)/indexer-dev
PROD_REPO=$(DOCKER_USER)/indexer

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

help:
	@echo "📋 Comandos disponíveis:"
	@echo ""
	@echo "🚀 Desenvolvimento:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "(build|run|dev|clean)" | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "🐳 Docker:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "(docker-|up|down|restart|logs|status)" | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "🗄️ Banco de Dados:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "(init-db|migrate|dbshell)" | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "🔍 Monitoramento:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "(check-|monitor|health|debug)" | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
