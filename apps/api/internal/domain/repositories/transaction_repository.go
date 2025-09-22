package repositories

import (
	"context"

	"explorer-api/internal/domain/entities"
)

// TransactionRepository define as operações de persistência para transações
type TransactionRepository interface {
	// FindByHash busca uma transação pelo hash
	FindByHash(ctx context.Context, hash string) (*entities.Transaction, error)

	// FindRecent busca as N transações mais recentes
	FindRecent(ctx context.Context, limit int) ([]*entities.Transaction, error)

	// FindByBlock busca transações de um bloco específico
	FindByBlock(ctx context.Context, blockNumber uint64) ([]*entities.Transaction, error)

	// FindByAddress busca transações de um endereço (from ou to)
	FindByAddress(ctx context.Context, address string, limit, offset int) ([]*entities.Transaction, error)

	// FindByStatus busca transações por status
	FindByStatus(ctx context.Context, status string, limit, offset int) ([]*entities.Transaction, error)

	// FindWithFilters busca transações com filtros avançados
	FindWithFilters(ctx context.Context, whereClause string, args []interface{}, orderClause string, limit, offset int) ([]*entities.Transaction, error)

	// CountWithFilters conta transações com filtros
	CountWithFilters(ctx context.Context, whereClause string, args []interface{}) (int64, error)

	// Count retorna o número total de transações
	Count(ctx context.Context) (int64, error)

	// CountByStatus retorna o número de transações por status
	CountByStatus(ctx context.Context, status string) (int64, error)

	// Exists verifica se uma transação existe
	Exists(ctx context.Context, hash string) (bool, error)

	// GetTransactionStats retorna estatísticas das transações
	GetTransactionStats(ctx context.Context) (*TransactionStats, error)
}

// TransactionStats representa estatísticas das transações
type TransactionStats struct {
	TotalTransactions     int64 `json:"total_transactions"`
	PendingTransactions   int64 `json:"pending_transactions"`
	SuccessTransactions   int64 `json:"success_transactions"`
	FailedTransactions    int64 `json:"failed_transactions"`
	TotalGasUsed          int64 `json:"total_gas_used"`
	AverageGasPrice       int64 `json:"average_gas_price"`
	AverageTransactionFee int64 `json:"average_transaction_fee"`
}
