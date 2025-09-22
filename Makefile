# ==============================================================================
# NXplorer - Makefile
# ==============================================================================
# Controle de ambiente de desenvolvimento e produção para o NXplorer
#
# Uso:
#   make <comando> [ARGS=...]
#
# Comandos disponíveis:
#   make help            - Mostra esta ajuda
#
# Para mais detalhes sobre um comando específico, use:
#   make help-<comando>
#   Ex: make help-up
# ==============================================================================

# ==============================================================================
# CONFIGURAÇÕES
# ==============================================================================

# Cores para melhor legibilidade
BLACK        := $(shell tput -Txterm setaf 0)
RED          := $(shell tput -Txterm setaf 1)
GREEN        := $(shell tput -Txterm setaf 2)
YELLOW       := $(shell tput -Txterm setaf 3)
PURPLE       := $(shell tput -Txterm setaf 5)
WHITE        := $(shell tput -Txterm setaf 7)
RESET        := $(shell tput -Txterm sgr0)
BOLD         := $(shell tput bold)
UNDERLINE    := $(shell tput smul)

# Configurações do Docker
DOCKER_COMPOSE_DEV  = docker compose -f docker-compose.dev.yml
DOCKER_COMPOSE_PROD = docker compose -f docker-compose.prod.yml
SERVICES           = postgres rabbitmq indexer worker api frontend

# Variáveis
DOCKER_REPO ?= hubweb3
VERSION ?= $(shell git describe --tags --always --dirty)

# ==============================================================================
# DEPLOY AUTOMÁTICO COM TAGGING
# ==============================================================================

# Regra dinâmica para deploy de serviços
# Uso: make <service> <environment> <version>
# Ex: make worker dev 1.0.2
%: export SERVICE = $(word 1,$(MAKECMDGOALS))
%: export ENVIRONMENT = $(word 2,$(MAKECMDGOALS))
%: export VERSION = $(word 3,$(MAKECMDGOALS))

# Lista de serviços válidos
VALID_SERVICES = worker indexer api frontend besucli

# Targets para cada serviço
.PHONY: worker indexer api frontend besucli
worker indexer api frontend besucli:
	@echo "$(PURPLE)${BOLD}▶ Iniciando deploy automático...${RESET}"
	@echo ""

	# Validação de parâmetros
	@if [ "$(ENVIRONMENT)" = "" ] || [ "$(VERSION)" = "" ]; then \
		echo "$(RED)❌ Erro: Formato incorreto!$(RESET)"; \
		echo "$(YELLOW)Uso correto: make <serviço> <ambiente> <versão>$(RESET)"; \
		echo "$(YELLOW)Exemplo: make worker dev 1.0.2$(RESET)"; \
		echo ""; \
		echo "$(BLUE)Serviços disponíveis:$(RESET)"; \
		echo "  • worker, indexer, api, frontend, besucli"; \
		echo "$(BLUE)Ambientes disponíveis:$(RESET)"; \
		echo "  • dev (desenvolvimento)"; \
		echo "  • prod (produção)"; \
		exit 1; \
	fi

	# Validação de ambiente
	@if [ "$(ENVIRONMENT)" != "dev" ] && [ "$(ENVIRONMENT)" != "prod" ]; then \
		echo "$(RED)❌ Erro: Ambiente deve ser 'dev' ou 'prod'$(RESET)"; \
		echo "$(YELLOW)Recebido: '$(ENVIRONMENT)'$(RESET)"; \
		exit 1; \
	fi

	# Validação de versão (formato semântico)
	@if ! echo "$(VERSION)" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$$'; then \
		echo "$(RED)❌ Erro: Versão deve seguir formato semântico (x.y.z)$(RESET)"; \
		echo "$(YELLOW)Recebido: '$(VERSION)'$(RESET)"; \
		echo "$(YELLOW)Exemplo válido: 1.0.2$(RESET)"; \
		exit 1; \
	fi

	# Validação se o serviço existe
	@if [ ! -d "apps/$(SERVICE)" ]; then \
		echo "$(RED)❌ Erro: Serviço '$(SERVICE)' não encontrado!$(RESET)"; \
		echo "$(YELLOW)Serviços disponíveis em apps/:$(RESET)"; \
		@ls -1 apps/ | sed 's/^/  • /' || echo "  Nenhum serviço encontrado"; \
		exit 1; \
	fi

	# Confirmação antes de criar tag
	@echo "$(YELLOW)${BOLD}📋 Resumo do Deploy:${RESET}"
	@echo "  • Serviço: $(GREEN)$(SERVICE)$(RESET)"
	@echo "  • Ambiente: $(GREEN)$(ENVIRONMENT)$(RESET)"
	@echo "  • Versão: $(GREEN)$(VERSION)$(RESET)"
	@echo "  • Tag Git: $(GREEN)$(SERVICE)-$(ENVIRONMENT)-$(VERSION)$(RESET)"
	@if [ "$(ENVIRONMENT)" = "dev" ]; then \
		echo "  • Imagem Docker: $(GREEN)besuscan/$(SERVICE)-dev:v$(VERSION)$(RESET)"; \
	else \
		echo "  • Imagem Docker: $(GREEN)besuscan/$(SERVICE):v$(VERSION)$(RESET)"; \
	fi
	@echo ""
	@printf "$(YELLOW)Continuar com o deploy? [s/N] $(RESET)"
	@read REPLY; \
	case "$$REPLY" in \
		[Ss]*) \
			echo "$(GREEN)▶ Prosseguindo com o deploy...$(RESET)"; \
			;; \
		*) \
			echo "$(YELLOW)Deploy cancelado pelo usuário.$(RESET)"; \
			exit 0; \
	esac

	# Verifica se a tag já existe
	@if git tag -l | grep -q "^$(SERVICE)-$(ENVIRONMENT)-$(VERSION)$$"; then \
		echo "$(RED)❌ Erro: Tag '$(SERVICE)-$(ENVIRONMENT)-$(VERSION)' já existe!$(RESET)"; \
		echo "$(YELLOW)Use uma versão diferente ou delete a tag existente:$(RESET)"; \
		echo "$(YELLOW)  git tag -d $(SERVICE)-$(ENVIRONMENT)-$(VERSION)$(RESET)"; \
		echo "$(YELLOW)  git push origin :refs/tags/$(SERVICE)-$(ENVIRONMENT)-$(VERSION)$(RESET)"; \
		exit 1; \
	fi

	# Cria e envia a tag
	@echo "$(GREEN)🔖 Criando tag $(SERVICE)-$(ENVIRONMENT)-$(VERSION)...$(RESET)"
	@git tag -a "$(SERVICE)-$(ENVIRONMENT)-$(VERSION)" -m "Release $(SERVICE) $(ENVIRONMENT) v$(VERSION)" || { \
		echo "$(RED)❌ Erro ao criar tag Git$(RESET)"; \
		exit 1; \
	}

	@echo "$(GREEN)📤 Enviando tag para o repositório...$(RESET)"
	@git push origin "$(SERVICE)-$(ENVIRONMENT)-$(VERSION)" || { \
		echo "$(RED)❌ Erro ao enviar tag para o repositório$(RESET)"; \
		echo "$(YELLOW)Removendo tag local...$(RESET)"; \
		git tag -d "$(SERVICE)-$(ENVIRONMENT)-$(VERSION)"; \
		exit 1; \
	}

	@echo ""
	@echo "$(GREEN)${BOLD}✅ Deploy iniciado com sucesso!${RESET}"
	@echo "$(YELLOW)🚀 Pipeline do Bitbucket foi acionada automaticamente$(RESET)"
	@echo "$(YELLOW)📊 Acompanhe o progresso em: https://bitbucket.org/$(shell git config remote.origin.url | sed 's/.*@bitbucket.org[:/]\(.*\)\.git/\1/')/pipelines$(RESET)"
	@echo ""
	@echo "$(BLUE)${BOLD}🔍 Para monitorar:${RESET}"
	@echo "  • Acesse o Bitbucket Pipelines"
	@echo "  • Verifique o Docker Hub: https://hub.docker.com/u/besuscan"
	@echo "  • Execute: $(GREEN)docker pull besuscan/$(SERVICE)$(if $(filter dev,$(ENVIRONMENT)),-dev):v$(VERSION)$(RESET)"

# ==============================================================================
# GERENCIAMENTO DE TAGS
# ==============================================================================

.PHONY: list-tags
list-tags: ## Lista todas as tags de deploy existentes
	@echo "$(PURPLE)${BOLD}📋 Tags de Deploy Existentes:${RESET}\n"
	@git tag -l | grep -E '^(worker|indexer|api|frontend|besucli)-(dev|prod)-[0-9]+\.[0-9]+\.[0-9]+$$' | sort -V | \
	while read tag; do \
		service=$$(echo $$tag | cut -d'-' -f1); \
		env=$$(echo $$tag | cut -d'-' -f2); \
		version=$$(echo $$tag | cut -d'-' -f3); \
		if [ "$$env" = "dev" ]; then \
			echo "  🔧 $$service (dev) - v$$version"; \
		else \
			echo "  🚀 $$service (prod) - v$$version"; \
		fi; \
	done || echo "  Nenhuma tag de deploy encontrada"

