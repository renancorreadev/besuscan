package repositories

import (
	"context"

	"github.com/hubweb3/worker/internal/domain/entities"
)

// EventRepository define as operações de acesso a dados para eventos
type EventRepository interface {
	// Create salva um novo evento
	Create(ctx context.Context, event *entities.Event) error

	// GetByID busca um evento pelo ID
	GetByID(ctx context.Context, id string) (*entities.Event, error)

	// GetAll busca eventos com filtros e paginação
	GetAll(ctx context.Context, filters entities.EventFilters) ([]*entities.EventSummary, int64, error)

	// GetByTransactionHash busca eventos por hash da transação
	GetByTransactionHash(ctx context.Context, txHash string) ([]*entities.Event, error)

	// GetByContractAddress busca eventos por endereço do contrato
	GetByContractAddress(ctx context.Context, contractAddress string, limit, offset int) ([]*entities.Event, error)

	// GetByBlockNumber busca eventos por número do bloco
	GetByBlockNumber(ctx context.Context, blockNumber uint64) ([]*entities.Event, error)

	// GetByBlockRange busca eventos em um intervalo de blocos
	GetByBlockRange(ctx context.Context, fromBlock, toBlock uint64, limit, offset int) ([]*entities.Event, error)

	// GetStats retorna estatísticas de eventos
	GetStats(ctx context.Context) (*entities.EventStats, error)

	// Search busca eventos por termo
	Search(ctx context.Context, query string, limit, offset int) ([]*entities.EventSummary, int64, error)

	// GetPopularEvents retorna os eventos mais populares
	GetPopularEvents(ctx context.Context, limit int) ([]*entities.PopularEvent, error)

	// GetRecentActivity retorna atividade recente de eventos
	GetRecentActivity(ctx context.Context, days int) ([]*entities.EventActivity, error)

	// Update atualiza um evento existente
	Update(ctx context.Context, event *entities.Event) error

	// Delete remove um evento
	Delete(ctx context.Context, id string) error

	// GetUniqueContracts retorna lista de contratos únicos que emitiram eventos
	GetUniqueContracts(ctx context.Context) ([]string, error)

	// GetEventNames retorna lista de nomes de eventos únicos
	GetEventNames(ctx context.Context) ([]string, error)

	// BulkCreate salva múltiplos eventos em lote
	BulkCreate(ctx context.Context, events []*entities.Event) error

	// Exists verifica se um evento já existe
	Exists(ctx context.Context, id string) (bool, error)

	// GetLatest retorna os eventos mais recentes
	GetLatest(ctx context.Context, limit int) ([]*entities.EventSummary, error)

	// CountByContract conta eventos por contrato
	CountByContract(ctx context.Context, contractAddress string) (int64, error)

	// CountByEventName conta eventos por nome do evento
	CountByEventName(ctx context.Context, eventName string) (int64, error)
}
