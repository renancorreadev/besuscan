package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/hubweb3/worker/internal/queues"
	amqp "github.com/rabbitmq/amqp091-go"
)

// PendingTxHandler processa transações pendentes do mempool
type PendingTxHandler struct {
	consumer  *queues.Consumer
	publisher *queues.Publisher
}

// NewPendingTxHandler cria uma nova instância do handler de transações pendentes
func NewPendingTxHandler(consumer *queues.Consumer, publisher *queues.Publisher) *PendingTxHandler {
	return &PendingTxHandler{
		consumer:  consumer,
		publisher: publisher,
	}
}

// PendingTxJob representa um job de transação pendente
type PendingTxJob struct {
	Hash string `json:"hash"`
}

// Start inicia o processamento de transações pendentes
func (h *PendingTxHandler) Start(ctx context.Context) error {
	log.Println("🔄 Iniciando Pending Transaction Handler...")

	// Loop principal com retry automático
	for {
		select {
		case <-ctx.Done():
			log.Println("🛑 Pending Transaction Handler encerrado")
			return nil
		default:
			if err := h.startConsumption(ctx); err != nil {
				log.Printf("❌ Erro no Pending Transaction Handler: %v", err)
				log.Println("⏳ Aguardando 5 segundos antes de tentar novamente...")

				// Aguardar antes de tentar novamente
				select {
				case <-ctx.Done():
					log.Println("🛑 Pending Transaction Handler encerrado durante retry")
					return nil
				case <-time.After(5 * time.Second):
					continue
				}
			}
		}
	}
}

// startConsumption inicia o consumo de mensagens com tratamento de erro
func (h *PendingTxHandler) startConsumption(ctx context.Context) error {
	// Declarar fila de transações pendentes
	if err := h.consumer.DeclareQueue(queues.PendingTxQueue); err != nil {
		return fmt.Errorf("erro ao declarar fila: %w", err)
	}

	// Consumir mensagens da fila 'pending-tx'
	messages, err := h.consumer.Consume(queues.PendingTxQueue.Name)
	if err != nil {
		return fmt.Errorf("erro ao iniciar consumo: %w", err)
	}

	log.Printf("✅ Pending Transaction Handler iniciado, aguardando mensagens na fila '%s'", queues.PendingTxQueue.Name)

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
			if err := h.processPendingTxMessage(msg); err != nil {
				log.Printf("❌ Erro ao processar transação pendente: %v", err)
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

// processPendingTxMessage processa uma mensagem de transação pendente
func (h *PendingTxHandler) processPendingTxMessage(msg amqp.Delivery) error {
	var pendingTx PendingTxJob
	if err := json.Unmarshal(msg.Body, &pendingTx); err != nil {
		log.Printf("❌ Erro ao deserializar mensagem de transação pendente: %v", err)
		return err
	}

	// VALIDAÇÃO: Rejeitar mensagens com dados inválidos
	if pendingTx.Hash == "" {
		log.Printf("⚠️ Mensagem rejeitada: hash vazio. A mensagem será descartada.")
		return nil
	}

	log.Printf("⏳ [PENDENTE] Transação: %s", pendingTx.Hash)

	// Por enquanto, apenas logamos a transação pendente
	// No futuro, podemos implementar funcionalidades como:
	// - Tracking de tempo na mempool
	// - Análise de gas price
	// - Detecção de transações stuck
	// - Notificações para usuários

	log.Printf("✅ Transação pendente processada: %s", pendingTx.Hash)
	return nil
}
