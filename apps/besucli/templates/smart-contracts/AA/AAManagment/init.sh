#!/bin/bash

# =============================================================================
# AA Banking System - Initialization Script
# =============================================================================
# This script loads configuration and sets up the environment
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[0;37m'
BOLD='\033[1m'
RESET='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.env"

# =============================================================================
# FUNCTIONS
# =============================================================================

print_header() {
    echo -e "${BOLD}${BLUE}============================================${RESET}"
    echo -e "${BOLD}${BLUE}    AA Banking System - Initialization${RESET}"
    echo -e "${BOLD}${BLUE}============================================${RESET}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${RESET}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${RESET}"
}

print_error() {
    echo -e "${RED}✗ $1${RESET}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${RESET}"
}

# =============================================================================
# CONFIGURATION LOADING
# =============================================================================

load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        print_info "Loading configuration from $CONFIG_FILE"
        source "$CONFIG_FILE"
        print_success "Configuration loaded successfully"
    else
        print_warning "Configuration file not found: $CONFIG_FILE"
        print_info "Using default configuration"
        load_default_config
    fi
}

load_default_config() {
    # Default network configuration
    export BESU_RPC_URL="http://144.22.179.183"
    export BESU_PRIVATE_KEY="0x881d396b85acd82b8bf2615a8d14ffcce79b854f583bd599143ca75e7532f0bf"
    export NETWORK="besu-local"
    export CHAIN_ID=1337

    # Default contract addresses
    export BANK_MANAGER="0xF60AA2e36e214F457B625e0CF9abd89029A0441e"
    export BANK_ADMIN="0xB40061C7bf8394eb130Fcb5EA06868064593BFAa"
    export KYC_VALIDATOR="0x8D5C581dEc763184F72E9b49E50F4387D35754D8"
    export MULTISIG_VALIDATOR="0x29209C1392b7ebe91934Ee9Ef4C57116761286F8"
    export SOCIAL_RECOVERY="0xF6757ee0d75AE430Ec148850c16aA1F0e8e35e59"
    export AUDIT_LOGGER="0x6C59E8111D3D59512e39552729732bC09549daF8"
    export TRANSACTION_LIMITS="0x3416B85fDD6cC143AEE2d3cCD7228d7CB22b564a"
    export ENTRY_POINT="0xdB226C0C56fDE2A974B11bD3fFc481Da9e803912"
    export ACCOUNT_IMPLEMENTATION="0x524db0420D1B8C3870933D1Fddac6bBaa63C2Ca6"

    # Default client configuration
    export CLIENT_ADDRESS="0x742d35Cc6634C0532925a3b8D7C9C0F4b8b8b8b8"
    export BANK_ID="0x4252414445534355000000000000000000000000000000000000000000000000"
    export SALT="12345"

    # Default limits
    export DAILY_LIMIT="10000000000000000000000"
    export WEEKLY_LIMIT="50000000000000000000000"
    export MONTHLY_LIMIT="200000000000000000000000"
    export TRANSACTION_LIMIT="5000000000000000000000"
    export MULTISIG_THRESHOLD="10000000000000000000000"

    # Default compliance settings
    export REQUIRES_KYC="true"
    export REQUIRES_AML="true"
    export RISK_LEVEL="1"
    export KYC_STATUS="1"
    export KYC_EXPIRES_AT="$(date -d '+365 days' +%s)"
    export DOCUMENT_HASH="0x$(echo -n 'test_document_hash' | sha256sum | cut -d' ' -f1)"

    # Default multi-sig settings
    export REQUIRED_SIGNATURES="2"
    export TIMELOCK="3600"
    export EXPIRATION_TIME="86400"
    export IS_ACTIVE="true"
    export SIGNER_1="0x8A2e36e214f457b625e0cf9abd89029a0441eF60"
    export SIGNER_2="0x9B3f47e325f568b736e0df0bce9abd89029a0441"
    export SIGNER_3="0xAC4f58e436f568b736e0df0bce9abd89029a0441"

    # Default recovery settings
    export REQUIRED_APPROVALS="2"
    export REQUIRED_WEIGHT="200"
    export RECOVERY_DELAY="86400"
    export APPROVAL_WINDOW="259200"
    export COOLDOWN_PERIOD="604800"
    export GUARDIAN_1="0x8A2e36e214f457b625e0cf9abd89029a0441eF60"
    export GUARDIAN_2="0x9B3f47e325f568b736e0df0bce9abd89029a0441"
    export GUARDIAN_3="0xAC4f58e436f568b736e0df0bce9abd89029a0441"

    # Default gas settings
    export GAS_LIMIT="10000000"
    export GAS_PRICE="0"

    # Default development settings
    export DEBUG="false"
    export VERBOSE="false"
    export DRY_RUN="false"
}

