package services

import (
	"context"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/hubweb3/worker/internal/domain/entities"
	"github.com/hubweb3/worker/internal/domain/repositories"
)

// BulkOperationResult representa o resultado de uma operação em lote
type BulkOperationResult struct {
	SuccessCount int
	ErrorCount   int
	Errors       []error
}

// AccountService define a interface para serviços de contas
type AccountService interface {
	// Descoberta e criação de contas
	DiscoverAccount(ctx context.Context, address string) (*entities.Account, error)
	CreateOrUpdateAccount(ctx context.Context, address string, accountType entities.AccountType) (*entities.Account, error)

	// Processamento de transações
	ProcessTransactionForAccounts(ctx context.Context, tx *entities.Transaction) error
	UpdateAccountFromTransaction(ctx context.Context, address string, tx *entities.Transaction) error

	// Smart Accounts (ERC-4337)
	ProcessSmartAccount(ctx context.Context, address string, factoryAddress, implementationAddress, ownerAddress *string) error
	DetectSmartAccountType(ctx context.Context, address string) (entities.AccountType, error)

	// Analytics e métricas
	UpdateDailyAnalytics(ctx context.Context, address string, date time.Time) error
	CalculateRiskScore(ctx context.Context, address string) (int, error)

	// Compliance
	AnalyzeCompliance(ctx context.Context, address string) (entities.ComplianceStatus, string, error)
	FlagAccount(ctx context.Context, address string, reason string) error

	// Interações com contratos
	ProcessContractInteraction(ctx context.Context, accountAddress, contractAddress string, method *string, gasUsed, valueSent string) error

	// Token holdings
	UpdateTokenHolding(ctx context.Context, accountAddress, tokenAddress, symbol, name string, decimals uint8, balance, valueUSD string) error

	// ===== NOVOS MÉTODOS PARA OPERAÇÕES VIA API =====

	// Criação e atualização via API
	CreateAccountFromAPI(ctx context.Context, msg *entities.AccountCreationMessage) error
	UpdateAccountFromAPI(ctx context.Context, msg *entities.AccountUpdateMessage) error

	// Tagging
	ProcessAccountTagging(ctx context.Context, msg *entities.AccountTaggingMessage) error

	// Compliance via API
	UpdateAccountCompliance(ctx context.Context, msg *entities.AccountComplianceUpdateMessage) error

	// Operações em lote
	ProcessBulkOperation(ctx context.Context, msg *entities.AccountBulkOperationMessage) (*BulkOperationResult, error)
}

// accountService implementa AccountService
type accountService struct {
	accountRepo             repositories.AccountRepository
	accountTagRepo          repositories.AccountTagRepository
	accountAnalyticsRepo    repositories.AccountAnalyticsRepository
	contractInteractionRepo repositories.ContractInteractionRepository
	tokenHoldingRepo        repositories.TokenHoldingRepository
}

// NewAccountService cria uma nova instância do serviço de contas
func NewAccountService(
	accountRepo repositories.AccountRepository,
	accountTagRepo repositories.AccountTagRepository,
	accountAnalyticsRepo repositories.AccountAnalyticsRepository,
	contractInteractionRepo repositories.ContractInteractionRepository,
	tokenHoldingRepo repositories.TokenHoldingRepository,
) AccountService {
	return &accountService{
		accountRepo:             accountRepo,
		accountTagRepo:          accountTagRepo,
		accountAnalyticsRepo:    accountAnalyticsRepo,
		contractInteractionRepo: contractInteractionRepo,
		tokenHoldingRepo:        tokenHoldingRepo,
	}
}

// DiscoverAccount descobre uma nova conta a partir de um endereço
func (s *accountService) DiscoverAccount(ctx context.Context, address string) (*entities.Account, error) {
	// Normalizar endereço
	address = strings.ToLower(address)

	// Verificar se a conta já existe
	existingAccount, err := s.accountRepo.GetByAddress(ctx, address)
	if err == nil && existingAccount != nil {
		return existingAccount, nil
	}

	// Detectar tipo de conta
	accountType, err := s.DetectSmartAccountType(ctx, address)
	if err != nil {
		// Se não conseguir detectar, assume EOA por padrão
		accountType = entities.AccountTypeEOA
	}

	// Criar nova conta
	account := entities.NewAccount(address, accountType)

	// Salvar no repositório
	if err := s.accountRepo.Create(ctx, account); err != nil {
		return nil, fmt.Errorf("failed to create account: %w", err)
	}

	return account, nil
}

