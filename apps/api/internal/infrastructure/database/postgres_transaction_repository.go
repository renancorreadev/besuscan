package database

import (
	"context"
	"database/sql"
	"fmt"
	"math/big"

	"explorer-api/internal/domain/entities"
	"explorer-api/internal/domain/repositories"
)

// PostgresTransactionRepository implementa TransactionRepository usando PostgreSQL
type PostgresTransactionRepository struct {
	db *sql.DB
}

// NewPostgresTransactionRepository cria uma nova instância do repositório
func NewPostgresTransactionRepository(db *sql.DB) repositories.TransactionRepository {
	if db == nil {
		panic("PostgresTransactionRepository: database connection cannot be nil")
	}
	return &PostgresTransactionRepository{db: db}
}

// FindByHash busca uma transação pelo hash
func (r *PostgresTransactionRepository) FindByHash(ctx context.Context, hash string) (*entities.Transaction, error) {
	query := `
		SELECT t.hash, t.block_number, t.block_hash, t.transaction_index, t.from_address, t.to_address,
			   t.value, t.gas_limit, t.gas_used, t.gas_price, t.max_fee_per_gas, t.max_priority_fee_per_gas,
			   t.nonce, t.data, t.transaction_type, t.status, t.contract_address,
			   t.created_at, t.updated_at, t.mined_at,
			   tm.method_name, tm.method_type
		FROM transactions t
		LEFT JOIN transaction_methods tm ON t.hash = tm.transaction_hash
		WHERE t.hash = $1`

	return r.scanTransaction(r.db.QueryRowContext(ctx, query, hash))
}

// FindRecent busca as N transações mais recentes
func (r *PostgresTransactionRepository) FindRecent(ctx context.Context, limit int) ([]*entities.Transaction, error) {
	query := `
		SELECT t.hash, t.block_number, t.block_hash, t.transaction_index, t.from_address, t.to_address,
			   t.value, t.gas_limit, t.gas_used, t.gas_price, t.max_fee_per_gas, t.max_priority_fee_per_gas,
			   t.nonce, t.data, t.transaction_type, t.status, t.contract_address,
			   t.created_at, t.updated_at, t.mined_at,
			   tm.method_name, tm.method_type
		FROM transactions t
		LEFT JOIN transaction_methods tm ON t.hash = tm.transaction_hash
		WHERE t.block_number IS NOT NULL
		ORDER BY t.block_number DESC, t.transaction_index DESC 
		LIMIT $1`

	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []*entities.Transaction
	for rows.Next() {
		transaction, err := r.scanTransactionFromRows(rows)
		if err != nil {
			return nil, err
		}
		transactions = append(transactions, transaction)
	}

	return transactions, rows.Err()
}

// FindByBlock busca transações de um bloco específico
func (r *PostgresTransactionRepository) FindByBlock(ctx context.Context, blockNumber uint64) ([]*entities.Transaction, error) {
	query := `
		SELECT t.hash, t.block_number, t.block_hash, t.transaction_index, t.from_address, t.to_address,
			   t.value, t.gas_limit, t.gas_used, t.gas_price, t.max_fee_per_gas, t.max_priority_fee_per_gas,
			   t.nonce, t.data, t.transaction_type, t.status, t.contract_address,
			   t.created_at, t.updated_at, t.mined_at,
			   tm.method_name, tm.method_type
		FROM transactions t
		LEFT JOIN transaction_methods tm ON t.hash = tm.transaction_hash
		WHERE t.block_number = $1
		ORDER BY t.transaction_index ASC`

	rows, err := r.db.QueryContext(ctx, query, blockNumber)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []*entities.Transaction
	for rows.Next() {
		transaction, err := r.scanTransactionFromRows(rows)
		if err != nil {
			return nil, err
		}
		transactions = append(transactions, transaction)
	}

	return transactions, rows.Err()
}

