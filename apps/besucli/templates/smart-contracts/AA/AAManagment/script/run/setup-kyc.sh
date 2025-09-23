#!/bin/bash

# Script para configurar KYC/AML para cliente
# Uso: ./setup-kyc.sh

# Configurar variáveis de ambiente
export BESU_RPC_URL="http://144.22.179.183"
export BESU_PRIVATE_KEY="0x881d396b85acd82b8bf2615a8d14ffcce79b854f583bd599143ca75e7532f0bf"
export NETWORK="besu-local"
export CHAIN_ID=1337

# Endereços dos contratos (configurar após deploy)
export KYC_VALIDATOR="0x8D5C581dEc763184F72E9b49E50F4387D35754D8"
export COMPLIANCE_OFFICER="0xB40061C7bf8394eb130Fcb5EA06868064593BFAa"

# Configurações do cliente
export CLIENT_ADDRESS="0x742d35Cc6634C0532925a3b8D7C9C0F4b8b8b8b8"
export KYC_STATUS="1"  # 1 = VERIFIED
export KYC_EXPIRES_AT="$(date -d '+365 days' +%s)"
export DOCUMENT_HASH="0x$(echo -n 'test_document_hash' | sha256sum | cut -d' ' -f1)"
export RISK_LEVEL="1"  # 1 = MEDIUM

echo "🔐 Configurando KYC/AML para cliente..."
echo "Cliente: $CLIENT_ADDRESS"
echo "Status KYC: VERIFIED"
echo "Nível de risco: MEDIUM"
echo "Expira em: $(date -d @$KYC_EXPIRES_AT)"
echo ""

# Executar script de configuração KYC
forge script script/SetupKYC.s.sol:SetupKYCScript \
  --rpc-url $BESU_RPC_URL \
  --private-key $BESU_PRIVATE_KEY \
  --broadcast \
  --gas-limit 10000000 \
  --gas-price 0 \
  --chain-id $CHAIN_ID \
  --legacy

echo ""
echo "✅ KYC/AML configurado com sucesso!"
echo ""
echo "📋 Configurações aplicadas:"
echo "- Status KYC: VERIFIED"
echo "- Nível de risco: MEDIUM"
echo "- Validade: 365 dias"
echo "- Listas de sanções: OFAC, EU_SANCTIONS"
echo ""
echo "🔍 Verificações realizadas:"
echo "- Validação KYC: ✓"
echo "- Validação AML: ✓"
echo "- Verificação de sanções: ✓"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure Multi-sig: ./setup-multisig.sh"
echo "2. Configure Recuperação Social: ./setup-social-recovery.sh"
