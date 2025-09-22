# Account Management System Implementation

## Overview
Este documento detalha a implementação completa do sistema de gerenciamento de accounts para o Hyperledger Besu Explorer, incluindo EOA (Externally Owned Accounts) e Smart Accounts (Account Abstraction).

## 1. Database Schema

### 1.1 Accounts Table
```sql
CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    address VARCHAR(42) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('eoa', 'smart_account')),
    balance DECIMAL(78, 0) DEFAULT 0,
    balance_usd DECIMAL(20, 2) DEFAULT 0,
    nonce BIGINT DEFAULT 0,
    transaction_count BIGINT DEFAULT 0,
    contract_interactions BIGINT DEFAULT 0,
    smart_contract_deployments BIGINT DEFAULT 0,
    first_seen TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE,
    is_contract BOOLEAN DEFAULT FALSE,
    contract_type VARCHAR(50),
    
    -- Smart Account specific fields
    factory_address VARCHAR(42),
    implementation_address VARCHAR(42),
    owner_address VARCHAR(42),
    
    -- Corporate/Enterprise fields
    label VARCHAR(255),
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 10),
    compliance_status VARCHAR(20) CHECK (compliance_status IN ('compliant', 'flagged', 'under_review')),
    compliance_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_accounts_address (address),
    INDEX idx_accounts_type (type),
    INDEX idx_accounts_balance (balance),
    INDEX idx_accounts_last_activity (last_activity),
    INDEX idx_accounts_compliance_status (compliance_status),
    INDEX idx_accounts_owner_address (owner_address),
    INDEX idx_accounts_factory_address (factory_address)
);
```

### 1.2 Account Tags Table
```sql
CREATE TABLE account_tags (
    id BIGSERIAL PRIMARY KEY,
    account_address VARCHAR(42) NOT NULL,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (account_address) REFERENCES accounts(address) ON DELETE CASCADE,
    UNIQUE(account_address, tag),
    INDEX idx_account_tags_address (account_address),
    INDEX idx_account_tags_tag (tag)
);
```

### 1.3 Account Analytics Table
```sql
CREATE TABLE account_analytics (
    id BIGSERIAL PRIMARY KEY,
    account_address VARCHAR(42) NOT NULL,
    date DATE NOT NULL,
    transaction_count INTEGER DEFAULT 0,
    transaction_volume DECIMAL(78, 0) DEFAULT 0,
    gas_used BIGINT DEFAULT 0,
    contract_calls INTEGER DEFAULT 0,
    unique_contracts_interacted INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (account_address) REFERENCES accounts(address) ON DELETE CASCADE,
    UNIQUE(account_address, date),
    INDEX idx_account_analytics_address_date (account_address, date),
    INDEX idx_account_analytics_date (date)
);
```

### 1.4 Contract Interactions Table
```sql
CREATE TABLE contract_interactions (
    id BIGSERIAL PRIMARY KEY,
    account_address VARCHAR(42) NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    interaction_count BIGINT DEFAULT 0,
    last_interaction TIMESTAMP WITH TIME ZONE,
    first_interaction TIMESTAMP WITH TIME ZONE,
    total_gas_used BIGINT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (account_address) REFERENCES accounts(address) ON DELETE CASCADE,
    UNIQUE(account_address, contract_address),
    INDEX idx_contract_interactions_account (account_address),
    INDEX idx_contract_interactions_contract (contract_address)
);
```

### 1.5 Token Holdings Table
```sql
CREATE TABLE token_holdings (
    id BIGSERIAL PRIMARY KEY,
    account_address VARCHAR(42) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    token_symbol VARCHAR(20),
    token_name VARCHAR(100),
    balance DECIMAL(78, 0) DEFAULT 0,
    balance_formatted DECIMAL(36, 18) DEFAULT 0,
    value_usd DECIMAL(20, 2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (account_address) REFERENCES accounts(address) ON DELETE CASCADE,
    UNIQUE(account_address, token_address),
    INDEX idx_token_holdings_account (account_address),
    INDEX idx_token_holdings_token (token_address)
);
```

## 2. API Endpoints

### 2.1 Account Management API

