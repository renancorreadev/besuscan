#!/bin/bash

# Script para aprovar transação multi-sig
# Uso: ./approve-transaction.sh

# Configurar variáveis de ambiente
export BESU_RPC_URL="http://144.22.179.183"
export BESU_PRIVATE_KEY="0x881d396b85acd82b8bf2615a8d14ffcce79b854f583bd599143ca75e7532f0bf"
export NETWORK="besu-local"
export CHAIN_ID=1337

# Endereços dos contratos
export MULTISIG_VALIDATOR="0x29209C1392b7ebe91934Ee9Ef4C57116761286F8"

# Configurações da transação
export ACCOUNT_ADDRESS="0x..."  # Endereço da conta
export TRANSACTION_HASH="0x..."  # Hash da transação a ser aprovada
export SIGNER_ADDRESS="0x..."  # Endereço do signatário

echo "✅ Aprovando transação multi-sig..."
echo "Conta: $ACCOUNT_ADDRESS"
echo "Transação: $TRANSACTION_HASH"
echo "Signatário: $SIGNER_ADDRESS"
echo ""

# Executar script de aprovação
forge script script/SetupMultiSig.s.sol:ApproveTransactionScript \
  --rpc-url $BESU_RPC_URL \
  --private-key $BESU_PRIVATE_KEY \
  --broadcast \
  --gas-limit 5000000 \
  --gas-price 0 \
  --chain-id $CHAIN_ID \
  --legacy

echo ""
echo "✅ Transação aprovada com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Verificar se pode executar: ./check-transaction-status.sh"
echo "2. Executar transação: ./execute-transaction.sh"
