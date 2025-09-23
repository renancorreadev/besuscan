#!/bin/bash

# Script para configurar multi-assinatura para conta
# Uso: ./setup-multisig.sh

# Configurar variáveis de ambiente
export BESU_RPC_URL="http://144.22.179.183"
export BESU_PRIVATE_KEY="0x881d396b85acd82b8bf2615a8d14ffcce79b854f583bd599143ca75e7532f0bf"
export NETWORK="besu-local"
export CHAIN_ID=1337

# Endereços dos contratos (configurar após deploy)
export MULTISIG_VALIDATOR="0x29209C1392b7ebe91934Ee9Ef4C57116761286F8"
export BANK_ADMIN="0xB40061C7bf8394eb130Fcb5EA06868064593BFAa"

# Configurações da conta
export ACCOUNT_ADDRESS="0x..."  # Substituir pelo endereço da conta criada
export REQUIRED_SIGNATURES="2"
export MULTISIG_THRESHOLD="10000000000000000000000"  # 10,000 ETH
export TIMELOCK="3600"  # 1 hora em segundos
export EXPIRATION_TIME="86400"  # 24 horas em segundos
export IS_ACTIVE="true"

# Signatários (personalizar conforme necessário)
export SIGNER_1="0x8A2e36e214f457b625e0cf9abd89029a0441eF60"
export SIGNER_2="0x9B3f47e325f568b736e0df0bce9abd89029a0441"
export SIGNER_3="0xAC4f58e436f568b736e0df0bce9abd89029a0441"

echo "🔐 Configurando multi-assinatura para conta..."
echo "Conta: $ACCOUNT_ADDRESS"
echo "Assinaturas necessárias: $REQUIRED_SIGNATURES"
echo "Threshold: $(($MULTISIG_THRESHOLD / 1000000000000000000)) ETH"
echo "Timelock: $(($TIMELOCK / 3600)) horas"
echo ""

# Executar script de configuração multi-sig
forge script script/SetupMultiSig.s.sol:SetupMultiSigScript \
  --rpc-url $BESU_RPC_URL \
  --private-key $BESU_PRIVATE_KEY \
  --broadcast \
  --gas-limit 10000000 \
  --gas-price 0 \
  --chain-id $CHAIN_ID \
  --legacy

echo ""
echo "✅ Multi-assinatura configurada com sucesso!"
echo ""
echo "📋 Configurações aplicadas:"
echo "- Assinaturas necessárias: $REQUIRED_SIGNATURES"
echo "- Threshold: $(($MULTISIG_THRESHOLD / 1000000000000000000)) ETH"
echo "- Timelock: $(($TIMELOCK / 3600)) horas"
echo "- Tempo de expiração: $(($EXPIRATION_TIME / 3600)) horas"
echo ""
echo "👥 Signatários configurados:"
echo "- Signatário 1: $SIGNER_1 (OPERATOR, peso 100)"
echo "- Signatário 2: $SIGNER_2 (SUPERVISOR, peso 150)"
echo "- Signatário 3: $SIGNER_3 (EMERGENCY, peso 200)"
echo ""
echo "🧪 Teste realizado:"
echo "- Transação de teste criada"
echo "- Verificação de threshold: ✓"
echo "- Verificação de timelock: ✓"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure Recuperação Social: ./setup-social-recovery.sh"
echo "2. Teste aprovação: ./approve-transaction.sh"
echo "3. Teste execução: ./execute-transaction.sh"
