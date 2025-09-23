# 🛠️ Comandos Úteis - Sistema AA Banking

## 📋 Comandos de Verificação

### **Verificar Status dos Contratos**
```bash
# Verificar se o AABankManager está funcionando
cast call 0xF60AA2e36e214F457B625e0CF9abd89029A0441e "totalAccounts()" --rpc-url http://144.22.179.183

# Verificar contas ativas
cast call 0xF60AA2e36e214F457B625e0CF9abd89029A0441e "activeAccounts()" --rpc-url http://144.22.179.183

# Verificar limites globais
cast call 0xF60AA2e36e214F457B625e0CF9abd89029A0441e "globalLimits()" --rpc-url http://144.22.179.183
```

### **Verificar Código dos Contratos**
```bash
# Verificar se o código existe
cast code 0xF60AA2e36e214F457B625e0CF9abd89029A0441e --rpc-url http://144.22.179.183

# Verificar tamanho do código
cast code 0xF60AA2e36e214F457B625e0CF9abd89029A0441e --rpc-url http://144.22.179.183 | wc -c
```

---

## 🔧 Comandos de Interação

### **Criar Nova Conta Bancária**
```bash
# Criar conta para um usuário
cast send 0xF60AA2e36e214F457B625e0CF9abd89029A0441e \
  "createAccount(address,bytes32)" \
  0x1234567890123456789012345678901234567890 \
  0x1234567890123456789012345678901234567890123456789012345678901234 \
  --rpc-url http://144.22.179.183 \
  --private-key $BESU_PRIVATE_KEY
```

### **Verificar Informações da Conta**
```bash
# Obter informações de uma conta
cast call 0xF60AA2e36e214F457B625e0CF9abd89029A0441e \
  "getAccountInfo(address)" \
  0x1234567890123456789012345678901234567890 \
  --rpc-url http://144.22.179.183
```

### **Verificar Validação KYC**
```bash
# Verificar se usuário tem KYC válido
cast call 0x8D5C581dEc763184F72E9b49E50F4387D35754D8 \
  "isKYCValid(address)" \
  0x1234567890123456789012345678901234567890 \
  --rpc-url http://144.22.179.183
```

---

## 📊 Comandos de Monitoramento

### **Verificar Estatísticas do Sistema**
```bash
# Obter estatísticas completas
cast call 0xF60AA2e36e214F457B625e0CF9abd89029A0441e \
  "getSystemStats()" \
  --rpc-url http://144.22.179.183
```

### **Verificar Uso de Limites**
```bash
# Verificar uso diário de um usuário
cast call 0x3416B85fDD6cC143AEE2d3cCD7228d7CB22b564a \
  "getDailyUsage(address)" \
  0x1234567890123456789012345678901234567890 \
  --rpc-url http://144.22.179.183

# Verificar uso semanal
cast call 0x3416B85fDD6cC143AEE2d3cCD7228d7CB22b564a \
  "getWeeklyUsage(address)" \
  0x1234567890123456789012345678901234567890 \
  --rpc-url http://144.22.179.183
```

---

## 🔍 Comandos de Debug

### **Verificar Logs de Transação**
```bash
# Obter logs de uma transação específica
cast logs --from-block 1759016 --to-block 1759016 \
  --address 0xF60AA2e36e214F457B625e0CF9abd89029A0441e \
  --rpc-url http://144.22.179.183
```

### **Verificar Eventos de um Contrato**
```bash
# Verificar eventos do AABankManager
cast logs --from-block 1759016 --to-block latest \
  --address 0xF60AA2e36e214F457B625e0CF9abd89029A0441e \
  --rpc-url http://144.22.179.183
```

---

## 🚀 Comandos de Deploy Adicional

### **Configurar Bancos Iniciais**
```bash
cd /root/eth/explorer/apps/besucli/templates/smart-contracts/AA/AAManagment

forge script script/DeployAABanking.s.sol:SetupBanksScript \
  --rpc-url http://144.22.179.183 \
  --private-key $BESU_PRIVATE_KEY \
  --broadcast \
  --gas-limit 10000000 \
  --gas-price 0 \
  --chain-id 1337
```

### **Verificar Sistema Completo**
```bash
forge script script/DeployAABanking.s.sol:VerifySystemScript \
  --rpc-url http://144.22.179.183 \
  --private-key $BESU_PRIVATE_KEY \
  --chain-id 1337
```

---

## 📱 Comandos de Integração Frontend

### **JavaScript/TypeScript**
```javascript
// Importar configuração
import { AA_BANKING_CONFIG, AABANK_MANAGER_ABI } from './config.js';

// Configurar provider
const provider = new ethers.JsonRpcProvider(AA_BANKING_CONFIG.network.rpcUrl);

// Criar instância do contrato
const bankManager = new ethers.Contract(
  AA_BANKING_CONFIG.contracts.bankManager,
  AABANK_MANAGER_ABI,
  provider
);

// Obter estatísticas
const stats = await bankManager.getSystemStats();
console.log('Total de contas:', stats[0].toString());
```

### **Python**
```python
from web3 import Web3

# Configurar conexão
w3 = Web3(Web3.HTTPProvider('http://144.22.179.183'))

# Endereço do contrato
bank_manager_address = '0xF60AA2e36e214F457B625e0CF9abd89029A0441e'

# ABI básico
abi = [
    {
        "inputs": [],
        "name": "totalAccounts",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]

# Criar contrato
contract = w3.eth.contract(address=bank_manager_address, abi=abi)

# Obter total de contas
total_accounts = contract.functions.totalAccounts().call()
print(f'Total de contas: {total_accounts}')
```

---

## 🔐 Comandos de Segurança

### **Verificar Permissões**
```bash
# Verificar se endereço tem role específica
cast call 0xF60AA2e36e214F457B625e0CF9abd89029A0441e \
  "hasRole(bytes32,address)" \
  0xba1a883b1996d6c6eb1453004dbd6339bd388f2a040a948857837ab0181a84ea \
  0xB40061C7bf8394eb130Fcb5EA06868064593BFAa \
  --rpc-url http://144.22.179.183
```

### **Verificar Saldo da Conta Deployer**
```bash
cast balance 0xB40061C7bf8394eb130Fcb5EA06868064593BFAa --rpc-url http://144.22.179.183
```

---

## 📈 Comandos de Performance

### **Verificar Gas Usado**
```bash
# Verificar gas usado em uma transação específica
cast tx 0x22232a5cab78ddda276b6da1ab3d7712347b7602da4a6fa5ec8d4e5ea17363ac --rpc-url http://144.22.179.183
```

### **Verificar Bloco Atual**
```bash
cast block-number --rpc-url http://144.22.179.183
```

---

## 🎯 Script de Verificação Automática

Execute o script de verificação completo:
```bash
cd /root/eth/explorer/apps/besucli/templates/smart-contracts/AA/AAManagment/deployed
./verify-deployment.sh
```

Este script verificará:
- ✅ Existência dos contratos
- ✅ Código dos contratos
- ✅ Funcionalidades básicas
- ✅ Conectividade da rede
- ✅ Estatísticas do sistema