// FindByAddress busca transações de um endereço
func (r *PostgresTransactionRepository) FindByAddress(ctx context.Context, address string, limit, offset int) ([]*entities.Transaction, error) {
	query := `
		SELECT t.hash, t.block_number, t.block_hash, t.transaction_index, t.from_address, t.to_address,
			   t.value, t.gas_limit, t.gas_used, t.gas_price, t.max_fee_per_gas, t.max_priority_fee_per_gas,
			   t.nonce, t.data, t.transaction_type, t.status, t.contract_address,
			   t.created_at, t.updated_at, t.mined_at,
			   tm.method_name, tm.method_type
		FROM transactions t
		LEFT JOIN transaction_methods tm ON t.hash = tm.transaction_hash
		WHERE t.from_address = $1 OR t.to_address = $1
		ORDER BY t.block_number DESC, t.transaction_index DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.QueryContext(ctx, query, address, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []*entities.Transaction
	for rows.Next() {
		transaction, err := r.scanTransactionFromRows(rows)
		if err != nil {
			return nil, err
		}
		transactions = append(transactions, transaction)
	}

	return transactions, rows.Err()
}

// FindByStatus busca transações por status
func (r *PostgresTransactionRepository) FindByStatus(ctx context.Context, status string, limit, offset int) ([]*entities.Transaction, error) {
	query := `
		SELECT t.hash, t.block_number, t.block_hash, t.transaction_index, t.from_address, t.to_address,
			   t.value, t.gas_limit, t.gas_used, t.gas_price, t.max_fee_per_gas, t.max_priority_fee_per_gas,
			   t.nonce, t.data, t.transaction_type, t.status, t.contract_address,
			   t.created_at, t.updated_at, t.mined_at,
			   tm.method_name, tm.method_type
		FROM transactions t
		LEFT JOIN transaction_methods tm ON t.hash = tm.transaction_hash
		WHERE t.status = $1
		ORDER BY t.created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.QueryContext(ctx, query, status, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []*entities.Transaction
	for rows.Next() {
		transaction, err := r.scanTransactionFromRows(rows)
		if err != nil {
			return nil, err
		}
		transactions = append(transactions, transaction)
	}

	return transactions, rows.Err()
}

// FindWithFilters busca transações com filtros avançados
func (r *PostgresTransactionRepository) FindWithFilters(ctx context.Context, whereClause string, args []interface{}, orderClause string, limit, offset int) ([]*entities.Transaction, error) {
	baseQuery := `
		SELECT t.hash, t.block_number, t.block_hash, t.transaction_index, t.from_address, t.to_address,
			   t.value, t.gas_limit, t.gas_used, t.gas_price, t.max_fee_per_gas, t.max_priority_fee_per_gas,
			   t.nonce, t.data, t.transaction_type, t.status, t.contract_address,
			   t.created_at, t.updated_at, t.mined_at,
			   tm.method_name, tm.method_type
		FROM transactions t
		LEFT JOIN transaction_methods tm ON t.hash = tm.transaction_hash`

	query := baseQuery
	if whereClause != "" {
		query += " WHERE " + whereClause
	}
	query += " " + orderClause
	query += fmt.Sprintf(" LIMIT %d OFFSET %d", limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []*entities.Transaction
	for rows.Next() {
		transaction, err := r.scanTransactionFromRows(rows)
		if err != nil {
			return nil, err
		}
		transactions = append(transactions, transaction)
	}

	return transactions, rows.Err()
}

// CountWithFilters conta transações com filtros
func (r *PostgresTransactionRepository) CountWithFilters(ctx context.Context, whereClause string, args []interface{}) (int64, error) {
	query := "SELECT COUNT(*) FROM transactions t"
	if whereClause != "" {
		query += " WHERE " + whereClause
	}

	var count int64
	err := r.db.QueryRowContext(ctx, query, args...).Scan(&count)
	return count, err
}

// Count retorna o número total de transações
func (r *PostgresTransactionRepository) Count(ctx context.Context) (int64, error) {
	query := `SELECT COUNT(*) FROM transactions`

	var count int64
	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	return count, err
}

// CountByStatus retorna o número de transações por status
func (r *PostgresTransactionRepository) CountByStatus(ctx context.Context, status string) (int64, error) {
	query := `SELECT COUNT(*) FROM transactions WHERE status = $1`

	var count int64
	err := r.db.QueryRowContext(ctx, query, status).Scan(&count)
	return count, err
}

// Exists verifica se uma transação existe
func (r *PostgresTransactionRepository) Exists(ctx context.Context, hash string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM transactions WHERE hash = $1)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, hash).Scan(&exists)
	return exists, err
}

