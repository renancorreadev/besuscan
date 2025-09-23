# 🔍 Indexer - Listener da Blockchain

## 📋 Visão Geral

O **Indexer** é o coração do sistema BesuScan, responsável por monitorar a blockchain Hyperledger Besu em tempo real e capturar todos os eventos relevantes. Ele atua como uma ponte entre o nó Besu e o resto da arquitetura, garantindo que nenhum dado seja perdido.

## 🎯 Responsabilidades Principais

### 1. **Monitoramento da Blockchain**
- Conexão permanente com o nó Besu via WebSocket/HTTP
- Escuta de novos blocos em tempo real
- Captura de transações pending no mempool
- Monitoramento de eventos de smart contracts
- Detecção de reorganizações de cadeia (chain reorgs)

### 2. **Processamento de Eventos**
- Extração de dados dos blocos
- Normalização de transações
- Decodificação de eventos de contratos
- Enriquecimento básico de dados

### 3. **Distribuição de Eventos**
- Publicação no RabbitMQ para processamento assíncrono
- Garantia de entrega de mensagens
- Balanceamento de carga entre workers

## 🏗️ Arquitetura Interna

```mermaid
graph TD
    subgraph "Indexer Service"
        A[Block Listener] --> B[Event Processor]
        C[Transaction Listener] --> B
        D[Event Listener] --> B
        E[Mempool Listener] --> B

        B --> F[Message Publisher]
        F --> G[RabbitMQ Queues]

        H[Reconnection Manager] --> A
        H --> C
        H --> D
        H --> E
    end

    subgraph "External Services"
        I[Besu Node WebSocket] --> A
        I --> C
        I --> D
        I --> E

        G --> J[Worker Services]
    end
```

## 📦 Módulos Principais

### 1. **Block Listener** (`block-listener.go`)

**Função**: Monitora novos blocos na blockchain.

**Características**:
- Conexão WebSocket para `newHeads`
- Processamento sequencial para manter ordem
- Buffer interno para alta throughput
- Reconexão automática em caso de falha

**Código Principal**:
```go
func RunBlockListener() {
    // Configuração de conexão
    besuWS := os.Getenv("ETH_WS_URL")
    client, err := ethclient.Dial(besuWS)

    // Subscrição para novos blocos
    headerCh := make(chan *types.Header)
    sub, err := client.SubscribeNewHead(ctx, headerCh)

    // Processamento de blocos
    for header := range headerCh {
        job := BlockJob{
            Number:    header.Number.Uint64(),
            Hash:      header.Hash().Hex(),
            Timestamp: int64(header.Time),
        }

        // Publicar no RabbitMQ
        publisher.Publish("blocks.new", job)
    }
}
```

**Queues Produzidas**:
- `blocks.new` - Novos blocos minerados

### 2. **Transaction Listener** (`transaction-listener.go`)

**Função**: Captura transações de blocos minerados.

**Características**:
- Extração de transações de cada bloco
- Processamento paralelo com pool de workers
- Decodificação de input data
- Identificação de métodos de contratos

**Funcionalidades**:
- Análise de status de transação (success/failed)
- Cálculo de gas usado e fees
- Extração de logs e eventos
- Identificação de criação de contratos

**Queues Produzidas**:
- `transactions.new` - Transações mineradas
- `transactions.failed` - Transações que falharam

### 3. **Event Listener** (`event-listener.go`)

**Função**: Monitora eventos de smart contracts.

**Características**:
- Filtragem de logs por contratos
- Decodificação automática de eventos
- Suporte para eventos anônimos
- Agrupamento por contrato e tipo

**Tipos de Eventos Capturados**:
- Transfer events (ERC-20/721/1155)
- Approval events
- Custom contract events
- Factory contract deployments

**Queues Produzidas**:
- `events.new` - Novos eventos de contratos
- `events.transfer` - Eventos de transferência

### 4. **Mempool Listener** (`mempool-listener.go`)

**Função**: Monitora transações pending no mempool.

**Características**:
- Subscrição para `pendingTransactions`
- Rastreamento de status das transações
- Detecção de transações dropadas
- Estimativa de tempo de confirmação

**Estados Rastreados**:
- `pending` - No mempool
- `mined` - Incluída em bloco
- `dropped` - Removida do mempool
- `replaced` - Substituída por outra

**Queues Produzidas**:
- `mempool.pending` - Novas transações pending
- `mempool.update` - Atualizações de status

### 5. **Account Indexer** (`account_indexer.go`)

**Função**: Monitora mudanças em contas da blockchain.

**Características**:
- Rastreamento de saldos
- Detecção de novos contratos
- Análise de interações entre contas
- Classificação automática de tipos de conta

**Dados Capturados**:
- Saldo atual da conta
- Nonce atual
- Tipo de conta (EOA/Contract)
- Primeira atividade
- Última atividade

## ⚙️ Configuração e Variáveis de Ambiente

### **Conexão com Besu**
```bash
# WebSocket URL (preferencial)
ETH_WS_URL=ws://localhost:8546

# HTTP RPC URL (fallback)
ETH_RPC_URL=http://localhost:8545

# Chain ID da rede
CHAIN_ID=1337
```

### **RabbitMQ**
```bash
# URL de conexão
RABBITMQ_URL=amqp://guest:guest@localhost:5672/

# Exchange para eventos
RABBITMQ_EXCHANGE=blockchain_events
```

### **Performance**
```bash
# Intervalo de sincronização (segundos)
SYNC_INTERVAL=5

# Bloco inicial para sincronização
STARTING_BLOCK=0

# Número de workers paralelos
WORKER_POOL_SIZE=10

# Tamanho do buffer de blocos
BLOCK_BUFFER_SIZE=1000
```

