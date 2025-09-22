package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/hubweb3/worker/internal/domain/entities"
	"github.com/hubweb3/worker/internal/domain/repositories"
)

// BlockService contém a lógica de negócio para blocos
type BlockService struct {
	blockRepo repositories.BlockRepository
	txRepo    repositories.TransactionRepository
}

// NewBlockService cria uma nova instância do serviço de blocos
func NewBlockService(blockRepo repositories.BlockRepository, txRepo repositories.TransactionRepository) *BlockService {
	return &BlockService{
		blockRepo: blockRepo,
		txRepo:    txRepo,
	}
}

// ProcessBlock processa um novo bloco
func (s *BlockService) ProcessBlock(ctx context.Context, block *entities.Block) error {
	log.Printf("🔄 Processando bloco %d (hash: %s)", block.Number, block.Hash)

	// Validar bloco
	if !block.IsValid() {
		return fmt.Errorf("bloco inválido: %+v", block)
	}

	// Verificar se já existe
	exists, err := s.blockRepo.Exists(ctx, block.Hash)
	if err != nil {
		return fmt.Errorf("erro ao verificar existência do bloco: %w", err)
	}

	if exists {
		log.Printf("⚠️ Bloco %d já existe, atualizando...", block.Number)
		return s.blockRepo.Update(ctx, block)
	}

	// Salvar novo bloco
	if err := s.blockRepo.Save(ctx, block); err != nil {
		return fmt.Errorf("erro ao salvar bloco: %w", err)
	}

	log.Printf("✅ Bloco %d salvo com sucesso", block.Number)
	return nil
}

// ProcessBlocksBatch processa múltiplos blocos em lote para melhor performance
func (s *BlockService) ProcessBlocksBatch(ctx context.Context, blocks []*entities.Block) error {
	if len(blocks) == 0 {
		return nil
	}

	log.Printf("🚀 Processando lote de %d blocos (do %d ao %d)",
		len(blocks), blocks[0].Number, blocks[len(blocks)-1].Number)

	// Validar todos os blocos primeiro
	for _, block := range blocks {
		if !block.IsValid() {
			return fmt.Errorf("bloco inválido no lote: %+v", block)
		}
	}

	// Verificar quais blocos já existem (bulk check)
	existingBlocks, err := s.blockRepo.CheckExistsBatch(ctx, blocks)
	if err != nil {
		return fmt.Errorf("erro ao verificar existência dos blocos em lote: %w", err)
	}

	// Separar blocos novos dos existentes
	var newBlocks []*entities.Block
	var updateBlocks []*entities.Block

	for i, block := range blocks {
		if existingBlocks[i] {
			updateBlocks = append(updateBlocks, block)
		} else {
			newBlocks = append(newBlocks, block)
		}
	}

	// Processar inserções em lote
	if len(newBlocks) > 0 {
		if err := s.blockRepo.SaveBatch(ctx, newBlocks); err != nil {
			return fmt.Errorf("erro ao salvar lote de novos blocos: %w", err)
		}
		log.Printf("✅ %d novos blocos salvos em lote", len(newBlocks))
	}

	// Processar atualizações em lote
	if len(updateBlocks) > 0 {
		if err := s.blockRepo.UpdateBatch(ctx, updateBlocks); err != nil {
			return fmt.Errorf("erro ao atualizar lote de blocos: %w", err)
		}
		log.Printf("✅ %d blocos atualizados em lote", len(updateBlocks))
	}

	return nil
}

// GetLatestBlock retorna o último bloco processado
func (s *BlockService) GetLatestBlock(ctx context.Context) (*entities.Block, error) {
	return s.blockRepo.FindLatest(ctx)
}

// GetBlockByNumber busca um bloco pelo número
func (s *BlockService) GetBlockByNumber(ctx context.Context, number uint64) (*entities.Block, error) {
	return s.blockRepo.FindByNumber(ctx, number)
}

// GetBlockByHash busca um bloco pelo hash
func (s *BlockService) GetBlockByHash(ctx context.Context, hash string) (*entities.Block, error) {
	return s.blockRepo.FindByHash(ctx, hash)
}

// GetBlocksInRange busca blocos em um intervalo
func (s *BlockService) GetBlocksInRange(ctx context.Context, from, to uint64) ([]*entities.Block, error) {
	if from > to {
		return nil, fmt.Errorf("intervalo inválido: from (%d) > to (%d)", from, to)
	}

	if to-from > 1000 {
		return nil, fmt.Errorf("intervalo muito grande: máximo 1000 blocos")
	}

	return s.blockRepo.FindByRange(ctx, from, to)
}

// ValidateBlockChain valida a integridade da cadeia de blocos
func (s *BlockService) ValidateBlockChain(ctx context.Context, from, to uint64) error {
	blocks, err := s.GetBlocksInRange(ctx, from, to)
	if err != nil {
		return err
	}

	for i := 1; i < len(blocks); i++ {
		current := blocks[i]
		previous := blocks[i-1]

		// Verificar sequência
		if current.Number != previous.Number+1 {
			return fmt.Errorf("sequência quebrada: bloco %d seguido por %d", previous.Number, current.Number)
		}

		// Verificar parent hash (se disponível)
		if current.ParentHash != "" && current.ParentHash != previous.Hash {
			return fmt.Errorf("parent hash inválido no bloco %d", current.Number)
		}
	}

	return nil
}

// GetBlockStats retorna estatísticas dos blocos
func (s *BlockService) GetBlockStats(ctx context.Context) (*BlockStats, error) {
	totalBlocks, err := s.blockRepo.Count(ctx)
	if err != nil {
		return nil, err
	}

	latestBlock, err := s.blockRepo.FindLatest(ctx)
	if err != nil {
		return nil, err
	}

	stats := &BlockStats{
		TotalBlocks: totalBlocks,
		UpdatedAt:   time.Now(),
	}

	if latestBlock != nil {
		stats.LatestBlockNumber = latestBlock.Number
		stats.LatestBlockHash = latestBlock.Hash
		stats.LatestBlockTime = latestBlock.Timestamp
	}

	return stats, nil
}

// BlockStats representa estatísticas dos blocos
type BlockStats struct {
	TotalBlocks       int64     `json:"total_blocks"`
	LatestBlockNumber uint64    `json:"latest_block_number"`
	LatestBlockHash   string    `json:"latest_block_hash"`
	LatestBlockTime   time.Time `json:"latest_block_time"`
	UpdatedAt         time.Time `json:"updated_at"`
}