.PHONY: delete-tag
delete-tag: ## Remove uma tag de deploy (use TAG=servico-ambiente-versao)
	@if [ -z "$(TAG)" ]; then \
		echo "$(RED)❌ Erro: Especifique a tag com TAG=servico-ambiente-versao$(RESET)"; \
		echo "$(YELLOW)Exemplo: make delete-tag TAG=worker-dev-1.0.1$(RESET)"; \
		echo "$(YELLOW)Use 'make list-tags' para ver as tags disponíveis$(RESET)"; \
		exit 1; \
	fi
	@if ! git tag -l | grep -q "^$(TAG)$$"; then \
		echo "$(RED)❌ Erro: Tag '$(TAG)' não encontrada$(RESET)"; \
		echo "$(YELLOW)Use 'make list-tags' para ver as tags disponíveis$(RESET)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)${BOLD}⚠️  Removendo tag: $(TAG)${RESET}"
	@printf "$(YELLOW)Tem certeza? Esta ação não pode ser desfeita [s/N] $(RESET)"
	@read REPLY; \
	case "$$REPLY" in \
		[Ss]*) \
			echo "$(RED)▶ Removendo tag local...$(RESET)"; \
			git tag -d "$(TAG)"; \
			echo "$(RED)▶ Removendo tag remota...$(RESET)"; \
			git push origin ":refs/tags/$(TAG)"; \
			echo "$(GREEN)✅ Tag $(TAG) removida com sucesso!$(RESET)"; \
			;; \
		*) \
			echo "$(YELLOW)Operação cancelada pelo usuário.$(RESET)"; \
			exit 0; \
	esac

.PHONY: check-pipeline
check-pipeline: ## Verifica o status da última pipeline
	@echo "$(PURPLE)${BOLD}🔍 Status da Pipeline:${RESET}\n"
	@echo "$(YELLOW)Acesse o Bitbucket Pipelines para ver o status detalhado:$(RESET)"
	@echo "$(BLUE)https://bitbucket.org/$(shell git config remote.origin.url | sed 's/.*@bitbucket.org[:/]\(.*\)\.git/\1/' 2>/dev/null || echo 'SEU_USUARIO/SEU_REPO')/pipelines$(RESET)"
	@echo ""
	@echo "$(YELLOW)Últimas tags criadas:$(RESET)"
	@git tag -l | grep -E '^(worker|indexer|api|frontend|besucli)-(dev|prod)-[0-9]+\.[0-9]+\.[0-9]+$$' | sort -V | tail -5 | \
	while read tag; do \
		echo "  • $$tag"; \
	done || echo "  Nenhuma tag encontrada"

.PHONY: deploy-status
deploy-status: ## Mostra status geral dos deploys
	@echo "$(GREEN)${BOLD}📊 Status Geral dos Deploys${RESET}\n"
	@echo "$(YELLOW)${BOLD}Serviços Disponíveis:${RESET}"
	@for service in worker indexer api frontend besucli; do \
		if [ -d "apps/$$service" ]; then \
			echo "  ✅ $$service"; \
		else \
			echo "  ❌ $$service (não encontrado)"; \
		fi; \
	done
	@echo ""
	@echo "$(YELLOW)${BOLD}Últimas Tags por Serviço:${RESET}"
	@for service in worker indexer api frontend besucli; do \
		echo "  📦 $$service:"; \
		dev_tag=$$(git tag -l | grep "^$$service-dev-" | sort -V | tail -1); \
		prod_tag=$$(git tag -l | grep "^$$service-prod-" | sort -V | tail -1); \
		if [ -n "$$dev_tag" ]; then \
			echo "    🔧 Dev: $$(echo $$dev_tag | cut -d'-' -f3)"; \
		else \
			echo "    🔧 Dev: nenhuma"; \
		fi; \
		if [ -n "$$prod_tag" ]; then \
			echo "    🚀 Prod: $$(echo $$prod_tag | cut -d'-' -f3)"; \
		else \
			echo "    🚀 Prod: nenhuma"; \
		fi; \
	done
	@echo ""
	@echo "$(YELLOW)${BOLD}Docker Hub:${RESET}"
	@echo "  🐳 https://hub.docker.com/u/besuscan"


dev prod:
	@:

# Regra de fallback para capturar comandos inválidos
%:
	@# Ignora argumentos que são versões (parte do comando de deploy)
	@if echo "$@" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$$'; then \
		exit 0; \
	elif echo "$@" | grep -qE '^(dev|prod)$$'; then \
		exit 0; \
	elif echo "$(MAKECMDGOALS)" | grep -qE '^(worker|indexer|api|frontend|besucli)( |$$)'; then \
		echo "$(RED)❌ Erro interno: Target de serviço não processado corretamente$(RESET)"; \
		echo "$(YELLOW)Use: make <serviço> <ambiente> <versão>$(RESET)"; \
		exit 1; \
	elif [ "$(words $(MAKECMDGOALS))" -ge 3 ] && echo "$(word 2,$(MAKECMDGOALS))" | grep -qE '^(dev|prod)$$' && echo "$(word 3,$(MAKECMDGOALS))" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$$'; then \
		echo "$(RED)❌ Erro: Serviço '$(word 1,$(MAKECMDGOALS))' não é válido$(RESET)"; \
		echo "$(YELLOW)Serviços válidos: worker, indexer, api, frontend, besucli$(RESET)"; \
		echo "$(YELLOW)Exemplo: make worker dev 1.0.2$(RESET)"; \
		exit 1; \
	else \
		echo "$(RED)❌ Comando '$@' não reconhecido$(RESET)"; \
		echo "$(YELLOW)Use 'make help' para ver os comandos disponíveis$(RESET)"; \
		exit 1; \
	fi

# ==============================================================================
# AJUDA
# ==============================================================================

