# ⚙️ Worker - Processador de Eventos

## 📋 Visão Geral

O **Worker** é o componente responsável pelo processamento assíncrono de todos os eventos capturados pelo Indexer. Ele consome mensagens do RabbitMQ, processa os dados, enriquece com informações adicionais e persiste no banco de dados PostgreSQL e cache Redis.

## 🎯 Responsabilidades Principais

### 1. **Processamento de Eventos**
- Consumo de mensagens do RabbitMQ
- Processamento paralelo com goroutines
- Transformação e enriquecimento de dados
- Validação e sanitização

### 2. **Persistência de Dados**
- Inserção em batch no PostgreSQL
- Cache de dados críticos no Redis
- Manutenção de índices e estatísticas
- Cleanup de dados antigos

### 3. **Business Logic**
- Cálculo de métricas e analytics
- Classificação automática de contas
- Detecção de padrões e anomalias
- Geração de relatórios

## 🏗️ Arquitetura Interna

```mermaid
graph TD
    subgraph "Worker Service"
        A[Message Consumer] --> B[Event Router]

        B --> C[Block Handler]
        B --> D[Transaction Handler]
        B --> E[Event Handler]
        B --> F[Account Handler]
        B --> G[Validator Handler]

        C --> H[Domain Services]
        D --> H
        E --> H
        F --> H
        G --> H

        H --> I[Repository Layer]
        I --> J[PostgreSQL]
        I --> K[Redis Cache]

        L[Application Services] --> H
        M[Infrastructure] --> I
    end

    subgraph "External Services"
        N[RabbitMQ] --> A
        O[Besu Node] --> H
    end
```

## 📦 Handlers Especializados

### 1. **Block Handler** (`block_handler.go`)

**Função**: Processa eventos de novos blocos.

**Responsabilidades**:
- Buscar dados completos do bloco no Besu
- Extrair e validar informações
- Calcular métricas de performance
- Atualizar cache de último bloco
- Processar transações do bloco

**Fluxo de Processamento**:
```go
func (h *BlockHandler) HandleBlockEvent(ctx context.Context, body []byte) error {
    // 1. Deserializar evento
    var event BlockEvent
    json.Unmarshal(body, &event)

    // 2. Buscar dados completos no Besu
    ethBlock, err := h.ethClient.BlockByNumber(ctx, big.NewInt(int64(event.Number)))

    // 3. Converter para entidade de domínio
    block := h.convertToEntity(ethBlock, &event)

    // 4. Atualizar cache Redis instantaneamente
    h.updateRedisCacheInstant(block)

    // 5. Adicionar ao batch para PostgreSQL
    h.addToBatch(block)

    return nil
}
```

**Otimizações**:
- Batch processing (10 blocos por lote)
- Cache instantâneo no Redis
- Processamento paralelo
- Timeout configurável (5 segundos)

### 2. **Transaction Handler** (`transaction_handler.go`)

**Função**: Processa transações mineradas e pending.

**Responsabilidades**:
- Análise detalhada de transações
- Decodificação de input data
- Identificação de métodos de contratos
- Cálculo de fees e gas
- Atualização de status (pending → success/failed)

**Tipos de Transação Processados**:
- **Legacy**: Transações tradicionais
- **EIP-1559**: Dynamic fee transactions
- **EIP-2930**: Access list transactions
- **Contract Creation**: Deploy de contratos
- **Contract Interaction**: Calls para contratos

**Enriquecimento de Dados**:
```go
func (h *TransactionHandler) enrichTransaction(tx *entities.Transaction) {
    // Decodificar método do contrato
    if tx.To != "" && len(tx.Data) >= 4 {
        methodSig := tx.Data[:4]
        tx.MethodSignature = methodSig
        tx.MethodName = h.methodDecoder.GetMethodName(methodSig)
    }

    // Calcular fees
    tx.TotalFee = calculateTotalFee(tx)

    // Classificar tipo de transação
    tx.Type = classifyTransactionType(tx)
}
```

### 3. **Event Handler** (`event_handler.go`)

**Função**: Processa eventos de smart contracts.

**Responsabilidades**:
- Decodificação automática de eventos
- Classificação por tipo e contrato
- Extração de dados estruturados
- Indexação para busca rápida

**Tipos de Eventos**:
- **ERC-20**: Transfer, Approval
- **ERC-721**: Transfer, Approval, ApprovalForAll
- **ERC-1155**: TransferSingle, TransferBatch
- **Custom**: Eventos específicos de contratos
- **Factory**: Eventos de criação de contratos

**Processamento de Eventos**:
```go
func (h *EventHandler) processEvent(event *entities.Event) error {
    // Decodificar dados do evento
    decodedData, err := h.abiDecoder.DecodeEvent(event.Topics, event.Data)
    if err != nil {
        log.Printf("Erro ao decodificar evento: %v", err)
        return err
    }

    // Enriquecer com metadata
    event.DecodedData = decodedData
    event.ContractName = h.contractRegistry.GetName(event.ContractAddress)

    // Processar por tipo específico
    switch event.EventName {
    case "Transfer":
        return h.processTransferEvent(event)
    case "Approval":
        return h.processApprovalEvent(event)
    default:
        return h.processGenericEvent(event)
    }
}
```

