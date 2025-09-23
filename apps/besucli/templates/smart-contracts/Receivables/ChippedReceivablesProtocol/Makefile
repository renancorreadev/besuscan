# Makefile para ChippedReceivablesTracker
# Comandos para deploy e interação com o contrato

# Cores para output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
BLUE = \033[0;34m
NC = \033[0m # No Color

# Configurações
PRIVATE_KEY=0x881d396b5d25ee4f61c4c917b0b5e0e5739900a1d971b1d6e4c4f4e4b4e4b4e4
RPC_URL=http://144.22.179.183
CHAIN_ID=1337
CONTRACT_NAME=ChippedReceivablesTracker

.PHONY: help deploy configure interact clean

help: ## Mostrar ajuda
	@echo "$(GREEN)ChippedReceivablesTracker - Comandos Disponíveis:$(NC)"
	@echo ""
	@echo "$(YELLOW)Deploy:$(NC)"
	@echo "  make deploy     - Fazer deploy do contrato"
	@echo ""
	@echo "$(YELLOW)Configuração:$(NC)"
	@echo "  make configure  - Configurar roles do contrato"
	@echo ""
	@echo "$(YELLOW)Interação:$(NC)"
	@echo "  make interact   - Testar interações com o contrato"
	@echo ""
	@echo "$(YELLOW)Utilitários:$(NC)"
	@echo "  make clean      - Limpar arquivos temporários"
	@echo "  make help       - Mostrar esta ajuda"

deploy: ## Fazer deploy do contrato
	@echo "$(GREEN)${BOLD}▶ Deploying ChippedReceivablesTracker...${NC}"
	@echo "$(YELLOW)Configurações:$(NC)"
	@echo "  RPC URL: $(BLUE)$(RPC_URL)$(NC)"
	@echo "  Chain ID: $(BLUE)$(CHAIN_ID)$(NC)"
	@echo "  Private Key: $(BLUE)$$(echo $(PRIVATE_KEY) | cut -c1-10)...$(NC)"
	@echo ""
	@PRIVATE_KEY=$(PRIVATE_KEY) forge script script/Deploy.s.sol:DeployScript \
		--rpc-url $(RPC_URL) \
		--private-key $(PRIVATE_KEY) \
		--broadcast \
		--gas-limit 10000000 \
		--gas-price 0 \
		--chain-id $(CHAIN_ID) \
		--legacy
	@echo "$(GREEN)✅ Deploy concluído!${NC}"

configure: ## Configurar roles do contrato
	@echo "$(GREEN)${BOLD}▶ Configurando roles...${NC}"
	@echo "$(YELLOW)Nota: Configure CONTRACT_ADDRESS antes de executar$(NC)"
	@echo "$(YELLOW)Exemplo: make configure CONTRACT_ADDRESS=0x123...$(NC)"
	@if [ -z "$(CONTRACT_ADDRESS)" ]; then \
		echo "$(RED)❌ Erro: CONTRACT_ADDRESS não definido$(NC)"; \
		exit 1; \
	fi
	@CONTRACT_ADDRESS=$(CONTRACT_ADDRESS) PRIVATE_KEY=$(PRIVATE_KEY) forge script script/Configure.s.sol:ConfigureScript \
		--rpc-url $(RPC_URL) \
		--private-key $(PRIVATE_KEY) \
		--broadcast \
		--gas-limit 10000000 \
		--gas-price 0 \
		--chain-id $(CHAIN_ID) \
		--legacy
	@echo "$(GREEN)✅ Configuração concluída!${NC}"

interact: ## Testar interações com o contrato
	@echo "$(GREEN)${BOLD}▶ Testando interações...${NC}"
	@echo "$(YELLOW)Nota: Configure CONTRACT_ADDRESS antes de executar$(NC)"
	@echo "$(YELLOW)Exemplo: make interact CONTRACT_ADDRESS=0x123...$(NC)"
	@if [ -z "$(CONTRACT_ADDRESS)" ]; then \
		echo "$(RED)❌ Erro: CONTRACT_ADDRESS não definido$(NC)"; \
		exit 1; \
	fi
	@CONTRACT_ADDRESS=$(CONTRACT_ADDRESS) PRIVATE_KEY=$(PRIVATE_KEY) forge script script/Interact.s.sol:InteractScript \
		--rpc-url $(RPC_URL) \
		--private-key $(PRIVATE_KEY) \
		--broadcast \
		--gas-limit 10000000 \
		--gas-price 0 \
		--chain-id $(CHAIN_ID) \
		--legacy
	@echo "$(GREEN)✅ Interações concluídas!${NC}"

clean: ## Limpar arquivos temporários
	@echo "$(YELLOW)▶ Limpando arquivos temporários...${NC}"
	@rm -rf broadcast/
	@rm -rf cache/
	@rm -rf out/
	@echo "$(GREEN)✅ Limpeza concluída!${NC}"

# Comando padrão
.DEFAULT_GOAL := help
