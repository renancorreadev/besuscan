package services

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"
	"strings"
	"time"

	"explorer-api/internal/domain/entities"
	"explorer-api/internal/domain/repositories"
)

// AccountService gerencia a lógica de negócio para accounts
type AccountService struct {
	accountRepo             repositories.AccountRepository
	accountTagRepo          repositories.AccountTagRepository
	accountAnalyticsRepo    repositories.AccountAnalyticsRepository
	contractInteractionRepo repositories.ContractInteractionRepository
	tokenHoldingRepo        repositories.TokenHoldingRepository
	db                      *sql.DB
}

// NewAccountService cria uma nova instância do service de accounts
func NewAccountService(
	accountRepo repositories.AccountRepository,
	accountTagRepo repositories.AccountTagRepository,
	accountAnalyticsRepo repositories.AccountAnalyticsRepository,
	contractInteractionRepo repositories.ContractInteractionRepository,
	tokenHoldingRepo repositories.TokenHoldingRepository,
	db *sql.DB,
) *AccountService {
	return &AccountService{
		accountRepo:             accountRepo,
		accountTagRepo:          accountTagRepo,
		accountAnalyticsRepo:    accountAnalyticsRepo,
		contractInteractionRepo: contractInteractionRepo,
		tokenHoldingRepo:        tokenHoldingRepo,
		db:                      db,
	}
}

// GetAccountByAddress retorna uma account específica por endereço
func (s *AccountService) GetAccountByAddress(ctx context.Context, address string) (*entities.Account, error) {
	// Validar e normalizar endereço
	normalizedAddress, err := s.ParseAccountIdentifier(address)
	if err != nil {
		return nil, err
	}

	account, err := s.accountRepo.GetByAddress(ctx, normalizedAddress)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar account: %w", err)
	}

	return account, nil
}

