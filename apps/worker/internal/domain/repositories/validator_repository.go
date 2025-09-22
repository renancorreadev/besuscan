package repositories

import (
	"context"

	"github.com/hubweb3/worker/internal/domain/entities"
)

// ValidatorRepository define as operações de persistência para validadores
type ValidatorRepository interface {
	// Buscar validador por endereço
	FindByAddress(ctx context.Context, address string) (*entities.Validator, error)

	// Buscar validadores ativos
	FindActive(ctx context.Context) ([]*entities.Validator, error)

	// Salvar/atualizar validador
	Save(ctx context.Context, validator *entities.Validator) error

	// Atualizar status de todos os validadores
	UpdateAllStatus(ctx context.Context, status string, isActive bool) error
}
