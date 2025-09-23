#!/bin/bash

# Script para criar conta AA para cliente
# Uso: ./create-client-account.sh

# Configurar variáveis de ambiente
export BESU_RPC_URL="http://144.22.179.183"
export BESU_PRIVATE_KEY="0x881d396b85acd82b8bf2615a8d14ffcce79b854f583bd599143ca75e7532f0bf"
export NETWORK="besu-local"
export CHAIN_ID=1337

# Endereços dos contratos (configurar após deploy)
export BANK_MANAGER="0xf60aa2e36e214f457b625e0cf9abd89029a0441e"
export BANK_ADMIN="0xB40061C7bf8394eb130Fcb5EA06868064593BFAa"

# Configurações do cliente (personalizar conforme necessário)
# Se não fornecido, usa endereço padrão
if [ -z "$1" ]; then
    export CLIENT_ADDRESS="0x17E5545B11b468072283Cee1F066a059Fb0dbF24"
    echo "Usando endereço padrão: $CLIENT_ADDRESS"
else
    export CLIENT_ADDRESS="$1"
    echo "Usando endereço fornecido: $CLIENT_ADDRESS"
fi

export BANK_ID="BRADESCO"
export SALT="231235"

# Limites da conta (em wei)
export DAILY_LIMIT="10000000000000000000000"      # 10,000 ETH
export WEEKLY_LIMIT="50000000000000000000000"     # 50,000 ETH
export MONTHLY_LIMIT="200000000000000000000000"   # 200,000 ETH
export TRANSACTION_LIMIT="5000000000000000000000" # 5,000 ETH
export MULTISIG_THRESHOLD="10000000000000000000000" # 10,000 ETH

# Configurações de compliance
export REQUIRES_KYC="true"
export REQUIRES_AML="true"
export RISK_LEVEL="2"

echo "Creating AA account for client..."
echo "Client: $CLIENT_ADDRESS"
echo "Bank ID: $BANK_ID"
echo "Salt: $SALT"
echo ""

# Executar script de criação de conta
forge script script/CreateClientAccount.s.sol:CreateClientAccountScript \
  --rpc-url $BESU_RPC_URL \
  --private-key $BESU_PRIVATE_KEY \
  --broadcast \
  --gas-limit 10000000 \
  --gas-price 0 \
  --chain-id $CHAIN_ID \
  --legacy

echo ""
echo "SUCCESS: Account created successfully!"
echo ""
echo "Next steps:"
echo "1. Configure KYC: ./setup-kyc.sh"
echo "2. Configure Multi-sig: ./setup-multisig.sh"
echo "3. Configure Social Recovery: ./setup-social-recovery.sh"
echo ""
echo "Variables saved:"
echo "export ACCOUNT_ADDRESS=\$(forge script script/CreateClientAccount.s.sol:CreateClientAccountScript --rpc-url $BESU_RPC_URL --chain-id $CHAIN_ID --sig 'run()' | grep 'export ACCOUNT_ADDRESS=' | cut -d'=' -f2)"
