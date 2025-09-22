package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/hubweb3/worker/internal/application/services"
	"github.com/hubweb3/worker/internal/domain/entities"
	"github.com/hubweb3/worker/internal/domain/repositories"
	domainServices "github.com/hubweb3/worker/internal/domain/services"
	"github.com/hubweb3/worker/internal/queues"
	amqp "github.com/rabbitmq/amqp091-go"
)

// TransactionHandler processa transações dos blocos
type TransactionHandler struct {
	blockService                *domainServices.BlockService
	txRepo                      repositories.TransactionRepository
	ethClient                   *ethclient.Client
	consumer                    *queues.Consumer
	publisher                   *queues.Publisher
	transactionMethodService    *services.TransactionMethodService
	contractMetricsService      *services.SmartContractMetricsService
	accountTransactionProcessor *services.AccountTransactionProcessor
	processedCount              int64 // Contador de transações processadas
}

// NewTransactionHandler cria uma nova instância do handler de transações
func NewTransactionHandler(
	blockService *domainServices.BlockService,
	txRepo repositories.TransactionRepository,
	ethClient *ethclient.Client,
	consumer *queues.Consumer,
	publisher *queues.Publisher,
	transactionMethodService *services.TransactionMethodService,
	contractMetricsService *services.SmartContractMetricsService,
	accountTransactionProcessor *services.AccountTransactionProcessor,
) *TransactionHandler {
	return &TransactionHandler{
		blockService:                blockService,
		txRepo:                      txRepo,
		ethClient:                   ethClient,
		consumer:                    consumer,
		publisher:                   publisher,
		transactionMethodService:    transactionMethodService,
		contractMetricsService:      contractMetricsService,
		accountTransactionProcessor: accountTransactionProcessor,
	}
}

// Start inicia o processamento de transações
func (h *TransactionHandler) Start(ctx context.Context) error {
	log.Println("🔄 Iniciando Transaction Handler...")

	// Loop principal com retry automático
	for {
		select {
		case <-ctx.Done():
			log.Println("🛑 Transaction Handler encerrado")
			return nil
		default:
			if err := h.startConsumption(ctx); err != nil {
				log.Printf("❌ Erro no Transaction Handler: %v", err)
				log.Println("⏳ Aguardando 5 segundos antes de tentar novamente...")

				// Aguardar antes de tentar novamente
				select {
				case <-ctx.Done():
					log.Println("🛑 Transaction Handler encerrado durante retry")
					return nil
				case <-time.After(5 * time.Second):
					continue
				}
			}
		}
	}
}

