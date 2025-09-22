package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/hubweb3/worker/internal/domain/entities"
	"github.com/hubweb3/worker/internal/domain/services"
	"github.com/hubweb3/worker/internal/infrastructure/cache"
	"github.com/hubweb3/worker/internal/queues"
)

// BlockHandler gerencia o processamento de eventos de blocos
type BlockHandler struct {
	blockService *services.BlockService
	ethClient    *ethclient.Client
	consumer     *queues.Consumer
	publisher    *queues.Publisher
	redisCache   *cache.RedisCache

	// Batching configuration
	batchSize    int
	batchTimeout time.Duration
	blockBatch   []*entities.Block
	batchMutex   sync.Mutex
	batchTimer   *time.Timer
}

// NewBlockHandler cria uma nova instância do handler de blocos
func NewBlockHandler(blockService *services.BlockService, ethClient *ethclient.Client, consumer *queues.Consumer, publisher *queues.Publisher) *BlockHandler {
	return &BlockHandler{
		blockService: blockService,
		ethClient:    ethClient,
		consumer:     consumer,
		publisher:    publisher,
		redisCache:   cache.NewRedisCache(),
		batchSize:    10,              // Process 10 blocks at once (otimizado para PostgreSQL)
		batchTimeout: 5 * time.Second, // Timeout de 5 segundos (PostgreSQL)
		blockBatch:   make([]*entities.Block, 0),
	}
}

// BlockEvent representa um evento de bloco vindo do indexer
type BlockEvent struct {
	Number    uint64 `json:"number"`
	Hash      string `json:"hash"`
	Timestamp int64  `json:"timestamp"`
}

// BlockEventLegacy representa um evento de bloco no formato legado
type BlockEventLegacy struct {
	BlockNumber string `json:"block_number"`
	BlockHash   string `json:"block_hash"`
	Timestamp   int64  `json:"timestamp"`
	TxCount     int    `json:"tx_count"`
}

// Start inicia o processamento de eventos de blocos
func (h *BlockHandler) Start(ctx context.Context) error {
	log.Println("🔄 Iniciando Block Handler...")

	// Loop principal com retry automático
	for {
		select {
		case <-ctx.Done():
			log.Println("🛑 Block Handler encerrado")
			return nil
		default:
			if err := h.startConsumption(ctx); err != nil {
				log.Printf("❌ Erro no Block Handler: %v", err)
				log.Println("⏳ Aguardando 5 segundos antes de tentar novamente...")

				// Aguardar antes de tentar novamente
				select {
				case <-ctx.Done():
					log.Println("🛑 Block Handler encerrado durante retry")
					return nil
				case <-time.After(5 * time.Second):
					continue
				}
			}
		}
	}
}

// startConsumption inicia o consumo de mensagens com tratamento de erro
func (h *BlockHandler) startConsumption(ctx context.Context) error {
	// Declarar fila de blocos processados (não mais block-mined)
	if err := h.consumer.DeclareQueue(queues.BlockProcessedQueue); err != nil {
		return fmt.Errorf("erro ao declarar fila: %w", err)
	}

	// Consumir mensagens da fila 'block-processed'
	msgs, err := h.consumer.Consume(queues.BlockProcessedQueue.Name)
	if err != nil {
		return fmt.Errorf("erro ao iniciar consumo: %w", err)
	}

	log.Printf("✅ Block Handler iniciado, aguardando mensagens na fila '%s'", queues.BlockProcessedQueue.Name)

	for {
		select {
		case <-ctx.Done():
			return nil
		case msg, ok := <-msgs:
			if !ok {
				log.Println("⚠️ Canal de mensagens fechado, reiniciando...")
				return fmt.Errorf("canal de mensagens fechado")
			}

			// Processar mensagem com acknowledgment manual
			if err := h.HandleBlockEvent(ctx, msg.Body); err != nil {
				log.Printf("❌ Erro ao processar evento de bloco: %v", err)
				// Rejeitar mensagem e reenviar para fila
				if nackErr := msg.Nack(false, true); nackErr != nil {
					log.Printf("❌ Erro ao fazer NACK da mensagem: %v", nackErr)
				}
			} else {
				// Confirmar processamento bem-sucedido
				if ackErr := msg.Ack(false); ackErr != nil {
					log.Printf("⚠️ Erro ao fazer ACK da mensagem: %v", ackErr)
				}
			}
		}
	}
}

