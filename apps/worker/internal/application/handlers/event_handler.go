package handlers

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/hubweb3/worker/internal/application/services"
	"github.com/hubweb3/worker/internal/domain/entities"
	"github.com/hubweb3/worker/internal/domain/repositories"
	"github.com/hubweb3/worker/internal/queues"
	amqp "github.com/rabbitmq/amqp091-go"
)

// ABIEvent representa um evento na ABI
type ABIEvent struct {
	Name      string     `json:"name"`
	Type      string     `json:"type"`
	Inputs    []ABIInput `json:"inputs"`
	Anonymous bool       `json:"anonymous"`
}

// ABIInput representa um input de evento na ABI
type ABIInput struct {
	Name         string `json:"name"`
	Type         string `json:"type"`
	InternalType string `json:"internalType"`
	Indexed      bool   `json:"indexed"`
}

// EventHandler processa eventos de smart contracts
type EventHandler struct {
	eventRepo                   repositories.EventRepository
	contractRepo                repositories.SmartContractRepository
	consumer                    *queues.Consumer
	publisher                   *queues.Publisher
	accountTransactionProcessor *services.AccountTransactionProcessor
}

// NewEventHandler cria um novo handler de eventos
func NewEventHandler(
	eventRepo repositories.EventRepository,
	contractRepo repositories.SmartContractRepository,
	consumer *queues.Consumer,
	publisher *queues.Publisher,
	accountTransactionProcessor *services.AccountTransactionProcessor,
) *EventHandler {
	return &EventHandler{
		eventRepo:                   eventRepo,
		contractRepo:                contractRepo,
		consumer:                    consumer,
		publisher:                   publisher,
		accountTransactionProcessor: accountTransactionProcessor,
	}
}

// Start inicia o processamento de eventos
func (h *EventHandler) Start(ctx context.Context) error {
	log.Println("🔄 Iniciando Event Handler...")

	// Loop principal com retry automático
	for {
		select {
		case <-ctx.Done():
			log.Println("🛑 Event Handler encerrado")
			return nil
		default:
			if err := h.startConsumption(ctx); err != nil {
				log.Printf("❌ Erro no Event Handler: %v", err)
				log.Println("⏳ Aguardando 5 segundos antes de tentar novamente...")

				// Aguardar antes de tentar novamente
				select {
				case <-ctx.Done():
					log.Println("🛑 Event Handler encerrado durante retry")
					return nil
				case <-time.After(5 * time.Second):
					continue
				}
			}
		}
	}
}