### **Reconexão**
```bash
# Tentativas de reconexão
MAX_RECONNECT_ATTEMPTS=10

# Intervalo entre tentativas (segundos)
RECONNECT_INTERVAL=5

# Timeout de conexão (segundos)
CONNECTION_TIMEOUT=30
```

## 🔄 Fluxo de Processamento

### 1. **Inicialização**
```
1. Conectar ao nó Besu (WebSocket/HTTP)
2. Conectar ao RabbitMQ
3. Declarar filas necessárias
4. Inicializar pools de workers
5. Configurar reconexão automática
```

### 2. **Monitoramento Contínuo**
```
1. Escutar eventos do Besu
2. Processar eventos em paralelo
3. Validar dados recebidos
4. Enriquecer com metadata
5. Publicar no RabbitMQ
```

### 3. **Recuperação de Falhas**
```
1. Detectar desconexão
2. Aguardar intervalo de reconexão
3. Tentar reconectar automaticamente
4. Retomar do último bloco processado
5. Sincronizar dados perdidos
```

## 📊 Métricas e Monitoramento

### **Métricas Coletadas**
- Blocos processados por segundo
- Transações indexadas por minuto
- Eventos capturados por tipo
- Latência de processamento
- Status de conexão com Besu
- Tamanho das filas RabbitMQ

### **Health Checks**
```go
func (i *Indexer) HealthCheck() error {
    // Verificar conexão com Besu
    if !i.besuClient.IsConnected() {
        return errors.New("Besu connection lost")
    }

    // Verificar RabbitMQ
    if !i.publisher.IsConnected() {
        return errors.New("RabbitMQ connection lost")
    }

    // Verificar último bloco processado
    if time.Since(i.lastBlockTime) > 30*time.Second {
        return errors.New("No blocks processed recently")
    }

    return nil
}
```

### **Logs Estruturados**
```
[block_listener] 📦 Bloco 389152 publicado (0 transações)
[tx_listener] 💰 Transação 0x123... processada (success)
[event_listener] 📜 Evento Transfer capturado no contrato 0x456...
[mempool_listener] ⏳ 15 transações pending no mempool
```

## 🚀 Otimizações de Performance

### 1. **Batch Processing**
- Processamento de múltiplos blocos em lote
- Redução de calls para RabbitMQ
- Otimização de throughput

### 2. **Parallel Workers**
```go
// Pool de workers para processamento paralelo
numWorkers := 10
for i := 0; i < numWorkers; i++ {
    go func(workerID int) {
        for header := range blockBuffer {
            processBlock(header)
        }
    }(i)
}
```

### 3. **Connection Pooling**
- Reutilização de conexões HTTP
- Pool de conexões WebSocket
- Balanceamento de carga

### 4. **Memory Management**
- Buffers circulares para eventos
- Garbage collection otimizado
- Limite de memória por worker

## 🔧 Ferramentas de Debug

### **Logs Detalhados**
```bash
# Ativar logs debug
DEBUG=true

# Nível de log
LOG_LEVEL=debug

# Arquivo de log
LOG_FILE=/var/log/indexer.log
```

### **Métricas Prometheus**
```
# Blocos processados
indexer_blocks_processed_total

# Transações indexadas
indexer_transactions_indexed_total

# Eventos capturados
indexer_events_captured_total

# Latência de processamento
indexer_processing_duration_seconds
```

### **Dashboard Grafana**
- Throughput em tempo real
- Latência de processamento
- Status de conexões
- Alertas automáticos

## 🔒 Segurança e Confiabilidade

### **Validação de Dados**
- Verificação de hashes de bloco
- Validação de assinaturas de transação
- Checagem de integridade de eventos
- Sanitização de inputs

### **Rate Limiting**
- Controle de requests para Besu
- Throttling de publicação no RabbitMQ
- Backpressure handling

### **Error Handling**
```go
func (l *BlockListener) handleError(err error) {
    log.Printf("❌ Erro no Block Listener: %v", err)

    // Incrementar métricas de erro
    metrics.ErrorCount.Inc()

    // Tentar reconexão
    if isConnectionError(err) {
        l.reconnect()
    }

    // Alertar monitoramento
    alerting.SendAlert("indexer_error", err.Error())
}
```

## 📈 Roadmap de Melhorias

### **Curto Prazo**
- [ ] Suporte para múltiplos nós Besu
- [ ] Otimizações de memória
- [ ] Métricas avançadas
- [ ] Circuit breaker pattern

### **Médio Prazo**
- [ ] Sharding de processamento
- [ ] Event replay system
- [ ] Advanced filtering
- [ ] Custom event decoders

### **Longo Prazo**
- [ ] Multi-chain support
- [ ] Machine learning predictions
- [ ] Advanced analytics
- [ ] Real-time dashboards

## 🐛 Troubleshooting Comum

### **Problema**: Indexer não conecta ao Besu
**Solução**:
```bash
# Verificar conectividade
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545

# Verificar logs
docker logs besuscan-indexer
```

### **Problema**: Blocos sendo perdidos
**Solução**:
- Aumentar `BLOCK_BUFFER_SIZE`
- Verificar performance do RabbitMQ
- Monitorar uso de CPU/memória

### **Problema**: Alta latência
**Solução**:
- Otimizar número de workers
- Usar conexão WebSocket
- Implementar connection pooling

---

[⬅️ Voltar ao Índice](./README.md) | [➡️ Próximo: Worker](./05-worker.md)
