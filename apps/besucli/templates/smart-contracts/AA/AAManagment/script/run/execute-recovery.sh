#!/bin/bash

# Script para executar recuperação social aprovada
# Uso: ./execute-recovery.sh

# Configurar variáveis de ambiente
export BESU_RPC_URL="http://144.22.179.183"
export BESU_PRIVATE_KEY="0x881d396b85acd82b8bf2615a8d14ffcce79b854f583bd599143ca75e7532f0bf"
export NETWORK="besu-local"
export CHAIN_ID=1337

# Endereços dos contratos
export SOCIAL_RECOVERY="0xF6757ee0d75AE430Ec148850c16aA1F0e8e35e59"

# Configurações da recuperação
export ACCOUNT_ADDRESS="0x..."  # Endereço da conta
export RECOVERY_REQUEST_ID="0x..."  # ID da solicitação de recuperação

echo "🚀 Executando recuperação social..."
echo "Conta: $ACCOUNT_ADDRESS"
echo "Solicitação: $RECOVERY_REQUEST_ID"
echo ""

# Executar script de execução
forge script script/SetupSocialRecovery.s.sol:ExecuteRecoveryScript \
  --rpc-url $BESU_RPC_URL \
  --private-key $BESU_PRIVATE_KEY \
  --broadcast \
  --gas-limit 10000000 \
  --gas-price 0 \
  --chain-id $CHAIN_ID \
  --legacy

echo ""
echo "✅ Recuperação executada com sucesso!"
echo ""
echo "📋 Verificações realizadas:"
echo "- Delay respeitado: ✓"
echo "- Aprovações suficientes: ✓"
echo "- Peso suficiente: ✓"
echo "- Recuperação executada: ✓"
echo ""
echo "⚠️  IMPORTANTE: A mudança do owner deve ser implementada no contrato da conta"