.PHONY: help
help: ## Mostra esta ajuda
	@echo "\n${BOLD}${WHITE}NXplorer - Comandos disponíveis:${RESET}\n"
	@echo "${YELLOW}Gerenciamento de Containers:${RESET}"
	@echo "  ${GREEN}up${RESET}         - Inicia todos os serviços em background"
	@echo "  ${GREEN}down${RESET}       - Para e remove todos os containers e redes"
	@echo "  ${GREEN}restart${RESET}    - Reinicia todos os serviços"
	@echo "  ${GREEN}logs${RESET}       - Mostra os logs dos serviços em tempo real"
	@echo "  ${GREEN}logs-all${RESET}   - Mostra logs de todos os serviços"
	@echo "  ${GREEN}status${RESET}     - Mostra o status dos containers"
	@echo "  ${GREEN}clean${RESET}      - ${RED}Limpa todo o ambiente (cuidado!)${RESET}"
	@echo ""
	@echo "${YELLOW}Gerenciamento de Serviços Individuais:${RESET}"
	@echo "  ${GREEN}up-<serviço>${RESET}    - Inicia um serviço específico"
	@echo "  ${GREEN}down-<serviço>${RESET}  - Para um serviço específico"
	@echo "  ${GREEN}restart-<serviço>${RESET} - Reinicia um serviço específico"
	@echo "  ${GREEN}restart-worker${RESET}  - Reinicia apenas o worker"
	@echo "  ${GREEN}restart-indexer${RESET} - Reinicia apenas o indexer"
	@echo "  ${GREEN}logs-<serviço>${RESET}   - Mostra logs de um serviço específico"
	@echo "  ${GREEN}build-<serviço>${RESET}  - Reconstrói um serviço específico"
	@echo "  ${YELLOW}Serviços disponíveis: ${GREEN}indexer, worker, api, frontend, postgres, rabbitmq${RESET}"
	@echo "  Ex: ${GREEN}make up-indexer${RESET} ou ${GREEN}make logs-worker${RESET}"
	@echo ""
	@echo "${YELLOW}Desenvolvimento:${RESET}"
	@echo "  ${GREEN}build${RESET}      - Constrói/recria as imagens dos serviços"
	@echo "  ${GREEN}quick-start${RESET} - ${BOLD}Inicia rapidamente onde paramos${RESET}"
	@echo "  ${GREEN}full-restart${RESET} - Reinicia completamente o ambiente"
	@echo "  ${GREEN}dev-status${RESET} - Mostra status detalhado do ambiente"
	@echo "  ${GREEN}check-services${RESET} - Verifica se os serviços estão funcionando"
	@echo "  ${GREEN}test${RESET}       - Executa os testes automatizados"
	@echo "  ${GREEN}lint${RESET}       - Executa análise estática do código"
	@echo "  ${GREEN}format${RESET}     - Formata o código automaticamente"
	@echo ""
	@echo "${YELLOW}Hot-Reload e Monitoramento RabbitMQ:${RESET}"
	@echo "  ${GREEN}dev-worker${RESET}      - Inicia worker com hot-reload (Air)"
	@echo "  ${GREEN}dev-indexer${RESET}     - Inicia indexer com hot-reload (Air)"
	@echo "  ${GREEN}check-consumers${RESET} - Verifica consumidores RabbitMQ ativos"
	@echo "  ${GREEN}check-queues${RESET}    - Verifica status das filas RabbitMQ"
	@echo "  ${GREEN}kill-consumers${RESET}  - ${RED}Força fechamento de conexões RabbitMQ${RESET}"
	@echo "  ${GREEN}monitor-rabbitmq${RESET} - Monitora RabbitMQ em tempo real"
	@echo "  ${GREEN}clean-hotreload${RESET} - Limpa arquivos temporários do hot-reload"
	@echo "  ${GREEN}rabbitmq-health${RESET} - Verifica saúde do RabbitMQ"
	@echo ""
	@echo "${YELLOW}Banco de Dados:${RESET}"
	@echo "  ${GREEN}setup-db${RESET}   - Configura o banco com as migrations"
	@echo "  ${GREEN}migrate${RESET}    - Executa apenas as migrations"
	@echo "  ${GREEN}migrate-transactions${RESET} - Executa apenas a migração de transações"
	@echo "  ${GREEN}db-reset${RESET}   - ${RED}Reseta completamente o banco de dados${RESET}"
	@echo "  ${GREEN}db-shell${RESET}   - Acessa o shell do banco de dados"
	@echo ""
	@echo "${YELLOW}Sincronização de Blocos:${RESET}"
	@echo "  ${GREEN}sync-from${RESET}  - Sincroniza a partir de um bloco específico (use BLOCK=número)"
	@echo "  ${GREEN}sync-latest${RESET} - Sincroniza a partir do último bloco da rede"
	@echo "  ${GREEN}sync-status${RESET} - Mostra o status de sincronização atual"
	@echo "  ${GREEN}sync-test${RESET}  - Testa com blocos que contêm transações conhecidas"
	@echo "  ${GREEN}sync-reset${RESET} - ${RED}Reseta e reprocessa tudo do zero${RESET}"
	@echo "  Ex: ${GREEN}make sync-from BLOCK=392700${RESET}"
	@echo ""
	@echo "${YELLOW}Deploy de Contratos:${RESET}"
	@echo "  ${GREEN}contract-deploy${RESET}     - Deploy do contrato Counter básico"
	@echo "  ${GREEN}contract-build${RESET}      - Compila os contratos"
	@echo "  ${GREEN}contract-test${RESET}       - Executa testes dos contratos"
	@echo "  ${GREEN}contract-clean${RESET}      - Limpa artefatos de compilação"
	@echo "  ${GREEN}contract-interact${RESET}   - Interage com Counter (increment + setNumber)"
	@echo "  ${GREEN}contract-interact-fuzzy${RESET} - Envia 5 transações de incremento"
	@echo "  ${GREEN}contract-interact-multi${RESET} - Envia N transações (use COUNT=número)"
	@echo "  ${GREEN}contract-check-env${RESET}  - Verifica configuração de ambiente"
	@echo "  ${GREEN}contract-status${RESET}     - Mostra status completo dos contratos"
	@echo "  ${GREEN}deploy-token${RESET}       - Deploy de token ERC20 (use NAME=nome TOKEN_SYMBOL=símbolo)"
	@echo "  ${GREEN}deploy-nft${RESET}         - Deploy de coleção NFT (use COLLECTION_NAME=nome COLLECTION_SYMBOL=símbolo)"
	@echo "  ${GREEN}deploy-multisig${RESET}    - Deploy de carteira multisig (use OWNERS=addr1,addr2 THRESHOLD=2)"
	@echo "  ${GREEN}deploy-custom${RESET}      - Deploy personalizado (use CONTRACT=path/Contract.sol:Name)"
	@echo "  ${GREEN}deploy-all-examples${RESET} - Deploy de todos os contratos de exemplo"
	@echo "  ${GREEN}verify-contract${RESET}    - Verifica contrato (use ADDRESS=0x... CONTRACT=path/Contract.sol:Name)"
	@echo "  ${GREEN}list-deployments${RESET}   - Lista deployments recentes"
	@echo "  ${GREEN}check-balance${RESET}      - Verifica saldo da carteira de deploy"
	@echo "  Ex: ${GREEN}make contract-deploy${RESET} ou ${GREEN}make contract-interact-multi COUNT=10${RESET}"
	@echo ""
	@echo "${YELLOW}Deploy Automático:${RESET}"
	@echo "  ${GREEN}make <serviço> <ambiente> <versão>${RESET} - Deploy automático com tagging"
	@echo "  ${GREEN}list-tags${RESET}         - Lista todas as tags de deploy"
	@echo "  ${GREEN}delete-tag${RESET}        - Remove uma tag (use TAG=servico-ambiente-versao)"
	@echo "  ${GREEN}check-pipeline${RESET}    - Verifica status da pipeline"
	@echo "  ${GREEN}deploy-status${RESET}     - Status geral dos deploys"
	@echo "  ${YELLOW}Serviços: ${GREEN}worker, indexer, api, frontend, besucli${RESET}"
	@echo "  ${YELLOW}Ambientes: ${GREEN}dev, prod${RESET}"
	@echo "  Ex: ${GREEN}make worker dev 1.0.2${RESET} ou ${GREEN}make api prod 2.1.0${RESET}"
	@echo ""
	@echo "${YELLOW}Escalonamento:${RESET}"
	@echo "  ${GREEN}scale-<serviço>${RESET} - Escala um serviço (use NUM=X)"
	@echo "  Ex: ${GREEN}make scale-worker NUM=3${RESET}"
	@echo ""
	@echo "${YELLOW}Desenvolvimento Avançado:${RESET}"
	@echo "  ${GREEN}dev-setup${RESET}       - ${BOLD}Configura ambiente para desenvolvimento${RESET}"
	@echo "  ${GREEN}dev-full${RESET}        - ${BOLD}Inicia ambiente completo de desenvolvimento${RESET}"
	@echo "  ${GREEN}dev-stop${RESET}        - Para todos os processos de desenvolvimento"
	@echo "  ${GREEN}dev-restart${RESET}     - Reinicia ambiente de desenvolvimento"
	@echo "  ${GREEN}hotreload-status${RESET} - Mostra status completo do hot-reload"
	@echo "  ${GREEN}troubleshoot-rabbitmq${RESET} - Diagnostica problemas com RabbitMQ"
	@echo "  ${GREEN}hotreload-guide${RESET} - ${BOLD}Mostra guia rápido de uso do hot-reload${RESET}"

# ==============================================================================
# GERENCIAMENTO DE CONTAINERS
# ==============================================================================

.PHONY: build
build: ## Constrói/recria as imagens dos serviços
	@echo "${GREEN}${BOLD}▶ Construindo imagens...${RESET}"
	${DOCKER_COMPOSE_DEV} build --no-cache

.PHONY: up
up: ## Inicia todos os serviços em background
	@echo "${GREEN}${BOLD}▶ Iniciando serviços...${RESET}"
	${DOCKER_COMPOSE_DEV} up -d --remove-orphans

.PHONY: stop
stop: ## Para os serviços sem remover containers
	@echo "${YELLOW}${BOLD}▶ Parando serviços...${RESET}"
	${DOCKER_COMPOSE_DEV} stop

.PHONY: down
down: stop ## Para e remove containers, redes e volumes
	@echo "${YELLOW}${BOLD}▶ Removendo containers...${RESET}"
	${DOCKER_COMPOSE_DEV} down --remove-orphans

.PHONY: restart
restart: down up ## Reinicia todos os serviços

.PHONY: logs
logs: ## Mostra logs dos serviços em tempo real
	${DOCKER_COMPOSE_DEV} logs -f --tail=100

.PHONY: status
status: ## Mostra o status dos containers
	@echo "${PURPLE}${BOLD}▶ Status dos containers:${RESET}"
	${DOCKER_COMPOSE_DEV} ps

.PHONY: clean
clean: ## Limpa TODO o ambiente (cuidado!)
	@printf "${RED}${BOLD}⚠️  ATENÇÃO: Isso removerá todos os containers, volumes, redes e imagens não utilizadas!${RESET}\n"
	@printf "Tem certeza que deseja continuar? [s/N] "
	@read REPLY; \
	case "$$REPLY" in \
		[Ss]*) \
			echo "${RED}▶ Limpando ambiente...${RESET}"; \
			${DOCKER_COMPOSE_DEV} down -v --rmi all --remove-orphans; \
			echo "${RED}▶ Removendo volumes não utilizados...${RESET}"; \
			docker volume prune -f; \
			echo "${RED}▶ Removendo imagens não utilizadas...${RESET}"; \
			docker image prune -f; \
			echo "${RED}▶ Removendo redes não utilizadas...${RESET}"; \
			docker network prune -f; \
			echo "${GREEN}✔ Ambiente limpo com sucesso!${RESET}"; \
			;; \
		*) \
			echo "${YELLOW}Operação cancelada pelo usuário.${RESET}"; \
			exit 0; \
	esac

# ==============================================================================
# GERENCIAMENTO DE SERVIÇOS INDIVIDUAIS
# ==============================================================================

# Uso: make <comando>-<serviço>
# Ex: make up-indexer, make logs-worker, make restart-api

# Comandos disponíveis para cada serviço
SERVICES = indexer worker api frontend postgres rabbitmq

# Define comandos para cada serviço
UP_SERVICES = $(addprefix up-,$(SERVICES))
DOWN_SERVICES = $(addprefix down-,$(SERVICES))
RESTART_SERVICES = $(addprefix restart-,$(SERVICES))
LOGS_SERVICES = $(addprefix logs-,$(SERVICES))
BUILD_SERVICES = $(addprefix build-,$(SERVICES))

# Gera os comandos dinamicamente
.PHONY: $(UP_SERVICES)
$(UP_SERVICES): up-%:
	@echo "${GREEN}▶ Iniciando serviço $*...${RESET}"
	${DOCKER_COMPOSE_DEV} up -d $*

.PHONY: $(DOWN_SERVICES)
$(DOWN_SERVICES): down-%:
	@echo "${YELLOW}▶ Parando serviço $*...${RESET}"
	${DOCKER_COMPOSE_DEV} stop $*

.PHONY: $(RESTART_SERVICES)
$(RESTART_SERVICES): restart-%:
	@echo "${YELLOW}▶ Reiniciando serviço $*...${RESET}"
	${DOCKER_COMPOSE_DEV} restart $*

.PHONY: $(LOGS_SERVICES)
$(LOGS_SERVICES): logs-%:
	@echo "${BLUE}▶ Mostrando logs do serviço $* (CTRL+C para sair)...${RESET}"
	${DOCKER_COMPOSE_DEV} logs -f $*

.PHONY: $(BUILD_SERVICES)
$(BUILD_SERVICES): build-%:
	@echo "${PURPLE}▶ Construindo serviço $*...${RESET}"
	${DOCKER_COMPOSE_DEV} build $*

# ==============================================================================
# BANCO DE DADOS
# ==============================================================================