// CreateOrUpdateAccount cria ou atualiza uma conta
func (s *accountService) CreateOrUpdateAccount(ctx context.Context, address string, accountType entities.AccountType) (*entities.Account, error) {
	address = strings.ToLower(address)

	// Tentar buscar conta existente
	account, err := s.accountRepo.GetByAddress(ctx, address)
	if err != nil {
		// Conta não existe, criar nova
		account = entities.NewAccount(address, accountType)
		if err := s.accountRepo.Create(ctx, account); err != nil {
			return nil, fmt.Errorf("failed to create account: %w", err)
		}
		return account, nil
	}

	// Conta existe, atualizar se necessário
	if account.Type != accountType {
		account.Type = accountType
		if err := s.accountRepo.Update(ctx, account); err != nil {
			return nil, fmt.Errorf("failed to update account: %w", err)
		}
	}

	return account, nil
}

// ProcessTransactionForAccounts processa uma transação para atualizar contas relacionadas
func (s *accountService) ProcessTransactionForAccounts(ctx context.Context, tx *entities.Transaction) error {
	// Processar conta remetente
	if err := s.UpdateAccountFromTransaction(ctx, tx.From, tx); err != nil {
		return fmt.Errorf("failed to update sender account: %w", err)
	}

	// Processar conta destinatária (se existir)
	if tx.To != nil && *tx.To != "" {
		if err := s.UpdateAccountFromTransaction(ctx, *tx.To, tx); err != nil {
			return fmt.Errorf("failed to update recipient account: %w", err)
		}
	}

	// Se é criação de contrato, processar o contrato criado
	if tx.ContractAddress != nil && *tx.ContractAddress != "" {
		if err := s.UpdateAccountFromTransaction(ctx, *tx.ContractAddress, tx); err != nil {
			return fmt.Errorf("failed to update contract account: %w", err)
		}
	}

	return nil
}

// UpdateAccountFromTransaction atualiza uma conta baseada em uma transação
func (s *accountService) UpdateAccountFromTransaction(ctx context.Context, address string, tx *entities.Transaction) error {
	address = strings.ToLower(address)

	// Descobrir ou criar conta
	_, err := s.DiscoverAccount(ctx, address)
	if err != nil {
		return fmt.Errorf("failed to discover account: %w", err)
	}

	// Incrementar contador de transações
	if err := s.accountRepo.IncrementTransactionCount(ctx, address); err != nil {
		return fmt.Errorf("failed to increment transaction count: %w", err)
	}

	// Atualizar última atividade
	var timestamp time.Time
	if tx.MinedAt != nil {
		timestamp = *tx.MinedAt
	} else {
		timestamp = tx.CreatedAt
	}

	if err := s.accountRepo.UpdateLastActivity(ctx, address, timestamp); err != nil {
		return fmt.Errorf("failed to update last activity: %w", err)
	}

	// Se é interação com contrato, incrementar contador
	if tx.To != nil && *tx.To != "" && address == tx.From {
		// Verificar se o destinatário é um contrato
		toAccount, err := s.accountRepo.GetByAddress(ctx, *tx.To)
		if err == nil && toAccount != nil && toAccount.IsContract {
			if err := s.accountRepo.IncrementContractInteractions(ctx, address); err != nil {
				return fmt.Errorf("failed to increment contract interactions: %w", err)
			}
		}
	}

	// Se é criação de contrato, incrementar contador de deployments
	if tx.ContractAddress != nil && *tx.ContractAddress != "" && address == tx.From {
		if err := s.accountRepo.IncrementSmartContractDeployments(ctx, address); err != nil {
			return fmt.Errorf("failed to increment smart contract deployments: %w", err)
		}
	}

	return nil
}

