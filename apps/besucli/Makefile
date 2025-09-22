# ==============================================================================
# BesuCLI - Makefile Completo
# BesuScan Command Line Interface Build & Installation
# ==============================================================================

# Configurações do projeto
BINARY_NAME := besucli
BINARY_UNIX := $(BINARY_NAME)_unix
BINARY_WINDOWS := $(BINARY_NAME).exe
BINARY_DARWIN := $(BINARY_NAME)_darwin

# Versão do projeto (pode ser sobrescrita via VERSION=)
VERSION ?= 1.0.0
BUILD_TIME := $(shell date -u '+%Y-%m-%d_%H:%M:%S')
COMMIT_HASH := $(shell git rev-parse --short HEAD 2>/dev/null || echo "development")

# Diretórios
BUILD_DIR := bin
DIST_DIR := dist
INSTALL_DIR := /usr/local/bin
CONFIG_DIR := /etc/besucli
TEMPLATES_DIR := /usr/local/share/besucli/templates

# Flags de build
LDFLAGS := -ldflags "-X main.Version=$(VERSION) -X main.BuildTime=$(BUILD_TIME) -X main.CommitHash=$(COMMIT_HASH)"
GOOS ?= $(shell go env GOOS)
GOARCH ?= $(shell go env GOARCH)

