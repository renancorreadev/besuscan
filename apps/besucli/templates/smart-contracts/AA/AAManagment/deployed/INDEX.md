# 📚 Índice - Sistema AA Banking Deployado

## 🎯 Visão Geral
Sistema AA Banking deployado com sucesso na rede Besu Local (Chain ID: 1337) em 25 de Janeiro de 2025.

---

## 📁 Estrutura de Arquivos

### 📖 Documentação
- **[README.md](./README.md)** - Documentação completa do deploy
- **[CHANGELOG.md](./CHANGELOG.md)** - Histórico de mudanças e versões
- **[INDEX.md](./INDEX.md)** - Este arquivo de índice

### ⚙️ Configuração
- **[addresses.json](./addresses.json)** - Endereços e configurações em JSON
- **[config.js](./config.js)** - Configuração para integração frontend

### 🛠️ Utilitários
- **[commands.md](./commands.md)** - Comandos úteis para interação
- **[verify-deployment.sh](./verify-deployment.sh)** - Script de verificação automática

---

## 🚀 Início Rápido

### 1. **Verificar Deploy**
```bash
cd deployed
./verify-deployment.sh
```

### 2. **Verificar Status do Sistema**
```bash
cast call 0xF60AA2e36e214F457B625e0CF9abd89029A0441e "totalAccounts()" --rpc-url http://144.22.179.183
```

### 3. **Integrar no Frontend**
```javascript
import { AA_BANKING_CONFIG } from './config.js';
// Usar AA_BANKING_CONFIG.contracts.bankManager
```

---

## 🏦 Contratos Principais

| Contrato | Endereço | Descrição |
|----------|----------|-----------|
| **AABankManager** | `0xF60AA2e36e214F457B625e0CF9abd89029A0441e` | Contrato principal de gerenciamento |
| **EntryPoint** | `0xdB226C0C56fDE2A974B11bD3fFc481Da9e803912` | EntryPoint para ERC-4337 |
| **AABankAccount** | `0x524db0420D1B8C3870933D1Fddac6bBaa63C2Ca6` | Implementação das contas bancárias |

## 🔐 Contratos de Validação

| Contrato | Endereço | Descrição |
|----------|----------|-----------|
| **KYCAMLValidator** | `0x8D5C581dEc763184F72E9b49E50F4387D35754D8` | Validação KYC/AML |
| **TransactionLimits** | `0x3416B85fDD6cC143AEE2d3cCD7228d7CB22b564a` | Limites de transação |
| **MultiSignatureValidator** | `0x29209C1392b7ebe91934Ee9Ef4C57116761286F8` | Validação multi-assinatura |

## 🛡️ Contratos de Suporte

| Contrato | Endereço | Descrição |
|----------|----------|-----------|
| **SocialRecovery** | `0xF6757ee0d75AE430Ec148850c16aA1F0e8e35e59` | Recuperação social |
| **AuditLogger** | `0x6C59E8111D3D59512e39552729732bC09549daF8` | Logs de auditoria |

---

## 📊 Configurações do Sistema

### **Limites Globais**
- **Daily Limit**: 10,000 ETH
- **Weekly Limit**: 50,000 ETH
- **Monthly Limit**: 200,000 ETH
- **Transaction Limit**: 5,000 ETH
- **MultiSig Threshold**: 10,000 ETH

### **Thresholds de Risco**
- **Low Risk**: 20
- **Medium Risk**: 50
- **High Risk**: 80
- **Critical Risk**: 100

### **Configurações de Velocidade**
- **Velocity Limit**: 10 transações
- **Velocity Window**: 1 hora
- **KYC Validity**: 365 dias

---

## 🔧 Comandos Essenciais

### **Verificar Sistema**
```bash
# Verificar total de contas
cast call 0xF60AA2e36e214F457B625e0CF9abd89029A0441e "totalAccounts()" --rpc-url http://144.22.179.183

# Verificar contas ativas
cast call 0xF60AA2e36e214F457B625e0CF9abd89029A0441e "activeAccounts()" --rpc-url http://144.22.179.183

# Verificar limites globais
cast call 0xF60AA2e36e214F457B625e0CF9abd89029A0441e "globalLimits()" --rpc-url http://144.22.179.183
```

### **Criar Conta Bancária**
```bash
cast send 0xF60AA2e36e214F457B625e0CF9abd89029A0441e \
  "createAccount(address,bytes32)" \
  0x1234567890123456789012345678901234567890 \
  0x1234567890123456789012345678901234567890123456789012345678901234 \
  --rpc-url http://144.22.179.183 \
  --private-key $BESU_PRIVATE_KEY
```

---

## 📱 Integração Frontend

### **JavaScript/TypeScript**
```javascript
import { AA_BANKING_CONFIG, AABANK_MANAGER_ABI } from './config.js';

const provider = new ethers.JsonRpcProvider(AA_BANKING_CONFIG.network.rpcUrl);
const bankManager = new ethers.Contract(
  AA_BANKING_CONFIG.contracts.bankManager,
  AABANK_MANAGER_ABI,
  provider
);
```

### **Python**
```python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('http://144.22.179.183'))
bank_manager_address = '0xF60AA2e36e214F457B625e0CF9abd89029A0441e'
```

---

## 🔍 Verificação e Monitoramento

### **Script de Verificação**
```bash
./verify-deployment.sh
```

### **Verificar Logs**
```bash
cast logs --from-block 1759016 --to-block latest \
  --address 0xF60AA2e36e214F457B625e0CF9abd89029A0441e \
  --rpc-url http://144.22.179.183
```

---

## 📞 Suporte e Recursos

### **Documentação**
- [README.md](./README.md) - Documentação completa
- [commands.md](./commands.md) - Comandos úteis
- [CHANGELOG.md](./CHANGELOG.md) - Histórico de versões

### **Configuração**
- [addresses.json](./addresses.json) - Endereços em JSON
- [config.js](./config.js) - Configuração para frontend

### **Utilitários**
- [verify-deployment.sh](./verify-deployment.sh) - Verificação automática

---

## 🎉 Status do Deploy

- ✅ **Deploy Completo**: 8 contratos deployados
- ✅ **Configuração**: Roles e limites configurados
- ✅ **Verificação**: Sistema testado e funcional
- ✅ **Documentação**: Completa e atualizada
- ✅ **Pronto para Uso**: Sistema operacional

---

**Sistema AA Banking deployado com sucesso! 🚀**