### 4. **Account Handler** (`account_handler.go`)

**Função**: Gerencia dados de contas e endereços.

**Responsabilidades**:
- Rastreamento de saldos
- Classificação de tipos de conta
- Análise de comportamento
- Cálculo de métricas por conta

**Tipos de Conta**:
- **EOA**: Externally Owned Accounts
- **Smart Contract**: Contratos deployados
- **Smart Account**: ERC-4337 Account Abstraction
- **Multisig**: Carteiras multi-assinatura
- **Proxy**: Contratos proxy (UUPS, Transparent)

**Analytics por Conta**:
```go
func (h *AccountHandler) calculateAccountMetrics(address string) *entities.AccountAnalytics {
    return &entities.AccountAnalytics{
        Address:                address,
        TransactionsCount:      h.countTransactions(address),
        UniqueAddressesCount:   h.countUniqueInteractions(address),
        GasUsed:               h.sumGasUsed(address),
        ValueTransferred:      h.sumValueTransferred(address),
        ContractCallsCount:    h.countContractCalls(address),
        TokenTransfersCount:   h.countTokenTransfers(address),
        SuccessRate:           h.calculateSuccessRate(address),
    }
}
```

### 5. **Validator Handler** (`validator_handler.go`)

**Função**: Monitora validadores da rede QBFT/IBFT.

**Responsabilidades**:
- Rastreamento de blocos propostos
- Cálculo de uptime e performance
- Detecção de validadores inativos
- Estatísticas de consenso

**Métricas de Validador**:
- Blocos propostos
- Último bloco proposto
- Status (ativo/inativo)
- Uptime percentage
- Performance score

## 🔧 Domain Services

### 1. **Block Service** (`block_service.go`)

**Função**: Lógica de negócio para blocos.

**Funcionalidades**:
- Validação de integridade de blocos
- Detecção de reorganizações
- Cálculo de estatísticas
- Manutenção de índices

### 2. **Account Service** (`account_service.go`)

**Função**: Gerenciamento de contas.

**Funcionalidades**:
- Criação e atualização de contas
- Classificação automática
- Cálculo de métricas
- Sistema de tags

### 3. **Validator Service** (`validator_service.go`)

**Função**: Monitoramento de validadores.

**Funcionalidades**:
- Tracking de performance
- Alertas de inatividade
- Estatísticas de consenso
- Health checks

## 📊 Repository Pattern

### **Interface Repository**
```go
type BlockRepository interface {
    Create(ctx context.Context, block *entities.Block) error
    CreateBatch(ctx context.Context, blocks []*entities.Block) error
    GetByNumber(ctx context.Context, number uint64) (*entities.Block, error)
    GetByHash(ctx context.Context, hash string) (*entities.Block, error)
    GetLatest(ctx context.Context) (*entities.Block, error)
    GetRange(ctx context.Context, from, to uint64) ([]*entities.Block, error)
}
```

### **PostgreSQL Implementation**
```go
func (r *PostgresBlockRepository) CreateBatch(ctx context.Context, blocks []*entities.Block) error {
    tx := r.db.Begin()
    defer tx.Rollback()

    for _, block := range blocks {
        if err := tx.Create(block).Error; err != nil {
            return err
        }
    }

    return tx.Commit().Error
}
```

## ⚡ Cache Strategy (Redis)

### **Cache Layers**
1. **L1 - Hot Data** (TTL: 30 segundos)
   - Último bloco
   - Transações recentes
   - Estatísticas básicas

2. **L2 - Warm Data** (TTL: 30 minutos)
   - Blocos individuais
   - Dados de contratos
   - Métricas agregadas

3. **L3 - Cold Data** (TTL: 24 horas)
   - Dados históricos
   - Analytics complexos
   - Relatórios

### **Cache Implementation**
```go
func (c *RedisCache) SetLatestBlock(number int64, hash string, timestamp int64) error {
    data := map[string]interface{}{
        "number":    number,
        "hash":      hash,
        "timestamp": timestamp,
    }

    return c.client.HMSet(ctx, "latest_block", data).Err()
}

func (c *RedisCache) GetLatestBlock() (*entities.Block, error) {
    data := c.client.HGetAll(ctx, "latest_block").Val()
    if len(data) == 0 {
        return nil, ErrNotFound
    }

    // Converter para entidade
    return convertToBlock(data), nil
}
```

## 🔄 Message Processing