.PHONY: db-reset
db-reset: ## Reseta completamente o banco de dados (cuidado!)
	@echo "${RED}${BOLD}⚠️  ATENÇÃO: Isso removerá TODOS os dados do banco!${RESET}"
	@read -p "Tem certeza que deseja continuar? [s/N] " -n 1 -r; \
	echo ""; \
	if [[ $$REPLY =~ ^[Ss]$$ ]]; then \
		echo "${RED}▶ Parando serviços...${RESET}"; \
		${DOCKER_COMPOSE_DEV} stop postgres; \
		echo "${RED}▶ Removendo volume do banco de dados...${RESET}"; \
		docker volume rm -f nxplorer_pgdata || true; \
		echo "${GREEN}✔ Banco de dados resetado com sucesso!${RESET}"; \
		echo "Execute 'make up' para recriar o banco."; \
	else \
		echo "${YELLOW}Operação cancelada pelo usuário.${RESET}"; \
	fi

.PHONY: db-shell
db-shell: ## Acessa o shell do banco de dados
	@echo "${GREEN}▶ Iniciando shell do PostgreSQL...${RESET}"
	${DOCKER_COMPOSE_DEV} exec postgres psql -U explorer -d blockexplorer

.PHONY: db-ddl
db-ddl: ## Executa o DDL completo do banco de dados
	@echo "${GREEN}${BOLD}▶ Executando DDL do banco de dados...${RESET}"
	@echo "${YELLOW}Aguardando PostgreSQL estar pronto...${RESET}"
	@until ${DOCKER_COMPOSE_DEV} exec postgres pg_isready -U explorer -d blockexplorer; do \
		echo "PostgreSQL não está pronto ainda..."; \
		sleep 2; \
	done
	@echo "${GREEN}Copiando DDL para o container...${RESET}"
	@docker cp database/ddl.sql besuscan-postgres:/tmp/ddl.sql
	@echo "${GREEN}Executando DDL completo...${RESET}"
	@${DOCKER_COMPOSE_DEV} exec postgres psql -U explorer -d blockexplorer -f /tmp/ddl.sql
	@echo "${GREEN}✅ DDL executado com sucesso!${RESET}"

# ==============================================================================
# DESENVOLVIMENTO
# ==============================================================================

.PHONY: test
test: ## Executa os testes automatizados
	@echo "${GREEN}${BOLD}▶ Executando testes...${RESET}"
	@echo "${YELLOW}Testes do Indexer:${RESET}"
	@cd apps/indexer && go test -v -race -coverprofile=coverage.out ./...
	@echo "\n${YELLOW}Testes do Worker:${RESET}"
	@cd apps/worker && go test -v -race -coverprofile=coverage.out ./...

.PHONY: lint
lint: ## Executa análise estática do código
	@echo "${GREEN}${BOLD}▶ Executando análise estática...${RESET}"
	@if ! command -v staticcheck >/dev/null; then \
		echo "${YELLOW}Instalando staticcheck...${RESET}"; \
		go install honnef.co/go/tools/cmd/staticcheck@latest; \
	fi
	@echo "${YELLOW}Verificando Indexer:${RESET}"
	@cd apps/indexer && staticcheck -f stylish ./...
	@echo "\n${YELLOW}Verificando Worker:${RESET}"
	@cd apps/worker && staticcheck -f stylish ./...

.PHONY: format
format: ## Formata o código automaticamente
	@echo "${GREEN}${BOLD}▶ Formatando código...${RESET}"
	@find . -name '*.go' -not -path '*/vendor/*' -exec gofmt -s -w {} \;

# ==============================================================================
# ESCALONAMENTO
# ==============================================================================

.PHONY: scale-%
scale-%: ## Escala um serviço específico (use NUM=X)
	@if [ -z "${NUM}" ]; then \
		echo "${RED}❌ Erro: Especifique o número de instâncias com NUM=X${RESET}"; \
		echo "Ex: ${YELLOW}make scale-worker NUM=3${RESET}"; \
		exit 1; \
	fi
	@echo "${GREEN}▶ Escalando serviço $* para ${NUM} instâncias...${RESET}"
	${DOCKER_COMPOSE_DEV} up -d --no-deps --scale $*=${NUM} --no-recreate

# ==============================================================================
# AJUDA DETALHADA
# ==============================================================================

# Gera ajuda detalhada para cada comando
help-%:
	@case "$*" in \
		help) echo "\n  Mostra esta ajuda" ;;
		build) echo "\n  Constrói ou reconstrói as imagens Docker dos serviços" ;;
		up) echo "\n  Inicia todos os serviços em segundo plano" ;;
		up-*) echo "\n  Inicia o serviço específico (ex: up-indexer, up-worker, up-api)" ;;
		down-*) echo "\n  Para o serviço específico (ex: down-indexer, down-worker)" ;;
		restart-*) echo "\n  Reinicia o serviço específico (ex: restart-indexer, restart-api)" ;;
		logs-*) echo "\n  Mostra os logs em tempo real do serviço específico (ex: logs-worker, logs-postgres)" ;;
		build-*) echo "\n  Reconstrói a imagem de um serviço específico (ex: build-indexer, build-api)" ;;
		down) echo "\n  Para e remove containers, redes e volumes" ;;
		restart) echo "\n  Reinicia todos os serviços" ;;
		logs) echo "\n  Mostra logs em tempo real (use CTRL+C para sair)" ;;
		clean) echo "\n  ${RED}Remove TODOS os containers, volumes, redes e imagens não utilizadas${RESET}" ;;
		test) echo "\n  Executa os testes automatizados com verificação de race conditions" ;;
		lint) echo "\n  Executa análise estática do código com staticcheck" ;;
		format) echo "\n  Formata automaticamente o código Go" ;;
		db-reset) echo "\n  ${RED}Remove completamente o volume do banco de dados${RESET}" ;;
		db-shell) echo "\n  Acessa o shell interativo do PostgreSQL" ;;
		scale-*) echo "\n  Escala um serviço específico. Ex: make scale-worker NUM=3" ;;
		migrate) echo "\n  Executa as migrations do banco de dados" ;;
		migrate-transactions) echo "\n  Executa apenas a migração de atualização de transações (006_update_transactions_table.sql)" ;;
		sync-from) echo "\n  Sincroniza a partir de um bloco específico (use BLOCK=número)" ;;
		sync-latest) echo "\n  Sincroniza a partir do último bloco da rede" ;;
		sync-status) echo "\n  Mostra o status de sincronização atual" ;;
		sync-test) echo "\n  Testa com blocos que contêm transações conhecidas" ;;
		sync-reset) echo "\n  ${RED}Reseta e reprocessa tudo do zero${RESET}" ;;
		contract-deploy) echo "\n  Deploy do contrato Counter básico usando Foundry" ;;
		contract-build) echo "\n  Compila todos os contratos usando Foundry" ;;
		contract-test) echo "\n  Executa testes dos contratos usando Foundry" ;;
		contract-clean) echo "\n  Limpa artefatos de compilação dos contratos" ;;
		contract-interact) echo "\n  Interage com Counter (increment + setNumber)" ;;
		contract-interact-fuzzy) echo "\n  Envia 5 transações de incremento para teste" ;;
		contract-interact-multi) echo "\n  Envia N transações de incremento (use COUNT=número)" ;;
		contract-check-env) echo "\n  Verifica se as variáveis de ambiente dos contratos estão configuradas" ;;
		contract-status) echo "\n  Mostra status completo dos contratos" ;;
		deploy-token) echo "\n  Deploy de um token ERC20 personalizado (use NAME=nome TOKEN_SYMBOL=símbolo)" ;;
		deploy-nft) echo "\n  Deploy de uma coleção NFT (use COLLECTION_NAME=nome COLLECTION_SYMBOL=símbolo)" ;;
		deploy-multisig) echo "\n  Deploy de carteira multisig (use OWNERS=addr1,addr2,addr3 THRESHOLD=2)" ;;
		deploy-custom) echo "\n  Deploy de contrato personalizado (use CONTRACT=path/Contract.sol:ContractName ARGS="arg1 arg2")" ;;
		deploy-all-examples) echo "\n  Deploy de todos os contratos de exemplo" ;;
		verify-contract) echo "\n  Verifica um contrato já deployado (use ADDRESS=0x... CONTRACT=path/Contract.sol:ContractName)" ;;
		list-deployments) echo "\n  Lista todos os deployments recentes" ;;
		deployment-info) echo "\n  Mostra informações detalhadas de um deployment (use TX_HASH=0x...)" ;;
		set-mainnet) echo "\n  Configura para deploy na mainnet" ;;
		set-testnet) echo "\n  Configura para deploy na testnet" ;;
		set-local) echo "\n  Configura para deploy local (padrão)" ;;
		check-balance) echo "\n  Verifica saldo da carteira de deploy" ;;
		estimate-gas) echo "\n  Estima gas para deploy de um contrato (use CONTRACT=path/Contract.sol:ContractName)" ;;
		dev-worker) echo "\n  Inicia worker com hot-reload (Air)" ;;
		dev-indexer) echo "\n  Inicia indexer com hot-reload (Air)" ;;
		check-consumers) echo "\n  Verifica consumidores RabbitMQ ativos" ;;
		check-queues) echo "\n  Verifica status das filas RabbitMQ" ;;
		kill-consumers) echo "\n  ${RED}Força fechamento de conexões RabbitMQ${RESET}" ;;
		monitor-rabbitmq) echo "\n  Monitora RabbitMQ em tempo real" ;;
		clean-hotreload) echo "\n  Limpa arquivos temporários do hot-reload" ;;
		rabbitmq-health) echo "\n  Verifica saúde do RabbitMQ" ;;
		hotreload-status) echo "\n  Mostra status completo do ambiente hot-reload" ;;
		dev-setup) echo "\n  Configura ambiente para desenvolvimento com hot-reload" ;;
		dev-stop) echo "\n  Para todos os processos de desenvolvimento" ;;
		dev-full) echo "\n  Inicia ambiente completo de desenvolvimento" ;;
		dev-restart) echo "\n  Reinicia ambiente de desenvolvimento" ;;
		troubleshoot-rabbitmq) echo "\n  Diagnostica problemas com RabbitMQ" ;;
		hotreload-guide) echo "\n  Mostra guia rápido de uso do hot-reload" ;;
		*) make help ;;
	esac
	@echo ""