# =============================================================================
# VALIDATION
# =============================================================================

validate_config() {
    local errors=0

    print_info "Validating configuration..."

    # Check required variables
    if [ -z "$BESU_RPC_URL" ]; then
        print_error "BESU_RPC_URL is not set"
        ((errors++))
    fi

    if [ -z "$BESU_PRIVATE_KEY" ]; then
        print_error "BESU_PRIVATE_KEY is not set"
        ((errors++))
    fi

    if [ -z "$CHAIN_ID" ]; then
        print_error "CHAIN_ID is not set"
        ((errors++))
    fi

    # Check contract addresses
    if [ "$KYC_VALIDATOR" = "0x..." ]; then
        print_warning "KYC_VALIDATOR not configured (will be set after deployment)"
    fi

    if [ "$MULTISIG_VALIDATOR" = "0x..." ]; then
        print_warning "MULTISIG_VALIDATOR not configured (will be set after deployment)"
    fi

    if [ "$SOCIAL_RECOVERY" = "0x..." ]; then
        print_warning "SOCIAL_RECOVERY not configured (will be set after deployment)"
    fi

    if [ $errors -eq 0 ]; then
        print_success "Configuration validation passed"
        return 0
    else
        print_error "Configuration validation failed with $errors errors"
        return 1
    fi
}

# =============================================================================
# STATUS DISPLAY
# =============================================================================

show_status() {
    echo -e "${BOLD}${BLUE}Configuration Status:${RESET}"
    echo -e "${CYAN}Network:${RESET} $BESU_RPC_URL (Chain ID: $CHAIN_ID)"
    echo -e "${CYAN}Bank Manager:${RESET} $BANK_MANAGER"
    echo -e "${CYAN}Bank Admin:${RESET} $BANK_ADMIN"
    echo -e "${CYAN}Client:${RESET} $CLIENT_ADDRESS"
    echo -e "${CYAN}Bank ID:${RESET} $BANK_ID"
    echo -e "${CYAN}Salt:${RESET} $SALT"
    echo ""

    echo -e "${BOLD}${BLUE}Account Limits:${RESET}"
    echo -e "${CYAN}Daily:${RESET} $(($DAILY_LIMIT / 1000000000000000000)) ETH"
    echo -e "${CYAN}Weekly:${RESET} $(($WEEKLY_LIMIT / 1000000000000000000)) ETH"
    echo -e "${CYAN}Monthly:${RESET} $(($MONTHLY_LIMIT / 1000000000000000000)) ETH"
    echo -e "${CYAN}Transaction:${RESET} $(($TRANSACTION_LIMIT / 1000000000000000000)) ETH"
    echo -e "${CYAN}Multi-sig Threshold:${RESET} $(($MULTISIG_THRESHOLD / 1000000000000000000)) ETH"
    echo ""

    echo -e "${BOLD}${BLUE}Security Features:${RESET}"
    echo -e "${CYAN}KYC Required:${RESET} $REQUIRES_KYC"
    echo -e "${CYAN}AML Required:${RESET} $REQUIRES_AML"
    echo -e "${CYAN}Risk Level:${RESET} $RISK_LEVEL"
    echo -e "${CYAN}Required Signatures:${RESET} $REQUIRED_SIGNATURES"
    echo -e "${CYAN}Required Approvals:${RESET} $REQUIRED_APPROVALS"
    echo ""
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    print_header

    # Load configuration
    load_config

    # Validate configuration
    if ! validate_config; then
        print_error "Please fix configuration errors and try again"
        exit 1
    fi

    # Show status
    show_status

    print_success "Environment initialized successfully!"
    print_info "You can now use 'make' commands to manage the AA Banking system"
    print_info "Run 'make help' to see all available commands"
    echo ""
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# If script is sourced, just load config
if [ "${BASH_SOURCE[0]}" != "${0}" ]; then
    load_config
    validate_config
else
    # If script is executed directly, run main function
    main "$@"
fi
