# Configurar variáveis de ambiente
export BESU_RPC_URL="http://144.22.179.183"
export BESU_PRIVATE_KEY="0x881d396b85acd82b8bf2615a8d14ffcce79b854f583bd599143ca75e7532f0bf"
export NETWORK="besu-local"
export CHAIN_ID=1337

# Compilar com 200 runs de otimização
# forge build --optimize --optimizer-runs 200

# # Deploy do script principal com gas limit maior e sem verificação
# forge script script/DeployAABanking.s.sol:DeployAABankingScript \
#   --rpc-url $BESU_RPC_URL \
#   --private-key $BESU_PRIVATE_KEY \
#   --broadcast \
#   --gas-limit 30000000 \
#   --gas-price 0 \
#   --chain-id $CHAIN_ID \
#   --legacy

# echo "✅ Deploy concluído! Configurando Banco Bradesco..."

# Configurar endereços dos contratos deployados (pegar do output do deploy)
export BANK_MANAGER="0xf60aa2e36e214f457b625e0cf9abd89029a0441e"  # Endereço do AABankManager
export BANK_ADMIN="0xB40061C7bf8394eb130Fcb5EA06868064593BFAa"     # Mesmo do BESU_PRIVATE_KEY

# Setup do banco Bradesco
forge script script/DeployAABanking.s.sol:SetupBanksScript \
  --rpc-url $BESU_RPC_URL \
  --private-key $BESU_PRIVATE_KEY \
  --broadcast \
  --gas-limit 10000000 \
  --gas-price 0 \
  --chain-id $CHAIN_ID \
  --legacy

echo "SUCCESS: Banco Bradesco configurado! Agora voce pode criar contas usando:"
echo ""
echo "EXEMPLO - Criar conta no Bradesco:"
echo "cast send $BANK_MANAGER \\"
echo "  \"createBankAccount(address,bytes32,uint256,bytes)\" \\"
echo "  0x742d35Cc6634C0532925a3b8D7C9C0F4b8b8b8b8 \\"
echo "  0x4252414445534355000000000000000000000000000000000000000000000000 \\"
echo "  12345 \\"
echo "  0x000000000000000000000000000000000000000000000000021e19e0c9bab2400000000000000000000000000000000000000000000000000ad78ebc5ac6200000000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000000000000000000000000000010f0cf064dd59200000000000000000000000000000000000000000000000000021e19e0c9bab240000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000001 \\"
echo "  --rpc-url $BESU_RPC_URL \\"
echo "  --private-key $BESU_PRIVATE_KEY \\"
echo "  --gas-limit 5000000 \\"
echo "  --gas-price 0 \\"
echo "  --legacy"
echo ""
echo "ID do Banco Bradesco:"
echo "- BRADESCO: 0x4252414445534355000000000000000000000000000000000000000000000000"
echo ""
echo "Verificar sistema:"
echo "forge script script/DeployAABanking.s.sol:VerifySystemScript \\"
echo "  --rpc-url $BESU_RPC_URL \\"
echo "  --chain-id $CHAIN_ID"
