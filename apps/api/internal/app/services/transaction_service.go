package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"explorer-api/internal/domain/entities"
	"explorer-api/internal/domain/repositories"
)

// TransactionService gerencia a lógica de negócio relacionada a transações
type TransactionService struct {
	transactionRepo repositories.TransactionRepository
}

// NewTransactionService cria uma nova instância do serviço de transações
func NewTransactionService(transactionRepo repositories.TransactionRepository) *TransactionService {
	return &TransactionService{
		transactionRepo: transactionRepo,
	}
}

// GetTransactionByHash busca uma transação pelo hash
func (s *TransactionService) GetTransactionByHash(ctx context.Context, hash string) (*entities.Transaction, error) {
	// Validar formato do hash
	if len(hash) != 66 || hash[:2] != "0x" {
		return nil, fmt.Errorf("formato de hash inválido: %s", hash)
	}

	transaction, err := s.transactionRepo.FindByHash(ctx, hash)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar transação %s: %w", hash, err)
	}

	if transaction == nil {
		return nil, fmt.Errorf("transação %s não encontrada", hash)
	}

	return transaction, nil
}

// GetRecentTransactions busca as transações mais recentes
func (s *TransactionService) GetRecentTransactions(ctx context.Context, limit int) ([]*entities.Transaction, error) {
	// Validar limite
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	transactions, err := s.transactionRepo.FindRecent(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar transações recentes: %w", err)
	}

	return transactions, nil
}

// GetTransactionsByBlock busca transações de um bloco específico
func (s *TransactionService) GetTransactionsByBlock(ctx context.Context, blockNumber uint64) ([]*entities.Transaction, error) {
	transactions, err := s.transactionRepo.FindByBlock(ctx, blockNumber)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar transações do bloco %d: %w", blockNumber, err)
	}

	return transactions, nil
}

// GetTransactionsByAddress busca transações de um endereço
func (s *TransactionService) GetTransactionsByAddress(ctx context.Context, address string, limit, offset int) ([]*entities.Transaction, error) {
	// Validar formato do endereço
	if len(address) != 42 || address[:2] != "0x" {
		return nil, fmt.Errorf("formato de endereço inválido: %s", address)
	}

	// Validar paginação
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	transactions, err := s.transactionRepo.FindByAddress(ctx, address, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar transações do endereço %s: %w", address, err)
	}

	return transactions, nil
}

// GetTransactionsByStatus busca transações por status
func (s *TransactionService) GetTransactionsByStatus(ctx context.Context, status string, limit, offset int) ([]*entities.Transaction, error) {
	// Validar status
	validStatuses := map[string]bool{
		"pending": true, "success": true, "failed": true,
	}
	if !validStatuses[status] {
		return nil, fmt.Errorf("status inválido: %s (deve ser: pending, success, failed)", status)
	}

	// Validar paginação
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	transactions, err := s.transactionRepo.FindByStatus(ctx, status, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar transações com status %s: %w", status, err)
	}

	return transactions, nil
}

// GetTransactionsWithFilters busca transações com filtros avançados
func (s *TransactionService) GetTransactionsWithFilters(ctx context.Context, filters *TransactionFilters) (*PaginatedResponse, error) {
	// Validar e normalizar filtros
	if err := filters.Validate(); err != nil {
		return nil, err
	}

	// Converter filtros para SQL
	whereClause, args, orderClause := filters.ToSQL()

	// Calcular offset
	offset := (filters.Page - 1) * filters.Limit

	// Buscar transações
	transactions, err := s.transactionRepo.FindWithFilters(ctx, whereClause, args, orderClause, filters.Limit, offset)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar transações com filtros: %w", err)
	}

	// Contar total
	total, err := s.transactionRepo.CountWithFilters(ctx, whereClause, args)
	if err != nil {
		return nil, fmt.Errorf("erro ao contar transações com filtros: %w", err)
	}

	// Converter para resumos
	summaries := make([]interface{}, len(transactions))
	for i, transaction := range transactions {
		summaries[i] = transaction.ToSummary()
	}

	// Calcular total de páginas
	totalPages := int(total) / filters.Limit
	if int(total)%filters.Limit > 0 {
		totalPages++
	}

	return &PaginatedResponse{
		Data:       summaries,
		Page:       filters.Page,
		Limit:      filters.Limit,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

// GetTransactionStats retorna estatísticas das transações
func (s *TransactionService) GetTransactionStats(ctx context.Context) (*repositories.TransactionStats, error) {
	stats, err := s.transactionRepo.GetTransactionStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar estatísticas das transações: %w", err)
	}

	return stats, nil
}

