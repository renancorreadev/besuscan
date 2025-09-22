package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/hubweb3/worker/internal/domain/entities"
	"github.com/hubweb3/worker/internal/domain/repositories"
)

// ValidatorService gerencia a lógica de negócio dos validadores QBFT
type ValidatorService struct {
	validatorRepo repositories.ValidatorRepository
}

// NewValidatorService cria uma nova instância do serviço de validadores
func NewValidatorService(validatorRepo repositories.ValidatorRepository) *ValidatorService {
	return &ValidatorService{
		validatorRepo: validatorRepo,
	}
}

// SyncValidators sincroniza dados dos validadores
func (s *ValidatorService) SyncValidators(ctx context.Context, validators []*entities.Validator) error {
	// Marcar todos como inativos primeiro
	err := s.validatorRepo.UpdateAllStatus(ctx, "inactive", false)
	if err != nil {
		return fmt.Errorf("erro ao marcar validadores como inativos: %w", err)
	}

	// Processar cada validador
	for _, validator := range validators {
		// Verificar se validador já existe
		existing, err := s.validatorRepo.FindByAddress(ctx, validator.Address)
		if err != nil {
			return fmt.Errorf("erro ao buscar validador %s: %w", validator.Address, err)
		}

		if existing != nil {
			// Atualizar validador existente
			existing.ProposedBlockCount = validator.ProposedBlockCount
			existing.LastProposedBlockNumber = validator.LastProposedBlockNumber
			existing.Status = validator.Status
			existing.IsActive = validator.IsActive
			existing.LastSeen = validator.LastSeen
			existing.Uptime = validator.Uptime
			existing.UpdatedAt = time.Now()

			validator = existing
		} else {
			// Novo validador
			validator.FirstSeen = time.Now()
			validator.CreatedAt = time.Now()
			validator.UpdatedAt = time.Now()
		}

		// Salvar no repositório
		err = s.validatorRepo.Save(ctx, validator)
		if err != nil {
			return fmt.Errorf("erro ao salvar validador %s: %w", validator.Address, err)
		}
	}

	log.Printf("✅ Sincronização de validadores concluída: %d validadores processados", len(validators))
	return nil
}

// GetActiveValidators retorna validadores ativos
func (s *ValidatorService) GetActiveValidators(ctx context.Context) ([]*entities.Validator, error) {
	return s.validatorRepo.FindActive(ctx)
}

// GetValidatorByAddress busca um validador por endereço
func (s *ValidatorService) GetValidatorByAddress(ctx context.Context, address string) (*entities.Validator, error) {
	return s.validatorRepo.FindByAddress(ctx, address)
}
