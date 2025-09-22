package repositories

import (
	"context"
	"explorer-api/internal/domain/entities"
)

// ValidatorRepository define as operações de persistência para validadores
type ValidatorRepository interface {
	// Buscar validador por endereço
	FindByAddress(ctx context.Context, address string) (*entities.Validator, error)

	// Buscar todos os validadores
	FindAll(ctx context.Context) ([]*entities.Validator, error)

	// Buscar validadores ativos
	FindActive(ctx context.Context) ([]*entities.Validator, error)

	// Buscar validadores inativos
	FindInactive(ctx context.Context) ([]*entities.Validator, error)

	// Salvar/atualizar validador
	Save(ctx context.Context, validator *entities.Validator) error

	// Contar total de validadores
	Count(ctx context.Context) (int64, error)

	// Contar validadores ativos
	CountActive(ctx context.Context) (int64, error)

	// Contar validadores inativos
	CountInactive(ctx context.Context) (int64, error)

	// Calcular uptime médio
	CalculateAverageUptime(ctx context.Context) (float64, error)

	// Atualizar status de todos os validadores (marcar como inativos)
	UpdateAllStatus(ctx context.Context, status string, isActive bool) error
}