// ProcessSmartAccount processa informações específicas de Smart Account
func (s *accountService) ProcessSmartAccount(ctx context.Context, address string, factoryAddress, implementationAddress, ownerAddress *string) error {
	address = strings.ToLower(address)

	// Criar ou atualizar conta como Smart Account
	account, err := s.CreateOrUpdateAccount(ctx, address, entities.AccountTypeSmartAccount)
	if err != nil {
		return fmt.Errorf("failed to create/update smart account: %w", err)
	}

	// Definir informações específicas de Smart Account
	if err := s.accountRepo.SetSmartAccountInfo(ctx, address, factoryAddress, implementationAddress, ownerAddress); err != nil {
		return fmt.Errorf("failed to set smart account info: %w", err)
	}

	// Marcar como contrato
	account.MarkAsContract("Smart Account")
	if err := s.accountRepo.Update(ctx, account); err != nil {
		return fmt.Errorf("failed to update account: %w", err)
	}

	return nil
}

// DetectSmartAccountType detecta se um endereço é uma Smart Account
func (s *accountService) DetectSmartAccountType(ctx context.Context, address string) (entities.AccountType, error) {
	// TODO: Implementar lógica de detecção baseada em:
	// 1. Verificar se tem código (é contrato)
	// 2. Verificar se implementa interfaces ERC-4337
	// 3. Verificar padrões conhecidos de Smart Accounts

	// Por enquanto, retorna EOA por padrão
	return entities.AccountTypeEOA, nil
}

// UpdateDailyAnalytics atualiza as métricas diárias de uma conta
func (s *accountService) UpdateDailyAnalytics(ctx context.Context, address string, date time.Time) error {
	address = strings.ToLower(address)

	// Buscar ou criar analytics do dia
	analytics, err := s.accountAnalyticsRepo.GetByAddressAndDate(ctx, address, date)
	if err != nil {
		// Criar novo registro de analytics
		analytics = entities.NewAccountAnalytics(address, date)
	}

	// TODO: Calcular métricas do dia
	// - Número de transações
	// - Endereços únicos interagidos
	// - Gas usado
	// - Valor transferido
	// - Taxa de sucesso
	// - Chamadas de contrato
	// - Transferências de token

	// Salvar ou atualizar
	if analytics.CreatedAt.IsZero() {
		return s.accountAnalyticsRepo.Create(ctx, analytics)
	}
	return s.accountAnalyticsRepo.Update(ctx, analytics)
}

// CalculateRiskScore calcula o score de risco de uma conta
func (s *accountService) CalculateRiskScore(ctx context.Context, address string) (int, error) {
	address = strings.ToLower(address)

	account, err := s.accountRepo.GetByAddress(ctx, address)
	if err != nil {
		return 0, fmt.Errorf("failed to get account: %w", err)
	}

	riskScore := 0

	// Fatores de risco:
	// 1. Conta muito nova (alta atividade em pouco tempo)
	if time.Since(account.FirstSeen).Hours() < 24 && account.TransactionCount > 100 {
		riskScore += 2
	}

	// 2. Muitas interações com contratos desconhecidos
	if account.ContractInteractions > account.TransactionCount/2 {
		riskScore += 1
	}

	// 3. Padrões suspeitos de transações
	// TODO: Implementar análise mais sofisticada

	// Garantir que o score está entre 0 e 10
	if riskScore > 10 {
		riskScore = 10
	}

	return riskScore, nil
}

// AnalyzeCompliance analisa o status de compliance de uma conta
func (s *accountService) AnalyzeCompliance(ctx context.Context, address string) (entities.ComplianceStatus, string, error) {
	address = strings.ToLower(address)

	// Calcular score de risco
	riskScore, err := s.CalculateRiskScore(ctx, address)
	if err != nil {
		return entities.ComplianceStatusUnderReview, "Failed to calculate risk score", err
	}

	// Determinar status baseado no score de risco
	var status entities.ComplianceStatus
	var notes string

	switch {
	case riskScore <= 2:
		status = entities.ComplianceStatusCompliant
		notes = "Low risk account with normal activity patterns"
	case riskScore <= 5:
		status = entities.ComplianceStatusUnderReview
		notes = "Medium risk account requiring monitoring"
	default:
		status = entities.ComplianceStatusFlagged
		notes = "High risk account with suspicious activity patterns"
	}

	return status, notes, nil
}

