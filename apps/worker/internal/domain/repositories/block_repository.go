package repositories

import (
	"context"

	"github.com/hubweb3/worker/internal/domain/entities"
)

// BlockRepository define as operações de persistência para blocos
type BlockRepository interface {
	// Save salva um bloco no repositório
	Save(ctx context.Context, block *entities.Block) error

	// FindByNumber busca um bloco pelo número
	FindByNumber(ctx context.Context, number uint64) (*entities.Block, error)

	// FindByHash busca um bloco pelo hash
	FindByHash(ctx context.Context, hash string) (*entities.Block, error)

	// FindLatest busca o último bloco salvo
	FindLatest(ctx context.Context) (*entities.Block, error)

	// FindByRange busca blocos em um intervalo
	FindByRange(ctx context.Context, from, to uint64) ([]*entities.Block, error)

	// Exists verifica se um bloco existe
	Exists(ctx context.Context, hash string) (bool, error)

	// Update atualiza um bloco existente
	Update(ctx context.Context, block *entities.Block) error

	// Delete remove um bloco (soft delete)
	Delete(ctx context.Context, hash string) error

	// Count retorna o número total de blocos
	Count(ctx context.Context) (int64, error)

	// FindWithTransactions busca um bloco com suas transações
	FindWithTransactions(ctx context.Context, hash string) (*entities.Block, error)

	// Batch operations for high performance
	// CheckExistsBatch verifica quais blocos já existem (retorna slice de bool na mesma ordem)
	CheckExistsBatch(ctx context.Context, blocks []*entities.Block) ([]bool, error)

	// SaveBatch salva múltiplos blocos em uma única operação
	SaveBatch(ctx context.Context, blocks []*entities.Block) error

	// UpdateBatch atualiza múltiplos blocos em uma única operação
	UpdateBatch(ctx context.Context, blocks []*entities.Block) error
}
