# Arquitetura de Accounts - Sistema de Gerenciamento de Contas

## Visão Geral

Este documento descreve a arquitetura implementada para o sistema de gerenciamento de contas (EOA e Smart Accounts ERC-4337) no explorer blockchain. O sistema foi projetado para ambientes corporativos usando Hyperledger Besu e soluções blockchain para DREX.

## Componentes Principais

### 1. Frontend (React/TypeScript)

#### Páginas Implementadas

- **`Accounts.tsx`** - Página de listagem de contas
  - Filtros avançados (tipo, saldo, transações, compliance)
  - Busca por endereço, label ou tag
  - Paginação e ordenação
  - Badges visuais para compliance e risk score
  - Design mobile-first responsivo

- **`Account.tsx`** - Página de detalhes da conta
  - Informações detalhadas da conta
  - Métricas e analytics
  - Tabs organizadas (Overview, Transactions, Contracts, Tokens, Analytics)
  - Informações específicas de Smart Accounts
  - Seção de compliance e risk assessment

#### Funcionalidades

- Detecção inteligente de tipos de conta
- Visualização de métricas em tempo real
- Sistema de tags e labels
- Análise de compliance e risco
- Suporte completo a Smart Accounts (ERC-4337)

### 2. Backend - Worker

#### Entidades de Domínio

**`Account`** - Entidade principal
```go
type Account struct {
    Address                    string
    Type                      AccountType // "eoa" | "smart_account"
    Balance                   *big.Int
    TransactionCount          uint64
    ContractInteractions      uint64
    SmartContractDeployments  uint64
    
    // Smart Account specific (ERC-4337)
    FactoryAddress            *string
    ImplementationAddress     *string
    OwnerAddress              *string
    
    // Corporate/Enterprise
    Label                     *string
    Tags                      []string
    RiskScore                 *int
    ComplianceStatus          ComplianceStatus
    ComplianceNotes           *string
}
```

**Entidades Relacionadas:**
- `AccountAnalytics` - Métricas diárias
- `AccountTag` - Sistema de tags
- `ContractInteraction` - Interações com contratos
- `TokenHolding` - Holdings de tokens

#### Repositórios

- `AccountRepository` - CRUD e operações específicas de contas
- `AccountTagRepository` - Gerenciamento de tags
- `AccountAnalyticsRepository` - Métricas e analytics
- `ContractInteractionRepository` - Interações com contratos
- `TokenHoldingRepository` - Holdings de tokens

#### Serviços de Domínio

**`AccountService`** - Lógica de negócio principal
- Descoberta automática de contas
- Processamento de transações
- Análise de compliance e risco
- Gerenciamento de Smart Accounts
- Cálculo de métricas

#### Handlers de Mensagens

- `HandleAccountDiscovered` - Processa contas descobertas
- `HandleAccountBalanceUpdate` - Atualiza saldos
- `HandleSmartAccountProcessing` - Processa Smart Accounts
- `HandleAccountCompliance` - Análise de compliance
- `HandleAccountAnalytics` - Processamento de analytics
- `HandleContractInteraction` - Interações com contratos
- `HandleTokenHoldingUpdate` - Holdings de tokens

### 3. Backend - Indexer

#### Módulo de Indexação

**`AccountIndexer`** - Detecta e indexa contas
- Processa blocos e transações
- Detecta tipos de conta (EOA vs Smart Account)
- Identifica interações com contratos
- Monitora criação de contratos
- Atualiza saldos em tempo real

#### Detecção Inteligente

- **EOA Detection**: Contas sem código
- **Smart Account Detection**: Verificação de interfaces ERC-4337
- **Contract Interaction**: Análise de chamadas de métodos
- **Balance Monitoring**: Atualizações automáticas de saldo

### 4. Sistema de Queues (RabbitMQ)

#### Queues Implementadas

```go
// Descoberta e processamento de contas
AccountDiscoveredQueue        // Contas descobertas
AccountBalanceUpdateQueue     // Atualizações de saldo
SmartAccountProcessingQueue   // Processamento de Smart Accounts

// Analytics e compliance
AccountAnalyticsQueue         // Processamento de métricas
AccountComplianceQueue        // Análise de compliance

// Interações e holdings
ContractInteractionQueue      // Interações com contratos
TokenHoldingUpdateQueue       // Holdings de tokens
```

#### Estruturas de Mensagens

- `AccountDiscoveredMessage`
- `AccountBalanceUpdateMessage`
- `SmartAccountProcessingMessage`
- `AccountComplianceMessage`
- `AccountAnalyticsMessage`
- `ContractInteractionMessage`
- `TokenHoldingUpdateMessage`

### 5. Banco de Dados (PostgreSQL)

#### Tabelas Principais

