package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/hubweb3/worker/internal/domain/entities"
	"github.com/hubweb3/worker/internal/infrastructure/database"
	"github.com/hubweb3/worker/internal/queues"
)

// AccountHandler processa mensagens de accounts
type AccountHandler struct {
	accountRepo *database.PostgresAccountRepository
	consumer    *queues.Consumer
	publisher   *queues.Publisher
}

// NewAccountHandler cria uma nova instância do AccountHandler
func NewAccountHandler(
	accountRepo *database.PostgresAccountRepository,
	consumer *queues.Consumer,
	publisher *queues.Publisher,
) *AccountHandler {
	return &AccountHandler{
		accountRepo: accountRepo,
		consumer:    consumer,
		publisher:   publisher,
	}
}

// Start inicia o processamento das filas de accounts
func (h *AccountHandler) Start(ctx context.Context) error {
	log.Println("🚀 Starting Account Handler...")

	// Loop principal com retry automático
	for {
		select {
		case <-ctx.Done():
			log.Println("🛑 Account Handler encerrado")
			return nil
		default:
			if err := h.startConsumption(ctx); err != nil {
				log.Printf("❌ Erro no Account Handler: %v", err)
				log.Println("⏳ Aguardando 5 segundos antes de tentar novamente...")

				// Aguardar antes de tentar novamente
				select {
				case <-ctx.Done():
					log.Println("🛑 Account Handler encerrado durante retry")
					return nil
				case <-time.After(5 * time.Second):
					continue
				}
			}
		}
	}
}

// startConsumption inicia o consumo de mensagens com tratamento de erro
func (h *AccountHandler) startConsumption(ctx context.Context) error {
	// Declarar fila de criação de accounts
	if err := h.consumer.DeclareQueue(queues.AccountCreationQueue); err != nil {
		return fmt.Errorf("erro ao declarar fila account-creation: %w", err)
	}

	// Consumir mensagens da fila 'account-creation'
	msgs, err := h.consumer.Consume(queues.AccountCreationQueue.Name)
	if err != nil {
		return fmt.Errorf("erro ao iniciar consumo: %w", err)
	}

	log.Printf("✅ Account Handler iniciado, aguardando mensagens na fila '%s'", queues.AccountCreationQueue.Name)

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
			if err := h.handleAccountCreation(ctx, msg.Body); err != nil {
				log.Printf("❌ Erro ao processar criação de account: %v", err)
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

// handleAccountCreation processa mensagens de criação de account
func (h *AccountHandler) handleAccountCreation(ctx context.Context, body []byte) error {
	var msg entities.AccountCreationMessage
	if err := json.Unmarshal(body, &msg); err != nil {
		return fmt.Errorf("failed to unmarshal account creation message: %w", err)
	}

	log.Printf("📝 Processando criação de account: %s (type: %s)", msg.Address, msg.AccountType)

	// Normalizar endereço
	address := strings.ToLower(msg.Address)

	// Verificar se account já existe
	existingAccount, err := h.accountRepo.GetByAddress(ctx, address)
	if err != nil {
		return fmt.Errorf("erro ao verificar account existente: %w", err)
	}

	if existingAccount != nil {
		log.Printf("⚠️ Account %s já existe, ignorando criação", address)
		return nil
	}

	// Determinar tipo de account
	var accountType entities.AccountType
	switch strings.ToLower(msg.AccountType) {
	case "eoa":
		accountType = entities.AccountTypeEOA
	case "smart_account":
		accountType = entities.AccountTypeSmartAccount
	default:
		accountType = entities.AccountTypeEOA // Default
	}

	// Criar nova account
	account := entities.NewAccount(address, accountType)

	// Definir campos opcionais da mensagem
	if msg.Balance != nil {
		if balance, ok := new(big.Int).SetString(*msg.Balance, 10); ok {
			account.Balance = balance
		}
	}

	if msg.Nonce != nil {
		account.Nonce = *msg.Nonce
	}

	if msg.Label != nil {
		account.SetLabel(*msg.Label)
	}

	if msg.RiskScore != nil {
		account.SetRiskScore(*msg.RiskScore)
	}

	if msg.ComplianceStatus != nil {
		var status entities.ComplianceStatus
		switch *msg.ComplianceStatus {
		case "compliant":
			status = entities.ComplianceStatusCompliant
		case "flagged", "non_compliant":
			status = entities.ComplianceStatusFlagged
		case "under_review":
			status = entities.ComplianceStatusUnderReview
		default:
			status = entities.ComplianceStatusCompliant
		}
		account.SetComplianceStatus(status, msg.ComplianceNotes)
	}

	// Salvar account no banco
	if err := h.accountRepo.Create(ctx, account); err != nil {
		return fmt.Errorf("erro ao salvar account no banco: %w", err)
	}

	log.Printf("✅ Account %s criada com sucesso (type: %s)", address, accountType)
	return nil
}