// addToBatch adds a block to the batch for processing
func (h *BlockHandler) addToBatch(block *entities.Block) {
	h.batchMutex.Lock()
	defer h.batchMutex.Unlock()

	h.blockBatch = append(h.blockBatch, block)

	// If batch is full, process immediately
	if len(h.blockBatch) >= h.batchSize {
		h.processBatch()
		return
	}

	// Reset timer for timeout-based processing
	if h.batchTimer != nil {
		h.batchTimer.Stop()
	}
	h.batchTimer = time.AfterFunc(h.batchTimeout, func() {
		h.batchMutex.Lock()
		defer h.batchMutex.Unlock()
		if len(h.blockBatch) > 0 {
			h.processBatch()
		}
	})
}

// processBatch processes all blocks in the current batch
func (h *BlockHandler) processBatch() {
	if len(h.blockBatch) == 0 {
		return
	}

	batchToProcess := make([]*entities.Block, len(h.blockBatch))
	copy(batchToProcess, h.blockBatch)
	h.blockBatch = h.blockBatch[:0] // Clear the batch

	log.Printf("🚀 Processando lote de %d blocos", len(batchToProcess))

	// Process batch using bulk operations
	start := time.Now()
	if err := h.blockService.ProcessBlocksBatch(context.Background(), batchToProcess); err != nil {
		log.Printf("❌ Erro ao processar lote de blocos: %v", err)
		// TODO: Implement retry mechanism for failed batches
		return
	}

	duration := time.Since(start)
	log.Printf("✅ Lote de %d blocos processado em %v (%.2f blocos/seg)",
		len(batchToProcess), duration, float64(len(batchToProcess))/duration.Seconds())

	// 🚀 CACHE REDIS: Atualizar dados críticos no cache
	h.updateRedisCache(batchToProcess)
}

// updateRedisCacheInstant atualiza o cache Redis INSTANTANEAMENTE para um bloco
func (h *BlockHandler) updateRedisCacheInstant(block *entities.Block) {
	// 1. Cache do último bloco (TTL: 30 segundos - para teste)
	if err := h.redisCache.SetLatestBlock(
		int64(block.Number),
		block.Hash,
		block.Timestamp.Unix(),
	); err != nil {
		log.Printf("⚠️ Erro ao cachear último bloco instantâneo: %v", err)
	} else {
		log.Printf("⚡ Cache INSTANTÂNEO - Último bloco: %d", block.Number)
	}

	// 2. Cache de bloco individual (TTL: 30 minutos - dados imutáveis)
	blockData := map[string]interface{}{
		"number":       block.Number,
		"hash":         block.Hash,
		"parent_hash":  block.ParentHash,
		"timestamp":    block.Timestamp.Unix(),
		"miner":        block.Miner,
		"difficulty":   block.Difficulty.String(),
		"size":         block.Size,
		"gas_limit":    block.GasLimit,
		"gas_used":     block.GasUsed,
		"tx_count":     block.TxCount,
		"uncle_count":  block.UncleCount,
		"base_fee":     block.BaseFeePerGas.String(),
		"bloom":        block.Bloom,
		"extra_data":   block.ExtraData,
		"mix_digest":   block.MixDigest,
		"nonce":        block.Nonce,
		"receipt_hash": block.ReceiptHash,
		"state_root":   block.StateRoot,
		"tx_hash":      block.TxHash,
	}

	if err := h.redisCache.SetBlock(int64(block.Number), blockData); err != nil {
		log.Printf("⚠️ Erro ao cachear bloco %d instantâneo: %v", block.Number, err)
	}

	// 3. Atualizar estatísticas básicas (estimativa simples)
	totalBlocks := int64(block.Number)
	estimatedTotalTx := totalBlocks * 10 // Estimativa conservadora
	avgBlockTime := 4.0                  // Default para Besu

	if err := h.redisCache.SetNetworkStats(totalBlocks, estimatedTotalTx, avgBlockTime); err != nil {
		log.Printf("⚠️ Erro ao cachear estatísticas instantâneas: %v", err)
	} else {
		log.Printf("📊 Cache INSTANTÂNEO - Stats: %d blocos", totalBlocks)
	}
}