#### GET /api/accounts
```go
// Query parameters:
// - search: string (address, label, tag)
// - type: string (all, eoa, smart_account)
// - min_balance: string
// - max_balance: string
// - min_transactions: int
// - max_transactions: int
// - compliance_status: string (all, compliant, flagged, under_review)
// - has_contract_interactions: bool
// - sort_by: string (balance, transaction_count, last_activity, created_at)
// - sort_order: string (asc, desc)
// - page: int
// - limit: int

type AccountListResponse struct {
    Success bool      `json:"success"`
    Data    []Account `json:"data"`
    Meta    struct {
        Total       int `json:"total"`
        Page        int `json:"page"`
        Limit       int `json:"limit"`
        TotalPages  int `json:"total_pages"`
    } `json:"meta"`
}
```

#### GET /api/accounts/{address}
```go
type AccountDetailsResponse struct {
    Success bool           `json:"success"`
    Data    AccountDetails `json:"data"`
}

type AccountDetails struct {
    Address                    string                 `json:"address"`
    Type                      string                 `json:"type"`
    Balance                   string                 `json:"balance"`
    BalanceUSD                string                 `json:"balance_usd"`
    Nonce                     int64                  `json:"nonce"`
    TransactionCount          int64                  `json:"transaction_count"`
    ContractInteractions      int64                  `json:"contract_interactions"`
    SmartContractDeployments  int64                  `json:"smart_contract_deployments"`
    FirstSeen                 time.Time              `json:"first_seen"`
    LastActivity              time.Time              `json:"last_activity"`
    IsContract                bool                   `json:"is_contract"`
    ContractType              *string                `json:"contract_type,omitempty"`
    
    // Smart Account fields
    FactoryAddress            *string                `json:"factory_address,omitempty"`
    ImplementationAddress     *string                `json:"implementation_address,omitempty"`
    OwnerAddress              *string                `json:"owner_address,omitempty"`
    
    // Enterprise fields
    Label                     *string                `json:"label,omitempty"`
    Tags                      []string               `json:"tags"`
    RiskScore                 *int                   `json:"risk_score,omitempty"`
    ComplianceStatus          *string                `json:"compliance_status,omitempty"`
    ComplianceNotes           *string                `json:"compliance_notes,omitempty"`
    
    // Analytics
    DailyTransactions         []DailyAnalytics       `json:"daily_transactions"`
    TopContracts              []ContractInteraction  `json:"top_contracts"`
    TokenHoldings             []TokenHolding         `json:"token_holdings"`
}
```

#### GET /api/accounts/{address}/transactions
```go
type AccountTransactionsResponse struct {
    Success bool          `json:"success"`
    Data    []Transaction `json:"data"`
    Meta    PaginationMeta `json:"meta"`
}
```

#### GET /api/accounts/{address}/analytics
```go
type AccountAnalyticsResponse struct {
    Success bool              `json:"success"`
    Data    AccountAnalytics  `json:"data"`
}

type AccountAnalytics struct {
    Address           string            `json:"address"`
    Period            string            `json:"period"` // daily, weekly, monthly
    Analytics         []DailyAnalytics  `json:"analytics"`
    Summary           AnalyticsSummary  `json:"summary"`
}
```

#### POST/PUT/DELETE /api/accounts/{address}/tags
```go
type TagRequest struct {
    Tags []string `json:"tags"`
}

type TagResponse struct {
    Success bool     `json:"success"`
    Data    []string `json:"data"`
}
```

#### PUT /api/accounts/{address}/compliance
```go
type ComplianceUpdateRequest struct {
    Status      string  `json:"status"`
    RiskScore   *int    `json:"risk_score,omitempty"`
    Notes       *string `json:"notes,omitempty"`
}
```

### 2.2 Smart Account Specific APIs

#### GET /api/smart-accounts
```go
// Lista apenas smart accounts com filtros específicos
type SmartAccountListResponse struct {
    Success bool           `json:"success"`
    Data    []SmartAccount `json:"data"`
    Meta    PaginationMeta `json:"meta"`
}
```

#### GET /api/smart-accounts/{address}/factory-info
```go
type FactoryInfoResponse struct {
    Success bool        `json:"success"`
    Data    FactoryInfo `json:"data"`
}

type FactoryInfo struct {
    FactoryAddress        string    `json:"factory_address"`
    ImplementationAddress string    `json:"implementation_address"`
    Version               string    `json:"version"`
    CreatedAccounts       int64     `json:"created_accounts"`
    TotalDeployments      int64     `json:"total_deployments"`
}
```

