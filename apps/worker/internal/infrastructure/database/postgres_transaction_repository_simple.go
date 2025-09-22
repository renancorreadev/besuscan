package database

import (
	"context"
	"database/sql"
	"errors"

	"github.com/hubweb3/worker/internal/domain/entities"
	"github.com/hubweb3/worker/internal/domain/repositories"
)

var (
	ErrTransactionNotFoundSimple = errors.New("transaction not found")
)

// PostgresTransactionRepositorySimple implementa o repositório de transações para PostgreSQL
type PostgresTransactionRepositorySimple struct {
	db *sql.DB
}

// NewPostgresTransactionRepositorySimple cria uma nova instância do repositório
func NewPostgresTransactionRepositorySimple(db *sql.DB) repositories.TransactionRepository {
	return &PostgresTransactionRepositorySimple{
		db: db,
	}
}

// Save salva uma transação no banco de dados
func (r *PostgresTransactionRepositorySimple) Save(ctx context.Context, tx *entities.Transaction) error {
	query := `
		INSERT INTO transactions (
			hash, block_number, block_hash, transaction_index, from_address, to_address,
			value, gas_limit, gas_used, gas_price, max_fee_per_gas, max_priority_fee_per_gas,
			nonce, data, status, transaction_type, mined_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
		)
		ON CONFLICT (hash) DO UPDATE SET
			block_number = EXCLUDED.block_number,
			block_hash = EXCLUDED.block_hash,
			transaction_index = EXCLUDED.transaction_index,
			gas_used = EXCLUDED.gas_used,
			status = EXCLUDED.status,
			mined_at = EXCLUDED.mined_at,
			updated_at = EXCLUDED.updated_at
	`

	// Converter big.Int para string para armazenamento
	var valueStr, gasPriceStr, maxFeePerGasStr, maxPriorityFeePerGasStr *string

	if tx.Value != nil {
		val := tx.Value.String()
		valueStr = &val
	}

	if tx.GasPrice != nil {
		val := tx.GasPrice.String()
		gasPriceStr = &val
	}

	if tx.MaxFeePerGas != nil {
		val := tx.MaxFeePerGas.String()
		maxFeePerGasStr = &val
	}

	if tx.MaxPriorityFeePerGas != nil {
		val := tx.MaxPriorityFeePerGas.String()
		maxPriorityFeePerGasStr = &val
	}

	_, err := r.db.ExecContext(ctx, query,
		tx.Hash,
		tx.BlockNumber,
		tx.BlockHash,
		tx.TransactionIndex,
		tx.From,
		tx.To,
		valueStr,
		tx.Gas,
		tx.GasUsed,
		gasPriceStr,
		maxFeePerGasStr,
		maxPriorityFeePerGasStr,
		tx.Nonce,
		tx.Data,
		tx.Status,
		tx.Type,
		tx.MinedAt,
		tx.CreatedAt,
		tx.UpdatedAt,
	)

	return err
}

// FindByHash busca uma transação pelo hash
func (r *PostgresTransactionRepositorySimple) FindByHash(ctx context.Context, hash string) (*entities.Transaction, error) {
	// TODO: Implementar busca por hash
	return nil, ErrTransactionNotFoundSimple
}

// FindByBlock busca transações de um bloco
func (r *PostgresTransactionRepositorySimple) FindByBlock(ctx context.Context, blockHash string) ([]*entities.Transaction, error) {
	// TODO: Implementar busca por bloco
	return nil, nil
}

// FindByAddress busca transações de um endereço
func (r *PostgresTransactionRepositorySimple) FindByAddress(ctx context.Context, address string, limit, offset int) ([]*entities.Transaction, error) {
	// TODO: Implementar busca por endereço
	return nil, nil
}

// FindPending busca transações pendentes
func (r *PostgresTransactionRepositorySimple) FindPending(ctx context.Context, limit int) ([]*entities.Transaction, error) {
	// TODO: Implementar busca de pendentes
	return nil, nil
}

// FindByStatus busca transações por status
func (r *PostgresTransactionRepositorySimple) FindByStatus(ctx context.Context, status entities.TransactionStatus, limit, offset int) ([]*entities.Transaction, error) {
	// TODO: Implementar busca por status
	return nil, nil
}