// ParseTransactionIdentifier converte string para hash de transação
func (s *TransactionService) ParseTransactionIdentifier(identifier string) (string, error) {
	// Verificar se é um hash válido
	if len(identifier) == 66 && identifier[:2] == "0x" {
		return identifier, nil
	}

	return "", fmt.Errorf("identificador inválido: deve ser um hash de transação (0x...)")
}

// TransactionFilters representa filtros para busca de transações
type TransactionFilters struct {
	// Filtros básicos
	From   string `json:"from,omitempty"`   // Endereço remetente
	To     string `json:"to,omitempty"`     // Endereço destinatário
	Status string `json:"status,omitempty"` // Status da transação

	// Filtros de valor
	MinValue string `json:"min_value,omitempty"` // Valor mínimo em Wei
	MaxValue string `json:"max_value,omitempty"` // Valor máximo em Wei

	// Filtros de gas
	MinGas     uint64 `json:"min_gas,omitempty"`      // Gas mínimo
	MaxGas     uint64 `json:"max_gas,omitempty"`      // Gas máximo
	MinGasUsed uint64 `json:"min_gas_used,omitempty"` // Gas usado mínimo
	MaxGasUsed uint64 `json:"max_gas_used,omitempty"` // Gas usado máximo

	// Filtros de tipo
	TxType *uint8 `json:"tx_type,omitempty"` // Tipo da transação (0, 1, 2)

	// Filtros de tempo
	FromTimestamp *time.Time `json:"from_timestamp,omitempty"` // Data/hora inicial
	ToTimestamp   *time.Time `json:"to_timestamp,omitempty"`   // Data/hora final
	FromDate      string     `json:"from_date,omitempty"`      // Data inicial (YYYY-MM-DD)
	ToDate        string     `json:"to_date,omitempty"`        // Data final (YYYY-MM-DD)

	// Filtros de bloco
	FromBlock uint64 `json:"from_block,omitempty"` // Número do bloco inicial
	ToBlock   uint64 `json:"to_block,omitempty"`   // Número do bloco final

	// Filtros especiais
	ContractCreation *bool `json:"contract_creation,omitempty"` // true = criação de contrato
	HasData          *bool `json:"has_data,omitempty"`          // true = tem dados de entrada

	// Ordenação
	OrderBy  string `json:"order_by,omitempty"`  // Campo para ordenação
	OrderDir string `json:"order_dir,omitempty"` // Direção (asc, desc)

	// Paginação
	Page  int `json:"page,omitempty"`  // Página (padrão: 1)
	Limit int `json:"limit,omitempty"` // Limite por página (padrão: 10, máx: 100)
}

// Validate valida e normaliza os filtros
func (f *TransactionFilters) Validate() error {
	// Validar paginação
	if f.Page <= 0 {
		f.Page = 1
	}
	if f.Limit <= 0 {
		f.Limit = 10
	}
	if f.Limit > 100 {
		f.Limit = 100
	}

	// Validar ordenação
	validOrderBy := map[string]bool{
		"block_number": true, "transaction_index": true, "mined_at": true,
		"value": true, "gas_limit": true, "gas_used": true, "created_at": true,
	}
	if f.OrderBy != "" && !validOrderBy[f.OrderBy] {
		f.OrderBy = "block_number"
	}
	if f.OrderBy == "" {
		f.OrderBy = "block_number"
	}

	if f.OrderDir != "asc" && f.OrderDir != "desc" {
		f.OrderDir = "desc"
	}

	// Validar endereços
	if f.From != "" && (len(f.From) != 42 || f.From[:2] != "0x") {
		return fmt.Errorf("endereço 'from' inválido: %s", f.From)
	}
	if f.To != "" && (len(f.To) != 42 || f.To[:2] != "0x") {
		return fmt.Errorf("endereço 'to' inválido: %s", f.To)
	}

	// Validar status
	if f.Status != "" {
		validStatuses := map[string]bool{
			"pending": true, "success": true, "failed": true,
		}
		if !validStatuses[f.Status] {
			return fmt.Errorf("status inválido: %s", f.Status)
		}
	}

	// Validar intervalos
	if f.MinGas > 0 && f.MaxGas > 0 && f.MinGas > f.MaxGas {
		f.MinGas, f.MaxGas = f.MaxGas, f.MinGas
	}
	if f.MinGasUsed > 0 && f.MaxGasUsed > 0 && f.MinGasUsed > f.MaxGasUsed {
		f.MinGasUsed, f.MaxGasUsed = f.MaxGasUsed, f.MinGasUsed
	}
	if f.FromBlock > 0 && f.ToBlock > 0 && f.FromBlock > f.ToBlock {
		f.FromBlock, f.ToBlock = f.ToBlock, f.FromBlock
	}

	// Processar datas
	if err := f.processDateFilters(); err != nil {
		return err
	}

	return nil
}