## 3. Worker Implementation

### 3.1 Account Indexer Worker

```go
package workers

import (
    "context"
    "encoding/json"
    "log"
    
    "github.com/streadway/amqp"
)

type AccountIndexerWorker struct {
    conn     *amqp.Connection
    channel  *amqp.Channel
    db       *sql.DB
    queue    string
}

type AccountUpdateMessage struct {
    Address     string `json:"address"`
    Type        string `json:"type"`
    Action      string `json:"action"` // create, update, transaction
    BlockNumber int64  `json:"block_number"`
    TxHash      string `json:"tx_hash,omitempty"`
    Data        map[string]interface{} `json:"data"`
}

func (w *AccountIndexerWorker) ProcessMessage(msg amqp.Delivery) error {
    var message AccountUpdateMessage
    if err := json.Unmarshal(msg.Body, &message); err != nil {
        return err
    }
    
    switch message.Action {
    case "create":
        return w.createAccount(message)
    case "update":
        return w.updateAccount(message)
    case "transaction":
        return w.processTransaction(message)
    default:
        log.Printf("Unknown action: %s", message.Action)
    }
    
    return nil
}

func (w *AccountIndexerWorker) createAccount(msg AccountUpdateMessage) error {
    // Detectar tipo de account
    accountType := w.detectAccountType(msg.Address, msg.Data)
    
    // Inserir na tabela accounts
    query := `
        INSERT INTO accounts (
            address, type, balance, nonce, first_seen, last_activity,
            is_contract, factory_address, owner_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (address) DO UPDATE SET
            balance = EXCLUDED.balance,
            nonce = EXCLUDED.nonce,
            last_activity = EXCLUDED.last_activity,
            updated_at = NOW()
    `
    
    _, err := w.db.Exec(query,
        msg.Address,
        accountType,
        msg.Data["balance"],
        msg.Data["nonce"],
        msg.Data["timestamp"],
        msg.Data["timestamp"],
        msg.Data["is_contract"],
        msg.Data["factory_address"],
        msg.Data["owner_address"],
    )
    
    return err
}

func (w *AccountIndexerWorker) detectAccountType(address string, data map[string]interface{}) string {
    // Lógica para detectar se é EOA ou Smart Account
    if isContract, ok := data["is_contract"].(bool); ok && isContract {
        // Verificar se é Account Abstraction
        if w.isAccountAbstraction(address, data) {
            return "smart_account"
        }
        return "contract"
    }
    return "eoa"
}

func (w *AccountIndexerWorker) isAccountAbstraction(address string, data map[string]interface{}) bool {
    // Implementar lógica para detectar Account Abstraction
    // Verificar se tem factory_address, owner_address, etc.
    if _, hasFactory := data["factory_address"]; hasFactory {
        return true
    }
    
    // Verificar padrões de bytecode conhecidos de AA
    // Verificar eventos de criação específicos
    
    return false
}
```

### 3.2 Transaction Processor Worker

```go
func (w *TransactionProcessorWorker) processAccountTransaction(tx Transaction) error {
    // Atualizar contadores de transação
    if err := w.updateTransactionCounts(tx.From, tx.To); err != nil {
        return err
    }
    
    // Processar interações com contratos
    if tx.To != "" && w.isContract(tx.To) {
        if err := w.updateContractInteraction(tx.From, tx.To, tx); err != nil {
            return err
        }
    }
    
    // Atualizar analytics diárias
    if err := w.updateDailyAnalytics(tx); err != nil {
        return err
    }
    
    // Atualizar balances
    if err := w.updateBalances(tx); err != nil {
        return err
    }
    
    return nil
}

func (w *TransactionProcessorWorker) updateContractInteraction(from, to string, tx Transaction) error {
    query := `
        INSERT INTO contract_interactions (
            account_address, contract_address, interaction_count,
            last_interaction, first_interaction, total_gas_used
        ) VALUES ($1, $2, 1, $3, $3, $4)
        ON CONFLICT (account_address, contract_address) DO UPDATE SET
            interaction_count = contract_interactions.interaction_count + 1,
            last_interaction = $3,
            total_gas_used = contract_interactions.total_gas_used + $4,
            updated_at = NOW()
    `
    
    _, err := w.db.Exec(query, from, to, tx.Timestamp, tx.GasUsed)
    return err
}
```

### 3.3 Balance Updater Worker

```go
type BalanceUpdaterWorker struct {
    db       *sql.DB
    rpcClient *ethclient.Client
}

func (w *BalanceUpdaterWorker) UpdateAccountBalances() error {
    // Buscar accounts que precisam de atualização
    accounts, err := w.getAccountsForUpdate()
    if err != nil {
        return err
    }
    
    for _, account := range accounts {
        balance, err := w.rpcClient.BalanceAt(context.Background(), 
            common.HexToAddress(account.Address), nil)
        if err != nil {
            log.Printf("Error getting balance for %s: %v", account.Address, err)
            continue
        }
        
        // Atualizar balance no banco
        if err := w.updateAccountBalance(account.Address, balance); err != nil {
            log.Printf("Error updating balance for %s: %v", account.Address, err)
        }
        
        // Atualizar token holdings se necessário
        if err := w.updateTokenHoldings(account.Address); err != nil {
            log.Printf("Error updating token holdings for %s: %v", account.Address, err)
        }
    }
    
    return nil
}
```

## 4. RabbitMQ Message Structure

### 4.1 Queue Configuration
```yaml
queues:
  account_indexer:
    name: "account.indexer"
    durable: true
    auto_delete: false
    exclusive: false
    
  account_analytics:
    name: "account.analytics"
    durable: true
    auto_delete: false
    exclusive: false
    
  balance_updater:
    name: "account.balance_updater"
    durable: true
    auto_delete: false
    exclusive: false

exchanges:
  account_events:
    name: "account.events"
    type: "topic"
    durable: true
    
routing_keys:
  - "account.created"
  - "account.updated"
  - "account.transaction"
  - "account.balance_changed"
  - "smart_account.deployed"
  - "smart_account.owner_changed"
```

### 4.2 Message Types

#### Account Creation Message
```json
{
  "type": "account.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "block_number": 12345678,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b8D4C9db96C4C4C4C4",
    "type": "eoa",
    "balance": "1000000000000000000",
    "nonce": 0,
    "is_contract": false,
    "creation_tx": "0xabc123..."
  }
}
```

#### Smart Account Deployment Message
```json
{
  "type": "smart_account.deployed",
  "timestamp": "2024-01-15T10:30:00Z",
  "block_number": 12345678,
  "data": {
    "address": "0x1234567890123456789012345678901234567890",
    "factory_address": "0xFactory123456789012345678901234567890",
    "implementation_address": "0xImpl123456789012345678901234567890",
    "owner_address": "0xOwner123456789012345678901234567890",
    "creation_tx": "0xdef456...",
    "salt": "0x789abc..."
  }
}
```

#### Transaction Processing Message
```json
{
  "type": "account.transaction",
  "timestamp": "2024-01-15T10:30:00Z",
  "block_number": 12345678,
  "data": {
    "tx_hash": "0xabc123...",
    "from": "0x742d35Cc6634C0532925a3b8D4C9db96C4C4C4C4",
    "to": "0x1234567890123456789012345678901234567890",
    "value": "1000000000000000000",
    "gas_used": 21000,
    "gas_price": "20000000000",
    "status": "success",
    "method": "transfer",
    "is_contract_call": false
  }
}
```

## 5. Compliance & Risk Management

### 5.1 Risk Scoring Algorithm
```go
type RiskCalculator struct {
    db *sql.DB
}

func (r *RiskCalculator) CalculateRiskScore(address string) (int, error) {
    score := 0
    
    // Fatores de risco:
    // 1. Volume de transações suspeitas
    // 2. Interações com contratos flagged
    // 3. Padrões de transação anômalos
    // 4. Idade da conta
    // 5. Diversidade de interações
    
    account, err := r.getAccountDetails(address)
    if err != nil {
        return 0, err
    }
    
    // Fator 1: Volume alto em pouco tempo
    if r.hasHighVolumeInShortTime(account) {
        score += 2
    }
    
    // Fator 2: Interações com contratos suspeitos
    suspiciousInteractions := r.getSuspiciousContractInteractions(address)
    score += min(suspiciousInteractions, 3)
    
    // Fator 3: Conta muito nova com alta atividade
    if r.isNewAccountWithHighActivity(account) {
        score += 2
    }
    
    // Fator 4: Padrões de mixing/tumbling
    if r.hasMixingPatterns(address) {
        score += 3
    }
    
    return min(score, 10), nil
}
```

### 5.2 Compliance Monitoring
```go
type ComplianceMonitor struct {
    db     *sql.DB
    rules  []ComplianceRule
}

type ComplianceRule struct {
    ID          string
    Name        string
    Description string
    Severity    string // low, medium, high, critical
    Condition   func(account AccountDetails) bool
    Action      func(account AccountDetails) error
}

func (c *ComplianceMonitor) CheckCompliance(address string) error {
    account, err := c.getAccountDetails(address)
    if err != nil {
        return err
    }
    
    violations := []string{}
    
    for _, rule := range c.rules {
        if rule.Condition(account) {
            violations = append(violations, rule.ID)
            
            // Executar ação automática se necessário
            if err := rule.Action(account); err != nil {
                log.Printf("Error executing compliance action for rule %s: %v", rule.ID, err)
            }
        }
    }
    
    if len(violations) > 0 {
        return c.flagAccount(address, violations)
    }
    
    return nil
}
```

## 6. Performance Optimizations

### 6.1 Database Indexes
```sql
-- Indexes para performance
CREATE INDEX CONCURRENTLY idx_accounts_balance_desc ON accounts (balance DESC);
CREATE INDEX CONCURRENTLY idx_accounts_last_activity_desc ON accounts (last_activity DESC);
CREATE INDEX CONCURRENTLY idx_accounts_type_balance ON accounts (type, balance DESC);
CREATE INDEX CONCURRENTLY idx_account_analytics_address_date ON account_analytics (account_address, date DESC);

-- Partial indexes para queries específicas
CREATE INDEX CONCURRENTLY idx_accounts_smart_accounts ON accounts (address) WHERE type = 'smart_account';
CREATE INDEX CONCURRENTLY idx_accounts_flagged ON accounts (address) WHERE compliance_status = 'flagged';
```

### 6.2 Caching Strategy
```go
type AccountCache struct {
    redis  *redis.Client
    ttl    time.Duration
}

func (c *AccountCache) GetAccount(address string) (*AccountDetails, error) {
    // Tentar buscar do cache primeiro
    cached, err := c.redis.Get(fmt.Sprintf("account:%s", address)).Result()
    if err == nil {
        var account AccountDetails
        if err := json.Unmarshal([]byte(cached), &account); err == nil {
            return &account, nil
        }
    }
    
    // Se não encontrou no cache, buscar do banco
    account, err := c.getAccountFromDB(address)
    if err != nil {
        return nil, err
    }
    
    // Salvar no cache
    accountJSON, _ := json.Marshal(account)
    c.redis.Set(fmt.Sprintf("account:%s", address), accountJSON, c.ttl)
    
    return account, nil
}
```

## 7. Monitoring & Alerts

### 7.1 Metrics Collection
```go
type AccountMetrics struct {
    TotalAccounts       prometheus.Gauge
    SmartAccounts       prometheus.Gauge
    FlaggedAccounts     prometheus.Gauge
    ProcessingLatency   prometheus.Histogram
    ErrorRate          prometheus.Counter
}

func (m *AccountMetrics) UpdateMetrics() {
    // Atualizar métricas periodicamente
    total := m.getTotalAccounts()
    smart := m.getSmartAccountsCount()
    flagged := m.getFlaggedAccountsCount()
    
    m.TotalAccounts.Set(float64(total))
    m.SmartAccounts.Set(float64(smart))
    m.FlaggedAccounts.Set(float64(flagged))
}
```

### 7.2 Alert Rules
```yaml
alerts:
  - name: HighRiskAccountDetected
    condition: account.risk_score >= 8
    action: notify_compliance_team
    
  - name: SuspiciousActivityPattern
    condition: account.daily_transactions > 1000 AND account.age < 7_days
    action: flag_for_review
    
  - name: SmartAccountFactorySpam
    condition: factory.daily_deployments > 100
    action: investigate_factory
```

Este sistema fornece uma base sólida para rastreamento e análise de accounts em ambientes corporativos usando Hyperledger Besu, com foco especial em compliance, risk management e Account Abstraction. 