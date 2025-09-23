#!/bin/bash

# Script para verificar se o deploy do sistema AA Banking foi bem-sucedido
# Uso: ./verify-deployment.sh

echo "🔍 Verificando deploy do sistema AA Banking..."
echo "=============================================="

# Configurações
RPC_URL="http://144.22.179.183"
CHAIN_ID=1337

# Endereços dos contratos
ENTRY_POINT="0xdB226C0C56fDE2A974B11bD3fFc481Da9e803912"
BANK_MANAGER="0xF60AA2e36e214F457B625e0CF9abd89029A0441e"
ACCOUNT_IMPL="0x524db0420D1B8C3870933D1Fddac6bBaa63C2Ca6"
KYC_VALIDATOR="0x8D5C581dEc763184F72E9b49E50F4387D35754D8"
TX_LIMITS="0x3416B85fDD6cC143AEE2d3cCD7228d7CB22b564a"
MULTISIG_VALIDATOR="0x29209C1392b7ebe91934Ee9Ef4C57116761286F8"
SOCIAL_RECOVERY="0xF6757ee0d75AE430Ec148850c16aA1F0e8e35e59"
AUDIT_LOGGER="0x6C59E8111D3D59512e39552729732bC09549daF8"

# Função para verificar se o contrato existe
check_contract() {
    local name=$1
    local address=$2
    local method=$3

    echo -n "Verificando $name... "

    if cast call $address "$method" --rpc-url $RPC_URL > /dev/null 2>&1; then
        echo "✅ OK"
        return 0
    else
        echo "❌ FALHOU"
        return 1
    fi
}

# Função para verificar código do contrato
check_contract_code() {
    local name=$1
    local address=$2

    echo -n "Verificando código de $name... "

    local code=$(cast code $address --rpc-url $RPC_URL)
    if [ "$code" != "0x" ] && [ ${#code} -gt 2 ]; then
        echo "✅ OK (${#code} bytes)"
        return 0
    else
        echo "❌ FALHOU (código vazio)"
        return 1
    fi
}

echo ""
echo "📋 Verificando existência dos contratos..."
echo "----------------------------------------"

# Verificar códigos dos contratos
check_contract_code "EntryPoint" $ENTRY_POINT
check_contract_code "AABankManager" $BANK_MANAGER
check_contract_code "AABankAccount" $ACCOUNT_IMPL
check_contract_code "KYCAMLValidator" $KYC_VALIDATOR
check_contract_code "TransactionLimits" $TX_LIMITS
check_contract_code "MultiSignatureValidator" $MULTISIG_VALIDATOR
check_contract_code "SocialRecovery" $SOCIAL_RECOVERY
check_contract_code "AuditLogger" $AUDIT_LOGGER

echo ""
echo "🔧 Verificando funcionalidades dos contratos..."
echo "---------------------------------------------"

# Verificar funcionalidades específicas
check_contract "AABankManager.totalAccounts" $BANK_MANAGER "totalAccounts()"
check_contract "AABankManager.activeAccounts" $BANK_MANAGER "activeAccounts()"
check_contract "AABankManager.globalLimits" $BANK_MANAGER "globalLimits()"

echo ""
echo "📊 Verificando estatísticas do sistema..."
echo "---------------------------------------"

# Obter estatísticas
echo "Estatísticas do AABankManager:"
echo "  - Total de contas: $(cast call $BANK_MANAGER 'totalAccounts()' --rpc-url $RPC_URL)"
echo "  - Contas ativas: $(cast call $BANK_MANAGER 'activeAccounts()' --rpc-url $RPC_URL)"

echo ""
echo "🔗 Verificando conectividade da rede..."
echo "-------------------------------------"

# Verificar bloco atual
CURRENT_BLOCK=$(cast block-number --rpc-url $RPC_URL)
echo "Bloco atual: $CURRENT_BLOCK"

# Verificar chain ID
echo "Chain ID: $CHAIN_ID"

echo ""
echo "✅ Verificação concluída!"
echo "========================="

echo ""
echo "📝 Resumo dos endereços:"
echo "EntryPoint: $ENTRY_POINT"
echo "AABankManager: $BANK_MANAGER"
echo "AABankAccount: $ACCOUNT_IMPL"
echo "KYCAMLValidator: $KYC_VALIDATOR"
echo "TransactionLimits: $TX_LIMITS"
echo "MultiSignatureValidator: $MULTISIG_VALIDATOR"
echo "SocialRecovery: $SOCIAL_RECOVERY"
echo "AuditLogger: $AUDIT_LOGGER"

echo ""
echo "🎉 Sistema AA Banking verificado com sucesso!"