# ==============================================================================
# FERRAMENTAS DE DESENVOLVIMENTO
# ==============================================================================

.PHONY: install-tools
install-tools: ## Instala ferramentas de desenvolvimento necessárias
	@echo "${GREEN}${BOLD}▶ Instalando ferramentas de desenvolvimento...${RESET}"
	go install github.com/air-verse/air@latest
	go install honnef.co/go/tools/cmd/staticcheck@latest
	go install golang.org/x/tools/cmd/goimports@latest

.PHONY: update-deps
update-deps: ## Atualiza as dependências do projeto
	@echo "${GREEN}${BOLD}▶ Atualizando dependências...${RESET}"
	@echo "${YELLOW}Atualizando Indexer:${RESET}"
	@cd apps/indexer && go get -u ./... && go mod tidy
	@echo "\n${YELLOW}Atualizando Worker:${RESET}"
	@cd apps/worker && go get -u ./... && go mod tidy

# ==============================================================================
# INICIALIZAÇÃO DO AMBIENTE
# ==============================================================================

.PHONY: init
init: install-tools up ## Inicializa o ambiente de desenvolvimento
	@echo "\n${GREEN}${BOLD}✅ Ambiente de desenvolvimento inicializado!${RESET}\n"
	@echo "${YELLOW}Serviços disponíveis:${RESET}"
	@echo "  • ${GREEN}Frontend${RESET}: ${UNDERLINE}http://localhost:3000${RESET}"
	@echo "  • ${GREEN}RabbitMQ Management${RESET}: ${UNDERLINE}http://localhost:15673${RESET} (guest/guest)"
	@echo "  • ${GREEN}PostgreSQL${RESET}: psql -h localhost -p 5433 -U explorer -d blockexplorer"
	@echo "  • ${GREEN}API${RESET}: http://localhost:8080"

# ==============================================================================
# COMANDOS ÚTEIS
# ==============================================================================

.PHONY: shell-%
shell-%: ## Acessa o terminal de um container específico
	@echo "${GREEN}▶ Conectando ao container $*...${RESET}"
	${DOCKER_COMPOSE_DEV} exec $* sh -c "[ -x /bin/bash ] && /bin/bash || /bin/sh"

.PHONY: logs-%
logs-%: ## Monitora os logs de um serviço específico
	@echo "${GREEN}▶ Monitorando logs do serviço $*...${RESET} (Ctrl+C para sair)"
	${DOCKER_COMPOSE_DEV} logs -f $*

# ==============================================================================
# FIM DO ARQUIVO
# ==============================================================================

# Comando padrão
.DEFAULT_GOAL := help

.PHONY: deps-ui
deps-ui: ## Instala as dependências do frontend usando yarn
	@echo "${GREEN}${BOLD}▶ Instalando dependências do frontend...${RESET}"
	@cd apps/frontend && yarn install

.PHONY: migrate
migrate: ## Executa as migrations do banco de dados
	@echo "${GREEN}${BOLD}▶ Executando migrations...${RESET}"
	@echo "${YELLOW}Aguardando PostgreSQL estar pronto...${RESET}"
	@until ${DOCKER_COMPOSE_DEV} exec postgres pg_isready -U explorer -d blockexplorer; do \
		echo "PostgreSQL não está pronto ainda..."; \
		sleep 2; \
	done
	@echo "${GREEN}Executando migration de blocos...${RESET}"
	@${DOCKER_COMPOSE_DEV} exec postgres psql -U explorer -d blockexplorer -f /tmp/001_create_blocks_table.sql || true
	@echo "${GREEN}Executando migration de transações...${RESET}"
	@${DOCKER_COMPOSE_DEV} exec postgres psql -U explorer -d blockexplorer -f /tmp/002_create_transactions_table.sql || true
	@echo "${GREEN}Executando migration de campos adicionais...${RESET}"
	@${DOCKER_COMPOSE_DEV} exec postgres psql -U explorer -d blockexplorer -f /tmp/003_add_missing_block_fields.sql || true
	@echo "${GREEN}Executando migration de atualização de transações...${RESET}"
	@${DOCKER_COMPOSE_DEV} exec postgres psql -U explorer -d blockexplorer -f /tmp/006_update_transactions_table.sql || true

.PHONY: migrate-copy
migrate-copy: ## Copia as migrations para o container PostgreSQL
	@echo "${GREEN}${BOLD}▶ Copiando migrations para o container...${RESET}"
	@docker cp apps/indexer/migrations/001_create_blocks_table.sql besuscan-postgres:/tmp/ || true
	@docker cp apps/indexer/migrations/002_create_transactions_table.sql besuscan-postgres:/tmp/ || true
	@docker cp apps/indexer/migrations/003_add_missing_block_fields.sql besuscan-postgres:/tmp/ || true
	@docker cp apps/indexer/migrations/006_update_transactions_table.sql besuscan-postgres:/tmp/ || true

.PHONY: setup-db
setup-db: migrate-copy migrate ## Configura o banco de dados com as migrations
	@echo "${GREEN}✅ Banco de dados configurado com sucesso!${RESET}"

.PHONY: check-services
check-services: ## Verifica o status dos serviços essenciais
	@echo "${GREEN}${BOLD}▶ Verificando serviços...${RESET}"
	@echo "${YELLOW}PostgreSQL:${RESET}"
	@${DOCKER_COMPOSE_DEV} exec postgres pg_isready -U explorer -d blockexplorer || echo "${RED}PostgreSQL não está pronto${RESET}"
	@echo "${YELLOW}RabbitMQ:${RESET}"
	@curl -s -u guest:guest http://localhost:15673/api/overview > /dev/null && echo "${GREEN}RabbitMQ OK${RESET}" || echo "${RED}RabbitMQ não está acessível${RESET}"
	@echo "${YELLOW}Containers:${RESET}"
	@${DOCKER_COMPOSE_DEV} ps

.PHONY: logs-all
logs-all: ## Mostra logs de todos os serviços
	@echo "${GREEN}${BOLD}▶ Mostrando logs de todos os serviços...${RESET}"
	${DOCKER_COMPOSE_DEV} logs -f --tail=50

.PHONY: quick-start
quick-start: ## Inicia rapidamente onde paramos (sem rebuild)
	@echo "${GREEN}${BOLD}▶ Iniciando serviços rapidamente...${RESET}"
	${DOCKER_COMPOSE_DEV} up -d
	@echo "${GREEN}✅ Serviços iniciados!${RESET}"
	@echo "\n${YELLOW}Aguarde alguns segundos e execute:${RESET}"
	@echo "  ${GREEN}make check-services${RESET} - para verificar se tudo está funcionando"
	@echo "  ${GREEN}make logs-worker${RESET} - para ver logs do worker"
	@echo "  ${GREEN}make logs-indexer${RESET} - para ver logs do indexer"

.PHONY: full-restart
full-restart: down build up setup-db ## Reinicia completamente o ambiente
	@echo "${GREEN}${BOLD}✅ Ambiente completamente reiniciado!${RESET}"

.PHONY: dev-status
dev-status: ## Mostra status detalhado do ambiente de desenvolvimento
	@echo "${GREEN}${BOLD}▶ Status do Ambiente de Desenvolvimento${RESET}\n"
	@echo "${YELLOW}Containers:${RESET}"
	@${DOCKER_COMPOSE_DEV} ps
	@echo "\n${YELLOW}Serviços Web:${RESET}"
	@echo "  • ${GREEN}Frontend${RESET}: ${UNDERLINE}http://localhost:3000${RESET}"
	@echo "  • ${GREEN}API${RESET}: ${UNDERLINE}http://localhost:8080${RESET}"
	@echo "  • ${GREEN}RabbitMQ Management${RESET}: ${UNDERLINE}http://localhost:15673${RESET} (guest/guest)"
	@echo "\n${YELLOW}Banco de Dados:${RESET}"
	@echo "  • ${GREEN}PostgreSQL${RESET}: localhost:5433 (explorer/explorer)"
	@echo "  • Comando: ${GREEN}psql -h localhost -p 5433 -U explorer -d blockexplorer${RESET}"

.PHONY: migrate-transactions
migrate-transactions: ## Executa apenas a migração de atualização de transações
	@echo "${GREEN}${BOLD}▶ Executando migração de transações...${RESET}"
	@echo "${YELLOW}Aguardando PostgreSQL estar pronto...${RESET}"
	@until ${DOCKER_COMPOSE_DEV} exec postgres pg_isready -U explorer -d blockexplorer; do \
		echo "PostgreSQL não está pronto ainda..."; \
		sleep 2; \
	done
	@echo "${GREEN}Copiando migração de transações...${RESET}"
	@docker cp apps/indexer/migrations/006_update_transactions_table.sql besuscan-postgres:/tmp/ || true
	@echo "${GREEN}Executando migração de atualização de transações...${RESET}"
	@${DOCKER_COMPOSE_DEV} exec postgres psql -U explorer -d blockexplorer -f /tmp/006_update_transactions_table.sql || true
	@echo "${GREEN}✅ Migração de transações concluída!${RESET}"

# ==============================================================================
# SINCRONIZAÇÃO DE BLOCOS
# ==============================================================================