// GetAccounts retorna uma lista de accounts com filtros
func (s *AccountService) GetAccounts(ctx context.Context, filters *repositories.AccountFilters) (*PaginatedResult[*entities.AccountSummary], error) {
	// Validar e normalizar filtros
	if err := s.validateAndNormalizeFilters(filters); err != nil {
		return nil, err
	}

	// Buscar accounts
	summaries, total, err := s.accountRepo.GetSummaries(ctx, filters)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar accounts: %w", err)
	}

	// Calcular paginação
	totalPages := (total + filters.Limit - 1) / filters.Limit

	return &PaginatedResult[*entities.AccountSummary]{
		Data:       summaries,
		Page:       filters.Page,
		Limit:      filters.Limit,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

// SearchAccounts busca accounts por termo
func (s *AccountService) SearchAccounts(ctx context.Context, query string, limit int) ([]*entities.AccountSummary, error) {
	if query == "" {
		return nil, fmt.Errorf("termo de busca é obrigatório")
	}

	if limit <= 0 || limit > 100 {
		limit = 20
	}

	// Detectar tipo de busca
	searchType := s.detectSearchType(query)

	switch searchType {
	case "address":
		// Busca exata por endereço
		normalizedQuery, err := s.ParseAccountIdentifier(query)
		if err != nil {
			return []*entities.AccountSummary{}, nil
		}
		account, err := s.accountRepo.GetByAddress(ctx, normalizedQuery)
		if err != nil {
			return []*entities.AccountSummary{}, nil
		}
		return []*entities.AccountSummary{account.ToSummary()}, nil

	case "partial_address":
		// Busca parcial por endereço
		return s.accountRepo.Search(ctx, query, limit)

	default:
		// Busca geral (label, description, etc.)
		return s.accountRepo.Search(ctx, query, limit)
	}
}

// GetAccountsByType retorna accounts por tipo
func (s *AccountService) GetAccountsByType(ctx context.Context, accountType string, limit int) ([]*entities.Account, error) {
	validTypes := []string{"EOA", "Smart Account", "Contract"}
	if !contains(validTypes, accountType) {
		return nil, fmt.Errorf("tipo de account inválido: %s", accountType)
	}

	if limit <= 0 || limit > 100 {
		limit = 20
	}

	return s.accountRepo.GetByType(ctx, accountType, limit)
}

// GetTopAccountsByBalance retorna accounts com maior saldo
func (s *AccountService) GetTopAccountsByBalance(ctx context.Context, limit int) ([]*entities.Account, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	return s.accountRepo.GetTopByBalance(ctx, limit)
}

// GetTopAccountsByTransactions retorna accounts com mais transações
func (s *AccountService) GetTopAccountsByTransactions(ctx context.Context, limit int) ([]*entities.Account, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	return s.accountRepo.GetTopByTransactions(ctx, limit)
}

// GetRecentlyActiveAccounts retorna accounts com atividade recente
func (s *AccountService) GetRecentlyActiveAccounts(ctx context.Context, limit int) ([]*entities.Account, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	return s.accountRepo.GetRecentlyActive(ctx, limit)
}

// GetAccountStats retorna estatísticas gerais de accounts
func (s *AccountService) GetAccountStats(ctx context.Context) (*repositories.AccountStats, error) {
	return s.accountRepo.GetStats(ctx)
}

// GetAccountStatsByType retorna estatísticas por tipo de account
func (s *AccountService) GetAccountStatsByType(ctx context.Context) (map[string]*repositories.AccountTypeStats, error) {
	return s.accountRepo.GetStatsByType(ctx)
}

// GetComplianceStats retorna estatísticas de compliance
func (s *AccountService) GetComplianceStats(ctx context.Context) (*repositories.ComplianceStats, error) {
	return s.accountRepo.GetComplianceStats(ctx)
}

// GetAccountTags retorna tags de uma account
func (s *AccountService) GetAccountTags(ctx context.Context, address string) ([]*entities.AccountTag, error) {
	normalizedAddress, err := s.ParseAccountIdentifier(address)
	if err != nil {
		return nil, err
	}

	return s.accountTagRepo.GetByAddress(ctx, normalizedAddress)
}

// NOTA: Métodos de escrita foram removidos
// A API apenas consulta dados - todas as operações de escrita são feitas pelo worker

// GetAccountAnalytics retorna analytics de uma account
func (s *AccountService) GetAccountAnalytics(ctx context.Context, address string, days int) ([]*entities.AccountAnalytics, error) {
	normalizedAddress, err := s.ParseAccountIdentifier(address)
	if err != nil {
		return nil, err
	}

	if days <= 0 || days > 365 {
		days = 30
	}

	return s.accountAnalyticsRepo.GetByAddress(ctx, normalizedAddress, days)
}

// GetContractInteractions retorna interações com contratos de uma account
func (s *AccountService) GetContractInteractions(ctx context.Context, address string, limit int) ([]*entities.ContractInteraction, error) {
	normalizedAddress, err := s.ParseAccountIdentifier(address)
	if err != nil {
		return nil, err
	}

	if limit <= 0 || limit > 100 {
		limit = 20
	}

	return s.contractInteractionRepo.GetByAccount(ctx, normalizedAddress, limit)
}

// GetTokenHoldings retorna holdings de tokens de uma account
func (s *AccountService) GetTokenHoldings(ctx context.Context, address string) ([]*entities.TokenHolding, error) {
	normalizedAddress, err := s.ParseAccountIdentifier(address)
	if err != nil {
		return nil, err
	}

	return s.tokenHoldingRepo.GetByAccount(ctx, normalizedAddress)
}

// GetSmartAccounts retorna Smart Accounts
func (s *AccountService) GetSmartAccounts(ctx context.Context, limit int) ([]*entities.Account, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	return s.accountRepo.GetSmartAccounts(ctx, limit)
}

// GetAccountsByFactory retorna accounts criadas por uma factory
func (s *AccountService) GetAccountsByFactory(ctx context.Context, factoryAddress string, limit int) ([]*entities.Account, error) {
	normalizedAddress, err := s.ParseAccountIdentifier(factoryAddress)
	if err != nil {
		return nil, err
	}

	if limit <= 0 || limit > 100 {
		limit = 20
	}

	return s.accountRepo.GetByFactory(ctx, normalizedAddress, limit)
}

// GetAccountsByOwner retorna Smart Accounts de um owner
func (s *AccountService) GetAccountsByOwner(ctx context.Context, ownerAddress string, limit int) ([]*entities.Account, error) {
	normalizedAddress, err := s.ParseAccountIdentifier(ownerAddress)
	if err != nil {
		return nil, err
	}

	if limit <= 0 || limit > 100 {
		limit = 20
	}

	return s.accountRepo.GetByOwner(ctx, normalizedAddress, limit)
}

// Funções auxiliares

func (s *AccountService) validateAndNormalizeFilters(filters *repositories.AccountFilters) error {
	// Definir valores padrão
	if filters.Page <= 0 {
		filters.Page = 1
	}
	if filters.Limit <= 0 {
		filters.Limit = 20
	}
	if filters.Limit > 100 {
		filters.Limit = 100
	}

	// Validar ordenação
	validOrderBy := []string{"address", "balance", "transaction_count", "created_at", "last_activity", "risk_score"}
	if filters.OrderBy != "" && !contains(validOrderBy, filters.OrderBy) {
		return fmt.Errorf("campo de ordenação inválido: %s", filters.OrderBy)
	}
	if filters.OrderBy == "" {
		filters.OrderBy = "created_at"
	}

	validOrderDir := []string{"asc", "desc", "ASC", "DESC"}
	if filters.OrderDir != "" && !contains(validOrderDir, filters.OrderDir) {
		return fmt.Errorf("direção de ordenação inválida: %s", filters.OrderDir)
	}
	if filters.OrderDir == "" {
		filters.OrderDir = "desc"
	}
	// Normalizar para minúsculo
	filters.OrderDir = strings.ToLower(filters.OrderDir)

	// Validar tipo de account
	if filters.AccountType != "" {
		validTypes := []string{"EOA", "Smart Account", "Contract"}
		if !contains(validTypes, filters.AccountType) {
			return fmt.Errorf("tipo de account inválido: %s", filters.AccountType)
		}
	}

	// Validar status de compliance
	if filters.ComplianceStatus != "" {
		validStatuses := []string{"compliant", "non_compliant", "pending", "under_review"}
		if !contains(validStatuses, filters.ComplianceStatus) {
			return fmt.Errorf("status de compliance inválido: %s", filters.ComplianceStatus)
		}
	}

	// Validar risk scores
	if filters.MinRiskScore < 0 || filters.MinRiskScore > 10 {
		filters.MinRiskScore = 0
	}
	if filters.MaxRiskScore < 0 || filters.MaxRiskScore > 10 {
		filters.MaxRiskScore = 10
	}
	if filters.MinRiskScore > filters.MaxRiskScore {
		filters.MinRiskScore, filters.MaxRiskScore = filters.MaxRiskScore, filters.MinRiskScore
	}

	return nil
}

func (s *AccountService) detectSearchType(query string) string {
	// Endereço completo
	if regexp.MustCompile(`^0x[a-fA-F0-9]{40}$`).MatchString(query) {
		return "address"
	}

	// Endereço parcial
	if regexp.MustCompile(`^0x[a-fA-F0-9]+$`).MatchString(query) && len(query) >= 6 {
		return "partial_address"
	}

	// Busca geral
	return "general"
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// ParseAccountIdentifier analisa um identificador de account (endereço)
func (s *AccountService) ParseAccountIdentifier(identifier string) (string, error) {
	identifier = strings.TrimSpace(identifier)

	// Verificar se é um endereço válido
	if regexp.MustCompile(`^0x[a-fA-F0-9]{40}$`).MatchString(identifier) {
		return strings.ToLower(identifier), nil
	}

	return "", fmt.Errorf("identificador de account inválido: %s", identifier)
}

// GetAccountTransactions retorna todas as transações detalhadas de uma conta
func (s *AccountService) GetAccountTransactions(ctx context.Context, address string) ([]map[string]interface{}, error) {
	_, err := s.ParseAccountIdentifier(address)
	if err != nil {
		return nil, err
	}

	address = strings.ToLower(address)

	query := `
		SELECT 
			at.id, at.transaction_hash, at.block_number, at.transaction_index, at.transaction_type,
			at.from_address, at.to_address, at.value, at.gas_limit, at.gas_used, at.gas_price,
			at.status, at.method_name, at.method_signature, at.contract_address, at.contract_name,
			at.decoded_input, at.error_message, at.timestamp, at.created_at, at.updated_at,
			sc.contract_type
		FROM account_transactions at
		LEFT JOIN smart_contracts sc ON LOWER(at.contract_address) = LOWER(sc.address)
		WHERE at.account_address = $1 
		ORDER BY at.timestamp DESC 
		LIMIT 100
	`

	rows, err := s.db.QueryContext(ctx, query, address)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar transações da conta: %w", err)
	}
	defer rows.Close()

	var transactions []map[string]interface{}
	for rows.Next() {
		var (
			id               int64
			transactionHash  string
			blockNumber      int64
			transactionIndex int
			transactionType  string
			fromAddress      string
			toAddress        sql.NullString
			value            string
			gasLimit         int64
			gasUsed          sql.NullInt64
			gasPrice         sql.NullString
			status           string
			methodName       sql.NullString
			methodSignature  sql.NullString
			contractAddress  sql.NullString
			contractName     sql.NullString
			decodedInput     sql.NullString
			errorMessage     sql.NullString
			timestamp        time.Time
			createdAt        time.Time
			updatedAt        time.Time
			contractType     sql.NullString
		)

		err := rows.Scan(
			&id, &transactionHash, &blockNumber, &transactionIndex, &transactionType,
			&fromAddress, &toAddress, &value, &gasLimit, &gasUsed, &gasPrice,
			&status, &methodName, &methodSignature, &contractAddress, &contractName,
			&decodedInput, &errorMessage, &timestamp, &createdAt, &updatedAt,
			&contractType,
		)
		if err != nil {
			continue
		}

		transaction := map[string]interface{}{
			"id":                id,
			"transaction_hash":  transactionHash,
			"block_number":      blockNumber,
			"transaction_index": transactionIndex,
			"transaction_type":  transactionType,
			"from_address":      fromAddress,
			"value":             value,
			"gas_limit":         gasLimit,
			"status":            status,
			"timestamp":         timestamp,
			"created_at":        createdAt,
			"updated_at":        updatedAt,
		}

		if toAddress.Valid {
			transaction["to_address"] = toAddress.String
		}
		if gasUsed.Valid {
			transaction["gas_used"] = gasUsed.Int64
		}
		if gasPrice.Valid {
			transaction["gas_price"] = gasPrice.String
		}
		if methodName.Valid {
			transaction["method_name"] = methodName.String
		}
		if methodSignature.Valid {
			transaction["method_signature"] = methodSignature.String
		}
		if contractAddress.Valid {
			transaction["contract_address"] = contractAddress.String
		}
		if contractName.Valid {
			transaction["contract_name"] = contractName.String
		}
		if decodedInput.Valid {
			transaction["decoded_input"] = decodedInput.String
		}
		if errorMessage.Valid {
			transaction["error_message"] = errorMessage.String
		}
		if contractType.Valid {
			transaction["contract_type"] = contractType.String
		}

		transactions = append(transactions, transaction)
	}

	return transactions, nil
}

// AccountTransactionFilters estende TransactionFilters com campos específicos para account transactions
type AccountTransactionFilters struct {
	TransactionFilters
	Method       string `json:"method,omitempty"`        // Nome do método
	ContractType string `json:"contract_type,omitempty"` // Tipo do contrato (erc20, erc721, etc.)
}

// AccountMethodStatsFilters representa os filtros para estatísticas de métodos
type AccountMethodStatsFilters struct {
	MethodName      string `json:"method_name,omitempty"`      // Nome do método para filtrar
	ContractAddress string `json:"contract_address,omitempty"` // Endereço do contrato
	SortBy          string `json:"sort_by,omitempty"`          // Campo para ordenação (executions, gas, value, etc.)
	SortDir         string `json:"sort_dir,omitempty"`         // Direção da ordenação (asc, desc)
	Page            int    `json:"page,omitempty"`             // Página atual
	Limit           int    `json:"limit,omitempty"`            // Limite de resultados por página
}

// AccountEventsFilters representa os filtros para eventos de uma conta
type AccountEventsFilters struct {
	EventName       string `json:"event_name,omitempty"`       // Nome do evento para filtrar
	ContractAddress string `json:"contract_address,omitempty"` // Endereço do contrato
	InvolvementType string `json:"involvement_type,omitempty"` // Tipo de envolvimento (emitter, participant, recipient)
	FromDate        string `json:"from_date,omitempty"`        // Data inicial (YYYY-MM-DD)
	ToDate          string `json:"to_date,omitempty"`          // Data final (YYYY-MM-DD)
	SortBy          string `json:"sort_by,omitempty"`          // Campo para ordenação (timestamp, block_number, event_name)
	SortDir         string `json:"sort_dir,omitempty"`         // Direção da ordenação (asc, desc)
	Page            int    `json:"page,omitempty"`             // Página atual
	Limit           int    `json:"limit,omitempty"`            // Limite de resultados por página
}

// GetAccountTransactionsWithFilters retorna transações de uma conta com filtros e paginação
func (s *AccountService) GetAccountTransactionsWithFilters(ctx context.Context, address string, filters *AccountTransactionFilters) (*PaginatedResult[map[string]interface{}], error) {
	_, err := s.ParseAccountIdentifier(address)
	if err != nil {
		return nil, err
	}

	address = strings.ToLower(address)

	// Validar filtros
	if err := filters.Validate(); err != nil {
		return nil, fmt.Errorf("filtros inválidos: %w", err)
	}

	// Construir query base
	baseQuery := `
		SELECT 
			at.id, at.transaction_hash, at.block_number, at.transaction_index, at.transaction_type,
			at.from_address, at.to_address, at.value, at.gas_limit, at.gas_used, at.gas_price,
			at.status, at.method_name, at.method_signature, at.contract_address, at.contract_name,
			at.decoded_input, at.error_message, at.timestamp, at.created_at, at.updated_at,
			sc.contract_type
		FROM account_transactions at
		LEFT JOIN smart_contracts sc ON LOWER(at.contract_address) = LOWER(sc.address)
		WHERE at.account_address = $1
	`

	countQuery := `
		SELECT COUNT(*)
		FROM account_transactions at
		LEFT JOIN smart_contracts sc ON LOWER(at.contract_address) = LOWER(sc.address)
		WHERE at.account_address = $1
	`

	// Inicializar argumentos com o address
	args := []interface{}{address}
	var conditions []string

	// Aplicar filtros da estrutura base - ajustar indices para começar após o address
	baseWhereClause, baseArgs, orderClause := filters.TransactionFilters.ToSQL()

	// Ajustar os índices dos parâmetros base para começar do $2
	if baseWhereClause != "" {
		// Substituir $1, $2, $3... por $2, $3, $4... (já que $1 é o address)
		adjustedWhereClause := baseWhereClause
		for i := len(baseArgs); i >= 1; i-- {
			oldParam := fmt.Sprintf("$%d", i)
			newParam := fmt.Sprintf("$%d", i+1)
			adjustedWhereClause = strings.ReplaceAll(adjustedWhereClause, oldParam, newParam)
		}
		conditions = append(conditions, adjustedWhereClause)
		args = append(args, baseArgs...)
	}

	// Aplicar filtros específicos de account transactions
	if filters.Method != "" {
		args = append(args, "%"+filters.Method+"%")
		conditions = append(conditions, fmt.Sprintf("at.method_name ILIKE $%d", len(args)))
	}

	if filters.ContractType != "" {
		args = append(args, strings.ToLower(filters.ContractType))
		conditions = append(conditions, fmt.Sprintf("LOWER(sc.contract_type) = $%d", len(args)))
	}

	// Combinar todas as condições
	if len(conditions) > 0 {
		finalWhereClause := strings.Join(conditions, " AND ")
		baseQuery += " AND " + finalWhereClause
		countQuery += " AND " + finalWhereClause
	}

	// Adicionar ordenação
	if orderClause == "" {
		orderClause = "ORDER BY at.timestamp DESC"
	}
	baseQuery += " " + orderClause

	// Adicionar paginação
	offset := (filters.Page - 1) * filters.Limit
	baseQuery += fmt.Sprintf(" LIMIT %d OFFSET %d", filters.Limit, offset)

	// Log da query para debug
	fmt.Printf("DEBUG - Query: %s\n", baseQuery)
	fmt.Printf("DEBUG - Args: %+v\n", args)

	// Executar query de contagem
	var total int64
	err = s.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("erro ao contar transações: %w", err)
	}

	// Executar query principal
	rows, err := s.db.QueryContext(ctx, baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar transações: %w", err)
	}
	defer rows.Close()

	var transactions []map[string]interface{}
	for rows.Next() {
		var (
			id               int64
			transactionHash  string
			blockNumber      int64
			transactionIndex int
			transactionType  string
			fromAddress      string
			toAddress        sql.NullString
			value            string
			gasLimit         int64
			gasUsed          sql.NullInt64
			gasPrice         sql.NullString
			status           string
			methodName       sql.NullString
			methodSignature  sql.NullString
			contractAddress  sql.NullString
			contractName     sql.NullString
			decodedInput     sql.NullString
			errorMessage     sql.NullString
			timestamp        time.Time
			createdAt        time.Time
			updatedAt        time.Time
			contractType     sql.NullString
		)

		err := rows.Scan(
			&id, &transactionHash, &blockNumber, &transactionIndex, &transactionType,
			&fromAddress, &toAddress, &value, &gasLimit, &gasUsed, &gasPrice,
			&status, &methodName, &methodSignature, &contractAddress, &contractName,
			&decodedInput, &errorMessage, &timestamp, &createdAt, &updatedAt,
			&contractType,
		)
		if err != nil {
			continue
		}

		transaction := map[string]interface{}{
			"id":                id,
			"transaction_hash":  transactionHash,
			"block_number":      blockNumber,
			"transaction_index": transactionIndex,
			"transaction_type":  transactionType,
			"from_address":      fromAddress,
			"value":             value,
			"gas_limit":         gasLimit,
			"status":            status,
			"timestamp":         timestamp,
			"created_at":        createdAt,
			"updated_at":        updatedAt,
		}

		if toAddress.Valid {
			transaction["to_address"] = toAddress.String
		}
		if gasUsed.Valid {
			transaction["gas_used"] = gasUsed.Int64
		}
		if gasPrice.Valid {
			transaction["gas_price"] = gasPrice.String
		}
		if methodName.Valid {
			transaction["method_name"] = methodName.String
		}
		if methodSignature.Valid {
			transaction["method_signature"] = methodSignature.String
		}
		if contractAddress.Valid {
			transaction["contract_address"] = contractAddress.String
		}
		if contractName.Valid {
			transaction["contract_name"] = contractName.String
		}
		if decodedInput.Valid {
			transaction["decoded_input"] = decodedInput.String
		}
		if errorMessage.Valid {
			transaction["error_message"] = errorMessage.String
		}
		if contractType.Valid {
			transaction["contract_type"] = contractType.String
		}

		transactions = append(transactions, transaction)
	}

	// Calcular total de páginas
	totalPages := int((total + int64(filters.Limit) - 1) / int64(filters.Limit))

	return &PaginatedResult[map[string]interface{}]{
		Data:       transactions,
		Page:       filters.Page,
		Limit:      filters.Limit,
		Total:      int(total),
		TotalPages: totalPages,
	}, nil
}