# Cores para output
GREEN := \033[0;32m
RED := \033[0;31m
BLUE := \033[0;34m
YELLOW := \033[0;33m
CYAN := \033[0;36m
NC := \033[0m

# Docker config
DOCKER_USER := besuscan
REPO := $(DOCKER_USER)/cli

.PHONY: help all build clean install uninstall dev test lint format docker-build docker-push release

# Comando padrão
all: help

# ==============================================================================
# COMANDOS PRINCIPAIS
# ==============================================================================

help: ## Mostrar ajuda completa do Makefile
	@echo "$(CYAN)🚀 BesuCLI - Makefile de Build e Instalação$(NC)"
	@echo "$(BLUE)================================================$(NC)"
	@echo ""
	@echo "$(GREEN)📋 COMANDOS DISPONÍVEIS:$(NC)"
	@echo ""
	@echo "$(YELLOW)🔨 BUILD & COMPILAÇÃO:$(NC)"
	@echo "  make build          # Compilar para o sistema atual"
	@echo "  make build-all      # Compilar para todas as plataformas"
	@echo "  make build-linux    # Compilar para Linux"
	@echo "  make build-windows  # Compilar para Windows"
	@echo "  make build-darwin   # Compilar para macOS"
	@echo ""
	@echo "$(YELLOW)📦 INSTALAÇÃO & DISTRIBUIÇÃO:$(NC)"
	@echo "  make install        # Instalar no sistema (requer sudo)"
	@echo "  make uninstall      # Remover do sistema (requer sudo)"
	@echo "  make install-user   # Instalar no diretório do usuário"
	@echo "  make package        # Criar pacote de distribuição"
	@echo ""
	@echo "$(YELLOW)🛠️  DESENVOLVIMENTO:$(NC)"
	@echo "  make dev            # Executar em modo desenvolvimento"
	@echo "  make test           # Executar testes"
	@echo "  make lint           # Verificar código com linter"
	@echo "  make format         # Formatar código"
	@echo "  make clean          # Limpar arquivos de build"
	@echo ""
	@echo "$(YELLOW)🐳 DOCKER:$(NC)"
	@echo "  make docker-build   # Build da imagem Docker"
	@echo "  make docker-push    # Push para Docker Hub"
	@echo "  make release        # Release completo (build + push)"
	@echo ""
	@echo "$(YELLOW)📚 UTILITÁRIOS:$(NC)"
	@echo "  make cli-help       # Mostrar ajuda da CLI"
	@echo "  make cli-version    # Mostrar versão da CLI"
	@echo "  make config-help    # Mostrar ajuda de configuração"
	@echo ""
	@echo "$(BLUE)📖 EXEMPLOS DE USO:$(NC)"
	@echo "  make install VERSION=1.0.0    # Instalar versão específica"
	@echo "  make build GOOS=linux GOARCH=amd64  # Build cross-platform"
	@echo "  make release VERSION=2.0.0    # Criar release Docker"
	@echo ""
	@echo "$(GREEN)💡 DICA: Use 'make <comando> VERSION=x.y.z' para especificar versão$(NC)"

# ==============================================================================
# BUILD & COMPILAÇÃO
# ==============================================================================

build: ## Compilar para o sistema atual
	@echo "$(GREEN)🔨 Compilando BesuCLI para $(GOOS)/$(GOARCH)...$(NC)"
	@mkdir -p $(BUILD_DIR)
	@go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) ./cmd
	@echo "$(GREEN)✅ Build concluído: $(BUILD_DIR)/$(BINARY_NAME)$(NC)"
	@echo "$(BLUE)📊 Informações do binário:$(NC)"
	@echo "  Versão: $(VERSION)"
	@echo "  Build Time: $(BUILD_TIME)"
	@echo "  Commit: $(COMMIT_HASH)"
	@echo "  Plataforma: $(GOOS)/$(GOARCH)"

build-all: ## Compilar para todas as plataformas
	@echo "$(GREEN)🔨 Compilando para todas as plataformas...$(NC)"
	@mkdir -p $(DIST_DIR)
	@$(MAKE) build-linux
	@$(MAKE) build-windows
	@$(MAKE) build-darwin
	@echo "$(GREEN)✅ Build para todas as plataformas concluído!$(NC)"

build-linux: ## Compilar para Linux
	@echo "$(GREEN)🐧 Compilando para Linux...$(NC)"
	@GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(DIST_DIR)/$(BINARY_UNIX) ./cmd
	@echo "$(GREEN)✅ Linux build: $(DIST_DIR)/$(BINARY_UNIX)$(NC)"

build-windows: ## Compilar para Windows
	@echo "$(GREEN)🪟 Compilando para Windows...$(NC)"
	@GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o $(DIST_DIR)/$(BINARY_WINDOWS) ./cmd
	@echo "$(GREEN)✅ Windows build: $(DIST_DIR)/$(BINARY_WINDOWS)$(NC)"

build-darwin: ## Compilar para macOS
	@echo "$(GREEN)🍎 Compilando para macOS...$(NC)"
	@GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o $(DIST_DIR)/$(BINARY_DARWIN) ./cmd
	@echo "$(GREEN)✅ macOS build: $(DIST_DIR)/$(BINARY_DARWIN)$(NC)"

# ==============================================================================
# INSTALAÇÃO & DISTRIBUIÇÃO
# ==============================================================================

install: ## Instalar no sistema (requer sudo)
	@echo "$(GREEN)📦 Instalando BesuCLI no sistema...$(NC)"
	@if [ ! -f "$(BUILD_DIR)/$(BINARY_NAME)" ]; then \
		echo "$(YELLOW)⚠️ Binário não encontrado, compilando primeiro...$(NC)"; \
		$(MAKE) build; \
	fi
	@echo "$(BLUE)🔧 Criando diretórios do sistema...$(NC)"
	@sudo mkdir -p $(CONFIG_DIR)
	@sudo mkdir -p $(TEMPLATES_DIR)
	@echo "$(BLUE)📁 Copiando binário para $(INSTALL_DIR)...$(NC)"
	@sudo cp $(BUILD_DIR)/$(BINARY_NAME) $(INSTALL_DIR)/
	@sudo chmod +x $(INSTALL_DIR)/$(BINARY_NAME)
	@echo "$(BLUE)📋 Copiando arquivos de configuração...$(NC)"
	@sudo cp besucli.yaml $(CONFIG_DIR)/
	@sudo cp -r templates/* $(TEMPLATES_DIR)/
	@echo "$(BLUE)🔐 Configurando permissões...$(NC)"
	@sudo chown -R root:root $(CONFIG_DIR)
	@sudo chmod 644 $(CONFIG_DIR)/besucli.yaml
	@sudo chmod -R 755 $(TEMPLATES_DIR)
	@echo "$(GREEN)✅ BesuCLI instalado com sucesso!$(NC)"
	@echo "$(BLUE)📍 Localização: $(INSTALL_DIR)/$(BINARY_NAME)$(NC)"
	@echo "$(BLUE)⚙️ Configuração: $(CONFIG_DIR)$(NC)"
	@echo "$(BLUE)📚 Templates: $(TEMPLATES_DIR)$(NC)"
	@echo "$(CYAN)💡 Execute 'besucli --help' para começar!$(NC)"

install-user: ## Instalar no diretório do usuário
	@echo "$(GREEN)📦 Instalando BesuCLI no diretório do usuário...$(NC)"
	@if [ ! -f "$(BUILD_DIR)/$(BINARY_NAME)" ]; then \
		echo "$(YELLOW)⚠️ Binário não encontrado, compilando primeiro...$(NC)"; \
		$(MAKE) build; \
	fi
	@USER_BIN_DIR=$$HOME/.local/bin; \
	USER_CONFIG_DIR=$$HOME/.config/besucli; \
	USER_TEMPLATES_DIR=$$HOME/.local/share/besucli/templates; \
	echo "$(BLUE)🔧 Criando diretórios do usuário...$(NC)"; \
	mkdir -p $$USER_BIN_DIR; \
	mkdir -p $$USER_CONFIG_DIR; \
	mkdir -p $$USER_TEMPLATES_DIR; \
	echo "$(BLUE)📁 Copiando binário para $$USER_BIN_DIR...$(NC)"; \
	cp $(BUILD_DIR)/$(BINARY_NAME) $$USER_BIN_DIR/; \
	chmod +x $$USER_BIN_DIR/$(BINARY_NAME); \
	echo "$(BLUE)📋 Copiando arquivos de configuração...$(NC)"; \
	cp besucli.yaml $$USER_CONFIG_DIR/; \
	cp -r templates/* $$USER_TEMPLATES_DIR/; \
	echo "$(GREEN)✅ BesuCLI instalado no diretório do usuário!$(NC)"; \
	echo "$(BLUE)📍 Localização: $$USER_BIN_DIR/$(BINARY_NAME)$(NC)"; \
	echo "$(BLUE)⚙️ Configuração: $$USER_CONFIG_DIR$(NC)"; \
	echo "$(BLUE)📚 Templates: $$USER_TEMPLATES_DIR$(NC)"; \
	echo "$(YELLOW)⚠️ Adicione $$USER_BIN_DIR ao seu PATH se necessário$(NC)"; \
	echo "$(CYAN)💡 Execute 'besucli --help' para começar!$(NC)"

uninstall: ## Remover do sistema (requer sudo)
	@echo "$(RED)🗑️ Desinstalando BesuCLI...$(NC)"
	@if [ -f "$(INSTALL_DIR)/$(BINARY_NAME)" ]; then \
		echo "$(BLUE)📁 Removendo binário...$(NC)"; \
		sudo rm -f $(INSTALL_DIR)/$(BINARY_NAME); \
	fi
	@if [ -d "$(CONFIG_DIR)" ]; then \
		echo "$(BLUE)⚙️ Removendo configurações...$(NC)"; \
		sudo rm -rf $(CONFIG_DIR); \
	fi
	@if [ -d "$(TEMPLATES_DIR)" ]; then \
		echo "$(BLUE)📚 Removendo templates...$(NC)"; \
		sudo rm -rf $(TEMPLATES_DIR); \
	fi
	@echo "$(GREEN)✅ BesuCLI desinstalado com sucesso!$(NC)"

package: ## Criar pacote de distribuição
	@echo "$(GREEN)📦 Criando pacote de distribuição...$(NC)"
	@$(MAKE) build-all
	@mkdir -p $(DIST_DIR)/$(BINARY_NAME)-$(VERSION)
	@cp $(DIST_DIR)/$(BINARY_UNIX) $(DIST_DIR)/$(BINARY_NAME)-$(VERSION)/$(BINARY_NAME)
	@cp $(DIST_DIR)/$(BINARY_WINDOWS) $(DIST_DIR)/$(BINARY_NAME)-$(VERSION)/
	@cp $(DIST_DIR)/$(BINARY_DARWIN) $(DIST_DIR)/$(BINARY_NAME)-$(VERSION)/
	@cp -r templates $(DIST_DIR)/$(BINARY_NAME)-$(VERSION)/
	@cp besucli.yaml $(DIST_DIR)/$(BINARY_NAME)-$(VERSION)/
	@cp README.md $(DIST_DIR)/$(BINARY_NAME)-$(VERSION)/
	@cp deploy.md $(DIST_DIR)/$(BINARY_NAME)-$(VERSION)/
	@cd $(DIST_DIR) && tar -czf $(BINARY_NAME)-$(VERSION).tar.gz $(BINARY_NAME)-$(VERSION)/
	@cd $(DIST_DIR) && zip -r $(BINARY_NAME)-$(VERSION).zip $(BINARY_NAME)-$(VERSION)/
	@echo "$(GREEN)✅ Pacotes criados:$(NC)"
	@echo "  📦 $(DIST_DIR)/$(BINARY_NAME)-$(VERSION).tar.gz"
	@echo "  📦 $(DIST_DIR)/$(BINARY_NAME)-$(VERSION).zip"

# ==============================================================================
# DESENVOLVIMENTO
# ==============================================================================

dev: ## Executar em modo desenvolvimento
	@echo "$(GREEN)🚀 Executando BesuCLI em modo desenvolvimento...$(NC)"
	@if [ ! -f "$(BUILD_DIR)/$(BINARY_NAME)" ]; then \
		echo "$(YELLOW)⚠️ Binário não encontrado, compilando primeiro...$(NC)"; \
		$(MAKE) build; \
	fi
	@echo "$(CYAN)💡 Dica: Use Ctrl+C para parar$(NC)"
	@$(BUILD_DIR)/$(BINARY_NAME) --help

test: ## Executar testes
	@echo "$(GREEN)🧪 Executando testes...$(NC)"
	@go test -v ./...
	@echo "$(GREEN)✅ Testes concluídos!$(NC)"

lint: ## Verificar código com linter
	@echo "$(GREEN)🔍 Verificando código com linter...$(NC)"
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run; \
	else \
		echo "$(YELLOW)⚠️ golangci-lint não encontrado, instalando...$(NC)"; \
		go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest; \
		golangci-lint run; \
	fi
	@echo "$(GREEN)✅ Linting concluído!$(NC)"

format: ## Formatar código
	@echo "$(GREEN)✨ Formatando código...$(NC)"
	@go fmt ./...
	@go vet ./...
	@echo "$(GREEN)✅ Formatação concluída!$(NC)"

clean: ## Limpar arquivos de build
	@echo "$(YELLOW)🧹 Limpando arquivos de build...$(NC)"
	@rm -rf $(BUILD_DIR)
	@rm -rf $(DIST_DIR)
	@go clean
	@echo "$(GREEN)✅ Limpeza concluída!$(NC)"

# ==============================================================================
# DOCKER
# ==============================================================================

docker-build: ## Build da imagem Docker
	@echo "$(GREEN)🐳 Build da imagem Docker...$(NC)"
	@docker build \
		--build-arg VERSION=$(VERSION) \
		--build-arg BUILD_TIME=$(BUILD_TIME) \
		--build-arg COMMIT=$(COMMIT_HASH) \
		-t $(REPO):latest \
		-t $(REPO):$(VERSION) \
		.
	@echo "$(GREEN)✅ Imagem Docker criada: $(REPO):$(VERSION)$(NC)"

docker-push: ## Push para Docker Hub
	@echo "$(GREEN)📤 Push para Docker Hub...$(NC)"
	@docker push $(REPO):latest
	@docker push $(REPO):$(VERSION)
	@echo "$(GREEN)✅ Push concluído!$(NC)"

release: docker-build docker-push ## Release completo (build + push)
	@echo "$(GREEN)🎉 Release v$(VERSION) concluído!$(NC)"
	@echo "$(BLUE)📦 Imagens disponíveis:$(NC)"
	@echo "  🐳 $(REPO):latest"
	@echo "  🐳 $(REPO):$(VERSION)"

# ==============================================================================
# UTILITÁRIOS DE AJUDA
# ==============================================================================

cli-help: ## Mostrar ajuda da CLI
	@echo "$(CYAN)📚 Ajuda da CLI BesuCLI$(NC)"
	@echo "$(BLUE)================================$(NC)"
	@if [ -f "$(BUILD_DIR)/$(BINARY_NAME)" ]; then \
		$(BUILD_DIR)/$(BINARY_NAME) --help; \
	else \
		echo "$(YELLOW)⚠️ Binário não encontrado, compilando primeiro...$(NC)"; \
		$(MAKE) build; \
		$(BUILD_DIR)/$(BINARY_NAME) --help; \
	fi

cli-version: ## Mostrar versão da CLI
	@echo "$(CYAN)📋 Versão da CLI BesuCLI$(NC)"
	@echo "$(BLUE)================================$(NC)"
	@if [ -f "$(BUILD_DIR)/$(BINARY_NAME)" ]; then \
		$(BUILD_DIR)/$(BINARY_NAME) --version; \
	else \
		echo "$(YELLOW)⚠️ Binário não encontrado, compilando primeiro...$(NC)"; \
		$(MAKE) build; \
		$(BUILD_DIR)/$(BINARY_NAME) --version; \
	fi

config-help: ## Mostrar ajuda de configuração
	@echo "$(CYAN)⚙️ Ajuda de Configuração BesuCLI$(NC)"
	@echo "$(BLUE)=====================================$(NC)"
	@echo ""
	@echo "$(GREEN)📁 ARQUIVOS DE CONFIGURAÇÃO:$(NC)"
	@echo "  • besucli.yaml          # Configuração principal"
	@echo "  • config/hubweb3-network.yaml  # Configuração específica da rede"
	@echo "  • templates/            # Templates de contratos"
	@echo ""
	@echo "$(GREEN)🔧 COMANDOS DE CONFIGURAÇÃO:$(NC)"
	@echo "  besucli config set-wallet    # Configurar carteira"
	@echo "  besucli config set-network   # Configurar rede"
	@echo "  besucli config show          # Mostrar configuração atual"
	@echo ""
	@echo "$(GREEN)📋 ESTRUTURA DE CONFIGURAÇÃO:$(NC)"
	@echo "  network:                    # Configurações da rede"
	@echo "    rpc_url: URL do nó RPC"
	@echo "    name: Nome da rede"
	@echo "    chain_id: ID da chain"
	@echo "  api:                        # Configurações da API"
	@echo "    base_url: URL da API BesuScan"
	@echo "  wallet:                     # Configurações da carteira"
	@echo "    private_key: Chave privada"
	@echo "  gas:                        # Configurações de gas"
	@echo "    limit: Limite de gas"
	@echo "    price: Preço do gas"
	@echo ""
	@echo "$(GREEN)💡 EXEMPLOS DE USO:$(NC)"
	@echo "  # Deploy de contrato via YAML"
	@echo "  besucli deploy templates/counter.yml"
	@echo ""
	@echo "  # Deploy com flags"
	@echo "  besucli deploy --name 'MyToken' --type 'ERC-20' --abi token.abi --bytecode token.bin"
	@echo ""
	@echo "  # Verificar contrato existente"
	@echo "  besucli verify --address 0x123... --name 'MyToken' --abi token.abi"
	@echo ""
	@echo "  # Interagir com contrato"
	@echo "  besucli interact read 0x123... balanceOf 0x456..."
	@echo "  besucli interact write 0x123... transfer 0x456... 1000"
	@echo ""
	@echo "$(YELLOW)⚠️ IMPORTANTE:$(NC)"
	@echo "  • Configure sua chave privada com 'besucli config set-wallet'"
	@echo "  • Ajuste as configurações de rede conforme necessário"
	@echo "  • Use templates YAML para deployments complexos"

# ==============================================================================
# COMANDOS AUXILIARES
# ==============================================================================

deps: ## Instalar dependências
	@echo "$(GREEN)📦 Instalando dependências...$(NC)"
	@go mod download
	@go mod tidy
	@echo "$(GREEN)✅ Dependências instaladas!$(NC)"

check: ## Verificar estado do projeto
	@echo "$(GREEN)🔍 Verificando estado do projeto...$(NC)"
	@echo "$(BLUE)📋 Informações do projeto:$(NC)"
	@echo "  Versão: $(VERSION)"
	@echo "  Build Time: $(BUILD_TIME)"
	@echo "  Commit: $(COMMIT_HASH)"
	@echo "  GOOS: $(GOOS)"
	@echo "  GOARCH: $(GOARCH)"
	@echo ""
	@echo "$(BLUE)📁 Estrutura de diretórios:$(NC)"
	@echo "  Build: $(BUILD_DIR)"
	@echo "  Dist: $(DIST_DIR)"
	@echo "  Config: $(CONFIG_DIR)"
	@echo "  Templates: $(TEMPLATES_DIR)"
	@echo ""
	@echo "$(BLUE)🔧 Status:$(NC)"
	@if [ -f "$(BUILD_DIR)/$(BINARY_NAME)" ]; then \
		echo "  Binário: ✅ $(BUILD_DIR)/$(BINARY_NAME)"; \
	else \
		echo "  Binário: ❌ Não encontrado"; \
	fi
	@if [ -f "besucli.yaml" ]; then \
		echo "  Config: ✅ besucli.yaml"; \
	else \
		echo "  Config: ❌ Não encontrado"; \
	fi
	@if [ -d "templates" ]; then \
		echo "  Templates: ✅ templates/"; \
	else \
		echo "  Templates: ❌ Não encontrado"; \
	fi

# ==============================================================================
# REGRAS ESPECIAIS
# ==============================================================================

# Ignora argumentos desconhecidos
%:
	@:

# Comando para mostrar versão
version:
	@echo "$(VERSION)"
