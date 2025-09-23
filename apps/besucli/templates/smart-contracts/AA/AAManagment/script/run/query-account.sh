#!/bin/bash

# Script para consultar informações de uma conta AA
# Uso: ./query-account.sh <ACCOUNT_ADDRESS>

# Configurar variáveis de ambiente
export BESU_RPC_URL="http://144.22.179.183"
export BESU_PRIVATE_KEY="0x881d396b85acd82b8bf2615a8d14ffcce79b854f583bd599143ca75e7532f0bf"
export CHAIN_ID=1337

# Endereços dos contratos
export BANK_MANAGER="0xF60AA2e36e214F457B625e0CF9abd89029A0441e"
export KYC_VALIDATOR="0x8D5C581dEc763184F72E9b49E50F4387D35754D8"
export MULTISIG_VALIDATOR="0x29209C1392b7ebe91934Ee9Ef4C57116761286F8"
export SOCIAL_RECOVERY="0xF6757ee0d75AE430Ec148850c16aA1F0e8e35e59"

# Verificar se o endereço da conta foi fornecido
if [ -z "$1" ]; then
    echo "ERRO: Forneca o endereco da conta"
    echo "Uso: ./query-account.sh <ACCOUNT_ADDRESS>"
    echo "Exemplo: ./query-account.sh 0x742d35Cc6634C0532925A3b8D7c9C0F4b8B8b8B8"
    exit 1
fi

ACCOUNT_ADDRESS=$1

echo "=========================================="
echo "Consulta de Conta AA - $ACCOUNT_ADDRESS"
echo "=========================================="
echo ""

# 1. Verificar se a conta existe
echo "1. Verificando se a conta existe..."
EXISTS=$(cast call $BANK_MANAGER "isValidAccount(address)" $ACCOUNT_ADDRESS --rpc-url $BESU_RPC_URL)
if [ "$EXISTS" = "true" ]; then
    echo "✅ Conta existe no sistema"
else
    echo "❌ Conta não encontrada no sistema"
    echo "Tentando verificar diretamente na conta..."
    OWNER=$(cast call $ACCOUNT_ADDRESS "owner()" --rpc-url $BESU_RPC_URL)
    if [ "$OWNER" != "0x0000000000000000000000000000000000000000000000000000000000000000" ]; then
        echo "✅ Conta existe e está inicializada (Owner: $OWNER)"
    else
        echo "❌ Conta não inicializada"
        exit 1
    fi
fi
echo ""

# 2. Informações básicas da conta
echo "2. Informações básicas da conta..."
ACCOUNT_INFO=$(cast call $BANK_MANAGER "getAccountInfo(address)" $ACCOUNT_ADDRESS --rpc-url $BESU_RPC_URL)
echo "Informações da conta: $ACCOUNT_INFO"
echo ""

# 3. Status da conta
echo "3. Status da conta..."
STATUS=$(cast call $BANK_MANAGER "getAccountStatus(address)" $ACCOUNT_ADDRESS --rpc-url $BESU_RPC_URL)
echo "Status: $STATUS"
echo ""

# 4. Configurações da conta
echo "4. Configurações da conta..."
CONFIG=$(cast call $ACCOUNT_ADDRESS "config()" --rpc-url $BESU_RPC_URL)
echo "Configurações: $CONFIG"
echo ""

# 5. Limites disponíveis
echo "5. Limites disponíveis..."
LIMITS=$(cast call $ACCOUNT_ADDRESS "getAvailableLimits()" --rpc-url $BESU_RPC_URL)
echo "Limites disponíveis: $LIMITS"
echo ""

# 6. Verificar KYC
echo "6. Status KYC..."
KYC_STATUS=$(cast call $KYC_VALIDATOR "isKYCValid(address)" $ACCOUNT_ADDRESS --rpc-url $BESU_RPC_URL)
echo "KYC válido: $KYC_STATUS"
echo ""

# 7. Verificar Multi-sig
echo "7. Configuração Multi-sig..."
MULTISIG_CONFIG=$(cast call $MULTISIG_VALIDATOR "getMultiSigConfig(address)" $ACCOUNT_ADDRESS --rpc-url $BESU_RPC_URL)
echo "Configuração Multi-sig: $MULTISIG_CONFIG"
echo ""

# 8. Verificar Social Recovery
echo "8. Configuração Social Recovery..."
RECOVERY_CONFIG=$(cast call $SOCIAL_RECOVERY "getRecoveryConfig(address)" $ACCOUNT_ADDRESS --rpc-url $BESU_RPC_URL)
echo "Configuração Social Recovery: $RECOVERY_CONFIG"
echo ""

# 9. Saldo da conta
echo "9. Saldo da conta..."
BALANCE=$(cast balance $ACCOUNT_ADDRESS --rpc-url $BESU_RPC_URL)
echo "Saldo: $BALANCE wei ($(($BALANCE / 1000000000000000000)) ETH)"
echo ""

echo "=========================================="
echo "Consulta concluída!"
echo "=========================================="
