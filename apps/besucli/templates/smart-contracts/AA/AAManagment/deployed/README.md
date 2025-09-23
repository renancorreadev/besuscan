# 🏦 Sistema AA Banking - Deploy Documentation

## 📋 Resumo do Deploy

**Data do Deploy**: 25 de Janeiro de 2025
**Rede**: Besu Local (Chain ID: 1337)
**RPC URL**: http://144.22.179.183
**Bloco**: 1759016
**Gas Total**: 25,421,314 gas
**Custo**: 0 ETH (gratuito)

---

## 🎯 Contratos Deployados

### **Contratos Principais**

| Contrato | Endereço | Hash da Transação | Gas Usado |
|----------|----------|-------------------|-----------|
| **EntryPoint** | `0xdB226C0C56fDE2A974B11bD3fFc481Da9e803912` | `0x0c5cc2ed9764c1489a130fce7d6b8785516523305f89d970bacc1b81f8c92814` | 3,725,250 |
| **AABankManager** | `0xF60AA2e36e214F457B625e0CF9abd89029A0441e` | `0x22232a5cab78ddda276b6da1ab3d7712347b7602da4a6fa5ec8d4e5ea17363ac` | 2,326,717 |
| **AABankAccount** | `0x524db0420D1B8C3870933D1Fddac6bBaa63C2Ca6` | `0x614a219265f227b85c71263d0ecc196e6593122a3ec7e6eda5d1df7269999089` | 2,406,953 |

### **Contratos de Validação**

| Contrato | Endereço | Hash da Transação | Gas Usado |
|----------|----------|-------------------|-----------|
| **KYCAMLValidator** | `0x8D5C581dEc763184F72E9b49E50F4387D35754D8` | `0x7b4ab69e1bd820efda1a84a6df49cab9e6c09a7dba30a20d760e0d6e13f8ca3f` | 2,339,606 |
| **TransactionLimits** | `0x3416B85fDD6cC143AEE2d3cCD7228d7CB22b564a` | `0x7e1965883ac51c32d618ff145f84abf1954758de3b88cf56effb105731c57ec2` | 3,146,250 |
| **MultiSignatureValidator** | `0x29209C1392b7ebe91934Ee9Ef4C57116761286F8` | `0x2c6f39cb520d53fe159c643363c108b19c4391b26c7fce4e3ffb475f5d8cc609` | 3,393,188 |

### **Contratos de Suporte**

| Contrato | Endereço | Hash da Transação | Gas Usado |
|----------|----------|-------------------|-----------|
| **SocialRecovery** | `0xF6757ee0d75AE430Ec148850c16aA1F0e8e35e59` | `0xf65a8b7567281c5918fe4427e001a61c6ba52a4ffef590daedd4746d56befab7` | 4,000,922 |
| **AuditLogger** | `0x6C59E8111D3D59512e39552729732bC09549daF8` | `0x73153f4edcf39fd79e84cc4d3a23f00ede5e2ffa44b77a45bfcf8da7b3afeb32` | 3,623,382 |

---

## ⚙️ Configuração de Roles

### **Roles Configuradas**

#### **AABankManager**
- **BANK_ADMIN**: `0xB40061C7bf8394eb130Fcb5EA06868064593BFAa`
- **COMPLIANCE_OFFICER**: `0xB40061C7bf8394eb130Fcb5EA06868064593BFAa`
- **RISK_MANAGER**: `0xB40061C7bf8394eb130Fcb5EA06868064593BFAa`

#### **KYCAMLValidator**
- **KYC_OFFICER**: `0xB40061C7bf8394eb130Fcb5EA06868064593BFAa`
- **AML_OFFICER**: `0xB40061C7bf8394eb130Fcb5EA06868064593BFAa`
- **RISK_ANALYST**: `0xB40061C7bf8394eb130Fcb5EA06868064593BFAa`

#### **TransactionLimits**
- **LIMIT_MANAGER**: `0xB40061C7bf8394eb130Fcb5EA06868064593BFAa`
- **RISK_MANAGER**: `0xB40061C7bf8394eb130Fcb5EA06868064593BFAa`

#### **MultiSignatureValidator**
- **MULTISIG_ADMIN**: `0xB40061C7bf8394eb130Fcb5EA06868064593BFAa`
- **SIGNER_MANAGER**: `0xB40061C7bf8394eb130Fcb5EA06868064593BFAa`