// GetTransactionStats retorna estatísticas das transações
func (r *PostgresTransactionRepository) GetTransactionStats(ctx context.Context) (*repositories.TransactionStats, error) {
	query := `
		SELECT 
			COUNT(*) as total_transactions,
			COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
			COUNT(CASE WHEN status = 'success' THEN 1 END) as success_transactions,
			COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
			COALESCE(SUM(gas_used), 0) as total_gas_used,
			COALESCE(FLOOR(AVG(CASE WHEN gas_price IS NOT NULL AND gas_price != '' 
				THEN gas_price::NUMERIC END)), 0)::BIGINT as avg_gas_price,
			COALESCE(FLOOR(AVG(CASE WHEN gas_used IS NOT NULL AND gas_price IS NOT NULL AND gas_price != ''
				THEN gas_used * gas_price::NUMERIC END)), 0)::BIGINT as avg_transaction_fee
		FROM transactions`

	var stats repositories.TransactionStats
	err := r.db.QueryRowContext(ctx, query).Scan(
		&stats.TotalTransactions,
		&stats.PendingTransactions,
		&stats.SuccessTransactions,
		&stats.FailedTransactions,
		&stats.TotalGasUsed,
		&stats.AverageGasPrice,
		&stats.AverageTransactionFee,
	)

	return &stats, err
}

// scanTransaction converte uma linha do banco em uma entidade Transaction
func (r *PostgresTransactionRepository) scanTransaction(row *sql.Row) (*entities.Transaction, error) {
	var transaction entities.Transaction
	var value, gasPrice, maxFeePerGas, maxPriorityFeePerGas *string
	var methodName, methodType *string

	err := row.Scan(
		&transaction.Hash, &transaction.BlockNumber, &transaction.BlockHash,
		&transaction.TransactionIndex, &transaction.From, &transaction.To,
		&value, &transaction.Gas, &transaction.GasUsed, &gasPrice,
		&maxFeePerGas, &maxPriorityFeePerGas, &transaction.Nonce,
		&transaction.Data, &transaction.Type, &transaction.Status,
		&transaction.ContractAddress, &transaction.CreatedAt,
		&transaction.UpdatedAt, &transaction.MinedAt,
		&methodName, &methodType,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	// Converter strings para big.Int
	if value != nil {
		transaction.Value = new(big.Int)
		transaction.Value.SetString(*value, 10)
	}
	if gasPrice != nil {
		transaction.GasPrice = new(big.Int)
		transaction.GasPrice.SetString(*gasPrice, 10)
	}
	if maxFeePerGas != nil {
		transaction.MaxFeePerGas = new(big.Int)
		transaction.MaxFeePerGas.SetString(*maxFeePerGas, 10)
	}
	if maxPriorityFeePerGas != nil {
		transaction.MaxPriorityFeePerGas = new(big.Int)
		transaction.MaxPriorityFeePerGas.SetString(*maxPriorityFeePerGas, 10)
	}

	// Definir métodos identificados
	transaction.Method = methodName
	transaction.MethodType = methodType

	return &transaction, nil
}

// scanTransactionFromRows converte uma linha de rows em uma entidade Transaction
func (r *PostgresTransactionRepository) scanTransactionFromRows(rows *sql.Rows) (*entities.Transaction, error) {
	var transaction entities.Transaction
	var value, gasPrice, maxFeePerGas, maxPriorityFeePerGas *string
	var methodName, methodType *string

	err := rows.Scan(
		&transaction.Hash, &transaction.BlockNumber, &transaction.BlockHash,
		&transaction.TransactionIndex, &transaction.From, &transaction.To,
		&value, &transaction.Gas, &transaction.GasUsed, &gasPrice,
		&maxFeePerGas, &maxPriorityFeePerGas, &transaction.Nonce,
		&transaction.Data, &transaction.Type, &transaction.Status,
		&transaction.ContractAddress, &transaction.CreatedAt,
		&transaction.UpdatedAt, &transaction.MinedAt,
		&methodName, &methodType,
	)

	if err != nil {
		return nil, err
	}

	// Converter strings para big.Int
	if value != nil {
		transaction.Value = new(big.Int)
		transaction.Value.SetString(*value, 10)
	}
	if gasPrice != nil {
		transaction.GasPrice = new(big.Int)
		transaction.GasPrice.SetString(*gasPrice, 10)
	}
	if maxFeePerGas != nil {
		transaction.MaxFeePerGas = new(big.Int)
		transaction.MaxFeePerGas.SetString(*maxFeePerGas, 10)
	}
	if maxPriorityFeePerGas != nil {
		transaction.MaxPriorityFeePerGas = new(big.Int)
		transaction.MaxPriorityFeePerGas.SetString(*maxPriorityFeePerGas, 10)
	}

	// Definir métodos identificados
	transaction.Method = methodName
	transaction.MethodType = methodType

	return &transaction, nil
}
