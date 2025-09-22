package repositories

import (
	"context"

	"explorer-api/internal/domain/entities"
)

// BlockRepository define as operações de persistência para blocos
type BlockRepository interface {
	// FindByNumber busca um bloco pelo número
	FindByNumber(ctx context.Context, number uint64) (*entities.Block, error)

	// FindByHash busca um bloco pelo hash
	FindByHash(ctx context.Context, hash string) (*entities.Block, error)

	// FindLatest busca o último bloco salvo
	FindLatest(ctx context.Context) (*entities.Block, error)

	// FindByRange busca blocos em um intervalo
	FindByRange(ctx context.Context, from, to uint64) ([]*entities.Block, error)

	// FindRecent busca os N blocos mais recentes
	FindRecent(ctx context.Context, limit int) ([]*entities.Block, error)

	// FindWithFilters busca blocos com filtros avançados
	FindWithFilters(ctx context.Context, whereClause string, args []interface{}, orderClause string, limit, offset int) ([]*entities.Block, error)

	// CountWithFilters conta blocos com filtros
	CountWithFilters(ctx context.Context, whereClause string, args []interface{}) (int64, error)

	// Count retorna o número total de blocos
	Count(ctx context.Context) (int64, error)

	// Exists verifica se um bloco existe
	Exists(ctx context.Context, hash string) (bool, error)

	// GetUniqueMiners retorna lista de mineradores únicos
	GetUniqueMiners(ctx context.Context) ([]string, error)

	// GetGasTrends retorna tendências de gas price por período
	GetGasTrends(ctx context.Context, days int) ([]entities.GasTrend, error)

	// GetVolumeDistribution retorna distribuição de volume por período
	GetVolumeDistribution(ctx context.Context, period string) (*entities.VolumeDistribution, error)
}
