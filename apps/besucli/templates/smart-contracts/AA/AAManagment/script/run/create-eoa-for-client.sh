#!/bin/bash

# Script para criar EOA para cliente que não tem carteira
# Uso: ./create-eoa-for-client.sh <CLIENT_NAME>

# Configurar variáveis de ambiente
export BESU_RPC_URL="http://144.22.179.183"
export BESU_PRIVATE_KEY="0x881d396b85acd82b8bf2615a8d14ffcce79b854f583bd599143ca75e7532f0bf"
export CHAIN_ID=1337

# Verificar se o nome do cliente foi fornecido
if [ -z "$1" ]; then
    echo "ERRO: Forneca o nome do cliente"
    echo "Uso: ./create-eoa-for-client.sh <CLIENT_NAME>"
    echo "Exemplo: ./create-eoa-for-client.sh JoaoSilva"
    exit 1
fi

CLIENT_NAME=$1

echo "=========================================="
echo "Criando EOA para Cliente: $CLIENT_NAME"
echo "=========================================="
echo ""

# 1. Gerar nova chave privada e endereço
echo "1. Gerando nova chave privada e endereço..."
NEW_PRIVATE_KEY=$(openssl rand -hex 32)
NEW_ADDRESS=$(cast wallet address $NEW_PRIVATE_KEY)

echo "✅ EOA criado com sucesso!"
echo "   Endereço: $NEW_ADDRESS"
echo "   Chave Privada: $NEW_PRIVATE_KEY"
echo ""

# 2. Salvar em arquivo seguro
echo "2. Salvando credenciais..."
mkdir -p client-keys
echo "CLIENT_NAME=$CLIENT_NAME" > client-keys/$CLIENT_NAME.env
echo "CLIENT_ADDRESS=$NEW_ADDRESS" >> client-keys/$CLIENT_NAME.env
echo "CLIENT_PRIVATE_KEY=$NEW_PRIVATE_KEY" >> client-keys/$CLIENT_NAME.env
echo "CREATED_AT=$(date)" >> client-keys/$CLIENT_NAME.env

echo "✅ Credenciais salvas em: client-keys/$CLIENT_NAME.env"
echo ""

# 3. Mostrar próximos passos
echo "3. Próximos passos:"
echo "   a) Compartilhar endereço com o cliente: $NEW_ADDRESS"
echo "   b) Cliente deve guardar a chave privada com segurança"
echo "   c) Criar conta AA: ./create-client-account.sh $NEW_ADDRESS"
echo ""

# 4. Mostrar comando para criar conta AA
echo "4. Comando para criar conta AA:"
echo "   export CLIENT_ADDRESS=\"$NEW_ADDRESS\""
echo "   ./create-client-account.sh"
echo ""

echo "=========================================="
echo "EOA criado com sucesso!"
echo "=========================================="
