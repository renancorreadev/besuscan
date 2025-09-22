package services

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"explorer-api/internal/domain/entities"
	"explorer-api/internal/domain/repositories"
)

// BlockService gerencia a lógica de negócio relacionada a blocos
type BlockService struct {
	blockRepo repositories.BlockRepository
}

// NewBlockService cria uma nova instância do serviço de blocos
func NewBlockService(blockRepo repositories.BlockRepository) *BlockService {
	return &BlockService{
		blockRepo: blockRepo,
	}
}

// GetBlockByNumber busca um bloco pelo número
func (s *BlockService) GetBlockByNumber(ctx context.Context, number uint64) (*entities.Block, error) {
	block, err := s.blockRepo.FindByNumber(ctx, number)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar bloco %d: %w", number, err)
	}

	if block == nil {
		return nil, fmt.Errorf("bloco %d não encontrado", number)
	}

	return block, nil
}

// GetBlockByHash busca um bloco pelo hash
func (s *BlockService) GetBlockByHash(ctx context.Context, hash string) (*entities.Block, error) {
	// Validar formato do hash
	if len(hash) != 66 || hash[:2] != "0x" {
		return nil, fmt.Errorf("formato de hash inválido: %s", hash)
	}

	block, err := s.blockRepo.FindByHash(ctx, hash)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar bloco %s: %w", hash, err)
	}

	if block == nil {
		return nil, fmt.Errorf("bloco %s não encontrado", hash)
	}

	return block, nil
}

// GetLatestBlock busca o último bloco
func (s *BlockService) GetLatestBlock(ctx context.Context) (*entities.Block, error) {
	block, err := s.blockRepo.FindLatest(ctx)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar último bloco: %w", err)
	}

	if block == nil {
		return nil, fmt.Errorf("nenhum bloco encontrado")
	}

	return block, nil
}

// GetRecentBlocks busca os blocos mais recentes
func (s *BlockService) GetRecentBlocks(ctx context.Context, limit int) ([]*entities.Block, error) {
	// Validar limite
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	blocks, err := s.blockRepo.FindRecent(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar blocos recentes: %w", err)
	}

	return blocks, nil
}

// GetBlocksByRange busca blocos em um intervalo
func (s *BlockService) GetBlocksByRange(ctx context.Context, from, to uint64) ([]*entities.Block, error) {
	// Validar intervalo
	if from > to {
		return nil, fmt.Errorf("intervalo inválido: from (%d) > to (%d)", from, to)
	}

	// Limitar o tamanho do intervalo para evitar consultas muito grandes
	if to-from > 100 {
		return nil, fmt.Errorf("intervalo muito grande (máximo 100 blocos)")
	}

	blocks, err := s.blockRepo.FindByRange(ctx, from, to)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar blocos do intervalo %d-%d: %w", from, to, err)
	}

	return blocks, nil
}

// GetBlocksWithFilters busca blocos com filtros avançados
func (s *BlockService) GetBlocksWithFilters(ctx context.Context, filters *BlockFilters) (*PaginatedResponse, error) {
	// Validar filtros
	if err := filters.Validate(); err != nil {
		return nil, fmt.Errorf("filtros inválidos: %w", err)
	}

	// Processar datas se fornecidas
	if err := s.processDateFilters(filters); err != nil {
		return nil, fmt.Errorf("erro ao processar filtros de data: %w", err)
	}

	// Converter filtros para SQL
	whereClause, args, orderClause := filters.ToSQL()

	// Calcular offset para paginação
	offset := (filters.Page - 1) * filters.Limit

	// Buscar blocos
	blocks, err := s.blockRepo.FindWithFilters(ctx, whereClause, args, orderClause, filters.Limit, offset)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar blocos com filtros: %w", err)
	}

	// Contar total de blocos
	total, err := s.blockRepo.CountWithFilters(ctx, whereClause, args)
	if err != nil {
		return nil, fmt.Errorf("erro ao contar blocos com filtros: %w", err)
	}

	// Calcular total de páginas
	totalPages := int((total + int64(filters.Limit) - 1) / int64(filters.Limit))

	// Converter para resumos se necessário
	var data interface{}
	if len(blocks) > 0 {
		summaries := make([]*entities.BlockSummary, len(blocks))
		for i, block := range blocks {
			summaries[i] = block.ToSummary()
		}
		data = summaries
	} else {
		data = []*entities.BlockSummary{}
	}

	return &PaginatedResponse{
		Data:       data,
		Page:       filters.Page,
		Limit:      filters.Limit,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

// GetBlocksStats retorna estatísticas dos blocos
func (s *BlockService) GetBlocksStats(ctx context.Context) (*BlockStats, error) {
	// Buscar último bloco
	latestBlock, err := s.blockRepo.FindLatest(ctx)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar último bloco: %w", err)
	}

	// Contar total de blocos
	totalBlocks, err := s.blockRepo.Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("erro ao contar blocos: %w", err)
	}

	stats := &BlockStats{
		TotalBlocks: totalBlocks,
	}

	if latestBlock != nil {
		stats.LatestBlockNumber = latestBlock.Number
		stats.LatestBlockHash = latestBlock.Hash
		stats.LatestBlockTimestamp = latestBlock.Timestamp
	}

	return stats, nil
}

// GetUniqueMiners retorna lista de mineradores únicos
func (s *BlockService) GetUniqueMiners(ctx context.Context) ([]string, error) {
	miners, err := s.blockRepo.GetUniqueMiners(ctx)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar mineradores: %w", err)
	}

	return miners, nil
}

// ParseBlockIdentifier converte string para número de bloco ou hash
func (s *BlockService) ParseBlockIdentifier(identifier string) (isNumber bool, number uint64, hash string, err error) {
	// Tentar converter para número primeiro
	if num, parseErr := strconv.ParseUint(identifier, 10, 64); parseErr == nil {
		return true, num, "", nil
	}

	// Se não for número, deve ser hash
	if len(identifier) == 66 && identifier[:2] == "0x" {
		return false, 0, identifier, nil
	}

	return false, 0, "", fmt.Errorf("identificador inválido: deve ser um número ou hash (0x...)")
}

// processDateFilters converte strings de data para timestamps
func (s *BlockService) processDateFilters(filters *BlockFilters) error {
	// Processar from_date
	if filters.FromDate != "" {
		date, err := time.Parse("2006-01-02", filters.FromDate)
		if err != nil {
			return fmt.Errorf("formato de from_date inválido (use YYYY-MM-DD): %w", err)
		}
		filters.FromTimestamp = &date
	}

	// Processar to_date
	if filters.ToDate != "" {
		date, err := time.Parse("2006-01-02", filters.ToDate)
		if err != nil {
			return fmt.Errorf("formato de to_date inválido (use YYYY-MM-DD): %w", err)
		}
		// Adicionar 23:59:59 para incluir todo o dia
		endOfDay := date.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		filters.ToTimestamp = &endOfDay
	}

	return nil
}

// GetGasTrends retorna tendências de gas price por período
func (s *BlockService) GetGasTrends(ctx context.Context, days int) ([]entities.GasTrend, error) {
	return s.blockRepo.GetGasTrends(ctx, days)
}

// GetVolumeDistribution retorna distribuição de volume por período
func (s *BlockService) GetVolumeDistribution(ctx context.Context, period string) (*entities.VolumeDistribution, error) {
	return s.blockRepo.GetVolumeDistribution(ctx, period)
}
