# Arquitetura do Sistema Account Abstraction para Instituições Financeiras

## Visão Geral

Este sistema implementa um protocolo de Account Abstraction (ERC-4337) customizado para instituições financeiras, fornecendo funcionalidades avançadas de segurança, conformidade e rastreabilidade necessárias para o ambiente bancário empresarial.

## Componentes Principais

### 1. AABankManager.sol
Contrato principal de gerenciamento que atua como factory e controlador central para contas AA bancárias.

**Responsabilidades:**
- Deploy e gestão de contas AA para clientes bancários
- Controle de acesso baseado em roles (BANK_ADMIN, COMPLIANCE_OFFICER, etc.)
- Configurações globais de limites e políticas
- Registry de todas as contas criadas
- Sistema de auditoria e logs

### 2. AABankAccount.sol
Implementação customizada de conta AA baseada no BaseAccount do ERC-4337.

**Funcionalidades:**
- Validação KYC/AML integrada
- Limites de transação configuráveis
- Sistema de multi-assinatura para transações acima de determinados valores
- Freeze/Unfreeze de conta
- Recuperação social
- Logs detalhados para auditoria

### 3. KYCAMLValidator.sol
Sistema de validação de conformidade.

**Funcionalidades:**
- Verificação de status KYC do usuário
- Validação AML contra listas de sanções
- Scoring de risco de transações
- Integração com sistemas externos de compliance

### 4. TransactionLimits.sol
Gerenciamento de limites de transações.

**Funcionalidades:**
- Limites diários, semanais e mensais
- Limites por tipo de transação
- Limites baseados em risco
- Configuração dinâmica de limites

### 5. MultiSignatureValidator.sol
Sistema de multi-assinatura para transações de alto valor.

**Funcionalidades:**
- Configuração de signatários autorizados
- Thresholds baseados em valor
- Timelock para transações críticas
- Aprovação escalonada

### 6. SocialRecovery.sol
Sistema de recuperação social de contas.

**Funcionalidades:**
- Configuração de guardiões de confiança
- Processo de recuperação com delays de segurança
- Verificação multi-fator
- Logs de auditoria completos

### 7. AuditLogger.sol
Sistema centralizado de logs e auditoria.

**Funcionalidades:**
- Logs imutáveis de todas as operações
- Eventos padronizados para ferramentas de monitoramento
- Indexação para queries eficientes
- Compliance com regulamentações

## Arquitetura de Segurança

### Roles e Permissões
```
SUPER_ADMIN (0x00): Controle total do sistema
BANK_ADMIN (0x01): Gestão de contas e políticas bancárias
COMPLIANCE_OFFICER (0x02): Operações de compliance e auditoria
RISK_MANAGER (0x03): Configuração de limites e validações
ACCOUNT_OPERATOR (0x04): Operações básicas de conta
```

### Validação em Camadas
1. **Camada EntryPoint**: Validação ERC-4337 padrão
2. **Camada KYC/AML**: Verificação de conformidade
3. **Camada Limites**: Validação de limites transacionais
4. **Camada Multi-sig**: Validação de assinaturas múltiplas quando necessário
5. **Camada Auditoria**: Log de todas as operações

### Estados de Conta
```
ACTIVE (0x01): Conta ativa e operacional
FROZEN (0x02): Conta congelada por segurança/compliance
SUSPENDED (0x03): Conta suspensa por violação de políticas
RECOVERING (0x04): Conta em processo de recuperação social
CLOSED (0x05): Conta fechada permanentemente
```

## Eventos Customizados

### AABankManager
- `BankAccountCreated(address indexed account, address indexed owner, bytes32 indexed bankId)`
- `AccountStatusChanged(address indexed account, uint8 oldStatus, uint8 newStatus)`
- `PolicyUpdated(bytes32 indexed policyId, bytes data)`

### AABankAccount
- `TransactionExecuted(bytes32 indexed txHash, address indexed target, uint256 value, bool success)`
- `LimitExceeded(address indexed account, uint8 limitType, uint256 attempted, uint256 allowed)`
- `MultiSigRequired(bytes32 indexed txHash, uint256 value, uint256 requiredSigs)`
- `AccountFrozen(address indexed account, bytes32 reason)`
- `AccountUnfrozen(address indexed account, address indexed unfrozenBy)`

### SocialRecovery
- `RecoveryInitiated(address indexed account, address indexed initiator, uint256 delay)`
- `RecoveryApproved(address indexed account, address indexed guardian, uint256 approvals)`
- `RecoveryExecuted(address indexed account, address newOwner)`
- `RecoveryCancelled(address indexed account, bytes32 reason)`

## Custom Errors

```solidity
error UnauthorizedAccess(address caller, bytes32 requiredRole);
error AccountFrozen(address account);
error InsufficientSignatures(uint256 provided, uint256 required);
error TransactionLimitExceeded(uint256 amount, uint256 limit, uint8 limitType);
error KYCValidationFailed(address account, bytes32 reason);
error AMLViolation(address account, bytes32 riskLevel);
error InvalidRecoveryGuardian(address guardian);
error RecoveryNotActive(address account);
error InvalidTimelock(uint256 current, uint256 required);
```

## Integração com Hyperledger Besu

### Rastreabilidade Empresarial
- Todos os eventos são emitidos com dados estruturados para fácil indexação
- Suporte a ferramentas de análise blockchain empresarial
- Compatibilidade com padrões de auditoria corporativa

### Performance e Otimização
- Uso de packed structs para otimização de gas
- Implementação de proxies upgradeáveis para atualizações
- Batching de operações para redução de custos

## Padrões de Segurança Implementados

1. **ReentrancyGuard**: Proteção contra ataques de reentrância
2. **AccessControl**: Sistema robusto de controle de acesso
3. **Pausable**: Capacidade de pausar o sistema em emergências
4. **Upgradeable**: Proxies para atualizações seguras
5. **TimeLock**: Delays de segurança para operações críticas
6. **Multi-signature**: Validação múltipla para transações sensíveis

## Compliance e Regulamentações

### LGPD/GDPR
- Minimização de dados pessoais on-chain
- Hashs de dados sensíveis
- Direito ao esquecimento via off-chain storage

### Basel III/PCI DSS
- Logs imutáveis para auditoria
- Segregação de duties via roles
- Controles de acesso granulares

### BACEN (Banco Central)
- Rastreabilidade completa de transações
- Relatórios padronizados
- Integração com sistemas de monitoramento