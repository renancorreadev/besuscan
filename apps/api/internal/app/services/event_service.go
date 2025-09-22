package services

import (
	"context"
	"explorer-api/internal/domain/entities"
)

// EventService define as operações de negócio para eventos
type EventService interface {
	// GetEvents busca eventos com filtros e paginação
	GetEvents(ctx context.Context, filters entities.EventFilters) ([]*entities.EventSummary, int64, error)

	// GetEventByID busca um evento pelo ID
	GetEventByID(ctx context.Context, id string) (*entities.Event, error)

	// GetEventStats retorna estatísticas de eventos
	GetEventStats(ctx context.Context) (*entities.EventStats, error)

	// SearchEvents busca eventos por termo
	SearchEvents(ctx context.Context, query string, limit, offset int) ([]*entities.EventSummary, int64, error)

	// GetEventsByContract busca eventos por endereço do contrato
	GetEventsByContract(ctx context.Context, contractAddress string, limit, offset int) ([]*entities.Event, error)

	// GetEventsByTransaction busca eventos por hash da transação
	GetEventsByTransaction(ctx context.Context, txHash string) ([]*entities.Event, error)

	// GetEventsByBlock busca eventos por número do bloco
	GetEventsByBlock(ctx context.Context, blockNumber uint64) ([]*entities.Event, error)

	// GetUniqueContracts retorna lista de contratos únicos
	GetUniqueContracts(ctx context.Context) ([]string, error)

	// GetEventNames retorna lista de nomes de eventos únicos
	GetEventNames(ctx context.Context) ([]string, error)

	// CountEventsByContract conta eventos por contrato
	CountEventsByContract(ctx context.Context, contractAddress string) (int64, error)
}
