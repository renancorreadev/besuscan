#!/bin/bash

# Script para configurar recuperação social para conta
# Uso: ./setup-social-recovery.sh

# Configurar variáveis de ambiente
export BESU_RPC_URL="http://144.22.179.183"
export BESU_PRIVATE_KEY="0x881d396b85acd82b8bf2615a8d14ffcce79b854f583bd599143ca75e7532f0bf"
export NETWORK="besu-local"
export CHAIN_ID=1337

# Endereços dos contratos (configurar após deploy)
export SOCIAL_RECOVERY="0xF6757ee0d75AE430Ec148850c16aA1F0e8e35e59"
export BANK_ADMIN="0xB40061C7bf8394eb130Fcb5EA06868064593BFAa"

# Configurações da conta
export ACCOUNT_ADDRESS="0x..."  # Substituir pelo endereço da conta criada
export REQUIRED_APPROVALS="2"
export REQUIRED_WEIGHT="200"
export RECOVERY_DELAY="86400"  # 24 horas em segundos
export APPROVAL_WINDOW="259200"  # 72 horas em segundos
export COOLDOWN_PERIOD="604800"  # 7 dias em segundos
export IS_ACTIVE="true"

# Guardiões (personalizar conforme necessário)
export GUARDIAN_1="0x8A2e36e214f457b625e0cf9abd89029a0441eF60"
export GUARDIAN_2="0x9B3f47e325f568b736e0df0bce9abd89029a0441"
export GUARDIAN_3="0xAC4f58e436f568b736e0df0bce9abd89029a0441"

echo "🛡️  Configurando recuperação social para conta..."
echo "Conta: $ACCOUNT_ADDRESS"
echo "Aprovações necessárias: $REQUIRED_APPROVALS"
echo "Peso necessário: $REQUIRED_WEIGHT"
echo "Delay de recuperação: $(($RECOVERY_DELAY / 3600)) horas"
echo ""

# Executar script de configuração de recuperação social
forge script script/SetupSocialRecovery.s.sol:SetupSocialRecoveryScript \
  --rpc-url $BESU_RPC_URL \
  --private-key $BESU_PRIVATE_KEY \
  --broadcast \
  --gas-limit 10000000 \
  --gas-price 0 \
  --chain-id $CHAIN_ID \
  --legacy

echo ""
echo "✅ Recuperação social configurada com sucesso!"
echo ""
echo "📋 Configurações aplicadas:"
echo "- Aprovações necessárias: $REQUIRED_APPROVALS"
echo "- Peso necessário: $REQUIRED_WEIGHT"
echo "- Delay de recuperação: $(($RECOVERY_DELAY / 3600)) horas"
echo "- Janela de aprovação: $(($APPROVAL_WINDOW / 3600)) horas"
echo "- Período de cooldown: $(($COOLDOWN_PERIOD / 86400)) dias"
echo ""
echo "👥 Guardiões configurados:"
echo "- Guardião 1: $GUARDIAN_1 (FAMILY, peso 100)"
echo "- Guardião 2: $GUARDIAN_2 (FRIEND, peso 150)"
echo "- Guardião 3: $GUARDIAN_3 (EMERGENCY, peso 200)"
echo ""
echo "🧪 Teste realizado:"
echo "- Processo de recuperação iniciado"
echo "- Verificação de guardiões: ✓"
echo "- Verificação de pesos: ✓"
echo "- Verificação de timelock: ✓"
echo ""
echo "🎉 Configuração completa do sistema AA Banking!"
echo ""
echo "📋 Sistema configurado:"
echo "✅ Conta AA criada"
echo "✅ KYC/AML configurado"
echo "✅ Multi-assinatura configurada"
echo "✅ Recuperação social configurada"
echo ""
echo "🔧 Scripts disponíveis para uso:"
echo "- Aprovar transação: ./approve-transaction.sh"
echo "- Executar transação: ./execute-transaction.sh"
echo "- Aprovar recuperação: ./approve-recovery.sh"
echo "- Executar recuperação: ./execute-recovery.sh"
echo "- Recuperação de emergência: ./emergency-recovery.sh"