**`accounts`** - Tabela principal
```sql
CREATE TABLE accounts (
    address VARCHAR(42) PRIMARY KEY,
    account_type VARCHAR(20) DEFAULT 'eoa',
    balance TEXT DEFAULT '0',
    nonce BIGINT DEFAULT 0,
    transaction_count BIGINT DEFAULT 0,
    contract_interactions BIGINT DEFAULT 0,
    smart_contract_deployments BIGINT DEFAULT 0,
    
    -- Smart Account fields
    factory_address VARCHAR(42),
    implementation_address VARCHAR(42),
    owner_address VARCHAR(42),
    
    -- Corporate fields
    label VARCHAR(255),
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 10),
    compliance_status VARCHAR(20) DEFAULT 'compliant',
    compliance_notes TEXT,
    
    -- Timestamps
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Tabelas Relacionadas:**
- `account_tags` - Sistema de tags
- `account_analytics` - Métricas diárias
- `contract_interactions` - Interações com contratos
- `token_holdings` - Holdings de tokens

#### Índices Otimizados

- Índices compostos para busca eficiente
- Índices parciais para performance
- Triggers automáticos para `updated_at`

## Fluxo de Dados

### 1. Descoberta de Contas

```mermaid
graph TD
    A[Hyperledger Besu] --> B[Indexer]
    B --> C[Account Detection]
    C --> D[Queue: account-discovered]
    D --> E[Worker: Account Handler]
    E --> F[Database: accounts]
    E --> G[Analytics Processing]
```

### 2. Processamento de Transações

```mermaid
graph TD
    A[Transaction] --> B[Account Indexer]
    B --> C{Account Exists?}
    C -->|No| D[Create Account]
    C -->|Yes| E[Update Counters]
    D --> F[Queue: account-discovered]
    E --> G[Queue: account-balance-update]
    F --> H[Worker Processing]
    G --> H
    H --> I[Database Update]
```

### 3. Smart Account Processing

```mermaid
graph TD
    A[Contract Creation] --> B[Smart Account Detection]
    B --> C[Extract Factory/Owner Info]
    C --> D[Queue: smart-account-processing]
    D --> E[Worker: Smart Account Handler]
    E --> F[Update Account Type]
    F --> G[Set Smart Account Info]
    G --> H[Compliance Analysis]
```

## Funcionalidades Corporativas

### 1. Sistema de Compliance

- **Risk Scoring**: Algoritmo de 0-10 baseado em padrões de atividade
- **Status Tracking**: Compliant, Flagged, Under Review
- **Automated Alerts**: Detecção automática de atividades suspeitas
- **Audit Trail**: Histórico completo de mudanças de status

### 2. Gerenciamento de Tags

- **Custom Labels**: Labels personalizados para contas
- **Tag System**: Sistema flexível de tags
- **Bulk Operations**: Operações em lote para gerenciamento
- **Search Integration**: Busca por tags e labels

### 3. Analytics Avançadas

- **Daily Metrics**: Métricas diárias automatizadas
- **Trend Analysis**: Análise de tendências de atividade
- **Risk Assessment**: Avaliação contínua de risco
- **Performance Monitoring**: Monitoramento de performance

### 4. Smart Account Support (ERC-4337)

- **Factory Tracking**: Rastreamento de factories
- **Owner Management**: Gerenciamento de owners
- **Implementation Monitoring**: Monitoramento de implementations
- **Upgrade Detection**: Detecção de upgrades

## Configuração e Deploy

### 1. Migrações de Banco

```bash
# Executar migração de accounts
psql -d explorer -f apps/worker/migrations/005_create_accounts_tables.sql
```

### 2. Configuração de Queues

```bash
# Declarar queues no RabbitMQ
# As queues são declaradas automaticamente pelo worker
```

### 3. Variáveis de Ambiente

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost/explorer

# RabbitMQ
RABBITMQ_URL=amqp://user:pass@localhost:5672/

# Blockchain
BESU_RPC_URL=http://localhost:8545
```

## Monitoramento e Observabilidade

### 1. Métricas

- Contas descobertas por minuto
- Taxa de processamento de mensagens
- Latência de indexação
- Erros de compliance

### 2. Logs Estruturados

- Descoberta de contas
- Processamento de Smart Accounts
- Análises de compliance
- Atualizações de saldo

### 3. Alertas

- Contas com alto risco
- Falhas de processamento
- Anomalias de atividade
- Performance degradada

## Roadmap e Melhorias Futuras

### 1. Detecção Avançada de Smart Accounts

- Implementar verificação completa de interfaces ERC-4337
- Suporte a diferentes padrões de Smart Accounts
- Detecção automática de factory patterns

### 2. Machine Learning para Risk Scoring

- Algoritmos de ML para detecção de padrões
- Análise comportamental avançada
- Predição de riscos

### 3. Integração com Sistemas Externos

- APIs de compliance externas
- Sistemas de KYC/AML
- Feeds de dados de risco

### 4. Dashboard Executivo

- Métricas em tempo real
- Relatórios automatizados
- Alertas personalizados

## Conclusão

A arquitetura implementada fornece uma base sólida para gerenciamento de contas em ambientes corporativos blockchain. O sistema é escalável, observável e preparado para os requisitos específicos do DREX e soluções empresariais usando Hyperledger Besu.

A separação clara entre indexer e worker permite processamento eficiente e resiliente, enquanto o frontend oferece uma experiência rica para análise e gerenciamento de contas. 