### **Queue Consumers**
```go
func (w *Worker) StartConsumers(ctx context.Context) error {
    // Block events
    go w.blockHandler.Start(ctx)

    // Transaction events
    go w.transactionHandler.Start(ctx)

    // Contract events
    go w.eventHandler.Start(ctx)

    // Account events
    go w.accountHandler.Start(ctx)

    // Validator events
    go w.validatorHandler.Start(ctx)

    return nil
}
```

### **Error Handling e Retry**
```go
func (h *BaseHandler) processMessage(msg amqp.Delivery) {
    maxRetries := 3

    for attempt := 1; attempt <= maxRetries; attempt++ {
        if err := h.handleMessage(msg.Body); err != nil {
            log.Printf("Tentativa %d falhou: %v", attempt, err)

            if attempt == maxRetries {
                // Dead letter queue
                h.sendToDeadLetter(msg)
                msg.Nack(false, false)
                return
            }

            // Backoff exponencial
            time.Sleep(time.Duration(attempt*attempt) * time.Second)
            continue
        }

        // Sucesso
        msg.Ack(false)
        return
    }
}
```

## 📈 Performance Optimizations

### **Batch Processing**
- Processamento em lotes de 10-50 items
- Redução de round-trips ao banco
- Otimização de throughput

### **Connection Pooling**
```go
func NewPostgresConnection(dsn string) *gorm.DB {
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

    sqlDB, _ := db.DB()
    sqlDB.SetMaxIdleConns(10)
    sqlDB.SetMaxOpenConns(100)
    sqlDB.SetConnMaxLifetime(time.Hour)

    return db
}
```

### **Parallel Processing**
- Goroutines para processamento paralelo
- Worker pools configuráveis
- Load balancing automático

## 📊 Métricas e Monitoramento

### **Métricas Coletadas**
```go
var (
    MessagesProcessed = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "worker_messages_processed_total",
            Help: "Total number of messages processed",
        },
        []string{"handler", "status"},
    )

    ProcessingDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "worker_processing_duration_seconds",
            Help: "Time spent processing messages",
        },
        []string{"handler"},
    )
)
```

### **Health Checks**
```go
func (w *Worker) HealthCheck() error {
    // Verificar conexão com banco
    if err := w.db.DB().Ping(); err != nil {
        return fmt.Errorf("database connection failed: %w", err)
    }

    // Verificar Redis
    if err := w.cache.Ping(); err != nil {
        return fmt.Errorf("redis connection failed: %w", err)
    }

    // Verificar RabbitMQ
    if !w.consumer.IsConnected() {
        return fmt.Errorf("rabbitmq connection lost")
    }

    return nil
}
```

## 🔧 Configuração

### **Variáveis de Ambiente**
```bash
# Database
DATABASE_URL=postgres://explorer:explorer@postgres:5432/blockexplorer?sslmode=disable

# Cache
REDIS_URL=redis://redis:6379

# Message Queue
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/

# Blockchain
ETH_RPC_URL=http://besu:8545
BESU_RPC_URL=http://besu:8545

# Performance
WORKER_POOL_SIZE=10
BATCH_SIZE=50
BATCH_TIMEOUT=5s

# Monitoring
METRICS_PORT=9090
HEALTH_CHECK_PORT=8081
```

### **Configuração Avançada**
```yaml
worker:
  database:
    max_idle_conns: 10
    max_open_conns: 100
    conn_max_lifetime: 1h

  cache:
    ttl:
      hot_data: 30s
      warm_data: 30m
      cold_data: 24h

  processing:
    batch_size: 50
    worker_pool_size: 10
    retry_attempts: 3
    retry_backoff: exponential

  monitoring:
    metrics_enabled: true
    health_checks: true
    profiling: false
```

## 🐛 Troubleshooting

### **Problemas Comuns**

1. **Alta latência de processamento**
   - Aumentar `WORKER_POOL_SIZE`
   - Otimizar queries do banco
   - Verificar performance do Redis

2. **Mensagens perdidas**
   - Verificar ACK/NACK handling
   - Monitorar dead letter queues
   - Ajustar timeout de processamento

3. **Memory leaks**
   - Monitorar uso de memória
   - Verificar conexões não fechadas
   - Otimizar garbage collection

### **Debugging Tools**
```bash
# Logs detalhados
DEBUG=true LOG_LEVEL=debug

# Profiling
go tool pprof http://localhost:6060/debug/pprof/profile

# Métricas
curl http://localhost:9090/metrics
```

## 📈 Roadmap

### **Curto Prazo**
- [ ] Distributed tracing
- [ ] Advanced metrics
- [ ] Performance tuning
- [ ] Error recovery

### **Médio Prazo**
- [ ] Horizontal scaling
- [ ] Event replay system
- [ ] Advanced analytics
- [ ] Custom processors

### **Longo Prazo**
- [ ] Machine learning integration
- [ ] Real-time analytics
- [ ] Advanced monitoring
- [ ] Auto-scaling

---

[⬅️ Voltar: Indexer](./04-indexer.md) | [➡️ Próximo: API REST](./06-api.md)