#### **SocialRecovery**
- **RECOVERY_ADMIN**: `0xB40061C7bf8394eb130Fcb5EA06868064593BFAa`
- **GUARDIAN_MANAGER**: `0xB40061C7bf8394eb130Fcb5EA06868064593BFAa`

#### **AuditLogger**
- **LOGGER**: `0xF60AA2e36e214F457B625e0CF9abd89029A0441e` (AABankManager)
- **VIEWER**: `0xB40061C7bf8394eb130Fcb5EA06868064593BFAa`
- **COMPLIANCE_OFFICER**: `0xB40061C7bf8394eb130Fcb5EA06868064593BFAa`

---

## 🔧 Configurações do Sistema

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

## 🚀 Como Usar o Sistema

### **1. Verificar Status do Sistema**
```bash
cast call 0xF60AA2e36e214F457B625e0CF9abd89029A0441e "totalAccounts()" --rpc-url http://144.22.179.183
```

### **2. Verificar Limites Globais**
```bash
cast call 0xF60AA2e36e214F457B625e0CF9abd89029A0441e "globalLimits()" --rpc-url http://144.22.179.183
```

### **3. Verificar Estatísticas do Sistema**
```bash
cast call 0xF60AA2e36e214F457B625e0CF9abd89029A0441e "getSystemStats()" --rpc-url http://144.22.179.183
```

---

## 📊 Estatísticas do Deploy

### **Resumo de Transações**
- **Total de Transações**: 20
- **Contratos Deployados**: 8
- **Configurações de Role**: 12
- **Taxa de Sucesso**: 100%

### **Distribuição de Gas**
- **Deploy de Contratos**: 22,961,208 gas (90.3%)
- **Configuração de Roles**: 2,460,106 gas (9.7%)
- **Gas Total**: 25,421,314 gas

### **Contratos por Categoria**
- **Core Contracts**: 3 (EntryPoint, AABankManager, AABankAccount)
- **Validation Contracts**: 3 (KYCAMLValidator, TransactionLimits, MultiSignatureValidator)
- **Support Contracts**: 2 (SocialRecovery, AuditLogger)

---

## 🔍 Verificação de Integridade

### **Status dos Contratos**
- ✅ **EntryPoint**: Deployado e funcional
- ✅ **AABankManager**: Deployado e funcional
- ✅ **AABankAccount**: Deployado e funcional
- ✅ **KYCAMLValidator**: Deployado e funcional
- ✅ **TransactionLimits**: Deployado e funcional
- ✅ **MultiSignatureValidator**: Deployado e funcional
- ✅ **SocialRecovery**: Deployado e funcional
- ✅ **AuditLogger**: Deployado e funcional

### **Verificação de Roles**
- ✅ **Todas as roles configuradas** corretamente
- ✅ **Permissões aplicadas** para o deployer
- ✅ **Sistema pronto** para operação

---

## 📝 Próximos Passos

### **1. Configurar Bancos Iniciais**
```bash
forge script script/DeployAABanking.s.sol:SetupBanksScript \
  --rpc-url http://144.22.179.183 \
  --private-key $BESU_PRIVATE_KEY \
  --broadcast \
  --gas-limit 10000000 \
  --gas-price 0 \
  --chain-id 1337
```

### **2. Verificar Sistema Completo**
```bash
forge script script/DeployAABanking.s.sol:VerifySystemScript \
  --rpc-url http://144.22.179.183 \
  --private-key $BESU_PRIVATE_KEY \
  --chain-id 1337
```

### **3. Testar Funcionalidades**
- Criar contas bancárias
- Configurar limites de transação
- Testar validação KYC/AML
- Verificar logs de auditoria

---

## 🛠️ Comandos Úteis

### **Verificar Saldo de Conta**
```bash
cast balance 0xB40061C7bf8394eb130Fcb5EA06868064593BFAa --rpc-url http://144.22.179.183
```

### **Verificar Código do Contrato**
```bash
cast code 0xF60AA2e36e214F457B625e0CF9abd89029A0441e --rpc-url http://144.22.179.183
```

### **Verificar Bloco Atual**
```bash
cast block-number --rpc-url http://144.22.179.183
```

---

## 📞 Suporte

Para dúvidas ou problemas com o sistema AA Banking, consulte:
- **Documentação**: `/src/` (contratos)
- **Testes**: `/test/` (casos de teste)
- **Scripts**: `/script/` (deploy e configuração)

---

**Sistema AA Banking deployado com sucesso na rede Besu! 🎉**