// ToSQL converte os filtros para cláusulas SQL
func (f *TransactionFilters) ToSQL() (whereClause string, args []interface{}, orderClause string) {
	var conditions []string
	argIndex := 0

	// Filtro por remetente
	if f.From != "" {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("from_address = $%d", argIndex))
		args = append(args, strings.ToLower(f.From))
	}

	// Filtro por destinatário
	if f.To != "" {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("to_address = $%d", argIndex))
		args = append(args, strings.ToLower(f.To))
	}

	// Filtro por status
	if f.Status != "" {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, f.Status)
	}

	// Filtros de valor
	if f.MinValue != "" {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("CAST(value AS NUMERIC) >= CAST($%d AS NUMERIC)", argIndex))
		args = append(args, f.MinValue)
	}
	if f.MaxValue != "" {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("CAST(value AS NUMERIC) <= CAST($%d AS NUMERIC)", argIndex))
		args = append(args, f.MaxValue)
	}

	// Filtros de gas
	if f.MinGas > 0 {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("gas_limit >= $%d", argIndex))
		args = append(args, f.MinGas)
	}
	if f.MaxGas > 0 {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("gas_limit <= $%d", argIndex))
		args = append(args, f.MaxGas)
	}
	if f.MinGasUsed > 0 {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("gas_used >= $%d", argIndex))
		args = append(args, f.MinGasUsed)
	}
	if f.MaxGasUsed > 0 {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("gas_used <= $%d", argIndex))
		args = append(args, f.MaxGasUsed)
	}

	// Filtro por tipo de transação
	if f.TxType != nil {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("transaction_type = $%d", argIndex))
		args = append(args, *f.TxType)
	}

	// Filtros de tempo - usar os timestamps processados se disponíveis
	if f.FromTimestamp != nil {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("timestamp >= $%d", argIndex))
		args = append(args, *f.FromTimestamp)
	}
	if f.ToTimestamp != nil {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("timestamp <= $%d", argIndex))
		args = append(args, *f.ToTimestamp)
	}

	// Filtros de bloco
	if f.FromBlock > 0 {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("block_number >= $%d", argIndex))
		args = append(args, f.FromBlock)
	}
	if f.ToBlock > 0 {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("block_number <= $%d", argIndex))
		args = append(args, f.ToBlock)
	}

	// Filtros especiais
	if f.ContractCreation != nil {
		if *f.ContractCreation {
			conditions = append(conditions, "to_address IS NULL")
		} else {
			conditions = append(conditions, "to_address IS NOT NULL")
		}
	}

	if f.HasData != nil {
		if *f.HasData {
			conditions = append(conditions, "data IS NOT NULL AND length(data) > 0")
		} else {
			conditions = append(conditions, "(data IS NULL OR length(data) = 0)")
		}
	}

	// Construir WHERE clause - retornar apenas as condições, sem WHERE
	if len(conditions) > 0 {
		whereClause = strings.Join(conditions, " AND ")
	}

	// Construir ORDER clause
	orderClause = fmt.Sprintf("ORDER BY %s %s", f.OrderBy, strings.ToUpper(f.OrderDir))

	return whereClause, args, orderClause
}

// processDateFilters processa filtros de data
func (f *TransactionFilters) processDateFilters() error {
	// Processar FromDate
	if f.FromDate != "" {
		date, err := time.Parse("2006-01-02", f.FromDate)
		if err != nil {
			return fmt.Errorf("formato de data inválido para from_date: %s (use YYYY-MM-DD)", f.FromDate)
		}
		// Começar do início do dia (00:00:00) UTC
		startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)
		f.FromTimestamp = &startOfDay
	}

	// Processar ToDate
	if f.ToDate != "" {
		date, err := time.Parse("2006-01-02", f.ToDate)
		if err != nil {
			return fmt.Errorf("formato de data inválido para to_date: %s (use YYYY-MM-DD)", f.ToDate)
		}
		// Ir até o final do dia (23:59:59.999) UTC
		endOfDay := time.Date(date.Year(), date.Month(), date.Day(), 23, 59, 59, 999999999, time.UTC)
		f.ToTimestamp = &endOfDay
	}

	return nil
}