// startConsumption inicia o consumo de mensagens com tratamento de erro
func (h *EventHandler) startConsumption(ctx context.Context) error {
	// Declarar fila de eventos descobertos
	if err := h.consumer.DeclareQueue(queues.EventDiscoveredQueue); err != nil {
		return fmt.Errorf("erro ao declarar fila: %w", err)
	}

	// Consumir mensagens da fila 'event-discovered'
	messages, err := h.consumer.Consume(queues.EventDiscoveredQueue.Name)
	if err != nil {
		return fmt.Errorf("erro ao iniciar consumo: %w", err)
	}

	log.Printf("✅ Event Handler iniciado, aguardando mensagens na fila '%s'", queues.EventDiscoveredQueue.Name)

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
			if err := h.processEventMessage(msg); err != nil {
				log.Printf("❌ Erro ao processar evento: %v", err)
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

// processEventMessage processa uma mensagem de evento
func (h *EventHandler) processEventMessage(msg amqp.Delivery) error {
	log.Printf("[event_handler] 🔍 DEBUG: Mensagem recebida da fila (tamanho: %d bytes)", len(msg.Body))
	log.Printf("[event_handler] 🔍 DEBUG: Conteúdo da mensagem: %s", string(msg.Body))
	return h.ProcessEventDiscovered(context.Background(), msg.Body)
}

// ProcessEventDiscovered processa eventos descobertos pelo indexer
func (h *EventHandler) ProcessEventDiscovered(ctx context.Context, message []byte) error {
	log.Printf("[event_handler] 📥 Processando evento descoberto (tamanho: %d bytes)...", len(message))

	// Deserializar mensagem
	var eventJob struct {
		ID               string   `json:"id"`
		ContractAddress  string   `json:"contract_address"`
		TransactionHash  string   `json:"transaction_hash"`
		BlockNumber      uint64   `json:"block_number"`
		BlockHash        string   `json:"block_hash"`
		LogIndex         uint64   `json:"log_index"`
		TransactionIndex uint64   `json:"transaction_index"`
		Topics           []string `json:"topics"`
		Data             []byte   `json:"data"`
		Removed          bool     `json:"removed"`
		FromAddress      string   `json:"from_address,omitempty"`
		ToAddress        string   `json:"to_address,omitempty"`
		GasUsed          uint64   `json:"gas_used,omitempty"`
		GasPrice         string   `json:"gas_price,omitempty"`
		Timestamp        int64    `json:"timestamp,omitempty"`
		EventSignature   string   `json:"event_signature,omitempty"`
		EventName        string   `json:"event_name,omitempty"`
	}

	if err := json.Unmarshal(message, &eventJob); err != nil {
		log.Printf("[event_handler] ❌ Erro ao deserializar evento: %v", err)
		return fmt.Errorf("erro ao deserializar evento: %w", err)
	}

	log.Printf("[event_handler] 📋 Evento deserializado: ID=%s, Contrato=%s, Bloco=%d, Nome=%s",
		eventJob.ID, eventJob.ContractAddress, eventJob.BlockNumber, eventJob.EventName)

	// Verificar se evento já existe
	exists, err := h.eventRepo.Exists(ctx, eventJob.ID)
	if err != nil {
		return fmt.Errorf("erro ao verificar existência do evento: %w", err)
	}

	if exists {
		log.Printf("[event_handler] ⏭️ Evento %s já processado, ignorando", eventJob.ID)
		return nil
	}

	// Converter para entidade
	event := &entities.Event{
		ID:               eventJob.ID,
		ContractAddress:  eventJob.ContractAddress,
		EventName:        eventJob.EventName,
		EventSignature:   eventJob.EventSignature,
		TransactionHash:  eventJob.TransactionHash,
		BlockNumber:      eventJob.BlockNumber,
		BlockHash:        eventJob.BlockHash,
		LogIndex:         eventJob.LogIndex,
		TransactionIndex: eventJob.TransactionIndex,
		FromAddress:      eventJob.FromAddress,
		Topics:           entities.TopicsArray(eventJob.Topics),
		Data:             eventJob.Data,
		GasUsed:          eventJob.GasUsed,
		GasPrice:         eventJob.GasPrice,
		Status:           "success",
		Removed:          eventJob.Removed,
	}

	// Converter timestamp
	if eventJob.Timestamp > 0 {
		event.Timestamp = time.Unix(eventJob.Timestamp, 0)
	} else {
		event.Timestamp = time.Now()
	}

	// Definir ToAddress se disponível
	if eventJob.ToAddress != "" {
		event.ToAddress = &eventJob.ToAddress
	}

	// Tentar decodificar dados do evento
	if decodedData := h.tryDecodeEventData(eventJob.EventName, eventJob.Topics, eventJob.Data); decodedData != nil {
		event.DecodedData = decodedData
	}

	// Tentar obter nome do contrato (pode ser implementado posteriormente)
	if contractName := h.getContractName(eventJob.ContractAddress); contractName != "" {
		event.ContractName = &contractName
	}

	// Salvar evento no banco
	if err := h.eventRepo.Create(ctx, event); err != nil {
		return fmt.Errorf("erro ao salvar evento: %w", err)
	}

	log.Printf("[event_handler] ✅ Evento %s processado (contrato: %s, tipo: %s)",
		event.ID, event.ContractAddress[:10]+"...", event.EventName)

	// Publicar evento processado para WebSocket
	if err := h.publishEventProcessed(event); err != nil {
		log.Printf("[event_handler] ⚠️ Erro ao publicar evento processado: %v", err)
		// Não falhar o processamento por causa disso
	}

	return nil
}

// tryDecodeEventData usa ABI do contrato para decodificar eventos inteligentemente
func (h *EventHandler) tryDecodeEventData(eventName string, topics []string, data []byte) *entities.DecodedData {
	decoded := make(entities.DecodedData)

	// Primeiro, tentar decodificação baseada em ABI se disponível
	if eventName == "Unknown" && len(topics) > 0 {
		// Se o evento é "Unknown", tentar identificar pela assinatura
		eventSignature := topics[0]
		eventName = h.identifyEventBySignature(eventSignature)
	}

	// Decodificação básica para eventos comuns
	switch eventName {
	case "Transfer":
		return h.decodeTransferEvent(topics, data)
	case "Approval":
		return h.decodeApprovalEvent(topics, data)
	case "NumberSet", "NumberIncremented":
		return h.decodeCounterEvent(eventName, topics, data)
	default:
		// Para eventos desconhecidos, incluir informações básicas
		for i, topic := range topics {
			decoded[fmt.Sprintf("topic_%d", i)] = topic
		}
		if len(data) > 0 {
			decoded["data"] = "0x" + hex.EncodeToString(data)
		}
	}

	if len(decoded) == 0 {
		return nil
	}

	return &decoded
}

// identifyEventBySignature identifica evento pela assinatura usando ABIs conhecidas
func (h *EventHandler) identifyEventBySignature(signature string) string {
	// Mapeamento de assinaturas conhecidas
	knownSignatures := map[string]string{
		"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": "Transfer",
		"0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925": "Approval",
	}

	if name, exists := knownSignatures[signature]; exists {
		return name
	}

	return "Unknown"
}

// decodeTransferEvent decodifica eventos Transfer (ERC20/ERC721)
func (h *EventHandler) decodeTransferEvent(topics []string, data []byte) *entities.DecodedData {
	decoded := make(entities.DecodedData)

	if len(topics) >= 3 {
		// topics[1] = from (indexed)
		// topics[2] = to (indexed)
		from := h.cleanAddress(topics[1])
		to := h.cleanAddress(topics[2])

		decoded["from"] = from
		decoded["to"] = to

		// Para ERC721, pode ter tokenId como terceiro topic
		if len(topics) > 3 {
			decoded["tokenId"] = topics[3]
		}
	}

	if len(data) >= 32 {
		// Para ERC20: value no data
		// Para ERC721: pode não ter data ou ter outros dados
		valueHex := hex.EncodeToString(data[len(data)-32:])
		decoded["value"] = "0x" + valueHex
	}

	return &decoded
}

// decodeApprovalEvent decodifica eventos Approval
func (h *EventHandler) decodeApprovalEvent(topics []string, data []byte) *entities.DecodedData {
	decoded := make(entities.DecodedData)

	if len(topics) >= 3 {
		owner := h.cleanAddress(topics[1])
		spender := h.cleanAddress(topics[2])

		decoded["owner"] = owner
		decoded["spender"] = spender
	}

	if len(data) >= 32 {
		valueHex := hex.EncodeToString(data[len(data)-32:])
		decoded["value"] = "0x" + valueHex
	}

	return &decoded
}

// decodeCounterEvent decodifica eventos do contrato Counter
func (h *EventHandler) decodeCounterEvent(eventName string, _ []string, data []byte) *entities.DecodedData {
	decoded := make(entities.DecodedData)

	// Counter events têm apenas um parâmetro: newNumber (uint256)
	if len(data) >= 32 {
		// Converter últimos 32 bytes para número
		valueBytes := data[len(data)-32:]
		valueHex := hex.EncodeToString(valueBytes)

		// Converter hex para decimal para melhor legibilidade
		decoded["newNumber"] = "0x" + valueHex

		// Tentar converter para decimal também
		if value := h.hexToDecimal(valueHex); value != "" {
			decoded["newNumber_decimal"] = value
		}
	}

	decoded["event_type"] = eventName

	return &decoded
}

// cleanAddress remove padding de zeros de endereços
func (h *EventHandler) cleanAddress(paddedAddress string) string {
	if len(paddedAddress) == 66 && strings.HasPrefix(paddedAddress, "0x") {
		// Remove os zeros do padding (26 caracteres) e mantém apenas os últimos 40
		return "0x" + paddedAddress[26:]
	}
	return paddedAddress
}

// hexToDecimal converte hex para decimal (implementação simples)
func (h *EventHandler) hexToDecimal(hexStr string) string {
	// Remove prefixo 0x se presente
	hexStr = strings.TrimPrefix(hexStr, "0x")

	// Para números pequenos, fazer conversão simples
	if len(hexStr) <= 16 { // até 64 bits
		if val, err := hex.DecodeString(hexStr); err == nil {
			var result uint64
			for _, b := range val {
				result = result*256 + uint64(b)
			}
			return fmt.Sprintf("%d", result)
		}
	}

	return "" // Para números muito grandes, retornar vazio
}

// getContractName busca o nome do contrato na tabela smart_contracts
func (h *EventHandler) getContractName(contractAddress string) string {
	ctx := context.Background()
	name, err := h.contractRepo.GetContractName(ctx, contractAddress)
	if err != nil {
		log.Printf("[event_handler] ⚠️ Erro ao buscar nome do contrato %s: %v", contractAddress, err)
		return ""
	}
	return name
}

// publishEventProcessed publica evento processado para notificações em tempo real
func (h *EventHandler) publishEventProcessed(event *entities.Event) error {
	// Criar payload para WebSocket
	payload := map[string]interface{}{
		"type": "new_event",
		"data": map[string]interface{}{
			"id":               event.ID,
			"event_name":       event.EventName,
			"contract_address": event.ContractAddress,
			"contract_name":    event.ContractName,
			"transaction_hash": event.TransactionHash,
			"block_number":     event.BlockNumber,
			"timestamp":        event.Timestamp.Unix(),
			"from_address":     event.FromAddress,
			"to_address":       event.ToAddress,
			"decoded_data":     event.DecodedData,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	// Publicar para fila de eventos processados (será consumida pelo WebSocket)
	return h.publisher.Publish("event-processed", body)
}

// ProcessEventBatch processa múltiplos eventos em lote para melhor performance
func (h *EventHandler) ProcessEventBatch(ctx context.Context, messages [][]byte) error {
	if len(messages) == 0 {
		return nil
	}

	log.Printf("[event_handler] 📦 Processando lote de %d eventos...", len(messages))

	var events []*entities.Event
	var processedEvents []*entities.Event

	// Processar cada mensagem
	for _, message := range messages {
		var eventJob struct {
			ID               string   `json:"id"`
			ContractAddress  string   `json:"contract_address"`
			TransactionHash  string   `json:"transaction_hash"`
			BlockNumber      uint64   `json:"block_number"`
			BlockHash        string   `json:"block_hash"`
			LogIndex         uint64   `json:"log_index"`
			TransactionIndex uint64   `json:"transaction_index"`
			Topics           []string `json:"topics"`
			Data             []byte   `json:"data"`
			Removed          bool     `json:"removed"`
			FromAddress      string   `json:"from_address,omitempty"`
			ToAddress        string   `json:"to_address,omitempty"`
			GasUsed          uint64   `json:"gas_used,omitempty"`
			GasPrice         string   `json:"gas_price,omitempty"`
			Timestamp        int64    `json:"timestamp,omitempty"`
			EventSignature   string   `json:"event_signature,omitempty"`
			EventName        string   `json:"event_name,omitempty"`
		}

		if err := json.Unmarshal(message, &eventJob); err != nil {
			log.Printf("[event_handler] ⚠️ Erro ao deserializar evento: %v", err)
			continue
		}

		// Verificar se evento já existe
		exists, err := h.eventRepo.Exists(ctx, eventJob.ID)
		if err != nil {
			log.Printf("[event_handler] ⚠️ Erro ao verificar existência do evento %s: %v", eventJob.ID, err)
			continue
		}

		if exists {
			continue
		}

		// Converter para entidade
		event := &entities.Event{
			ID:               eventJob.ID,
			ContractAddress:  eventJob.ContractAddress,
			EventName:        eventJob.EventName,
			EventSignature:   eventJob.EventSignature,
			TransactionHash:  eventJob.TransactionHash,
			BlockNumber:      eventJob.BlockNumber,
			BlockHash:        eventJob.BlockHash,
			LogIndex:         eventJob.LogIndex,
			TransactionIndex: eventJob.TransactionIndex,
			FromAddress:      eventJob.FromAddress,
			Topics:           entities.TopicsArray(eventJob.Topics),
			Data:             eventJob.Data,
			GasUsed:          eventJob.GasUsed,
			GasPrice:         eventJob.GasPrice,
			Status:           "success",
			Removed:          eventJob.Removed,
		}

		// Converter timestamp
		if eventJob.Timestamp > 0 {
			event.Timestamp = time.Unix(eventJob.Timestamp, 0)
		} else {
			event.Timestamp = time.Now()
		}

		// Definir ToAddress se disponível
		if eventJob.ToAddress != "" {
			event.ToAddress = &eventJob.ToAddress
		}

		// Tentar decodificar dados do evento
		if decodedData := h.tryDecodeEventData(eventJob.EventName, eventJob.Topics, eventJob.Data); decodedData != nil {
			event.DecodedData = decodedData
		}

		// Tentar obter nome do contrato
		if contractName := h.getContractName(eventJob.ContractAddress); contractName != "" {
			event.ContractName = &contractName
		}

		events = append(events, event)
		processedEvents = append(processedEvents, event)
	}

	// Salvar todos os eventos em lote
	if len(events) > 0 {
		if err := h.eventRepo.BulkCreate(ctx, events); err != nil {
			return fmt.Errorf("erro ao salvar lote de eventos: %w", err)
		}

		log.Printf("[event_handler] ✅ Lote de %d eventos processado com sucesso", len(events))

		// Publicar eventos processados para notificações
		for _, event := range processedEvents {
			if err := h.publishEventProcessed(event); err != nil {
				log.Printf("[event_handler] ⚠️ Erro ao publicar evento processado %s: %v", event.ID, err)
			}
		}
	}

	return nil
}

// GetEventStats retorna estatísticas de eventos processados
func (h *EventHandler) GetEventStats(ctx context.Context) (*entities.EventStats, error) {
	return h.eventRepo.GetStats(ctx)
}
