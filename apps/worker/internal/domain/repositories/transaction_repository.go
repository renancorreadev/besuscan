package repositories

import (
	"context"

	"github.com/hubweb3/worker/internal/domain/entities"
)

// TransactionRepository define as operações de persistência para transações
type TransactionRepository interface {
	// Save salva uma transação no repositório
	Save(ctx context.Context, tx *entities.Transaction) error

	// FindByHash busca uma transação pelo hash
	FindByHash(ctx context.Context, hash string) (*entities.Transaction, error)

	// FindByBlock busca transações de um bloco
	FindByBlock(ctx context.Context, blockHash string) ([]*entities.Transaction, error)

	// FindByAddress busca transações de um endereço (from ou to)
	FindByAddress(ctx context.Context, address string, limit, offset int) ([]*entities.Transaction, error)

	// FindPending busca transações pendentes
	FindPending(ctx context.Context, limit int) ([]*entities.Transaction, error)

	// FindByStatus busca transações por status
	FindByStatus(ctx context.Context, status entities.TransactionStatus, limit, offset int) ([]*entities.Transaction, error)

	// UpdateStatus atualiza o status de uma transação
	UpdateStatus(ctx context.Context, hash string, status entities.TransactionStatus) error

	// Update atualiza uma transação existente
	Update(ctx context.Context, tx *entities.Transaction) error

	// Exists verifica se uma transação existe
	Exists(ctx context.Context, hash string) (bool, error)

	// Delete remove uma transação (soft delete)
	Delete(ctx context.Context, hash string) error

	// Count retorna o número total de transações
	Count(ctx context.Context) (int64, error)

	// CountByStatus retorna o número de transações por status
	CountByStatus(ctx context.Context, status entities.TransactionStatus) (int64, error)

	// FindRecentByAddress busca transações recentes de um endereço
	FindRecentByAddress(ctx context.Context, address string, limit int) ([]*entities.Transaction, error)

	// FindByNonce busca transações por nonce de um endereço
	FindByNonce(ctx context.Context, address string, nonce uint64) ([]*entities.Transaction, error)

	// BatchSave salva múltiplas transações em uma transação de banco
	BatchSave(ctx context.Context, txs []*entities.Transaction) error
}