// startConsumption inicia o consumo de mensagens com tratamento de erro
func (h *TransactionHandler) startConsumption(ctx context.Context) error {
	// Declarar fila de transações mineradas
	if err := h.consumer.DeclareQueue(queues.TransactionMinedQueue); err != nil {
		return fmt.Errorf("erro ao declarar fila: %w", err)
	}

	// Consumir mensagens da fila 'transaction-mined'
	messages, err := h.consumer.Consume(queues.TransactionMinedQueue.Name)
	if err != nil {
		return fmt.Errorf("erro ao iniciar consumo: %w", err)
	}

	log.Printf("✅ Transaction Handler iniciado, aguardando mensagens na fila '%s'", queues.TransactionMinedQueue.Name)

	for {
		select {
		case <-ctx.Done():
			return nil
		case msg, ok := <-messages:
			if !ok {
				log.Println("⚠️ Canal de mensagens fechado, reiniciando...")
				return fmt.Errorf("canal de mensagens fechado")
			}

			// Processar mensagem com acknowledgment manual
			if err := h.processTransactionMessage(msg); err != nil {
				log.Printf("❌ Erro ao processar transação: %v", err)
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

// processTransactionMessage processa uma mensagem de transação
func (h *TransactionHandler) processTransactionMessage(msg amqp.Delivery) error {
	var txEvent struct {
		Hash        string `json:"hash"`
		BlockNumber uint64 `json:"block_number"`
		BlockHash   string `json:"block_hash"`
		From        string `json:"from"`
		To          string `json:"to"`
		Value       string `json:"value"`
		Gas         uint64 `json:"gas"`
		GasPrice    string `json:"gas_price"`
		Nonce       uint64 `json:"nonce"`
	}

	if err := json.Unmarshal(msg.Body, &txEvent); err != nil {
		log.Printf("❌ Erro ao deserializar mensagem de transação: %v", err)
		return err
	}

	// VALIDAÇÃO: Rejeitar mensagens com dados inválidos
	if txEvent.Hash == "" {
		log.Printf("⚠️ Mensagem rejeitada: hash vazio. A mensagem será descartada.")
		return nil
	}

	if txEvent.BlockHash == "" || txEvent.BlockNumber == 0 {
		log.Printf("⚠️ Mensagem rejeitada para tx %s: block_hash='%s', block_number=%d. A mensagem será descartada.",
			txEvent.Hash, txEvent.BlockHash, txEvent.BlockNumber)
		return nil
	}

	// Verificar se a transação já existe no banco antes de processar
	exists, err := h.txRepo.Exists(context.Background(), txEvent.Hash)
	if err != nil {
		log.Printf("❌ Erro ao verificar existência da transação %s: %v", txEvent.Hash, err)
		return err
	}

	if exists {
		log.Printf("✅ Transação %s já existe no banco, pulando processamento", txEvent.Hash)
		return nil // Não é erro, apenas pula o processamento
	}

	log.Printf("💰 [RECEBIDO] Transação: %s (bloco: %d, hash: %s)", txEvent.Hash, txEvent.BlockNumber, txEvent.BlockHash)

	// Buscar dados completos da transação com retry
	txHash := common.HexToHash(txEvent.Hash)

	var tx *types.Transaction
	var isPending bool

	// Tentar buscar a transação com retry (máximo 3 tentativas)
	for attempt := 1; attempt <= 3; attempt++ {
		tx, isPending, err = h.ethClient.TransactionByHash(context.Background(), txHash)
		if err == nil {
			break
		}

		if attempt < 3 {
			log.Printf("⏳ Tentativa %d falhou para transação %s, tentando novamente em 1s...", attempt, txEvent.Hash)
			time.Sleep(1 * time.Second)
		}
	}

	if err != nil {
		log.Printf("❌ Erro ao buscar transação %s após 3 tentativas: %v", txEvent.Hash, err)
		return fmt.Errorf("erro ao buscar transação após 3 tentativas: %w", err)
	}

	if isPending {
		log.Printf("⏳ Transação %s ainda está pendente", txEvent.Hash)
		return nil
	}

	// Buscar receipt da transação com retry
	var receipt *types.Receipt
	for attempt := 1; attempt <= 3; attempt++ {
		receipt, err = h.ethClient.TransactionReceipt(context.Background(), txHash)
		if err == nil {
			break
		}

		if attempt < 3 {
			log.Printf("⏳ Tentativa %d falhou para receipt %s, tentando novamente em 1s...", attempt, txEvent.Hash)
			time.Sleep(1 * time.Second)
		}
	}

	if err != nil {
		log.Printf("❌ Erro ao buscar receipt %s após 3 tentativas: %v", txEvent.Hash, err)
		return fmt.Errorf("erro ao buscar receipt após 3 tentativas: %w", err)
	}

	// Buscar bloco para obter timestamp
	block, err := h.ethClient.BlockByHash(context.Background(), common.HexToHash(txEvent.BlockHash))
	if err != nil {
		// Se não conseguir buscar por hash, tentar por número
		log.Printf("⚠️ Erro ao buscar bloco por hash %s, tentando por número %d", txEvent.BlockHash, txEvent.BlockNumber)
		block, err = h.ethClient.BlockByNumber(context.Background(), big.NewInt(int64(txEvent.BlockNumber)))
		if err != nil {
			log.Printf("❌ Erro ao buscar bloco %d: %v", txEvent.BlockNumber, err)
			return fmt.Errorf("erro ao buscar bloco: %w", err)
		}
	}

	// Converter para entidade de domínio
	transaction := h.convertToTransaction(tx, receipt, block)

	// Salvar transação usando o repositório diretamente
	if err := h.saveTransaction(context.Background(), transaction); err != nil {
		log.Printf("❌ Erro ao salvar transação %s: %v", txEvent.Hash, err)
		return err
	}

	// Identificar e salvar método da transação
	if err := h.identifyAndSaveTransactionMethod(context.Background(), tx, receipt, transaction); err != nil {
		log.Printf("⚠️ Erro ao identificar método da transação %s: %v", txEvent.Hash, err)
		// Não retornar erro para não falhar o processamento da transação
	}

	// Atualizar métricas de smart contracts
	if err := h.contractMetricsService.UpdateContractMetricsFromTransaction(context.Background(), transaction); err != nil {
		log.Printf("⚠️ Erro ao atualizar métricas de smart contract para transação %s: %v", txEvent.Hash, err)
		// Não retornar erro para não falhar o processamento da transação
	}

	// Processar dados de accounts relacionados à transação
	if err := h.accountTransactionProcessor.ProcessTransaction(context.Background(), transaction); err != nil {
		log.Printf("⚠️ Erro ao processar dados de accounts para transação %s: %v", txEvent.Hash, err)
		// Não retornar erro para não falhar o processamento da transação
	}

	// Incrementar contador
	h.processedCount++
	log.Printf("✅ [SALVO] Transação %s salva com sucesso no banco (Total processadas: %d)", txEvent.Hash, h.processedCount)

	// Publicar evento de transação processada
	if err := h.publishTransactionProcessed(transaction); err != nil {
		log.Printf("⚠️ Erro ao publicar evento de transação processada: %v", err)
	}

	return nil
}

// saveTransaction salva a transação no banco de dados
func (h *TransactionHandler) saveTransaction(ctx context.Context, tx *entities.Transaction) error {
	log.Printf("🔄 Salvando transação %s no banco de dados", tx.Hash)

	// Verificar se a transação já existe
	exists, err := h.txRepo.Exists(ctx, tx.Hash)
	if err != nil {
		return err
	}

	if exists {
		log.Printf("⚠️ Transação %s já existe, atualizando...", tx.Hash)
		if err := h.txRepo.Update(ctx, tx); err != nil {
			// Se o erro for de constraint de duplicata, apenas logar e continuar
			if strings.Contains(err.Error(), "unique_tx_per_block") {
				log.Printf("⚠️ Transação %s já existe com mesmo block_hash e transaction_index, ignorando...", tx.Hash)
				return nil
			}
			return err
		}
		return nil
	}

	// Salvar nova transação
	if err := h.txRepo.Save(ctx, tx); err != nil {
		// Se o erro for de constraint de duplicata, apenas logar e continuar
		if strings.Contains(err.Error(), "unique_tx_per_block") {
			log.Printf("⚠️ Transação %s já existe com mesmo block_hash e transaction_index, ignorando...", tx.Hash)
			return nil
		}
		return err
	}

	return nil
}

// convertToTransaction converte dados da blockchain para entidade de domínio
func (h *TransactionHandler) convertToTransaction(tx *types.Transaction, receipt *types.Receipt, block *types.Block) *entities.Transaction {
	var fromAddr string
	var toAddr *string

	// Extrair endereço do remetente
	if from, err := types.Sender(types.NewEIP155Signer(tx.ChainId()), tx); err == nil {
		fromAddr = from.Hex()
	}

	// Endereço do destinatário
	if tx.To() != nil {
		addr := tx.To().Hex()
		toAddr = &addr
	}

	// Determinar status
	status := entities.StatusSuccess
	if receipt.Status == 0 {
		status = entities.StatusFailed
	}

	// Calcular taxas
	gasPrice := tx.GasPrice()
	var maxFeePerGas, maxPriorityFeePerGas *big.Int

	if tx.Type() == types.DynamicFeeTxType {
		maxFeePerGas = tx.GasFeeCap()
		maxPriorityFeePerGas = tx.GasTipCap()
	}

	// Endereço do contrato criado (se aplicável)
	var contractAddress *string
	if receipt.ContractAddress != (common.Address{}) {
		addr := receipt.ContractAddress.Hex()
		contractAddress = &addr
	}

	// Converter valores
	blockNumber := block.Number().Uint64()
	blockHash := block.Hash().Hex()
	txIndex := uint64(receipt.TransactionIndex)
	gasUsed := receipt.GasUsed
	minedAt := time.Unix(int64(block.Time()), 0)

	return &entities.Transaction{
		Hash:                 tx.Hash().Hex(),
		BlockNumber:          &blockNumber,
		BlockHash:            &blockHash,
		TransactionIndex:     &txIndex,
		From:                 fromAddr,
		To:                   toAddr,
		Value:                tx.Value(),
		Gas:                  tx.Gas(),
		GasUsed:              &gasUsed,
		GasPrice:             gasPrice,
		MaxFeePerGas:         maxFeePerGas,
		MaxPriorityFeePerGas: maxPriorityFeePerGas,
		Data:                 tx.Data(),
		Nonce:                tx.Nonce(),
		Status:               status,
		Type:                 uint8(tx.Type()),
		ContractAddress:      contractAddress,
		LogsBloom:            receipt.Bloom.Bytes(),
		MinedAt:              &minedAt,
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}
}

// publishTransactionProcessed publica evento de transação processada
func (h *TransactionHandler) publishTransactionProcessed(tx *entities.Transaction) error {
	event := map[string]interface{}{
		"type":        "transaction-processed",
		"hash":        tx.Hash,
		"blockNumber": tx.BlockNumber,
		"from":        tx.From,
		"to":          tx.To,
		"value":       tx.Value.String(),
		"gasUsed":     tx.GasUsed,
		"status":      string(tx.Status),
		"timestamp":   tx.MinedAt.Unix(),
	}

	eventData, err := json.Marshal(event)
	if err != nil {
		return err
	}

	return h.publisher.Publish("transaction-processed", eventData)
}

// identifyAndSaveTransactionMethod identifica e salva o método da transação
func (h *TransactionHandler) identifyAndSaveTransactionMethod(ctx context.Context, tx *types.Transaction, receipt *types.Receipt, transaction *entities.Transaction) error {
	log.Printf("🔍 Identificando método da transação %s...", transaction.Hash)

	// Preparar valores para identificação
	var toAddress *string
	if tx.To() != nil {
		addr := tx.To().Hex()
		toAddress = &addr
	}

	var contractAddress *string
	if receipt.ContractAddress != (common.Address{}) {
		addr := receipt.ContractAddress.Hex()
		contractAddress = &addr
	}

	// Identificar método
	method, err := h.transactionMethodService.IdentifyTransactionMethod(
		ctx,
		&transaction.Hash,
		&transaction.From,
		toAddress,
		tx.Value().Bytes(),
		tx.Data(),
		contractAddress,
	)
	if err != nil {
		return fmt.Errorf("erro ao identificar método: %w", err)
	}

	// Salvar método identificado
	if err := h.transactionMethodService.SaveTransactionMethod(ctx, method); err != nil {
		return fmt.Errorf("erro ao salvar método: %w", err)
	}

	log.Printf("✅ Método identificado para transação %s: %s (%s)", transaction.Hash, method.MethodName, method.MethodType)
	return nil
}