// GetAccountEvents retorna todos os eventos relacionados a uma conta (sem filtros - para compatibilidade)
func (s *AccountService) GetAccountEvents(ctx context.Context, address string) ([]map[string]interface{}, error) {
	// Usar a versão com filtros com valores padrão
	filters := &AccountEventsFilters{
		SortBy:  "timestamp",
		SortDir: "desc",
		Page:    1,
		Limit:   100,
	}

	result, err := s.GetAccountEventsWithFilters(ctx, address, filters)
	if err != nil {
		return nil, err
	}

	return result.Data, nil
}

// GetAccountEventsWithFilters retorna eventos de uma conta com filtros e paginação
func (s *AccountService) GetAccountEventsWithFilters(ctx context.Context, address string, filters *AccountEventsFilters) (*PaginatedResult[map[string]interface{}], error) {
	_, err := s.ParseAccountIdentifier(address)
	if err != nil {
		return nil, err
	}

	address = strings.ToLower(address)

	// Validar e definir valores padrão para os filtros
	if filters.Page <= 0 {
		filters.Page = 1
	}
	if filters.Limit <= 0 || filters.Limit > 100 {
		filters.Limit = 20
	}
	if filters.SortBy == "" {
		filters.SortBy = "timestamp"
	}
	if filters.SortDir == "" {
		filters.SortDir = "desc"
	}

	// Construir a query base
	baseQuery := `
		SELECT 
			id, event_id, transaction_hash, block_number, log_index,
			contract_address, contract_name, event_name, event_signature,
			involvement_type, topics, decoded_data, timestamp, created_at, updated_at
		FROM account_events 
		WHERE account_address = $1
	`

	countQuery := `
		SELECT COUNT(*) 
		FROM account_events 
		WHERE account_address = $1
	`

	// Adicionar filtros WHERE
	var whereConditions []string
	var args []interface{}
	args = append(args, address) // $1

	argIndex := 2

	// Filtro por nome do evento
	if filters.EventName != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("event_name ILIKE $%d", argIndex))
		args = append(args, "%"+filters.EventName+"%")
		argIndex++
	}

	// Filtro por endereço do contrato
	if filters.ContractAddress != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("contract_address = $%d", argIndex))
		args = append(args, strings.ToLower(filters.ContractAddress))
		argIndex++
	}

	// Filtro por tipo de envolvimento
	if filters.InvolvementType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("involvement_type = $%d", argIndex))
		args = append(args, filters.InvolvementType)
		argIndex++
	}

	// Filtro por data inicial
	if filters.FromDate != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("timestamp >= $%d", argIndex))
		args = append(args, filters.FromDate)
		argIndex++
	}

	// Filtro por data final
	if filters.ToDate != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("timestamp <= $%d", argIndex))
		args = append(args, filters.ToDate+" 23:59:59") // Incluir o dia inteiro
		argIndex++
	}

	// Adicionar condições WHERE se existirem
	if len(whereConditions) > 0 {
		whereClause := " AND " + strings.Join(whereConditions, " AND ")
		baseQuery += whereClause
		countQuery += whereClause
	}

	// Adicionar ordenação
	var orderBy string
	switch filters.SortBy {
	case "timestamp":
		orderBy = "timestamp"
	case "block_number":
		orderBy = "block_number"
	case "event_name":
		orderBy = "event_name"
	case "contract":
		orderBy = "contract_name"
	case "involvement":
		orderBy = "involvement_type"
	default:
		orderBy = "timestamp"
	}

	if filters.SortDir == "asc" {
		orderBy += " ASC"
	} else {
		orderBy += " DESC"
	}

	baseQuery += " ORDER BY " + orderBy

	// Adicionar paginação
	offset := (filters.Page - 1) * filters.Limit
	baseQuery += fmt.Sprintf(" LIMIT %d OFFSET %d", filters.Limit, offset)

	// Executar query de contagem
	var total int64
	countArgs := args // Os argumentos são os mesmos para ambas as queries
	err = s.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("erro ao contar eventos: %w", err)
	}

	// Executar query principal
	rows, err := s.db.QueryContext(ctx, baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar eventos da conta: %w", err)
	}
	defer rows.Close()

	var events []map[string]interface{}
	for rows.Next() {
		var (
			id              int64
			eventID         string
			transactionHash string
			blockNumber     int64
			logIndex        int64
			contractAddress string
			contractName    sql.NullString
			eventName       string
			eventSignature  string
			involvementType string
			topics          sql.NullString
			decodedData     sql.NullString
			timestamp       time.Time
			createdAt       time.Time
			updatedAt       time.Time
		)

		err := rows.Scan(
			&id, &eventID, &transactionHash, &blockNumber, &logIndex,
			&contractAddress, &contractName, &eventName, &eventSignature,
			&involvementType, &topics, &decodedData, &timestamp, &createdAt, &updatedAt,
		)
		if err != nil {
			continue
		}

		event := map[string]interface{}{
			"id":               id,
			"event_id":         eventID,
			"transaction_hash": transactionHash,
			"block_number":     blockNumber,
			"log_index":        logIndex,
			"contract_address": contractAddress,
			"event_name":       eventName,
			"event_signature":  eventSignature,
			"involvement_type": involvementType,
			"timestamp":        timestamp,
			"created_at":       createdAt,
			"updated_at":       updatedAt,
		}

		if contractName.Valid {
			event["contract_name"] = contractName.String
		}
		if topics.Valid {
			event["topics"] = topics.String
		}
		if decodedData.Valid {
			event["decoded_data"] = decodedData.String
		}

		events = append(events, event)
	}

	// Calcular total de páginas
	totalPages := int((total + int64(filters.Limit) - 1) / int64(filters.Limit))

	return &PaginatedResult[map[string]interface{}]{
		Data:       events,
		Page:       filters.Page,
		Limit:      filters.Limit,
		Total:      int(total),
		TotalPages: totalPages,
	}, nil
}

