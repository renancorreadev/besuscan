#!/bin/bash

# Script para aprovar recuperação social
# Uso: ./approve-recovery.sh

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
export GUARDIAN_ADDRESS="0x..."  # Endereço do guardião

echo "✅ Aprovando recuperação social..."
echo "Conta: $ACCOUNT_ADDRESS"
echo "Solicitação: $RECOVERY_REQUEST_ID"
echo "Guardião: $GUARDIAN_ADDRESS"
echo ""

# Executar script de aprovação
forge script script/SetupSocialRecovery.s.sol:ApproveRecoveryScript \
  --rpc-url $BESU_RPC_URL \
  --private-key $BESU_PRIVATE_KEY \
  --broadcast \
  --gas-limit 5000000 \
  --gas-price 0 \
  --chain-id $CHAIN_ID \
  --legacy

echo ""
echo "✅ Recuperação aprovada com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Verificar se pode executar: ./check-recovery-status.sh"
echo "2. Executar recuperação: ./execute-recovery.sh"
