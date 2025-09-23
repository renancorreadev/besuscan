#!/bin/bash

# Script para demonstrar interação com conta AA
# Uso: ./interact-account.sh <ACCOUNT_ADDRESS> <TARGET_CONTRACT> <FUNCTION_CALL>

# Configurar variáveis de ambiente
export BESU_RPC_URL="http://144.22.179.183"
export BESU_PRIVATE_KEY="0x881d396b85acd82b8bf2615a8d14ffcce79b854f583bd599143ca75e7532f0bf"
export CHAIN_ID=1337

# Endereços dos contratos
export BANK_MANAGER="0xF60AA2e36e214F457B625e0CF9abd89029A0441e"
export ENTRY_POINT="0xdB226C0C56fDE2A974B11bD3fFc481Da9e803912"

# Verificar parâmetros
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo "ERRO: Parâmetros insuficientes"
    echo "Uso: ./interact-account.sh <ACCOUNT_ADDRESS> <TARGET_CONTRACT> <FUNCTION_CALL>"
    echo "Exemplo: ./interact-account.sh 0x742d35Cc6634C0532925A3b8D7c9C0F4b8B8b8B8 0x1234... 'transfer(address,uint256)'"
    exit 1
fi

ACCOUNT_ADDRESS=$1
TARGET_CONTRACT=$2
FUNCTION_CALL=$3

echo "=========================================="
echo "Interação com Conta AA"
echo "=========================================="
echo "Conta: $ACCOUNT_ADDRESS"
echo "Contrato alvo: $TARGET_CONTRACT"
echo "Função: $FUNCTION_CALL"
echo ""

# 1. Verificar se a conta existe
echo "1. Verificando conta..."
EXISTS=$(cast call $BANK_MANAGER "isValidAccount(address)" $ACCOUNT_ADDRESS --rpc-url $BESU_RPC_URL)
if [ "$EXISTS" != "true" ]; then
    echo "❌ Conta não encontrada"
    exit 1
fi
echo "✅ Conta válida"
echo ""

# 2. Verificar saldo
echo "2. Verificando saldo..."
BALANCE=$(cast balance $ACCOUNT_ADDRESS --rpc-url $BESU_RPC_URL)
echo "Saldo atual: $BALANCE wei ($(($BALANCE / 1000000000000000000)) ETH)"
echo ""

# 3. Exemplo de transação simples (transferência ETH)
if [ "$FUNCTION_CALL" = "transfer" ]; then
    echo "3. Executando transferência ETH..."
    echo "⚠️  NOTA: Esta é uma demonstração. Em produção, use UserOperation"

    # Simular transferência (apenas para demonstração)
    echo "Simulando transferência de 0.1 ETH para $TARGET_CONTRACT"
    echo "Comando real seria:"
    echo "cast send $ACCOUNT_ADDRESS \"execute(address,uint256,bytes)\" $TARGET_CONTRACT 100000000000000000 \"0x\" --private-key $BESU_PRIVATE_KEY --rpc-url $BESU_RPC_URL"
    echo ""
fi

# 4. Exemplo de chamada para contrato ERC-20
if [[ "$FUNCTION_CALL" == *"transfer"* ]]; then
    echo "4. Exemplo de chamada ERC-20..."
    echo "Para transferir tokens ERC-20:"
    echo "1. Criar UserOperation"
    echo "2. Assinar com chave privada da conta"
    echo "3. Enviar para EntryPoint"
    echo ""
    echo "Estrutura da UserOperation:"
    echo "- sender: $ACCOUNT_ADDRESS"
    echo "- target: $TARGET_CONTRACT"
    echo "- value: 0 (para tokens)"
    echo "- data: calldata da função transfer"
    echo ""
fi

# 5. Verificar permissões
echo "5. Verificando permissões..."
echo "A conta AA pode executar transações se:"
echo "- KYC estiver válido"
echo "- Limites não forem excedidos"
echo "- Multi-sig aprovado (se necessário)"
echo ""

# 6. Mostrar comandos úteis
echo "6. Comandos úteis para interação:"
echo ""
echo "a) Consultar conta:"
echo "   ./query-account.sh $ACCOUNT_ADDRESS"
echo ""
echo "b) Executar transação direta (apenas para testes):"
echo "   cast send $ACCOUNT_ADDRESS \"execute(address,uint256,bytes)\" $TARGET_CONTRACT 0 \"0x<calldata>\" --private-key $BESU_PRIVATE_KEY --rpc-url $BESU_RPC_URL"
echo ""
echo "c) Verificar status:"
echo "   cast call $BANK_MANAGER \"getAccountStatus(address)\" $ACCOUNT_ADDRESS --rpc-url $BESU_RPC_URL"
echo ""
echo "d) Verificar limites:"
echo "   cast call $ACCOUNT_ADDRESS \"getAvailableLimits()\" --rpc-url $BESU_RPC_URL"
echo ""

echo "=========================================="
echo "Interação concluída!"
echo "=========================================="