// UpdateStatus atualiza o status de uma transação
func (r *PostgresTransactionRepositorySimple) UpdateStatus(ctx context.Context, hash string, status entities.TransactionStatus) error {
	// TODO: Implementar atualização de status
	return nil
}

// Update atualiza uma transação existente
func (r *PostgresTransactionRepositorySimple) Update(ctx context.Context, tx *entities.Transaction) error {
	query := `
		UPDATE transactions SET
			block_number = $2,
			block_hash = $3,
			transaction_index = $4,
			from_address = $5,
			to_address = $6,
			value = $7,
			gas_limit = $8,
			gas_used = $9,
			gas_price = $10,
			max_fee_per_gas = $11,
			max_priority_fee_per_gas = $12,
			nonce = $13,
			data = $14,
			status = $15,
			transaction_type = $16,
			mined_at = $17,
			updated_at = $18
		WHERE hash = $1
	`

	// Converter big.Int para string para armazenamento
	var valueStr, gasPriceStr, maxFeePerGasStr, maxPriorityFeePerGasStr *string

	if tx.Value != nil {
		val := tx.Value.String()
		valueStr = &val
	}

	if tx.GasPrice != nil {
		val := tx.GasPrice.String()
		gasPriceStr = &val
	}

	if tx.MaxFeePerGas != nil {
		val := tx.MaxFeePerGas.String()
		maxFeePerGasStr = &val
	}

	if tx.MaxPriorityFeePerGas != nil {
		val := tx.MaxPriorityFeePerGas.String()
		maxPriorityFeePerGasStr = &val
	}

	_, err := r.db.ExecContext(ctx, query,
		tx.Hash,
		tx.BlockNumber,
		tx.BlockHash,
		tx.TransactionIndex,
		tx.From,
		tx.To,
		valueStr,
		tx.Gas,
		tx.GasUsed,
		gasPriceStr,
		maxFeePerGasStr,
		maxPriorityFeePerGasStr,
		tx.Nonce,
		tx.Data,
		tx.Status,
		tx.Type,
		tx.MinedAt,
		tx.UpdatedAt,
	)

	return err
}

// Exists verifica se uma transação existe
func (r *PostgresTransactionRepositorySimple) Exists(ctx context.Context, hash string) (bool, error) {
	query := `SELECT 1 FROM transactions WHERE hash = $1 LIMIT 1`

	var exists int
	err := r.db.QueryRowContext(ctx, query, hash).Scan(&exists)

	if err == sql.ErrNoRows {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return true, nil
}

// Delete remove uma transação
func (r *PostgresTransactionRepositorySimple) Delete(ctx context.Context, hash string) error {
	// TODO: Implementar remoção
	return nil
}

// Count retorna o número total de transações
func (r *PostgresTransactionRepositorySimple) Count(ctx context.Context) (int64, error) {
	// TODO: Implementar contagem
	return 0, nil
}

// CountByStatus retorna o número de transações por status
func (r *PostgresTransactionRepositorySimple) CountByStatus(ctx context.Context, status entities.TransactionStatus) (int64, error) {
	// TODO: Implementar contagem por status
	return 0, nil
}

// FindRecentByAddress busca transações recentes de um endereço
func (r *PostgresTransactionRepositorySimple) FindRecentByAddress(ctx context.Context, address string, limit int) ([]*entities.Transaction, error) {
	// TODO: Implementar busca recente por endereço
	return nil, nil
}

// FindByNonce busca transações por nonce
func (r *PostgresTransactionRepositorySimple) FindByNonce(ctx context.Context, address string, nonce uint64) ([]*entities.Transaction, error) {
	// TODO: Implementar busca por nonce
	return nil, nil
}

// BatchSave salva múltiplas transações
func (r *PostgresTransactionRepositorySimple) BatchSave(ctx context.Context, txs []*entities.Transaction) error {
	// TODO: Implementar salvamento em lote
	for _, tx := range txs {
		if err := r.Save(ctx, tx); err != nil {
			return err
		}
	}
	return nil
}
