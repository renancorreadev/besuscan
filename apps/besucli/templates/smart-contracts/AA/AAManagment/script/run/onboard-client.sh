#!/bin/bash

# Script completo para onboarding de cliente bancário
# Uso: ./onboard-client.sh <CLIENT_NAME> [CLIENT_ADDRESS]

# Configurar variáveis de ambiente
export BESU_RPC_URL="http://144.22.179.183"
export BESU_PRIVATE_KEY="0x881d396b85acd82b8bf2615a8d14ffcce79b854f583bd599143ca75e7532f0bf"
export CHAIN_ID=1337

# Verificar se o nome do cliente foi fornecido
if [ -z "$1" ]; then
    echo "ERRO: Forneca o nome do cliente"
    echo "Uso: ./onboard-client.sh <CLIENT_NAME> [CLIENT_ADDRESS]"
    echo "Exemplo: ./onboard-client.sh JoaoSilva"
    echo "Exemplo: ./onboard-client.sh JoaoSilva 0x742d35Cc6634C0532925a3b8D7C9C0F4b8b8b8b8"
    exit 1
fi

CLIENT_NAME=$1
CLIENT_ADDRESS=$2

echo "=========================================="
echo "ONBOARDING DE CLIENTE BANCÁRIO"
echo "=========================================="
echo "Cliente: $CLIENT_NAME"
echo ""

# 1. Verificar se cliente já tem EOA
if [ -z "$CLIENT_ADDRESS" ]; then
    echo "1. Cliente não possui EOA. Criando novo EOA..."
    ./create-eoa-for-client.sh $CLIENT_NAME

    # Carregar endereço criado
    source client-keys/$CLIENT_NAME.env
    CLIENT_ADDRESS=$CLIENT_ADDRESS
    echo "   EOA criado: $CLIENT_ADDRESS"
else
    echo "1. Cliente já possui EOA: $CLIENT_ADDRESS"
fi
echo ""

# 2. Criar conta AA
echo "2. Criando conta AA para o cliente..."
./create-client-account.sh $CLIENT_ADDRESS

# Carregar endereço da conta AA criada
ACCOUNT_ADDRESS=$(forge script script/CreateClientAccount.s.sol:CreateClientAccountScript --rpc-url $BESU_RPC_URL --chain-id $CHAIN_ID --sig 'run()' | grep 'export ACCOUNT_ADDRESS=' | cut -d'=' -f2 | tr -d ' ')

if [ -z "$ACCOUNT_ADDRESS" ]; then
    echo "❌ Erro ao obter endereço da conta AA"
    exit 1
fi

echo "   Conta AA criada: $ACCOUNT_ADDRESS"
echo ""

# 3. Configurar KYC
echo "3. Configurando KYC..."
./setup-kyc.sh
echo ""

# 4. Configurar Multi-sig
echo "4. Configurando Multi-sig..."
./setup-multisig.sh
echo ""

# 5. Configurar Social Recovery
echo "5. Configurando Social Recovery..."
./setup-social-recovery.sh
echo ""

# 6. Salvar informações do cliente
echo "6. Salvando informações do cliente..."
mkdir -p client-accounts
cat > client-accounts/$CLIENT_NAME.json << EOF
{
    "clientName": "$CLIENT_NAME",
    "clientAddress": "$CLIENT_ADDRESS",
    "accountAddress": "$ACCOUNT_ADDRESS",
    "bankId": "BRADESCO",
    "createdAt": "$(date -Iseconds)",
    "status": "ACTIVE",
    "kycStatus": "PENDING",
    "multisigStatus": "PENDING",
    "socialRecoveryStatus": "PENDING"
}
EOF

echo "✅ Informações salvas em: client-accounts/$CLIENT_NAME.json"
echo ""

# 7. Mostrar resumo
echo "=========================================="
echo "ONBOARDING CONCLUÍDO!"
echo "=========================================="
echo "Cliente: $CLIENT_NAME"
echo "EOA: $CLIENT_ADDRESS"
echo "Conta AA: $ACCOUNT_ADDRESS"
echo "Banco: BRADESCO"
echo ""
echo "Próximos passos:"
echo "1. Cliente deve guardar a chave privada com segurança"
echo "2. Configurar KYC com documentos reais"
echo "3. Configurar guardiões para Social Recovery"
echo "4. Testar transações na conta AA"
echo ""
echo "Comandos úteis:"
echo "- Consultar conta: ./query-account-clean.sh $ACCOUNT_ADDRESS"
echo "- Executar transação: ./interact-account.sh $ACCOUNT_ADDRESS <target> <function>"
echo "=========================================="