// FlagAccount marca uma conta como flagged
func (s *accountService) FlagAccount(ctx context.Context, address string, reason string) error {
	address = strings.ToLower(address)

	notes := fmt.Sprintf("Account flagged: %s", reason)
	return s.accountRepo.SetComplianceStatus(ctx, address, entities.ComplianceStatusFlagged, &notes)
}

// ProcessContractInteraction processa uma interação com contrato
func (s *accountService) ProcessContractInteraction(ctx context.Context, accountAddress, contractAddress string, method *string, gasUsed, valueSent string) error {
	accountAddress = strings.ToLower(accountAddress)
	contractAddress = strings.ToLower(contractAddress)

	return s.contractInteractionRepo.IncrementInteraction(ctx, accountAddress, contractAddress, method, gasUsed, valueSent)
}

// UpdateTokenHolding atualiza o holding de um token
func (s *accountService) UpdateTokenHolding(ctx context.Context, accountAddress, tokenAddress, symbol, name string, decimals uint8, balance, valueUSD string) error {
	accountAddress = strings.ToLower(accountAddress)
	tokenAddress = strings.ToLower(tokenAddress)

	// Buscar holding existente
	holding, err := s.tokenHoldingRepo.GetByAccountAndToken(ctx, accountAddress, tokenAddress)
	if err != nil {
		// Criar novo holding
		holding = entities.NewTokenHolding(accountAddress, tokenAddress, symbol, name, decimals)
		balanceBig, _ := new(big.Int).SetString(balance, 10)
		valueUSDBig, _ := new(big.Int).SetString(valueUSD, 10)
		holding.UpdateBalance(balanceBig, valueUSDBig)
		return s.tokenHoldingRepo.Create(ctx, holding)
	}

	// Atualizar holding existente
	return s.tokenHoldingRepo.UpdateBalance(ctx, accountAddress, tokenAddress, balance, valueUSD)
}

// ===== IMPLEMENTAÇÃO DOS NOVOS MÉTODOS PARA OPERAÇÕES VIA API =====

// CreateAccountFromAPI cria uma account completa a partir de uma mensagem da API
func (s *accountService) CreateAccountFromAPI(ctx context.Context, msg *entities.AccountCreationMessage) error {
	address := strings.ToLower(msg.Address)

	// Verificar se account já existe
	existingAccount, err := s.accountRepo.GetByAddress(ctx, address)
	if err == nil && existingAccount != nil {
		return fmt.Errorf("account already exists: %s", address)
	}

	// Determinar tipo de account
	var accountType entities.AccountType
	if msg.IsSmartAccount() {
		accountType = entities.AccountTypeSmartAccount
	} else {
		accountType = entities.AccountTypeEOA
	}

	// Criar nova account
	account := entities.NewAccount(address, accountType)

	// Definir campos opcionais
	if msg.Balance != nil {
		if balance, ok := new(big.Int).SetString(*msg.Balance, 10); ok {
			account.Balance = balance
		}
	}

	if msg.Nonce != nil {
		account.Nonce = *msg.Nonce
	}

	if msg.ContractCode != nil {
		account.MarkAsContract("Contract")
	}

	// Campos corporativos
	if msg.Label != nil {
		account.SetLabel(*msg.Label)
	}

	if msg.RiskScore != nil {
		account.SetRiskScore(*msg.RiskScore)
	}

	if msg.ComplianceStatus != nil {
		var status entities.ComplianceStatus
		var notes *string = msg.ComplianceNotes

		switch *msg.ComplianceStatus {
		case "compliant":
			status = entities.ComplianceStatusCompliant
		case "non_compliant":
			status = entities.ComplianceStatusFlagged
		case "pending":
			status = entities.ComplianceStatusCompliant // Default to compliant for pending
		case "under_review":
			status = entities.ComplianceStatusUnderReview
		default:
			status = entities.ComplianceStatusCompliant
		}

		account.SetComplianceStatus(status, notes)
	}

	// Salvar account
	if err := s.accountRepo.Create(ctx, account); err != nil {
		return fmt.Errorf("failed to create account: %w", err)
	}

	// Processar Smart Account se necessário
	if msg.IsSmartAccount() {
		if err := s.accountRepo.SetSmartAccountInfo(ctx, address, msg.FactoryAddress, msg.ImplementationAddress, msg.OwnerAddress); err != nil {
			return fmt.Errorf("failed to set smart account info: %w", err)
		}
	}

	// Adicionar tags se fornecidas
	if len(msg.Tags) > 0 {
		for _, tag := range msg.Tags {
			// Usar método da entidade para adicionar tag
			account.AddTag(tag)
		}
		// Atualizar account com as tags
		if err := s.accountRepo.Update(ctx, account); err != nil {
			fmt.Printf("Warning: failed to update account with tags %s: %v\n", address, err)
		}
	}

	return nil
}