.PHONY: sync-from
sync-from: ## Sincroniza a partir de um bloco específico (use BLOCK=número)
	@if [ -z "$(BLOCK)" ]; then \
		echo "${RED}❌ Erro: Especifique o bloco com BLOCK=número${RESET}"; \
		echo "${YELLOW}Exemplo: make sync-from BLOCK=392700${RESET}"; \
		exit 1; \
	fi
	@echo "${GREEN}🎯 Configurando sincronização a partir do bloco $(BLOCK)...${RESET}"
	@sed -i 's/STARTING_BLOCK=.*/STARTING_BLOCK=$(BLOCK)/' docker-compose.dev.yml
	@echo "${GREEN}✅ Configuração atualizada! Reiniciando serviços...${RESET}"
	@make restart-indexer restart-worker
	@echo "${GREEN}🚀 Sistema sincronizado a partir do bloco $(BLOCK)${RESET}"

.PHONY: sync-latest
sync-latest: ## Sincroniza a partir do último bloco (padrão)
	@echo "${GREEN}🔄 Configurando para usar o último bloco da rede...${RESET}"
	@sed -i 's/STARTING_BLOCK=.*/STARTING_BLOCK=/' docker-compose.dev.yml
	@echo "${GREEN}✅ Configuração atualizada! Reiniciando serviços...${RESET}"
	@make restart-indexer restart-worker
	@echo "${GREEN}🚀 Sistema configurado para usar o último bloco${RESET}"

.PHONY: sync-status
sync-status: ## Mostra o status de sincronização atual
	@echo "${PURPLE}📊 Status de Sincronização:${RESET}"
	@echo ""
	@echo "${YELLOW}Configuração atual:${RESET}"
	@grep "STARTING_BLOCK=" docker-compose.dev.yml | head -1 | sed 's/.*STARTING_BLOCK=/  Bloco inicial: /' || echo "  Bloco inicial: último da rede"
	@echo ""
	@echo "${YELLOW}Último bloco processado pelo indexer:${RESET}"
	@docker logs explorer-indexer-dev --tail 5 2>/dev/null | grep -o "Bloco [0-9]*" | tail -1 | sed 's/Bloco /  Indexer: /' || echo "  Indexer: não encontrado"
	@echo ""
	@echo "${YELLOW}Último bloco processado pelo worker:${RESET}"
	@docker logs explorer-worker-dev --tail 5 2>/dev/null | grep -o "bloco [0-9]*" | tail -1 | sed 's/bloco /  Worker: /' || echo "  Worker: não encontrado"

.PHONY: sync-test
sync-test: ## Testa sincronização com blocos que têm transações conhecidas
	@echo "${GREEN}🧪 Configurando teste com blocos que contêm transações...${RESET}"
	@echo "${YELLOW}Usando bloco 392697 (contém transações de teste)${RESET}"
	@make sync-from BLOCK=392697
	@echo "${GREEN}✅ Teste configurado! Monitore os logs:${RESET}"
	@echo "${YELLOW}  make logs-indexer${RESET}"
	@echo "${YELLOW}  make logs-worker${RESET}"

.PHONY: sync-reset
sync-reset: ## Reseta sincronização e reprocessa tudo do zero
	@echo "${RED}${BOLD}⚠️  ATENÇÃO: Isso reprocessará TODOS os blocos desde o início!${RESET}"
	@printf "Tem certeza que deseja continuar? [s/N] "
	@read REPLY; \
	case "$$REPLY" in \
		[Ss]*) \
			echo "${RED}▶ Resetando sincronização...${RESET}"; \
			make db-reset; \
			make sync-latest; \
			echo "${GREEN}✔ Sincronização resetada com sucesso!${RESET}"; \
			;; \
		*) \
			echo "${YELLOW}Operação cancelada pelo usuário.${RESET}"; \
			exit 0; \
	esac

# ==============================================================================
# DEPLOY DE CONTRATOS
# ==============================================================================

# ==============================================================================
# COMANDOS DE CONTRATOS (FOUNDRY)
# ==============================================================================

# Variáveis para contratos (podem ser sobrescritas)
CONTRACT_RPC_URL ?= http://144.22.179.183
CONTRACT_PRIVATE_KEY ?= $(shell cd apps/contract && grep PRIVATE_KEY .env 2>/dev/null | cut -d '=' -f2)

.PHONY: contract-deploy
contract-deploy: ## Deploy do contrato Counter básico
	@echo "${GREEN}🚀 Fazendo deploy do contrato Counter...${RESET}"
	@cd apps/contract && make deploy RPC_URL=$(CONTRACT_RPC_URL) PRIVATE_KEY=$(CONTRACT_PRIVATE_KEY)
	@echo "${GREEN}✅ Counter deployado com sucesso!${RESET}"

.PHONY: contract-build
contract-build: ## Compila os contratos
	@echo "${GREEN}🔨 Compilando contratos...${RESET}"
	@cd apps/contract && make build

.PHONY: contract-test
contract-test: ## Executa testes dos contratos
	@echo "${GREEN}🧪 Executando testes dos contratos...${RESET}"
	@cd apps/contract && make test

.PHONY: contract-clean
contract-clean: ## Limpa artefatos de compilação dos contratos
	@echo "${GREEN}🧹 Limpando artefatos dos contratos...${RESET}"
	@cd apps/contract && make clean

.PHONY: contract-interact
contract-interact: ## Interage com Counter (increment + setNumber)
	@echo "${GREEN}🎮 Interagindo com Counter...${RESET}"
	@cd apps/contract && make interact RPC_URL=$(CONTRACT_RPC_URL) PRIVATE_KEY=$(CONTRACT_PRIVATE_KEY)

.PHONY: contract-interact-fuzzy
contract-interact-fuzzy: ## Envia 5 transações de incremento
	@echo "${GREEN}🎯 Enviando 5 transações de incremento...${RESET}"
	@cd apps/contract && make interact-fuzzy RPC_URL=$(CONTRACT_RPC_URL) PRIVATE_KEY=$(CONTRACT_PRIVATE_KEY)

.PHONY: contract-interact-multi
contract-interact-multi: ## Envia N transações de incremento (use COUNT=número)
	@echo "${GREEN}🔄 Enviando múltiplas transações...${RESET}"
	@cd apps/contract && make interact-multi COUNT=$(COUNT) RPC_URL=$(CONTRACT_RPC_URL) PRIVATE_KEY=$(CONTRACT_PRIVATE_KEY)

.PHONY: contract-check-env
contract-check-env: ## Verifica configuração de ambiente dos contratos
	@echo "${GREEN}🔍 Verificando configuração dos contratos...${RESET}"
	@echo "${YELLOW}Configuração atual:${RESET}"
	@echo "  RPC_URL: ${GREEN}$(CONTRACT_RPC_URL)${RESET}"
	@echo "  PRIVATE_KEY: ${GREEN}$(if $(CONTRACT_PRIVATE_KEY),configurada,não configurada)${RESET}"
	@cd apps/contract && make check-env

.PHONY: contract-status
contract-status: ## Mostra status completo dos contratos
	@echo "${GREEN}${BOLD}▶ Status dos Contratos${RESET}\n"
	@echo "${YELLOW}Configuração:${RESET}"
	@echo "  • RPC_URL: ${GREEN}$(CONTRACT_RPC_URL)${RESET}"
	@echo "  • PRIVATE_KEY: ${GREEN}$(if $(CONTRACT_PRIVATE_KEY),✅ configurada,❌ não configurada)${RESET}"
	@echo "\n${YELLOW}Comandos disponíveis:${RESET}"
	@echo "  • ${GREEN}make contract-deploy${RESET}     - Deploy Counter"
	@echo "  • ${GREEN}make contract-interact${RESET}   - Interagir com Counter"
	@echo "  • ${GREEN}make contract-build${RESET}      - Compilar contratos"
	@echo "  • ${GREEN}make contract-test${RESET}       - Executar testes"

.PHONY: deploy-token
deploy-token: ## Deploy de um token ERC20 personalizado (use NAME=nome TOKEN_SYMBOL=símbolo)
	@if [ -z "$(NAME)" ] || [ -z "$(TOKEN_SYMBOL)" ]; then \
		echo "${RED}❌ Erro: Especifique NAME e TOKEN_SYMBOL${RESET}"; \
		echo "${YELLOW}Exemplo: make deploy-token NAME=\"MyToken\" TOKEN_SYMBOL=\"MTK\"${RESET}"; \
		exit 1; \
	fi
	@echo "${GREEN}🪙 Fazendo deploy do token $(NAME) ($(TOKEN_SYMBOL))...${RESET}"
	@cd apps/contract && TOKEN_NAME="$(NAME)" TOKEN_SYMBOL="$(TOKEN_SYMBOL)" forge script script/DeployToken.s.sol:DeployTokenScript \
		--rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY) --broadcast --legacy --gas-price 0
	@echo "${GREEN}✅ Token $(NAME) deployado com sucesso!${RESET}"

.PHONY: deploy-nft
deploy-nft: ## Deploy de uma coleção NFT (use COLLECTION_NAME=nome COLLECTION_SYMBOL=símbolo)
	@if [ -z "$(COLLECTION_NAME)" ] || [ -z "$(COLLECTION_SYMBOL)" ]; then \
		echo "${RED}❌ Erro: Especifique COLLECTION_NAME e COLLECTION_SYMBOL${RESET}"; \
		echo "${YELLOW}Exemplo: make deploy-nft COLLECTION_NAME=\"MyNFTs\" COLLECTION_SYMBOL=\"MNFT\"${RESET}"; \
		exit 1; \
	fi
	@echo "${GREEN}🖼️ Fazendo deploy da coleção NFT $(COLLECTION_NAME) ($(COLLECTION_SYMBOL))...${RESET}"
	@cd apps/contract && COLLECTION_NAME="$(COLLECTION_NAME)" COLLECTION_SYMBOL="$(COLLECTION_SYMBOL)" forge script script/DeployNFT.s.sol:DeployNFTScript \
		--rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY) --broadcast --legacy --gas-price 0
	@echo "${GREEN}✅ Coleção NFT $(COLLECTION_NAME) deployada com sucesso!${RESET}"

