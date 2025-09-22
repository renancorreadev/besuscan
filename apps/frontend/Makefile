# Frontend Makefile
.PHONY: help dev prod

# Docker Hub config
DOCKER_USER=besuscan
DEV_REPO=$(DOCKER_USER)/frontend-dev
PROD_REPO=$(DOCKER_USER)/frontend

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

help: ## Mostrar ajuda
	@echo "$(BLUE)🔧 Comandos disponíveis:$(NC)"
	@echo "  make dev 1.0.0             # Build e push da imagem de desenvolvimento"
	@echo "  make prod 1.0.0            # Build e push da imagem de produção" 