// UpdateAccountFromAPI atualiza uma account a partir de uma mensagem da API
func (s *accountService) UpdateAccountFromAPI(ctx context.Context, msg *entities.AccountUpdateMessage) error {
	address := strings.ToLower(msg.Address)

	// Buscar account existente
	account, err := s.accountRepo.GetByAddress(ctx, address)
	if err != nil {
		return fmt.Errorf("account not found: %s", address)
	}

	// Atualizar campos fornecidos
	updated := false

	if msg.Balance != nil {
		if balance, ok := new(big.Int).SetString(*msg.Balance, 10); ok {
			account.UpdateBalance(balance)
			updated = true
		}
	}

	if msg.Nonce != nil {
		account.UpdateNonce(*msg.Nonce)
		updated = true
	}

	if msg.TransactionCount != nil {
		account.TransactionCount = uint64(*msg.TransactionCount)
		updated = true
	}

	if msg.Label != nil {
		account.SetLabel(*msg.Label)
		updated = true
	}

	if msg.RiskScore != nil {
		account.SetRiskScore(*msg.RiskScore)
		updated = true
	}

	if msg.ComplianceStatus != nil {
		var status entities.ComplianceStatus
		var notes *string = msg.ComplianceNotes

		switch *msg.ComplianceStatus {
		case "compliant":
			status = entities.ComplianceStatusCompliant
		case "non_compliant":
			status = entities.ComplianceStatusFlagged
		case "pending":
			status = entities.ComplianceStatusCompliant
		case "under_review":
			status = entities.ComplianceStatusUnderReview
		default:
			status = entities.ComplianceStatusCompliant
		}

		account.SetComplianceStatus(status, notes)
		updated = true
	}

	if msg.LastActivityAt != nil {
		account.LastActivity = msg.LastActivityAt
		updated = true
	}

	// Salvar se houve mudanças
	if updated {
		if err := s.accountRepo.Update(ctx, account); err != nil {
			return fmt.Errorf("failed to update account: %w", err)
		}
	}

	// Atualizar Smart Account info se fornecido
	if msg.FactoryAddress != nil || msg.ImplementationAddress != nil || msg.OwnerAddress != nil {
		if err := s.accountRepo.SetSmartAccountInfo(ctx, address, msg.FactoryAddress, msg.ImplementationAddress, msg.OwnerAddress); err != nil {
			return fmt.Errorf("failed to update smart account info: %w", err)
		}
	}

	return nil
}

// ProcessAccountTagging processa operações de tagging de account
func (s *accountService) ProcessAccountTagging(ctx context.Context, msg *entities.AccountTaggingMessage) error {
	address := strings.ToLower(msg.Address)

	// Verificar se account existe
	account, err := s.accountRepo.GetByAddress(ctx, address)
	if err != nil {
		return fmt.Errorf("account not found: %s", address)
	}

	// Processar operação de tagging
	switch msg.Operation {
	case "add":
		for _, tag := range msg.Tags {
			account.AddTag(tag)
		}
	case "remove":
		for _, tag := range msg.Tags {
			account.RemoveTag(tag)
		}
	case "replace":
		// Limpar tags existentes
		account.Tags = []string{}
		// Adicionar novas tags
		for _, tag := range msg.Tags {
			account.AddTag(tag)
		}
	default:
		return fmt.Errorf("invalid tagging operation: %s", msg.Operation)
	}

	// Salvar mudanças
	if err := s.accountRepo.Update(ctx, account); err != nil {
		return fmt.Errorf("failed to update account tags: %w", err)
	}

	return nil
}