.PHONY: deploy-multisig
deploy-multisig: ## Deploy de carteira multisig (use OWNERS=addr1,addr2,addr3 THRESHOLD=2)
	@if [ -z "$(OWNERS)" ] || [ -z "$(THRESHOLD)" ]; then \
		echo "${RED}❌ Erro: Especifique OWNERS e THRESHOLD${RESET}"; \
		echo "${YELLOW}Exemplo: make deploy-multisig OWNERS=\"0x123...,0x456...,0x789...\" THRESHOLD=2${RESET}"; \
		exit 1; \
	fi
	@echo "${GREEN}🔐 Fazendo deploy da carteira multisig ($(THRESHOLD) de $(shell echo $(OWNERS) | tr ',' '\n' | wc -l))...${RESET}"
	@cd apps/contract && PRIVATE_KEY=$(PRIVATE_KEY) forge create src/multisig/MultiSigWallet.sol:MultiSigWallet \
		--constructor-args "[$(OWNERS)]" $(THRESHOLD) \
		--rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY)
	@echo "${GREEN}✅ Carteira multisig deployada com sucesso!${RESET}"

.PHONY: deploy-custom
deploy-custom: ## Deploy de contrato personalizado (use CONTRACT=path/Contract.sol:ContractName ARGS="arg1 arg2")
	@if [ -z "$(CONTRACT)" ]; then \
		echo "${RED}❌ Erro: Especifique CONTRACT${RESET}"; \
		echo "${YELLOW}Exemplo: make deploy-custom CONTRACT=\"src/MyContract.sol:MyContract\" ARGS=\"\\\"Hello\\\" 123\"${RESET}"; \
		exit 1; \
	fi
	@echo "${GREEN}⚙️ Fazendo deploy do contrato personalizado $(CONTRACT)...${RESET}"
	@if [ -n "$(ARGS)" ]; then \
		cd apps/contract && PRIVATE_KEY=$(PRIVATE_KEY) forge create $(CONTRACT) \
			--constructor-args $(ARGS) \
			--rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY); \
	else \
		cd apps/contract && PRIVATE_KEY=$(PRIVATE_KEY) forge create $(CONTRACT) \
			--rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY); \
	fi
	@echo "${GREEN}✅ Contrato personalizado deployado com sucesso!${RESET}"

.PHONY: deploy-all-examples
deploy-all-examples: ## Deploy de todos os contratos de exemplo
	@echo "${GREEN}🚀 Fazendo deploy de todos os contratos de exemplo...${RESET}"
	@make deploy-counter
	@make deploy-fuzzy
	@make deploy-token NAME="ExampleToken" TOKEN_SYMBOL="EXT"
	@make deploy-nft COLLECTION_NAME="ExampleNFTs" COLLECTION_SYMBOL="ENFT"
	@echo "${GREEN}✅ Todos os contratos de exemplo deployados!${RESET}"

.PHONY: verify-contract
verify-contract: ## Verifica um contrato já deployado (use ADDRESS=0x... CONTRACT=path/Contract.sol:ContractName)
	@if [ -z "$(ADDRESS)" ] || [ -z "$(CONTRACT)" ]; then \
		echo "${RED}❌ Erro: Especifique ADDRESS e CONTRACT${RESET}"; \
		echo "${YELLOW}Exemplo: make verify-contract ADDRESS=\"0x123...\" CONTRACT=\"src/Counter.sol:Counter\"${RESET}"; \
		exit 1; \
	fi
	@echo "${GREEN}🔍 Verificando contrato $(CONTRACT) no endereço $(ADDRESS)...${RESET}"
	@cd apps/contract && forge verify-contract $(ADDRESS) $(CONTRACT) --rpc-url $(RPC_URL)
	@echo "${GREEN}✅ Contrato verificado com sucesso!${RESET}"

.PHONY: list-deployments
list-deployments: ## Lista todos os deployments recentes
	@echo "${PURPLE}📋 Deployments recentes:${RESET}"
	@cd apps/contract && find broadcast -name "*.json" -type f -exec echo "📄 {}" \; -exec jq -r '.transactions[] | select(.transactionType == "CREATE") | "  🏗️  Contrato: \(.contractName // "Unknown") | Endereço: \(.contractAddress) | Hash: \(.hash)"' {} \; 2>/dev/null | head -20

.PHONY: deployment-info
deployment-info: ## Mostra informações detalhadas de um deployment (use TX_HASH=0x...)
	@if [ -z "$(TX_HASH)" ]; then \
		echo "${RED}❌ Erro: Especifique TX_HASH${RESET}"; \
		echo "${YELLOW}Exemplo: make deployment-info TX_HASH=\"0x123...\"${RESET}"; \
		exit 1; \
	fi
	@echo "${PURPLE}📊 Informações do deployment $(TX_HASH):${RESET}"
	@cd apps/contract && cast receipt $(TX_HASH) --rpc-url $(RPC_URL)

# ==============================================================================
# CONFIGURAÇÕES DE DEPLOY
# ==============================================================================

# Configurações padrão (podem ser sobrescritas)
RPC_URL ?= http://144.22.179.183
PRIVATE_KEY ?= 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Atualiza as variáveis de contrato quando mudamos a configuração
.PHONY: update-contract-config
update-contract-config:
	$(eval CONTRACT_RPC_URL := $(RPC_URL))
	$(eval CONTRACT_PRIVATE_KEY := $(PRIVATE_KEY))

.PHONY: set-mainnet
set-mainnet: update-contract-config ## Configura para deploy na mainnet
	$(eval RPC_URL := https://mainnet.infura.io/v3/YOUR_INFURA_KEY)
	$(eval CONTRACT_RPC_URL := $(RPC_URL))
	@echo "${YELLOW}⚠️ Configurado para MAINNET - Cuidado com gas fees!${RESET}"

.PHONY: set-testnet
set-testnet: update-contract-config ## Configura para deploy na testnet
	$(eval RPC_URL := https://goerli.infura.io/v3/YOUR_INFURA_KEY)
	$(eval CONTRACT_RPC_URL := $(RPC_URL))
	@echo "${GREEN}✅ Configurado para TESTNET${RESET}"

.PHONY: set-local
set-local: update-contract-config ## Configura para deploy local (padrão)
	$(eval RPC_URL := http://144.22.179.183)
	$(eval CONTRACT_RPC_URL := $(RPC_URL))
	@echo "${GREEN}✅ Configurado para rede LOCAL${RESET}"

.PHONY: check-balance
check-balance: ## Verifica saldo da carteira de deploy
	@echo "${PURPLE}💰 Saldo da carteira de deploy:${RESET}"
	@cd apps/contract && cast balance $(shell cd apps/contract && cast wallet address --private-key $(PRIVATE_KEY)) --rpc-url $(RPC_URL) --ether

.PHONY: estimate-gas
estimate-gas: ## Estima gas para deploy de um contrato (use CONTRACT=path/Contract.sol:ContractName)
	@if [ -z "$(CONTRACT)" ]; then \
		echo "${RED}❌ Erro: Especifique CONTRACT${RESET}"; \
		echo "${YELLOW}Exemplo: make estimate-gas CONTRACT=\"src/Counter.sol:Counter\"${RESET}"; \
		exit 1; \
	fi
	@echo "${PURPLE}⛽ Estimando gas para $(CONTRACT)...${RESET}"
	@cd apps/contract && forge create $(CONTRACT) --rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY) --estimate-gas-only

# ==============================================================================
# INTERAÇÃO COM CONTRATOS
# ==============================================================================

# ==============================================================================
# HOT-RELOAD E MONITORAMENTO RABBITMQ
# ==============================================================================

.PHONY: dev-worker
dev-worker: ## Inicia worker com hot-reload (Air)
	@echo "${GREEN}${BOLD}▶ Iniciando Worker com hot-reload...${RESET}"
	@echo "${YELLOW}Pressione Ctrl+C para parar${RESET}"
	@cd apps/worker && make dev

.PHONY: dev-indexer
dev-indexer: ## Inicia indexer com hot-reload (Air)
	@echo "${GREEN}${BOLD}▶ Iniciando Indexer com hot-reload...${RESET}"
	@echo "${YELLOW}Pressione Ctrl+C para parar${RESET}"
	@cd apps/indexer && make dev

.PHONY: check-consumers
check-consumers: ## Verifica consumidores RabbitMQ ativos
	@echo "${GREEN}${BOLD}▶ Verificando consumidores RabbitMQ...${RESET}"
	@cd apps/worker && make check-consumers

.PHONY: check-queues
check-queues: ## Verifica status das filas RabbitMQ
	@echo "${GREEN}${BOLD}▶ Verificando status das filas...${RESET}"
	@cd apps/indexer && make check-queues

.PHONY: kill-consumers
kill-consumers: ## Força fechamento de conexões RabbitMQ (emergência)
	@echo "${RED}${BOLD}⚠️  ATENÇÃO: Isso fechará TODAS as conexões RabbitMQ!${RESET}"
	@printf "Tem certeza que deseja continuar? [s/N] "
	@read REPLY; \
	case "$$REPLY" in \
		[Ss]*) \
			echo "${RED}▶ Forçando fechamento de conexões...${RESET}"; \
			cd apps/worker && make kill-consumers; \
			echo "${GREEN}✔ Comando executado!${RESET}"; \
			;; \
		*) \
			echo "${YELLOW}Operação cancelada pelo usuário.${RESET}"; \
			exit 0; \
	esac

.PHONY: monitor-rabbitmq
monitor-rabbitmq: ## Monitora RabbitMQ em tempo real
	@echo "${GREEN}${BOLD}▶ Monitorando RabbitMQ em tempo real...${RESET}"
	@echo "${YELLOW}Pressione Ctrl+C para parar${RESET}"
	@cd apps/indexer && make monitor