// updateRedisCache atualiza o cache Redis com dados críticos (BATCH - mantido para compatibilidade)
func (h *BlockHandler) updateRedisCache(blocks []*entities.Block) {
	if len(blocks) == 0 {
		return
	}

	// Encontrar o bloco mais recente do lote
	latestBlock := blocks[0]
	for _, block := range blocks {
		if block.Number > latestBlock.Number {
			latestBlock = block
		}
	}

	// 1. Cache do último bloco (TTL: 2 segundos)
	if err := h.redisCache.SetLatestBlock(
		int64(latestBlock.Number),
		latestBlock.Hash,
		latestBlock.Timestamp.Unix(),
	); err != nil {
		log.Printf("⚠️ Erro ao cachear último bloco: %v", err)
	} else {
		log.Printf("📦 Cache atualizado - Último bloco: %d", latestBlock.Number)
	}

	// 2. Cache de blocos individuais (TTL: 30 minutos - dados imutáveis)
	for _, block := range blocks {
		blockData := map[string]interface{}{
			"number":       block.Number,
			"hash":         block.Hash,
			"parent_hash":  block.ParentHash,
			"timestamp":    block.Timestamp.Unix(),
			"miner":        block.Miner,
			"difficulty":   block.Difficulty.String(),
			"size":         block.Size,
			"gas_limit":    block.GasLimit,
			"gas_used":     block.GasUsed,
			"tx_count":     block.TxCount,
			"uncle_count":  block.UncleCount,
			"base_fee":     block.BaseFeePerGas.String(),
			"bloom":        block.Bloom,
			"extra_data":   block.ExtraData,
			"mix_digest":   block.MixDigest,
			"nonce":        block.Nonce,
			"receipt_hash": block.ReceiptHash,
			"state_root":   block.StateRoot,
			"tx_hash":      block.TxHash,
		}

		if err := h.redisCache.SetBlock(int64(block.Number), blockData); err != nil {
			log.Printf("⚠️ Erro ao cachear bloco %d: %v", block.Number, err)
		}
	}

	// 3. Atualizar estatísticas da rede (estimativa baseada no lote)
	// Calcular tempo médio entre blocos do lote
	if len(blocks) > 1 {
		var totalTime int64
		for i := 1; i < len(blocks); i++ {
			timeDiff := blocks[i].Timestamp.Unix() - blocks[i-1].Timestamp.Unix()
			if timeDiff > 0 {
				totalTime += timeDiff
			}
		}

		avgBlockTime := float64(totalTime) / float64(len(blocks)-1)
		if avgBlockTime <= 0 {
			avgBlockTime = 4.0 // Default para Besu
		}

		// Estimativa de totais (baseada no último bloco)
		totalBlocks := int64(latestBlock.Number)
		estimatedTotalTx := totalBlocks * 10 // Estimativa conservadora

		if err := h.redisCache.SetNetworkStats(totalBlocks, estimatedTotalTx, avgBlockTime); err != nil {
			log.Printf("⚠️ Erro ao cachear estatísticas da rede: %v", err)
		} else {
			log.Printf("📊 Cache atualizado - Stats: %d blocos, avg: %.1fs", totalBlocks, avgBlockTime)
		}
	}
}