// GetAccountMethodStats retorna estatísticas de métodos executados por uma conta (sem filtros - para compatibilidade)
func (s *AccountService) GetAccountMethodStats(ctx context.Context, address string) ([]map[string]interface{}, error) {
	// Usar a versão com filtros com valores padrão
	filters := &AccountMethodStatsFilters{
		SortBy:  "executions",
		SortDir: "desc",
		Page:    1,
		Limit:   50,
	}

	result, err := s.GetAccountMethodStatsWithFilters(ctx, address, filters)
	if err != nil {
		return nil, err
	}

	return result.Data, nil
}

// GetAccountMethodStatsWithFilters retorna estatísticas de métodos executados por uma conta com filtros e paginação
// GetTopMethodStats retorna os métodos mais utilizados globalmente
func (s *AccountService) GetTopMethodStats(ctx context.Context, limit int) ([]MethodStats, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	query := `
		SELECT 
			ams.method_name,
			COUNT(*) as call_count,
			SUM(ams.total_gas_used) as total_gas_used,
			COALESCE(ams.contract_display_name, 'Unknown Contract') as contract_name
		FROM account_method_stats ams
		WHERE ams.method_name IS NOT NULL 
		  AND ams.method_name != ''
		GROUP BY ams.method_name, ams.contract_display_name
		ORDER BY call_count DESC, total_gas_used DESC
		LIMIT $1
	`

	rows, err := s.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar top method stats: %w", err)
	}
	defer rows.Close()

	var methodStats []MethodStats
	for rows.Next() {
		var stat MethodStats
		if err := rows.Scan(
			&stat.MethodName,
			&stat.CallCount,
			&stat.TotalGasUsed,
			&stat.ContractName,
		); err != nil {
			return nil, fmt.Errorf("erro ao escanear method stats: %w", err)
		}
		methodStats = append(methodStats, stat)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("erro ao iterar method stats: %w", err)
	}

	return methodStats, nil
}