// UpdateAccountCompliance atualiza o compliance de uma account
func (s *accountService) UpdateAccountCompliance(ctx context.Context, msg *entities.AccountComplianceUpdateMessage) error {
	address := strings.ToLower(msg.Address)

	// Buscar account existente
	account, err := s.accountRepo.GetByAddress(ctx, address)
	if err != nil {
		return fmt.Errorf("account not found: %s", address)
	}

	// Atualizar status de compliance
	var status entities.ComplianceStatus
	switch msg.ComplianceStatus {
	case "compliant":
		status = entities.ComplianceStatusCompliant
	case "non_compliant":
		status = entities.ComplianceStatusFlagged
	case "pending":
		status = entities.ComplianceStatusCompliant
	case "under_review":
		status = entities.ComplianceStatusUnderReview
	default:
		return fmt.Errorf("invalid compliance status: %s", msg.ComplianceStatus)
	}

	// Atualizar risk score se fornecido
	if msg.RiskScore != nil {
		account.SetRiskScore(*msg.RiskScore)
	}

	// Atualizar compliance
	account.SetComplianceStatus(status, msg.ComplianceNotes)

	// Salvar mudanças
	if err := s.accountRepo.Update(ctx, account); err != nil {
		return fmt.Errorf("failed to update account compliance: %w", err)
	}

	return nil
}

// ProcessBulkOperation processa operações em lote
func (s *accountService) ProcessBulkOperation(ctx context.Context, msg *entities.AccountBulkOperationMessage) (*BulkOperationResult, error) {
	result := &BulkOperationResult{
		SuccessCount: 0,
		ErrorCount:   0,
		Errors:       make([]error, 0),
	}

	switch msg.Operation {
	case "create":
		for _, accountData := range msg.Accounts {
			// Converter para AccountCreationMessage
			if creationMsg, ok := accountData.(entities.AccountCreationMessage); ok {
				if err := s.CreateAccountFromAPI(ctx, &creationMsg); err != nil {
					result.ErrorCount++
					result.Errors = append(result.Errors, fmt.Errorf("failed to create account %s: %w", creationMsg.Address, err))
				} else {
					result.SuccessCount++
				}
			} else {
				result.ErrorCount++
				result.Errors = append(result.Errors, fmt.Errorf("invalid account creation data"))
			}
		}
	case "update":
		for _, accountData := range msg.Accounts {
			if updateMsg, ok := accountData.(entities.AccountUpdateMessage); ok {
				if err := s.UpdateAccountFromAPI(ctx, &updateMsg); err != nil {
					result.ErrorCount++
					result.Errors = append(result.Errors, fmt.Errorf("failed to update account %s: %w", updateMsg.Address, err))
				} else {
					result.SuccessCount++
				}
			} else {
				result.ErrorCount++
				result.Errors = append(result.Errors, fmt.Errorf("invalid account update data"))
			}
		}
	case "tag":
		for _, accountData := range msg.Accounts {
			if taggingMsg, ok := accountData.(entities.AccountTaggingMessage); ok {
				if err := s.ProcessAccountTagging(ctx, &taggingMsg); err != nil {
					result.ErrorCount++
					result.Errors = append(result.Errors, fmt.Errorf("failed to tag account %s: %w", taggingMsg.Address, err))
				} else {
					result.SuccessCount++
				}
			} else {
				result.ErrorCount++
				result.Errors = append(result.Errors, fmt.Errorf("invalid account tagging data"))
			}
		}
	case "compliance":
		for _, accountData := range msg.Accounts {
			if complianceMsg, ok := accountData.(entities.AccountComplianceUpdateMessage); ok {
				if err := s.UpdateAccountCompliance(ctx, &complianceMsg); err != nil {
					result.ErrorCount++
					result.Errors = append(result.Errors, fmt.Errorf("failed to update compliance for account %s: %w", complianceMsg.Address, err))
				} else {
					result.SuccessCount++
				}
			} else {
				result.ErrorCount++
				result.Errors = append(result.Errors, fmt.Errorf("invalid compliance update data"))
			}
		}
	default:
		return nil, fmt.Errorf("invalid bulk operation: %s", msg.Operation)
	}

	return result, nil
}