// HandleBlockEvent processa um evento de bloco
func (h *BlockHandler) HandleBlockEvent(ctx context.Context, body []byte) error {
	// Tentar deserializar como BlockEvent primeiro (novo formato do indexer)
	var event BlockEvent
	if err := json.Unmarshal(body, &event); err != nil {
		// Se falhar, tentar como BlockEventLegacy (formato anterior)
		var legacyEvent BlockEventLegacy
		if err := json.Unmarshal(body, &legacyEvent); err != nil {
			// Se falhar, tentar como string simples (compatibilidade total)
			blockNumberStr := string(body)
			log.Printf("📦 Processando bloco (formato string): %s", blockNumberStr)

			// Converter para BlockEvent
			blockNumber := new(big.Int)
			blockNumber.SetString(blockNumberStr, 10)
			event = BlockEvent{
				Number: blockNumber.Uint64(),
			}
		} else {
			// Converter formato legado para novo formato
			blockNumber := new(big.Int)
			blockNumber.SetString(legacyEvent.BlockNumber, 10)
			event = BlockEvent{
				Number:    blockNumber.Uint64(),
				Hash:      legacyEvent.BlockHash,
				Timestamp: legacyEvent.Timestamp,
			}
			log.Printf("📦 Processando bloco (formato legado): %d", event.Number)
		}
	} else {
		log.Printf("📦 Processando bloco: %d (hash: %s)", event.Number, event.Hash)
	}

	// Buscar dados completos do bloco na blockchain
	ethBlock, err := h.ethClient.BlockByNumber(ctx, big.NewInt(int64(event.Number)))
	if err != nil {
		return err
	}

	// Converter para entidade de domínio
	block := h.convertToEntity(ethBlock, &event)

	// 🚀 CACHE REDIS INSTANTÂNEO: Atualizar cache imediatamente
	h.updateRedisCacheInstant(block)

	// Adicionar ao batch para PostgreSQL
	h.addToBatch(block)

	// Eventos de transações são publicados pelo indexer/transaction-listener
	// Removido para evitar duplicação e eventos malformados

	// WebSocket publishing removido - não é performático via RabbitMQ

	log.Printf("📦 Bloco %d adicionado ao batch", event.Number)
	return nil
}

// publishTransactionEvents foi removida para evitar duplicação
// Os eventos de transação são publicados pelo indexer/transaction-listener

// convertToEntity converte dados da blockchain para entidade de domínio
func (h *BlockHandler) convertToEntity(ethBlock interface{}, event *BlockEvent) *entities.Block {
	// Converter interface{} para *types.Block
	block, ok := ethBlock.(*types.Block)
	if !ok {
		log.Printf("⚠️ Erro ao converter ethBlock para *types.Block, usando dados básicos do evento")
		// Fallback para dados básicos do evento
		timestamp := time.Unix(event.Timestamp, 0)
		if event.Timestamp == 0 {
			timestamp = time.Now()
		}
		return entities.NewBlock(event.Number, event.Hash, timestamp)
	}

	// Extrair dados completos do bloco
	timestamp := time.Unix(int64(block.Time()), 0)

	// Criar entidade com dados completos
	entity := entities.NewBlock(block.NumberU64(), block.Hash().Hex(), timestamp)

	// Preencher campos básicos
	entity.ParentHash = block.ParentHash().Hex()
	entity.Miner = block.Coinbase().Hex()
	entity.Difficulty = block.Difficulty()
	entity.Size = uint64(block.Size())
	entity.GasLimit = block.GasLimit()
	entity.GasUsed = block.GasUsed()
	entity.TxCount = len(block.Transactions())
	entity.UncleCount = len(block.Uncles())

	// BaseFeePerGas (EIP-1559)
	if block.BaseFee() != nil {
		entity.BaseFeePerGas = block.BaseFee()
	}

	// Novos campos extraídos
	entity.Bloom = fmt.Sprintf("0x%x", block.Bloom())     // Bloom filter (conversão correta)
	entity.ExtraData = fmt.Sprintf("0x%x", block.Extra()) // Dados extras em hex
	entity.MixDigest = block.MixDigest().Hex()            // Mix digest
	entity.Nonce = block.Nonce()                          // Nonce
	entity.ReceiptHash = block.ReceiptHash().Hex()        // Hash das receipts
	entity.StateRoot = block.Root().Hex()                 // Root do estado
	entity.TxHash = block.TxHash().Hex()                  // Hash das transações

	log.Printf("📊 Bloco %d: %d transações, %d gas usado, minerador: %s, tamanho: %d bytes",
		entity.Number, entity.TxCount, entity.GasUsed, entity.Miner, entity.Size)

	log.Printf("🔗 Hashes - State: %s, Receipt: %s, Tx: %s",
		entity.StateRoot[:10]+"...", entity.ReceiptHash[:10]+"...", entity.TxHash[:10]+"...")

	return entity
}