func (s *AccountService) GetAccountMethodStatsWithFilters(ctx context.Context, address string, filters *AccountMethodStatsFilters) (*PaginatedResult[map[string]interface{}], error) {
	_, err := s.ParseAccountIdentifier(address)
	if err != nil {
		return nil, err
	}

	address = strings.ToLower(address)

	// Validar e definir valores padrão para os filtros
	if filters.Page <= 0 {
		filters.Page = 1
	}
	if filters.Limit <= 0 || filters.Limit > 100 {
		filters.Limit = 20
	}
	if filters.SortBy == "" {
		filters.SortBy = "executions"
	}
	if filters.SortDir == "" {
		filters.SortDir = "desc"
	}

	// Construir a query base
	baseQuery := `
		SELECT 
			id, method_name, method_signature, contract_address, contract_name,
			execution_count, success_count, failed_count, total_gas_used,
			total_value_sent, avg_gas_used, first_executed_at, last_executed_at,
			created_at, updated_at
		FROM account_method_stats 
		WHERE account_address = $1
	`

	countQuery := `
		SELECT COUNT(*) 
		FROM account_method_stats 
		WHERE account_address = $1
	`

	// Adicionar filtros WHERE
	var whereConditions []string
	var args []interface{}
	args = append(args, address) // $1

	argIndex := 2

	// Filtro por nome do método
	if filters.MethodName != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("method_name ILIKE $%d", argIndex))
		args = append(args, "%"+filters.MethodName+"%")
		argIndex++
	}

	// Filtro por endereço do contrato
	if filters.ContractAddress != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("contract_address = $%d", argIndex))
		args = append(args, strings.ToLower(filters.ContractAddress))
		argIndex++
	}

	// Adicionar condições WHERE se existirem
	if len(whereConditions) > 0 {
		whereClause := " AND " + strings.Join(whereConditions, " AND ")
		baseQuery += whereClause
		countQuery += whereClause
	}

	// Adicionar ordenação
	var orderBy string
	switch filters.SortBy {
	case "executions":
		orderBy = "execution_count"
	case "gas":
		orderBy = "avg_gas_used"
	case "value":
		orderBy = "total_value_sent"
	case "success_rate":
		orderBy = "(CASE WHEN execution_count > 0 THEN (success_count::float / execution_count::float) ELSE 0 END)"
	case "recent":
		orderBy = "last_executed_at"
	case "method":
		orderBy = "method_name"
	case "contract":
		orderBy = "contract_name"
	default:
		orderBy = "execution_count"
	}

	if filters.SortDir == "asc" {
		orderBy += " ASC"
	} else {
		orderBy += " DESC"
	}

	baseQuery += " ORDER BY " + orderBy

	// Adicionar paginação
	offset := (filters.Page - 1) * filters.Limit
	baseQuery += fmt.Sprintf(" LIMIT %d OFFSET %d", filters.Limit, offset)

	// Executar query de contagem (usar os mesmos argumentos da query principal, exceto paginação)
	var total int64
	countArgs := args // Os argumentos são os mesmos para ambas as queries
	err = s.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("erro ao contar estatísticas de métodos: %w", err)
	}

	// Executar query principal
	rows, err := s.db.QueryContext(ctx, baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar estatísticas de métodos da conta: %w", err)
	}
	defer rows.Close()

	var stats []map[string]interface{}
	for rows.Next() {
		var (
			id              int64
			methodName      string
			methodSignature sql.NullString
			contractAddress sql.NullString
			contractName    sql.NullString
			executionCount  int
			successCount    int
			failedCount     int
			totalGasUsed    string
			totalValueSent  string
			avgGasUsed      int64
			firstExecutedAt time.Time
			lastExecutedAt  time.Time
			createdAt       time.Time
			updatedAt       time.Time
		)

		err := rows.Scan(
			&id, &methodName, &methodSignature, &contractAddress, &contractName,
			&executionCount, &successCount, &failedCount, &totalGasUsed,
			&totalValueSent, &avgGasUsed, &firstExecutedAt, &lastExecutedAt,
			&createdAt, &updatedAt,
		)
		if err != nil {
			continue
		}

		stat := map[string]interface{}{
			"id":                id,
			"method_name":       methodName,
			"execution_count":   executionCount,
			"success_count":     successCount,
			"failed_count":      failedCount,
			"total_gas_used":    totalGasUsed,
			"total_value_sent":  totalValueSent,
			"avg_gas_used":      avgGasUsed,
			"first_executed_at": firstExecutedAt,
			"last_executed_at":  lastExecutedAt,
			"created_at":        createdAt,
			"updated_at":        updatedAt,
		}

		if methodSignature.Valid {
			stat["method_signature"] = methodSignature.String
		}
		if contractAddress.Valid {
			stat["contract_address"] = contractAddress.String
		}
		if contractName.Valid {
			stat["contract_name"] = contractName.String
		}

		stats = append(stats, stat)
	}

	// Calcular total de páginas
	totalPages := int((total + int64(filters.Limit) - 1) / int64(filters.Limit))

	return &PaginatedResult[map[string]interface{}]{
		Data:       stats,
		Page:       filters.Page,
		Limit:      filters.Limit,
		Total:      int(total),
		TotalPages: totalPages,
	}, nil
}