.PHONY: clean-hotreload
clean-hotreload: ## Limpa arquivos temporários do hot-reload
	@echo "${GREEN}${BOLD}▶ Limpando arquivos temporários do hot-reload...${RESET}"
	@echo "${YELLOW}Worker:${RESET}"
	@cd apps/worker && make clean
	@echo "${YELLOW}Indexer:${RESET}"
	@cd apps/indexer && make clean
	@echo "${GREEN}✅ Limpeza concluída!${RESET}"

.PHONY: rabbitmq-health
rabbitmq-health: ## Verifica saúde do RabbitMQ
	@echo "${GREEN}${BOLD}▶ Verificando saúde do RabbitMQ...${RESET}"
	@echo "${YELLOW}Worker perspective:${RESET}"
	@cd apps/worker && make health
	@echo "\n${YELLOW}Indexer perspective:${RESET}"
	@cd apps/indexer && make health

.PHONY: hotreload-status
hotreload-status: ## Mostra status completo do ambiente hot-reload
	@echo "${GREEN}${BOLD}▶ Status do Ambiente Hot-Reload${RESET}\n"
	@echo "${YELLOW}Processos Air ativos:${RESET}"
	@ps aux | grep -E "(air|worker|indexer)" | grep -v grep || echo "  Nenhum processo Air ativo"
	@echo "\n${YELLOW}Consumidores RabbitMQ:${RESET}"
	@cd apps/worker && make check-consumers 2>/dev/null || echo "  Erro ao verificar consumidores"
	@echo "\n${YELLOW}Status das filas:${RESET}"
	@cd apps/indexer && make check-queues 2>/dev/null || echo "  Erro ao verificar filas"
	@echo "\n${YELLOW}Containers Docker:${RESET}"
	@${DOCKER_COMPOSE_DEV} ps

.PHONY: dev-setup
dev-setup: ## Configura ambiente para desenvolvimento com hot-reload
	@echo "${GREEN}${BOLD}▶ Configurando ambiente para desenvolvimento...${RESET}"
	@echo "${YELLOW}1. Verificando dependências...${RESET}"
	@command -v air >/dev/null 2>&1 || (echo "${RED}Air não encontrado. Instalando...${RESET}" && go install github.com/air-verse/air@latest)
	@echo "${YELLOW}2. Iniciando serviços base...${RESET}"
	@make up-postgres up-rabbitmq
	@echo "${YELLOW}3. Aguardando serviços estarem prontos...${RESET}"
	@sleep 5
	@echo "${YELLOW}4. Configurando banco de dados...${RESET}"
	@make setup-db
	@echo "${GREEN}✅ Ambiente configurado para desenvolvimento!${RESET}"
	@echo "\n${YELLOW}Próximos passos:${RESET}"
	@echo "  ${GREEN}make dev-indexer${RESET}  - Terminal 1: Iniciar indexer com hot-reload"
	@echo "  ${GREEN}make dev-worker${RESET}   - Terminal 2: Iniciar worker com hot-reload"
	@echo "  ${GREEN}make check-consumers${RESET} - Terminal 3: Monitorar consumidores"

.PHONY: dev-stop
dev-stop: ## Para todos os processos de desenvolvimento
	@echo "${YELLOW}${BOLD}▶ Parando processos de desenvolvimento...${RESET}"
	@echo "${YELLOW}Matando processos Air...${RESET}"
	@pkill -f "air" || echo "Nenhum processo Air encontrado"
	@echo "${YELLOW}Limpando arquivos temporários...${RESET}"
	@make clean-hotreload
	@echo "${GREEN}✅ Processos de desenvolvimento parados!${RESET}"

# ==============================================================================
# COMANDOS COMBINADOS PARA DESENVOLVIMENTO
# ==============================================================================

.PHONY: dev-full
dev-full: dev-setup ## Inicia ambiente completo de desenvolvimento
	@echo "${GREEN}${BOLD}▶ Iniciando ambiente completo de desenvolvimento...${RESET}"
	@echo "${YELLOW}Abrindo terminais para hot-reload...${RESET}"
	@echo "\n${PURPLE}${BOLD}INSTRUÇÕES:${RESET}"
	@echo "1. ${GREEN}Terminal atual${RESET}: Monitore com '${GREEN}make hotreload-status${RESET}'"
	@echo "2. ${GREEN}Novo terminal${RESET}: Execute '${GREEN}make dev-indexer${RESET}'"
	@echo "3. ${GREEN}Novo terminal${RESET}: Execute '${GREEN}make dev-worker${RESET}'"
	@echo "4. ${GREEN}Novo terminal${RESET}: Execute '${GREEN}make check-consumers${RESET}' para monitorar"
	@echo "\n${YELLOW}Para parar tudo: ${GREEN}make dev-stop${RESET}"

.PHONY: dev-restart
dev-restart: dev-stop dev-setup ## Reinicia ambiente de desenvolvimento
	@echo "${GREEN}✅ Ambiente de desenvolvimento reiniciado!${RESET}"

.PHONY: troubleshoot-rabbitmq
troubleshoot-rabbitmq: ## Diagnostica problemas com RabbitMQ
	@echo "${GREEN}${BOLD}▶ Diagnóstico RabbitMQ${RESET}\n"
	@echo "${YELLOW}1. Status do container:${RESET}"
	@${DOCKER_COMPOSE_DEV} ps rabbitmq
	@echo "\n${YELLOW}2. Logs recentes:${RESET}"
	@${DOCKER_COMPOSE_DEV} logs --tail=10 rabbitmq
	@echo "\n${YELLOW}3. Conexões ativas:${RESET}"
	@curl -s -u guest:guest http://localhost:15673/api/connections | jq -r '.[] | "• \(.name) - \(.user) (\(.state))"' 2>/dev/null || echo "Erro ao conectar na API"
	@echo "\n${YELLOW}4. Filas:${RESET}"
	@curl -s -u guest:guest http://localhost:15673/api/queues | jq -r '.[] | "• \(.name): \(.messages) mensagens, \(.consumers) consumidores"' 2>/dev/null || echo "Erro ao verificar filas"
	@echo "\n${YELLOW}5. Consumidores:${RESET}"
	@cd apps/worker && make check-consumers 2>/dev/null || echo "Erro ao verificar consumidores"

.PHONY: hotreload-guide
hotreload-guide: ## Mostra guia rápido de uso do hot-reload
	@echo "${GREEN}${BOLD}🚀 Guia Rápido: Hot-Reload com RabbitMQ${RESET}\n"
	@echo "${YELLOW}${BOLD}PROBLEMA RESOLVIDO:${RESET}"
	@echo "  ✅ Duplicação de consumidores RabbitMQ durante hot-reload"
	@echo "  ✅ Desincronização no consumo das filas"
	@echo "  ✅ Graceful shutdown inadequado"
	@echo ""
	@echo "${YELLOW}${BOLD}INÍCIO RÁPIDO:${RESET}"
	@echo "  ${GREEN}1.${RESET} ${GREEN}make dev-setup${RESET}     - Configura ambiente (uma vez)"
	@echo "  ${GREEN}2.${RESET} ${GREEN}make dev-indexer${RESET}   - Terminal 1: Indexer com hot-reload"
	@echo "  ${GREEN}3.${RESET} ${GREEN}make dev-worker${RESET}    - Terminal 2: Worker com hot-reload"
	@echo "  ${GREEN}4.${RESET} ${GREEN}make check-consumers${RESET} - Terminal 3: Monitorar (opcional)"
	@echo ""
	@echo "${YELLOW}${BOLD}MONITORAMENTO:${RESET}"
	@echo "  ${GREEN}make check-consumers${RESET}    - Verifica se há duplicação"
	@echo "  ${GREEN}make check-queues${RESET}       - Status das filas"
	@echo "  ${GREEN}make hotreload-status${RESET}   - Status completo"
	@echo "  ${GREEN}make monitor-rabbitmq${RESET}   - Monitor em tempo real"
	@echo ""
	@echo "${YELLOW}${BOLD}SOLUÇÃO DE PROBLEMAS:${RESET}"
	@echo "  ${GREEN}make troubleshoot-rabbitmq${RESET} - Diagnóstico completo"
	@echo "  ${GREEN}make kill-consumers${RESET}        - Força fechamento (emergência)"
	@echo "  ${GREEN}make clean-hotreload${RESET}       - Limpa arquivos temporários"
	@echo "  ${GREEN}make dev-restart${RESET}           - Reinicia ambiente"
	@echo ""
	@echo "${YELLOW}${BOLD}SINAIS DE QUE ESTÁ FUNCIONANDO:${RESET}"
	@echo "  ✅ ${GREEN}1 consumidor por fila${RESET} (não 2+)"
	@echo "  ✅ ${GREEN}Consumer tags únicos${RESET} (worker-PID-timestamp)"
	@echo "  ✅ ${GREEN}Graceful shutdown${RESET} nos logs"
	@echo "  ✅ ${GREEN}Sem mensagens duplicadas${RESET}"
	@echo ""
	@echo "${YELLOW}${BOLD}LOGS IMPORTANTES:${RESET}"
	@echo "  ${GREEN}✅ Consumer criado com tag: worker-1234-1672531200${RESET}"
	@echo "  ${GREEN}🔒 Fechando Consumer [worker-1234-1672531200]...${RESET}"
	@echo "  ${GREEN}✅ Consumer [worker-1234-1672531200] fechado${RESET}"
	@echo ""
	@echo "${PURPLE}${BOLD}💡 DICA:${RESET} Use ${GREEN}make dev-full${RESET} para configurar tudo automaticamente!"

.PHONY: hotreload-help
hotreload-help: hotreload-guide ## Alias para hotreload-guide

.PHONY: login
login: ## Login no Docker Hub
	@docker login
