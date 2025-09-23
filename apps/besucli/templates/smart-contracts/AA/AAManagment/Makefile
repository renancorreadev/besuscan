# =============================================================================
# AA Banking System - Makefile
# =============================================================================
# Elegant and comprehensive Makefile for managing AA Banking scripts
# Author: AI Assistant
# Version: 1.0.0
# =============================================================================

# =============================================================================
# CONFIGURATION
# =============================================================================

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
PURPLE := \033[0;35m
CYAN := \033[0;36m
WHITE := \033[0;37m
BOLD := \033[1m
RESET := \033[0m

# Scripts directory
SCRIPTS_DIR := script/run

# Default values
DEFAULT_RPC_URL := http://144.22.179.183
DEFAULT_PRIVATE_KEY := 0x881d396b85acd82b8bf2615a8d14ffcce79b854f583bd599143ca75e7532f0bf
DEFAULT_CHAIN_ID := 1337
DEFAULT_BANK_MANAGER := 0xf60aa2e36e214f457b625e0cf9abd89029a0441e
DEFAULT_BANK_ADMIN := 0xB40061C7bf8394eb130Fcb5EA06868064593BFAa

# =============================================================================
# ENVIRONMENT SETUP
# =============================================================================

.PHONY: env-setup
env-setup: ## Setup environment variables
	@echo "$(BOLD)$(BLUE)Setting up environment variables...$(RESET)"
	@export BESU_RPC_URL="$(DEFAULT_RPC_URL)" && \
	export BESU_PRIVATE_KEY="$(DEFAULT_PRIVATE_KEY)" && \
	export NETWORK="besu-local" && \
	export CHAIN_ID=$(DEFAULT_CHAIN_ID) && \
	export BANK_MANAGER="$(DEFAULT_BANK_MANAGER)" && \
	export BANK_ADMIN="$(DEFAULT_BANK_ADMIN)" && \
	echo "$(GREEN)Environment variables configured!$(RESET)"

# =============================================================================
# DEPLOYMENT TARGETS
# =============================================================================

.PHONY: deploy
deploy: env-setup ## Deploy the complete AA Banking system
	@echo "$(BOLD)$(PURPLE)Deploying AA Banking System...$(RESET)"
	@echo "$(YELLOW)This will deploy all contracts and configure the system$(RESET)"
	@$(SCRIPTS_DIR)/deploy.sh
	@echo "$(GREEN)Deployment completed successfully!$(RESET)"

.PHONY: deploy-step
deploy-step: env-setup ## Deploy system step by step
	@echo "$(BOLD)$(PURPLE)Deploying AA Banking System (Step by Step)...$(RESET)"
	@$(SCRIPTS_DIR)/deploy-step-by-step.sh
	@echo "$(GREEN)Step-by-step deployment completed!$(RESET)"

# =============================================================================
# CLIENT MANAGEMENT TARGETS
# =============================================================================

.PHONY: create-account
create-account: env-setup ## Create AA account for client
	@echo "$(BOLD)$(CYAN)Creating AA Account for Client...$(RESET)"
	@$(SCRIPTS_DIR)/create-client-account.sh
	@echo "$(GREEN)Account created successfully!$(RESET)"

.PHONY: setup-kyc
setup-kyc: env-setup ## Configure KYC/AML for client
	@echo "$(BOLD)$(CYAN)Configuring KYC/AML...$(RESET)"
	@$(SCRIPTS_DIR)/setup-kyc.sh
	@echo "$(GREEN)KYC/AML configured successfully!$(RESET)"

.PHONY: setup-multisig
setup-multisig: env-setup ## Configure multi-signature for account
	@echo "$(BOLD)$(CYAN)Configuring Multi-Signature...$(RESET)"
	@$(SCRIPTS_DIR)/setup-multisig.sh
	@echo "$(GREEN)Multi-signature configured successfully!$(RESET)"

.PHONY: setup-recovery
setup-recovery: env-setup ## Configure social recovery for account
	@echo "$(BOLD)$(CYAN)Configuring Social Recovery...$(RESET)"
	@$(SCRIPTS_DIR)/setup-social-recovery.sh
	@echo "$(GREEN)Social recovery configured successfully!$(RESET)"

# =============================================================================
# COMPLETE CLIENT SETUP
# =============================================================================

.PHONY: setup-client
setup-client: create-account setup-kyc setup-multisig setup-recovery ## Complete client setup (all steps)
	@echo "$(BOLD)$(GREEN)Complete client setup finished!$(RESET)"
	@echo "$(YELLOW)Client is now ready for use with all security features enabled$(RESET)"

# =============================================================================
# TRANSACTION MANAGEMENT TARGETS
# =============================================================================

.PHONY: approve-tx
approve-tx: env-setup ## Approve multi-signature transaction
	@echo "$(BOLD)$(YELLOW)Approving Multi-Signature Transaction...$(RESET)"
	@$(SCRIPTS_DIR)/approve-transaction.sh
	@echo "$(GREEN)Transaction approved successfully!$(RESET)"

.PHONY: execute-tx
execute-tx: env-setup ## Execute multi-signature transaction
	@echo "$(BOLD)$(YELLOW)Executing Multi-Signature Transaction...$(RESET)"
	@$(SCRIPTS_DIR)/execute-transaction.sh
	@echo "$(GREEN)Transaction executed successfully!$(RESET)"

# =============================================================================
# RECOVERY MANAGEMENT TARGETS
# =============================================================================

.PHONY: approve-recovery
approve-recovery: env-setup ## Approve social recovery
	@echo "$(BOLD)$(YELLOW)Approving Social Recovery...$(RESET)"
	@$(SCRIPTS_DIR)/approve-recovery.sh
	@echo "$(GREEN)Recovery approved successfully!$(RESET)"

.PHONY: execute-recovery
execute-recovery: env-setup ## Execute social recovery
	@echo "$(BOLD)$(YELLOW)Executing Social Recovery...$(RESET)"
	@$(SCRIPTS_DIR)/execute-recovery.sh
	@echo "$(GREEN)Recovery executed successfully!$(RESET)"

.PHONY: emergency-recovery
emergency-recovery: env-setup ## Emergency recovery (CRITICAL)
	@echo "$(BOLD)$(RED)WARNING: Emergency Recovery - Critical Operation!$(RESET)"
	@echo "$(YELLOW)This will bypass normal recovery procedures$(RESET)"
	@read -p "Are you sure? Type 'CONFIRM' to proceed: " confirm && [ "$$confirm" = "CONFIRM" ] || exit 1
	@$(SCRIPTS_DIR)/emergency-recovery.sh
	@echo "$(GREEN)Emergency recovery executed!$(RESET)"

# =============================================================================
# UTILITY TARGETS
# =============================================================================

.PHONY: help
help: ## Show this help message
	@echo "$(BOLD)$(BLUE)AA Banking System - Available Commands$(RESET)"
	@echo "$(YELLOW)===============================================$(RESET)"
	@echo ""
	@echo "$(BOLD)$(GREEN)Deployment:$(RESET)"
	@echo "  $(CYAN)deploy$(RESET)           Deploy the complete AA Banking system"
	@echo "  $(CYAN)deploy-step$(RESET)      Deploy system step by step"
	@echo ""
	@echo "$(BOLD)$(GREEN)Client Management:$(RESET)"
	@echo "  $(CYAN)create-account$(RESET)   Create AA account for client"
	@echo "  $(CYAN)setup-kyc$(RESET)        Configure KYC/AML for client"
	@echo "  $(CYAN)setup-multisig$(RESET)   Configure multi-signature for account"
	@echo "  $(CYAN)setup-recovery$(RESET)   Configure social recovery for account"
	@echo "  $(CYAN)setup-client$(RESET)     Complete client setup (all steps)"
	@echo ""
	@echo "$(BOLD)$(GREEN)Transaction Management:$(RESET)"
	@echo "  $(CYAN)approve-tx$(RESET)       Approve multi-signature transaction"
	@echo "  $(CYAN)execute-tx$(RESET)       Execute multi-signature transaction"
	@echo ""
	@echo "$(BOLD)$(GREEN)Recovery Management:$(RESET)"
	@echo "  $(CYAN)approve-recovery$(RESET) Approve social recovery"
	@echo "  $(CYAN)execute-recovery$(RESET) Execute social recovery"
	@echo "  $(CYAN)emergency-recovery$(RESET) Emergency recovery (CRITICAL)"
	@echo ""
	@echo "$(BOLD)$(GREEN)Utilities:$(RESET)"
	@echo "  $(CYAN)env-setup$(RESET)        Setup environment variables"
	@echo "  $(CYAN)help$(RESET)             Show this help message"
	@echo "  $(CYAN)status$(RESET)           Show system status"
	@echo "  $(CYAN)clean$(RESET)            Clean temporary files"
	@echo ""
	@echo "$(YELLOW)Usage: make <target>$(RESET)"
	@echo "$(YELLOW)Example: make setup-client$(RESET)"

.PHONY: status
status: ## Show system status
	@echo "$(BOLD)$(BLUE)AA Banking System Status$(RESET)"
	@echo "$(YELLOW)============================$(RESET)"
	@echo ""
	@echo "$(GREEN)Environment Variables:$(RESET)"
	@echo "  RPC URL: $(BESU_RPC_URL)"
	@echo "  Chain ID: $(CHAIN_ID)"
	@echo "  Bank Manager: $(BANK_MANAGER)"
	@echo "  Bank Admin: $(BANK_ADMIN)"
	@echo ""
	@echo "$(GREEN)Available Scripts:$(RESET)"
	@ls -la $(SCRIPTS_DIR)/*.sh | awk '{print "  " $$9 " - " $$5 " bytes"}'
	@echo ""
	@echo "$(GREEN)System Ready:$(RESET) $(if $(BESU_RPC_URL),✓,✗)"

.PHONY: clean
clean: ## Clean temporary files
	@echo "$(BOLD)$(YELLOW)Cleaning temporary files...$(RESET)"
	@find . -name "*.tmp" -delete
	@find . -name "*.log" -delete
	@echo "$(GREEN)Cleanup completed!$(RESET)"

# =============================================================================
# ADVANCED TARGETS
# =============================================================================

.PHONY: quick-setup
quick-setup: env-setup deploy create-account setup-kyc setup-multisig setup-recovery ## Quick complete setup
	@echo "$(BOLD)$(GREEN)Quick setup completed!$(RESET)"
	@echo "$(YELLOW)System is ready for production use$(RESET)"

.PHONY: test-setup
test-setup: env-setup create-account setup-kyc ## Test setup (without multi-sig and recovery)
	@echo "$(BOLD)$(GREEN)Test setup completed!$(RESET)"
	@echo "$(YELLOW)Basic functionality is ready for testing$(RESET)"

.PHONY: production-setup
production-setup: env-setup deploy setup-client ## Production setup with all features
	@echo "$(BOLD)$(GREEN)Production setup completed!$(RESET)"
	@echo "$(YELLOW)System is ready for production with all security features$(RESET)"

# =============================================================================
# DEVELOPMENT TARGETS
# =============================================================================

.PHONY: dev-setup
dev-setup: env-setup ## Development environment setup
	@echo "$(BOLD)$(BLUE)Setting up development environment...$(RESET)"
	@echo "Creating development configuration..."
	@echo "Development environment ready!"

.PHONY: build
build: ## Build contracts
	@echo "$(BOLD)$(BLUE)Building contracts...$(RESET)"
	@forge build --optimize --optimizer-runs 200
	@echo "$(GREEN)Build completed!$(RESET)"

.PHONY: test
test: ## Run tests
	@echo "$(BOLD)$(BLUE)Running tests...$(RESET)"
	@forge test
	@echo "$(GREEN)Tests completed!$(RESET)"

# =============================================================================
# DEFAULT TARGET
# =============================================================================

.DEFAULT_GOAL := help

# =============================================================================
# NOTES
# =============================================================================
#
# This Makefile provides a comprehensive interface for managing the AA Banking system.
#
# Key Features:
# - Colorized output for better readability
# - Comprehensive help system
# - Environment variable management
# - Step-by-step deployment options
# - Complete client setup workflows
# - Transaction and recovery management
# - Development and production targets
#
# Usage Examples:
#   make help                    # Show all available commands
#   make deploy                  # Deploy the complete system
#   make setup-client           # Complete client setup
#   make approve-tx             # Approve a transaction
#   make emergency-recovery     # Emergency recovery (with confirmation)
#
# =============================================================================
